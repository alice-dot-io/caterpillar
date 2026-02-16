import { getApiKey, getApiUrl } from './config';
import { CLI_VERSION } from './constants';
import { ArtifactMeta } from './collector';

export interface ScanRequest {
  content: string;
  name?: string;
  artifacts?: ArtifactMeta[];
}

export interface SecurityFinding {
  severity: string;
  category: string;
  title: string;
  description: string;
  evidence?: string;
  recommendation?: string;
}

export interface ArtifactRecord {
  file: string;
  rel: string;
  size: number;
  kind: string;
  mime: string | null;
  sha256: string | null;
  virustotal?: {
    malicious: boolean;
    suspicious: boolean;
    harmless: boolean;
    reputation: number;
    detectionCount: number;
    totalEngines: number;
    lastAnalysisDate: number | null;
    error?: string;
  } | null;
}

export interface ScanResponse {
  success: boolean;
  data?: {
    skill: string;
    grade: string;
    score: number;
    findings: SecurityFinding[];
    summary: string;
    explanation: string;
    risk_impact: string;
    scanDuration: number;
    binaryArtifacts?: ArtifactRecord[];
    archiveArtifacts?: ArtifactRecord[];
  };
  forensics?: {
    included: boolean;
    filesReceived?: number;
    filesAnalyzed?: number;
    reason?: string;
  };
  error?: { code: string; message: string };
}

export interface AuthSessionResponse {
  session_id: string;
  device_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
  error?: string;
}

export interface AuthPollResponse {
  status: 'pending' | 'complete' | 'expired' | 'consumed' | 'error';
  api_key?: string;
  expires_in?: number;
  user?: { email: string; plan: string };
  error?: string;
}

export async function postScan(request: ScanRequest): Promise<ScanResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Not authenticated. Run: caterpillar login');
  }

  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'User-Agent': `caterpillar-cli/${CLI_VERSION}`,
    },
    body: JSON.stringify(request),
  });

  return response.json() as Promise<ScanResponse>;
}

export async function createAuthSession(): Promise<AuthSessionResponse> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/cli-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `caterpillar-cli/${CLI_VERSION}`,
    },
    body: JSON.stringify({
      cli_version: CLI_VERSION,
      os_type: process.platform,
    }),
  });

  return response.json() as Promise<AuthSessionResponse>;
}

export async function pollAuthSession(
  sessionId: string,
  deviceCode: string
): Promise<AuthPollResponse> {
  const apiUrl = getApiUrl();
  const params = new URLSearchParams({ session_id: sessionId, device_code: deviceCode });
  const response = await fetch(`${apiUrl}/api/cli-auth?${params}`, {
    headers: {
      'User-Agent': `caterpillar-cli/${CLI_VERSION}`,
    },
  });

  return response.json() as Promise<AuthPollResponse>;
}
