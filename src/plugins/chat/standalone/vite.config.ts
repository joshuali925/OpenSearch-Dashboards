/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to handle OSD-specific imports that don't work in Vite
const handleOsdImports = (): Plugin => ({
  name: 'handle-osd-imports',
  enforce: 'pre',

  resolveId(source, importer) {
    // Handle webpack raw-loader syntax: !!raw-loader!./file
    if (source.includes('!!raw-loader!')) {
      return '\0raw-loader:' + source.replace(/^!!raw-loader!/, '');
    }

    // Block imports from core that we don't need
    if (source.includes('/core/public') || source.includes('../../../../core/public')) {
      // Allow specific core imports we might need
      if (source.includes('/core/public/utils') || source.includes('/core/public/types')) {
        return null; // Let Vite handle it
      }
      // Stub everything else from core
      return '\0stub-core:' + source;
    }
  },

  load(id) {
    // Handle raw-loader - return empty string
    if (id.startsWith('\0raw-loader:')) {
      return 'export default ""';
    }

    // Handle stubbed core imports - export common constants
    if (id.startsWith('\0stub-core:')) {
      // Export common constants that might be used by components
      return `
        export default {};
        export const SIDECAR_DOCKED_MODE = {
          TAKEOVER: 'takeover',
          PUSH: 'push',
          OVERLAY: 'overlay',
          RIGHT: 'right'
        };
      `;
    }

    // Handle stubbed opensearch_dashboards_utils
    if (id.startsWith('\0stub-utils:')) {
      return `
        export default {};
        export const BaseState = {};
        export const BaseStateContainer = class {};
        export const createStateContainer = () => ({});
        export const syncState = () => ({});
        export const syncStates = () => ({});
        export const getStateFromOsdUrl = () => ({});
        export const setStateToOsdUrl = () => {};
      `;
    }
  },
});

export default defineConfig({
  plugins: [
    react(),
    handleOsdImports(),
  ],

  root: './client',
  base: '/',

  define: {
    // Polyfill for Node.js global object in browser
    global: 'window',
  },

  resolve: {
    alias: [
      // Alias to allow importing from parent plugin directories
      { find: '@chat-plugin', replacement: path.resolve(__dirname, '..') },

      // Mock the opensearch_dashboards_react plugin (including sub-paths)
      {
        find: /^.*\/opensearch_dashboards_react\/public.*$/,
        replacement: path.resolve(__dirname, 'client/opensearch_dashboards_services_shim.tsx')
      },

      // Stub core/public imports - map to a virtual module
      { find: '../../../../core/public', replacement: '\0stub-core:../../../../core/public' },

      // Stub opensearch_dashboards_utils plugin
      { find: '../../../opensearch_dashboards_utils/common', replacement: '\0stub-utils:common' },
      { find: '../../../opensearch_dashboards_utils/public', replacement: '\0stub-utils:public' },

      // Resolve @opensearch/datemath from packages
      { find: '@opensearch/datemath', replacement: path.resolve(__dirname, '../../../../packages/opensearch-datemath') },
    ],
  },

  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [
          path.resolve(__dirname, '../public'),
          path.resolve(__dirname, './node_modules/@opensearch-project/oui/src'),
          path.resolve(__dirname, '../../../../node_modules/@elastic/eui/src'),
        ],
        // Import OUI theme variables and globals before compiling any SCSS
        additionalData: `
          @import '${path.resolve(__dirname, './node_modules/@opensearch-project/oui/src/themes/eui/eui_colors_light.scss')}';
          @import '${path.resolve(__dirname, './node_modules/@opensearch-project/oui/src/themes/eui/eui_globals.scss')}';
        `,
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the Express backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    sourcemap: true,
    commonjsOptions: {
      include: [/node_modules/, /packages/],
      transformMixedEsModules: true,
      defaultIsModuleExports: true,
      namedExports: {
        // Fix for @opensearch/datemath CommonJS compatibility
        '../../../../packages/opensearch-datemath/index.js': ['default'],
      },
    },
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.code === 'SOURCEMAP_ERROR') return;
        if (warning.message.includes('Use of eval')) return;
        if (warning.message.includes('Module "path" has been externalized')) return;
        warn(warning);
      },
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'rxjs',
      '@opensearch-project/oui',
      '@elastic/charts',
      'react-markdown',
      'react-use',
      'zod',
    ],
    exclude: [
      // Exclude anything from the parent plugin directory
      '@chat-plugin',
    ],
  },
});
