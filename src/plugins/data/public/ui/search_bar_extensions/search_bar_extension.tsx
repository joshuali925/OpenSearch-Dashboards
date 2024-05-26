/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPortal } from '@elastic/eui';
import { EuiPortalProps } from '@opensearch-project/oui/src/eui_components/portal/portal';
import { SearchBarExtensionConfig } from './search_bar_extensions_registry';

interface SearchBarExtensionProps {
  config: SearchBarExtensionConfig;
  attachmentInsert: EuiPortalProps['insert'];
}

interface SearchBarExtensionStates {
  showAttachment: boolean;
}

export class SearchBarExtension extends React.Component<
  SearchBarExtensionProps,
  SearchBarExtensionStates
> {
  private readonly ref = React.createRef<HTMLDivElement>();
  private unrender?: () => void;

  constructor(props: SearchBarExtensionProps) {
    super(props);
    this.state = {
      showAttachment: false,
    };
  }

  public componentDidMount() {
    this.renderExtension();
  }

  public componentDidUpdate(prevProps: SearchBarExtensionProps) {
    if (this.props.config === prevProps.config) {
      return;
    }

    this.unrenderExtension();
    this.renderExtension();
  }

  public componentWillUnmount() {
    this.unrenderExtension();
  }

  public render() {
    return (
      <>
        <div ref={this.ref} />
        {this.state.showAttachment && (
          <EuiPortal insert={this.props.attachmentInsert}>
            {this.props.config.uiAttachment}
          </EuiPortal>
        )}
      </>
    );
  }

  private toggleShowAttachment() {
    this.setState({ showAttachment: !this.state.showAttachment });
  }

  private renderExtension() {
    if (!this.ref.current) {
      throw new Error('<SearchBarExtension /> mounted without ref');
    }

    if (this.props.config) {
      this.unrender = this.props.config.mount(this.toggleShowAttachment.bind(this))(
        this.ref.current
      );
    }
  }

  private unrenderExtension() {
    this.setState({ showAttachment: false });
    if (this.unrender) {
      this.unrender();
      this.unrender = undefined;
    }
  }
}
