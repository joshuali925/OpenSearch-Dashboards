/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './promql_builder.scss';

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  EuiBadge,
  EuiCode,
  EuiSuperSelect,
} from '@elastic/eui';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import { PrometheusClient } from '../explore/services/prometheus_client';
import {
  BuilderState,
  LabelFilter,
  Operation,
  OperationGrouping,
  RANGE_FUNCTIONS,
} from './promql_parser';

type BuilderAction =
  | { type: 'SET_METRIC'; metric: string }
  | { type: 'SET_LABEL_FILTER'; index: number; filter: Partial<LabelFilter> }
  | { type: 'ADD_LABEL_FILTER' }
  | { type: 'REMOVE_LABEL_FILTER'; index: number }
  | { type: 'ADD_OPERATION'; operation: Operation }
  | { type: 'REMOVE_OPERATION'; index: number }
  | { type: 'SET_OPERATION_PARAM'; index: number; paramIndex: number; value: string }
  | { type: 'SET_OPERATION_GROUPING'; index: number; grouping: OperationGrouping | undefined }
  | { type: 'INIT'; state: BuilderState }
  | { type: 'RESET' };

const OPERATORS = ['=', '!=', '=~', '!~'];

// Measure text width using a hidden canvas for auto-sizing combo boxes
const measureCanvas = (() => {
  let canvas: HTMLCanvasElement | null = null;
  return (
    text: string,
    font = '14px Rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
  ): number => {
    if (!canvas) canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    return Math.ceil(ctx.measureText(text).width);
  };
})();

/**
 * Returns a minWidth style value that fits the displayed text (selected value or placeholder).
 * Adds padding for the combo box chrome (icon, borders, etc).
 * EUI compressed combo box has ~8px left padding + ~54px right padding (for arrow/clear buttons)
 * plus the pill element has maxWidth: calc(100% - 18px), so we need 80px + buffer.
 */
function comboBoxWidth(text: string, padding = 86, min = 200, max = 350): number {
  return Math.min(Math.max(measureCanvas(text) + padding, min), max);
}

interface OperationDef {
  id: string;
  name: string;
  params: string[];
  paramNames?: string[];
  description: string;
}

interface OperationCategory {
  name: string;
  items: OperationDef[];
}

const OPERATION_CATEGORIES: OperationCategory[] = [
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

// Map operation IDs to their category name for pill display
const OP_CATEGORY_MAP: Record<string, string> = {};
OPERATION_CATEGORIES.forEach((cat) => {
  cat.items.forEach((item) => {
    OP_CATEGORY_MAP[item.id] = cat.name.replace(/^Add /, '').replace(/^Replace with /, '');
  });
});

// Capitalize first letter for pill label
function getCategoryLabel(opId: string): string {
  const cat = OP_CATEGORY_MAP[opId];
  if (!cat) return 'Operation';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

const AGGREGATION_IDS = new Set(['sum', 'avg', 'min', 'max', 'count', 'group', 'stddev', 'stdvar']);

// Pre-computed lookup: operation ID → OperationDef (avoids repeated flatMap+find in render)
const OP_DEF_MAP: Record<string, OperationDef> = {};
OPERATION_CATEGORIES.forEach((cat) => {
  cat.items.forEach((item) => {
    OP_DEF_MAP[item.id] = item;
  });
});

const emptyFilter = (): LabelFilter => ({ label: '', op: '=', value: '' });

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_METRIC':
      return { ...state, metric: action.metric };
    case 'SET_LABEL_FILTER': {
      const filters = [...state.labelFilters];
      filters[action.index] = { ...filters[action.index], ...action.filter };
      return { ...state, labelFilters: filters };
    }
    case 'ADD_LABEL_FILTER':
      return { ...state, labelFilters: [...state.labelFilters, emptyFilter()] };
    case 'REMOVE_LABEL_FILTER':
      return { ...state, labelFilters: state.labelFilters.filter((_, i) => i !== action.index) };
    case 'ADD_OPERATION':
      return { ...state, operations: [...state.operations, action.operation] };
    case 'REMOVE_OPERATION':
      return { ...state, operations: state.operations.filter((_, i) => i !== action.index) };
    case 'SET_OPERATION_PARAM': {
      const ops = [...state.operations];
      const params = [...ops[action.index].params];
      params[action.paramIndex] = action.value;
      ops[action.index] = { ...ops[action.index], params };
      return { ...state, operations: ops };
    }
    case 'SET_OPERATION_GROUPING': {
      const ops = [...state.operations];
      ops[action.index] = { ...ops[action.index], grouping: action.grouping };
      return { ...state, operations: ops };
    }
    case 'INIT':
      return action.state;
    case 'RESET':
      return { metric: '', labelFilters: [emptyFilter()], operations: [] };
    default:
      return state;
  }
}

