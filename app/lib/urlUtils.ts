import validator from 'validator';

// function for all URL validation needs
export function validateUrl(url: string, options: { allowHttp?: boolean } = {}) {
  const trimmed = url.trim();
  if (!trimmed) return { valid: false, error: 'Empty URL' };
  
  const normalized = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  const protocols = options.allowHttp ? ['http', 'https'] : ['https'];
  
  return validator.isURL(normalized, { protocols, require_protocol: true })
    ? { valid: true, url: normalized }
    : { valid: false, error: 'Invalid URL' };
}

// Basic security check
export function isUrlSuspicious(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    
    // Common shorteners
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
    if (shorteners.includes(hostname)) return true;
    
    // Suspicious TLDs
    if (/\.(tk|ml|ga|cf|click)$/.test(hostname)) return true;
    
    // Phishing keywords
    if (/\b(verify|urgent|suspend|update|confirm|secure)\b/i.test(pathname)) return true;
    
    // IP addresses
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return true;
    
    return false;
  } catch {
    return true;
  }
}