import { PatternRule } from './types';

export const persistenceRules: PatternRule[] = [
  {
    pattern: /crontab|\/etc\/cron|LaunchAgent|LaunchDaemon|\.bashrc|\.zshrc|\.bash_profile|\.profile/gi,
    severity: 'high',
    category: 'Persistence',
    title: 'System persistence mechanism',
    description: 'May install persistent processes or modify shell startup files.',
    recommendation: 'Verify the skill does not install background tasks or modify shell configs.',
  },
];
