const fs = require('fs');
const path = require('path');

/**
 * Ensures the parent directory for a file path exists.
 */
function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Appends a single JSON record as a newline-delimited line in O(1) time.
 */
function appendJsonlLine(filePath, record) {
  try {
    ensureParentDir(filePath);
    const line = JSON.stringify(record) + '\n';
    fs.appendFileSync(filePath, line, 'utf-8');
    return true;
  } catch (error) {
    console.error(`[jsonlStorage.append error for ${filePath}]:`, error);
    return false;
  }
}

/**
 * Reads all lines from a JSONL file, ignoring empty lines.
 */
function readAllJsonlLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw.split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(`[jsonlStorage.readAll error for ${filePath}]:`, error);
    return [];
  }
}

/**
 * Efficiently reads the last N lines from a JSONL file for LLM tail prompt injection.
 */
function readJsonlTail(filePath, maxLines = 10) {
  const lines = readAllJsonlLines(filePath);
  if (lines.length === 0) return [];
  const sliceStart = Math.max(0, lines.length - maxLines);
  return lines.slice(sliceStart).map(l => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Reads paginated JSONL records with offset and limit.
 */
function readJsonlPaginated(filePath, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const lines = readAllJsonlLines(filePath);
  const total = lines.length;
  const selected = lines.slice(offset, offset + limit);

  const messages = selected.map(l => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);

  return {
    total,
    offset,
    limit,
    messages
  };
}

/**
 * Slices the first maxLines from sourcePath into targetPath for branching.
 */
function sliceJsonl(sourcePath, targetPath, maxLines) {
  try {
    const lines = readAllJsonlLines(sourcePath);
    ensureParentDir(targetPath);
    const sliced = lines.slice(0, maxLines).join('\n') + (maxLines > 0 && lines.length > 0 ? '\n' : '');
    fs.writeFileSync(targetPath, sliced, 'utf-8');
    return true;
  } catch (error) {
    console.error(`[jsonlStorage.slice error from ${sourcePath} to ${targetPath}]:`, error);
    return false;
  }
}

module.exports = {
  appendJsonlLine,
  readJsonlTail,
  readJsonlPaginated,
  sliceJsonl
};
