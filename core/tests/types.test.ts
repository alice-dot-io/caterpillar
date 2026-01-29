/**
 * Caterpillar Types Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type {
  SkillMetadata,
  SecurityFinding,
  ScanResult,
} from '../src/types.js';

describe('Type Definitions', () => {
  describe('SkillMetadata', () => {
    it('should accept valid metadata object', () => {
      const metadata: SkillMetadata = {
        name: 'test-skill',
        description: 'A test skill',
        allowedTools: ['Read', 'Write'],
        disableModelInvocation: false,
        userInvocable: true,
        context: 'testing',
        agent: 'test-agent',
        hooks: { onLoad: {} },
      };

      expect(metadata.name).toBe('test-skill');
      expect(metadata.allowedTools).toHaveLength(2);
    });

    it('should accept minimal metadata with only name', () => {
      const metadata: SkillMetadata = {
        name: 'minimal-skill',
      };

      expect(metadata.name).toBe('minimal-skill');
      expect(metadata.description).toBeUndefined();
    });
  });

  describe('SecurityFinding', () => {
    it('should accept valid finding object', () => {
      const finding: SecurityFinding = {
        severity: 'critical',
        category: 'Credential Theft',
        title: 'api-key-grep',
        description: 'Searches for API keys',
        line: 42,
        evidence: 'grep ANTHROPIC_API_KEY',
        recommendation: 'Do not search for API keys',
      };

      expect(finding.severity).toBe('critical');
      expect(finding.line).toBe(42);
    });

    it('should accept finding without optional fields', () => {
      const finding: SecurityFinding = {
        severity: 'info',
        category: 'General',
        title: 'informational',
        description: 'Just information',
      };

      expect(finding.line).toBeUndefined();
      expect(finding.evidence).toBeUndefined();
    });

    it('should enforce valid severity levels', () => {
      const validSeverities: SecurityFinding['severity'][] = [
        'critical',
        'high',
        'medium',
        'low',
        'info',
      ];

      for (const severity of validSeverities) {
        const finding: SecurityFinding = {
          severity,
          category: 'Test',
          title: 'test',
          description: 'test',
        };
        expect(finding.severity).toBe(severity);
      }
    });
  });

  describe('ScanResult', () => {
    it('should accept valid scan result', () => {
      const result: ScanResult = {
        skill: 'test-skill',
        path: '/path/to/skill.md',
        metadata: { name: 'test-skill' },
        findings: [],
        score: 100,
        grade: 'A',
        summary: 'SAFE: No issues found',
        scanDuration: 50,
      };

      expect(result.grade).toBe('A');
      expect(result.findings).toHaveLength(0);
    });

    it('should accept null metadata', () => {
      const result: ScanResult = {
        skill: 'unknown',
        path: 'inline',
        metadata: null,
        findings: [],
        score: 100,
        grade: 'A',
        summary: 'SAFE',
        scanDuration: 10,
      };

      expect(result.metadata).toBeNull();
    });

    it('should enforce valid grades', () => {
      const validGrades: ScanResult['grade'][] = ['A', 'B', 'C', 'D', 'F'];

      for (const grade of validGrades) {
        const result: ScanResult = {
          skill: 'test',
          path: 'test',
          metadata: null,
          findings: [],
          score: 50,
          grade,
          summary: 'test',
          scanDuration: 0,
        };
        expect(result.grade).toBe(grade);
      }
    });

    it('should contain findings array', () => {
      const result: ScanResult = {
        skill: 'dangerous',
        path: '/path/to/dangerous.md',
        metadata: null,
        findings: [
          {
            severity: 'critical',
            category: 'Credential Theft',
            title: 'api-key-grep',
            description: 'Found API key search',
          },
          {
            severity: 'high',
            category: 'Persistence',
            title: 'bashrc-modification',
            description: 'Modifies shell profile',
          },
        ],
        score: 35,
        grade: 'F',
        summary: 'DANGEROUS',
        scanDuration: 100,
      };

      expect(result.findings).toHaveLength(2);
      expect(result.findings[0].severity).toBe('critical');
    });
  });
});
