/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger } from '../../../../core/server';
import { ConfigSchema } from '../../config';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    query_assist: {
      configPromise: ConfigSchema;
      logger: Logger;
    };
  }
}
