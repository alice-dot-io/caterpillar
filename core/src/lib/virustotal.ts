export interface VTResult {
  hash: string;
  malicious: boolean;
  suspicious: boolean;
  harmless: boolean;
  reputation: number;
  detectionCount: number;
  totalEngines: number;
  lastAnalysisDate: number | null;
  error?: string;
}

async function checkHash(apiKey: string, sha256: string): Promise<VTResult> {
  try {
    const response = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      return {
        hash: sha256,
        malicious: false, suspicious: false, harmless: false,
        reputation: 0, detectionCount: 0, totalEngines: 0,
        lastAnalysisDate: null,
        error: 'Rate limited — wait and retry',
      };
    }

    if (response.status === 404) {
      return {
        hash: sha256,
        malicious: false, suspicious: false, harmless: false,
        reputation: 0, detectionCount: 0, totalEngines: 0,
        lastAnalysisDate: null,
        error: 'Not found in VirusTotal database',
      };
    }

    if (!response.ok) {
      return {
        hash: sha256,
        malicious: false, suspicious: false, harmless: false,
        reputation: 0, detectionCount: 0, totalEngines: 0,
        lastAnalysisDate: null,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as {
      data: {
        attributes: {
          last_analysis_stats: {
            harmless: number;
            malicious: number;
            suspicious: number;
            undetected: number;
            timeout: number;
          };
          last_analysis_date: number;
          reputation: number;
        };
      };
    };

    const stats = data.data.attributes.last_analysis_stats;
    const totalEngines = stats.harmless + stats.malicious + stats.suspicious + stats.undetected + stats.timeout;
    const detectionCount = stats.malicious + stats.suspicious;

    return {
      hash: sha256,
      malicious: stats.malicious > 0,
      suspicious: stats.suspicious > 0,
      harmless: stats.harmless > 0 && stats.malicious === 0 && stats.suspicious === 0,
      reputation: data.data.attributes.reputation || 0,
      detectionCount,
      totalEngines,
      lastAnalysisDate: data.data.attributes.last_analysis_date || null,
    };
  } catch (err) {
    return {
      hash: sha256,
      malicious: false, suspicious: false, harmless: false,
      reputation: 0, detectionCount: 0, totalEngines: 0,
      lastAnalysisDate: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Check a list of SHA256 hashes against VirusTotal.
 * Respects free-tier rate limit (4 req/min) with 15s delay between requests.
 */
export async function checkVirusTotalBatch(
  apiKey: string,
  hashes: string[],
  delayMs = 15000,
  onProgress?: (current: number, total: number) => void,
): Promise<Map<string, VTResult>> {
  const results = new Map<string, VTResult>();
  const unique = [...new Set(hashes.filter(h => h && h !== 'ERROR_HASHING'))];

  for (let i = 0; i < unique.length; i++) {
    if (onProgress) onProgress(i + 1, unique.length);
    const result = await checkHash(apiKey, unique[i]);
    results.set(unique[i], result);

    // Delay between requests (skip after last one)
    if (i < unique.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
