import { schema } from '@osd/config-schema';
import { isResponseError } from '../../../../../src/core/server/opensearch/client/errors';
import { getAgentIdByConfig, requestAgentByConfig } from './agents';
import { IRouter, Logger } from '../../../../../src/core/server';

const ERROR_DETAILS = { GUARDRAILS_TRIGGERED: 'guardrails triggered' };

export function registerPplQueryAssistRoute(logger: Logger, router: IRouter) {
  router.get(
    {
      path: '/api/ql/query_assist/ppl/configured',
      validate: {},
    },
    async (context, request, response) => {
      const client = context.core.opensearch.client.asCurrentUser;
      try {
        // if the call does not throw any error, then the agent is properly configured
        await getAgentIdByConfig(client, 'os_query_assist_ppl');
        return response.ok({ body: { configured: true } });
      } catch (error) {
        return response.ok({ body: { configured: false, error: error.message } });
      }
    }
  );

  router.post(
    {
      path: '/api/ql/query_assist/ppl/generate',
      validate: {
        body: schema.object({
          index: schema.string(),
          question: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      /* return response.ok({
        body:
          'source=opensearch_dashboards_sample_data_ecommerce | head ' +
          Math.floor(Math.random() * 100),
      }); */
      try {
        const pplRequest = await requestAgentByConfig({
          context,
          configName: 'os_query_assist_ppl',
          body: {
            parameters: {
              index: request.body.index,
              question: request.body.question,
            },
          },
        });
        if (!pplRequest.body.inference_results[0].output[0].result)
          throw new Error('Generated PPL query not found.');
        const result = JSON.parse(pplRequest.body.inference_results[0].output[0].result) as {
          ppl: string;
          executionResult: string;
        };
        const ppl = result.ppl
          .replace(/[\r\n]/g, ' ')
          .trim()
          .replace(/ISNOTNULL/g, 'isnotnull') // https://github.com/opensearch-project/sql/issues/2431
          .replace(/`/g, '') // https://github.com/opensearch-project/dashboards-observability/issues/509, https://github.com/opensearch-project/dashboards-observability/issues/557
          .replace(/\bSPAN\(/g, 'span('); // https://github.com/opensearch-project/dashboards-observability/issues/759
        return response.ok({ body: ppl });
      } catch (error) {
        if (
          isResponseError(error) &&
          error.statusCode === 400 &&
          error.body.includes(ERROR_DETAILS.GUARDRAILS_TRIGGERED)
        ) {
          return response.badRequest({ body: ERROR_DETAILS.GUARDRAILS_TRIGGERED });
        }
        return response.custom({ statusCode: error.statusCode || 500, body: error.message });
      }
    }
  );
}
