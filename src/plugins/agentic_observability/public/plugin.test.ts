/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgenticObservabilityPlugin } from './plugin';
import { coreMock } from '../../../core/public/mocks';
import { CoreSetup, CoreStart } from 'opensearch-dashboards/public';
import {
  AgenticObservabilityPluginStart,
  AgenticObservabilitySetupDependencies,
  AgenticObservabilityStartDependencies,
} from './types';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../data/public';
import { UrlForwardingSetup, UrlForwardingStart } from '../../url_forwarding/public';
import { EmbeddableSetup, EmbeddableStart } from '../../embeddable/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { UiActionsSetup, UiActionsStart } from '../../ui_actions/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../navigation/public';
import {
  OpenSearchDashboardsLegacySetup,
  OpenSearchDashboardsLegacyStart,
} from '../../opensearch_dashboards_legacy/public';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { ExpressionsPublicPlugin, ExpressionsStart } from '../../expressions/public';
import { DashboardSetup, DashboardStart } from '../../dashboard/public';
import { ChartsPluginStart } from '../../charts/public';
import { Start as InspectorPublicPluginStart } from '../../inspector/public';
import { ContextProviderStart } from '../../context_provider/public';

// Mock log action registry
jest.mock('./services/log_action_registry', () => ({
  logActionRegistry: {
    registerAction: jest.fn(),
  },
}));

// Mock createAskAiAction
jest.mock('./actions/ask_ai_action', () => ({
  createAskAiAction: jest.fn().mockReturnValue({
    id: 'ask_ai',
    execute: jest.fn(),
  }),
}));

// Mock createOsdUrlTracker
jest.mock('../../opensearch_dashboards_utils/public', () => ({
  ...jest.requireActual('../../opensearch_dashboards_utils/public'),
  createOsdUrlTracker: jest.fn(() => ({
    appMounted: jest.fn(),
    appUnMounted: jest.fn(),
    stop: jest.fn(),
  })),
}));

