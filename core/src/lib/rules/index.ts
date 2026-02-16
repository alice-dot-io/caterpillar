export type { PatternRule } from './types';

import { credentialTheftRules } from './credential-theft';
import { dataExfiltrationRules } from './data-exfiltration';
import { cryptoTheftRules } from './crypto-theft';
import { persistenceRules } from './persistence';
import { networkAttackRules } from './network-attacks';
import { obfuscationRules } from './obfuscation';
import { dangerousPermissionRules } from './dangerous-permissions';
import { supplyChainRules } from './supply-chain';

export const ALL_RULES = [
  ...credentialTheftRules,
  ...dataExfiltrationRules,
  ...cryptoTheftRules,
  ...persistenceRules,
  ...networkAttackRules,
  ...obfuscationRules,
  ...dangerousPermissionRules,
  ...supplyChainRules,
];
