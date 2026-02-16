import { ScanResponse, ArtifactRecord } from './api-client';
import {
  RESET, BOLD, DIM, RED, GREEN, YELLOW, BLUE, CYAN, GRAY,
  isFancyTerminal, gradeColor, severityColor,
  printGradeCard, printGradeCompact,
  printFindingCard, printFindingCompact,
  sectionHeader,
} from './ui';

export { RESET, BOLD, DIM, RED, GREEN, YELLOW, BLUE, CYAN, GRAY, gradeColor, severityColor };

function prefix(): string {
  return isFancyTerminal() ? `${GREEN}○${RESET} ` : '';
}

function line(char = '─', len = 50): string {
  return GRAY + char.repeat(len) + RESET;
}

function printFindingsVerbose(findings: NonNullable<ScanResponse['data']>['findings']): void {
  if (!findings || findings.length === 0) {
    console.log(`\n${GREEN}${isFancyTerminal() ? '✔ ' : ''}No security issues found.${RESET}`);
    return;
  }

  sectionHeader(`Findings (${findings.length})`);
  console.log();

  for (const finding of findings) {
    printFindingCard(finding);
  }
}

function printFindingsCompact(findings: NonNullable<ScanResponse['data']>['findings']): void {
  if (!findings || findings.length === 0) return;

  console.log();
  for (const finding of findings) {
    printFindingCompact(finding);
  }
}

function printVirusTotalSection(binaryArtifacts?: ArtifactRecord[], archiveArtifacts?: ArtifactRecord[]): void {
  const binaries = binaryArtifacts || [];
  const archives = archiveArtifacts || [];
  const all = [...binaries, ...archives];
  if (all.length === 0) return;

  sectionHeader('VirusTotal Binary Scan');
  console.log(`${GRAY}  Checking ${all.length} file(s) against VirusTotal...${RESET}`);
  console.log();

  const fancy = isFancyTerminal();

  for (const art of all) {
    console.log(`${GRAY}  ${art.rel}${RESET}`);
    const vt = art.virustotal;
    const reportUrl = art.sha256 ? `https://www.virustotal.com/gui/file/${art.sha256}` : null;

    if (!vt) {
      console.log(`    ${GRAY}? Not checked (no VirusTotal data)${RESET}`);
    } else if (vt.error) {
      console.log(`    ${GRAY}? ${vt.error}${RESET}`);
    } else if (vt.malicious) {
      const icon = fancy ? '☠ ' : '! ';
      console.log(`    ${RED}${BOLD}${icon}MALICIOUS: ${vt.detectionCount}/${vt.totalEngines} engines flagged${RESET}`);
      if (reportUrl) console.log(`    ${BLUE}Report: ${reportUrl}${RESET}`);
    } else if (vt.suspicious) {
      const icon = fancy ? '⚠ ' : '! ';
      console.log(`    ${YELLOW}${icon}SUSPICIOUS: ${vt.detectionCount}/${vt.totalEngines} engines flagged${RESET}`);
      if (reportUrl) console.log(`    ${BLUE}Report: ${reportUrl}${RESET}`);
    } else if (vt.harmless || vt.detectionCount === 0) {
      const icon = fancy ? '✔ ' : '';
      console.log(`    ${GREEN}${icon}Clean: ${vt.totalEngines} engines scanned, no detections${RESET}`);
      if (reportUrl) console.log(`    ${BLUE}Report: ${reportUrl}${RESET}`);
    } else {
      console.log(`    ${GRAY}? Unknown: ${vt.totalEngines} engines scanned${RESET}`);
      if (reportUrl) console.log(`    ${BLUE}Report: ${reportUrl}${RESET}`);
    }
    console.log();
  }

  console.log(line());
}

function printVirusTotalCompact(binaryArtifacts?: ArtifactRecord[], archiveArtifacts?: ArtifactRecord[]): void {
  const all = [...(binaryArtifacts || []), ...(archiveArtifacts || [])];
  if (all.length === 0) return;

  const malicious = all.filter(a => a.virustotal?.malicious).length;
  const suspicious = all.filter(a => a.virustotal?.suspicious).length;
  const clean = all.filter(a => a.virustotal && !a.virustotal.malicious && !a.virustotal.suspicious && !a.virustotal.error).length;

  if (malicious > 0) {
    console.log(`  ${RED}VirusTotal: ${malicious} malicious${RESET}${suspicious > 0 ? `, ${suspicious} suspicious` : ''} ${DIM}(${all.length} checked)${RESET}`);
  } else if (suspicious > 0) {
    console.log(`  ${YELLOW}VirusTotal: ${suspicious} suspicious${RESET} ${DIM}(${all.length} checked)${RESET}`);
  } else if (clean > 0) {
    console.log(`  ${GREEN}${isFancyTerminal() ? '✔ ' : ''}VirusTotal: ${clean} clean${RESET} ${DIM}(${all.length} checked)${RESET}`);
  }
}

