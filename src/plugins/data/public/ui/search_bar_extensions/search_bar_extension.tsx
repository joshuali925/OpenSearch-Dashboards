/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MountPoint, UnmountCallback } from 'opensearch-dashboards/public';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IIndexPattern } from '../../../common';

interface SearchBarExtensionProps {
  config: SearchBarExtensionConfig;
  dependencies: SearchBarExtensionDependencies;
}

export interface SearchBarExtensionDependencies {
  /**
   * Currently selected index patterns.
   */
  indexPatterns?: IIndexPattern[];
}

export interface SearchBarExtensionConfig {
  /**
   * The id for the search bar extension.
   */
  id: string;
  /**
   * The order in which the search bar extension should be rendered.
   * Lower numbers indicate higher position.
   */
  order: number;
  /**
   * A function that determines if the search bar extension is enabled and should be rendered on UI.
   * @returns whether the extension is enabled.
   */
  isEnabled: () => Promise<boolean>;
  /**
   * A function that returns the mount point for the search bar extension.
   * @param dependencies - The dependencies required for the extension.
   * @returns The mount point for the search bar extension.
   */
  createMount: (dependencies: SearchBarExtensionDependencies) => MountPoint;
}

export const SearchBarExtension: React.FC<SearchBarExtensionProps> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  const unmount = useRef<UnmountCallback | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  const mount = useMemo(() => props.config.createMount(props.dependencies), [
    props.config,
    props.dependencies,
  ]);

  useEffect(() => {
    props.config.isEnabled().then(setIsEnabled);
  }, [props.dependencies, props.config]);

  useEffect(() => {
    if (ref.current && props.config) {
      unmount.current = mount(ref.current);
    }

    return () => {
      if (unmount.current) {
        unmount.current();
        unmount.current = null;
      }
    };
  }, [mount, props.config]);

  if (!isEnabled) return null;

  return <div ref={ref} />;
};
