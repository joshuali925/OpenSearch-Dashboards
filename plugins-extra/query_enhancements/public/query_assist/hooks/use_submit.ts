import { useState } from 'react';
import { PersistedLog } from '../../../../../src/plugins/data/public';
import { getCore, getData } from '../../services';

export const useSubmit = (persistedLog: PersistedLog) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const core = getCore();
  const data = getData();

  const submit = async (options: { question: string; index: string }) => {
    persistedLog.add(options.question);

    setLoading(true);
    setError(undefined);
    try {
      const generatedPPL = await core.http.post<string>('/api/ql/query_assist/ppl/generate', {
        body: JSON.stringify(options),
      });
      data.query.queryString.setQuery({ query: generatedPPL, language: 'PPL' });
      data.query.timefilter.timefilter.setTime({ from: 'now-1d', to: 'now' });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error, setError };
};
