/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { of } from 'rxjs';
import { getFlavorFromAppId, getCurrentAppId, getCurrentFlavor } from './get_flavor_from_app_id';
import { AgenticObservabilityFlavor } from '../../common';
import { AgenticObservabilityServices } from '../types';

const createMockServices = (): AgenticObservabilityServices =>
  ({
    core: {
      application: {
        currentAppId$: of('agenticObservability/discover'),
      },
    },
  } as AgenticObservabilityServices);

describe('getFlavorFromAppId', () => {
  it('should extract flavor from valid app ID', () => {
    expect(getFlavorFromAppId('agenticObservability/discover')).toBe('discover');
    expect(getFlavorFromAppId('agenticObservability/visualize')).toBe('visualize');
    expect(getFlavorFromAppId('agenticObservability/dashboards')).toBe('dashboards');
  });

  it('should return null for invalid app ID formats', () => {
    expect(getFlavorFromAppId('invalid')).toBeNull();
    expect(getFlavorFromAppId('agenticObservability')).toBeNull();
    expect(getFlavorFromAppId('other/flavor')).toBe('flavor');
  });

  it('should return null for empty or undefined inputs', () => {
    expect(getFlavorFromAppId(undefined)).toBeNull();
    expect(getFlavorFromAppId('')).toBeNull();
  });

  it('should handle edge cases', () => {
    expect(getFlavorFromAppId('agenticObservability/')).toBeNull();
    expect(getFlavorFromAppId('agenticObservability/flavor/extra')).toBe('flavor');
  });
});

describe('getCurrentAppId', () => {
  it('should return current app ID from services', async () => {
    const services = createMockServices();
    const appId = await getCurrentAppId(services);
    expect(appId).toBe('agenticObservability/discover');
  });

  it('should handle different app IDs', async () => {
    const services = {
      core: {
        application: {
          currentAppId$: of('agenticObservability/visualize'),
        },
      },
    } as AgenticObservabilityServices;

    const appId = await getCurrentAppId(services);
    expect(appId).toBe('agenticObservability/visualize');
  });
});

describe('getCurrentFlavor', () => {
  it('should return current flavor from app ID', async () => {
    const services = createMockServices();
    const flavor = await getCurrentFlavor(services);
    expect(flavor).toBe('discover' as AgenticObservabilityFlavor);
  });

  it('should return null for invalid app ID', async () => {
    const services = {
      core: {
        application: {
          currentAppId$: of('invalid'),
        },
      },
    } as AgenticObservabilityServices;

    const flavor = await getCurrentFlavor(services);
    expect(flavor).toBeNull();
  });

  it('should return null for undefined app ID', async () => {
    const services = {
      core: {
        application: {
          currentAppId$: of(undefined),
        },
      },
    } as AgenticObservabilityServices;

    const flavor = await getCurrentFlavor(services);
    expect(flavor).toBeNull();
  });
});
