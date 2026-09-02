import {
  sanitizeMediaUrl,
  sanitizeText,
  sanitizeFilename,
  safeJsonParse,
  sanitizeTags
} from './securitySanitizer';

describe('securitySanitizer Unit Tests', () => {
  describe('sanitizeMediaUrl', () => {
    test('ALLOWS valid https and http URLs', () => {
      expect(sanitizeMediaUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
      expect(sanitizeMediaUrl('http://localhost:3000/art.jpg')).toBe('http://localhost:3000/art.jpg');
    });

    test('ALLOWS valid base64 image data URIs', () => {
      const validDataPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(sanitizeMediaUrl(validDataPng)).toBe(validDataPng);
    });

    test('BLOCKS dangerous javascript: and vbscript: URIs', () => {
      expect(sanitizeMediaUrl('javascript:alert(document.cookie)')).toBe('');
      expect(sanitizeMediaUrl('javascript://alert(1)')).toBe('');
      expect(sanitizeMediaUrl('vbscript:msgbox(1)')).toBe('');
    });

    test('BLOCKS data:text/html XSS vectors', () => {
      expect(sanitizeMediaUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeMediaUrl('data:application/javascript,alert(1)')).toBe('');
    });

    test('BLOCKS file:// scheme to prevent local file leaks', () => {
      expect(sanitizeMediaUrl('file:///etc/passwd')).toBe('');
      expect(sanitizeMediaUrl('file://C:/Windows/System32/cmd.exe')).toBe('');
    });

    test('BLOCKS path traversal in relative URLs', () => {
      expect(sanitizeMediaUrl('/assets/../../secrets.json')).toBe('');
      expect(sanitizeMediaUrl('./assets/..\\..\\passwords.txt')).toBe('');
      expect(sanitizeMediaUrl('/assets/ok.png')).toBe('/assets/ok.png');
    });

    test('HANDLES null, undefined, empty or non-string inputs safely', () => {
      expect(sanitizeMediaUrl(null)).toBe('');
      expect(sanitizeMediaUrl(undefined)).toBe('');
      expect(sanitizeMediaUrl('')).toBe('');
      expect(sanitizeMediaUrl(12345)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    test('REMOVES null bytes and non-printable control characters', () => {
      const dirty = 'Hello\x00World\x08Test\x1FDone';
      expect(sanitizeText(dirty)).toBe('HelloWorldTestDone');
    });

    test('PRESERVES legitimate multiline and formatted text', () => {
      const clean = 'Line 1\nLine 2\tTabbed';
      expect(sanitizeText(clean)).toBe('Line 1\nLine 2\tTabbed');
    });

    test('TRUNCATES text exceeding maxLength parameter', () => {
      const longText = 'a'.repeat(200);
      const result = sanitizeText(longText, 50);
      expect(result.length).toBe(50);
    });

    test('HANDLES non-string inputs safely without crashing', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(42)).toBe('42');
      expect(sanitizeText(true)).toBe('true');
    });
  });

  describe('sanitizeFilename', () => {
    test('STRIPS directory traversal sequences (../, ..\\)', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('etc_passwd');
      expect(sanitizeFilename('..\\..\\Windows\\System32\\config')).toBe('Windows_System32_config');
    });

    test('REPLACES illegal characters on Windows and Linux', () => {
      expect(sanitizeFilename('my<evil>:file"name|test?.png')).toBe('my_evil__file_name_test_.png');
    });

    test('HANDLES dot-only or empty filenames', () => {
      expect(sanitizeFilename('...')).toBe('');
      expect(sanitizeFilename('   ')).toBe('');
      expect(sanitizeFilename(null)).toBe('');
    });
  });

  describe('safeJsonParse (Prototype Pollution Prevention)', () => {
    test('STRIPS __proto__, constructor and prototype from parsed objects', () => {
      const maliciousPayload = '{"title":"Hero","__proto__":{"isAdmin":true},"constructor":{"prototype":{"hacked":true}}}';
      const parsed = safeJsonParse(maliciousPayload, {});

      expect(parsed.title).toBe('Hero');
      expect(parsed.__proto__.isAdmin).toBeUndefined();
      expect(Object.prototype.isAdmin).toBeUndefined();
      expect(Object.prototype.hacked).toBeUndefined();
    });

    test('RETURNS fallback value on invalid JSON string', () => {
      const fallback = { error: true };
      expect(safeJsonParse('{invalid-json', fallback)).toEqual(fallback);
      expect(safeJsonParse(null, fallback)).toEqual(fallback);
    });
  });

  describe('sanitizeTags', () => {
    test('TRIMS, DEDUPLICATES and limits maximum tags count', () => {
      const tags = [' Magia ', 'magia', 'DRAGONES', 'Magia', 'Fantasía', 'Reino', 'Aventura', 'Extra'];
      const result = sanitizeTags(tags, 4, 30);

      expect(result).toEqual(['Magia', 'DRAGONES', 'Fantasía', 'Reino']);
      expect(result.length).toBe(4);
    });

    test('TRUNCATES individual tag length if exceeding maxTagLength', () => {
      const longTag = 'x'.repeat(100);
      const result = sanitizeTags([longTag], 5, 20);

      expect(result[0].length).toBe(20);
    });

    test('HANDLES non-array or invalid items safely', () => {
      expect(sanitizeTags(null)).toEqual([]);
      expect(sanitizeTags([null, undefined, 123, 'Valid'])).toEqual(['Valid']);
    });
  });
});
