import { useEffect, useRef, useState } from 'react';
import { IDataPluginServices } from '../../../../../src/plugins/data/public';
import { useOpenSearchDashboards } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { QueryAssistParameters, QueryAssistResponse } from '../../../common/query_assist';
import { formatError } from '../utils';

export const useGenerateQuery = () => {
  const mounted = useRef(false);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController>();
  const { services } = useOpenSearchDashboards<IDataPluginServices>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = undefined;
      }
    };
  }, []);

  const generateQuery = async (
    params: QueryAssistParameters
  ): Promise<{ response?: QueryAssistResponse; error?: Error }> => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setLoading(true);
    try {
      const response = await services.http.post<QueryAssistResponse>(
        '/api/ql/query_assist/generate',
        {
          body: JSON.stringify(params),
          signal: abortControllerRef.current?.signal,
        }
      );
      if (mounted.current) return { response };
    } catch (error) {
      if (mounted.current) return { error: formatError(error) };
    } finally {
      if (mounted.current) setLoading(false);
    }
    return {};
  };

  return { generateQuery, loading, abortControllerRef };
};
