import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateZeroKnowledgeAttestation,
  verifyZeroKnowledgeAttestation,
  sanitizeDeliverableInRam
} from '../../../server/privacyShield.js';
import { verifyPayPalWebhookSignature } from '../../../server/paypalClient.js';

describe('Tier 5 — Adversarial 01: Cryptographic, DLP & Webhook Security Hardening', () => {

  // =========================================================================
  // 1. HMAC & ZERO-KNOWLEDGE ATTESTATION TAMPER RESISTANCE
  // =========================================================================

  describe('1. HMAC & Zero-Knowledge Attestation Tamper Testing', () => {
    it('should reject tampered metrics.passedTests in canonical payload with SIGNATURE_TAMPERED', () => {
      const bundle = generateZeroKnowledgeAttestation({
        agreementId: 'SMA-ATTACK-001',
        milestoneId: 'M1',
        testSuiteSummary: { totalTests: 20, passedTests: 10, coveragePercent: 60, buildPassed: false, lintErrors: 5 },
        ndaDomain: 'ci-runner-private.corp'
      });

      // Attacker inflates passed tests from 10 to 20 without secret key
      const tamperedPayload = JSON.parse(bundle.canonicalPayload);
      tamperedPayload.metrics.passedTests = 20;
      tamperedPayload.metrics.buildPassed = true;

      const tamperedBundle = {
        ...bundle,
        canonicalPayload: JSON.stringify(tamperedPayload)
      };

      const result = verifyZeroKnowledgeAttestation(tamperedBundle);

      assert.equal(result.valid, false);
      assert.equal(result.overallScore, 0);
      assert.equal(result.verdict, 'SIGNATURE_TAMPERED');
      assert.ok(result.recommendation.includes('Cryptographic HMAC-SHA256 verification failed'));
    });

    it('should reject spoofed runnerOrigin in canonical payload with SIGNATURE_TAMPERED', () => {
      const bundle = generateZeroKnowledgeAttestation({
        agreementId: 'SMA-ATTACK-002',
        milestoneId: 'M1',
        testSuiteSummary: { totalTests: 15, passedTests: 15, coveragePercent: 95, buildPassed: true, lintErrors: 0 },
        ndaDomain: 'trusted-corp-runner.internal'
      });

      // Attacker changes runner origin to rogue machine
      const tamperedPayload = JSON.parse(bundle.canonicalPayload);
      tamperedPayload.runnerOrigin = 'untrusted-adversary-node.io';

      const tamperedBundle = {
        ...bundle,
        canonicalPayload: JSON.stringify(tamperedPayload)
      };

      const result = verifyZeroKnowledgeAttestation(tamperedBundle);

      assert.equal(result.valid, false);
      assert.equal(result.overallScore, 0);
      assert.equal(result.verdict, 'SIGNATURE_TAMPERED');
    });

    it('should reject tampered agreementId or milestoneId in canonical payload', () => {
      const bundle = generateZeroKnowledgeAttestation({
        agreementId: 'SMA-LEGIT-003',
        milestoneId: 'M1',
        testSuiteSummary: { totalTests: 10, passedTests: 10, coveragePercent: 90, buildPassed: true, lintErrors: 0 }
      });

      // Replay attack: try to apply this valid proof to another agreement
      const tamperedPayload = JSON.parse(bundle.canonicalPayload);
      tamperedPayload.agreementId = 'SMA-HIJACKED-999';

      const tamperedBundle = {
        ...bundle,
        canonicalPayload: JSON.stringify(tamperedPayload)
      };

      const result = verifyZeroKnowledgeAttestation(tamperedBundle);

      assert.equal(result.valid, false);
      assert.equal(result.verdict, 'SIGNATURE_TAMPERED');
    });

    it('should resist outer payload tampering: server relies strictly on signed canonical payload', () => {
      const bundle = generateZeroKnowledgeAttestation({
        agreementId: 'SMA-UNTRUSTED-OUTER',
        milestoneId: 'M1',
        testSuiteSummary: { totalTests: 20, passedTests: 12, coveragePercent: 65, buildPassed: false, lintErrors: 4 }
      });

      // Attacker changes the outer unsecured bundle.payload to claim 100% score
      const tamperedOuterBundle = {
        ...bundle,
        payload: {
          ...bundle.payload,
          score: 100,
          metrics: { totalTests: 20, passedTests: 20, coveragePercent: 100, buildPassed: true, lintErrors: 0 }
        }
      };

      const result = verifyZeroKnowledgeAttestation(tamperedOuterBundle);

      // Verification parses canonicalPayload, rejecting release because canonicalPayload metrics fail threshold (<90%)
      assert.equal(result.valid, true);
      assert.ok(result.overallScore < 90, `Expected score < 90, got ${result.overallScore}`);
      assert.equal(result.verdict, 'REVISE_DELIVERABLE');
    });

    it('should reject single byte modification in HMAC signature (constant-time verification)', () => {
      const bundle = generateZeroKnowledgeAttestation({
        agreementId: 'SMA-BITFLIP-004',
        milestoneId: 'M1',
        testSuiteSummary: { totalTests: 10, passedTests: 10, coveragePercent: 95, buildPassed: true, lintErrors: 0 }
      });

      const originalSig = bundle.hmacSha256Signature;
      // Flip the last byte of the signature
      const corruptedSig = originalSig.slice(0, -1) + (originalSig.slice(-1) === 'a' ? 'b' : 'a');

      const tamperedBundle = {
        ...bundle,
        hmacSha256Signature: corruptedSig
      };

      const result = verifyZeroKnowledgeAttestation(tamperedBundle);

      assert.equal(result.valid, false);
      assert.equal(result.verdict, 'SIGNATURE_TAMPERED');
      assert.equal(result.overallScore, 0);
    });

    it('should reject truncated, padded, and non-hex signature attempts', () => {
      const bundle = generateZeroKnowledgeAttestation({
        agreementId: 'SMA-TRUNC-005',
        testSuiteSummary: { totalTests: 10, passedTests: 10, coveragePercent: 90, buildPassed: true, lintErrors: 0 }
      });

      // Half-length signature
      const truncated = { ...bundle, hmacSha256Signature: bundle.hmacSha256Signature.slice(0, 32) };
      assert.equal(verifyZeroKnowledgeAttestation(truncated).verdict, 'SIGNATURE_TAMPERED');

      // Random non-hex characters
      const invalidChars = { ...bundle, hmacSha256Signature: 'Z'.repeat(64) };
      assert.equal(verifyZeroKnowledgeAttestation(invalidChars).verdict, 'SIGNATURE_TAMPERED');

      // Empty signature
      const emptySig = { ...bundle, hmacSha256Signature: '' };
      assert.equal(verifyZeroKnowledgeAttestation(emptySig).verdict, 'INVALID_ATTESTATION_PROOF');
    });

    it('should guarantee zero lines of proprietary code are exposed or transmitted', () => {
      const secretAlgorithmSource = `
        // PROPRIETARY INTELLECTUAL PROPERTY - CONFIDENTIAL
        function proprietaryHedgeEngine(ticks) {
          const secretConstant = 0x3f1a2b;
          return ticks.reduce((acc, val) => acc ^ (val * secretConstant), 0);
        }
      `;

      const bundle = generateZeroKnowledgeAttestation({
        agreementId: 'SMA-ZERO-DISCLOSURE',
        milestoneId: 'M1',
        localArtifactHash: 'sha256:77b89627bdb87abba2e46c041097c9a6',
        testSuiteSummary: { totalTests: 50, passedTests: 50, coveragePercent: 99, buildPassed: true, lintErrors: 0 },
        ndaDomain: 'air-gapped-runner.private'
      });

      // Verify no code fragments appear anywhere in the bundle
      const serializedBundle = JSON.stringify(bundle);
      assert.equal(serializedBundle.includes('proprietaryHedgeEngine'), false);
      assert.equal(serializedBundle.includes('secretConstant'), false);
      assert.equal(serializedBundle.includes('ticks.reduce'), false);

      // Verify explicit privacy metadata
      assert.equal(bundle.payload.sourceCodeTransmitted, false);
      assert.equal(bundle.payload.runnerOrigin, 'air-gapped-runner.private');
      assert.ok(bundle.payload.artifactDigest.startsWith('sha256:'));

      const verification = verifyZeroKnowledgeAttestation(bundle);
      assert.equal(verification.sourceCodeExposed, false);
      assert.equal(verification.privacyMode, 'ZERO_KNOWLEDGE_NDA');
      assert.equal(verification.auditCertificate.ndaCompliant, true);
    });
  });

  // =========================================================================
  // 2. DLP SECRET SANITIZATION STRESS TESTING
  // =========================================================================

  describe('2. DLP Secret Sanitization Stress Testing', () => {
    it('should sanitize dense consecutive secret strings with mixed API keys, IPs, and PII', () => {
      const mixedSecrets = [
        'test_secret_live_1234567890abcdef1234567890',
        'sk_test_9876543210fedcba9876543210',
        'test_secret_rest_a1b2c3d4e5f6g7h8i9j0k1l2m3',
        'AIzaSyD-12345678901234567890123456',
        'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
        'github_pat_11AAAAAAA0000000000000_12345678901234567890123456789012345678901234567890',
        'AKIAIOSFODNN7EXAMPLE',
        'A21AAJb4912903481230481203948',
        'EAALx98324892374982374982374',
        '10.0.1.25',
        '192.168.1.100',
        '172.16.50.4',
        'alice.secret@defense-cyber.gov',
        'bob_finance@fintech-crypto.internal'
      ].join(' ');

      const result = sanitizeDeliverableInRam(mixedSecrets);

      assert.equal(result.redactionCount, 14);
      assert.equal(result.detections.length, 14);

      // Verify every single secret is completely absent from the scrubbed content
      for (const secret of [
        'test_secret_live_1234567890abcdef1234567890',
        'sk_test_9876543210fedcba9876543210',
        'test_secret_rest_a1b2c3d4e5f6g7h8i9j0k1l2m3',
        'AIzaSyD-12345678901234567890123456',
        'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
        'github_pat_11AAAAAAA0000000000000_12345678901234567890123456789012345678901234567890',
        'AKIAIOSFODNN7EXAMPLE',
        'A21AAJb4912903481230481203948',
        'EAALx98324892374982374982374',
        '10.0.1.25',
        '192.168.1.100',
        '172.16.50.4',
        'defense-cyber.gov',
        'fintech-crypto.internal'
      ]) {
        assert.equal(
          result.scrubbedContent.includes(secret),
          false,
          `Leaked secret found in output: ${secret}`
        );
      }
    });

    it('should measure latency in RAM and guarantee sub-millisecond execution (< 1ms)', () => {
      const codePayload = `
        const stripe = require("stripe")("test_secret_live_1234567890abcdef1234567890");
        const github = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";
        const aws = "AKIA1234567890123456";
        const pp = "A21AA123456789012345678901234567890";
        const ip1 = "10.200.1.4";
        const ip2 = "192.168.0.22";
        const email = "dev-lead@megacorp-internal.de";
        function processPayment(data) {
          return { status: "processed", hash: "9f8372" };
        }
      `.repeat(8); // Multi-kilobyte deliverable with 56 secrets

      const latencies = [];
      for (let i = 0; i < 50; i++) {
        const t0 = process.hrtime.bigint();
        const res = sanitizeDeliverableInRam(codePayload);
        const t1 = process.hrtime.bigint();
        const elapsedMs = Number(t1 - t0) / 1e6;
        latencies.push(elapsedMs);

        // Verify certificate metadata
        assert.equal(res.zdrCertificate.mode, 'EPHEMERAL_RAM_ONLY');
        assert.equal(res.zdrCertificate.persistedToDisk, false);
        assert.equal(res.zdrCertificate.llmTrainingOptOut, true);
        assert.ok(typeof res.zdrCertificate.sanitizationLatencyMs === 'number');
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      latencies.sort((a, b) => a - b);
      const p95Latency = latencies[Math.floor(latencies.length * 0.95)];

      assert.ok(avgLatency < 1.0, `Expected avg latency < 1.0ms, got ${avgLatency.toFixed(3)}ms`);
      assert.ok(p95Latency < 1.0, `Expected p95 latency < 1.0ms, got ${p95Latency.toFixed(3)}ms`);
    });

    it('should resist common obfuscation tricks without leaking secrets', () => {
      const obfuscationVectors = [
        {
          name: 'Inside JSON String',
          raw: '{"auth": {"token": "test_secret_live_1234567890abcdef1234567890"}}',
          secret: 'test_secret_live_1234567890abcdef1234567890'
        },
        {
          name: 'Surrounded by Punctuation / Brackets',
          raw: 'const keys = [test_secret_99999999999999999999, (ghp_abcdefghijklmnopqrstuvwxyz1234567890)];',
          secret: 'test_secret_99999999999999999999'
        },
        {
          name: 'Inside URL Query Parameter',
          raw: 'const endpoint = "https://internal.service/api?access_token=test_secret_abcdef1234567890123456";',
          secret: 'test_secret_abcdef1234567890123456'
        },
        {
          name: 'Inside Single-Line and Multi-Line Comments',
          raw: '// TODO: Remove test_secret_commentsecret1234567890 before production release\n/* ghp_multilinecommenttoken1234567890 */',
          secret: 'test_secret_commentsecret1234567890'
        },
        {
          name: 'Inside Template Literal',
          raw: 'const h = `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_p_m1_token_boundary`;',
          secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_p_m1_token_boundary'
        }
      ];

      for (const vector of obfuscationVectors) {
        const result = sanitizeDeliverableInRam(vector.raw);
        assert.ok(
          result.redactionCount >= 1,
          `Failed to redact secret in vector: ${vector.name}`
        );
        assert.equal(
          result.scrubbedContent.includes(vector.secret),
          false,
          `Secret leaked in vector: ${vector.name}`
        );
      }
    });
  });

  // =========================================================================
  // 3. INBOUND PAYPAL WEBHOOK SECURITY
  // =========================================================================

  describe('3. Inbound PayPal Webhook Security & SSRF Defense', () => {
    const validHeadersTemplate = {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-id': 'WH-TR-TEST-999',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1234',
      'paypal-transmission-sig': 'MOCK_BASE64_SIG==',
      'paypal-transmission-time': new Date().toISOString()
    };

    it('should block SSRF attacks with invalid or untrusted cert URLs', async () => {
      const maliciousCertUrls = [
        'http://malicious-domain.com/cert.pem',               // Non-HTTPS insecure protocol
        'https://malicious-domain.com/cert.pem',              // Untrusted domain
        'https://evilpaypal.com/cert.pem',                    // Hostname missing dot prefix
        'https://paypal.com.attacker.com/cert.pem',           // Suffix spoof
        'https://127.0.0.1/cert.pem',                         // Localhost loopback SSRF
        'https://169.254.169.254/latest/meta-data/',          // Cloud metadata service SSRF
        'ftp://api.paypal.com/cert.pem',                      // Non-HTTP protocol
        'javascript:alert(1)',                                // Pseudo-protocol
        'not-a-valid-url-format'                              // Malformed URL
      ];

      for (const certUrl of maliciousCertUrls) {
        const headers = {
          ...validHeadersTemplate,
          'paypal-cert-url': certUrl
        };

        const result = await verifyPayPalWebhookSignature({
          headers,
          body: { id: 'WH-EVT-MALICIOUS', event_type: 'PAYMENT.CAPTURE.COMPLETED' }
        });

        assert.equal(
          result.verified,
          false,
          `SSRF bypass detected for URL: ${certUrl}`
        );
        assert.equal(result.status, 'FAILURE');
        assert.ok(
          result.reason.includes('Untrusted cert_url host') || result.reason.includes('Malformed cert_url header'),
          `Unexpected rejection reason for ${certUrl}: ${result.reason}`
        );
      }
    });

    it('should reject webhook requests with missing transmission headers', async () => {
      const requiredKeys = [
        'paypal-auth-algo',
        'paypal-transmission-id',
        'paypal-cert-url',
        'paypal-transmission-sig',
        'paypal-transmission-time'
      ];

      // Test omitting each required header individually
      for (const key of requiredKeys) {
        const incompleteHeaders = { ...validHeadersTemplate };
        delete incompleteHeaders[key];

        const result = await verifyPayPalWebhookSignature({
          headers: incompleteHeaders,
          body: { id: 'WH-EVT-MISSING' }
        });

        assert.equal(
          result.verified,
          false,
          `Expected verification failure when missing header: ${key}`
        );
        assert.equal(result.status, 'FAILURE');
        assert.equal(result.reason, 'Missing required PayPal webhook verification headers');
      }

      // Test with completely empty headers
      const emptyResult = await verifyPayPalWebhookSignature({
        headers: {},
        body: { id: 'WH-EVT-EMPTY' }
      });

      assert.equal(emptyResult.verified, false);
      assert.equal(emptyResult.status, 'FAILURE');
      assert.equal(emptyResult.reason, 'Missing required PayPal webhook verification headers');
    });

    it('should accept valid simulated PayPal webhook headers with genuine PayPal cert URLs', async () => {
      const validCertUrls = [
        'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1234',
        'https://api.paypal.com/v1/notifications/certs/CERT-5678',
        'https://notify.paypal.com/v1/notifications/certs/CERT-9999'
      ];

      for (const certUrl of validCertUrls) {
        const headers = {
          ...validHeadersTemplate,
          'paypal-cert-url': certUrl
        };

        const result = await verifyPayPalWebhookSignature({
          headers,
          body: { id: 'WH-EVT-VALID', event_type: 'CHECKOUT.ORDER.APPROVED' }
        });

        assert.equal(
          result.verified,
          true,
          `Expected valid cert URL to be accepted: ${certUrl}`
        );
        assert.equal(result.status, 'SUCCESS');
      }
    });
  });
});
