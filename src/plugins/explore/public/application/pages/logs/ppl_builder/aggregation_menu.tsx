/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiFieldSearch, EuiIcon, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { AggFn } from './types';
import { AGG_FUNCTIONS, AggDef } from './operations';

interface AggregationMenuProps {
  /** Currently selected aggregation. */
  value: AggFn;
  /** Called with the chosen aggregation when the user picks one. */
  onChange: (fn: AggFn) => void;
  dataTestSubj?: string;
}

/**
 * The aggregation ("Show") selector for a metric row, rendered as a search-first
 * popover — the same interaction as the `ƒx` "wrap in function" menu
 * ({@link FunctionMenu}) rather than a plain dropdown. The trigger shows the
 * selected aggregation label with a caret; opening it reveals a filterable flat
 * list of aggregations. Typing filters the list, Enter applies the first match,
 * and Esc closes. The list is flat (no categories) since the aggregation catalog
 * is short and uncategorized.
 */
export const AggregationMenu: React.FC<AggregationMenuProps> = ({
  value,
  onChange,
  dataTestSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  // First matching item, so Enter in the search box applies it.
  const firstMatchRef = useRef<AggDef | null>(null);

  const selected = AGG_FUNCTIONS.find((f) => f.id === value);

  const close = () => {
    setIsOpen(false);
    setSearch('');
  };
  const apply = (item: AggDef) => {
    onChange(item.id);
    close();
  };

  // Filter the aggregations by the query, recording the first surviving item for
  // the Enter shortcut.
  const filtered = useMemo(() => {
    firstMatchRef.current = null;
    const q = search.trim().toLowerCase();
    const items = AGG_FUNCTIONS.filter((it) => it.label.toLowerCase().includes(q));
    firstMatchRef.current = items[0] ?? null;
    return items;
  }, [search]);

  const trigger = (
    <button
      type="button"
      className="plqAggTrigger"
      onClick={() => setIsOpen((o) => !o)}
      aria-label={i18n.translate('explore.pplBuilder.aggregation', {
        defaultMessage: 'Aggregation',
      })}
      data-test-subj={dataTestSubj}
    >
      <span className="plqAggTrigger__label">{selected?.label}</span>
      <EuiIcon type="arrowDown" size="s" className="plqAggTrigger__caret" />
    </button>
  );

  return (
    <EuiPopover
      button={trigger}
      isOpen={isOpen}
      closePopover={close}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      panelClassName="plqFnPopover"
    >
      <EuiPopoverTitle paddingSize="s">
        <EuiFieldSearch
          compressed
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && firstMatchRef.current) apply(firstMatchRef.current);
            if (e.key === 'Escape') close();
          }}
          placeholder={i18n.translate('explore.pplBuilder.searchAggregations', {
            defaultMessage: 'Search aggregations…',
          })}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-search` : undefined}
        />
      </EuiPopoverTitle>
      <div className="plqFnPopover__list">
        {filtered.length === 0 ? (
          <div className="plqFnPopover__empty">
            {i18n.translate('explore.pplBuilder.noMatchingAggregation', {
              defaultMessage: 'No matching aggregation',
            })}
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className="plqFnPopover__item"
              onClick={() => apply(item)}
              data-test-subj={`pplBuilderAggOption-${item.id}`}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
    </EuiPopover>
  );
};
