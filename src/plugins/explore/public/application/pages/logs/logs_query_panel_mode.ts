/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';

export type LogsBuilderMode = 'builder' | 'code';

export const logsModeButtons = [
  {
    id: 'builder',
    label: i18n.translate('explore.logsQueryPanel.builderMode', { defaultMessage: 'Builder' }),
  },
  {
    id: 'code',
    label: i18n.translate('explore.logsQueryPanel.codeMode', { defaultMessage: 'Code' }),
  },
];
