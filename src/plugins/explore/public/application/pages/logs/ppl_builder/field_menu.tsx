/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiFieldSearch, EuiIcon, EuiPopover, EuiPopoverTitle, EuiToolTip } from '@elastic/eui';

/**
 * The "over time" entry pinned to the top of the popover — plain-language time
 * grouping (compiled to a `span(...)` behind the scenes). When supplied, it
 * renders first under an "Over time" header; picking it calls `onSelect` and
 * closes the popover. The group-by control passes this so time grouping is added
 * from the same popover as the fields, rather than a standalone clock button. It
 * is omitted once a time grouping already exists (PPL allows only one span).
 */
interface OverTimeEntry {
  /** Natural-language hint shown after the label (e.g. "every 1h"). */
  hint: string;
  /** The real syntax, shown as the row's tooltip (e.g. "span(@timestamp, 1h)"). */
  tooltip: string;
  onSelect: () => void;
}

interface FieldMenuBaseProps {
  /** Field names to choose from. */
  options: string[];
  /** Placeholder shown in the trigger when nothing is selected. */
  placeholder?: string;
  /** Class applied to the default trigger button (styles the token in its chip). */
  triggerClassName?: string;
  /**
   * Custom trigger renderer. Given a click handler that toggles the popover, it
   * returns the trigger node — used by the group-by control to render its own
   * removable pills plus a caret. When omitted, a plain label + caret button is
   * shown (used by the sort-column token).
   */
  renderTrigger?: (onToggle: () => void) => React.ReactElement;
  /** Optional plain-language time-grouping entry pinned to the top of the list. */
  overTime?: OverTimeEntry;
  dataTestSubj?: string;
}

interface SingleFieldMenuProps extends FieldMenuBaseProps {
  multi?: false;
  /** The selected field name (empty string when none). */
  value: string;
  /** Called with the chosen field. */
  onChange: (field: string) => void;
}

interface MultiFieldMenuProps extends FieldMenuBaseProps {
  multi: true;
  /** The selected field names. */
  value: string[];
  /** Called with the full next selection whenever it changes. */
  onChange: (fields: string[]) => void;
}

type FieldMenuProps = SingleFieldMenuProps | MultiFieldMenuProps;

/**
 * A field picker rendered as a search-first popover — the same interaction as the
 * `ƒx` "wrap in function" and "Show" aggregation menus ({@link FunctionMenu},
 * {@link AggregationMenu}) rather than an inline combobox whose dropdown is
 * clipped to a narrow control width. The trigger shows the current selection as
 * plain text; opening it reveals a filterable, readable list. In `multi` mode
 * each row toggles (a check marks selected fields and the popover stays open); in
 * single mode picking a field applies it and closes. Typing filters the list,
 * Enter applies/toggles the first match, Esc closes. Fields not already in the
 * list can be added by typing a new value and pressing Enter.
 */
