/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import NormalizePath from 'normalize-path';
import webpack from 'webpack';
import { Minimatch } from 'minimatch';
import { Bundle } from '../common';

/**
 * This plugin is needed to mark exports on public entry files as used
 * otherwise webpack 5's aggressive exports analysis will mark them as unused
 * and they will be removed. Without this plugin we need to run with usedExports: false
 * which affects the bundle sizes by a big margin.
 */
export class BundleRefUsedExportsPlugin {
  constructor(private readonly bundle: Bundle) {}

  apply(compiler: webpack.Compiler) {
    const buildPublicDirsPatterns = () => {
      const publicDirs = this.bundle.publicDirNames;
      const extensions = '.{js,ts,tsx,json}';
      const builtPattern = !publicDirs.length
        ? 'public'
        : publicDirs.length === 1
        ? publicDirs[0]
        : `{${publicDirs.join(',')}}`;
      return [`**/${builtPattern}/index${extensions}`, `**/${builtPattern}${extensions}`];
    };

    const publicDirsPatterns = buildPublicDirsPatterns();
    const PluginMainEntryGlob = new Minimatch(publicDirsPatterns[0]);
    const PluginExtraFileEntryGlob = new Minimatch(publicDirsPatterns[1]);

    compiler.hooks.compilation.tap('BundleRefUsedExportsPlugin', (compilation) => {
      const moduleGraph = compilation.moduleGraph;
      compilation.hooks.optimizeDependencies.tap('BundleRefUsedExportsPlugin', (modules) => {
        Array.from(modules).forEach((module: any) => {
          if (!module.resource) {
            return;
          }

          const normalizedModuleResource = NormalizePath(module.resource);
          if (
            PluginMainEntryGlob.match(normalizedModuleResource) ||
            PluginExtraFileEntryGlob.match(normalizedModuleResource)
          ) {
            // Get all exports of the module
            const exportsInfo = moduleGraph.getExportsInfo(module);

            // If the module uses export *, mark it as used in unknown way
            if (module.buildMeta && module.buildMeta.exportsType === 'namespace') {
              // @ts-ignore
              moduleGraph.getExportsInfo(module).setAllKnownExportsUsed();
              // @ts-ignore
              moduleGraph.getExportsInfo(module).setUsedInUnknownWay();
              moduleGraph.addExtraReason(
                module,
                `BundleRefUsedExportsPlugin/namespace#=>${module.resource}`
              );
            } else {
              Array.from(exportsInfo.exports).forEach((exportInfo: any) => {
                if (exportInfo.name) {
                  moduleGraph.getExportsInfo(module).setUsedInUnknownWay(exportInfo.name);
                  moduleGraph.addExtraReason(
                    module,
                    `BundleRefUsedExportsPlugin/${exportInfo.name}#=>${module.resource}`
                  );
                }
              });
            }
          }
        });
      });
    });
  }
}
