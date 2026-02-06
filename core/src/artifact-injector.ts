/**
 * Artifact Findings Injector
 *
 * Converts detected artifacts (binaries and archives) into security findings
 * that can be included in scan results.
 */

import { Artifacts, ScanResult, SecurityFinding } from './types';

/**
 * Inject artifact findings into a scan result
 *
 * Converts detected binaries and archives into security findings with
 * appropriate severity levels and recommendations.
 *
 * @param result - The scan result to inject findings into
 * @param artifacts - The detected artifacts
 * @returns Updated scan result with artifact findings added
 */
export function injectArtifactFindings(
  result: ScanResult,
  artifacts: Artifacts | null | undefined
): ScanResult {
  const binaries = artifacts?.binaries || [];
  const archives = artifacts?.archives || [];
  const added: SecurityFinding[] = [];

  // Add findings for binary artifacts
  for (const binary of binaries) {
    const vt = binary.virustotal;
    let severity: SecurityFinding['severity'] = 'high';
    let title = 'Binary file detected';
    let description =
      'Binary artifacts in a skill directory can indicate bundled executables, compiled extensions, or hidden payloads. Review carefully.';
    let evidence = `${binary.rel} | ${binary.mime} | sha256=${binary.sha256 || 'N/A'}`;
    let recommendation = 'Verify provenance; scan sha256 on VirusTotal before use.';

    // Enhance with VirusTotal results if available
    if (vt) {
      if (vt.malicious) {
        severity = 'critical';
        title = '⚠️ MALWARE DETECTED - Binary file flagged by VirusTotal';
        description = `This binary file has been flagged as MALICIOUS by ${vt.detectionCount} of ${vt.totalEngines} antivirus engines on VirusTotal. DO NOT EXECUTE this file.`;
        evidence = `${binary.rel} | ${binary.mime} | sha256=${binary.sha256 || 'N/A'} | VirusTotal: ${vt.detectionCount}/${vt.totalEngines} engines flagged as malicious`;
        recommendation = `🚨 CRITICAL: This file is known malware. Do not execute. Remove immediately and investigate the source. VirusTotal report: https://www.virustotal.com/gui/file/${binary.sha256}`;
      } else if (vt.suspicious) {
        severity = 'high';
        title = '⚠️ Suspicious binary file detected';
        description = `This binary file has been flagged as SUSPICIOUS by ${vt.detectionCount} of ${vt.totalEngines} antivirus engines on VirusTotal. Exercise extreme caution.`;
        evidence = `${binary.rel} | ${binary.mime} | sha256=${binary.sha256 || 'N/A'} | VirusTotal: ${vt.detectionCount}/${vt.totalEngines} engines flagged as suspicious`;
        recommendation = `⚠️ WARNING: This file is suspicious. Do not execute without thorough review. VirusTotal report: https://www.virustotal.com/gui/file/${binary.sha256}`;
      } else if (vt.harmless) {
        severity = 'medium';
        title = 'Binary file detected (verified safe)';
        description = `This binary file has been scanned by VirusTotal and appears to be safe (${vt.reputation >= 0 ? 'positive reputation' : 'no detections'}).`;
        evidence = `${binary.rel} | ${binary.mime} | sha256=${binary.sha256 || 'N/A'} | VirusTotal: Clean (${vt.totalEngines} engines, ${vt.detectionCount} detections)`;
        recommendation = 'File appears safe according to VirusTotal, but still verify provenance.';
      } else if (vt.error) {
        // VirusTotal check failed, but still report the binary
        evidence = `${binary.rel} | ${binary.mime} | sha256=${binary.sha256 || 'N/A'} | VirusTotal: ${vt.error}`;
        recommendation = 'VirusTotal check failed. Manually verify this file before use.';
      } else {
        // No detections but also not explicitly harmless (new/unknown file)
        evidence = `${binary.rel} | ${binary.mime} | sha256=${binary.sha256 || 'N/A'} | VirusTotal: No detections (${vt.totalEngines} engines scanned)`;
        recommendation = `File not found in VirusTotal or no detections. Verify provenance before use. Check: https://www.virustotal.com/gui/file/${binary.sha256}`;
      }
    }

    added.push({
      severity,
      category: 'Binary Artifacts',
      title,
      description,
      evidence,
      recommendation,
    });
  }

  // Add findings for archive artifacts
  for (const archive of archives) {
    const vt = archive.virustotal;
    let severity: SecurityFinding['severity'] = 'medium';
    let title = 'Archive found in skill directory';
    let description =
      'Archives are containers and may include additional code or binaries not visible without extraction. Review/extract if untrusted.';
    let evidence = `${archive.rel} | ${archive.mime} | sha256=${archive.sha256 || 'N/A'}`;
    let recommendation = 'Extract and scan contents if you did not author this archive.';

    // Enhance with VirusTotal results if available
    if (vt) {
      if (vt.malicious) {
        severity = 'critical';
        title = '⚠️ MALWARE DETECTED - Archive flagged by VirusTotal';
        description = `This archive has been flagged as MALICIOUS by ${vt.detectionCount} of ${vt.totalEngines} antivirus engines on VirusTotal. DO NOT EXTRACT OR EXECUTE.`;
        evidence = `${archive.rel} | ${archive.mime} | sha256=${archive.sha256 || 'N/A'} | VirusTotal: ${vt.detectionCount}/${vt.totalEngines} engines flagged as malicious`;
        recommendation = `🚨 CRITICAL: This archive is known malware. Do not extract or execute. Remove immediately. VirusTotal report: https://www.virustotal.com/gui/file/${archive.sha256}`;
      } else if (vt.suspicious) {
        severity = 'high';
        title = '⚠️ Suspicious archive detected';
        description = `This archive has been flagged as SUSPICIOUS by ${vt.detectionCount} of ${vt.totalEngines} antivirus engines on VirusTotal. Exercise extreme caution.`;
        evidence = `${archive.rel} | ${archive.mime} | sha256=${archive.sha256 || 'N/A'} | VirusTotal: ${vt.detectionCount}/${vt.totalEngines} engines flagged as suspicious`;
        recommendation = `⚠️ WARNING: This archive is suspicious. Do not extract without thorough review. VirusTotal report: https://www.virustotal.com/gui/file/${archive.sha256}`;
      } else if (vt.harmless) {
        evidence = `${archive.rel} | ${archive.mime} | sha256=${archive.sha256 || 'N/A'} | VirusTotal: Clean (${vt.totalEngines} engines, ${vt.detectionCount} detections)`;
        recommendation = 'Archive appears safe according to VirusTotal, but still extract and scan contents carefully.';
      } else if (vt.error) {
        evidence = `${archive.rel} | ${archive.mime} | sha256=${archive.sha256 || 'N/A'} | VirusTotal: ${vt.error}`;
        recommendation = 'VirusTotal check failed. Manually verify this archive before extraction.';
      } else {
        evidence = `${archive.rel} | ${archive.mime} | sha256=${archive.sha256 || 'N/A'} | VirusTotal: No detections (${vt.totalEngines} engines scanned)`;
        recommendation = `Archive not found in VirusTotal or no detections. Extract and scan contents carefully. Check: https://www.virustotal.com/gui/file/${archive.sha256}`;
      }
    }

    added.push({
      severity,
      category: 'Archives Present',
      title,
      description,
      evidence,
      recommendation,
    });
  }

  // If no artifacts found, return result unchanged
  if (added.length === 0) {
    return result;
  }

  // Merge artifact findings with existing findings
  const findings = Array.isArray(result.findings) ? [...added, ...result.findings] : added;

  // Return updated result with findings and artifact records
  return {
    ...result,
    findings,
    binaryArtifacts: binaries.length > 0 ? binaries : undefined,
    archiveArtifacts: archives.length > 0 ? archives : undefined,
  };
}
