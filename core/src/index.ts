import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { scanCommand } from './commands/scan';
import { askCommand } from './commands/ask';
import { configSetCommand, configGetCommand } from './commands/config';
import { CLI_VERSION } from './lib/constants';
import { printBanner, printVersion, getBannerText } from './lib/ui';

const program = new Command();

program
  .name('caterpillar')
  .description(
    'Security scanner for AI agent skills. Scans for malicious patterns before you install.\n\n' +
    'Analysis modes (auto-detected):\n' +
    '  1. Alice         — authenticated users (caterpillar login)\n' +
    '  2. OpenAI        — supply your own OpenAI key (config set openai_api_key <key>)\n' +
    '  3. Offline       — pattern-based detection, no API key needed'
  )
  .option('-v, --version', 'Show version information')
  .action((opts) => {
    if (opts.version) {
      printVersion();
    } else {
      printBanner();
      program.outputHelp();
    }
  });

program.addHelpText('beforeAll', () => getBannerText());

program
  .command('login')
  .description('Authenticate with the Caterpillar API (opens browser)')
  .action(loginCommand);

program
  .command('logout')
  .description('Remove saved API key and end the current session')
  .action(logoutCommand);

program
  .command('scan [path]')
  .description('Scan skills in a directory — discovers subdirectories and extracts archives')
  .option('--json', 'Output results as JSON (shorthand for --output json)')
  .option('-o, --output <format>', 'Output format: json, csv')
  .option('-V, --verbose', 'Show full details (evidence, recommendations, explanations)')
  .option('-m, --mode <mode>', 'Scan mode: alice, openai, offline (default: auto-detect)')
  .action(scanCommand);

program
  .command('ask [path]')
  .description('Interrogate a single skill file or directory')
  .option('--json', 'Output results as JSON (shorthand for --output json)')
  .option('-o, --output <format>', 'Output format: json, csv')
  .option('-V, --verbose', 'Show full details (evidence, recommendations, explanations)')
  .option('-m, --mode <mode>', 'Scan mode: alice, openai, offline (default: auto-detect)')
  .action(askCommand);

const configCmd = program
  .command('config')
  .description('View or update CLI configuration');

configCmd
  .command('set <key> <value>')
  .description('Set a config value (api_url, virustotal_api_key, openai_api_key)')
  .action(configSetCommand);

configCmd
  .command('get [key]')
  .description('Show config values (masks sensitive keys)')
  .action(configGetCommand);

program.parse();
