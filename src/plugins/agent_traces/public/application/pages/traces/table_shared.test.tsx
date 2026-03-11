/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PPL_SORT_FIELDS, buildPplSortClause, TableLoadingState } from './table_shared';

describe('table_shared', () => {
  describe('PPL_SORT_FIELDS', () => {
    it('maps UI fields to PPL fields', () => {
      expect(PPL_SORT_FIELDS.startTime).toBe('startTime');
      expect(PPL_SORT_FIELDS.kind).toBe('`attributes.gen_ai.operation.name`');
      expect(PPL_SORT_FIELDS.latency).toBe('durationInNanos');
      expect(PPL_SORT_FIELDS.name).toBe('name');
      expect(PPL_SORT_FIELDS.status).toBe('`status.code`');
    });
  });

  describe('buildPplSortClause', () => {
    it('builds descending sort clause', () => {
      expect(buildPplSortClause('startTime', 'desc')).toBe('| sort - startTime');
    });

    it('builds ascending sort clause', () => {
      expect(buildPplSortClause('startTime', 'asc')).toBe('| sort startTime');
    });

    it('maps latency field to durationInNanos', () => {
      expect(buildPplSortClause('latency', 'desc')).toBe('| sort - durationInNanos');
    });

    it('maps kind field to gen_ai.operation.name', () => {
      expect(buildPplSortClause('kind', 'asc')).toBe('| sort `attributes.gen_ai.operation.name`');
    });

    it('passes through unknown simple fields as-is', () => {
      expect(buildPplSortClause('unknownField', 'desc')).toBe('| sort - unknownField');
    });

    it('wraps dotted field names in backticks', () => {
      expect(buildPplSortClause('resource.attributes.service.name', 'asc')).toBe(
        '| sort `resource.attributes.service.name`'
      );
    });
  });

  describe('TableLoadingState', () => {
    it('renders loading spinner with message', () => {
      render(<TableLoadingState message="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
