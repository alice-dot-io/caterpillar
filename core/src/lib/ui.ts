import { CLI_VERSION } from './constants';

// ── ANSI codes (re-exported for shared use) ──────────────────────────
export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';
export const RED = '\x1b[31m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const BLUE = '\x1b[34m';
export const MAGENTA = '\x1b[35m';
export const CYAN = '\x1b[36m';
export const GRAY = '\x1b[90m';

// ── TTY guard ────────────────────────────────────────────────────────
export function isFancyTerminal(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.CI && !process.env.NO_COLOR;
}

// ── Color helpers ────────────────────────────────────────────────────
export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': case 'B': return GREEN;
    case 'C': case 'D': return YELLOW;
    case 'F': return RED;
    default: return RESET;
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return RED;
    case 'high': return RED;
    case 'medium': return YELLOW;
    case 'low': return CYAN;
    case 'info': return GRAY;
    default: return RESET;
  }
}

export function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '☠';
    case 'high': return '⚠';
    case 'medium': return '●';
    case 'low': return '○';
    case 'info': return 'ℹ';
    default: return '·';
  }
}

// ── Themed messages ──────────────────────────────────────────────────
export const SCAN_MESSAGES = [
  'Crawling through code...',
  'Munching on patterns...',
  'Inspecting the leaves...',
  'Weaving through files...',
  'Checking for predators...',
];

export const VT_MESSAGES = [
  'Querying the hive mind...',
  'Cross-referencing signatures...',
];

export const AUTH_MESSAGES = [
  'Spinning silk thread...',
  'Waiting for metamorphosis...',
  'Cocooning your credentials...',
];

// ── Banner ───────────────────────────────────────────────────────────
const BANNER_ART = `\
    _____      _                  _ _ _
   / ____|    | |                (_) | |
  | |     __ _| |_ ___ _ __ _ __  _| | | __ _ _ __
  | |    / _\` | __/ _ \\ '__| '_ \\| | | |/ _\` | '__|
  | |___| (_| | ||  __/ |  | |_) | | | | (_| | |
   \\_____\\__,_|\\__\\___|_|  | .__/|_|_|_|\\__,_|_|
    ○  ○  ○  ○  ○  ○      |_|`;

export function printBanner(): void {
  if (!isFancyTerminal()) return;

  console.log(`${GREEN}${BANNER_ART}${RESET}  ${DIM}v${CLI_VERSION}${RESET}`);
  console.log(`${CYAN}    Security scanner for AI agent skills${RESET}`);
  console.log();
}

export function getBannerText(): string {
  if (!isFancyTerminal()) return '';
  return (
    `${GREEN}${BANNER_ART}${RESET}  ${DIM}v${CLI_VERSION}${RESET}\n` +
    `${CYAN}    Security scanner for AI agent skills${RESET}\n`
  );
}

export function printVersion(): void {
  if (isFancyTerminal()) {
    const caterpillar = `${GREEN}○${YELLOW}○${GREEN}○${YELLOW}○${GREEN}○${RESET}`;
    console.log();
    console.log(`  ${caterpillar}  ${BOLD}Caterpillar${RESET} ${GREEN}v${CLI_VERSION}${RESET}`);
    console.log();
    console.log(`  ${DIM}Security scanner for AI agent skills${RESET}`);
    console.log(`  ${DIM}https://caterpillar.alice.io${RESET}`);
    console.log();
    console.log(`  ${GRAY}Node     ${RESET}${process.version}`);
    console.log(`  ${GRAY}Platform ${RESET}${process.platform} ${process.arch}`);
    console.log();
  } else {
    console.log(`caterpillar v${CLI_VERSION}`);
  }
}

// ── Box drawing ──────────────────────────────────────────────────────
export function boxTop(title: string, width = 36): string {
  const padding = width - title.length - 4;
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return `┌${'─'.repeat(left)} ${title} ${'─'.repeat(right)}┐`;
}

export function boxBottom(width = 36): string {
  return `└${'─'.repeat(width)}┘`;
}

