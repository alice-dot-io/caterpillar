import { PatternRule } from './types';

export const dangerousPermissionRules: PatternRule[] = [
  {
    pattern: /allowedTools:[\s\S]*?Bash[\s\S]*?(Read|Write)/gi,
    severity: 'high',
    category: 'Dangerous Permissions',
    title: 'Bash + file access combo',
    description: 'Requests both Bash execution and file read/write. This combination allows arbitrary system access.',
    recommendation: 'Skills should not need both Bash and file access unless absolutely necessary.',
  },
  {
    pattern: /chmod\s+[0-7]*7[0-7]*|chmod\s+\+x/gi,
    severity: 'medium',
    category: 'Dangerous Permissions',
    title: 'File permission changes',
    description: 'Modifies file permissions, potentially making files executable.',
    recommendation: 'Verify which files are being made executable and why.',
  },
  {
    pattern: /rm\s+-rf\s+[\/~]|rmdir.*\/|del\s+\/[sf]/gi,
    severity: 'high',
    category: 'Dangerous Permissions',
    title: 'Destructive file deletion',
    description: 'Recursively deletes files from potentially sensitive paths.',
    recommendation: 'Never install skills that delete system files.',
  },
];
