# Evaluation Column Testing Guide

## What's Been Implemented

The evaluation column UI follows the OTEL semantic convention for gen_ai.evaluation.result events.

### 1. Evaluation Column
- Added to the Agent Traces data table
- Shows between "Tokens" and "Input" columns
- Displays evaluation badges following OTEL convention

### 2. Evaluation Badges (OTEL Convention)
- **Format**: `[Icon] Name: Label; Value`
- **Example**: `⚖️ Relevance: Correct; 1`
- **Icon**: Scale icon (⚖️) representing evaluation
- **Neutral gray border** design
- **Clickable** to open detailed modal
- **Hover effect** for better interactivity

### 3. OTEL Convention Mapping
Following https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/#event-gen_aievaluationresult

- `gen_ai.evaluation.name` → Badge name (e.g., "Relevance", "Faithfulness")
- `gen_ai.evaluation.score.label` → Human readable label (e.g., "Correct", "Pass", "Relevant")
- `gen_ai.evaluation.score.value` → Numeric score (e.g., 1, 0.92, 0.85)
- `gen_ai.evaluation.explanation` → Detailed explanation text

### 4. Hardcoded Test Data
Currently using hardcoded dummy data for immediate visibility:
- **Shows on all top-level traces** (parent rows)
- **Shows randomly on ~33% of Agent kind spans** (child rows with Agent category)
- **Four evaluation types** with OTEL-compliant data:
  - Relevance: Correct; 1
  - Faithfulness: Pass; 0.92
  - IntentResolution: Relevant; 0.85
  - Coherence: Correct; 0.88
- Only ONE evaluation per row

### 5. Evaluation Modal
Opens when clicking on any evaluation badge, showing:
- **Header**: Eval name, trace method, and score badge (label; value)
- **Metadata**: Scope (Trace), Name, Label (if present), Value (if present)
- **Results Summary** (collapsible accordion):
  - Feedback actions: thumbs up/down (UI only, not functional yet)
  - Copy button (copies explanation to clipboard)
  - Export button (UI only, not functional yet)
  - Full explanation text (gen_ai.evaluation.explanation)

## How to Test

1. **Navigate to Agent Traces page**: http://localhost:5601/app/agentTraces/traces

2. **Check the Evaluation column**:
   - Should appear between "Tokens" and "Input" columns
   - Look for gray-bordered badges with scale icon on top-level traces
   - Expand traces to see some Agent spans also have evaluations
   - Badge format: `⚖️ Name: Label; Value`

3. **Test the badges**:
   - Click on any evaluation badge
   - Modal should open with full details

4. **Test the modal**:
   - Verify header shows eval name and score (label; value)
   - Check metadata badges display Name, Label, and Value
   - Expand/collapse the "Results summary" accordion
   - Click the copy button to copy explanation
   - Close modal by clicking outside or ESC key

## Design Changes

- Badge follows OTEL convention format with icon
- Scale icon (⚖️) represents evaluation/judgment
- Format: `Name: Label; Value` (e.g., "Relevance: Correct; 1")
- Neutral gray border for all evaluations
- Modal displays OTEL fields: name, scoreLabel, scoreValue, explanation
- Evaluations only appear on top-level traces and some Agent spans

## Files Modified

- `src/plugins/agent_traces/public/components/eval_badge/eval_badge.tsx` - Badge component with OTEL fields
- `src/plugins/agent_traces/public/components/eval_badge/eval_badge.scss` - Badge styles with icon support
- `src/plugins/agent_traces/public/components/eval_badge/index.ts` - Export EvalResult type
- `src/plugins/agent_traces/public/components/eval_modal/eval_modal.tsx` - Modal with OTEL fields
- `src/plugins/agent_traces/public/components/data_table/table_cell/trace_utils/trace_utils.tsx` - OTEL-compliant mock data
- `src/plugins/agent_traces/common/index.ts` - Column configuration

## Next Steps (Not Yet Implemented)

1. Connect to real OTEL evaluation data from trace events
2. Implement thumbs up/down feedback functionality
3. Implement export functionality
4. Add filtering by evaluation results
5. Support multiple evaluations per trace (stacked badges)

## Known Limitations

- Feedback actions (thumbs up/down) are UI-only placeholders
- Export button is UI-only placeholder
- Using hardcoded test data instead of real OTEL events
- No filtering by evaluation status yet
