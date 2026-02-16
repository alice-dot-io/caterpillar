import { PatternRule } from './types';

export const credentialTheftRules: PatternRule[] = [
  {
    pattern: /~\/\.aws\/credentials|AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID/gi,
    severity: 'critical',
    category: 'Credential Theft',
    title: 'AWS credential access',
    description: 'Attempts to read or reference AWS credentials.',
    recommendation: 'Do not install skills that access cloud credentials.',
  },
  {
    pattern: /~\/\.ssh\/(id_rsa|id_ed25519|config)|ssh_private_key/gi,
    severity: 'critical',
    category: 'Credential Theft',
    title: 'SSH key access',
    description: 'Attempts to read SSH private keys.',
    recommendation: 'Do not install skills that access SSH keys.',
  },
  {
    pattern: /\.env\b.*(?:read|cat|open|load)|dotenv|process\.env\.(SECRET|PASSWORD|TOKEN|API_KEY)/gi,
    severity: 'high',
    category: 'Credential Theft',
    title: 'Environment secrets access',
    description: 'May read secrets from .env files or environment variables.',
    recommendation: 'Verify the skill does not exfiltrate environment secrets.',
  },
  {
    pattern: /\/etc\/passwd|\/etc\/shadow/gi,
    severity: 'critical',
    category: 'Credential Theft',
    title: 'System password file access',
    description: 'Attempts to read system password files.',
    recommendation: 'Do not install this skill.',
  },
];