export const FieldMenu: React.FC<FieldMenuProps> = (props) => {
  const { options, placeholder, triggerClassName, renderTrigger, overTime, dataTestSubj } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const firstMatchRef = useRef<string | null>(null);

  const selectedSet = useMemo(
    () => new Set(props.multi ? props.value : props.value ? [props.value] : []),
    [props.multi, props.value]
  );

  const close = () => {
    setIsOpen(false);
    setSearch('');
  };

  const toggle = (field: string) => {
    if (props.multi) {
      const next = selectedSet.has(field)
        ? props.value.filter((f) => f !== field)
        : [...props.value, field];
      props.onChange(next);
    } else {
      props.onChange(field);
      close();
    }
  };

  // Filter options by the query, recording the first surviving item for the Enter
  // shortcut. When the query matches nothing exactly, offer it as a new value.
  const { filtered, allowCreate, overTimeMatches } = useMemo(() => {
    firstMatchRef.current = null;
    const q = search.trim().toLowerCase();
    const items = options.filter((o) => o.toLowerCase().includes(q));
    firstMatchRef.current = items[0] ?? null;
    const exact = options.some((o) => o.toLowerCase() === q);
    // The "over time" entry is a fixed label; match it the way its text reads.
    const otMatch = !!overTime && `over time ${overTime.hint}`.toLowerCase().includes(q);
    return { filtered: items, allowCreate: q.length > 0 && !exact, overTimeMatches: otMatch };
  }, [search, options, overTime]);

  const applyFirst = () => {
    const q = search.trim();
    // "Over time" leads the list, so Enter picks it first when it still matches.
    if (overTime && overTimeMatches) overTime.onSelect();
    else if (firstMatchRef.current) toggle(firstMatchRef.current);
    else if (q) toggle(q);
  };

  const selectedLabel = props.multi ? props.value.join(', ') : props.value;

  const trigger = renderTrigger ? (
    renderTrigger(() => setIsOpen((o) => !o))
  ) : (
    <button
      type="button"
      className={triggerClassName}
      onClick={() => setIsOpen((o) => !o)}
      aria-label={placeholder}
      data-test-subj={dataTestSubj}
    >
      <span className="plqFieldTrigger__label">{selectedLabel || placeholder}</span>
      <EuiIcon type="arrowDown" size="s" className="plqFieldTrigger__caret" />
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
          placeholder={i18n.translate('explore.pplBuilder.searchFields', {
            defaultMessage: 'Search fields…',
          })}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-search` : undefined}
        />
      </EuiPopoverTitle>
      <div className="plqFnPopover__list">
        {/* Time grouping leads the list in plain language — it's a top-3 logs
            operation and must work with zero PPL knowledge. The real span(...)
            syntax lives in the row's tooltip, not the label. */}
        {overTime && overTimeMatches && (
          <>
            <div className="plqFnPopover__group">
              {i18n.translate('explore.pplBuilder.overTimeGroup', {
                defaultMessage: 'Over time',
              })}
            </div>
            <EuiToolTip content={overTime.tooltip} position="right">
              <button
                type="button"
                className="plqFnPopover__item plqFieldOption"
                onClick={overTime.onSelect}
                data-test-subj="pplBuilderGroupByOverTime"
              >
                <EuiIcon type="clock" size="s" className="plqFieldOption__check" />
                {i18n.translate('explore.pplBuilder.overTime', { defaultMessage: 'over time' })}
                <span className="plqFieldOption__hint">{overTime.hint}</span>
              </button>
            </EuiToolTip>
          </>
        )}
        {filtered.length === 0 && !allowCreate && !(overTime && overTimeMatches) ? (
          <div className="plqFnPopover__empty">
            {i18n.translate('explore.pplBuilder.noMatchingField', {
              defaultMessage: 'No matching field',
            })}
          </div>
        ) : (
          <>
            {filtered.length > 0 && overTime && (
              <div className="plqFnPopover__group">
                {i18n.translate('explore.pplBuilder.fieldsGroup', { defaultMessage: 'Fields' })}
              </div>
            )}
            {filtered.map((field) => (
              <button
                key={field}
                type="button"
                className="plqFnPopover__item plqFieldOption"
                onClick={() => toggle(field)}
                data-test-subj={`pplBuilderFieldOption-${field}`}
              >
                <EuiIcon
                  type="check"
                  size="s"
                  className={`plqFieldOption__check${
                    selectedSet.has(field) ? '' : ' plqFieldOption__check--hidden'
                  }`}
                />
                {field}
              </button>
            ))}
            {allowCreate && (
              <button
                type="button"
                className="plqFnPopover__item plqFieldOption"
                onClick={() => toggle(search.trim())}
                data-test-subj="pplBuilderFieldOptionCreate"
              >
                <EuiIcon type="plus" size="s" className="plqFieldOption__check" />
                {search.trim()}
              </button>
            )}
          </>
        )}
      </div>
    </EuiPopover>
  );
};
