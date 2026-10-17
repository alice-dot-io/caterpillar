import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative, basename } from 'path';
import { createHash } from 'crypto';
import { getMimeType } from './mime';

export interface ArtifactMeta {
  path: string;
  size: number;
  mime: string | null;
  sha256: string;
}

export interface CollectedSkill {
  skillDir: string;
  skillContent: string;
  skillName: string;
  artifacts: ArtifactMeta[];
  contentCoverage: {
    includedTextFiles: string[];
    omittedTextFiles: Array<{ path: string; reason: string }>;
  };
}

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  '.tox',
  '.mypy_cache',
  '.pytest_cache',
]);

/** Max content size sent to the API (100KB) */
const MAX_CONTENT_BYTES = 100_000;

/** Max size of an individual file to include in content (50KB) */
const MAX_FILE_BYTES = 50_000;

/** Extensions that are readable text and should be included in the scan content */
const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.sh', '.bash', '.zsh', '.fish',
  '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.cs',
  '.yaml', '.yml', '.json', '.toml', '.xml', '.html', '.htm', '.css',
  '.sql', '.r', '.lua', '.pl', '.pm', '.php', '.swift', '.kt',
  '.env', '.cfg', '.ini', '.conf',
  '.cursorrules', '.dockerfile',
]);

/** Filenames (no extension) that should be included */
const TEXT_FILENAMES = new Set([
  '.cursorrules', '.env', '.gitignore', '.dockerignore',
  'Dockerfile', 'Makefile', 'Rakefile', 'Gemfile',
  'Procfile', 'Vagrantfile',
]);

function isTextFile(name: string, mime: string | null): boolean {
  if (TEXT_FILENAMES.has(name)) return true;
  const ext = name.toLowerCase().match(/(\.[^./\\]+)$/)?.[1];
  if (ext && TEXT_EXTENSIONS.has(ext)) return true;
  if (mime && (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/yaml')) return true;
  return false;
}

function computeSha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function walkDir(dir: string, rootDir: string, artifacts: ArtifactMeta[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walkDir(fullPath, rootDir, artifacts);
      continue;
    }

    if (!entry.isFile()) continue;

    try {
      const stat = statSync(fullPath);
      const relPath = relative(rootDir, fullPath);

      artifacts.push({
        path: relPath,
        size: stat.size,
        mime: getMimeType(fullPath),
        sha256: computeSha256(fullPath),
      });
    } catch {
      // Skip files we can't read
    }
  }
}

function parseSkillName(content: string): string | null {
  const match = content.match(/^---\n[\s\S]*?name:\s*(.+)\n[\s\S]*?---/);
  if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  return null;
}

/** Try to find the best "main" file in a directory for the skill name */
function findMainFile(dir: string): string | null {
  const priority = ['SKILL.md', 'skill.md', '.cursorrules', 'README.md', 'readme.md'];

  for (const name of priority) {
    try {
      const p = join(dir, name);
      statSync(p);
      return p;
    } catch {
      // Not found, try next
    }
  }

  // Fall back to first markdown, then any text file
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const md = entries.find(e => e.isFile() && e.name.endsWith('.md'));
    if (md) return join(dir, md.name);

    const textExts = ['.txt', '.yaml', '.yml', '.json', '.toml', '.py', '.js', '.ts', '.sh'];
    const txt = entries.find(e => e.isFile() && textExts.some(ext => e.name.endsWith(ext)));
    if (txt) return join(dir, txt.name);
  } catch {
    // ignore
  }

  return null;
}

/**
 * Read all text files in the directory and concatenate them into a single
 * content string for the LLM judge to analyze. Each file is delimited with
 * a header showing the relative path so the judge can reference specific files.
 */
