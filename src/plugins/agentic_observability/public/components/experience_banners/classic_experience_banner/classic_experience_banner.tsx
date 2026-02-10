/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSmallButton } from '@elastic/eui';
import './classic_experience_banner.scss';
import { NEW_DISCOVER_INFO_URL, SHOW_CLASSIC_DISCOVER_LOCAL_STORAGE_KEY } from '../constants';

export interface ClassicExperienceBannerProps {
  navigateToExplore: () => void;
}

export const ClassicExperienceBanner = ({ navigateToExplore }: ClassicExperienceBannerProps) => {
  const switchToNewExperience = () => {
    localStorage.removeItem(SHOW_CLASSIC_DISCOVER_LOCAL_STORAGE_KEY);
    navigateToExplore();
  };

  return (
    <EuiCallOut
      className="agenticObsClassicExperienceBanner"
      data-test-subj="agenticObsClassicExperienceBanner"
      size="s"
    >
      <div>
        <span
          className="agenticObsClassicExperienceBanner__img"
          role="img"
          aria-label="New discover celebration"
        >
          🎉
        </span>
        A new version of Discover with many improved features has been released.{' '}
        <EuiLink
          href={NEW_DISCOVER_INFO_URL}
          target="_blank"
          data-test-subj="agenticObsClassicExperienceBanner__learnMore"
        >
          Learn more
        </EuiLink>
      </div>
      <EuiSmallButton
        className="agenticObsClassicExperienceBanner__newExperienceButton"
        data-test-subj="agenticObsClassicExperienceBanner__newExperienceButton"
        onClick={switchToNewExperience}
      >
        Try the new Discover
      </EuiSmallButton>
    </EuiCallOut>
  );
};
