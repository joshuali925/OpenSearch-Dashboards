/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassicExperienceBanner, ClassicExperienceBannerProps } from './classic_experience_banner';
import { NEW_DISCOVER_INFO_URL, SHOW_CLASSIC_DISCOVER_LOCAL_STORAGE_KEY } from '../constants';

const navigateToAgenticObservability = jest.fn();
const TestHarness = (props: Partial<ClassicExperienceBannerProps>) => (
  <ClassicExperienceBanner
    navigateToAgenticObservability={navigateToAgenticObservability}
    {...props}
  />
);

describe('ClassicExperienceBanner', () => {
  afterEach(() => {
    navigateToAgenticObservability.mockReset();
  });

  it('renders the banner correctly', () => {
    render(<TestHarness />);
    expect(screen.getByTestId('agenticObsClassicExperienceBanner')).toBeInTheDocument();
  });

  it('renders the Learn More link correctly', () => {
    render(<TestHarness />);
    const learnMoreLink = screen.getByTestId('agenticObsClassicExperienceBanner__learnMore');
    expect(learnMoreLink.getAttribute('href')).toBe(NEW_DISCOVER_INFO_URL);
    expect(learnMoreLink.getAttribute('target')).toBe('_blank');
  });

  it('renders the Try the new Discover button correctly', () => {
    jest.spyOn(Storage.prototype, 'removeItem');
    Storage.prototype.setItem = jest.fn();
    render(<TestHarness />);
    const button = screen.getByTestId('agenticObsClassicExperienceBanner__newExperienceButton');
    fireEvent.click(button);
    expect(localStorage.removeItem).toHaveBeenCalledWith(SHOW_CLASSIC_DISCOVER_LOCAL_STORAGE_KEY);
    expect(navigateToAgenticObservability).toHaveBeenCalled();
  });
});
