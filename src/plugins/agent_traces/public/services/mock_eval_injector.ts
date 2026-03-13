/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TraceRow } from '../application/pages/traces/hooks/use_agent_traces';
import {
  generateMockEvalEvents,
  extractEvalResults,
  shouldGenerateMockEvals,
  getMockEvalProbability,
  getMockEvalCount,
} from './mock_eval_data';

/**
 * Inject mock evaluation data into trace rows for UI development
 * This adds realistic evaluation events to traces until real eval data is available
 */
export function injectMockEvals(traces: TraceRow[]): TraceRow[] {
  if (!shouldGenerateMockEvals()) {
    return traces;
  }

  const probability = getMockEvalProbability();
  const evalCount = getMockEvalCount();

  let injectedCount = 0;

  const result = traces.map((trace) => {
    // Randomly decide if this trace should have evals
    if (Math.random() > probability) {
      return trace;
    }

    // Generate mock eval events
    const mockEvents = generateMockEvalEvents(trace.spanId, trace.startTime, evalCount);

    // Extract eval results from events
    const evaluations = extractEvalResults(mockEvents);

    injectedCount++;

    return {
      ...trace,
      evaluations,
      // Store raw events for potential future use
      _mockEvalEvents: mockEvents as any,
    };
  });

  // Log to console for debugging
  if (injectedCount > 0) {
    console.log(
      `%c🧪 Mock Evals Injected`,
      'color: #00bfb3; font-weight: bold',
      `${injectedCount}/${traces.length} traces with ${evalCount} evals each`
    );
  }

  return result;
}

/**
 * Console helper to control mock eval generation
 * Usage in browser console:
 *   window.agentTracesMockEvals.enable()
 *   window.agentTracesMockEvals.disable()
 *   window.agentTracesMockEvals.setProbability(0.5)
 *   window.agentTracesMockEvals.setCount(3)
 */
export function setupMockEvalControls() {
  if (typeof window === 'undefined') return;

  (window as any).agentTracesMockEvals = {
    enable: () => {
      localStorage.setItem('agentTraces.mockEvals.enabled', 'true');
      console.log('✅ Mock evaluations enabled. Refresh the page to see changes.');
    },
    disable: () => {
      localStorage.setItem('agentTraces.mockEvals.enabled', 'false');
      console.log('❌ Mock evaluations disabled. Refresh the page to see changes.');
    },
    setProbability: (prob: number) => {
      if (prob < 0 || prob > 1) {
        console.error('Probability must be between 0 and 1');
        return;
      }
      localStorage.setItem('agentTraces.mockEvals.probability', prob.toString());
      console.log(`📊 Mock eval probability set to ${prob * 100}%. Refresh to see changes.`);
    },
    setCount: (count: number) => {
      if (count < 1 || count > 5) {
        console.error('Count must be between 1 and 5');
        return;
      }
      localStorage.setItem('agentTraces.mockEvals.count', count.toString());
      console.log(`🔢 Mock eval count set to ${count}. Refresh to see changes.`);
    },
    status: () => {
      const enabled = shouldGenerateMockEvals();
      const probability = getMockEvalProbability();
      const count = getMockEvalCount();
      console.log(`
Mock Evaluations Status:
  Enabled: ${enabled}
  Probability: ${probability * 100}%
  Count per trace: ${count}
      `);
    },
  };

  // Log helper on page load
  console.log(
    '%c🧪 Agent Traces Mock Evals',
    'font-weight: bold; font-size: 14px; color: #00bfb3;'
  );
  console.log('Use window.agentTracesMockEvals to control mock evaluation data:');
  console.log('  • enable() / disable()');
  console.log('  • setProbability(0.5) - Set % of traces with evals');
  console.log('  • setCount(3) - Set number of evals per trace');
  console.log('  • status() - Show current settings');
}
