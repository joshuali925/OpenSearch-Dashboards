/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { i18n } from '@osd/i18n';
import { EuiFieldSearch, EuiPopover, EuiPopoverTitle, EuiToolTip } from '@elastic/eui';
import { ScalarCall } from './types';
import { SCALAR_FN_CATEGORIES, ScalarFnDef } from './operations';

interface FunctionMenuProps {
  /** Called with a fresh ScalarCall when the user picks a scalar function. */
  onAddFunction: (fn: ScalarCall) => void;
  dataTestSubj?: string;
}

/**
 * The `ƒx` "wrap in function" affordance for an aggregation row: a compact italic
 * glyph that opens a search-first popover anchored under it. The popover is a
 * single flat, filterable list grouped under Math / String / Date & time headers
 * — no submenus and no second click level (per the mock's S3 spec). Typing
 * filters across all categories; Enter applies the first match; Esc closes. The
 * aggregation itself is chosen when the metric is created and edited via the
 * row's "Show" dropdown, so it is NOT offered here.
 */
export const FunctionMenu: React.FC<FunctionMenuProps> = ({ onAddFunction, dataTestSubj }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  // First matching item, so Enter in the search box applies it.
  const firstMatchRef = useRef<ScalarFnDef | null>(null);

  const close = () => {
    setIsOpen(false);
    setSearch('');
  };
  const apply = (item: ScalarFnDef) => {
    onAddFunction({ id: item.id, name: item.name, params: [...item.params] });
    close();
  };

  // Filter each category's items by the query; drop empty categories. Records the
  // very first surviving item for the Enter shortcut.
  const filtered = useMemo(() => {
    firstMatchRef.current = null;
    const q = search.trim().toLowerCase();
    const groups: Array<{ name: string; items: ScalarFnDef[] }> = [];
    for (const cat of SCALAR_FN_CATEGORIES) {
      const items = cat.items.filter((it) => it.name.toLowerCase().includes(q));
      if (!items.length) continue;
      if (!firstMatchRef.current) firstMatchRef.current = items[0];
      groups.push({ name: cat.name, items });
    }
    return groups;
  }, [search]);

  const label = i18n.translate('explore.pplBuilder.addFunction', {
    defaultMessage: 'Wrap in function',
  });

  const trigger = (
    <EuiToolTip content={label} position="top">
      <button
        type="button"
        className="plqFxBtn euiButtonIcon"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={label}
        data-test-subj={dataTestSubj}
      >
        <span className="plqFxBtn__label">ƒx</span>
      </button>
    </EuiToolTip>
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
          placeholder={i18n.translate('explore.pplBuilder.searchFunctions', {
            defaultMessage: 'Search functions…',
          })}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-search` : undefined}
        />
      </EuiPopoverTitle>
      <div className="plqFnPopover__list">
        {filtered.length === 0 ? (
          <div className="plqFnPopover__empty">
            {i18n.translate('explore.pplBuilder.noMatchingFunction', {
              defaultMessage: 'No matching function',
            })}
          </div>
        ) : (
          filtered.map((group) => (
            <div key={group.name}>
              <div className="plqFnPopover__group">{group.name}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="plqFnPopover__item"
                  onClick={() => apply(item)}
                  data-test-subj={`pplBuilderFnOption-${item.id}`}
                >
                  {item.name}()
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </EuiPopover>
  );
};
