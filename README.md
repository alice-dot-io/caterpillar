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

# JSON output
caterpillar scan --json
```

Each skill gets a grade (**A**–**F**) and a score (0–100). Grade **F** exits with code 1 for CI/CD integration.

## What it detects

Credential theft, data exfiltration, persistence mechanisms, crypto wallet theft, network attacks, obfuscation, overly broad permissions and much more

## Development

```bash
# Install dependencies
npm install

# Run locally (dev mode)
npm run dev

# Build
npm run build

# Run the built CLI
node dist/cli.js scan ./my-skills/

# Run tests
npm test
```

## Links

[Website](https://caterpillar.alice.io) · [The Skills Report](https://caterpillar.alice.io/report) · Built by [Alice](https://alice.io)

## License

MIT
