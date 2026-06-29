import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Google OAuth email validation', () => {
  it('should accept emails regardless of case', () => {
    // Simulate Passport.js strategy callback
    const allowedEmails = 'tedcha@gmail.com,other@example.com'.split(',').map(e => e.trim().toLowerCase());

    const testCases = [
      'tedcha@gmail.com',
      'TEDCHA@GMAIL.COM',
      'TedCha@Gmail.Com',
      'other@example.com',
      'OTHER@EXAMPLE.COM',
    ];

    testCases.forEach(email => {
      const userEmail = email.toLowerCase();
      const isAllowed = allowedEmails.includes(userEmail);
      assert.ok(isAllowed, `Email ${email} should be allowed`);
    });
  });

  it('should reject emails not in allowlist', () => {
    const allowedEmails = 'tedcha@gmail.com'.split(',').map(e => e.trim().toLowerCase());
    const userEmail = 'unauthorized@gmail.com'.toLowerCase();

    assert.ok(!allowedEmails.includes(userEmail), 'Unauthorized email should be rejected');
  });
});
