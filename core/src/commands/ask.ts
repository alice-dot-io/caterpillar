import { resolve } from 'path';
import { collectSkill } from '../lib/collector';
import { scanSingleSkill, detectScanMode, ScanMode } from '../lib/scan-skill';
import { printScanResult, printScanResultJson, printScanResultCsv, printError, printInfo } from '../lib/display';
import { printBanner } from '../lib/ui';

const MODE_LABELS = {
  'alice': 'Alice API',
  'openai': 'OpenAI',
  'offline': 'offline patterns',
} as const;

export type OutputFormat = 'json' | 'csv' | undefined;

function resolveFormat(options: { json?: boolean; output?: string }): OutputFormat {
  if (options.json) return 'json';
  if (options.output === 'json' || options.output === 'csv') return options.output;
  return undefined;
}

export async function askCommand(path: string | undefined, options: { json?: boolean; output?: string; verbose?: boolean; mode?: ScanMode }): Promise<void> {
  const targetPath = resolve(path || '.');
  const format = resolveFormat(options);
  const isMachine = !!format;

  if (!isMachine) {
    printBanner();
  }

  let skill;
  try {
    skill = collectSkill(targetPath);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const mode = options.mode || detectScanMode();
  if (!isMachine) {
    printInfo(`Scanning ${skill.skillName} (${skill.artifacts.length} files) via ${MODE_LABELS[mode]}...`);
  }

  let response;
  try {
    response = await scanSingleSkill(skill, { json: isMachine, mode });
  } catch (err) {
    printError(`Scan failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (format === 'json') {
    printScanResultJson(response);
  } else if (format === 'csv') {
    printScanResultCsv(response);
  } else {
    printScanResult(response, skill.artifacts.length, MODE_LABELS[mode], options.verbose);
  }

  if (response.success && response.data?.grade === 'F') process.exit(1);
  if (!response.success) process.exit(1);
}
