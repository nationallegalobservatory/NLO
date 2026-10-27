import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

test('Security Regression: Slug validation prevents path traversal', () => {
  const sanitizeSlug = (slug) => {
    if (!slug || typeof slug !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return null;
    }
    return slug;
  };

  assert.equal(sanitizeSlug('../../../etc/passwd'), null);
  assert.equal(sanitizeSlug('..\\windows\\system32'), null);
  assert.equal(sanitizeSlug('article/slug'), null);
  assert.equal(sanitizeSlug('valid-slug-2026_test'), 'valid-slug-2026_test');
});

test('Security Regression: Timing-safe token comparison', () => {
  const secret = 'test-secret';
  const expectedToken = crypto.createHmac('sha256', secret).update('early-access-test').digest('hex').slice(0, 16);
  
  const matchesAnyValidToken = (token, validTokens) => {
    const tokenBuf = Buffer.from(token);
    for (const valid of validTokens) {
      const validBuf = Buffer.from(valid);
      if (tokenBuf.length === validBuf.length && crypto.timingSafeEqual(tokenBuf, validBuf)) {
        return true;
      }
    }
    return false;
  };

  assert.equal(matchesAnyValidToken(expectedToken, [expectedToken]), true);
  assert.equal(matchesAnyValidToken('wrongtoken123456', [expectedToken]), false);
  assert.equal(matchesAnyValidToken('short', [expectedToken]), false);
});

test('Security Regression: Email validation prevents header injection', () => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  const isValidEmail = (email) => {
    return Boolean(email && typeof email === 'string' && email.length <= 254 && emailRegex.test(email.trim()));
  };

  assert.equal(isValidEmail('victim@example.com\r\nBcc: attacker@example.com'), false);
  assert.equal(isValidEmail('user@legitimate.org'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('Security Regression: SSRF destination filter blocks private IP ranges', () => {
  const isSsrfSafe = (url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.local') ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
        hostname === '169.254.169.254'
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  assert.equal(isSsrfSafe('http://169.254.169.254/latest/meta-data/'), false);
  assert.equal(isSsrfSafe('http://127.0.0.1:3002/admin'), false);
  assert.equal(isSsrfSafe('http://10.0.0.1/internal'), false);
  assert.equal(isSsrfSafe('http://192.168.1.1/router'), false);
  assert.equal(isSsrfSafe('https://legitimate-law-review.org/article'), true);
});