// --- PromQL Generation ---

export function buildPromQL(state: BuilderState): string {
  if (!state.metric) return '';

  const matchers = state.labelFilters
    .filter((f) => f.label && f.value)
    .map((f) => `${f.label}${f.op}"${f.value}"`);

  let selector = state.metric;
  if (matchers.length > 0) {
    selector = `${state.metric}{${matchers.join(', ')}}`;
  }

  let expr = selector;
  for (const op of state.operations) {
    if (RANGE_FUNCTIONS.has(op.id)) {
      const interval = op.params[0] || '5m';
      expr = `${op.id}(${expr}[${interval}])`;
    } else if (AGGREGATION_IDS.has(op.id)) {
      const groupingClause = op.grouping?.labels?.length
        ? ` ${op.grouping.mode} (${op.grouping.labels.join(', ')})`
        : '';
      expr = `${op.id}${groupingClause}(${expr})`;
    } else if (['topk', 'bottomk'].includes(op.id)) {
      expr = `${op.id}(${op.params[0] || '5'}, ${expr})`;
    } else if (op.id === 'count_values') {
      expr = `count_values("${op.params[0] || 'value'}", ${expr})`;
    } else if (op.id === 'quantile') {
      expr = `quantile(${op.params[0] || '0.95'}, ${expr})`;
    } else if (op.id === 'histogram_quantile') {
      expr = `histogram_quantile(${op.params[0] || '0.95'}, ${expr})`;
    } else if (['add', 'sub', 'mul', 'div', 'mod', 'pow'].includes(op.id)) {
      const opSymbol: Record<string, string> = {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%',
        pow: '^',
      };
      expr = `${expr} ${opSymbol[op.id]} ${op.params[0] || '0'}`;
    } else if (op.id === 'label_replace') {
      const [dst = '', replacement = '', src = '', regex = ''] = op.params;
      expr = `label_replace(${expr}, "${dst}", "${replacement}", "${src}", "${regex}")`;
    } else if (op.id === 'literal') {
      expr = op.params[0] || '0';
    } else {
      const paramStr = op.params.length > 0 ? ', ' + op.params.join(', ') : '';
      expr = `${op.id}(${expr}${paramStr})`;
    }
  }

  return expr;
}

// --- Aggregation Grouping UI ---

const MODE_OPTIONS = [
  { value: 'by' as const, inputDisplay: 'by labels ▾' },
  { value: 'without' as const, inputDisplay: 'without ▾' },
];