describe('AgenticObservabilityPlugin', () => {
  let plugin: AgenticObservabilityPlugin;
  let initializerContext: ReturnType<typeof createMockInitializerContext>;
  let coreSetup: CoreSetup<AgenticObservabilityStartDependencies, AgenticObservabilityPluginStart>;
  let coreStart: CoreStart;
  let setupDeps: AgenticObservabilitySetupDependencies;
  let startDeps: AgenticObservabilityStartDependencies;
  let mockCapabilities: any;

  function createMockInitializerContext() {
    return {
      config: {
        get: jest.fn().mockReturnValue({
          discoverTraces: {
            enabled: false,
          },
        }),
      },
      logger: {
        get: jest.fn().mockReturnValue({
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        }),
      },
      env: {
        packageInfo: {
          version: '1.0.0',
        },
      },
    };
  }

  function createMockSetupDeps(): AgenticObservabilitySetupDependencies {
    return {
      data: ({
        __enhance: jest.fn(),
        query: {
          state$: {
            pipe: jest.fn().mockReturnValue({
              subscribe: jest.fn(),
            }),
          },
        },
      } as unknown) as DataPublicPluginSetup,
      urlForwarding: ({
        forwardApp: jest.fn(),
      } as Partial<UrlForwardingSetup>) as UrlForwardingSetup,
      embeddable: ({
        registerEmbeddableFactory: jest.fn(),
      } as Partial<EmbeddableSetup>) as EmbeddableSetup,
      visualizations: ({
        registerAlias: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        getAliases: jest.fn().mockReturnValue([]),
      } as Partial<VisualizationsSetup>) as VisualizationsSetup,
      uiActions: ({
        getTriggerActions: jest.fn().mockReturnValue([]),
      } as Partial<UiActionsSetup>) as UiActionsSetup,
      navigation: {} as NavigationStart,
      opensearchDashboardsLegacy: {} as OpenSearchDashboardsLegacySetup,
      usageCollection: {} as UsageCollectionSetup,
      expressions: {} as ReturnType<ExpressionsPublicPlugin['setup']>,
      dashboard: {} as DashboardSetup,
    };
  }

  function createMockStartDeps(): AgenticObservabilityStartDependencies {
    return {
      data: ({
        indexPatterns: {},
        dataViews: {},
        search: {},
        query: {
          filterManager: {},
          timefilter: {
            timefilter: {},
          },
          queryString: {
            clearQuery: jest.fn(),
          },
        },
      } as unknown) as DataPublicPluginStart,
      uiActions: ({
        registerAction: jest.fn(),
        addTriggerAction: jest.fn(),
        detachAction: jest.fn(),
        executeTriggerActions: jest.fn(),
        registerTrigger: jest.fn(),
        getTrigger: jest.fn(),
        getTriggers: jest.fn(),
        unregisterAction: jest.fn(),
        attachAction: jest.fn(),
        getAction: jest.fn(),
        hasAction: jest.fn(),
      } as Partial<UiActionsStart>) as UiActionsStart,
      dashboard: {} as DashboardStart,
      expressions: ({
        ExpressionLoader: jest.fn(),
      } as Partial<ExpressionsStart>) as ExpressionsStart,
      charts: ({
        theme: {},
      } as Partial<ChartsPluginStart>) as ChartsPluginStart,
      navigation: {} as NavigationStart,
      inspector: {} as InspectorPublicPluginStart,
      urlForwarding: {} as UrlForwardingStart,
      embeddable: {} as EmbeddableStart,
      opensearchDashboardsLegacy: {} as OpenSearchDashboardsLegacyStart,
      contextProvider: ({
        getAssistantContextStore: jest.fn().mockReturnValue({
          addContext: jest.fn(),
        }),
      } as Partial<ContextProviderStart>) as ContextProviderStart,
      visualizations: ({
        all: jest.fn().mockReturnValue([]),
        getAliases: jest.fn().mockReturnValue([]),
      } as Partial<VisualizationsStart>) as VisualizationsStart,
    };
  }

  beforeEach(() => {
    // Mock initializer context
    initializerContext = createMockInitializerContext();

    // Mock core setup
    coreSetup = coreMock.createSetup();
    coreSetup.getStartServices = jest.fn().mockResolvedValue([
      coreMock.createStart(),
      {
        data: {
          indexPatterns: {
            clearCache: jest.fn(),
          },
          query: {
            queryString: {
              clearQuery: jest.fn(),
            },
          },
        },
        uiActions: {
          getTriggerActions: jest.fn().mockReturnValue([]),
        },
        visualizations: {
          all: jest.fn().mockReturnValue([]),
          getAliases: jest.fn().mockReturnValue([]),
        },
      },
    ]);

    // Mock core start
    coreStart = coreMock.createStart();
    // Add workspaces mock with proper BehaviorSubject-like structure
    Object.defineProperty(coreStart, 'workspaces', {
      value: {
        currentWorkspace$: {
          pipe: jest.fn().mockReturnValue({
            toPromise: jest.fn().mockResolvedValue({
              features: ['observability'],
            }),
          }),
          subscribe: jest.fn(),
          getValue: jest.fn(),
          next: jest.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    // Add capabilities mock with agentic observability feature flags (mutable for tests)
    mockCapabilities = {
      agenticObservability: {
        discoverTracesEnabled: false,
        discoverMetricsEnabled: false,
      },
      navLinks: {},
      management: {},
      catalogue: {},
      workspaces: {},
    };

    Object.defineProperty(coreStart.application, 'capabilities', {
      get: () => mockCapabilities,
      set: (value) => {
        Object.assign(mockCapabilities, value);
      },
      configurable: true,
    });

    // Mock navLinks.get for AppUpdater logic
    Object.defineProperty(coreStart.application, 'navLinks', {
      value: {
        get: jest.fn().mockReturnValue({
          navLinkStatus: 1, // AppNavLinkStatus.visible
        }),
      },
      writable: true,
      configurable: true,
    });

    // Mock setup dependencies
    setupDeps = createMockSetupDeps();

    // Mock start dependencies
    startDeps = createMockStartDeps();

    plugin = new AgenticObservabilityPlugin(initializerContext as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('should register agentic observability applications', () => {
      plugin.setup(coreSetup as any, setupDeps as any);

      expect(coreSetup.application.register).toHaveBeenCalledTimes(1);
      expect(coreSetup.application.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'agenticObservability',
        })
      );
    });

    it('should register embeddable factory', () => {
      plugin.setup(coreSetup, setupDeps);

      expect(setupDeps.embeddable.registerEmbeddableFactory).toHaveBeenCalledWith(
        'agenticObservability',
        expect.any(Object)
      );
    });

    it('should register visualization alias', () => {
      plugin.setup(coreSetup, setupDeps);

      expect(setupDeps.visualizations.registerAlias).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AgenticObservabilityVisualization',
          aliasApp: 'agenticObservability',
          title: expect.any(String),
        })
      );
    });

    it('should register the main app with updater observable', () => {
      plugin.setup(coreSetup, setupDeps);

      expect(coreSetup.application.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'agenticObservability',
        })
      );
    });

    it('should register nav links during setup', () => {
      plugin.setup(coreSetup, setupDeps);

      expect(coreSetup.chrome.navGroup.addNavLinksToGroup).toHaveBeenCalledWith(
        expect.any(Object),
        expect.arrayContaining([expect.objectContaining({ id: 'agenticObservability' })])
      );
    });

    it('should setup URL forwarding', () => {
      plugin.setup(coreSetup, setupDeps);

      expect(setupDeps.urlForwarding.forwardApp).toHaveBeenCalledWith(
        'doc',
        'agenticObservability',
        expect.any(Function)
      );
      expect(setupDeps.urlForwarding.forwardApp).toHaveBeenCalledWith(
        'context',
        'agenticObservability',
        expect.any(Function)
      );
      expect(setupDeps.urlForwarding.forwardApp).toHaveBeenCalledWith(
        'discover',
        'agenticObservability',
        expect.any(Function)
      );
    });
  });

  describe('start', () => {
    beforeEach(() => {
      plugin.setup(coreSetup, setupDeps);
    });

    it('should create saved agentic observability loader', () => {
      const result = plugin.start(coreStart, startDeps);

      expect(result.savedAgenticObservabilityLoader).toBeDefined();
      expect(result.savedSearchLoader).toBeDefined();
      expect(result.savedSearchLoader).toBe(result.savedAgenticObservabilityLoader);
    });

    it('should return visualization and slot registries', () => {
      const result = plugin.start(coreStart, startDeps);

      expect(result.visualizationRegistry).toBeDefined();
      expect(result.slotRegistry).toBeDefined();
    });

    it('should hide Traces and Metrics nav links when capabilities are disabled', () => {
      // Set capabilities to disabled (default from beforeEach)
      mockCapabilities.agenticObservability = {
        discoverTracesEnabled: false,
        discoverMetricsEnabled: false,
      };

      plugin.start(coreStart, startDeps);

      // The AppUpdaters should be called during start
      expect(coreStart.application.capabilities.agenticObservability?.discoverTracesEnabled).toBe(
        false
      );
      expect(coreStart.application.capabilities.agenticObservability?.discoverMetricsEnabled).toBe(
        false
      );
    });

    it('should show Traces nav link when capability is enabled', () => {
      // Enable traces capability
      mockCapabilities.agenticObservability = {
        discoverTracesEnabled: true,
        discoverMetricsEnabled: false,
      };

      plugin.start(coreStart, startDeps);

      // Verify traces is enabled, metrics is disabled
      expect(coreStart.application.capabilities.agenticObservability?.discoverTracesEnabled).toBe(
        true
      );
      expect(coreStart.application.capabilities.agenticObservability?.discoverMetricsEnabled).toBe(
        false
      );
    });

    it('should show Metrics nav link when capability is enabled', () => {
      // Enable metrics capability
      mockCapabilities.agenticObservability = {
        discoverTracesEnabled: false,
        discoverMetricsEnabled: true,
      };

      plugin.start(coreStart, startDeps);

      // Verify metrics is enabled, traces is disabled
      expect(coreStart.application.capabilities.agenticObservability?.discoverTracesEnabled).toBe(
        false
      );
      expect(coreStart.application.capabilities.agenticObservability?.discoverMetricsEnabled).toBe(
        true
      );
    });

    it('should show both Traces and Metrics nav links when both capabilities are enabled', () => {
      // Enable both capabilities
      mockCapabilities.agenticObservability = {
        discoverTracesEnabled: true,
        discoverMetricsEnabled: true,
      };

      plugin.start(coreStart, startDeps);

      // Verify both are enabled
      expect(coreStart.application.capabilities.agenticObservability?.discoverTracesEnabled).toBe(
        true
      );
      expect(coreStart.application.capabilities.agenticObservability?.discoverMetricsEnabled).toBe(
        true
      );
    });
  });

  describe('stop', () => {
    it('should call stop callbacks without errors', () => {
      plugin.setup(coreSetup, setupDeps);
      plugin.start(coreStart, startDeps);

      expect(() => plugin.stop()).not.toThrow();
    });
  });
});
