/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorybookConfig } from '@storybook/core-common';

export const defaultConfig: StorybookConfig = {
  addons: [
    '@osd/storybook/preset',
    '@storybook/addon-knobs',
    '@storybook/addon-essentials',
    // Removed @storybook/addon-postcss (uses PostCSS 7) - PostCSS is configured directly in webpackFinal
  ],
  core: {
    builder: 'webpack4',
  },
  stories: ['../**/*.stories.tsx'],
  typescript: {
    reactDocgen: false,
  },
  webpackFinal: async (config) => {
    // Configure PostCSS
    if (!config.module) {
      config.module = { rules: [] };
    }
    if (!config.module.rules) {
      config.module.rules = [];
    }
    config.module.rules.push({
      test: /\.css$/,
      use: [
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [
                'postcss-flexbugs-fixes',
                [
                  'autoprefixer',
                  {
                    flexbox: 'no-2009',
                  },
                ],
              ],
            },
          },
        },
      ],
    });

    return config;
  },
};
