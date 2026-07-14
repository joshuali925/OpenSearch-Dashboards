/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { AggFn } from './types';

interface AddMetricMenuProps {
  /** Called to append a new metric (defaults to Count; edited via "Show"). */
  onAdd: (fn: AggFn) => void;
  /**
   * Whether any metric already exists. When false the affordance shows its text
   * label ("＋ Add metric") since the row is sparse and labels teach; once a
   * metric exists it collapses to an icon-only dashed ＋ to keep the row dense.
   */
  hasMetrics?: boolean;
  dataTestSubj?: string;
}

/**
 * "Add metric" affordance: appends a new `Count` metric directly (no picker). The
 * aggregation is then chosen/edited via the row's "Show" dropdown, and scalar
 * functions via its `ƒx` menu — a single entry point per choice. Renders as a
 * labelled dashed button when the row is empty (labels teach) and collapses to an
 * icon-only dashed ＋ once a metric exists (icons keep the populated row dense).
 */
export const AddMetricMenu: React.FC<AddMetricMenuProps> = ({
  onAdd,
  hasMetrics,
  dataTestSubj,
}) => {
  const addMetricLabel = i18n.translate('explore.pplBuilder.addMetric', {
    defaultMessage: 'Add metric',
  });

  if (hasMetrics) {
    return (
      <EuiToolTip content={addMetricLabel} position="top">
        <EuiButtonIcon
          className="plqIconBtn plqIconBtn--ghost"
          iconType="plus"
          color="text"
          size="s"
          onClick={() => onAdd('count')}
          aria-label={addMetricLabel}
          data-test-subj={dataTestSubj}
        />
      </EuiToolTip>
    );
  }

  return (
    <EuiButtonEmpty
      size="xs"
      iconType="plus"
      className="plqGhostAdd"
      onClick={() => onAdd('count')}
      data-test-subj={dataTestSubj}
    >
      {addMetricLabel}
    </EuiButtonEmpty>
  );
};
