import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectSkill } from '@cli/lib/collector';

describe('text collection coverage', () => {
  let fixtureDir: string | undefined;
  afterEach(() => {
    if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
    fixtureDir = undefined;
  });

  it('reports text files skipped by the individual-file limit', () => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'caterpillar-coverage-'));
    writeFileSync(join(fixtureDir, 'SKILL.md'), `---\nname: fixture\n---\n${'x'.repeat(50_010)}`);
    writeFileSync(join(fixtureDir, 'helper.txt'), 'small helper');

    const skill = collectSkill(fixtureDir);

    expect(skill.contentCoverage.includedTextFiles).toContain('helper.txt');
    expect(skill.contentCoverage.omittedTextFiles).toContainEqual({
      path: 'SKILL.md',
      reason: 'exceeds the 50000-byte per-file limit',
    });
    expect(skill.skillContent).not.toContain('x'.repeat(100));
  });

  it('reports files omitted by the aggregate byte limit', () => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'caterpillar-coverage-'));
    writeFileSync(join(fixtureDir, 'SKILL.md'), '---\nname: fixture\n---\nstart');
    writeFileSync(join(fixtureDir, 'a.txt'), 'é'.repeat(24_000));
    writeFileSync(join(fixtureDir, 'b.txt'), 'é'.repeat(24_000));
    writeFileSync(join(fixtureDir, 'c.txt'), 'é'.repeat(24_000));

    const skill = collectSkill(fixtureDir);

    expect(skill.contentCoverage.omittedTextFiles.length).toBeGreaterThan(0);
    expect(skill.contentCoverage.omittedTextFiles[0].reason).toContain('total content limit');
  });
});
