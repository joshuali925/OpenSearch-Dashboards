/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mock evaluation data generator for UI development.
 * This generates realistic evaluation events following OTEL semantic conventions
 * until real evaluation data is available.
 *
 * Based on: https://github.com/open-telemetry/semantic-conventions/issues/3398
 */

export interface EvalEvent {
  name: 'gen_ai.evaluation.result';
  timestamp: string;
  attributes: {
    'gen_ai.evaluation.name': string;
    'gen_ai.evaluation.score.value': number;
    'gen_ai.evaluation.score.label'?: 'pass' | 'fail';
    'gen_ai.evaluation.rationale'?: string;
  };
}

export interface EvalResult {
  name: string;
  score: number;
  label: 'pass' | 'fail';
  rationale?: string;
  timestamp?: string;
}

const EVALUATOR_CONFIGS = [
  {
    name: 'Agent Trajectory Eval',
    threshold: 0.7,
    rationaleTemplates: [
      'The trajectory begins with the use of the {tool1} tool to suggest authentic local experiences, which aligns with the user\'s interest in local culture. This is followed by the {tool2} tool to provide off-the-beaten-path ideas, which is relevant to the user\'s request for authentic experiences. The assistant then provides a concise summary of essential information, which is appropriate given the user\'s request for a summary. The trajectory also includes a detailed budget breakdown and itinerary, which are relevant to the user\'s request for budget-friendly alternatives and a 1-week itinerary. The use of the {tool3} tool is appropriate for gathering essential destination information. Overall, the trajectory progresses logically, uses the right tools, and is efficient in addressing the user\'s requests.',
      'The agent demonstrates strong reasoning by selecting appropriate tools in sequence. The {tool1} tool effectively addresses the initial query, followed by {tool2} for deeper context. The response maintains coherence throughout the interaction and provides actionable recommendations. The trajectory shows efficient tool usage without unnecessary steps.',
      'The reasoning flow is suboptimal. While {tool1} was correctly chosen, the subsequent use of {tool2} introduces redundancy. The agent could have achieved the same result more efficiently. However, the final output does address the user\'s core requirements adequately.',
    ],
  },
  {
    name: 'Faithfulness',
    threshold: 0.8,
    rationaleTemplates: [
      'The response accurately reflects the information retrieved from the knowledge base. All factual claims are supported by the source documents. No hallucinations or unsupported assertions were detected. The agent maintains fidelity to the retrieved context throughout the response.',
      'Minor inconsistencies detected between the response and source material. While the core facts are accurate, some details appear to be inferred rather than directly stated in the retrieved documents. The response would benefit from closer adherence to the source content.',
      'The response demonstrates excellent faithfulness to the source material. Every claim is directly traceable to the retrieved documents. The agent appropriately uses qualifiers when information is uncertain and avoids making unsupported extrapolations.',
    ],
  },
  {
    name: 'Relevance',
    threshold: 0.75,
    rationaleTemplates: [
      'The response directly addresses the user\'s query with high relevance. All information provided is pertinent to the question asked. The agent stays focused on the topic without introducing tangential information.',
      'The response includes some relevant information but also contains tangential details that don\'t directly address the user\'s core question. Approximately 30% of the content could be considered off-topic or unnecessarily verbose.',
      'Highly relevant response that precisely targets the user\'s information need. The agent demonstrates strong understanding of the query intent and provides exactly the information requested without extraneous details.',
    ],
  },
  {
    name: 'Coherence',
    threshold: 0.7,
    rationaleTemplates: [
      'The response maintains strong logical flow and coherence throughout. Ideas are well-organized and transitions between concepts are smooth. The narrative structure supports easy comprehension.',
      'Some coherence issues detected. The response jumps between topics without clear transitions. The logical flow could be improved to enhance readability and understanding.',
      'Excellent coherence with clear structure and logical progression. Each paragraph builds naturally on the previous one. The response is easy to follow and well-organized.',
    ],
  },
  {
    name: 'Groundedness',
    threshold: 0.8,
    rationaleTemplates: [
      'The response is well-grounded in the provided context. All statements are supported by the retrieved information. The agent avoids speculation and clearly distinguishes between facts and inferences.',
      'Partial grounding detected. While some claims are supported by the context, others appear to be generated without clear source attribution. The response would benefit from stronger ties to the retrieved documents.',
      'Strong groundedness throughout the response. Every assertion is backed by specific references to the source material. The agent appropriately cites sources and avoids unsupported claims.',
    ],
  },
];

