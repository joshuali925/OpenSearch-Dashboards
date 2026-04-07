/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';

export function LoadingIndicator(): JSX.Element {
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 300 }}>
      <EuiFlexItem grow={false}>
        <EuiLoadingChart size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function ErrorCallout({ error }: { error: string }): JSX.Element {
  return (
    <EuiCallOut title="Error" color="danger" iconType="alert">
      {error}
    </EuiCallOut>
  );
}
