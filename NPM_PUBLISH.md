# Publishing to NPM

## Prerequisites

1. NPM account with access to `@alice-io` organization
2. Logged in to npm: `npm login`
3. All tests passing
4. Version bumped in package.json

## Pre-publish Checklist

- [x] Version: 1.0.11
- [x] Tests passing (43/43)
- [x] Build working
- [x] package.json configured correctly
- [x] README.md up to date
- [x] Multi-file scanning implemented
- [x] Forensics/artifact detection included
- [x] VirusTotal integration included

## Publish Steps

### 1. Verify build

```bash
npm run build
```

### 2. Test installation locally

```bash
npm pack
npm install -g alice-io-caterpillar-1.0.11.tgz
caterpillar --version
```

### 3. Publish to NPM

```bash
npm publish
```

### 4. Verify published package

```bash
npm view @alice-io/caterpillar
```

### 5. Test installation from NPM

```bash
npm install -g @alice-io/caterpillar
caterpillar --version
```

## Post-publish

1. Update install script URL to point to npm-based installer
2. Deploy new install script to caterpillar.alice.io/d/i.sh
3. Test install: `curl -fsSL caterpillar.alice.io/d/i.sh | sh`

## Binary Builds (Future)

To build and distribute native binaries:

1. Install Bun: https://bun.sh
2. Run: `./scripts/build-binaries.sh`
3. Upload binaries to caterpillar.alice.io/d/
4. Use the original install script (downloads binaries)

## Rollback

If issues are found:

```bash
npm unpublish @alice-io/caterpillar@1.0.11
```

Note: You have 72 hours to unpublish without contacting npm support.
