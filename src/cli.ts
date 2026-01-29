#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readdirSync, existsSync } from 'fs';
import { mkdir, writeFile, readFile, unlink, access } from 'fs/promises';
import { join } from 'path';
import { homedir, platform } from 'os';
import { globSync } from 'glob';
import open from 'open';
import { CaterpillarScanner, ScanResult, SecurityFinding } from '../core/src/index.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const VERSION = pkg.version;

// Configuration
const CONFIG_DIR = join(homedir(), '.caterpillar');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials');
const API_BASE_URL = process.env.CATERPILLAR_API_URL || 'https://caterpillar.alice.io';

// ASCII Art Banner
const banner = `
${chalk.hex('#00adef')('   ___      _                  _ _ _            ')}
${chalk.hex('#00adef')('  / __\\__ _| |_ ___ _ __ _ __ (_) | | __ _ _ __ ')}
${chalk.hex('#00adef')(' / /  / _` | __/ _ \\ \'__| \'_ \\| | | |/ _` | \'__|')}
${chalk.hex('#00adef')('/ /__| (_| | ||  __/ |  | |_) | | | | (_| | |   ')}
${chalk.hex('#00adef')('\\____/\\__,_|\\__\\___|_|  | .__/|_|_|_|\\__,_|_|   ')}
${chalk.hex('#00adef')('                        |_|                     ')}
  ${chalk.hex('#00adef')('"Who are you?"')} ${chalk.gray('by Alice')}
