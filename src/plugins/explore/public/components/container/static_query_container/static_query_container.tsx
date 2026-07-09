/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import './static_query_container.scss';

interface StaticQueryContainerProps {
  queryPanel: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Non-resizable alternative to {@link ResizableQueryContainer}. The query panel
 * takes its natural height and the content below fills the rest — matching the
 * metrics query-builder layout, which has no drag handle. Used for the logs
 * flavor when the PPL visual query builder is enabled.
 */
export const StaticQueryContainer: React.FC<StaticQueryContainerProps> = ({
  queryPanel,
  children,
}) => {
  return (
    <div className="exploreStaticQueryContainer">
      <div className="exploreStaticQueryContainer__queryPanel">{queryPanel}</div>
      <div className="exploreStaticQueryContainer__contentPanel">{children}</div>
    </div>
  );
};
