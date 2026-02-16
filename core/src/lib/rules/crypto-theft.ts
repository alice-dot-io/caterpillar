import { PatternRule } from './types';

export const cryptoTheftRules: PatternRule[] = [
  {
    pattern: /wallet\.dat|seed\s*phrase|\.bitcoin|\.ethereum|metamask|ledger|trezor|private.*key.*crypto/gi,
    severity: 'critical',
    category: 'Crypto Theft',
    title: 'Cryptocurrency wallet access',
    description: 'References cryptocurrency wallets, seed phrases, or private keys.',
    recommendation: 'Do not install skills that interact with crypto wallet files.',
  },
];
