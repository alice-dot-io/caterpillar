import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { DEFAULT_API_URL, CONFIG_DIR, CONFIG_FILE } from './constants';

export interface CaterpillarConfig {
  api_key?: string;
  api_url?: string;
  virustotal_api_key?: string;
  openai_api_key?: string;
}

function getConfigDir(): string {
  return join(homedir(), CONFIG_DIR);
}

function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILE);
}

export function loadConfig(): CaterpillarConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveConfig(config: CaterpillarConfig): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + '\n', {
    mode: 0o600,
  });
}

export function getApiKey(): string | undefined {
  return process.env.CATERPILLAR_API_KEY || loadConfig().api_key;
}

export function getApiUrl(): string {
  return process.env.CATERPILLAR_API_URL || loadConfig().api_url || DEFAULT_API_URL;
}

export function getVirusTotalApiKey(): string | undefined {
  return process.env.VIRUSTOTAL_API_KEY || loadConfig().virustotal_api_key;
}

export function getOpenAIApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY || loadConfig().openai_api_key;
}
