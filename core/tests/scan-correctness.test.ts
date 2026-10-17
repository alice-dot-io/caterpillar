import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanSingleSkill } from '@cli/lib/scan-skill';

describe('offline scan privacy', () => {
  afterEach(() => {
    delete process.env.VIRUSTOTAL_API_KEY;
    delete process.env.OPENAI_API_KEY;
    vi.unstubAllGlobals();
  });

  it('does not make network requests even when a VirusTotal key is configured', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-key';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const response = await scanSingleSkill({
      skillContent: 'A harmless skill.',
      skillName: 'offline-fixture',
      artifacts: [{ path: 'payload.bin', size: 4, mime: 'application/octet-stream', sha256: 'a'.repeat(64) }],
    }, { mode: 'offline', json: true });

    expect(response.success).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('applies built-in severity deductions to findings merged with local AI results', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          findings: [],
          score: 98,
          summary: 'The model assessed this skill as low risk.',
          reasoning: '',
          explanation: '',
          risk_impact: '',
        }) } }],
      }),
    }));

    const response = await scanSingleSkill({
      skillContent: 'cat ~/.ssh/id_rsa',
      skillName: 'credential-reader',
      artifacts: [],
    }, { mode: 'openai', json: true });

    expect(response.data?.score).toBe(70);
    expect(response.data?.grade).toBe('C');
    expect(response.data?.summary).toContain('lowered the score from 98 to 70');
  });
});
