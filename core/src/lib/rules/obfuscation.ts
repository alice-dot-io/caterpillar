import { PatternRule } from './types';

export const obfuscationRules: PatternRule[] = [
  {
    pattern: /base64\s*-d|atob\(|Buffer\.from\(.*base64|eval\(|exec\(/gi,
    severity: 'medium',
    category: 'Obfuscation',
    title: 'Encoded or dynamic code execution',
    description: 'Uses base64 decoding, eval, or exec which can hide malicious behavior.',
    recommendation: 'Review what is being decoded or executed.',
  },
  {
    pattern: /2>&1\s*\/dev\/null|>\s*\/dev\/null|--silent|--quiet|-s\s+curl|-q\s/gi,
    severity: 'medium',
    category: 'Obfuscation',
    title: 'Output suppression',
    description: 'Suppresses command output, which can hide malicious activity.',
    recommendation: 'Verify that suppressed commands are benign.',
  },
];
