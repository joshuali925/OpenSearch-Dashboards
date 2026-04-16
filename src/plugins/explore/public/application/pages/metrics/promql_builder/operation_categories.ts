/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OperationDef {
  id: string;
  name: string;
  params: string[];
  paramNames?: string[];
  description: string;
}

export interface OperationCategory {
  name: string;
  items: OperationDef[];
}

export const OPERATORS = ['=', '!=', '=~', '!~'];

export const AGGREGATION_IDS = new Set([
  'sum',
  'avg',
  'min',
  'max',
  'count',
  'group',
  'stddev',
  'stdvar',
]);

export const OPERATION_CATEGORIES: OperationCategory[] = [
  {
    name: 'Add range',
    items: [
      {
        id: 'rate',
        name: 'rate',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description:
          'Calculates the per-second average rate of increase of the time series in the range vector.',
      },
      {
        id: 'irate',
        name: 'irate',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description:
          'Calculates the per-second instant rate of increase of the time series in the range vector.',
      },
      {
        id: 'increase',
        name: 'increase',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description: 'Calculates the increase in the time series in the range vector.',
      },
      {
        id: 'delta',
        name: 'delta',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description:
          'Calculates the difference between the first and last value of each time series element in a range vector.',
      },
      {
        id: 'avg_over_time',
        name: 'avg_over_time',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description: 'The average value of all points in the specified interval.',
      },
      {
        id: 'min_over_time',
        name: 'min_over_time',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description: 'The minimum value of all points in the specified interval.',
      },
      {
        id: 'max_over_time',
        name: 'max_over_time',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description: 'The maximum value of all points in the specified interval.',
      },
      {
        id: 'sum_over_time',
        name: 'sum_over_time',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description: 'The sum of all values in the specified interval.',
      },
      {
        id: 'count_over_time',
        name: 'count_over_time',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description: 'The count of all values in the specified interval.',
      },
      {
        id: 'absent_over_time',
        name: 'absent_over_time',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description:
          'Returns an empty vector if the range vector passed to it has any elements and a 1-element vector with the value 1 if the range vector passed to it has no elements.',
      },
      {
        id: 'changes',
        name: 'changes',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description:
          'Returns the number of times its value has changed within the provided time range as an instant vector.',
      },
      {
        id: 'resets',
        name: 'resets',
        params: ['$__rate_interval'],
        paramNames: ['Range'],
        description:
          'Returns the number of counter resets within the provided time range as an instant vector.',
      },
    ],
  },
  {
    name: 'Add function',
    items: [
      {
        id: 'abs',
        name: 'abs',
        params: [],
        description:
          'Returns the input vector with all sample values converted to their absolute value.',
      },
      {
        id: 'absent',
        name: 'absent',
        params: [],
        description:
          'Returns an empty vector if the vector passed to it has any elements and a 1-element vector with the value 1 if the vector passed to it has no elements.',
      },
      {
        id: 'ceil',
        name: 'ceil',
        params: [],
        description:
          'Rounds the sample values of all elements in the input vector up to the nearest integer.',
      },
      {
        id: 'floor',
        name: 'floor',
        params: [],
        description:
          'Rounds the sample values of all elements in the input vector down to the nearest integer.',
      },
      {
        id: 'round',
        name: 'round',
        params: [],
        description:
          'Rounds the sample values of all elements in the input vector to the nearest integer.',
      },
      {
        id: 'exp',
        name: 'exp',
        params: [],
        description: 'Calculates the exponential function for all elements in the input vector.',
      },
      {
        id: 'ln',
        name: 'ln',
        params: [],
        description: 'Calculates the natural logarithm for all elements in the input vector.',
      },
      {
        id: 'sqrt',
        name: 'sqrt',
        params: [],
        description: 'Calculates the square root of all elements in the input vector.',
      },
      {
        id: 'histogram_quantile',
        name: 'histogram_quantile',
        params: ['0.95'],
        paramNames: ['Quantile'],
        description: 'Calculates the φ-quantile from the buckets of a histogram.',
      },
      {
        id: 'label_replace',
        name: 'label_replace',
        params: ['', '', '', ''],
        paramNames: ['Destination label', 'Replacement', 'Source label', 'Regex'],
        description: 'Matches the regular expression against the label value, then replaces it.',
      },
      {
        id: 'clamp',
        name: 'clamp',
        params: ['1', '100'],
        paramNames: ['Min', 'Max'],
        description:
          'Clamps the sample values of all elements in the input vector to have a lower and upper limit.',
      },
      {
        id: 'clamp_min',
        name: 'clamp_min',
        params: ['0'],
        paramNames: ['Min'],
        description:
          'Clamps the sample values of all elements in the input vector to have a lower limit.',
      },
      {
        id: 'clamp_max',
        name: 'clamp_max',
        params: ['100'],
        paramNames: ['Max'],
        description:
          'Clamps the sample values of all elements in the input vector to have an upper limit.',
      },
    ],
  },
  {
    name: 'Add aggregation',
    items: [
      { id: 'sum', name: 'sum', params: [], description: 'Calculate sum over dimensions.' },
      { id: 'avg', name: 'avg', params: [], description: 'Calculate the average over dimensions.' },
      { id: 'min', name: 'min', params: [], description: 'Select minimum over dimensions.' },
      { id: 'max', name: 'max', params: [], description: 'Select maximum over dimensions.' },
      {
        id: 'count',
        name: 'count',
        params: [],
        description: 'Count number of elements in the vector.',
      },
      {
        id: 'group',
        name: 'group',
        params: [],
        description: 'All values in the resulting vector are 1.',
      },
      {
        id: 'stddev',
        name: 'stddev',
        params: [],
        description: 'Calculate population standard deviation over dimensions.',
      },
      {
        id: 'stdvar',
        name: 'stdvar',
        params: [],
        description: 'Calculate population standard variance over dimensions.',
      },
      {
        id: 'topk',
        name: 'topk',
        params: ['5'],
        paramNames: ['K'],
        description: 'Largest k elements by sample value.',
      },
      {
        id: 'bottomk',
        name: 'bottomk',
        params: ['5'],
        paramNames: ['K'],
        description: 'Smallest k elements by sample value.',
      },
      {
        id: 'count_values',
        name: 'count_values',
        params: ['value'],
        paramNames: ['Label'],
        description: 'Count number of elements with the same value.',
      },
      {
        id: 'quantile',
        name: 'quantile',
        params: ['0.95'],
        paramNames: ['Quantile'],
        description: 'Calculate φ-quantile over dimensions.',
      },
    ],
  },
  {
    name: 'Add binary operation',
    items: [
      {
        id: 'add',
        name: '+ (add)',
        params: [''],
        paramNames: ['Value'],
        description: 'Add a scalar value to each sample value.',
      },
      {
        id: 'sub',
        name: '- (subtract)',
        params: [''],
        paramNames: ['Value'],
        description: 'Subtract a scalar value from each sample value.',
      },
      {
        id: 'mul',
        name: '* (multiply)',
        params: [''],
        paramNames: ['Value'],
        description: 'Multiply each sample value by a scalar.',
      },
      {
        id: 'div',
        name: '/ (divide)',
        params: [''],
        paramNames: ['Value'],
        description: 'Divide each sample value by a scalar.',
      },
      {
        id: 'mod',
        name: '% (modulo)',
        params: [''],
        paramNames: ['Value'],
        description: 'Modulo of each sample value by a scalar.',
      },
      {
        id: 'pow',
        name: '^ (power)',
        params: [''],
        paramNames: ['Value'],
        description: 'Raise each sample value to the power of a scalar.',
      },
    ],
  },
  {
    name: 'Replace with literal',
    items: [
      {
        id: 'literal',
        name: 'literal',
        params: ['0'],
        paramNames: ['Value'],
        description: 'Replace the query with a literal value.',
      },
    ],
  },
];

const OP_CATEGORY_MAP: Record<string, string> = {};
OPERATION_CATEGORIES.forEach((cat) => {
  cat.items.forEach((item) => {
    OP_CATEGORY_MAP[item.id] = cat.name.replace(/^Add /, '').replace(/^Replace with /, '');
  });
});

export function getCategoryLabel(opId: string): string {
  const cat = OP_CATEGORY_MAP[opId];
  if (!cat) return 'Operation';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export const OP_DEF_MAP: Record<string, OperationDef> = {};
OPERATION_CATEGORIES.forEach((cat) => {
  cat.items.forEach((item) => {
    OP_DEF_MAP[item.id] = item;
  });
});

export function getOperationSiblings(opId: string): OperationDef[] {
  for (const cat of OPERATION_CATEGORIES) {
    if (cat.items.find((item) => item.id === opId)) return cat.items;
  }
  return [];
}
