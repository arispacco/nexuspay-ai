import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDeliverableInRam } from '../../../server/privacyShield.js';

describe('Tier 2 — Boundary 03: DLP Sanitization Boundaries & Corner Cases', () => {
  it('should scrub dense secret clustering with 10 consecutive secrets on a single line', () => {
    const denseSecrets = [
      'test_secret_11111111111111111111',
      'sk_test_22222222222222222222',
      'ghp_333333333333333333333333333333',
      'AKIAIOSFODNN7EXAMPL1',
      'EQL99999999999999999999999999',
      'A21AAI8888888888888888888888',
      '10.10.10.10',
      '192.168.0.50',
      'developer@secret-corp.internal',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_p_m1_example_jwt_token_boundary'
    ].join(' ');

    const result = sanitizeDeliverableInRam(denseSecrets);

    assert.equal(result.redactionCount, 10);
    assert.equal(result.detections.length, 10);

    for (const secret of [
      'test_secret_1111',
      'sk_test_2222',
      'ghp_3333',
      'AKIAIOSFODNN7EXAMPL1',
      'EQL9999',
      'A21AAI8888',
      '10.10.10.10',
      '192.168.0.50',
      'secret-corp.internal'
    ]) {
      assert.equal(result.scrubbedContent.includes(secret), false);
    }
  });

  it('should avoid false positives on truncated strings that do not meet regex length thresholds', () => {
    // Strings that start with prefixes but are too short to be valid secrets
    const shortPrefixes = `
      const var1 = "sk_short";
      const var2 = "ghp_tiny";
      const var3 = "AKIA_SHORT";
      const var4 = "E123";
    `;

    const result = sanitizeDeliverableInRam(shortPrefixes);

    assert.equal(result.redactionCount, 0);
    assert.equal(result.scrubbedContent, shortPrefixes);
    assert.equal(result.zdrCertificate.rawArtifactDigest, result.zdrCertificate.scrubbedDigest);
  });

  it('should properly scrub environment variable assignments containing internal secrets', () => {
    const envString = `
      API_KEY = "my_super_confidential_secret_key"
      CLIENT_SECRET : 'another_private_passphrase'
    `;

    const result = sanitizeDeliverableInRam(envString);

    assert.ok(result.redactionCount >= 2);
    assert.equal(result.scrubbedContent.includes('my_super_confidential_secret_key'), false);
    assert.equal(result.scrubbedContent.includes('another_private_passphrase'), false);
    assert.ok(result.scrubbedContent.includes('[REDACTED_SECRET_'));
  });

  it('should accurately discriminate between private RFC 1918 IPs and public IPv4 addresses', () => {
    const ipPayload = `
      const privateIp1 = "10.0.1.15";
      const privateIp2 = "192.168.100.1";
      const privateIp3 = "172.20.5.8";
      const publicDns = "8.8.8.8";
      const cloudflare = "1.1.1.1";
    `;

    const result = sanitizeDeliverableInRam(ipPayload);

    // Private IPs must be scrubbed
    assert.equal(result.scrubbedContent.includes('10.0.1.15'), false);
    assert.equal(result.scrubbedContent.includes('192.168.100.1'), false);
    assert.equal(result.scrubbedContent.includes('172.20.5.8'), false);

    // Public IPs should NOT be scrubbed
    assert.ok(result.scrubbedContent.includes('8.8.8.8'));
    assert.ok(result.scrubbedContent.includes('1.1.1.1'));
  });

  it('should exempt example.com email addresses while scrubbing corporate internal addresses', () => {
    const emailPayload = `
      const safe1 = "alice@example.com";
      const safe2 = "support@subdomain.example.com";
      const unsafe1 = "cto@fintech-bank.de";
      const unsafe2 = "security-lead@defense-contractor.co.uk";
    `;

    const result = sanitizeDeliverableInRam(emailPayload);

    assert.ok(result.scrubbedContent.includes('alice@example.com'));
    assert.equal(result.scrubbedContent.includes('cto@fintech-bank.de'), false);
    assert.equal(result.scrubbedContent.includes('security-lead@defense-contractor.co.uk'), false);
  });

  it('should return 0 redactions and identical raw/scrubbed SHA-256 digests for clean code', () => {
    const cleanSource = `
      export function add(a, b) {
        return a + b;
      }
    `;

    const result = sanitizeDeliverableInRam(cleanSource);

    assert.equal(result.redactionCount, 0);
    assert.equal(result.detections.length, 0);
    assert.equal(result.scrubbedContent, cleanSource);
    assert.equal(result.zdrCertificate.rawArtifactDigest, result.zdrCertificate.scrubbedDigest);
  });
});
