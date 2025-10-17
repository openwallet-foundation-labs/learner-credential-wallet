import { validateUrl, isUrlSuspicious } from '../app/lib/urlUtils';

describe('validateUrl', () => {
  it('should validate HTTPS URLs', () => {
    const result = validateUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://example.com');
  });

  it('should normalize URLs without protocol', () => {
    const result = validateUrl('example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://example.com');
  });

  it('should reject HTTP URLs by default', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(false);
  });

  it('should allow HTTP URLs when configured', () => {
    const result = validateUrl('http://example.com', { allowHttp: true });
    expect(result.valid).toBe(true);
  });

  it('should reject empty URLs', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Empty URL');
  });

  it('should reject invalid URLs', () => {
    const result = validateUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL');
  });
});

describe('isUrlSuspicious', () => {
  it('should detect URL shorteners', () => {
    expect(isUrlSuspicious('https://bit.ly/test')).toBe(true);
    expect(isUrlSuspicious('https://tinyurl.com/test')).toBe(true);
  });

  it('should detect phishing keywords', () => {
    expect(isUrlSuspicious('https://example.com/verify-account')).toBe(true);
    expect(isUrlSuspicious('https://example.com/urgent-update')).toBe(true);
  });

  it('should mark safe URLs as safe', () => {
    expect(isUrlSuspicious('https://example.com')).toBe(false);
    expect(isUrlSuspicious('https://github.com/repo')).toBe(false);
  });

  it('should handle malformed URLs', () => {
    expect(isUrlSuspicious('not-a-url')).toBe(true);
  });
});