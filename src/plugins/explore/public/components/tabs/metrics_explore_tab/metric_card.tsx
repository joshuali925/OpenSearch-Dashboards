/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBadge,
  EuiCheckbox,
  EuiToolTip,
  EuiLoadingChart,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { MetricMetadata, MetricType, TYPE_COLORS } from './types';
import { renderSvgLine } from './sparkline';

interface MetricCardProps {
  name: string;
  metadata?: MetricMetadata;
  sparkline: Array<[number, string]> | null;
  isSelected: boolean;
  onToggleSelect: () => void;
  onNavigate: () => void;
  onVisibilityChange: (name: string, visible: boolean) => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  name,
  metadata,
  sparkline,
  isSelected,
  onToggleSelect,
  onNavigate,
  onVisibilityChange,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    let root: Element | null = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const { overflowY } = getComputedStyle(p);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        root = p;
        break;
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(name, entry.isIntersecting),
      { root, rootMargin: '200px' }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      onVisibilityChange(name, false);
    };
  }, [name, onVisibilityChange]);

  const type = metadata?.type || MetricType.UNKNOWN;

  const currentValue = sparkline?.length
    ? parseFloat(sparkline[sparkline.length - 1][1]).toFixed(2)
    : undefined;

  function renderSparklineContent() {
    if (sparkline) return renderSvgLine(sparkline, 360, 60);
    return <EuiLoadingChart size="m" />;
  }

  return (
    <div ref={cardRef}>
      <EuiPanel
        paddingSize="s"
        hasBorder
        onClick={onToggleSelect}
        style={{
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        aria-label={`Metric card: ${name}`}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
          <EuiFlexItem grow={false} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <EuiCheckbox
              id={`select-${name}`}
              checked={isSelected}
              onChange={onToggleSelect}
              aria-label={`Select ${name}`}
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0, overflow: 'hidden' }}>
            <EuiToolTip
              content={
                metadata?.help ? (
                  <>
                    <strong>{name}</strong>
                    <br />
                    {metadata.help}
                  </>
                ) : (
                  name
                )
              }
            >
              <EuiButtonEmpty
                size="xs"
                style={{ maxWidth: '100%' }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onNavigate();
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                </span>
              </EuiButtonEmpty>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={TYPE_COLORS[type]}>{type}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div
          style={{
            marginTop: 4,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: !sparkline ? 'center' : undefined,
          }}
        >
          {renderSparklineContent()}
        </div>
        <EuiText
          size="xs"
          color="subdued"
          style={{ visibility: currentValue ? 'visible' : 'hidden' }}
        >
          {currentValue || '\u00A0'}
        </EuiText>
      </EuiPanel>
    </div>
  );
};
