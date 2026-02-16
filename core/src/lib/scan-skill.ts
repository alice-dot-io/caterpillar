import { ArtifactMeta } from './collector';
import { postScan, ArtifactRecord, ScanResponse } from './api-client';
import { getApiKey, getVirusTotalApiKey, getOpenAIApiKey } from './config';
import { checkVirusTotalBatch, VTResult } from './virustotal';
import { runPatternScan } from './pattern-scanner';
import { runLocalLLMJudge } from './llm-judge';
import { printInfo, printWarning } from './display';
import { Spinner, SCAN_MESSAGES, VT_MESSAGES } from './ui';

/** Extensions that are plain text / source code — never sent to VirusTotal */
const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.sh', '.bash', '.zsh', '.fish',
  '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.cs',
  '.yaml', '.yml', '.json', '.toml', '.xml', '.html', '.htm', '.css',
  '.sql', '.r', '.lua', '.pl', '.pm', '.php', '.swift', '.kt',
  '.env', '.cfg', '.ini', '.conf', '.csv', '.svg',
  '.cursorrules', '.dockerfile', '.gitignore', '.dockerignore',
]);

function getExt(path: string): string {
  return (path.toLowerCase().match(/(\.[^./\\]+)$/)?.[1]) || '';
}

/** Extension-based check for archive files */
function isArchiveFile(path: string): boolean {
  return /\.(zip|tar|tgz|tar\.gz|rar|7z)$/i.test(path);
}

/** Any file that isn't a known text/source file is checkable via VirusTotal */
function isCheckableArtifact(a: ArtifactMeta): boolean {
  const ext = getExt(a.path);
  if (!ext) return false;
  if (TEXT_EXTENSIONS.has(ext)) return false;
  return true;
}

function findCheckableArtifacts(artifacts: ArtifactMeta[]): ArtifactMeta[] {
  return artifacts.filter(isCheckableArtifact);
}

function artifactKind(path: string): string {
  if (isArchiveFile(path)) return 'archive';
  const ext = getExt(path);
  if (/^\.(pdf|doc|docx|xls|xlsx|ppt|pptx|rtf|odt|ods|odp)$/.test(ext)) return 'document';
  if (/^\.(png|jpg|jpeg|gif|webp|bmp|tiff|ico)$/.test(ext)) return 'image';
  return 'binary';
}

