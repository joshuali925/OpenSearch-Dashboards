/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UnmountCallback } from 'opensearch-dashboards/public';
import { SearchBarExtensionConfig } from './search_bar_extensions_registry';
import { MountPointPortal } from '../../../../opensearch_dashboards_react/public';

interface SearchBarExtensionProps {
  config: SearchBarExtensionConfig;
  attachmentSibling: HTMLElement;
}

export const SearchBarExtension: React.FC<SearchBarExtensionProps> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  const unmounts = useRef<UnmountCallback[]>([]);
  const [showAttachment, setShowAttachment] = useState(false);

  const mount = useMemo(() => props.config.createMount(() => setShowAttachment((show) => !show)), [
    props.config,
  ]);

  useEffect(() => {
    if (!ref.current) {
      throw new Error('<SearchBarExtension /> mounted without ref');
    }

    if (props.config) {
      unmounts.current.push(mount(ref.current));
    }

    return () => {
      if (unmounts.current.length) {
        unmounts.current.map((unmount) => unmount);
        unmounts.current = [];
      }
    };
  }, [mount, props.config]);

  return (
    <>
      <div ref={ref} />
      {props.config.uiAttachment && (
        <MountPointPortal
          setMountPoint={(mountPoint) => unmounts.current.push(mountPoint(props.attachmentSibling))}
        >
          <div style={{ display: showAttachment ? 'block' : 'none' }}>
            {props.config.uiAttachment}
          </div>
        </MountPointPortal>
      )}
    </>
  );
};
