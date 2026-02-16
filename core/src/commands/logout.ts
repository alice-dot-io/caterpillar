import { loadConfig, saveConfig } from '../lib/config';
import { printError, printSuccess, printInfo } from '../lib/display';
import { printBanner } from '../lib/ui';

export function logoutCommand(): void {
  printBanner();

  const config = loadConfig();

  if (!config.api_key) {
    printInfo('Not currently logged in.');
    return;
  }

  delete config.api_key;
  saveConfig(config);

  printSuccess('Logged out — API key removed from ~/.caterpillar/credentials');
  printInfo('Other config keys (virustotal_api_key, openai_api_key) are preserved.');
  printInfo('Run "caterpillar login" to authenticate again.');
}
