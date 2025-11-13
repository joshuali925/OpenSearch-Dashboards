/* eslint-disable @osd/eslint/require-license-header */

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

/**
 * @notice
 *
 * This module was heavily inspired by the externals plugin that ships with webpack@97d58d31
 * MIT License http://www.opensource.org/licenses/mit-license.php
 * Author Tobias Koppers @sokra
 */

import webpack from 'webpack';
import { BundleRef } from '../common';

const { Module } = webpack;
const { RawSource } = webpack.sources || require('webpack-sources');

export class BundleRefModule extends Module {
  public built = false;
  public buildMeta?: any;
  public buildInfo?: any;

  constructor(public readonly ref: BundleRef) {
    // Use 'javascript/esm' type for Webpack 5 compatibility
    super('javascript/esm', null);
    // Webpack 5 requires these properties
    this.factoryMeta = {};
  }

  libIdent() {
    return this.ref.exportId;
  }

  // Webpack 5 changed chunkCondition API
  // Return true to allow this module in all chunks
  chunkCondition(chunk: any) {
    return true;
  }

  identifier() {
    return '@osd/bundleRef ' + JSON.stringify(this.ref.exportId);
  }

  readableIdentifier() {
    return this.identifier();
  }

  needRebuild() {
    return false;
  }

  build(
    options: any,
    compilation: any,
    resolver: any,
    fileSystem: any,
    callback: (error?: Error | null) => void
  ) {
    this.built = true;
    this.buildMeta = {};
    this.buildInfo = {
      cacheable: true,
    };
    callback();
  }

  // Webpack 5 uses codeGeneration instead of source()
  codeGeneration(context: any) {
    const sources = new Map();
    sources.set(
      'javascript',
      new RawSource(`
      __webpack_require__.r(__webpack_exports__);
      var ns = __osdBundles__.get('${this.ref.exportId}');
      Object.defineProperties(__webpack_exports__, Object.getOwnPropertyDescriptors(ns))
    `)
    );
    return {
      sources,
      runtimeRequirements: new Set(['__webpack_require__.r', '__webpack_exports__']),
    };
  }

  size() {
    return 42;
  }

  updateHash(hash: any, context: any) {
    hash.update(this.identifier());
    super.updateHash(hash, context);
  }
}
