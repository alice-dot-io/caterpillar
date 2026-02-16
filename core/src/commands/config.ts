import { loadConfig, saveConfig } from '../lib/config';
import { printError, printSuccess, printInfo } from '../lib/display';

export function configSetCommand(key: string, value: string): void {
  const allowed = ['virustotal_api_key', 'openai_api_key', 'api_url'];
  if (!allowed.includes(key)) {
    printError(`Unknown config key: ${key}\nAllowed keys: ${allowed.join(', ')}`);
    process.exit(1);
  }

  const config = loadConfig();
  (config as Record<string, string>)[key] = value;
  saveConfig(config);
  printSuccess(`Set ${key} in ~/.caterpillar/credentials`);
}

export function configGetCommand(key?: string): void {
  const config = loadConfig();

  if (key) {
    const val = (config as Record<string, string | undefined>)[key];
    if (val) {
      // Mask sensitive keys
      if (key === 'api_key' || key === 'virustotal_api_key' || key === 'openai_api_key') {
        console.log(`${key}: ${val.slice(0, 8)}...${val.slice(-4)}`);
      } else {
        console.log(`${key}: ${val}`);
      }
    } else {
      printInfo(`${key}: (not set)`);
    }
    return;
  }

  // Show all config
  const entries = Object.entries(config);
  if (entries.length === 0) {
    printInfo('No configuration set. Run "caterpillar login" to authenticate.');
    return;
  }

  for (const [k, v] of entries) {
    if ((k === 'api_key' || k === 'virustotal_api_key' || k === 'openai_api_key') && v) {
      console.log(`${k}: ${(v as string).slice(0, 8)}...${(v as string).slice(-4)}`);
    } else {
      console.log(`${k}: ${v}`);
    }
  }
}
