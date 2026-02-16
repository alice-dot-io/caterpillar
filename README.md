# Caterpillar

Security scanner for AI agent skills. Scans for malicious patterns before you install.

## Install

```bash
curl -fsSL caterpillar.alice.io/d/i.sh | sh
```

Or via npm:

```bash
npm install -g @alice-io/caterpillar
```

Windows (PowerShell):

```powershell
irm caterpillar.alice.io/d/i.ps1 | iex
```

Requires Node.js >= 18.

## Usage

```bash
# Authenticate (opens browser)
caterpillar login

# Scan a skill file before installing
caterpillar ask ./path/to/SKILL.md

# Scan all installed skills
caterpillar scan

# Scan a directory
caterpillar scan ./my-skills/
```

### Scan Modes

Caterpillar supports three scan modes:

```bash
# Alice API — most thorough, requires login
caterpillar ask ./skill/ --mode alice

# OpenAI — use your own OpenAI API key
caterpillar ask ./skill/ --mode openai

# Offline — fast pattern matching, no API needed
caterpillar ask ./skill/ --mode offline
```

- **Alice** — sends skills to the Caterpillar server API for full analysis.
- **OpenAI** — uses your own OpenAI API key for LLM analysis. All code is in this repo.
- **Offline** — built-in pattern matching, no network calls. All code is in this repo.

By default, the mode is auto-detected based on available credentials.

### Output Formats

```bash
# JSON output
caterpillar scan --json

# CSV output
caterpillar scan -o csv

# Verbose output with detailed findings
caterpillar ask ./skill/ --verbose
```

Each skill gets a grade (**A**–**F**) and a score (0–100). Grade **F** exits with code 1 for CI/CD integration.

### Configuration

```bash
# View current config
caterpillar config get

# Set a config value
caterpillar config set <key> <value>
```

## What it detects

- Credential theft (SSH keys, AWS credentials, API tokens)
- Data exfiltration (curl/wget to external servers)
- Persistence mechanisms (crontab, startup scripts)
- Crypto wallet theft
- Network attacks
- Code obfuscation (base64, hex encoding)
- Overly broad permissions
- Supply chain attacks (postinstall hooks, remote script execution)

## Library API

Use Caterpillar programmatically:

```typescript
import { runPatternScan, ALL_RULES, scanSingleSkill, collectSkill } from '@alice-io/caterpillar';

// Collect a skill from a path
const skill = await collectSkill('./my-skill/');

// Run offline pattern scan
const results = runPatternScan(skill.content);

// Full scan with mode selection
const response = await scanSingleSkill(skill, { mode: 'offline' });
```

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (no build step)
npm run dev -- scan ./example_skills/

# Build the CLI binary
npm run build

# Run the built CLI
node dist/cli.js scan ./example_skills/

# Run tests
npm test
```

## Links

[Website](https://caterpillar.alice.io) · [The Skills Report](https://caterpillar.alice.io/report) · Built by [Alice](https://alice.io)

## License

MIT
