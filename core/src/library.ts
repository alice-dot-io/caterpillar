// Library API — for programmatic use of Caterpillar scanner
export { runPatternScan } from './lib/pattern-scanner';
export { ALL_RULES, type PatternRule } from './lib/rules';
export type { ScanMode } from './lib/scan-skill';
export { detectScanMode, scanSingleSkill } from './lib/scan-skill';
export { collectSkill, type CollectedSkill } from './lib/collector';
export type { ScanResponse, ArtifactRecord } from './lib/api-client';
