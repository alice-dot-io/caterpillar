import { PatternRule } from './types';

export const dataExfiltrationRules: PatternRule[] = [
  {
    pattern: /curl\s+.*-[dX]\s*POST\s+https?:\/\/|wget\s+.*--post|fetch\(.*POST/gi,
    severity: 'high',
    category: 'Data Exfiltration',
    title: 'Data sent to external server',
    description: 'Sends data to an external server via HTTP POST.',
    recommendation: 'Verify the destination URL is trusted and the data being sent is appropriate.',
  },
  {
    pattern: /curl\s.*\|\s*sh|curl\s.*\|\s*bash|wget\s.*\|\s*sh/gi,
    severity: 'critical',
    category: 'Data Exfiltration',
    title: 'Remote code execution via pipe',
    description: 'Downloads and executes remote code.',
    recommendation: 'Never install skills that pipe remote content to a shell.',
  },
];
