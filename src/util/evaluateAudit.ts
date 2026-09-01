const ALLOWED_NAMES = new Set(["undici", "@connectrpc/connect-node"]);
const ALLOWED_SOURCES = new Set([
  1112496,
  1114594,
  1114638,
  1114640,
  1114642,
]);
const BLOCKING_SEVERITIES = new Set(["moderate", "high", "critical"]);

export function evaluateAudit(auditJson: unknown): { ok: boolean; failures: string[] } {
  const vulnerabilities =
    auditJson && typeof auditJson === "object" && "vulnerabilities" in auditJson
      ? (auditJson as { vulnerabilities?: Record<string, unknown> }).vulnerabilities
      : {};
  const failures: string[] = [];

  for (const [name, vuln] of Object.entries(vulnerabilities ?? {})) {
    const v = vuln as { severity?: string; via?: unknown[] };
    const severity = String(v?.severity ?? "");
    if (!BLOCKING_SEVERITIES.has(severity)) continue;

    if (!ALLOWED_NAMES.has(name)) {
      failures.push(`${name}: unallowlisted ${severity} vulnerability`);
      continue;
    }

    for (const via of v?.via ?? []) {
      if (typeof via === "string") {
        if (!ALLOWED_NAMES.has(via)) {
          failures.push(`${name}: unallowlisted transitive via ${via}`);
        }
        continue;
      }
      const source = Number((via as { source?: number })?.source);
      if (!ALLOWED_SOURCES.has(source)) {
        failures.push(`${name}: unallowlisted advisory source ${source}`);
      }
    }
  }

  return { ok: failures.length === 0, failures };
}
