/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This file provides a shim for the opensearch_dashboards_react plugin's
 * useOpenSearchDashboards hook, which is used by ChatWindow but doesn't
 * actually access the services in standalone mode.
 *
 * This allows the existing plugin code to work without modifications.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import ReactDOM from 'react-dom';

// Create a simple context to mock the OSD services
const OpenSearchDashboardsContext = createContext({});

interface OpenSearchDashboardsProviderProps {
  children: ReactNode;
}

export const OpenSearchDashboardsProvider: React.FC<OpenSearchDashboardsProviderProps> = ({
  children,
}) => {
  // Provide empty services object - ChatWindow declares it but doesn't use it
  const services = {
    core: {},
    contextProvider: undefined,
  };

  return (
    <OpenSearchDashboardsContext.Provider value={{ services }}>
      {children}
    </OpenSearchDashboardsContext.Provider>
  );
};

// Mock the useOpenSearchDashboards hook
export const useOpenSearchDashboards = () => {
  return useContext(OpenSearchDashboardsContext);
};

// Mock toMountPoint for compatibility (React 16 version)
export const toMountPoint = (node: React.ReactElement) => {
  return (element: HTMLElement) => {
    ReactDOM.render(node, element);
    return () => ReactDOM.unmountComponentAtNode(element);
  };
};

// Mock MountPointPortal component
export const MountPointPortal: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Export the OpenSearchDashboardsProvider as OpenSearchDashboardsContextProvider
export { OpenSearchDashboardsProvider as OpenSearchDashboardsContextProvider };

// Export the context itself
export { OpenSearchDashboardsContext };

// Export OpenSearchDashboardsReactContext type
export type OpenSearchDashboardsReactContext = any;

// Export react-markdown as Markdown
export { default as Markdown } from 'react-markdown';
