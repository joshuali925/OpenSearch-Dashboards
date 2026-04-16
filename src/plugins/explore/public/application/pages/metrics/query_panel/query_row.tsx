/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import classNames from 'classnames';
import { CodeEditor } from '../../../../../../opensearch_dashboards_react/public';
import { queryEditorOptions } from '../../../../components/query_panel/query_panel_editor/use_query_panel_editor/editor_options';
import { PrometheusClient } from '../explore/services/prometheus_client';
import { PromQLBuilder, parsePromQL } from '../promql_builder';
import type { BuilderState } from '../promql_builder';
import { QueryRow, RowMode, modeButtons } from './row_state';

import '../../../../components/query_panel/query_panel_editor/query_panel_editor.scss';

export interface QueryRowProps {
  row: QueryRow;
  label: string;
  client: PrometheusClient;
  onBuilderChange: (rowId: string, query: string, state: BuilderState) => void;
  onCodeChange: (rowId: string, query: string) => void;
  onModeChange: (rowId: string, mode: RowMode) => void;
  onRemove: (rowId: string) => void;
  canRemove: boolean;
  isDragging: boolean;
  dragHandleProps: any;
}

export const QueryRowComponent: React.FC<QueryRowProps> = React.memo(
  ({
    row,
    label,
    client,
    onBuilderChange,
    onCodeChange,
    onModeChange,
    onRemove,
    canRemove,
    isDragging,
    dragHandleProps,
  }) => {
    const handleBuilderQueryChange = useCallback(
      (query: string) => {
        const result = parsePromQL(query);
        onBuilderChange(row.id, query, result.canBuild ? result.state : row.builderState!);
      },
      [row.id, row.builderState, onBuilderChange]
    );

    const canSwitchToBuilder =
      row.mode === 'builder' || !row.query || parsePromQL(row.query).canBuild;
    const builderTooltip =
      row.mode === 'code' && !canSwitchToBuilder
        ? i18n.translate('explore.promqlBuilder.cannotSwitchToBuilder', {
            defaultMessage:
              'This query cannot be represented in Builder mode. Simplify it or use Code mode.',
          })
        : undefined;

    return (
      <div
        className={classNames('mqpQueryRow', { 'mqpQueryRow--dragging': isDragging })}
        data-test-subj={`queryRow-${label}`}
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" direction="column" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" className="mqpRowLabel">
                  {label}
                </EuiText>
              </EuiFlexItem>
              {canRemove && (
                <EuiFlexItem grow={false}>
                  <div
                    {...dragHandleProps}
                    aria-label={i18n.translate('explore.metricsQueryPanel.dragToReorder', {
                      defaultMessage: 'Drag to reorder',
                    })}
                    className="mqpDragHandle"
                  >
                    <EuiIcon type="grab" size="s" />
                  </div>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            {row.mode === 'builder' && row.builderState ? (
              <PromQLBuilder
                client={client}
                onQueryChange={handleBuilderQueryChange}
                initialState={row.builderState}
              />
            ) : (
              <div className="exploreQueryPanelEditor">
                <CodeEditor
                  languageId="PROMQL"
                  value={row.query}
                  onChange={(val) => onCodeChange(row.id, val)}
                  options={queryEditorOptions}
                  useLatestTheme
                  editorDidMount={(editor) => {
                    editor.onDidContentSizeChange(() => {
                      const contentHeight = editor.getContentHeight();
                      const maxHeight = 100;
                      const finalHeight = Math.min(contentHeight, maxHeight);
                      editor.layout({
                        width: editor.getLayoutInfo().width,
                        height: finalHeight,
                      });
                      editor.updateOptions({
                        scrollBeyondLastLine: false,
                        scrollbar: {
                          vertical: contentHeight > maxHeight ? 'visible' : 'hidden',
                        },
                      });
                    });
                  }}
                />
              </div>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={builderTooltip} position="top">
                  <EuiButtonGroup
                    legend={`Query ${label} mode`}
                    options={modeButtons}
                    idSelected={row.mode}
                    onChange={(id) => onModeChange(row.id, id as RowMode)}
                    buttonSize="compressed"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              {canRemove && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate('explore.metricsQueryPanel.removeQuery', {
                      defaultMessage: 'Remove query',
                    })}
                  >
                    <EuiButtonIcon
                      iconType="cross"
                      color="text"
                      size="s"
                      aria-label={i18n.translate('explore.metricsQueryPanel.removeQuery', {
                        defaultMessage: 'Remove query',
                      })}
                      onClick={() => onRemove(row.id)}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);
