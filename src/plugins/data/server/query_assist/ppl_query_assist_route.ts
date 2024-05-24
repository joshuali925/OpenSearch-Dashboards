/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { schema } from '@osd/config-schema';
import { IRouter } from 'opensearch-dashboards/server';
// eslint-disable-next-line @osd/eslint/no-restricted-paths
import { isResponseError } from '../../../../core/server/opensearch/client/errors';
import { getAgentIdAndRequest } from './agents';

const ERROR_DETAILS = { GUARDRAILS_TRIGGERED: 'guardrails triggered' };

interface Options {
  index: string;
  question: string;
}
interface Results {
  query: string;
  dateRange?: TimeRange;
}
interface QueryAssistProvider<T extends Options = Options, U extends Results = Results> {
  /**
   * Check if query assist provider is ready.
   *
   * @returns true if the feature is configured and ready to use.
   */
  ready: () => Promise<boolean>;
  /**
   * Generate a query using natural language.
   *
   * @param options natural language question from user with context.
   * @returns string value of the generated query.
   * @throws {Error} If guardrails are triggered, it throws an error with the body 'guardrails triggered'.
   */
  generate: (options: T) => Promise<U>;
}

interface QueryAssistProviderRegistry {
  /**
   * Registers a query assist provider for a language.
   *
   * @param language - The query language the provider supports.
   * @param provider - The query assist provider instance to register.
   * @returns A boolean indicating if the registration was successful.
   */
  registerProvider(language: string, provider: QueryAssistProvider): boolean;
  /**
   * Retrieves a registered query assist provider instance by language.
   *
   * @param language - The query language the provider supports.
   * @returns The query assist provider instance, or `undefined` if not found.
   */
  getProvider(language: string): QueryAssistProvider | undefined;
}

export function registerPplQueryAssistRoute(router: IRouter) {
  router.post(
    {
      path: '/api/opensearch-dashboards/query_assist/ppl/generate',
      validate: {
        body: schema.object({
          index: schema.string(),
          question: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const pplRequest = await getAgentIdAndRequest({
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
