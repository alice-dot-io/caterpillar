import { resolve, join, basename } from 'path';
import { readdirSync, statSync } from 'fs';
import { collectSkill, CollectedSkill } from '../lib/collector';
import { ScanResponse } from '../lib/api-client';
import { scanSingleSkill, detectScanMode, ScanMode } from '../lib/scan-skill';
import { extractArchive, cleanupTempDirs } from '../lib/archives';
import {
  printScanResult, printScanResultJson, printScanResultCsv, printMultiScanResultCsv,
  printError, printInfo, printWarning, printSuccess,
} from '../lib/display';
import {
  printBanner, Spinner, SCAN_MESSAGES, isFancyTerminal,
  boxTop, boxBottom, boxLine,
  gradeColor, RESET, BOLD, DIM, GRAY, GREEN, RED,
} from '../lib/ui';

const MODE_LABELS = {
  'alice': 'Alice API',
  'openai': 'OpenAI',
  'offline': 'offline patterns',
} as const;

const ARCHIVE_EXTENSIONS = /\.(zip|tar|tgz|tar\.gz)$/i;

type OutputFormat = 'json' | 'csv' | undefined;

function resolveFormat(options: { json?: boolean; output?: string }): OutputFormat {
  if (options.json) return 'json';
  if (options.output === 'json' || options.output === 'csv') return options.output;
  return undefined;
}

interface SkillTarget {
  path: string;
  label: string;
  isExtracted: boolean;
}

function discoverTargets(dir: string): SkillTarget[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const subdirs: SkillTarget[] = [];
  const archives: SkillTarget[] = [];
  let hasRootTextFiles = false;

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      try {
        const subEntries = readdirSync(fullPath);
        if (subEntries.length > 0) {
          subdirs.push({ path: fullPath, label: entry.name, isExtracted: false });
        }
      } catch {
        // skip unreadable dirs
      }
    } else if (entry.isFile() && ARCHIVE_EXTENSIONS.test(entry.name)) {
      archives.push({ path: fullPath, label: entry.name, isExtracted: false });
    } else if (entry.isFile()) {
      hasRootTextFiles = true;
    }
  }

  if (subdirs.length > 0 || archives.length > 0) {
    const targets: SkillTarget[] = [];
    if (hasRootTextFiles) {
      targets.push({ path: dir, label: basename(dir), isExtracted: false });
    }
    return [...targets, ...subdirs, ...archives];
  }

  return [{ path: dir, label: basename(dir), isExtracted: false }];
}

function printAggregateSummary(results: Array<{ label: string; response: ScanResponse; fileCount: number }>): void {
  const fancy = isFancyTerminal();
  const width = 40;

  if (fancy) {
    console.log();
    console.log(`  ${GRAY}${boxTop('Scan Summary', width)}${RESET}`);
    console.log(`  ${GRAY}${boxLine(`${BOLD}${results.length} skill(s) scanned${RESET}`, width)}${RESET}`);
    console.log(`  ${GRAY}${boxLine('', width)}${RESET}`);

    for (const r of results) {
      if (!r.response.success || !r.response.data) {
        const line = `  ${r.label}: ${RED}ERROR${RESET}`;
        console.log(`  ${GRAY}${boxLine(line, width)}${RESET}`);
        continue;
      }
      const d = r.response.data;
      const color = gradeColor(d.grade);
      const line = `  ${color}${d.grade}${RESET} ${r.label} ${DIM}(${d.score}/100, ${d.findings.length} findings)${RESET}`;
      console.log(`  ${GRAY}${boxLine(line, width)}${RESET}`);
    }

    console.log(`  ${GRAY}${boxLine('', width)}${RESET}`);
    console.log(`  ${GRAY}${boxBottom(width)}${RESET}`);
  } else {
    console.log();
    console.log(`Scan complete: ${results.length} skill(s) scanned\n`);

    for (const r of results) {
      if (!r.response.success || !r.response.data) {
        console.log(`  ${r.label}: ERROR`);
        continue;
      }
      const d = r.response.data;
      console.log(`  ${r.label}: ${d.grade} (${d.score}/100) — ${d.findings.length} finding(s), ${r.fileCount} file(s)`);
    }
  }
  console.log();
}

