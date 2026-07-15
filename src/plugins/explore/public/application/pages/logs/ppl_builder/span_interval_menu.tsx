/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiFieldSearch, EuiIcon, EuiPopover, EuiPopoverTitle } from '@elastic/eui';

interface SpanIntervalMenuProps {
  /** Current interval token, e.g. `1h`, `30s`. */
  interval: string;
  /** Called with the chosen (or typed) interval. */
  onChange: (interval: string) => void;
  /** Marks the trigger as invalid (unparseable interval). */
  isInvalid?: boolean;
  dataTestSubj?: string;
}

// Common bucket intervals, matching the design mock's set exactly
// (ppl_query_builder_states_v4.html). The popover still accepts any custom
// value typed into the search box, so this list is a shortcut, not a restriction.
const COMMON_INTERVALS = ['1m', '5m', '30m', '1h', '12h', '1d'];

/**
 * The time-bucket interval control inside the "every" chip: a search-first
 * popover (the same interaction as the aggregation / field menus) offering
 * common intervals while still accepting a custom value. The trigger shows the
 * current interval in monospace so the chip reads `every 1h`; opening it reveals
 * the preset list. Typing filters the presets and, on Enter, applies the typed
 * value verbatim so any valid `span(...)` interval round-trips.
 */
export const SpanIntervalMenu: React.FC<SpanIntervalMenuProps> = ({
  interval,
  onChange,
  isInvalid,
  dataTestSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const firstMatchRef = useRef<string | null>(null);

  const close = () => {
    setIsOpen(false);
    setSearch('');
  };

  const apply = (value: string) => {
    onChange(value);
    close();
  };

  // Filter presets by the query, recording the first survivor for the Enter
  // shortcut. When the query matches no preset exactly, offer it as a custom
  // value so any interval can be typed.
  const { filtered, allowCustom } = useMemo(() => {
    firstMatchRef.current = null;
    const q = search.trim().toLowerCase();
    const items = COMMON_INTERVALS.filter((it) => it.toLowerCase().includes(q));
    firstMatchRef.current = items[0] ?? null;
    const exact = COMMON_INTERVALS.some((it) => it.toLowerCase() === q);
    return { filtered: items, allowCustom: q.length > 0 && !exact };
  }, [search]);

  const applyFirst = () => {
    const q = search.trim();
    if (firstMatchRef.current) apply(firstMatchRef.current);
    else if (q) apply(q);
  };

  const trigger = (
    <button
      type="button"
      className={`plqChip__param plqChip__mono${isInvalid ? ' plqChip__param--invalid' : ''}`}
      onClick={() => setIsOpen((o) => !o)}
      aria-label={i18n.translate('explore.pplBuilder.spanInterval', {
        defaultMessage: 'Time span interval',
      })}
      data-test-subj={dataTestSubj}
    >
      {interval}
      <EuiIcon type="arrowDown" size="s" className="plqChip__caret" />
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
            if (e.key === 'Enter') applyFirst();
            if (e.key === 'Escape') close();
          }}
          placeholder={i18n.translate('explore.pplBuilder.spanIntervalPlaceholder', {
            defaultMessage: 'e.g. 1h, 30s…',
          })}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-search` : undefined}
        />
      </EuiPopoverTitle>
      <div className="plqFnPopover__list">
        {filtered.map((it) => (
          <button
            key={it}
            type="button"
            className="plqFnPopover__item plqFieldOption"
            onClick={() => apply(it)}
            data-test-subj={`pplBuilderSpanIntervalOption-${it}`}
          >
            <EuiIcon
              type="check"
              size="s"
              className={`plqFieldOption__check${
                it === interval.trim() ? '' : ' plqFieldOption__check--hidden'
              }`}
            />
            {it}
          </button>
        ))}
        {allowCustom && (
          <button
            type="button"
            className="plqFnPopover__item plqFieldOption"
            onClick={() => apply(search.trim())}
            data-test-subj="pplBuilderSpanIntervalCustom"
          >
            <EuiIcon type="plus" size="s" className="plqFieldOption__check" />
            {search.trim()}
          </button>
        )}
      </div>
    </EuiPopover>
  );
};
