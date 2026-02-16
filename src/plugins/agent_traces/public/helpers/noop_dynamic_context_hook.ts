/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Stable NOOP hook reference used as a fallback when contextProvider is not available.
 * Shared across components to avoid duplicating the same no-op pattern.
 */
export const NOOP_DYNAMIC_CONTEXT_HOOK = (_options?: any, _shouldCleanup?: boolean): string => '';
