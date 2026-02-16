import { PatternRule } from './types';

export const networkAttackRules: PatternRule[] = [
  {
    pattern: /reverse.*shell|bind.*shell|nc\s+-l|ncat|netcat.*-e/gi,
    severity: 'critical',
    category: 'Network Attacks',
    title: 'Reverse/bind shell pattern',
    description: 'Contains patterns associated with reverse or bind shells.',
    recommendation: 'Do not install this skill.',
  },
];
