/**
 * Caterpillar Scanner - Unified Version
 *
 * Supports both filesystem mode (CLI) and serverless mode (API).
 * - In CLI mode: Pass a file path to scan files from disk
 * - In API mode: Pass content directly for serverless scanning
 * - Supports multi-file skills (SKILL.md + .py, .js, .ts files)
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { dirname, basename, join, relative } from 'path';
import { parse as parseYaml } from 'yaml';
import { SkillMetadata, ScanResult } from './types.js';

export interface ScannerOptions {
  apiUrl?: string;
  apiKey?: string;
}

export interface SkillFile {
  path: string;
  content: string;
}

export class CaterpillarScanner {
  private apiUrl: string;
  private apiKey: string | undefined;

  constructor(options?: ScannerOptions) {
    this.apiUrl = options?.apiUrl || process.env.CATERPILLAR_API_URL || 'https://caterpillar.alice.io';
    this.apiKey = options?.apiKey;
  }

  /**
   * Parse SKILL.md frontmatter and content
   */
  private parseSkillFile(content: string): { metadata: SkillMetadata | null; body: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return { metadata: null, body: content };
    }

    try {
      const metadata = parseYaml(frontmatterMatch[1]) as SkillMetadata;
      return { metadata, body: frontmatterMatch[2] };
    } catch {
      return { metadata: null, body: content };
    }
  }

  /**
   * Find all files associated with a skill
   * Looks for SKILL.md and related code files (.py, .js, .ts, etc.)
   */
  private findSkillFiles(skillPath: string): SkillFile[] {
    const stats = statSync(skillPath);
    const files: SkillFile[] = [];

    if (stats.isFile()) {
      // Single file - check if there are related files in the same directory
      const dir = dirname(skillPath);
      const mainFile = basename(skillPath);

      // Read the main file
      files.push({
        path: skillPath,
        content: readFileSync(skillPath, 'utf-8'),
      });

      // Look for related code files in the same directory
      try {
        const allFiles = readdirSync(dir);
        const codeExtensions = ['.py', '.js', '.ts', '.mjs', '.cjs', '.sh', '.bash'];

        for (const file of allFiles) {
          if (file === mainFile) continue; // Skip the main file we already added

          const ext = file.substring(file.lastIndexOf('.'));
          if (codeExtensions.includes(ext)) {
            const filePath = join(dir, file);
            files.push({
              path: filePath,
              content: readFileSync(filePath, 'utf-8'),
            });
          }
        }
      } catch (error) {
        // If we can't read the directory, just use the single file
      }
    } else if (stats.isDirectory()) {
      // Directory - find SKILL.md and all code files
      try {
        const allFiles = readdirSync(skillPath);

        for (const file of allFiles) {
          const filePath = join(skillPath, file);
          try {
            const fileStats = statSync(filePath);
            if (!fileStats.isFile()) continue;

            // Include SKILL.md, README.md, and code files
            if (
              file === 'SKILL.md' ||
              file === 'README.md' ||
              file.endsWith('.py') ||
              file.endsWith('.js') ||
              file.endsWith('.ts') ||
              file.endsWith('.mjs') ||
              file.endsWith('.cjs') ||
              file.endsWith('.sh') ||
              file.endsWith('.bash')
            ) {
              files.push({
                path: filePath,
                content: readFileSync(filePath, 'utf-8'),
              });
            }
          } catch (error) {
            // Skip files we can't read
          }
        }
      } catch (error) {
        throw new Error(`Failed to read directory: ${skillPath}`);
      }
    }

    return files;
  }

  /**
   * Scan a skill file or content using the server-side API
   *
   * @param skillPathOrContent - Either a file path (CLI mode) or content string (API mode)
   * @param skillName - Optional skill name override
   * @returns ScanResult with findings, score, and grade
   */
  async scan(skillPathOrContent: string, skillName?: string): Promise<ScanResult> {
    // Determine if input is a file path or content
    let content: string;
    let path: string;
    let files: SkillFile[] | undefined;

    // Check if it's a file path (filesystem mode) or direct content (serverless mode)
    const looksLikePath = skillPathOrContent.includes('/') || skillPathOrContent.includes('\\');
    const isFilePath = looksLikePath && existsSync(skillPathOrContent);

    if (isFilePath) {
      // Find all files associated with this skill
      const skillFiles = this.findSkillFiles(skillPathOrContent);
      path = skillPathOrContent;

      if (skillFiles.length === 1) {
        // Single file - use traditional content mode
        content = skillFiles[0].content;
      } else if (skillFiles.length > 1) {
        // Multiple files - use files array mode
        files = skillFiles.map(f => ({
          path: relative(process.cwd(), f.path),
          content: f.content,
        }));
        // Use the first file's content for metadata parsing
        content = skillFiles[0].content;
      } else {
        throw new Error(`No skill files found at: ${skillPathOrContent}`);
      }
    } else {
      content = skillPathOrContent;
      path = 'api'; // Indicate API/serverless mode
    }

    // Parse the skill file for metadata
    const { metadata } = this.parseSkillFile(content);
    const name = skillName || metadata?.name || 'unknown';

    // Prepare API request body
    const requestBody: Record<string, unknown> = files
      ? { files, name }
      : { content, name };

    // Call the server-side API for scanning
    const response = await fetch(`${this.apiUrl}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey || '',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const errorMsg = (error as { error?: { message?: string } })?.error?.message || response.statusText;
      throw new Error(`Scan failed: ${errorMsg}`);
    }

    const result = await response.json() as { success: boolean; data: ScanResult };

    if (!result.success) {
      throw new Error('Scan failed: unexpected response from server');
    }

    // Override path with local path info
    return {
      ...result.data,
      path,
    };
  }
}

// Factory function for creating scanner instances
export function createScanner(options?: ScannerOptions): CaterpillarScanner {
  return new CaterpillarScanner(options);
}