export function boxLine(content: string, width = 36): string {
  const visible = stripAnsi(content);
  const pad = width - visible.length - 2;
  return `│ ${content}${' '.repeat(Math.max(0, pad))}│`;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ── Section headers ──────────────────────────────────────────────────
export function sectionHeader(title: string): void {
  if (isFancyTerminal()) {
    console.log(`\n${GREEN}○${GRAY}───${GREEN}○${GRAY}───${RESET}  ${BOLD}${title}${RESET}`);
  } else {
    console.log(`\n${title}`);
  }
}

// ── Grade display ────────────────────────────────────────────────────
export function printGradeCompact(grade: string, score: number, findingCount: number): void {
  const color = gradeColor(grade);
  const fancy = isFancyTerminal();

  if (fancy) {
    const barLen = 15;
    const filled = Math.round((score / 100) * barLen);
    const empty = barLen - filled;
    const bar = `${color}${'█'.repeat(filled)}${GRAY}${'░'.repeat(empty)}${RESET}`;
    const findings = findingCount > 0
      ? `${DIM}${findingCount} finding${findingCount === 1 ? '' : 's'}${RESET}`
      : `${GREEN}clean${RESET}`;
    console.log(`\n  ${color}${BOLD}${grade}${RESET} ${bar} ${score}/100  ${findings}`);
  } else {
    console.log(`\n  Grade: ${grade}  Score: ${score}/100  (${findingCount} findings)`);
  }
}

export function printGradeCard(grade: string, score: number): void {
  const color = gradeColor(grade);
  const width = 36;

  if (!isFancyTerminal()) {
    console.log();
    console.log(`  Grade: ${grade}  Score: ${score}/100`);
    console.log();
    return;
  }

  const barLen = 20;
  const filled = Math.round((score / 100) * barLen);
  const empty = barLen - filled;
  const bar = `${color}${'█'.repeat(filled)}${GRAY}${'░'.repeat(empty)}${RESET}`;

  const gradeLabel =
    score >= 90 ? 'Excellent' :
    score >= 75 ? 'Good' :
    score >= 60 ? 'Fair' :
    score >= 40 ? 'Poor' : 'Critical';

  console.log();
  console.log(`  ${GRAY}${boxTop('Security Grade', width)}${RESET}`);
  console.log(`  ${GRAY}${boxLine('', width)}${RESET}`);
  console.log(`  ${GRAY}│${RESET}    ${color}${BOLD}${grade}${RESET}   ${bar} ${score}   ${GRAY}│${RESET}`);
  console.log(`  ${GRAY}│${RESET}         ${DIM}${gradeLabel}${RESET}${' '.repeat(width - 11 - gradeLabel.length)}${GRAY}│${RESET}`);
  console.log(`  ${GRAY}${boxLine('', width)}${RESET}`);
  console.log(`  ${GRAY}${boxBottom(width)}${RESET}`);
}

// ── Finding cards ────────────────────────────────────────────────────
export interface Finding {
  severity: string;
  category: string;
  title: string;
  description: string;
  evidence?: string;
  recommendation?: string;
}

export function printFindingCompact(finding: Finding): void {
  const color = severityColor(finding.severity);
  const icon = isFancyTerminal() ? severityIcon(finding.severity) : '-';
  const sev = finding.severity.toUpperCase().padEnd(8);
  console.log(`    ${color}${icon} ${sev}${RESET} ${finding.title}`);
}

export function printFindingCard(finding: Finding): void {
  const color = severityColor(finding.severity);
  const icon = isFancyTerminal() ? severityIcon(finding.severity) : '';
  const label = finding.severity.toUpperCase().padEnd(8);

  console.log(`  ${color}${icon} ${label}${RESET} ${BOLD}${finding.title}${RESET}`);
  console.log(`${GRAY}             ${finding.category}${RESET}`);
  console.log(`             ${finding.description}`);
  if (finding.evidence) {
    console.log(`${DIM}             Evidence: ${finding.evidence}${RESET}`);
  }
  if (finding.recommendation) {
    console.log(`${BLUE}             ➜ Fix: ${finding.recommendation}${RESET}`);
  }
  console.log();
}

// ── Spinner ──────────────────────────────────────────────────────────
const CATERPILLAR_FRAMES = [
  '○ ○ ○ ○ ●',
  '○ ○ ○ ● ○',
  '○ ○ ● ○ ○',
  '○ ● ○ ○ ○',
  '● ○ ○ ○ ○',
  '○ ● ○ ○ ○',
  '○ ○ ● ○ ○',
  '○ ○ ○ ● ○',
];

export class Spinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private message: string;
  private fancy: boolean;

  constructor(message: string) {
    this.message = message;
    this.fancy = isFancyTerminal();
  }

  start(): void {
    if (!this.fancy) {
      console.log(this.message);
      return;
    }

    this.frameIndex = 0;
    this.render();
    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % CATERPILLAR_FRAMES.length;
      this.render();
    }, 120);

    // Cleanup on unexpected exit
    process.on('exit', this.cleanup);
  }

  update(message: string): void {
    this.message = message;
    if (!this.fancy) {
      console.log(message);
    }
  }

  stop(finalMessage?: string): void {
    this.cleanup();
    if (this.fancy) {
      process.stdout.write('\r\x1b[K');
      if (finalMessage) {
        console.log(`${GREEN}✔${RESET} ${finalMessage}`);
      }
    } else if (finalMessage) {
      console.log(finalMessage);
    }
  }

  private render = (): void => {
    const frame = `${GREEN}${CATERPILLAR_FRAMES[this.frameIndex]}${RESET}`;
    process.stdout.write(`\r\x1b[K${frame} ${this.message}`);
  };

  private cleanup = (): void => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.removeListener('exit', this.cleanup);
  };
}