const TOOLS = ['local_flavor', 'hidden_gems', 'essential_info', 'weather_check', 'budget_planner'];

/**
 * Generate a random evaluation score with realistic distribution
 */
function generateScore(threshold: number, passRate: number = 0.75): number {
  const shouldPass = Math.random() < passRate;

  if (shouldPass) {
    // Pass: score between threshold and 1.0, skewed toward higher values
    const range = 1.0 - threshold;
    const skew = Math.pow(Math.random(), 0.5); // Skew toward higher scores
    return threshold + range * skew;
  } else {
    // Fail: score between 0 and threshold, more evenly distributed
    return threshold * Math.random();
  }
}

/**
 * Generate rationale text with realistic tool names
 */
function generateRationale(template: string): string {
  const selectedTools = TOOLS.sort(() => Math.random() - 0.5).slice(0, 3);
  return template
    .replace('{tool1}', selectedTools[0])
    .replace('{tool2}', selectedTools[1])
    .replace('{tool3}', selectedTools[2]);
}

/**
 * Generate mock evaluation events for a span
 * @param spanId - The span ID to generate evals for
 * @param timestamp - Base timestamp for the events
 * @param numEvals - Number of evaluations to generate (1-3)
 */
export function generateMockEvalEvents(
  spanId: string,
  timestamp: string,
  numEvals: number = 1
): EvalEvent[] {
  // Randomly select evaluators (no duplicates)
  const selectedEvaluators = [...EVALUATOR_CONFIGS]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(numEvals, EVALUATOR_CONFIGS.length));

  return selectedEvaluators.map((evaluator, index) => {
    const score = generateScore(evaluator.threshold);
    const label: 'pass' | 'fail' = score >= evaluator.threshold ? 'pass' : 'fail';
    const rationaleTemplate =
      evaluator.rationaleTemplates[
        Math.floor(Math.random() * evaluator.rationaleTemplates.length)
      ];

    // Add small time offset for each eval event
    const eventTimestamp = new Date(new Date(timestamp).getTime() + index * 100).toISOString();

    return {
      name: 'gen_ai.evaluation.result',
      timestamp: eventTimestamp,
      attributes: {
        'gen_ai.evaluation.name': evaluator.name,
        'gen_ai.evaluation.score.value': Math.round(score * 100) / 100, // Round to 2 decimals
        'gen_ai.evaluation.score.label': label,
        'gen_ai.evaluation.rationale': generateRationale(rationaleTemplate),
      },
    };
  });
}

/**
 * Extract evaluation results from span events
 */
export function extractEvalResults(events?: EvalEvent[]): EvalResult[] {
  if (!events || events.length === 0) {
    return [];
  }

  return events
    .filter((event) => event.name === 'gen_ai.evaluation.result')
    .map((event) => ({
      name: event.attributes['gen_ai.evaluation.name'],
      score: event.attributes['gen_ai.evaluation.score.value'],
      label: event.attributes['gen_ai.evaluation.score.label'] || 'pass',
      rationale: event.attributes['gen_ai.evaluation.rationale'],
      timestamp: event.timestamp,
    }));
}

/**
 * Determine if mock eval data should be generated
 * Can be controlled via localStorage for development
 */
export function shouldGenerateMockEvals(): boolean {
  if (typeof window === 'undefined') return false;

  const mockEvalsEnabled = localStorage.getItem('agentTraces.mockEvals.enabled');
  // Default to true for development - always show mock evals unless explicitly disabled
  return mockEvalsEnabled !== 'false';
}

/**
 * Get the probability that a trace will have evaluations (0-1)
 */
export function getMockEvalProbability(): number {
  if (typeof window === 'undefined') return 1.0;

  const probability = localStorage.getItem('agentTraces.mockEvals.probability');
  return probability ? parseFloat(probability) : 1.0; // 100% of traces have evals by default
}

/**
 * Get the number of evaluations per trace (1-3)
 */
export function getMockEvalCount(): number {
  if (typeof window === 'undefined') return 2;

  const count = localStorage.getItem('agentTraces.mockEvals.count');
  return count ? parseInt(count, 10) : 2; // 2 evals per trace by default
}
