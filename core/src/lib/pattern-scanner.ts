import { ALL_RULES, PatternRule } from './rules';

export interface PatternFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface PatternScanResult {
  findings: PatternFinding[];
  score: number;
  summary: string;
  explanation: string;
  risk_impact: string;
}

export function runPatternScan(content: string, skillName: string): PatternScanResult {
  const findings: PatternFinding[] = [];
  const seen = new Set<string>();

  for (const rule of ALL_RULES) {
    const matches = content.match(rule.pattern);
    if (!matches) continue;

    // Deduplicate by title
    if (seen.has(rule.title)) continue;
    seen.add(rule.title);

    findings.push({
      severity: rule.severity,
      category: rule.category,
      title: rule.title,
      description: rule.description,
      evidence: matches[0].trim().slice(0, 200),
      recommendation: rule.recommendation,
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Calculate score
  let score = 100;
  for (const f of findings) {
    switch (f.severity) {
      case 'critical': score -= 30; break;
      case 'high': score -= 15; break;
      case 'medium': score -= 8; break;
      case 'low': score -= 3; break;
    }
  }
  score = Math.max(0, Math.min(100, score));

  // Build summary
  const critCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;

  let summary: string;
  if (findings.length === 0) {
    summary = 'No suspicious patterns detected in standard scan.';
  } else if (critCount > 0) {
    summary = `DANGEROUS: ${critCount} critical issue(s) found. Do not install without thorough review.`;
  } else if (highCount > 0) {
    summary = `${highCount} high-severity issue(s) found. Review carefully before installing.`;
  } else {
    summary = `${findings.length} minor issue(s) found. Generally safe but review recommended.`;
  }

  return {
    findings,
    score,
    summary,
    explanation: '',
    risk_impact: '',
  };
}
