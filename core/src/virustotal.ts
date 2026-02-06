/**
 * VirusTotal API Integration
 *
 * Queries VirusTotal API to check if detected artifacts are known malware.
 * Uses SHA256 hashes from artifact detection to query VirusTotal's database.
 */

export interface VirusTotalReport {
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
      sha256: string;
      md5?: string;
      sha1?: string;
    };
  };
}

export interface VirusTotalResult {
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

/**
 * Check a SHA256 hash against VirusTotal API
 *
 * @param apiKey - VirusTotal API key (from VIRUSTOTAL_API_KEY env var)
 * @param sha256 - SHA256 hash to check
 * @returns VirusTotal result or null if API key not configured
 */
export async function checkVirusTotal(
  apiKey: string | undefined,
  sha256: string | null
): Promise<VirusTotalResult | null> {
  // Skip if no API key configured
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  // Skip if no hash provided
  if (!sha256 || sha256.trim().length === 0 || sha256 === 'ERROR_HASHING') {
    return null;
  }

  try {
    const response = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey.trim(),
        'Accept': 'application/json',
      },
    });

    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      return {
        hash: sha256,
        malicious: false,
        suspicious: false,
        harmless: false,
        reputation: 0,
        detectionCount: 0,
        totalEngines: 0,
        lastAnalysisDate: null,
        error: `Rate limited${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
      };
    }

    // Handle not found (404) - file not in VirusTotal database
    if (response.status === 404) {
      return {
        hash: sha256,
        malicious: false,
        suspicious: false,
        harmless: false,
        reputation: 0,
        detectionCount: 0,
        totalEngines: 0,
        lastAnalysisDate: null,
        error: 'Not found in VirusTotal database',
      };
    }

    // Handle other errors
    if (!response.ok) {
      return {
        hash: sha256,
        malicious: false,
        suspicious: false,
        harmless: false,
        reputation: 0,
        detectionCount: 0,
        totalEngines: 0,
        lastAnalysisDate: null,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data: VirusTotalReport = await response.json();
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
  } catch (error) {
    // Network errors, timeouts, etc.
    return {
      hash: sha256,
      malicious: false,
      suspicious: false,
      harmless: false,
      reputation: 0,
      detectionCount: 0,
      totalEngines: 0,
      lastAnalysisDate: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check multiple SHA256 hashes against VirusTotal API
 * Respects rate limits by adding delays between requests.
 *
 * @param apiKey - VirusTotal API key
 * @param hashes - Array of SHA256 hashes to check
 * @param delayMs - Delay between requests in milliseconds (default: 1000ms for free tier)
 * @returns Map of hash to VirusTotal result
 */
export async function checkVirusTotalBatch(
  apiKey: string | undefined,
  hashes: Array<string | null>,
  delayMs: number = 1000
): Promise<Map<string, VirusTotalResult | null>> {
  const results = new Map<string, VirusTotalResult | null>();

  // Skip if no API key
  if (!apiKey || !apiKey.trim()) {
    return results;
  }

  // Filter out null/empty hashes
  const validHashes = hashes.filter((h): h is string => h !== null && h.trim().length > 0 && h !== 'ERROR_HASHING');

  // Process sequentially to respect rate limits
  for (const hash of validHashes) {
    const result = await checkVirusTotal(apiKey, hash);
    results.set(hash, result);

    // Add delay between requests (except for the last one)
    if (hash !== validHashes[validHashes.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
