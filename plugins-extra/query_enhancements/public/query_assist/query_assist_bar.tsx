import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow } from '@elastic/eui';
import React, { SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PersistedLog } from '../../../../src/plugins/data/public/query';
import { SearchBarExtensionDependencies } from '../../../../src/plugins/data/public/ui/search_bar_extensions/search_bar_extension';
import { getCore, getData, getStorage } from '../services';
import { getPersistedLog } from './get_persisted_log';
import { QueryAssistInput } from './query_assist_input';

interface QueryAssistInputProps {
  dependencies: SearchBarExtensionDependencies;
  // onSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
}

export const QueryAssistBar: React.FC<QueryAssistInputProps> = (props) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const core = getCore();
  const data = getData();
  const storage = getStorage();

  const persistedLog: PersistedLog = useMemo(
    () => getPersistedLog(core.uiSettings, storage, 'query-assist'),
    [core.uiSettings, storage]
  );

  useEffect(() => {
    return () => {
      console.log('unmounting query assist bar');
    };
  }, []);

  const onSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const selectedIndex = props.dependencies.indexPatterns?.at(0)?.title;

    if (!inputRef.current?.value || !selectedIndex) return;

    persistedLog.add(inputRef.current.value);

    setLoading(true);
    try {
      const generatedPPL = await core.http.post<string>('/api/ql/query_assist/ppl/generate', {
        body: JSON.stringify({ question: inputRef.current.value, index: selectedIndex }),
      });
      data.query.queryString.setQuery({ query: generatedPPL, language: 'PPL' });
      data.query.timefilter.timefilter.setTime({ from: 'now-1d', to: 'now' });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <EuiForm component="form" onSubmit={onSubmit}>
      <EuiFormRow fullWidth>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <QueryAssistInput inputRef={inputRef} persistedLog={persistedLog} />
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
          {/* {props.callOut} */}
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};
