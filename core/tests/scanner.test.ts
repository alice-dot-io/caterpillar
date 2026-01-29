import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaterpillarScanner, createScanner } from '../src/scanner.js';

describe('CaterpillarScanner', () => {
  describe('constructor', () => {
    it('should use default API URL when no options provided', () => {
      const scanner = new CaterpillarScanner();
      // We can't directly access private fields, but we can verify it doesn't throw
      expect(scanner).toBeInstanceOf(CaterpillarScanner);
    });

    it('should accept custom API URL', () => {
      const scanner = new CaterpillarScanner({ apiUrl: 'https://custom.api.com' });
      expect(scanner).toBeInstanceOf(CaterpillarScanner);
    });

    it('should accept API key', () => {
      const scanner = new CaterpillarScanner({ apiKey: 'test-key-123' });
      expect(scanner).toBeInstanceOf(CaterpillarScanner);
    });
  });

  describe('createScanner', () => {
    it('should return a CaterpillarScanner instance', () => {
      const scanner = createScanner();
      expect(scanner).toBeInstanceOf(CaterpillarScanner);
    });

    it('should pass options to constructor', () => {
      const scanner = createScanner({ apiUrl: 'https://test.com', apiKey: 'key' });
      expect(scanner).toBeInstanceOf(CaterpillarScanner);
    });
  });

  describe('scan', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should call the API with correct headers and body', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            skill: 'test-skill',
            path: 'api',
            metadata: { name: 'test-skill' },
            findings: [],
            score: 95,
            grade: 'A',
            summary: 'Safe skill',
            scanDuration: 100,
          },
        }),
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const scanner = new CaterpillarScanner({
        apiUrl: 'https://test.api.com',
        apiKey: 'test-key',
      });

      const content = '---\nname: test-skill\n---\nSome skill content';
      const result = await scanner.scan(content);

      expect(fetchSpy).toHaveBeenCalledWith('https://test.api.com/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify({ content, name: 'test-skill' }),
      });

      expect(result.skill).toBe('test-skill');
      expect(result.score).toBe(95);
      expect(result.grade).toBe('A');
    });

    it('should parse frontmatter metadata from content', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            skill: 'my-skill',
            path: 'api',
            metadata: { name: 'my-skill' },
            findings: [],
            score: 80,
            grade: 'B',
            summary: 'OK',
            scanDuration: 50,
          },
        }),
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const scanner = new CaterpillarScanner({ apiUrl: 'https://test.com' });
      const content = '---\nname: my-skill\ndescription: A skill\n---\nBody here';
      await scanner.scan(content);

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(callBody.name).toBe('my-skill');
    });

    it('should use skillName override when provided', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            skill: 'override-name',
            path: 'api',
            metadata: null,
            findings: [],
            score: 100,
            grade: 'A',
            summary: 'Safe',
            scanDuration: 10,
          },
        }),
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const scanner = new CaterpillarScanner({ apiUrl: 'https://test.com' });
      await scanner.scan('some content', 'override-name');

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(callBody.name).toBe('override-name');
    });

    it('should use "unknown" when no name available', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            skill: 'unknown',
            path: 'api',
            metadata: null,
            findings: [],
            score: 100,
            grade: 'A',
            summary: 'Safe',
            scanDuration: 10,
          },
        }),
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const scanner = new CaterpillarScanner({ apiUrl: 'https://test.com' });
      await scanner.scan('content without frontmatter');

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(callBody.name).toBe('unknown');
    });

    it('should throw on non-ok response', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: { message: 'Invalid API key' },
        }),
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const scanner = new CaterpillarScanner({ apiUrl: 'https://test.com' });
      await expect(scanner.scan('content')).rejects.toThrow('Scan failed: Invalid API key');
    });

    it('should throw on unsuccessful response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: false }),
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const scanner = new CaterpillarScanner({ apiUrl: 'https://test.com' });
      await expect(scanner.scan('content')).rejects.toThrow('unexpected response from server');
    });

    it('should read from file when path exists', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            skill: 'safe-formatter',
            path: 'api',
            metadata: { name: 'safe-formatter' },
            findings: [],
            score: 90,
            grade: 'A',
            summary: 'Safe',
            scanDuration: 50,
          },
        }),
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

      const scanner = new CaterpillarScanner({ apiUrl: 'https://test.com' });
      // Use a real file path from the example_skills
      const skillPath = new URL('../../example_skills/safe-formatter/SKILL.md', import.meta.url).pathname;
      const result = await scanner.scan(skillPath);

      // Path should be the file path, not 'api'
      expect(result.path).toBe(skillPath);
    });
  });
});
