/**
 * Caterpillar Scanner - Unified Version
 *
 * Supports both filesystem mode (CLI) and serverless mode (API).
 * - In CLI mode: Pass a file path to scan files from disk
 * - In API mode: Pass content directly for serverless scanning
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { SkillMetadata, ScanResult } from './types.js';

export interface ScannerOptions {
  apiUrl?: string;
  apiKey?: string;
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

    // Check if it's a file path (filesystem mode) or direct content (serverless mode)
    // We check existsSync only if it looks like a path (contains / or \)
    const looksLikePath = skillPathOrContent.includes('/') || skillPathOrContent.includes('\\');
    const isFilePath = looksLikePath && existsSync(skillPathOrContent);

    if (isFilePath) {
      content = readFileSync(skillPathOrContent, 'utf-8');
      path = skillPathOrContent;
    } else {
      content = skillPathOrContent;
      path = 'api'; // Indicate API/serverless mode
    }

    // Parse the skill file for metadata
    const { metadata } = this.parseSkillFile(content);
    const name = skillName || metadata?.name || 'unknown';

    // Call the server-side API for scanning
    const response = await fetch(`${this.apiUrl}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey || '',
      },
      body: JSON.stringify({
        content,
        name,
      }),
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