function buildVtArtifactRecords(
  artifacts: ArtifactMeta[],
  vtResults: Map<string, VTResult>,
): { binaryArtifacts: ArtifactRecord[]; archiveArtifacts: ArtifactRecord[] } {
  const binaryArtifacts: ArtifactRecord[] = [];
  const archiveArtifacts: ArtifactRecord[] = [];

  for (const a of artifacts) {
    if (!isCheckableArtifact(a)) continue;

    const vt = vtResults.get(a.sha256) || null;
    const kind = artifactKind(a.path);
    const record: ArtifactRecord = {
      file: a.path,
      rel: a.path,
      size: a.size,
      kind,
      mime: a.mime,
      sha256: a.sha256,
      virustotal: vt ? {
        malicious: vt.malicious,
        suspicious: vt.suspicious,
        harmless: vt.harmless,
        reputation: vt.reputation,
        detectionCount: vt.detectionCount,
        totalEngines: vt.totalEngines,
        lastAnalysisDate: vt.lastAnalysisDate,
        error: vt.error,
      } : null,
    };

    if (kind === 'archive') archiveArtifacts.push(record);
    else binaryArtifacts.push(record);
  }

  return { binaryArtifacts, archiveArtifacts };
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function randomMsg(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export type ScanMode = 'alice' | 'openai' | 'offline';

export function detectScanMode(): ScanMode {
  if (getApiKey()) return 'alice';
  if (getOpenAIApiKey()) return 'openai';
  return 'offline';
}

export interface SkillScanInput {
  skillContent: string;
  skillName: string;
  artifacts: ArtifactMeta[];
}

/**
 * Run client-side VirusTotal checks if a VT key is configured.
 * Returns VT results map and artifact records.
 */
async function runVirusTotalChecks(
  artifacts: ArtifactMeta[],
  options: { json?: boolean },
): Promise<{ vtResults: Map<string, VTResult>; binaryArtifacts: ArtifactRecord[]; archiveArtifacts: ArtifactRecord[] }> {
  const vtApiKey = getVirusTotalApiKey();
  const checkable = findCheckableArtifacts(artifacts);
  let vtResults = new Map<string, VTResult>();

  if (vtApiKey && checkable.length > 0) {
    const spinner = !options.json ? new Spinner(randomMsg(VT_MESSAGES)) : null;
    try {
      spinner?.start();
      vtResults = await checkVirusTotalBatch(
        vtApiKey,
        checkable.map(a => a.sha256),
        15000,
        (current, total) => {
          spinner?.update(`Checking VirusTotal (${current}/${total})...`);
        },
      );
      spinner?.stop(`Checked ${checkable.length} file(s) against VirusTotal`);
    } catch (err) {
      spinner?.stop();
      throw err;
    }
  }

  const { binaryArtifacts, archiveArtifacts } = vtResults.size > 0
    ? buildVtArtifactRecords(artifacts, vtResults)
    : { binaryArtifacts: [] as ArtifactRecord[], archiveArtifacts: [] as ArtifactRecord[] };

  return { vtResults, binaryArtifacts, archiveArtifacts };
}

/**
 * Mode 1: Server API scan (authenticated users).
 */
async function scanViaServer(
  skill: SkillScanInput,
  options: { json?: boolean },
): Promise<ScanResponse> {
  const { vtResults, binaryArtifacts, archiveArtifacts } = await runVirusTotalChecks(skill.artifacts, options);

  const spinner = !options.json ? new Spinner(randomMsg(SCAN_MESSAGES)) : null;
  let response: ScanResponse;
  try {
    spinner?.start();
    response = await postScan({
      content: skill.skillContent,
      name: skill.skillName,
      artifacts: skill.artifacts,
    });
    spinner?.stop('Analysis complete');
  } catch (err) {
    spinner?.stop();
    throw err;
  }

  // Merge client-side VT results into server response
  if (vtResults.size > 0 && response.success && response.data) {
    if (binaryArtifacts.length > 0) response.data.binaryArtifacts = binaryArtifacts;
    if (archiveArtifacts.length > 0) response.data.archiveArtifacts = archiveArtifacts;
  }

  return response;
}

/**
 * Mode 2: Local AI scan (user supplies their own OpenAI key).
 * Runs both LLM judge and pattern scanner, merges results.
 */
async function scanViaLocalAI(
  skill: SkillScanInput,
  options: { json?: boolean },
): Promise<ScanResponse> {
  const openaiKey = getOpenAIApiKey()!;
  const startTime = Date.now();

  const spinner = !options.json ? new Spinner(randomMsg(SCAN_MESSAGES)) : null;

  // Run LLM judge and pattern scan in parallel
  let llmResult: Awaited<ReturnType<typeof runLocalLLMJudge>> | null;
  let patternResult: ReturnType<typeof runPatternScan>;

  try {
    spinner?.start();
    const results = await Promise.all([
      runLocalLLMJudge(openaiKey, skill.skillContent, skill.skillName).catch(err => {
        if (!options.json) {
          spinner?.stop();
          printWarning(`AI analysis failed: ${err instanceof Error ? err.message : err}`);
          printInfo('Falling back to pattern-based detection...');
          spinner?.start();
        }
        return null;
      }),
      Promise.resolve(runPatternScan(skill.skillContent, skill.skillName)),
    ]);
    llmResult = results[0];
    patternResult = results[1];
    spinner?.stop('Analysis complete');
  } catch (err) {
    spinner?.stop();
    throw err;
  }

  // Run VT checks
  const { binaryArtifacts, archiveArtifacts } = await runVirusTotalChecks(skill.artifacts, options);

  const scanDuration = Date.now() - startTime;

  // If LLM succeeded, merge its findings with pattern findings (deduplicated)
  if (llmResult) {
    const mergedFindings = [...llmResult.findings];
    const llmTitles = new Set(llmResult.findings.map(f => f.title.toLowerCase()));

    // Add pattern findings that the LLM didn't catch
    for (const pf of patternResult.findings) {
      if (!llmTitles.has(pf.title.toLowerCase())) {
        mergedFindings.push(pf);
      }
    }

    const score = llmResult.score;
    const grade = scoreToGrade(score);

    return {
      success: true,
      data: {
        skill: skill.skillName,
        grade,
        score,
        findings: mergedFindings,
        summary: llmResult.summary,
        explanation: llmResult.explanation,
        risk_impact: llmResult.risk_impact,
        scanDuration,
        ...(binaryArtifacts.length > 0 ? { binaryArtifacts } : {}),
        ...(archiveArtifacts.length > 0 ? { archiveArtifacts } : {}),
      },
    };
  }

  // LLM failed — fall back to pattern-only results
  return buildPatternOnlyResponse(skill, patternResult, scanDuration, binaryArtifacts, archiveArtifacts);
}

/**
 * Mode 3: Offline pattern scan (no API key, no OpenAI key).
 * Uses regex-based pattern matching only.
 */
async function scanViaPatterns(
  skill: SkillScanInput,
  options: { json?: boolean },
): Promise<ScanResponse> {
  const startTime = Date.now();

  const spinner = !options.json ? new Spinner(randomMsg(SCAN_MESSAGES)) : null;
  let patternResult: ReturnType<typeof runPatternScan>;
  try {
    spinner?.start();
    patternResult = runPatternScan(skill.skillContent, skill.skillName);
    spinner?.stop('Pattern analysis complete');
  } catch (err) {
    spinner?.stop();
    throw err;
  }

  // Still run VT checks if key is available
  const { binaryArtifacts, archiveArtifacts } = await runVirusTotalChecks(skill.artifacts, options);

  const scanDuration = Date.now() - startTime;

  return buildPatternOnlyResponse(skill, patternResult, scanDuration, binaryArtifacts, archiveArtifacts);
}

function buildPatternOnlyResponse(
  skill: SkillScanInput,
  patternResult: ReturnType<typeof runPatternScan>,
  scanDuration: number,
  binaryArtifacts: ArtifactRecord[],
  archiveArtifacts: ArtifactRecord[],
): ScanResponse {
  const grade = scoreToGrade(patternResult.score);

  return {
    success: true,
    data: {
      skill: skill.skillName,
      grade,
      score: patternResult.score,
      findings: patternResult.findings,
      summary: patternResult.summary,
      explanation: patternResult.explanation || '',
      risk_impact: patternResult.risk_impact || '',
      scanDuration,
      ...(binaryArtifacts.length > 0 ? { binaryArtifacts } : {}),
      ...(archiveArtifacts.length > 0 ? { archiveArtifacts } : {}),
    },
  };
}

/**
 * Run a single skill scan using the appropriate mode:
 * 1. Server API (if authenticated with api_key)
 * 2. Local AI (if user has openai_api_key)
 * 3. Offline patterns (no keys needed)
 *
 * All modes support client-side VirusTotal if virustotal_api_key is set.
 */
export async function scanSingleSkill(
  skill: SkillScanInput,
  options: { json?: boolean; mode?: ScanMode },
): Promise<ScanResponse> {
  const mode = options.mode || detectScanMode();

  switch (mode) {
    case 'alice':
      return scanViaServer(skill, options);
    case 'openai':
      return scanViaLocalAI(skill, options);
    case 'offline':
      return scanViaPatterns(skill, options);
  }
}
