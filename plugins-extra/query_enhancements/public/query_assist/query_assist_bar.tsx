import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow } from '@elastic/eui';
import React, { SyntheticEvent, useMemo, useRef } from 'react';
import { PersistedLog } from '../../../../src/plugins/data/public/query';
import { SearchBarExtensionDependencies } from '../../../../src/plugins/data/public/ui/search_bar_extensions/search_bar_extension';
import { getCore, getStorage } from '../services';
import { ProhibitedQueryCallOut } from './call_outs';
import { getPersistedLog } from './get_persisted_log';
import { useSubmit } from './hooks/use_submit';
import { QueryAssistInput } from './query_assist_input';

interface QueryAssistInputProps {
  dependencies: SearchBarExtensionDependencies;
}

export const QueryAssistBar: React.FC<QueryAssistInputProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const core = getCore();
  const storage = getStorage();

  const persistedLog: PersistedLog = useMemo(
    () => getPersistedLog(core.uiSettings, storage, 'query-assist'),
    [core.uiSettings, storage]
  );

  const { submit, loading, error, setError } = useSubmit(persistedLog);
  const selectedIndex = props.dependencies.indexPatterns?.at(0)?.title;

  const onSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value || !selectedIndex) {
      setError(new Error('empty'));
      return;
    }
    await submit({ question: inputRef.current.value, index: selectedIndex });
  };

  const renderCallout = () => {
    if (!error) return null;
    if (error instanceof Error)
      return <ProhibitedQueryCallOut onDismiss={() => setError(undefined)} />;
  };

  return (
    <EuiForm component="form" onSubmit={onSubmit}>
      <EuiFormRow fullWidth>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <QueryAssistInput
              inputRef={inputRef}
              persistedLog={persistedLog}
              selectedIndex={selectedIndex}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="returnKey"
              display="fill"
              isDisabled={loading}
              onClick={onSubmit}
              size="m"
              type="submit"
              aria-label="submit-question"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      {renderCallout()}
    </EuiForm>
  );
};
