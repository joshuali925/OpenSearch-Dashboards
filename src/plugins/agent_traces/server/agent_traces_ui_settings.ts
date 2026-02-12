/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { schema } from '@osd/config-schema';

import { UiSettingsParams } from 'opensearch-dashboards/server';
import {
  DEFAULT_TRACE_COLUMNS_SETTING,
  DEFAULT_LOGS_COLUMNS_SETTING,
  ENABLE_EXPERIMENTAL_SETTING,
} from '../common';

export const agentTracesUiSettings: Record<string, UiSettingsParams> = {
  [DEFAULT_TRACE_COLUMNS_SETTING]: {
    name: i18n.translate('agentTraces.advancedSettings.defaultTraceColumnsTitle', {
      defaultMessage: 'Default trace columns',
    }),
    value: [
      'spanId',
      'status.code',
      'attributes.http.status_code',
      'resource.attributes.service.name',
      'kind',
      'name',
      'durationNano',
      'durationInNanos',
    ],
    description: i18n.translate('agentTraces.advancedSettings.defaultTraceColumnsText', {
      defaultMessage: 'Experimental: Columns displayed by default in the Agent Traces traces tab',
    }),
    category: ['agentTraces'],
    schema: schema.arrayOf(schema.string()),
  },
  [DEFAULT_LOGS_COLUMNS_SETTING]: {
    name: i18n.translate('agentTraces.advancedSettings.defaultLogsColumnsTitle', {
      defaultMessage: 'Default logs columns',
    }),
    value: ['body', 'severityText', 'resource.attributes.service.name'],
    description: i18n.translate('agentTraces.advancedSettings.defaultLogsColumnsText', {
      defaultMessage: 'Columns displayed by default in the Agent Traces logs tab',
    }),
    category: ['agentTraces'],
    schema: schema.arrayOf(schema.string()),
  },
  [ENABLE_EXPERIMENTAL_SETTING]: {
    name: i18n.translate('agentTraces.advancedSettings.enableExperimentalTitle', {
      defaultMessage: 'Enable experimental features',
    }),
    value: false,
    description: i18n.translate('agentTraces.advancedSettings.enableExperimentalText', {
      defaultMessage:
        'Enable experimental features in Agent Traces including field statistics and histogram breakdown selector.',
    }),
    category: ['agentTraces'],
    schema: schema.boolean(),
  },
};