`;

// Wonderland-themed loading verbs
const WONDERLAND_VERBS = [
  'Galumphing',
  'Chortling',
  'Whiffling',
  'Burbling',
  'Gyring',
  'Gimbling',
  'Grinning',
  'Twinkling',
  'Curtsying',
  'Wondering'
];

function getRandomVerb(): string {
  return WONDERLAND_VERBS[Math.floor(Math.random() * WONDERLAND_VERBS.length)];
}

function createAnimatedSpinner(skillName: string): { spinner: ReturnType<typeof ora>; interval: NodeJS.Timeout } {
  const spinner = ora({
    text: `${getRandomVerb()} through ${skillName}...`,
    color: 'cyan'
  }).start();

  const interval = setInterval(() => {
    spinner.text = `${getRandomVerb()} through ${skillName}...`;
  }, 8000);

  return { spinner, interval };
}

function formatSeverity(severity: SecurityFinding['severity']): string {
  const colors: Record<string, (s: string) => string> = {
    critical: chalk.bgRed.white.bold,
    high: chalk.red.bold,
    medium: chalk.yellow,
    low: chalk.blue,
    info: chalk.gray
  };
  return colors[severity](` ${severity.toUpperCase()} `);
}

function formatGrade(grade: ScanResult['grade'], score: number): string {
  const gradeColors: Record<string, (s: string) => string> = {
    A: chalk.green.bold,
    B: chalk.green,
    C: chalk.yellow,
    D: chalk.red,
    F: chalk.bgRed.white.bold
  };

  const gradeEmoji: Record<string, string> = {
    A: '✓',
    B: '✓',
    C: '⚠',
    D: '✗',
    F: '☠'
  };

  return gradeColors[grade](`${gradeEmoji[grade]} Grade: ${grade} (${score}/100)`);
}

function printResult(result: ScanResult): void {
  console.log();
  console.log(chalk.bold('═'.repeat(60)));
  console.log(chalk.bold(`  🐛 Caterpillar Scan Report`));
  console.log(chalk.bold('═'.repeat(60)));
  console.log();

  // Skill info
  console.log(chalk.gray('  Skill:    ') + chalk.white.bold(result.skill));
  console.log(chalk.gray('  Path:     ') + chalk.white(result.path));
  console.log(chalk.gray('  Duration: ') + chalk.white(`${result.scanDuration}ms`));
  console.log();

  // Grade
  console.log('  ' + formatGrade(result.grade, result.score));
  console.log();

  // Summary
  if (result.grade === 'F') {
    console.log(chalk.bgRed.white.bold('  ⚠️  ' + result.summary + '  '));
  } else if (result.grade === 'D' || result.grade === 'C') {
    console.log(chalk.yellow('  ⚠️  ' + result.summary));
  } else {
    console.log(chalk.green('  ' + result.summary));
  }
  console.log();

  // Findings
  if (result.findings.length > 0) {
    console.log(chalk.bold('  Findings:'));
    console.log(chalk.gray('  ' + '─'.repeat(56)));

    const categorized: Record<string, SecurityFinding[]> = {};
    for (const finding of result.findings) {
      if (!categorized[finding.category]) {
        categorized[finding.category] = [];
      }
      categorized[finding.category].push(finding);
    }

    for (const [category, findings] of Object.entries(categorized)) {
      console.log();
      console.log(chalk.cyan.bold(`  ${category}:`));

      for (const finding of findings) {
        console.log();
        console.log(`    ${formatSeverity(finding.severity)} ${chalk.white.bold(finding.title)}`);
        console.log(chalk.gray(`    ${finding.description}`));

        if (finding.line) {
          console.log(chalk.gray(`    Line: ${finding.line}`));
        }

        if (finding.evidence) {
          console.log(chalk.gray(`    Evidence: `) + chalk.yellow(`"${finding.evidence}"`));
        }

        if (finding.recommendation) {
          console.log(chalk.gray(`    → ${finding.recommendation}`));
        }
      }
    }
  }

  console.log();
  console.log(chalk.bold('═'.repeat(60)));
  console.log();
}

function printJsonResult(result: ScanResult): void {
  console.log(JSON.stringify(result, null, 2));
}

async function checkAuthentication(): Promise<string> {
  const storedKey = await getStoredApiKey();

  if (!storedKey) {
    console.log(chalk.yellow('\n  No API key found. Starting login...\n'));
    await performLogin({ browser: true });
    const newKey = await getStoredApiKey();
    if (!newKey) {
      console.log(chalk.red('\n  Authentication failed.'));
      process.exit(1);
    }
    return newKey;
  }

  return storedKey;
}

async function scanSkill(skillPath: string, options: { json?: boolean }): Promise<void> {
  const apiKey = await checkAuthentication();
  const scanner = new CaterpillarScanner({ apiKey });

  // Handle GitHub-style skill references (user/repo)
  let actualPath = skillPath;
  const skillName = skillPath.split('/').pop() || skillPath;

  if (skillPath.includes('/') && !existsSync(skillPath)) {
    // Check in common skill locations
    const possiblePaths = [
      join(homedir(), '.claude', 'skills', skillPath, 'SKILL.md'),
      join(process.cwd(), '.claude', 'skills', skillPath, 'SKILL.md'),
      join(process.cwd(), skillPath, 'SKILL.md'),
      join(process.cwd(), skillPath)
    ];

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        actualPath = p;
        break;
      }
    }
  }

  if (!existsSync(actualPath)) {
    console.log(chalk.red(`Skill not found: ${skillPath}`));
    process.exit(1);
  }

  const { spinner, interval } = createAnimatedSpinner(skillName);

  try {
    const result = await scanner.scan(actualPath);
    clearInterval(interval);
    spinner.stop();

    if (options.json) {
      printJsonResult(result);
    } else {
      printResult(result);
    }

    // Exit with error code if dangerous
    if (result.grade === 'F') {
      process.exit(1);
    }

  } catch (error) {
    clearInterval(interval);
    spinner.fail(chalk.red('Scan failed'));
    console.error(error);
    process.exit(1);
  }
}

async function scanAllInstalled(options: { json?: boolean }, customPath?: string): Promise<void> {
  const apiKey = await checkAuthentication();
  const scanner = new CaterpillarScanner({ apiKey });
  const results: ScanResult[] = [];

  // Determine skill locations - use custom path if provided, otherwise defaults
  let skillLocations: string[];

  if (customPath) {
    // Resolve to absolute path
    const resolvedPath = customPath.startsWith('/')
      ? customPath
      : join(process.cwd(), customPath);

    if (!existsSync(resolvedPath)) {
      console.log(chalk.red(`Path not found: ${customPath}`));
      process.exit(1);
    }

    skillLocations = [resolvedPath];
  } else {
    skillLocations = [
      join(homedir(), '.claude', 'skills'),
      join(process.cwd(), '.claude', 'skills')
    ];
  }

  console.log(banner);

  const spinner = ora({
    text: customPath
      ? `Scanning skills in ${customPath}...`
      : 'Searching for installed skills...',
    color: 'cyan'
  }).start();

  const skillPaths: string[] = [];

  for (const location of skillLocations) {
    if (existsSync(location)) {
      // Use glob to recursively find all SKILL.md files
      const found = globSync('**/SKILL.md', {
        cwd: location,
        absolute: true,
        nodir: true,
      });
      skillPaths.push(...found);
    }
  }

  if (skillPaths.length === 0) {
    spinner.info(customPath
      ? `No skills found in ${customPath}`
      : 'No installed skills found');
    return;
  }

  spinner.succeed(`Found ${skillPaths.length} skill(s)`);
  console.log();

  for (let i = 0; i < skillPaths.length; i++) {
    const path = skillPaths[i];
    const skillName = path.split('/').slice(-2, -1)[0] || `skill-${i + 1}`;
    const { spinner: skillSpinner, interval } = createAnimatedSpinner(skillName);

    try {
      const result = await scanner.scan(path);
      results.push(result);
      clearInterval(interval);

      const gradeColor = result.grade === 'A' || result.grade === 'B' ? chalk.green :
                         result.grade === 'C' ? chalk.yellow : chalk.red;
      skillSpinner.stopAndPersist({
        symbol: result.grade === 'F' ? chalk.red('☠') : result.grade === 'A' || result.grade === 'B' ? chalk.green('✓') : chalk.yellow('⚠'),
        text: `${skillName} ${gradeColor(`[${result.grade}]`)} ${chalk.gray(`(${result.score}/100)`)}`
      });
    } catch (error) {
      clearInterval(interval);
      skillSpinner.fail(`${skillName} - scan failed`);
    }
  }

  console.log();

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Print summary
  console.log();
  console.log(chalk.bold('═'.repeat(60)));
  console.log(chalk.bold('  🐛 Caterpillar Environment Scan'));
  console.log(chalk.bold('═'.repeat(60)));
  console.log();
  console.log(chalk.gray(`  Scanned ${results.length} skill(s)`));
  console.log();

  // Group by grade
  const byGrade: Record<string, ScanResult[]> = { A: [], B: [], C: [], D: [], F: [] };
  for (const result of results) {
    byGrade[result.grade].push(result);
  }

  // Summary table
  console.log(chalk.bold('  Summary:'));
  console.log(chalk.gray('  ' + '─'.repeat(40)));

  if (byGrade.F.length > 0) {
    console.log(chalk.bgRed.white.bold(`  ☠ CRITICAL: ${byGrade.F.length} dangerous skill(s) `));
    for (const r of byGrade.F) {
      console.log(chalk.red(`    - ${r.skill}`));
    }
  }

  if (byGrade.D.length > 0) {
    console.log(chalk.red(`  ✗ WARNING: ${byGrade.D.length} risky skill(s)`));
  }

  if (byGrade.C.length > 0) {
    console.log(chalk.yellow(`  ⚠ CAUTION: ${byGrade.C.length} skill(s) need review`));
  }

  if (byGrade.A.length + byGrade.B.length > 0) {
    console.log(chalk.green(`  ✓ SAFE: ${byGrade.A.length + byGrade.B.length} skill(s)`));
  }

  console.log();

  // Detailed results for problematic skills
  if (byGrade.F.length > 0 || byGrade.D.length > 0) {
    console.log(chalk.bold('  Detailed Findings:'));
    for (const result of [...byGrade.F, ...byGrade.D]) {
      printResult(result);
    }
  }

  console.log(chalk.bold('═'.repeat(60)));
  console.log();

  if (byGrade.F.length > 0) {
    process.exit(1);
  }
}

async function runDemo(): Promise<void> {
  const apiKey = await checkAuthentication();
  console.log(banner);
  console.log(chalk.cyan('\n  Running demo with example skills...\n'));

  const scanner = new CaterpillarScanner({ apiKey });

  // Look for skills in multiple locations
  const possibleSkillsPaths = [
    join(process.cwd(), '..', 'skills', 'all'),
    join(process.cwd(), 'skills', 'all'),
    join(process.cwd(), '..', '..', 'looking_glass', 'skills', 'all'),
  ];

  let demoSkillsPath = '';
  for (const p of possibleSkillsPaths) {
    if (existsSync(p)) {
      demoSkillsPath = p;
      break;
    }
  }

  if (!demoSkillsPath) {
    console.log(chalk.yellow('  No demo skills found. Create some in ./skills/all/'));
    return;
  }

  const skillDirs = readdirSync(demoSkillsPath).filter(
    d => existsSync(join(demoSkillsPath, d, 'SKILL.md'))
  );

  if (skillDirs.length === 0) {
    console.log(chalk.yellow('  No skills found in demo directory'));
    return;
  }

  const results: ScanResult[] = [];

  for (const skill of skillDirs.slice(0, 5)) { // Limit to 5 for demo
    const skillFile = join(demoSkillsPath, skill, 'SKILL.md');
    const { spinner, interval } = createAnimatedSpinner(skill);

    try {
      const result = await scanner.scan(skillFile, skill);
      results.push(result);
      clearInterval(interval);

      const gradeColor = result.grade === 'A' || result.grade === 'B' ? chalk.green :
                         result.grade === 'C' ? chalk.yellow : chalk.red;
      spinner.stopAndPersist({
        symbol: result.grade === 'F' ? chalk.red('☠') : result.grade === 'A' || result.grade === 'B' ? chalk.green('✓') : chalk.yellow('⚠'),
        text: `${skill} ${gradeColor(`[${result.grade}]`)} ${chalk.gray(`(${result.score}/100)`)} - ${result.findings.length} issues`
      });
    } catch (error) {
      clearInterval(interval);
      spinner.fail(`Failed to analyze ${skill}`);
    }
  }

  console.log();
  console.log(chalk.gray(`  Analyzed ${results.length} skill(s)`));
  console.log();
}

// ============================================
// Authentication Helper Functions
// ============================================

interface Credentials {
  api_key: string;
  created_at: string;
}

async function getStoredApiKey(): Promise<string | null> {
  try {
    const content = await readFile(CREDENTIALS_FILE, 'utf-8');
    const parsed: Credentials = JSON.parse(content);
    return parsed.api_key || null;
  } catch {
    return null;
  }
}

async function storeCredentials(apiKey: string): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });

  const credentials: Credentials = {
    api_key: apiKey,
    created_at: new Date().toISOString(),
  };

  await writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    mode: 0o600, // Read/write only for owner
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CliAuthSession {
  session_id: string;
  device_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

interface PollResponse {
  status: 'pending' | 'complete' | 'expired' | 'error' | 'consumed';
  api_key?: string;
  user?: { email: string; plan: string };
  error?: string;
  expires_in?: number;
}

async function pollForCompletion(
  sessionId: string,
  deviceCode: string,
  interval: number,
  expiresIn: number,
  spinner: ReturnType<typeof ora>
): Promise<{ apiKey: string; email: string; plan: string }> {
  const startTime = Date.now();
  const timeoutMs = expiresIn * 1000;

  while (Date.now() - startTime < timeoutMs) {
    await sleep(interval * 1000);

    const remaining = Math.ceil((timeoutMs - (Date.now() - startTime)) / 1000);
    spinner.text = `Waiting for browser authentication... (${remaining}s remaining)`;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/cli-auth?session_id=${sessionId}&device_code=${deviceCode}`
      );

      const data = (await response.json()) as PollResponse;

      if (data.status === 'complete' && data.api_key) {
        return {
          apiKey: data.api_key,
          email: data.user?.email || 'Unknown',
          plan: data.user?.plan || 'free',
        };
      }

      if (data.status === 'expired' || data.status === 'error') {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Authentication failed') {
        // Network error, continue polling
        continue;
      }
      throw error;
    }
  }

  throw new Error('Authentication timed out');
}

