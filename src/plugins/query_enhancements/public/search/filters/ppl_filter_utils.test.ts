/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Filter } from '../../../../data/common';
import { PPLFilterUtils } from './ppl_filter_utils';

// Access private method for testing
const addFilterToQuery = (PPLFilterUtils as any).addFilterToQuery;

const createFilter = (field: string, value: string, negate: boolean = false): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    index: 'mock-index',
    negate,
  },
  query: { match_phrase: { [field]: value } },
});

const createExistsFilter = (field: string, negate: boolean = false): Filter =>
  ({
    meta: { alias: null, disabled: false, index: 'mock-index', negate },
    exists: { field },
  }) as unknown as Filter;

describe('PPLFilterUtils', () => {
  describe('insertWhereCommand', () => {
    it('should return original query when whereCommand is empty', () => {
      const query = 'source=test_index | fields *';
      expect(PPLFilterUtils.insertWhereCommand(query, '')).toBe(query);
    });

    it('should insert where command after first command', () => {
      const query = 'source=test_index | fields *';
      const whereCommand = 'WHERE field = "test"';
      expect(PPLFilterUtils.insertWhereCommand(query, whereCommand)).toBe(
        'source=test_index | WHERE field = "test" | fields *'
      );
    });

    it('should handle queries with no pipes', () => {
      const query = 'source=test_index';
      const whereCommand = 'WHERE field = "test"';
      expect(PPLFilterUtils.insertWhereCommand(query, whereCommand)).toBe(
        'source=test_index | WHERE field = "test"'
      );
    });

    it('should properly trim and format commands', () => {
      const query = 'source=test_index  |  fields  *  ';
      const whereCommand = '  WHERE field = "test"  ';
      // The implementation keeps spaces within the command parts
      expect(PPLFilterUtils.insertWhereCommand(query, whereCommand)).toBe(
        'source=test_index | WHERE field = "test" | fields  *'
      );
    });
  });

  describe('addFilterToQuery (private method)', () => {
    it('should return original query when predicate is undefined', () => {
      const query = 'source=test_index | fields *';
      // Create a filter that will result in undefined predicate
      const filter = {
        meta: { type: 'unknown', negate: false },
      } as Filter;

      const result = addFilterToQuery(query, filter);
      expect(result).toEqual(query);
    });

    it('merges a value filter into the search expression', () => {
      const query = 'source=test_index | fields *';
      const filter = createFilter('field1', 'value1');
      const result = addFilterToQuery(query, filter);
      expect(result).toBe("source=test_index `field1` = 'value1' | fields *");
    });

    it('does not add a duplicate value filter', () => {
      const query = "source=test_index `field1` = 'value1' | fields *";
      const filter = createFilter('field1', 'value1');
      const result = addFilterToQuery(query, filter);
      expect(result).toBe("source=test_index `field1` = 'value1' | fields *");
    });

    it('flips a negated value filter in place', () => {
      const query = "source=test_index `field1` != 'value1' | fields *";
      const filter = createFilter('field1', 'value1', false);
      const result = addFilterToQuery(query, filter);
      expect(result).toBe("source=test_index `field1` = 'value1' | fields *");
    });
  });

  describe('addFiltersToQuery', () => {
    it('should return original query when filters array is empty', () => {
      const query = 'source=test_index | fields *';
      const result = PPLFilterUtils.addFiltersToQuery(query, []);
      expect(result).toEqual(query);
    });

    it('merges a single value filter into the search expression', () => {
      const query = 'source=test_index | fields *';
      const filters = [createFilter('field1', 'value1')];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe("source=test_index `field1` = 'value1' | fields *");
    });

    it('space-appends multiple value filters (implicit AND)', () => {
      const query = 'source=test_index | fields *';
      const filters = [createFilter('field1', 'value1'), createFilter('field2', 'value2')];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe("source=test_index `field1` = 'value1' `field2` = 'value2' | fields *");
    });

    it('does not add duplicate value filters', () => {
      const query = "source=test_index `field1` = 'value1' | fields *";
      const filters = [createFilter('field1', 'value1')];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe("source=test_index `field1` = 'value1' | fields *");
    });

    it('flips a negated value filter in place', () => {
      const query = "source=test_index `field1` != 'value1' | fields *";
      const filters = [createFilter('field1', 'value1', false)];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe("source=test_index `field1` = 'value1' | fields *");
    });

    it('handles an empty query', () => {
      const query = '';
      const filters = [createFilter('field1', 'value1')];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe("`field1` = 'value1'");
    });

    it('routes a positive exists filter to a WHERE command', () => {
      const query = 'source=test_index | fields *';
      const filters = [createExistsFilter('field1')];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe('source=test_index | WHERE ISNOTNULL(`field1`) | fields *');
    });

    it('routes a negated exists filter to an ISNULL WHERE command', () => {
      const query = 'source=test_index | fields *';
      const filters = [createExistsFilter('field1', true)];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe('source=test_index | WHERE ISNULL(`field1`) | fields *');
    });

    it('does not add a duplicate exists filter', () => {
      const query = 'source=test_index | WHERE ISNOTNULL(`field1`) | fields *';
      const filters = [createExistsFilter('field1')];
      const result = PPLFilterUtils.addFiltersToQuery(query, filters);
      expect(result).toBe('source=test_index | WHERE ISNOTNULL(`field1`) | fields *');
    });
  });
});