function printForensicsHint(forensics?: ScanResponse['forensics']): void {
  if (!forensics) return;

  if (forensics.included) {
    console.log(`${GREEN}${prefix()}Files analyzed: ${forensics.filesReceived}${RESET}`);
  } else {
    console.log(`${YELLOW}${prefix()}Note: ${forensics.reason || 'Only the skill document was analyzed.'}${RESET}`);
  }
}

export function printScanResult(response: ScanResponse, filesScanned: number, mode?: string, verbose?: boolean): void {
  if (!response.success || !response.data) {
    const msg = response.error?.message || 'Unknown error';
    const code = response.error?.code || 'ERROR';
    console.error(`\n${RED}${BOLD}Error${RESET} [${code}]: ${msg}`);
    return;
  }

  const { data, forensics } = response;

  if (verbose) {
    // ── Full verbose output ──
    sectionHeader(`Skill: ${data.skill}`);
    console.log(`${GRAY}  Files scanned: ${filesScanned}${RESET}`);
    if (mode) {
      console.log(`${GRAY}  Analysis mode: ${mode}${RESET}`);
    }

    printGradeCard(data.grade, data.score);

    if (data.explanation) {
      sectionHeader('What this skill does');
      console.log(`  ${data.explanation}`);
    }

    sectionHeader('Summary');
    console.log(`  ${data.summary}`);

    if (data.risk_impact) {
      sectionHeader('How this affects you');
      console.log(`  ${data.risk_impact}`);
    }

    printFindingsVerbose(data.findings);
    printVirusTotalSection(data.binaryArtifacts, data.archiveArtifacts);
    printForensicsHint(forensics);
    console.log();
  } else {
    // ── Compact default output ──
    const fancy = isFancyTerminal();
    console.log(`\n  ${BOLD}${data.skill}${RESET} ${DIM}${filesScanned} files${mode ? ` · ${mode}` : ''}${RESET}`);

    printGradeCompact(data.grade, data.score, data.findings.length);

    if (data.summary) {
      console.log(`  ${DIM}${data.summary}${RESET}`);
    }

    printFindingsCompact(data.findings);
    printVirusTotalCompact(data.binaryArtifacts, data.archiveArtifacts);

    if (data.findings.length > 0) {
      console.log(`\n  ${DIM}Run with ${RESET}--verbose${DIM} for full details${RESET}`);
    }
    console.log();
  }
}

export function printScanResultJson(response: ScanResponse): void {
  console.log(JSON.stringify(response, null, 2));
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function printScanResultCsv(response: ScanResponse, includeHeader = true): void {
  if (includeHeader) {
    console.log('skill,grade,score,severity,category,title,description,recommendation');
  }

  if (!response.success || !response.data) {
    const msg = response.error?.message || 'Unknown error';
    console.log(`${csvEscape(msg)},,,error,,,${csvEscape(msg)},`);
    return;
  }

  const { data } = response;

  if (data.findings.length === 0) {
    console.log(`${csvEscape(data.skill)},${data.grade},${data.score},,,,No findings,`);
    return;
  }

  for (const f of data.findings) {
    console.log([
      csvEscape(data.skill),
      data.grade,
      data.score,
      f.severity,
      csvEscape(f.category),
      csvEscape(f.title),
      csvEscape(f.description),
      csvEscape(f.recommendation || ''),
    ].join(','));
  }
}

export function printMultiScanResultCsv(
  results: Array<{ label: string; response: ScanResponse }>,
): void {
  console.log('skill,grade,score,severity,category,title,description,recommendation');
  for (const r of results) {
    printScanResultCsv(r.response, false);
  }
}

export function printError(message: string): void {
  console.error(`${RED}${BOLD}${prefix()}Error:${RESET} ${message}`);
}

export function printSuccess(message: string): void {
  const icon = isFancyTerminal() ? `${GREEN}✔${RESET} ` : '';
  console.log(`${icon}${GREEN}${message}${RESET}`);
}

export function printInfo(message: string): void {
  console.log(`${GRAY}${prefix()}${message}${RESET}`);
}

export function printWarning(message: string): void {
  const icon = isFancyTerminal() ? `${YELLOW}⚠${RESET} ` : '';
  console.log(`${icon}${YELLOW}${message}${RESET}`);
}
