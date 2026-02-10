/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiButtonEmpty, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import './ask_ai_button.scss';
import { useSelector } from 'react-redux';
import {
  selectEditorMode,
  selectPromptModeIsAvailable,
} from '../../../../application/utils/state_management/selectors';
import { EditorMode } from '../../../../application/utils/state_management/types';
import { useEditorFocus, useLanguageSwitch } from '../../../../application/hooks';

export const AskAIButton = () => {
  const promptModeIsAvailable = useSelector(selectPromptModeIsAvailable);
  const editorMode = useSelector(selectEditorMode);
  const focusOnEditor = useEditorFocus();
  const switchEditorMode = useLanguageSwitch();

  if (!promptModeIsAvailable || editorMode === EditorMode.Prompt) {
    return null;
  }

  return (
    <EuiButtonEmpty
      size="xs"
      className="agenticObsAskAIButton"
      onClick={() => {
        setTimeout(focusOnEditor);
        switchEditorMode(EditorMode.Prompt);
      }}
    >
      <div className="agenticObsAskAIButton__buttonTextWrapper">
        <EuiIcon className="agenticObsAskAIButton__icon" type="generate" size="s" />
        <EuiText className="agenticObsAskAIButton__text" size="xs">
          {i18n.translate('agenticObservability.queryPanel.askAIButton', {
            defaultMessage: 'Ask AI with Natural Language',
          })}
        </EuiText>
      </div>
    </EuiButtonEmpty>
  );
};
