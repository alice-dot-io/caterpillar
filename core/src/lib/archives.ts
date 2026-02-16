import { execSync } from 'child_process';
import { mkdtempSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface ExtractedArchive {
  archivePath: string;
  extractDir: string;
}

function extractZip(archivePath: string, dest: string): void {
  execSync(`unzip -q -o "${archivePath}" -d "${dest}"`, { stdio: 'ignore' });
}

function extractTar(archivePath: string, dest: string): void {
  execSync(`tar -xf "${archivePath}" -C "${dest}"`, { stdio: 'ignore' });
}

/**
 * Extract an archive to a temporary directory.
 * Returns the temp dir path, or null if extraction failed.
 */
export function extractArchive(archivePath: string): string | null {
  const lower = archivePath.toLowerCase();
  const tempDir = mkdtempSync(join(tmpdir(), 'caterpillar-'));

  try {
    if (lower.endsWith('.zip')) {
      extractZip(archivePath, tempDir);
    } else if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
      extractTar(archivePath, tempDir);
    } else {
      rmSync(tempDir, { recursive: true, force: true });
      return null;
    }
    return tempDir;
  } catch {
    rmSync(tempDir, { recursive: true, force: true });
    return null;
  }
}

/** Clean up extracted temp directories */
export function cleanupTempDirs(dirs: string[]): void {
  for (const dir of dirs) {
    try {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // best effort
    }
  }
}