export async function scanCommand(path: string | undefined, options: { json?: boolean; output?: string; verbose?: boolean; mode?: ScanMode }): Promise<void> {
  const targetPath = resolve(path || '.');
  const format = resolveFormat(options);
  const isMachine = !!format;

  if (!isMachine) {
    printBanner();
  }

  let stat;
  try {
    stat = statSync(targetPath);
  } catch {
    printError(`Path not found: ${targetPath}`);
    process.exit(1);
  }

  if (stat.isFile()) {
    return scanSingle(targetPath, options, format);
  }

  const targets = discoverTargets(targetPath);

  if (targets.length === 1 && !ARCHIVE_EXTENSIONS.test(targets[0].path)) {
    return scanSingle(targets[0].path, options, format);
  }

  const verbose = options.verbose;

  const mode = options.mode || detectScanMode();
  if (!isMachine) {
    printInfo(`Found ${targets.length} skill(s) to scan in ${basename(targetPath)}/ via ${MODE_LABELS[mode]}\n`);
  }

  const results: Array<{ label: string; response: ScanResponse; fileCount: number }> = [];
  const tempDirs: string[] = [];
  let hasFailure = false;

  for (let i = 0; i < targets.length; i++) {
    let target = targets[i];
    let scanPath = target.path;

    if (ARCHIVE_EXTENSIONS.test(target.path)) {
      if (!isMachine) {
        printInfo(`Extracting ${target.label}...`);
      }
      const extracted = extractArchive(target.path);
      if (!extracted) {
        printWarning(`  Could not extract ${target.label}, skipping.`);
        continue;
      }
      tempDirs.push(extracted);
      scanPath = extracted;
      target = { ...target, isExtracted: true };
    }

    let skill: CollectedSkill;
    try {
      skill = collectSkill(scanPath);
    } catch (err) {
      if (!isMachine) {
        printWarning(`  Skipping ${target.label}: ${err instanceof Error ? err.message : err}`);
      }
      continue;
    }

    const label = target.isExtracted ? target.label : skill.skillName;

    if (!isMachine) {
      printInfo(`[${i + 1}/${targets.length}] Scanning ${label} (${skill.artifacts.length} files)...`);
    }

    try {
      const response = await scanSingleSkill(skill, { json: isMachine, mode });
      results.push({ label, response, fileCount: skill.artifacts.length });

      if (!isMachine) {
        printScanResult(response, skill.artifacts.length, MODE_LABELS[mode], verbose);
      }

      if (response.success && response.data?.grade === 'F') hasFailure = true;
      if (!response.success) hasFailure = true;
    } catch (err) {
      printError(`  ${label}: Scan failed — ${err instanceof Error ? err.message : err}`);
      hasFailure = true;
    }
  }

  cleanupTempDirs(tempDirs);

  if (format === 'json') {
    console.log(JSON.stringify(results.map(r => ({ skill: r.label, ...r.response })), null, 2));
    if (hasFailure) process.exit(1);
    return;
  }

  if (format === 'csv') {
    printMultiScanResultCsv(results.map(r => ({ label: r.label, response: r.response })));
    if (hasFailure) process.exit(1);
    return;
  }

  if (results.length > 1) {
    printAggregateSummary(results);
  }

  if (hasFailure) process.exit(1);
}

async function scanSingle(targetPath: string, options: { json?: boolean; output?: string; verbose?: boolean; mode?: ScanMode }, format: OutputFormat): Promise<void> {
  const isMachine = !!format;

  let skill: CollectedSkill;
  try {
    skill = collectSkill(targetPath);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const singleMode = options.mode || detectScanMode();
  if (!isMachine) {
    printInfo(`Scanning ${skill.skillName} (${skill.artifacts.length} files) via ${MODE_LABELS[singleMode]}...`);
  }

  let response: ScanResponse;
  try {
    response = await scanSingleSkill(skill, { json: isMachine, mode: singleMode });
  } catch (err) {
    printError(`Scan failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (format === 'json') {
    printScanResultJson(response);
  } else if (format === 'csv') {
    printScanResultCsv(response);
  } else {
    printScanResult(response, skill.artifacts.length, MODE_LABELS[singleMode], options.verbose);
  }

  if (response.success && response.data?.grade === 'F') process.exit(1);
  if (!response.success) process.exit(1);
}