function buildFullContent(skillDir: string, artifacts: ArtifactMeta[], mainFile: string | null): {
  content: string;
  includedTextFiles: string[];
  omittedTextFiles: Array<{ path: string; reason: string }>;
} {
  const sections: string[] = [];
  const includedTextFiles: string[] = [];
  const omittedTextFiles: Array<{ path: string; reason: string }> = [];
  let totalBytes = 0;

  const mainRelativePath = mainFile ? relative(skillDir, mainFile) : null;
  const orderedArtifacts = [...artifacts].sort((a, b) => {
    if (a.path === mainRelativePath) return -1;
    if (b.path === mainRelativePath) return 1;
    return a.path.localeCompare(b.path);
  });

  for (const artifact of orderedArtifacts) {
    if (!isTextFile(artifact.path, artifact.mime)) continue;
    if (artifact.size > MAX_FILE_BYTES) {
      omittedTextFiles.push({ path: artifact.path, reason: `exceeds the ${MAX_FILE_BYTES}-byte per-file limit` });
      continue;
    }

    const fullPath = join(skillDir, artifact.path);
    try {
      const content = readFileSync(fullPath, 'utf-8');

      // Check if adding this file would exceed the limit
      const section = `--- FILE: ${artifact.path} ---\n${content}`;
      const sectionSize = Buffer.byteLength(section, 'utf-8') + Buffer.byteLength('\n\n', 'utf-8');
      if (totalBytes + sectionSize > MAX_CONTENT_BYTES) {
        omittedTextFiles.push({ path: artifact.path, reason: `would exceed the ${MAX_CONTENT_BYTES}-byte total content limit` });
        continue;
      }

      sections.push(section);
      includedTextFiles.push(artifact.path);
      totalBytes += sectionSize;
    } catch {
      omittedTextFiles.push({ path: artifact.path, reason: 'could not be read' });
    }
  }

  return { content: sections.join('\n\n'), includedTextFiles, omittedTextFiles };
}

export function collectSkill(inputPath: string): CollectedSkill {
  const stat = statSync(inputPath);
  let skillDir: string;
  let mainFile: string | null = null;

  if (stat.isFile()) {
    skillDir = join(inputPath, '..');
    mainFile = inputPath;
  } else if (stat.isDirectory()) {
    skillDir = inputPath;
    mainFile = findMainFile(skillDir);
  } else {
    throw new Error(`Path is not a file or directory: ${inputPath}`);
  }

  // Collect all file artifacts first
  const artifacts: ArtifactMeta[] = [];
  walkDir(skillDir, skillDir, artifacts);

  if (artifacts.length === 0 && !mainFile) {
    throw new Error(
      `No scannable files found in ${skillDir}. Provide a path to a file or directory with text content.`
    );
  }

  // Build content from ALL text files in the directory
  const collectedContent = buildFullContent(skillDir, artifacts, mainFile);

  // Fall back to just the main file if no text files were collected
  let skillContent: string;
  if (collectedContent.content.length > 0) {
    skillContent = collectedContent.content;
  } else if (mainFile) {
    skillContent = readFileSync(mainFile, 'utf-8');
    const mainRelativePath = relative(skillDir, mainFile);
    if (!collectedContent.includedTextFiles.includes(mainRelativePath)) {
      collectedContent.includedTextFiles.push(mainRelativePath);
      collectedContent.omittedTextFiles = collectedContent.omittedTextFiles.filter(file => file.path !== mainRelativePath);
    }
  } else {
    throw new Error(
      `No readable text files found in ${skillDir}.`
    );
  }

  // Derive skill name from main file frontmatter, filename, or directory
  const skillName =
    (mainFile ? parseSkillName(readFileSync(mainFile, 'utf-8')) : null) ||
    (mainFile ? basename(mainFile).replace(/\.[^.]+$/, '') : null) ||
    basename(skillDir);

  return {
    skillDir,
    skillContent,
    skillName,
    artifacts,
    contentCoverage: {
      includedTextFiles: collectedContent.includedTextFiles,
      omittedTextFiles: collectedContent.omittedTextFiles,
    },
  };
}
