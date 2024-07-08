/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiHighlight,
  EuiSuperSelect,
  EuiSuperSelectOption,
  PopoverAnchorPosition,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import React, { ReactNode } from 'react';
import { getUiService } from '../../services';
import { QueryEnhancement } from '../types';

interface Props {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
  anchorPosition?: PopoverAnchorPosition;
  appName?: string;
}

type LanguageOption = EuiSuperSelectOption<string>;

const mapExternalLanguageToOptions = (enhancement: QueryEnhancement): LanguageOption => {
  return {
    value: enhancement.language,
    inputDisplay: enhancement.language + enhancement.languageHint,
  };
};

export const QueryLanguageSelector = (props: Props) => {
  const dqlLabel = i18n.translate('data.query.queryEditor.dqlLanguageName', {
    defaultMessage: 'DQL',
  });
  const luceneLabel = i18n.translate('data.query.queryEditor.luceneLanguageName', {
    defaultMessage: 'Lucene',
  });

  const languageOptions: LanguageOption[] = [
    {
      inputDisplay: dqlLabel,
      value: 'kuery',
    },
    {
      inputDisplay: luceneLabel,
      value: 'lucene',
    },
  ];

  const uiService = getUiService();

  const queryEnhancements = uiService.Settings.getAllQueryEnhancements();
  queryEnhancements.forEach((enhancement) => {
    if (
      (enhancement.supportedAppNames &&
        props.appName &&
        !enhancement.supportedAppNames.includes(props.appName)) ||
      uiService.Settings.getUserQueryLanguageBlocklist().includes(
        enhancement.language.toLowerCase()
      )
    )
      return;
    languageOptions.unshift(mapExternalLanguageToOptions(enhancement));
  });

  const selectedLanguage = {
    label:
      (languageOptions.find(
        (option) => option.value.toLowerCase() === props.language.toLowerCase()
      )?.label as string) ?? languageOptions[0].label,
  };

  const handleLanguageChange = (newLanguage: LanguageOption[]) => {
    const queryLanguage = newLanguage[0].value!.language as string;
    props.onSelectLanguage(queryLanguage);
    uiService.Settings.setUserQueryLanguage(queryLanguage);
  };

  uiService.Settings.setUserQueryLanguage(props.language);

  const renderOption: EuiComboBox<LanguageOptionValue>['props']['renderOption'] = (
    option,
    searchValue,
    contentClassName
  ) => {
    return (
      <>
        <EuiHighlight search={searchValue} className={contentClassName}>
          {option.label}
        </EuiHighlight>
        {option.value?.hint}
      </>
    );
  };

  return (
    <EuiSuperSelect
      options={[
        {
          value: 'warning',
          inputDisplay: 'warning',
        },
      ]}
      valueOfSelected={selectedLanguage}
      onChange={onChange}
    />
  );

  // return (
  //   <EuiComboBox
  //     fullWidth
  //     className="languageSelector"
  //     data-test-subj="languageSelector"
  //     options={languageOptions}
  //     selectedOptions={[selectedLanguage]}
  //     onChange={handleLanguageChange}
  //     singleSelection={{ asPlainText: true }}
  //     isClearable={false}
  //     renderOption={renderOption}
  //     async
  //   />
  // );
};
