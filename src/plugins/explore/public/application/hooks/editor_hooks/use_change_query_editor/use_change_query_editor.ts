/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useOpenSearchDashboards } from '../../../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../../../types';
import { useSelector } from '../../../legacy/discover/application/utils/state_management';
import { selectEditorMode, selectQuery } from '../../../utils/state_management/selectors';
import { AppDispatch } from '../../../utils/state_management/store';
import { DataViewField, IndexPatternField } from '../../../../../../data/common';
import { opensearchFilters } from '../../../../../../data/public';
import { useDatasetContext } from '../../../context';
import { EditorMode } from '../../../utils/state_management/types';
import { useSetEditorText } from '../use_set_editor_text';
import { useEditorFocus } from '../use_editor_focus';
import { onEditorRunActionCreator } from '../../../utils/state_management/actions/query_editor';
import {
  buildPPLPredicate,
  addFilterToPPLSearchExpression,
} from '../../../pages/logs/ppl_builder/add_filter';

export const useChangeQueryEditor = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const {
    data: {
      query: { filterManager, queryString },
    },
  } = services;
  const { dataset } = useDatasetContext();
  const setEditorText = useSetEditorText();
  const editorMode = useSelector(selectEditorMode);
  const query = useSelector(selectQuery);
  const focusOnEditor = useEditorFocus();
  const dispatch = useDispatch<AppDispatch>();

  const onAddFilter = useCallback(
    (field: string | IndexPatternField | DataViewField, values: string, operation: '+' | '-') => {
      if (!dataset) return;
      const languageConfig = queryString.getLanguageService().getLanguage(query.language);
      if (!languageConfig) return;

      // Base query text: the QueryStringManager draft is the working source of
      // truth and, crucially, exists whether or not the Monaco editor is
      // mounted. In the logs visual builder the editor is unmounted, so reading
      // from the (null) editor ref would silently lose the filter — the bug this
      // path fixes. Fall back to the language's default query string when empty.
      const currentQuery = queryString.getQuery();
      const baseText =
        (typeof currentQuery.query === 'string' && currentQuery.query) ||
        languageConfig.getQueryString?.(query) ||
        '';

      // Prompt (natural-language) mode still round-trips through the language's
      // prompt-filter helper and the editor; it is only shown with the code
      // editor mounted, so the existing staging behavior is preserved.
      if (editorMode === EditorMode.Prompt) {
        const newFilters = opensearchFilters.generateFilters(
          filterManager,
          field,
          values,
          operation,
          dataset.id ?? ''
        );
        const promptText = languageConfig.addFiltersToPrompt?.(baseText, newFilters) || baseText;
        setEditorText(promptText);
        focusOnEditor();
        return;
      }

      let newText: string;
      if (query.language === 'PPL') {
        // Merge the filter into the leading search-expression segment (not a
        // trailing `| WHERE`, which is not builder-representable) so the visual
        // builder can render it as a chip and the query round-trips through
        // parsePPL. `_exists_` is generateFilters' convention for an
        // exists-filter where `values` carries the target field name.
        const fieldName = typeof field === 'string' ? field : field.name;
        const predicate =
          fieldName === '_exists_'
            ? buildPPLPredicate(values, null, operation)
            : buildPPLPredicate(fieldName, values, operation);
        newText = addFilterToPPLSearchExpression(baseText, predicate);
      } else {
        // Non-PPL languages keep the shared filter->query serialization.
        const newFilters = opensearchFilters.generateFilters(
          filterManager,
          field,
          values,
          operation,
          dataset.id ?? ''
        );
        newText = languageConfig.addFiltersToQuery?.(baseText, newFilters) || baseText;
      }

      // Commit to the draft (keeps TopNav submit in sync) and mirror into the
      // code editor when it is mounted (no-op otherwise), then run the query so
      // results refresh and the builder re-seeds from the new Redux query.
      queryString.setQuery({ ...currentQuery, query: newText });
      setEditorText(newText);
      dispatch(onEditorRunActionCreator(services, newText));

      focusOnEditor();
    },
    [
      dataset,
      queryString,
      query,
      filterManager,
      setEditorText,
      focusOnEditor,
      editorMode,
      dispatch,
      services,
    ]
  );

  return { onAddFilter };
};
