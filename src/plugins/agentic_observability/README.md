# Agentic Observability Plugin

This plugin provides observability and tracing capabilities specifically designed for AI agents and LangGraph applications.

## Overview

The Agentic Observability plugin extends the OpenSearch Dashboards Explore plugin to provide specialized trace visualization and analysis for agentic AI systems. It includes:

- **Trace Table View**: Hierarchical display of agent execution traces with expandable rows
- **Trace Details Flyout**: Interactive flyout with trace tree navigation, input/output inspection, and detailed span information
- **Agent-Specific Metrics**: Token usage, latency, and cost tracking for LLM calls
- **Multi-Level Tracing**: Support for AGENT, CHAIN, LLM, and RETRIEVE span types

## Features

### Trace Table
- Hierarchical trace display with parent-child relationships
- Status indicators (success/error)
- Kind badges (AGENT, CHAIN, LLM, RETRIEVE)
- Input/Output preview with expandable views
- Latency, token count, and cost metrics

### Trace Details Flyout
- **Trace Tree View**: Interactive tree navigation with selection highlighting
- **Agent Graph**: Visual representation of agent execution flow (coming soon)
- **Timeline View**: Temporal visualization of trace execution (coming soon)
- **Input/Output Tabs**: JSON formatted display of span inputs and outputs
- **Evaluations**: Trace evaluation metrics and scores
- **Attributes**: Span metadata and properties
- **Annotations**: User-added notes and observations

### Navigation
- Up/Down arrow navigation through trace tree
- Click-to-select nodes in the tree
- Automatic highlighting of selected trace

## Installation

This plugin is part of the OpenSearch Dashboards core plugins and is automatically available when OpenSearch Dashboards is installed.

## Usage

1. Navigate to the Traces page: `/app/explore/traces/`
2. View the list of traces in the table
3. Click any trace row to open the details flyout
4. Use the up/down arrows to navigate between spans
5. Click nodes in the trace tree to jump to specific spans
6. View input/output JSON in the detail tabs

## Configuration

The plugin uses the same configuration as the Explore plugin. See `opensearch_dashboards.json` for required and optional plugins.

## Development

Based on the OpenSearch Dashboards Explore plugin architecture with enhancements for agentic AI observability.

### Key Components

- `traces_table.tsx`: Main table component for trace listing
- `trace_details_flyout.tsx`: Flyout component for detailed trace inspection
- `logs_tab.tsx`: Tab component that conditionally renders traces table for traces flavor

## Future Enhancements

- Real-time trace streaming
- Advanced filtering and search
- Custom evaluation metrics
- Agent graph visualization
- Timeline view with Gantt chart
- Cost analysis and optimization recommendations
- Integration with LangSmith and other observability platforms
