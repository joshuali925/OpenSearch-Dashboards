/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { i18n } from '@osd/i18n';
import React, { useState } from 'react';

export interface IndexPatternItem {
  id: string;
  title: string;
}

export type ChangeIndexPatternTriggerProps = EuiButtonEmptyProps & {};

interface ChangeIndexPatternProps {
  indexPatternItems: IndexPatternItem[];
  selectedId: string | undefined;
  onChange: (id?: string) => void;
  selectableProps?: EuiSelectableProps;
  buttonProps?: EuiButtonEmptyProps;
}

export function ChangeIndexPattern({
  indexPatternItems,
  selectedId,
  onChange,
  selectableProps,
  buttonProps,
}: ChangeIndexPatternProps) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = indexPatternItems.map(({ title, id }) => ({
    label: title,
    key: id,
    checked: id === selectedId ? 'on' : undefined,
  }));

  const selectedLabel = selectableOptions.find(({ checked }) => checked)?.label;

  const button = (
    <EuiButtonEmpty
      className="eui-textTruncate indexPatternSelector__triggerButton"
      flush="left"
      color="text"
      iconSide="right"
      iconType="arrowDown"
      title={selectedLabel}
      onClick={() => setPopoverIsOpen(!isPopoverOpen)}
      data-test-subj="indexPatternSelector-switch-link"
      {...buttonProps}
    >
      {selectedLabel ||
        i18n.translate('indexPatternSelector.emptyIndexPatternLabel', {
          defaultMessage: 'No override',
        })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
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
          options={selectableOptions}
          onChange={(options) => {
            const selectedOption = options.find(({ checked }) => checked);
            onChange(selectedOption?.key);
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
