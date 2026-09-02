const EXEC_KEYWORDS = /\b(execute the plan|run plan|execute)\b/i;

/** Whether to inject the stored approved plan into an agent-mode prompt. */
export function shouldInjectApprovedPlan(prompt: string): boolean {
  if (prompt.includes("--plan")) return true;
  return EXEC_KEYWORDS.test(prompt);
}

/** Strip --plan flag from user prompt before sending. */
export function stripPlanFlag(prompt: string): string {
  return prompt.replace(/\s--plan\b/g, "").trim();
}

export function buildExecutionPrompt(userPrompt: string, planMarkdown: string): string {
  const clean = stripPlanFlag(userPrompt);
  const header =
    "Execute the following approved plan. Follow the steps carefully.\n\n" +
    "--- APPROVED PLAN ---\n";
  const footer = "\n--- END PLAN ---\n\n";
  const instruction =
    clean.length > 0
      ? `User instruction: ${clean}`
      : "Proceed with execution of the plan above.";
  return `${header}${planMarkdown}${footer}${instruction}`;
}
