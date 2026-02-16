const MIME_MAP: Record<string, string> = {
  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.ts': 'application/typescript',
  '.tsx': 'application/typescript',
  '.jsx': 'application/javascript',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.h': 'text/x-c',
  '.sh': 'application/x-sh',
  '.bash': 'application/x-sh',
  '.zsh': 'application/x-sh',
  '.toml': 'application/toml',
  '.sql': 'application/sql',
  '.csv': 'text/csv',
  '.svg': 'image/svg+xml',
  '.env': 'text/plain',
  '.gitignore': 'text/plain',
  '.dockerignore': 'text/plain',

  // Binary
  '.exe': 'application/x-executable',
  '.dll': 'application/x-sharedlib',
  '.so': 'application/x-sharedlib',
  '.dylib': 'application/x-sharedlib',
  '.pyc': 'application/x-python-bytecode',
  '.pyo': 'application/x-python-bytecode',
  '.class': 'application/java-vm',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.dat': 'application/octet-stream',
  '.o': 'application/x-object',
  '.a': 'application/x-archive',
  '.lib': 'application/x-archive',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.tgz': 'application/gzip',
  '.gz': 'application/gzip',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function getMimeType(filePath: string): string | null {
  const ext = filePath.toLowerCase().match(/(\.[^./\\]+)$/)?.[1];
  if (!ext) return null;
  return MIME_MAP[ext] || null;
}
