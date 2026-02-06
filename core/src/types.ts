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
  binaryArtifacts?: ArtifactRecord[];
  archiveArtifacts?: ArtifactRecord[];
}

/**
 * VirusTotal scan result for an artifact
 */
export interface VirusTotalScanResult {
  malicious: boolean;
  suspicious: boolean;
  harmless: boolean;
  reputation: number;
  detectionCount: number;
  totalEngines: number;
  lastAnalysisDate: number | null;
  error?: string;
}

/**
 * Artifact record for binary or archive files detected in a skill
 */
export interface ArtifactRecord {
  file: string; // Absolute path (client-side) or relative path
  rel: string; // Relative path from skill root
  size: number; // File size in bytes
  kind: 'binary' | 'archive' | 'text';
  mime: string | null; // MIME type
  sha256: string | null; // SHA256 hash
  virustotal?: VirusTotalScanResult | null; // VirusTotal scan result (if checked)
}

/**
 * Artifact detection results
 */
export interface Artifacts {
  inventory: ArtifactRecord[];
  binaries: ArtifactRecord[];
  archives: ArtifactRecord[];
  totals: {
    files: number;
    bytes: number;
  };
}

export interface Pattern {
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  pattern: RegExp;
  recommendation?: string;
}
