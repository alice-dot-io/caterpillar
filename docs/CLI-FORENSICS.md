# CLI integration: full forensic analysis

The API supports **forensic analysis** (binary/archive detection and VirusTotal checks) when the client sends an `artifacts` array in the scan request. The current `@alice-io/caterpillar` CLI does not send artifacts, so the API never runs the forensic pipeline and the full analysis does not appear when you run `caterpillar ask` or `caterpillar scan`.

## What the API expects

**POST /api/scan** body:

- `content` (string) – SKILL.md content
- `name` (string, optional) – skill name
- **`artifacts`** (array, optional) – file metadata for the skill directory. Each item:
  - `path` (string) – relative path from skill root
  - `size` (number) – file size in bytes
  - `mime` (string | null, optional)
  - `sha256` (string | null, optional)
  - `content` (string, optional) – base64 or plain string for hash calculation if `sha256` not provided

When `artifacts` is present and non-empty, the API:

1. Detects binaries and archives from the metadata
2. Enriches with SHA256 hashes (from content if provided)
3. Queries VirusTotal for binaries/archives (if `VIRUSTOTAL_API_KEY` is set)
4. Injects artifact findings into the scan result and returns `binaryArtifacts` and `archiveArtifacts` on the result

## Response hint when forensics are skipped

When no artifacts are sent, the API includes a top-level `forensics` hint so the CLI (and users) know only the skill document was analyzed:

```json
{
  "success": true,
  "data": { ... },
  "forensics": {
    "included": false,
    "filesAnalyzed": 1,
    "reason": "Only the skill document (SKILL.md content) was analyzed. No other files in the skill directory were sent. Send an artifacts array (path, size, mime, optional sha256/content) for every file in the skill directory to scan binaries, archives, and get VirusTotal analysis."
  }
}
```

When artifacts are sent:

```json
"forensics": { "included": true, "filesReceived": 7 }
```

**Why "Scanned 1 skill" with no file list is wrong:** Without `artifacts`, the API only receives the single SKILL.md content. Other files in the skill directory (e.g. binaries, archives, or other assets) are never sent, so they are never scanned. The user may have 3 files in the skill but only 1 is analyzed; a malicious file in the directory will be missed. The CLI must send all files as `artifacts` and show **which files were scanned** (e.g. "Files scanned: 3" and optionally list paths) so the result is correct and transparent.

## Changes needed in the CLI

To show the full forensic analysis and correct "files scanned" behavior:

1. **Send `artifacts` when scanning a file path**
   When the user runs `caterpillar ask <path>`, the CLI should:
   - Resolve the skill directory (directory containing `SKILL.md`).
   - List **all files** in that directory (recursively, so every file in the skill is included).
   - For each file, collect: `path` (relative to skill root), `size`, and optionally `mime` and `sha256` (or `content` for the API to hash).
   - Send in the request body: `{ content, name, artifacts }`.
   - This ensures all 3 (or N) files in the skill are analyzed, not just the SKILL.md content.

2. **Show which files were scanned**
   In the terminal output, always show:
   - **Files scanned: N** (and when forensics are included, this should match the number of files in the skill directory).
   - Optionally list the paths (e.g. under "Files in this skill:" or in the VirusTotal section).
   - When `response.forensics.included === false`, show a warning: e.g. "Only the skill document was analyzed. Other files in this skill were not scanned. (Send artifacts to scan all files.)"

3. **Display the forensic section**
   In `printResult()`, after Findings, if `result.binaryArtifacts` or `result.archiveArtifacts` exist, print the **VirusTotal Binary Scan** section (see below). Optionally list all artifacts (path, size, mime, sha256, VirusTotal result).

The API already returns:

- `data.findings` – includes injected artifact findings (e.g. "Binary file detected", "Archive found", VirusTotal status)
- `data.binaryArtifacts` – full list of binaries with `virustotal` when available
- `data.archiveArtifacts` – full list of archives with `virustotal` when available

So the CLI only needs to send `artifacts` to get artifact findings in the report; adding a dedicated Forensic section that prints `binaryArtifacts` and `archiveArtifacts` is optional for a richer display.

---

## Expected terminal output: VirusTotal Binary Scan

The CLI should print a **VirusTotal Binary Scan** section when the API returns `binaryArtifacts` (and optionally `archiveArtifacts`). Target format:

```
⠶ VirusTotal Binary Scan
Checking 7 binary file(s) against VirusTotal...

Checking .DS_Store...
? Not found in VirusTotal database
  (or: ? Unknown: 62 engines scanned, no detections)

Checking eicar-standard-antivirus-test-files/eicar-word-macro-powershell-echo.doc...
▲ MALICIOUS: 46/63 engines flagged
Report: https://www.virustotal.com/gui/file/<sha256>

Checking eicar-standard-antivirus-test-files/eicar-powerpoint-action-powershell-echo.ppt...
▲ MALICIOUS: 31/63 engines flagged
Report: https://www.virustotal.com/gui/file/<sha256>

...

VirusTotal Scan Results
```

- **Header:** `⠶ VirusTotal Binary Scan` then `Checking N binary file(s) against VirusTotal...`
- **Per file:** `Checking <relative path>...` then one line for status, and if scanned a `Report:` line with the VirusTotal GUI URL.
- **Status lines:**
  - `? Not found in VirusTotal database` when `virustotal.error === 'Not found in VirusTotal database'` (or similar).
  - `? Unknown: X engines scanned, no detections` when VT ran but not malicious/suspicious/harmless (e.g. no detections).
  - `▲ MALICIOUS: X/Y engines flagged` when `virustotal.malicious === true` (use yellow/warning style for ▲).
  - `▲ SUSPICIOUS: X/Y engines flagged` when `virustotal.suspicious === true`.
  - `✓ Clean: X engines scanned` when `virustotal.harmless === true` or safe outcome.
- **Report URL:** `https://www.virustotal.com/gui/file/${artifact.sha256}` when `sha256` is present.
- **Footer:** a horizontal line, then `VirusTotal Scan Results`, then another line.
