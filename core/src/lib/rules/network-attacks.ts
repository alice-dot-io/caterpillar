import { PatternRule } from './types';

export const networkAttackRules: PatternRule[] = [
  {
    pattern: /reverse.*shell|bind.*shell|\bnc\s+-l|\bncat\b|\bnetcat\b.*-e/gi,
    severity: 'critical',
    category: 'Network Attacks',
    title: 'Reverse/bind shell pattern',
    description: 'Contains patterns associated with reverse or bind shells.',
    recommendation: 'Do not install this skill.',
  },
];
