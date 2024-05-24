/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiInputPopover,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import React, { SyntheticEvent, useEffect, useRef, useState } from 'react';
import { IDataPluginServices } from '../..';
import { IIndexPattern, Query, TimeRange } from '../../../common';
import assistantLogo from '../../assets/assistant-logo.svg';

interface QueryAssistBarProps {
  services: IDataPluginServices;
  indexPatterns?: IIndexPattern[];
  onSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  isLoading?: boolean;
  query?: Query;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

export const QueryAssistBar: React.FC<QueryAssistBarProps> = (props) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = loading || props.isLoading;

  const onSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value || !props.indexPatterns?.at(0)?.title) return;

    setLoading(true);
    try {
      const generatedPPL = await props.services.http.post<string>(
        '/api/opensearch-dashboards/query_assist/ppl/generate',
        {
          body: JSON.stringify({
            question: inputRef.current.value,
            index: props.indexPatterns.at(0)?.title,
          }),
        }
      );
      props.onSubmit({
        query: { query: generatedPPL, language: props.query?.language! },
        dateRange: { to: props.dateRangeTo!, from: props.dateRangeFrom! },
      });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = 'what are the errors?';
  }, []);

  return (
    <EuiForm component="form" onSubmit={onSubmit}>
      <EuiFormRow fullWidth>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiInputPopover
              input={
                <EuiFieldText
                  inputRef={inputRef}
                  disabled={isLoading}
                  placeholder={`Ask a natural language question about TODO to generate a query`}
                  prepend={<EuiIcon type={assistantLogo} />}
                  fullWidth
                />
              }
              disableFocusTrap
              fullWidth={true}
              // isOpen={isPopoverOpen}
              closePopover={() => {
                // setIsPopoverOpen(false);
              }}
            >
              <EuiListGroup flush={true} bordered={false} wrapText={true} maxWidth={false}>
                <EuiListGroupItem
                  onClick={() => {
                    // props.setNlqInput(question);
                    // inputRef.current?.focus();
                    // setIsPopoverOpen(false);
                  }}
                  label={'temp'}
                />
              </EuiListGroup>
            </EuiInputPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="returnKey"
              display="fill"
              isDisabled={isLoading}
              onClick={onSubmit}
              size="m"
              type="submit"
              aria-label="submit-question"
            />
          </EuiFlexItem>

          {/* {props.callOut} */}
          {/* <EuiSplitButton
        // disabled={loading}
        // isLoading={loading}
        // @ts-ignore incorrect type in Oui 1.5, 'disabled' is a valid color
        color={false ? 'disabled' : 'success'}
        data-test-subj="query-assist-generate-and-run-button"
        options={[
          {
            display: (
              <EuiText data-test-subj="query-assist-generate-button">Generate query</EuiText>
            ),
            // onClick: generatePPL,
          },
        ]}
        // onClick={runAndSummarize}
      >
        {false ? 'Running...' : 'Generate and run'}
      </EuiSplitButton> */}
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};
