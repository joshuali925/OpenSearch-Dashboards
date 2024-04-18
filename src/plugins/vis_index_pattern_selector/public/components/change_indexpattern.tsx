/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiButtonEmptyProps,
} from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';

export interface IndexPatternItem {
  id: string;
  title: string;
}

export type ChangeIndexPatternTriggerProps = EuiButtonEmptyProps & {
  label?: string;
  title?: string;
};

export function ChangeIndexPattern({
  indexPatternItems,
  indexPatternId,
  onChange,
  trigger,
  selectableProps,
}: {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatternItems: IndexPatternItem[];
  onChange: (newId?: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  if (!trigger) return null;

  const createTrigger = function () {
    const { title, ...rest } = trigger;
    return (
      <EuiButtonEmpty
        className="eui-textTruncate"
        flush="left"
        color="text"
        iconSide="right"
        iconType="arrowDown"
        title={title}
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        {...rest}
      >
        {title ||
          i18n.translate('indexPatternSelector.emptyIndexPatternTitle', {
            defaultMessage: 'No override',
          })}
      </EuiButtonEmpty>
    );
  };

  return (
    <EuiPopover
      button={createTrigger()}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverIsOpen(false)}
      className="eui-textTruncate"
      anchorClassName="eui-textTruncate"
      display="inlineBlock"
      panelPaddingSize="s"
      ownFocus
    >
      <div style={{ width: 320 }}>
        <EuiPopoverTitle>
          {i18n.translate('indexPatternSelector.changeIndexPatternTitle', {
            defaultMessage: 'Change index pattern',
          })}
        </EuiPopoverTitle>
        <EuiSelectable
          data-test-subj="indexPatternSelector-switcher"
          {...selectableProps}
          searchable
          singleSelection
          options={indexPatternItems.map(({ title, id }) => ({
            label: title,
            key: id,
            value: id,
            checked: id === indexPatternId ? 'on' : undefined,
          }))}
          onChange={(choices) => {
            const choice = choices.find(({ checked }) => checked);
            onChange(choice?.value);
            setPopoverIsOpen(false);
          }}
          searchProps={{
            compressed: true,
            ...(selectableProps ? selectableProps.searchProps : undefined),
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
}
