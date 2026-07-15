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
import { addFilterToPPLQuery } from '../../../pages/logs/ppl_builder/add_filter';

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

      // Base query text: read from the QueryStringManager draft, not the Monaco
      // editor ref. In the logs visual builder the editor is unmounted, so the
      // ref would be empty and the filter would be silently dropped — the bug
      // this fixes. Fall back to the language's default query string when empty.
      const baseText =
        (typeof queryString.getQuery().query === 'string' && queryString.getQuery().query) ||
        languageConfig.getQueryString?.(query) ||
        '';

      const buildFilters = () =>
        opensearchFilters.generateFilters(
          filterManager,
          field,
          values,
          operation,
          dataset.id ?? ''
        );

      // Prompt (natural-language) mode is only shown with the editor mounted, so
      // keep the existing staging behavior via the prompt-filter helper.
      if (editorMode === EditorMode.Prompt) {
        setEditorText(languageConfig.addFiltersToPrompt?.(baseText, buildFilters()) || baseText);
        focusOnEditor();
        return;
      }

      // PPL uses its own serialization so value filters merge into the search
      // expression the visual builder can round-trip (see add_filter.ts); other
      // languages keep the shared filter->query serialization.
      const newText =
        query.language === 'PPL'
          ? addFilterToPPLQuery(baseText, field, values, operation)
          : languageConfig.addFiltersToQuery?.(baseText, buildFilters()) || baseText;

      // Commit to the QueryStringManager draft (keeps TopNav submit in sync even
      // if the run below is short-circuited), mirror into the code editor when
      // mounted (no-op otherwise), then run the query so results refresh and the
      // builder re-seeds from the new Redux query.
      queryString.setQuery({ ...queryString.getQuery(), query: newText });
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
