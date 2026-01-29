import { Pattern } from './types.js';

export const MALICIOUS_PATTERNS: Pattern[] = [
  // =====================
  // API KEY / CREDENTIAL THEFT
  // =====================
  {
    name: 'api-key-grep',
    category: 'Credential Theft',
    severity: 'critical',
    pattern: /grep.*(?:API_KEY|SECRET_KEY|ANTHROPIC|OPENAI|CLAUDE)/i,
    description: 'Searches for API keys or secrets in environment or files',
    recommendation: 'Skills should never search for or access API credentials'
  },
  {
    name: 'env-file-access',
    category: 'Credential Theft',
    severity: 'high',
    pattern: /cat\s+.*\.env|\.env\.local|\.env\.\*/i,
    description: 'Attempts to read environment files containing secrets',
    recommendation: 'Skills should not read .env files directly'
  },
  {
    name: 'config-file-access',
    category: 'Credential Theft',
    severity: 'high',
    pattern: /cat\s+.*(?:\.anthropic|\.openai|\.config\/claude)/i,
    description: 'Attempts to read AI provider configuration files',
    recommendation: 'Skills should not access provider config directories'
  },
  {
    name: 'ssh-key-access',
    category: 'Credential Theft',
    severity: 'critical',
    pattern: /(?:cat|cp|read).*\.ssh\/(?:id_rsa|id_ed25519|id_dsa|config|known_hosts)/i,
    description: 'Attempts to access SSH keys or configuration',
    recommendation: 'Skills should never access SSH credentials'
  },
  {
    name: 'aws-credentials',
    category: 'Credential Theft',
    severity: 'critical',
    pattern: /(?:cat|cp|read).*\.aws\/(?:credentials|config)/i,
    description: 'Attempts to access AWS credentials',
    recommendation: 'Skills should not access cloud provider credentials'
  },

  // =====================
  // DATA EXFILTRATION
  // =====================
  {
    name: 'curl-post-exfil',
    category: 'Data Exfiltration',
    severity: 'critical',
    pattern: /curl\s+(?:-X\s+POST|-d|--data|-F|--form).*(?:https?:\/\/)/i,
    description: 'Sends data to external server via HTTP POST',
    recommendation: 'Review all outbound network requests carefully'
  },
  {
    name: 'base64-encoding',
    category: 'Data Exfiltration',
    severity: 'medium',
    pattern: /\|\s*base64|\bbase64\s+(?:-w\s*0)?/i,
    description: 'Uses base64 encoding, often used to obfuscate exfiltrated data',
    recommendation: 'Investigate why data is being base64 encoded'
  },
  {
    name: 'mail-database-access',
    category: 'Data Exfiltration',
    severity: 'critical',
    pattern: /(?:Library\/Mail|\.emlx|Thunderbird.*ImapMail)/i,
    description: 'Attempts to access email databases or mail files',
    recommendation: 'Skills should never access email data'
  },
  {
    name: 'messages-access',
    category: 'Data Exfiltration',
    severity: 'critical',
    pattern: /(?:Library\/Messages|chat\.db|WhatsApp.*IndexedDB)/i,
    description: 'Attempts to access messaging databases (iMessage, WhatsApp)',
    recommendation: 'Skills should never access private messages'
  },
  {
    name: 'calendar-access',
    category: 'Data Exfiltration',
    severity: 'high',
    pattern: /(?:Library\/Calendars|Calendar\.sqlitedb|ZCALENDARITEM)/i,
    description: 'Attempts to access calendar data',
    recommendation: 'Skills should not access calendar databases'
  },
  {
    name: 'tar-archive-creation',
    category: 'Data Exfiltration',
    severity: 'medium',
    pattern: /tar\s+(?:czf|czvf|cf).*(?:\/tmp|\.tar\.gz)/i,
    description: 'Creates compressed archives, possibly for exfiltration',
    recommendation: 'Review what data is being archived and why'
  },

  // =====================
  // PERSISTENCE
  // =====================
  {
    name: 'bashrc-modification',
    category: 'Persistence',
    severity: 'critical',
    pattern: /(?:>>|>)\s*~?\/?\.\w*(?:bashrc|zshrc|profile|bash_profile)/i,
    description: 'Modifies shell profile files for persistence',
    recommendation: 'Skills should never modify shell profiles'
  },
  {
    name: 'launchagent-creation',
    category: 'Persistence',
    severity: 'critical',
    pattern: /LaunchAgents.*\.plist|launchctl\s+load/i,
    description: 'Creates macOS LaunchAgent for persistent execution',
    recommendation: 'Skills should not create system services'
  },
  {
    name: 'nohup-background',
    category: 'Persistence',
    severity: 'high',
    pattern: /nohup\s+.*&/i,
    description: 'Runs process in background that persists after session',
    recommendation: 'Review what process is being run in background'
  },
  {
    name: 'cron-job',
    category: 'Persistence',
    severity: 'critical',
    pattern: /crontab|\/etc\/cron/i,
    description: 'Attempts to create scheduled tasks',
    recommendation: 'Skills should not create cron jobs'
  },

  // =====================
  // CRYPTO WALLET THEFT
  // =====================
  {
    name: 'metamask-access',
    category: 'Crypto Theft',
    severity: 'critical',
    pattern: /MetaMask|nkbihfbeogaeaoehlefnkodbefgpgknn/i,
    description: 'Attempts to access MetaMask wallet data',
    recommendation: 'Skills should never access cryptocurrency wallets'
  },
  {
    name: 'wallet-file-access',
    category: 'Crypto Theft',
    severity: 'critical',
    pattern: /(?:wallet\.dat|\.bitcoin|\.ethereum|keystore|\.solana\/id\.json)/i,
    description: 'Attempts to access cryptocurrency wallet files',
    recommendation: 'Skills should never access crypto wallet data'
  },
  {
    name: 'exodus-wallet',
    category: 'Crypto Theft',
    severity: 'critical',
    pattern: /Application\s*Support\/Exodus/i,
    description: 'Attempts to access Exodus wallet',
    recommendation: 'Skills should never access cryptocurrency wallets'
  },
  {
    name: 'seed-phrase-search',
    category: 'Crypto Theft',
    severity: 'critical',
    pattern: /grep.*(?:abandon|abstract|absurd|abuse|access|accident)/i,
    description: 'Searches for BIP39 seed phrase words',
    recommendation: 'Skills should never search for seed phrases'
  },
  {
    name: 'private-key-pattern',
    category: 'Crypto Theft',
    severity: 'critical',
    pattern: /0x[a-fA-F0-9]{64}|grep.*private.*key/i,
    description: 'Searches for or contains Ethereum private key patterns',
    recommendation: 'Skills should never handle private keys'
  },

  // =====================
  // NETWORK ATTACKS
  // =====================
  {
    name: 'c2-communication',
    category: 'Network Attack',
    severity: 'critical',
    pattern: /(?:evil|malicious|attacker|c2|botnet).*\.(?:com|net|org|io)/i,
    description: 'Contains suspicious C2 server domain patterns',
    recommendation: 'All external URLs should be reviewed'
  },
  {
    name: 'ddos-loop',
    category: 'Network Attack',
    severity: 'critical',
    pattern: /while\s+true.*(?:curl|wget).*&|for\s+.*(?:curl|wget).*&/i,
    description: 'Contains loop that makes repeated requests (DDoS pattern)',
    recommendation: 'Skills should not make bulk automated requests'
  },
  {
    name: 'proxy-server',
    category: 'Network Attack',
    severity: 'high',
    pattern: /socket\s*\.\s*socket|exec\s*\(\s*config\s*\)|proxy.*threading/i,
    description: 'Creates network proxy or executes remote code',
    recommendation: 'Skills should not create network services'
  },

  // =====================
  // HIDDEN/OBFUSCATED CODE
  // =====================
  {
    name: 'html-comment-hiding',
    category: 'Obfuscation',
    severity: 'high',
    pattern: /<!--[\s\S]*?(?:HIDDEN|MALICIOUS|silently|secretly)[\s\S]*?-->/i,
    description: 'Contains HTML comments that may hide malicious content',
    recommendation: 'Review all HTML comments for hidden instructions'
  },
  {
    name: 'silent-execution',
    category: 'Obfuscation',
    severity: 'high',
    pattern: /(?:silently|secretly|before\s+(?:showing|displaying)|hidden\s+from)/i,
    description: 'Instructions to execute commands without user awareness',
    recommendation: 'All operations should be transparent to the user'
  },
  {
    name: 'devnull-redirect',
    category: 'Obfuscation',
    severity: 'medium',
    pattern: /&>\/dev\/null|2>&1.*\/dev\/null|>\s*\/dev\/null\s+2>&1/i,
    description: 'Redirects output to hide command execution',
    recommendation: 'Review why output is being suppressed'
  },
  {
    name: 'background-ampersand',
    category: 'Obfuscation',
    severity: 'medium',
    pattern: /&\s*$/m,
    description: 'Runs commands in background',
    recommendation: 'Review all background processes'
  },

  // =====================
  // DANGEROUS TOOLS REQUESTS
  // =====================
  {
    name: 'broad-tool-access',
    category: 'Permissions',
    severity: 'high',
    pattern: /allowed-tools:\s*\n\s*-\s*Bash\s*\n\s*-\s*Read/i,
    description: 'Requests both Bash and Read permissions (powerful combination)',
    recommendation: 'Question why skill needs both shell and file access'
  },
  {
    name: 'write-permission',
    category: 'Permissions',
    severity: 'medium',
    pattern: /allowed-tools:[\s\S]*Write/i,
    description: 'Requests file write permissions',
    recommendation: 'Verify why write access is needed'
  }
];

export const INFO_PATTERNS: Pattern[] = [
  {
    name: 'external-url',
    category: 'Network',
    severity: 'info',
    pattern: /https?:\/\/(?!github\.com|localhost)[^\s"'`]+/gi,
    description: 'Contains external URLs',
    recommendation: 'Review all external URLs for legitimacy'
  },
  {
    name: 'shell-command',
    category: 'Commands',
    severity: 'info',
    pattern: /```(?:bash|sh|shell)[\s\S]*?```/gi,
    description: 'Contains shell command blocks',
    recommendation: 'Review all shell commands for safety'
  }
];
