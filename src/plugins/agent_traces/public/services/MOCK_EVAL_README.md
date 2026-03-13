# Mock Evaluation Data for UI Development

This directory contains mock evaluation data generators that allow UI development before real OTEL evaluation data is available.

## Overview

The mock eval system generates realistic evaluation events following the OTEL semantic conventions proposed in [semantic-conventions#3398](https://github.com/open-telemetry/semantic-conventions/issues/3398).

## Files

- **`mock_eval_data.ts`**: Core data generator with evaluator configs and rationale templates
- **`mock_eval_injector.ts`**: Integration layer that injects mock evals into trace data
- **`MOCK_EVAL_README.md`**: This file

## Usage

### Browser Console Controls

The mock eval system exposes controls via `window.agentTracesMockEvals`:

```javascript
// Enable/disable mock evaluations
window.agentTracesMockEvals.enable()
window.agentTracesMockEvals.disable()

// Set probability (0-1) that a trace will have evaluations
window.agentTracesMockEvals.setProbability(0.5)  // 50% of traces

// Set number of evaluations per trace (1-5)
window.agentTracesMockEvals.setCount(3)  // 3 evals per trace

// Check current settings
window.agentTracesMockEvals.status()
```

After changing settings, refresh the page to see the changes.

### Default Settings

- **Enabled**: `true` (enabled by default for development)
- **Probability**: `0.7` (70% of traces have evaluations)
- **Count**: `2` (2 evaluations per trace)

### LocalStorage Keys

Settings are persisted in localStorage:

- `agentTraces.mockEvals.enabled`: `"true"` or `"false"`
- `agentTraces.mockEvals.probability`: `"0.7"` (0-1)
- `agentTraces.mockEvals.count`: `"2"` (1-5)

## Evaluators

The system includes 5 realistic evaluators:

1. **Agent Trajectory Eval** (threshold: 0.7)
   - Evaluates the logical flow and tool usage in agent reasoning
   
2. **Faithfulness** (threshold: 0.8)
   - Measures how well the response adheres to source material
   
3. **Relevance** (threshold: 0.75)
   - Assesses if the response addresses the user's query
   
4. **Coherence** (threshold: 0.7)
   - Evaluates logical flow and organization
   
5. **Groundedness** (threshold: 0.8)
   - Checks if claims are supported by retrieved context

## Data Structure

Mock evaluations follow the OTEL semantic convention:

```typescript
// Span events
{
  name: "gen_ai.evaluation.result",
  timestamp: "2025-01-15T10:30:00.000Z",
  attributes: {
    "gen_ai.evaluation.name": "Agent Trajectory Eval",
    "gen_ai.evaluation.score.value": 0.95,
    "gen_ai.evaluation.score.label": "pass",
    "gen_ai.evaluation.rationale": "The trajectory begins with..."
  }
}
```

## Extracted Format

The `extractEvalResults()` function converts events to a simpler format:

```typescript
{
  name: "Agent Trajectory Eval",
  score: 0.95,
  label: "pass",
  rationale: "The trajectory begins with...",
  timestamp: "2025-01-15T10:30:00.000Z"
}
```

This format is added to `TraceRow.evaluations` array.

## Score Distribution

Scores are generated with realistic distribution:

- **Pass scores**: Between threshold and 1.0, skewed toward higher values
- **Fail scores**: Between 0 and threshold, more evenly distributed
- **Pass rate**: 75% by default (configurable per evaluator)

## Rationale Templates

Each evaluator has 3 rationale templates that are randomly selected and populated with realistic tool names (`local_flavor`, `hidden_gems`, `essential_info`, etc.).

## Disabling for Production

To disable mock evals:

```javascript
window.agentTracesMockEvals.disable()
```

Or set the localStorage key directly:

```javascript
localStorage.setItem('agentTraces.mockEvals.enabled', 'false')
```

## Future: Real OTEL Data

When real OTEL evaluation data becomes available:

1. The mock system can be disabled via the console controls
2. The same `TraceRow.evaluations` structure will be populated from real span events
3. UI components built with mock data will work seamlessly with real data
4. The extraction logic in `mock_eval_data.ts` can be moved to the main span transform pipeline

## Development Tips

- Start with default settings to see a good mix of pass/fail cases
- Use `setProbability(1.0)` to ensure all traces have evals for testing
- Use `setCount(1)` to test single-eval UI, `setCount(3)` for multiple evals
- Check the console on page load for the mock eval helper message
