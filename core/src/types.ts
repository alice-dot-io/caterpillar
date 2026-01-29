export interface SkillMetadata {
  name: string;
  description?: string;
  allowedTools?: string[];
  disableModelInvocation?: boolean;
  userInvocable?: boolean;
  context?: string;
  agent?: string;
  hooks?: Record<string, unknown>;
}

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  line?: number;
  evidence?: string;
  recommendation?: string;
}

export interface ScanResult {
  skill: string;
  path: string;
  metadata: SkillMetadata | null;
  findings: SecurityFinding[];
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  scanDuration: number;
}

export interface Pattern {
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  pattern: RegExp;
  recommendation?: string;
}