const useAggregationGrouping = (
  op: Operation,
  opIndex: number,
  labelOptions: EuiComboBoxOptionOption[],
  dispatch: React.Dispatch<BuilderAction>
) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const mode = op.grouping?.mode || 'by';
  const labels = op.grouping?.labels || [];

  const availableLabels = useMemo(() => {
    const all = labelOptions.map((o) => o.label);
    if (!search) return all;
    const lower = search.toLowerCase();
    return all.filter((l) => l.toLowerCase().includes(lower));
  }, [labelOptions, search]);

  const setGrouping = (g?: OperationGrouping) =>
    dispatch({ type: 'SET_OPERATION_GROUPING', index: opIndex, grouping: g });

  const toggleLabel = (label: string) => {
    const next = labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label];
    setGrouping(next.length ? { mode, labels: next } : undefined);
  };

  const removeLabel = (label: string) => {
    const next = labels.filter((l) => l !== label);
    setGrouping(next.length ? { mode, labels: next } : undefined);
  };

  const setMode = (newMode: 'by' | 'without') => setGrouping({ mode: newMode, labels });

  const toggleSelectAll = () => {
    const all = labelOptions.map((o) => o.label);
    const next = labels.length === all.length ? [] : all;
    setGrouping(next.length ? { mode, labels: next } : undefined);
  };

  const appendEl = (
    <EuiPopover
      button={
        <button
          onClick={() => setPopoverOpen(!popoverOpen)}
          className="euiFormControlLayout__append pqbGroupingButton"
        >
          {mode} labels ▾
        </button>
      }
      isOpen={popoverOpen}
      closePopover={() => {
        setPopoverOpen(false);
        setSearch('');
      }}
      panelPaddingSize="s"
      anchorPosition="downLeft"
    >
      <div className="pqbGroupingPanel">
        <EuiSuperSelect
          compressed
          options={MODE_OPTIONS}
          valueOfSelected={mode}
          onChange={(val) => setMode(val)}
          style={{ marginBottom: 6 }}
        />
        <input
          placeholder="Search labels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pqbGroupingSearch"
        />
        <label className="pqbCheckboxLabel">
          <input
            type="checkbox"
            checked={labels.length > 0 && labels.length === labelOptions.length}
            readOnly
            onChange={toggleSelectAll}
          />
          Select all
        </label>
        <div className="pqbCheckboxList">
          {availableLabels.map((label) => (
            <label key={label} className="pqbCheckboxLabel">
              <input
                type="checkbox"
                checked={labels.includes(label)}
                onChange={() => toggleLabel(label)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </EuiPopover>
  );

  const badgesEl = labels.map((label) => (
    <EuiBadge
      key={label}
      color="hollow"
      iconType="cross"
      iconSide="right"
      iconOnClick={() => removeLabel(label)}
      iconOnClickAriaLabel={`Remove ${label}`}
      onClick={() => {}}
      onClickAriaLabel={label}
    >
      {label}
    </EuiBadge>
  ));

  return { appendEl, badgesEl };
};

// --- Component ---

interface OperationPillProps {
  op: Operation;
  idx: number;
  dispatch: React.Dispatch<BuilderAction>;
  labelOptions: EuiComboBoxOptionOption[];
  getOperationSiblings: (opId: string) => OperationDef[];
}

const OperationPill: React.FC<OperationPillProps> = ({
  op,
  idx,
  dispatch,
  labelOptions,
  getOperationSiblings,
}) => {
  const isAgg = AGGREGATION_IDS.has(op.id);
  const grouping = useAggregationGrouping(op, idx, labelOptions, dispatch);
  const opDef = OP_DEF_MAP[op.id];

  return (
    <div className="pqbPill">
      <div className="pqbPill__label">{getCategoryLabel(op.id)}</div>
      <div className="pqbPill__body">
        <EuiComboBox
          compressed
          singleSelection={{ asPlainText: true }}
          options={getOperationSiblings(op.id).map((s) => ({ label: s.name }))}
          selectedOptions={[{ label: op.name }]}
          onChange={(selected) => {
            const newName = selected[0]?.label || op.name;
            const newDef = getOperationSiblings(op.id).find((s) => s.name === newName);
            if (newDef) {
              dispatch({ type: 'REMOVE_OPERATION', index: idx });
              dispatch({
                type: 'ADD_OPERATION',
                operation: { id: newDef.id, name: newDef.name, params: [...newDef.params] },
              });
            }
          }}
          style={{ minWidth: comboBoxWidth(op.name) }}
          append={isAgg ? grouping.appendEl : undefined}
        />
        {isAgg && grouping.badgesEl}
        {op.params.length > 0 &&
          op.params.map((p, pi) => (
            <input
              key={pi}
              value={p}
              placeholder={opDef?.paramNames?.[pi] || ''}
              onChange={(e) =>
                dispatch({
                  type: 'SET_OPERATION_PARAM',
                  index: idx,
                  paramIndex: pi,
                  value: e.target.value,
                })
              }
              className="pqbParamInput"
            />
          ))}
        <EuiButtonIcon
          iconType="cross"
          size="s"
          color="text"
          aria-label="Remove operation"
          onClick={() => dispatch({ type: 'REMOVE_OPERATION', index: idx })}
        />
        <EuiToolTip content={opDef?.description || ''}>
          <EuiButtonIcon iconType="iInCircle" size="s" color="text" aria-label="Operation info" />
        </EuiToolTip>
      </div>
    </div>
  );
};

interface PromQLBuilderProps {
  client: PrometheusClient;
  onQueryChange: (query: string) => void;
  initialState?: BuilderState;
}

export const PromQLBuilder: React.FC<PromQLBuilderProps> = ({
  client,
  onQueryChange,
  initialState,
}) => {
  const [state, dispatch] = useReducer(
    builderReducer,
    initialState || {
      metric: '',
      labelFilters: [emptyFilter()],
      operations: [],
    }
  );

  const [metricOptions, setMetricOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [metricSearchLoading, setMetricSearchLoading] = useState(false);
  const [labelOptions, setLabelOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [labelValueOptions, setLabelValueOptions] = useState<
    Record<string, EuiComboBoxOptionOption[]>
  >({});
  const [opsPopoverOpen, setOpsPopoverOpen] = useState(false);
  const [labelCardinality, setLabelCardinality] = useState<Record<string, number>>({});
  const [labelPopover, setLabelPopover] = useState<string | null>(null);
  const [labelPopoverValues, setLabelPopoverValues] = useState<string[]>([]);
  const [labelsExpanded, setLabelsExpanded] = useState(false);

  const prevQueryRef = useRef('');
  const metricSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const metricNamesLoadedRef = useRef(false);

  // Sync generated query to parent
  useEffect(() => {
    const query = buildPromQL(state);
    if (query !== prevQueryRef.current) {
      prevQueryRef.current = query;
      onQueryChange(query);
    }
  }, [state, onQueryChange]);

  const onMetricFocus = useCallback(() => {
    if (metricNamesLoadedRef.current || metricOptions.length > 0) return;
    metricNamesLoadedRef.current = true;
    setMetricSearchLoading(true);
    client
      .getMetricNames()
      .then((names) => setMetricOptions(names.slice(0, 100).map((n) => ({ label: n }))))
      .catch(() => {})
      .finally(() => setMetricSearchLoading(false));
  }, [client, metricOptions.length]);

  const onMetricSearchChange = useCallback(
    (searchValue: string) => {
      clearTimeout(metricSearchTimerRef.current);
      setMetricSearchLoading(false);
      if (searchValue.length < 2) {
        if (metricNamesLoadedRef.current) {
          client
            .getMetricNames()
            .then((names) => setMetricOptions(names.slice(0, 100).map((n) => ({ label: n }))))
            .catch(() => {});
        }
        return;
      }
      setMetricSearchLoading(true);
      metricSearchTimerRef.current = setTimeout(() => {
        client
          .searchMetricNames(searchValue)
          .then((names) => setMetricOptions(names.slice(0, 100).map((n) => ({ label: n }))))
          .catch(() => setMetricOptions([]))
          .finally(() => setMetricSearchLoading(false));
      }, 200);
    },
    [client]
  );

  // Fetch label names and derive cardinality from a single getSeries call
  useEffect(() => {
    if (!state.metric) {
      setLabelOptions([]);
      setLabelCardinality({});
      return;
    }
    let cancelled = false;
    Promise.all([
      client.getLabelsForMetric(state.metric),
      client.getSeries(`{__name__="${state.metric}"}`),
    ])
      .then(([labels, series]) => {
        if (cancelled) return;
        setLabelOptions(labels.map((l) => ({ label: l })));

        const valueSets: Record<string, Set<string>> = {};
        for (const s of series) {
          for (const [key, value] of Object.entries(s)) {
            if (key === '__name__') continue;
            if (!valueSets[key]) valueSets[key] = new Set();
            valueSets[key].add(value);
          }
        }
        const cardinality: Record<string, number> = {};
        for (const label of labels) {
          cardinality[label] = valueSets[label]?.size ?? 0;
        }
        setLabelCardinality(cardinality);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [client, state.metric]);

  const loadLabelValues = useCallback(
    (labelName: string) => {
      if (!labelName || labelValueOptions[labelName]) return;
      client
        .getLabelValues(labelName, state.metric)
        .then((values) => {
          setLabelValueOptions((prev) => ({
            ...prev,
            [labelName]: values.map((v) => ({ label: v })),
          }));
        })
        .catch(() => {});
    },
    [client, state.metric, labelValueOptions]
  );

  // Handle label badge click - load values and open popover
  const onLabelBadgeClick = useCallback(
    (labelName: string) => {
      setLabelPopover(labelName);
      client
        .getLabelValues(labelName, state.metric)
        .then((values) => setLabelPopoverValues(values))
        .catch(() => setLabelPopoverValues([]));
    },
    [client, state.metric]
  );

  // Add aggregation by label shortcut
  const addAggregationByLabel = useCallback((aggId: string, aggName: string, labelName: string) => {
    dispatch({
      type: 'ADD_OPERATION',
      operation: {
        id: aggId,
        name: aggName,
        params: [],
        grouping:
          aggId === 'group'
            ? { mode: 'without', labels: [labelName] }
            : { mode: 'by', labels: [labelName] },
      },
    });
    setLabelPopover(null);
  }, []);

  // Build context menu panels with descriptions
  const opsMenuPanels = useMemo(
    () => [
      {
        id: 0,
        items: OPERATION_CATEGORIES.map((cat, i) => ({
          name: cat.name,
          panel: i + 1,
        })),
      },
      ...OPERATION_CATEGORIES.map((cat, i) => ({
        id: i + 1,
        title: cat.name,
        items: cat.items.map((item) => ({
          name: (
            <div>
              <strong>{item.name}</strong>
              <EuiText size="xs" color="subdued" style={{ whiteSpace: 'normal', maxWidth: 300 }}>
                {item.description}
              </EuiText>
            </div>
          ),
          onClick: () => {
            dispatch({
              type: 'ADD_OPERATION',
              operation: { id: item.id, name: item.name, params: [...item.params] },
            });
            setOpsPopoverOpen(false);
          },
        })),
      })),
    ],
    []
  );

  // Get all items in a category for the operation dropdown
  const getOperationSiblings = (opId: string): OperationDef[] => {
    for (const cat of OPERATION_CATEGORIES) {
      const found = cat.items.find((item) => item.id === opId);
      if (found) return cat.items;
    }
    return [];
  };

  // Operations are rendered outermost-first (reversed from state order),
  // each indented one level deeper, with the metric row at the deepest level.
  const reversedOps = useMemo(() => [...state.operations].reverse(), [state.operations]);

  // Wraps a child with a tree connector from its parent:
  // vertical line from above, horizontal branch at child's vertical center
  // anchorY: fixed pixel offset for the horizontal branch. When omitted, defaults to 50%
  // of the container height. Use a fixed value for rows that wrap (e.g. metric row) so the
  // branch always points to the vertical center of the first line.
  const withConnector = (
    depth: number,
    content: React.ReactNode,
    isLast = false,
    anchorY?: number
  ) => (
    <div style={{ marginLeft: depth * 24, display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          alignSelf: 'stretch',
          width: 16,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Vertical line: full height for ├, stops at anchor for └ */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 6,
            bottom: isLast ? (anchorY !== undefined ? `calc(100% - ${anchorY}px)` : '50%') : 0,
            borderLeft: `2px solid ${euiThemeVars.euiColorLightShade}`,
          }}
        />
        {/* Horizontal branch */}
        <div
          style={{
            position: 'absolute',
            top: anchorY !== undefined ? anchorY : '50%',
            left: 6,
            right: 0,
            borderBottom: `2px solid ${euiThemeVars.euiColorLightShade}`,
          }}
        />
      </div>
      <div style={{ minWidth: 0 }}>{content}</div>
    </div>
  );

  // Metric + Label filters row (extracted so it can be wrapped in tree connector)
  const metricRow = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>Metric</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        style={{ minWidth: comboBoxWidth(state.metric || 'Select metric name') }}
      >
        <EuiComboBox
          compressed
          singleSelection={{ asPlainText: true }}
          placeholder="Select metric name"
          options={metricOptions}
          selectedOptions={state.metric ? [{ label: state.metric }] : []}
          onChange={(selected) =>
            dispatch({ type: 'SET_METRIC', metric: selected[0]?.label || '' })
          }
          onCreateOption={(val) => {
            const v = val.trim();
            if (v) dispatch({ type: 'SET_METRIC', metric: v });
          }}
          onFocus={onMetricFocus}
          onSearchChange={onMetricSearchChange}
          isLoading={metricSearchLoading}
          async
          data-test-subj="promqlBuilderMetricSelect"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>Label</strong>
        </EuiText>
      </EuiFlexItem>
      {state.labelFilters.map((filter, idx) => (
        <React.Fragment key={idx}>
          <EuiFlexItem grow={false}>
            <div className="pqbLabelFilterRow">
              <EuiComboBox
                compressed
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                placeholder="Label name"
                options={labelOptions}
                selectedOptions={filter.label ? [{ label: filter.label }] : []}
                onChange={(selected) => {
                  const labelName = selected[0]?.label || '';
                  dispatch({
                    type: 'SET_LABEL_FILTER',
                    index: idx,
                    filter: { label: labelName, value: '' },
                  });
                  if (labelName) loadLabelValues(labelName);
                }}
                onCreateOption={(val) => {
                  const labelName = val.trim();
                  if (labelName) {
                    dispatch({
                      type: 'SET_LABEL_FILTER',
                      index: idx,
                      filter: { label: labelName, value: '' },
                    });
                    loadLabelValues(labelName);
                  }
                }}
                style={{ width: comboBoxWidth(filter.label || 'Label name'), flex: '0 0 auto' }}
              />
              <EuiSuperSelect
                compressed
                options={OPERATORS.map((op) => ({ value: op, inputDisplay: op }))}
                valueOfSelected={filter.op}
                onChange={(value) =>
                  dispatch({
                    type: 'SET_LABEL_FILTER',
                    index: idx,
                    filter: { op: value },
                  })
                }
                style={{ width: 70 }}
              />
              <EuiComboBox
                compressed
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                placeholder="Label value"
                options={labelValueOptions[filter.label] || []}
                selectedOptions={filter.value ? [{ label: filter.value }] : []}
                onChange={(selected) =>
                  dispatch({
                    type: 'SET_LABEL_FILTER',
                    index: idx,
                    filter: { value: selected[0]?.label || '' },
                  })
                }
                onCreateOption={(val) => {
                  const v = val.trim();
                  if (v) dispatch({ type: 'SET_LABEL_FILTER', index: idx, filter: { value: v } });
                }}
                onFocus={() => {
                  if (filter.label) loadLabelValues(filter.label);
                }}
                style={{ width: comboBoxWidth(filter.value || 'Label value'), flex: '0 0 auto' }}
              />
              <EuiButtonIcon
                iconType="cross"
                color="text"
                aria-label="Remove filter"
                size="s"
                onClick={() =>
                  state.labelFilters.length <= 1
                    ? dispatch({
                        type: 'SET_LABEL_FILTER',
                        index: idx,
                        filter: { label: '', op: '=', value: '' },
                      })
                    : dispatch({ type: 'REMOVE_LABEL_FILTER', index: idx })
                }
              />
            </div>
          </EuiFlexItem>
        </React.Fragment>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="plusInCircle"
          aria-label="Add filter"
          size="s"
          onClick={() => dispatch({ type: 'ADD_LABEL_FILTER' })}
        />
      </EuiFlexItem>
      {/* ⋮ three-dot menu to add operations */}
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="boxesVertical"
              aria-label="Add operation"
              size="s"
              onClick={() => setOpsPopoverOpen(!opsPopoverOpen)}
            />
          }
          isOpen={opsPopoverOpen}
          closePopover={() => setOpsPopoverOpen(false)}
          panelPaddingSize="none"
          panelStyle={{ maxHeight: 400, overflowY: 'auto', overflowX: 'hidden' }}
          anchorPosition="downRight"
        >
          <EuiContextMenu initialPanelId={0} panels={opsMenuPanels} size="s" />
        </EuiPopover>
      </EuiFlexItem>
      {/* Label badges with cardinality */}
      {state.metric &&
        Object.keys(labelCardinality).length > 0 &&
        (() => {
          const labels = Object.entries(labelCardinality);
          const MAX_VISIBLE = 3;
          const visible = labelsExpanded ? labels : labels.slice(0, MAX_VISIBLE);
          const overflow = labels.length - MAX_VISIBLE;
          return (
            <>
              {visible.map(([label, count]) => (
                <EuiFlexItem grow={false} key={label}>
                  <EuiPopover
                    button={
                      <EuiBadge
                        color="hollow"
                        onClick={() => onLabelBadgeClick(label)}
                        onClickAriaLabel={`Show values for ${label}`}
                      >
                        {label} ({count})
                      </EuiBadge>
                    }
                    isOpen={labelPopover === label}
                    closePopover={() => setLabelPopover(null)}
                    panelPaddingSize="s"
                    anchorPosition="downCenter"
                  >
                    <div style={{ minWidth: 200, maxWidth: 320 }}>
                      <EuiText size="s">
                        <strong>{label}</strong>
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <div className="pqbLabelPopoverValues">
                        {labelPopoverValues.map((v) => (
                          <div key={v} className="pqbLabelValueRow">
                            <EuiText size="xs">{v}</EuiText>
                            <EuiButtonIcon
                              iconType="plusInCircle"
                              size="s"
                              aria-label={`Add ${label}=${v} filter`}
                              onClick={() => {
                                dispatch({ type: 'ADD_LABEL_FILTER' });
                                const idx = state.labelFilters.length;
                                setTimeout(() => {
                                  dispatch({
                                    type: 'SET_LABEL_FILTER',
                                    index: idx,
                                    filter: { label, value: v },
                                  });
                                }, 0);
                                setLabelPopover(null);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <EuiSpacer size="xs" />
                      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                        {[
                          { id: 'sum', label: 'Sum by' },
                          { id: 'count', label: 'Count by' },
                          { id: 'avg', label: 'Avg by' },
                          { id: 'max', label: 'Max by' },
                        ].map((agg) => (
                          <EuiFlexItem grow={false} key={agg.id}>
                            <EuiButtonEmpty
                              size="xs"
                              iconType="tableDensityNormal"
                              onClick={() => addAggregationByLabel(agg.id, agg.id, label)}
                            >
                              {agg.label}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                      <EuiSpacer size="xs" />
                      <EuiButtonEmpty
                        size="xs"
                        iconType="cross"
                        onClick={() => addAggregationByLabel('group', 'group', label)}
                      >
                        Group without
                      </EuiButtonEmpty>
                    </div>
                  </EuiPopover>
                </EuiFlexItem>
              ))}
              {overflow > 0 && !labelsExpanded && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={labels
                      .slice(MAX_VISIBLE)
                      .map(([l]) => l)
                      .join(', ')}
                  >
                    <EuiBadge
                      color="hollow"
                      onClick={() => setLabelsExpanded(true)}
                      onClickAriaLabel={`Show ${overflow} more labels`}
                    >
                      (+{overflow})
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {labelsExpanded && overflow > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="hollow"
                    iconType="minimize"
                    iconSide="right"
                    onClick={() => setLabelsExpanded(false)}
                    onClickAriaLabel="Collapse labels"
                  />
                </EuiFlexItem>
              )}
            </>
          );
        })()}
    </EuiFlexGroup>
  );

  return (
    <div className="pqbBuilder">
      {reversedOps.map((op, revIdx) => {
        const stateIdx = state.operations.length - 1 - revIdx;
        const pill = (
          <OperationPill
            op={op}
            idx={stateIdx}
            dispatch={dispatch}
            labelOptions={labelOptions}
            getOperationSiblings={getOperationSiblings}
          />
        );
        return (
          <React.Fragment key={stateIdx}>
            {revIdx === 0 ? pill : withConnector(revIdx - 1, pill, true)}
          </React.Fragment>
        );
      })}

      {/* Metric + Label filters row */}
      {state.operations.length > 0
        ? withConnector(state.operations.length - 1, metricRow, true, 16)
        : metricRow}

      {/* Query preview */}
      <EuiSpacer size="s" />
      <EuiCode language="promql" transparentBackground style={{ fontSize: 12 }}>
        {buildPromQL(state) || 'Fetch all series matching metric name and label filters.'}
      </EuiCode>
    </div>
  );
};
