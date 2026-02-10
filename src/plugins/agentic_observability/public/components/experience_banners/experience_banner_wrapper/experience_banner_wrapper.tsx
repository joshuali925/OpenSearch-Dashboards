/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ClassicExperienceBanner } from '../classic_experience_banner';

export const ExperienceBannerWrapper = ({
  initializeBannerWrapper,
}: {
  initializeBannerWrapper: () => Promise<{
    showClassicExperienceBanner: boolean;
    navigateToAgenticObservability: () => void;
  }>;
}) => {
  const [state, setState] = useState<{
    showBanner: boolean;
    handleSwitchToAgenticObservability: () => void;
  } | null>(null);

  useEffect(() => {
    const callInitializeBannerWrapper = async () => {
      const {
        showClassicExperienceBanner,
        navigateToAgenticObservability,
      } = await initializeBannerWrapper();
      setState({
        showBanner: showClassicExperienceBanner,
        handleSwitchToAgenticObservability: navigateToAgenticObservability,
      });
    };

    callInitializeBannerWrapper();
  }, [initializeBannerWrapper]);

  if (!state || !state.showBanner) {
    return null;
  }

  return (
    <ClassicExperienceBanner
      navigateToAgenticObservability={state.handleSwitchToAgenticObservability}
    />
  );
};