// CLI Setup
const program = new Command();

program
  .name('caterpillar')
  .description('🐛 Who are you? Security scanner for AI agent skills')
  .version(VERSION);

program
  .command('ask <skill>')
  .description('Interrogate a specific skill before installation')
  .option('-j, --json', 'Output results as JSON')
  .action(async (skill: string, options: { json?: boolean }) => {
    if (!options.json) {
      console.log(banner);
    }
    await scanSkill(skill, options);
  });

program
  .command('scan [path]')
  .description('Scan skills - all installed or in a specific directory')
  .option('-j, --json', 'Output results as JSON')
  .action(async (path: string | undefined, options: { json?: boolean }) => {
    await scanAllInstalled(options, path);
  });

program
  .command('demo')
  .description('Run demo with example skills')
  .action(async () => {
    await runDemo();
  });

// ============================================
// Authentication Commands
// ============================================

async function performLogin(options: { browser: boolean }): Promise<void> {
  // Check if already logged in
  const existingKey = await getStoredApiKey();
  if (existingKey) {
    console.log(chalk.yellow('  You are already logged in.'));
    console.log(chalk.gray('  Run `caterpillar logout` first to re-authenticate.'));
    console.log();
    return;
  }

  const spinner = ora('Initiating login...').start();

  try {
    // 1. Request login session
    const response = await fetch(`${API_BASE_URL}/api/cli-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cli_version: VERSION,
        os_type: platform(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      spinner.fail('Failed to initiate login');
      console.error(chalk.red(errorData.error || 'Unknown error'));
      throw new Error('Login initiation failed');
    }

    const data = (await response.json()) as CliAuthSession;

    spinner.stop();

    // 2. Display verification URL
    console.log();
    console.log(chalk.bold('  Open this URL to authenticate:'));
    console.log(chalk.cyan(`  ${data.verification_url}`));
    console.log();

    // 3. Open browser
    if (options.browser) {
      try {
        await open(data.verification_url);
      } catch {
        console.log(chalk.gray('  (Could not open browser automatically)'));
      }
    }

    // 4. Poll for completion
    const pollSpinner = ora('Waiting for browser authentication...').start();

    const result = await pollForCompletion(
      data.session_id,
      data.device_code,
      data.interval,
      data.expires_in,
      pollSpinner
    );

    // 5. Store credentials
    await storeCredentials(result.apiKey);

    pollSpinner.succeed(chalk.green('Successfully authenticated!'));
    console.log();
    console.log(chalk.gray(`  Logged in as: ${chalk.white(result.email)}`));
    console.log(chalk.gray(`  Plan: ${chalk.white(result.plan)}`));
    console.log(chalk.gray(`  API key stored in: ${chalk.white(CREDENTIALS_FILE)}`));
    console.log();
  } catch (error) {
    spinner.fail('Login failed');
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    throw error;
  }
}

program
  .command('login')
  .description('Authenticate with Caterpillar API via browser')
  .option('--no-browser', 'Display URL instead of opening browser')
  .action(async (options: { browser: boolean }) => {
    console.log(banner);
    try {
      await performLogin(options);
    } catch {
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Remove stored credentials')
  .action(async () => {
    try {
      await access(CREDENTIALS_FILE);
      await unlink(CREDENTIALS_FILE);
      console.log(chalk.green('  Successfully logged out'));
    } catch {
      console.log(chalk.yellow('  Not currently logged in'));
    }
  });

program
  .command('whoami')
  .description('Display current authenticated user')
  .action(async () => {
    const apiKey = await getStoredApiKey();

    if (!apiKey) {
      console.log(chalk.yellow('  Not logged in.'));
      console.log(chalk.gray('  Run `caterpillar login` to authenticate.'));
      process.exit(1);
    }

    const spinner = ora('Fetching account info...').start();

    try {
      const response = await fetch(`${API_BASE_URL}/api/whoami`, {
        headers: { 'x-api-key': apiKey },
      });

      if (!response.ok) {
        spinner.fail('Invalid or expired credentials');
        console.log(chalk.gray('  Run `caterpillar login` to re-authenticate'));
        process.exit(1);
      }

      const data = (await response.json()) as {
        email: string;
        name: string | null;
        plan: string;
        usage: { used: number; limit: number; remaining: number };
      };

      spinner.stop();
      console.log();
      console.log(chalk.bold('  Account Information'));
      console.log(chalk.gray('  ' + '─'.repeat(40)));
      console.log(chalk.gray('  Email:     ') + chalk.white(data.email));
      if (data.name) {
        console.log(chalk.gray('  Name:      ') + chalk.white(data.name));
      }
      console.log(chalk.gray('  Plan:      ') + chalk.white(data.plan));
      console.log(
        chalk.gray('  Usage:     ') +
          chalk.white(`${data.usage.used}/${data.usage.limit} scans this month`)
      );
      console.log(chalk.gray('  Remaining: ') + chalk.white(`${data.usage.remaining} scans`));
      console.log();
    } catch (error) {
      spinner.fail('Failed to fetch account info');
      process.exit(1);
    }
  });

program.parse();
