import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDeliverableInRam } from '../../../server/privacyShield.js';

describe('Tier 1 — Feature 05: RAM-Only DLP Secret & PII Shield', () => {
  it('should scrub live and test API secret keys (Stripe, OpenAI, Google)', () => {
    const raw = `
      const stripeKey = "test_secret_live_abcdef1234567890abcdef";
      const testKey = "sk_test_9876543210fedcba";
      const googleAiKey = "AIzaSyD-1234567890abcdefghijklmnopqrst";
    `;

    const result = sanitizeDeliverableInRam(raw);

    assert.ok(result.redactionCount >= 3);
    assert.equal(result.scrubbedContent.includes('test_secret_live_'), false);
    assert.equal(result.scrubbedContent.includes('sk_test_'), false);
    assert.equal(result.scrubbedContent.includes('AIzaSyD'), false);
    assert.ok(result.scrubbedContent.includes('[REDACTED_API_SECRET_KEY_'));
  });

  it('should scrub PayPal client secrets and access tokens', () => {
    const raw = `
      const payPalSecret = "EQL1234567890abcdef1234567890";
      const payPalToken = "A21AAI890abcdef1234567890abcdef";
    `;

    const result = sanitizeDeliverableInRam(raw);

    assert.ok(result.redactionCount >= 2);
    assert.equal(result.scrubbedContent.includes('EQL1234567890'), false);
    assert.equal(result.scrubbedContent.includes('A21AAI890'), false);
    assert.ok(result.scrubbedContent.includes('[REDACTED_PAYPAL_CREDENTIAL_'));
  });

  it('should scrub GitHub personal access tokens and AWS access keys', () => {
    const raw = `
      const ghToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
    `;

    const result = sanitizeDeliverableInRam(raw);

    assert.ok(result.redactionCount >= 2);
    assert.equal(result.scrubbedContent.includes('ghp_'), false);
    assert.equal(result.scrubbedContent.includes('AKIAIOSFODNN7EXAMPLE'), false);
    assert.ok(result.scrubbedContent.includes('[REDACTED_GITHUB_OR_CLOUD_TOKEN_'));
  });

  it('should scrub hardcoded environment assignments and sensitive variable bindings', () => {
    const raw = `
      process.env.API_KEY = "ultra_secret_hex_payload_44";
      const CLIENT_SECRET = 'confidential_password_xyz99';
    `;

    const result = sanitizeDeliverableInRam(raw);

    assert.ok(result.redactionCount >= 2);
    assert.equal(result.scrubbedContent.includes('ultra_secret_hex'), false);
    assert.equal(result.scrubbedContent.includes('confidential_password'), false);
    assert.ok(result.scrubbedContent.includes('[REDACTED_SECRET_'));
  });

  it('should scrub Bearer JWT authorization tokens and private IPv4 network addresses', () => {
    const raw = `
      const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const internalDb = "10.0.4.15";
      const gateway = "192.168.1.254";
    `;

    const result = sanitizeDeliverableInRam(raw);

    assert.ok(result.redactionCount >= 3);
    assert.equal(result.scrubbedContent.includes('eyJhbGciOi'), false);
    assert.equal(result.scrubbedContent.includes('10.0.4.15'), false);
    assert.equal(result.scrubbedContent.includes('192.168.1.254'), false);
  });

  it('should scrub personal emails while exempting mock example.com domains and issue a ZDR certificate', () => {
    const raw = `
      const admin = "admin@confidential-bank.ch";
      const mockUser = "test@example.com";
    `;

    const result = sanitizeDeliverableInRam(raw);

    assert.ok(result.redactionCount >= 1);
    assert.equal(result.scrubbedContent.includes('admin@confidential-bank.ch'), false);
    assert.ok(result.scrubbedContent.includes('test@example.com'), 'example.com should be preserved');

    // Verify Ephemeral ZDR Destruction Certificate
    const cert = result.zdrCertificate;
    assert.equal(cert.mode, 'EPHEMERAL_RAM_ONLY');
    assert.equal(cert.persistedToDisk, false);
    assert.equal(cert.llmTrainingOptOut, true);
    assert.ok(cert.rawArtifactDigest.startsWith('sha256:'));
    assert.ok(cert.scrubbedDigest.startsWith('sha256:'));
    assert.notEqual(cert.rawArtifactDigest, cert.scrubbedDigest);
    assert.ok(typeof cert.sanitizationLatencyMs === 'number');
    assert.ok(!isNaN(Date.parse(cert.destructionTimestamp)));
  });
});
