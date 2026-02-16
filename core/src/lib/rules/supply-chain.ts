import { PatternRule } from './types';

export const supplyChainRules: PatternRule[] = [
  {
    pattern: /npm\s+install|pip\s+install|gem\s+install|cargo\s+install/gi,
    severity: 'medium',
    category: 'Supply Chain',
    title: 'Package installation',
    description: 'Installs packages which could introduce supply chain risks.',
    recommendation: 'Verify the packages being installed are from trusted sources.',
  },
  {
    pattern: /postinstall|preinstall|postbuild/gi,
    severity: 'high',
    category: 'Supply Chain',
    title: 'Install hook detected',
    description: 'References install hooks that run code automatically during package installation.',
    recommendation: 'Review what code runs in install hooks.',
  },
];
