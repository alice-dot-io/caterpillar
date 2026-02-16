# Contributing to Caterpillar

## Repository Structure

This repository (`alice-dot-io/caterpillar`) contains the **CLI client** and npm package `@alice-io/caterpillar`.

The server API, website, and dashboard live in a separate repository: [ActiveFence/caterpillar](https://github.com/ActiveFence/caterpillar).

## Getting Started

```bash
git clone https://github.com/alice-dot-io/caterpillar.git
cd caterpillar
npm install
```

## Development Workflow

```bash
# Build the CLI
npm run build

# Run in dev mode (no build step)
npm run dev -- scan ./example_skills/

# Run tests
npm test

# Test with example skills
node dist/cli.js ask ./example_skills/safe-formatter/           # Should get grade A
node dist/cli.js ask ./example_skills/data-stealer/             # Should get grade F
node dist/cli.js ask ./example_skills/data-stealer/ --verbose   # Grade F with evidence
```

## Full-Stack Development

If you need to work on CLI-to-server communication (alice mode, login flow):

1. Clone the server repo: `git clone https://github.com/ActiveFence/caterpillar.git caterpillar-server`
2. Start the server: `cd caterpillar-server && npm install --legacy-peer-deps && npm run dev`
3. Point the CLI at the local server: `CATERPILLAR_API_URL=http://localhost:3000 node dist/cli.js ask ./example_skills/safe-formatter/ --mode alice`

## Project Structure

```
core/
  src/
    index.ts              # CLI entry point (Commander.js)
    library.ts            # Public API exports for programmatic use
    commands/             # login, logout, scan, ask, config
    lib/
      scan-skill.ts       # Three-mode scan orchestration
      pattern-scanner.ts  # Offline regex engine
      llm-judge.ts        # Local OpenAI LLM judge
      api-client.ts       # Server API client
      collector.ts        # Walk directories, collect file artifacts
      virustotal.ts       # VirusTotal hash lookups
      archives.ts         # .zip/.tar/.tgz extraction
      display.ts          # Terminal output formatting
      config.ts           # ~/.caterpillar/credentials read/write
      ui.ts               # Banner, spinners, grade cards, colors
      rules/              # Detection rules by threat category
  tests/                  # CLI tests (pattern scanner, rules, MIME)
example_skills/           # Test skills for manual and automated testing
```

## Running Tests

```bash
npm test
```

| Test File | Tests | Covers |
|-----------|-------|--------|
| `cli-pattern-scanner.test.ts` | 19 | Pattern scanner engine |
| `cli-rules.test.ts` | 20 | Rule definitions across 8 categories |
| `cli-mime.test.ts` | 28 | MIME type detection |

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm test` to ensure all tests pass
5. Submit a pull request
