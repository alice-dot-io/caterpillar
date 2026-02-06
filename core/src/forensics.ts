/**
 * Forensics and Artifact Detection
 *
 * Detects binary files and archives in skill directories.
 * Adapted for server-side use - works with file metadata provided by clients.
 */

import crypto from 'crypto';
import { ArtifactRecord, Artifacts } from './types';

/**
 * Check if file extension indicates a binary file
 */
export function isBinaryExt(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return /\.(pyc|pyo|so|dll|exe|dylib|class|o|a|lib|bin|dat|wasm)$/i.test(lower);
}

/**
 * Check if file is an archive
 */
export function isArchiveFile(filePath: string): boolean {
  return /\.(zip|tar|tgz|tar\.gz)$/i.test(filePath);
}

/**
 * Determine if file is binary by extension or MIME type
 */
export function isBinaryByExtOrMime(filePath: string, mime: string | null): boolean {
  if (isBinaryExt(filePath)) return true;
  if (!mime) return false; // if MIME missing, don't guess

  const m = mime.toLowerCase();
  if (m.startsWith('text/')) return false;

  // Common structured text types that should not be treated as binaries
  const textMimeTypes = [
    'application/json',
    'application/xml',
    'application/xhtml+xml',
    'application/javascript',
    'application/x-javascript',
    'application/typescript',
    'application/x-typescript',
    'application/x-yaml',
    'application/yaml',
    'application/toml',
    'application/sql',
    'application/x-sh',
    'application/x-shellscript',
    'application/x-python',
  ];

  if (textMimeTypes.includes(m)) return false;

  return true;
}

/**
 * Calculate SHA256 hash of file content
 * For server-side: accepts file content as Buffer or string
 */
export async function sha256Content(content: Buffer | string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');

      if (Buffer.isBuffer(content)) {
        hash.update(content);
      } else {
        hash.update(content, 'utf-8');
      }

      resolve(hash.digest('hex'));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Detect artifacts from file metadata provided by client
 *
 * This function processes artifact metadata that the client has already detected.
 * The client should have run file system operations and provided:
 * - File paths (relative to skill root)
 * - File sizes
 * - MIME types (optional)
 * - SHA256 hashes (optional, can be calculated from content if provided)
 *
 * @param files - Array of file metadata from client
 * @returns Artifact detection results
 */
export function detectArtifactsFromMetadata(
  files: Array<{
    path: string; // Relative path from skill root
    size: number;
    mime?: string | null;
    sha256?: string | null;
    content?: string | Buffer; // Optional: if provided, will calculate hash
  }>
): Artifacts {
  const inventory: ArtifactRecord[] = [];
  const binaries: ArtifactRecord[] = [];
  const archives: ArtifactRecord[] = [];

  let totalBytes = 0;

  for (const file of files) {
    const rel = file.path;
    const size = file.size || 0;
    totalBytes += size;

    // Archives are NOT treated as binaries, but we do report them
    if (isArchiveFile(rel)) {
      const mime = file.mime || 'unknown/unknown';
      const sha256 = file.sha256 || null;

      const rec: ArtifactRecord = {
        file: rel,
        rel,
        size,
        kind: 'archive',
        mime,
        sha256,
      };

      archives.push(rec);
      inventory.push(rec);
      continue;
    }

    const mime = file.mime || null;
    const isBin = isBinaryByExtOrMime(rel, mime);

    if (isBin) {
      const sha256 = file.sha256 || null;

      const rec: ArtifactRecord = {
        file: rel,
        rel,
        size,
        kind: 'binary',
        mime: mime || 'unknown/unknown',
        sha256,
      };

      binaries.push(rec);
      inventory.push(rec);
      continue;
    }

    // Text file
    inventory.push({
      file: rel,
      rel,
      size,
      kind: 'text',
      mime,
      sha256: null,
    });
  }

  return {
    inventory,
    binaries,
    archives,
    totals: {
      files: inventory.length,
      bytes: totalBytes,
    },
  };
}

/**
 * Calculate SHA256 hashes for files that have content but no hash
 * This is useful when the client sends file contents but hasn't calculated hashes
 */
export async function enrichArtifactsWithHashes(
  artifacts: Artifacts,
  fileContents: Map<string, Buffer | string>
): Promise<Artifacts> {
  const enrichedBinaries = await Promise.all(
    artifacts.binaries.map(async (binary) => {
      if (binary.sha256) return binary;

      const content = fileContents.get(binary.rel);
      if (!content) return binary;

      try {
        const hash = await sha256Content(content);
        return { ...binary, sha256: hash };
      } catch {
        return { ...binary, sha256: 'ERROR_HASHING' };
      }
    })
  );

  const enrichedArchives = await Promise.all(
    artifacts.archives.map(async (archive) => {
      if (archive.sha256) return archive;

      const content = fileContents.get(archive.rel);
      if (!content) return archive;

      try {
        const hash = await sha256Content(content);
        return { ...archive, sha256: hash };
      } catch {
        return { ...archive, sha256: 'ERROR_HASHING' };
      }
    })
  );

  return {
    ...artifacts,
    binaries: enrichedBinaries,
    archives: enrichedArchives,
    inventory: artifacts.inventory.map((item) => {
      if (item.kind === 'binary') {
        return enrichedBinaries.find((b) => b.rel === item.rel) || item;
      }
      if (item.kind === 'archive') {
        return enrichedArchives.find((a) => a.rel === item.rel) || item;
      }
      return item;
    }),
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  try {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  } catch {
    return `${bytes}`;
  }
}
