/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExperienceBannerWrapper } from './experience_banner_wrapper';

const mockNavigateToAgenticObservability = jest.fn();
const mockInitializeBannerWrapperToTrue = async () => {
  return {
    showClassicExperienceBanner: true,
    navigateToAgenticObservability: mockNavigateToAgenticObservability,
  };
};
const mockInitializeBannerWrapperToFalse = async () => {
  return {
    showClassicExperienceBanner: false,
    navigateToAgenticObservability: mockNavigateToAgenticObservability,
  };
};

describe('ExperienceBannerWrapper', () => {
  afterEach(() => {
    mockNavigateToAgenticObservability.mockReset();
  });

  it('should render nothing initially', () => {
    render(<ExperienceBannerWrapper initializeBannerWrapper={mockInitializeBannerWrapperToTrue} />);
    expect(screen.queryByTestId('agenticObsClassicExperienceBanner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenticObsNewExperienceBanner')).not.toBeInTheDocument();
  });

  it('should render nothing if !showClassicExperienceBanner', async () => {
    render(
      <ExperienceBannerWrapper initializeBannerWrapper={mockInitializeBannerWrapperToFalse} />
    );
    expect(screen.queryByTestId('agenticObsClassicExperienceBanner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenticObsNewExperienceBanner')).not.toBeInTheDocument();
  });

  it('should render classic banner if showClassicExperienceBanner', async () => {
    render(<ExperienceBannerWrapper initializeBannerWrapper={mockInitializeBannerWrapperToTrue} />);
    expect(await screen.findByTestId('agenticObsClassicExperienceBanner')).toBeInTheDocument();
  });

  it('clicking on classic button calls callback correctly', async () => {
    render(<ExperienceBannerWrapper initializeBannerWrapper={mockInitializeBannerWrapperToTrue} />);
    await screen.findByTestId('agenticObsClassicExperienceBanner');
    fireEvent.click(screen.getByTestId('agenticObsClassicExperienceBanner__newExperienceButton'));
    expect(mockNavigateToAgenticObservability).toHaveBeenCalled();
  });
});
