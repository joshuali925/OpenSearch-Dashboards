# Changes from Explore Plugin to Agentic Observability Plugin

## Summary
This plugin is a copy of the Explore plugin with enhancements for agentic AI observability and tracing.

## Modified Files

### 1. `opensearch_dashboards.json`
- Changed plugin ID from `"explore"` to `"agenticObservability"`
- Updated configPath to `["agenticObservability"]`

### 2. `public/application/register_tabs.ts`
- Line 75: Changed tab label from `'Spans'` to `'Traces'`
- This changes the display name in the Traces flavor of the explore experience

### 3. `public/components/tabs/logs_tab.tsx` (Modified)
- Added conditional rendering based on flavor
- When in Traces flavor, renders `TracesTable` instead of `ExploreDataTable`
- Hides ActionBar when in Traces mode

## New Files

### 1. `public/components/tabs/traces_table.tsx`
New component for displaying agent traces in a hierarchical table format.

**Features:**
- Hierarchical trace display with expandable rows
- Status indicators (success/error)
- Kind badges (AGENT, CHAIN, LLM, RETRIEVE) with color coding
- Input/Output preview columns with "View" buttons
- Metrics columns: Start Time, Latency, Total Tokens, Total Cost
- Row click handler to open trace details flyout
- Checkbox selection for bulk operations

**Mock Data:**
- 8 sample traces including TripAgentGraph, research_agent, ChatOpenAI, etc.
- Demonstrates parent-child relationships
- Shows various span types and metrics

### 2. `public/components/tabs/trace_details_flyout.tsx`
New flyout component for detailed trace inspection.

**Features:**

**Header Section:**
- Up/Down arrow navigation buttons
- Close button
- Trace ID and Session ID badges
- Status indicators: TRACE STATUS, TOTAL COST, START TIME, TRACE EVALS

**Main Tabs:**
- **Trace Tree**: Interactive hierarchical tree view
  - Click-to-select nodes
  - Visual highlighting of selected node
  - Shows tokens and latency for each node
  - Maintains hierarchical indentation
- **Agent Graph**: Placeholder for future graph visualization
- **Timeline**: Placeholder for future timeline visualization

**Detail Panel (Bottom):**
- Dynamic badge showing selected node's kind (AGENT, CHAIN, LLM, RETRIEVE)
- Selected node name display
- Sub-tabs:
  - **Input**: JSON code block with syntax highlighting
  - **Output**: JSON code block with syntax highlighting
  - **Evaluations**: Placeholder for evaluation metrics
  - **Attributes**: Key-value pairs (Trace ID, Session ID, Kind)
  - **Annotations**: Placeholder for user annotations

**Navigation Logic:**
- Flattens tree structure for linear navigation
- Up arrow: Previous node in depth-first order
- Down arrow: Next node in depth-first order
- Buttons disabled at start/end of list
- Initializes with the clicked trace selected

### 3. `README.md` (Replaced)
New README documenting the Agentic Observability plugin features and usage.

## Usage

### Accessing the Plugin
Navigate to: `http://localhost:5601/app/explore/traces/`

### Viewing Traces
1. The main page shows a table of traces
2. Each row represents a trace execution
3. Expandable rows show child spans
4. Click any row to open the details flyout

### Navigating Trace Details
1. Flyout opens with the clicked trace selected in the tree
2. Use up/down arrows to navigate between all nodes
3. Click any node in the tree to jump to it
4. View input/output JSON in the detail tabs
5. Close flyout with X button

## Technical Details

### Component Architecture
```
TracesTable (Main View)
  ├─ Row click handler
  └─ TraceDetailsFlyout
      ├─ Header (navigation + metadata)
      ├─ Main Tabs (Trace Tree, Agent Graph, Timeline)
      └─ Detail Panel (Input, Output, Evaluations, Attributes, Annotations)
```

### State Management
- `selectedTrace`: Currently selected trace from table
- `isFlyoutOpen`: Controls flyout visibility
- `selectedNodeIndex`: Index in flattened tree for navigation
- `expandedRows`: Set of expanded row IDs in table

### Styling
- Uses OpenSearch UI (OUI) components throughout
- Color-coded badges for different span types:
  - AGENT: warning (orange)
  - CHAIN: secondary (gray)
  - LLM: danger (red)
  - RETRIEVE: success (green)
- Selected node highlighted with light blue background (#E6F1FA)

## Future Enhancements

1. **Real Data Integration**
   - Connect to actual trace data sources
   - Support for OpenTelemetry format
   - Integration with LangSmith/LangGraph

2. **Advanced Visualizations**
   - Agent graph with node relationships
   - Timeline with Gantt chart
   - Flame graph for performance analysis

3. **Filtering and Search**
   - Filter by span type, status, latency
   - Search by trace ID, session ID
   - Date range filtering

4. **Analytics**
   - Cost analysis and optimization
   - Token usage trends
   - Latency distribution
   - Error rate tracking

5. **Evaluations**
   - Custom evaluation metrics
   - Automated quality scoring
   - A/B testing support

## Development Notes

- Plugin ID must be camelCase: `agenticObservability`
- All imports and references to `explore` should be updated to `agenticObservability`
- The plugin extends the Explore plugin's architecture
- Maintains compatibility with existing Explore features
