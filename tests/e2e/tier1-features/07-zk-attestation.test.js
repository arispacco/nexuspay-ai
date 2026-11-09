import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateZeroKnowledgeAttestation,
  verifyZeroKnowledgeAttestation
} from '../../../server/privacyShield.js';

describe('Tier 1 — Feature 07: Cryptographic Zero-Knowledge NDA Attestation', () => {
  it('should generate a valid ZK attestation bundle with HMAC-SHA256 signature and canonical payload', () => {
    const bundle = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-ZK-001',
      milestoneId: 'M1',
      testSuiteSummary: {
        totalTests: 25,
        passedTests: 25,
        coveragePercent: 96,
        buildPassed: true,
        lintErrors: 0
      },
      ndaDomain: 'enterprise-client.internal'
    });

    assert.ok(bundle.attestationId.startsWith('ZKA-'));
    assert.equal(bundle.payload.protocol, 'NEXUSPAY_ZK_ATTEST_V2');
    assert.equal(bundle.payload.agreementId, 'SMA-ZK-001');
    assert.equal(bundle.payload.milestoneId, 'M1');
    assert.equal(bundle.payload.runnerOrigin, 'enterprise-client.internal');
    assert.equal(bundle.payload.sourceCodeTransmitted, false);
    assert.ok(bundle.hmacSha256Signature);
    assert.equal(bundle.hmacSha256Signature.length, 64);
  });

  it('should verify valid 100% test pass bundle and authorize autonomous payout without seeing source code', () => {
    const bundle = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-ZK-AUTH',
      milestoneId: 'M1',
      testSuiteSummary: {
        totalTests: 30,
        passedTests: 30,
        coveragePercent: 95,
        buildPassed: true,
        lintErrors: 0
      }
    });

    const verification = verifyZeroKnowledgeAttestation(bundle);

    assert.equal(verification.valid, true);
    assert.equal(verification.sourceCodeExposed, false);
    assert.equal(verification.privacyMode, 'ZERO_KNOWLEDGE_NDA');
    assert.ok(verification.overallScore >= 90, `Score was ${verification.overallScore}, expected >= 90`);
    assert.equal(verification.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.equal(verification.auditCertificate.payoutAuthorized, true);
    assert.equal(verification.auditCertificate.ndaCompliant, true);
  });

  it('should reject tampered HMAC-SHA256 signature with SIGNATURE_TAMPERED verdict', () => {
    const bundle = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-ZK-TAMPER',
      testSuiteSummary: { totalTests: 10, passedTests: 10, coveragePercent: 90, buildPassed: true, lintErrors: 0 }
    });

    // Modify signature
    const forgedSignature = 'deadbeef'.repeat(8);
    const tampered = {
      ...bundle,
      hmacSha256Signature: forgedSignature
    };

    const result = verifyZeroKnowledgeAttestation(tampered);

    assert.equal(result.valid, false);
    assert.equal(result.overallScore, 0);
    assert.equal(result.verdict, 'SIGNATURE_TAMPERED');
    assert.ok(result.recommendation.includes('Cryptographic HMAC-SHA256 verification failed'));
  });

  it('should reject payload tampering when metrics are modified without key', () => {
    const bundle = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-ZK-PAYLOAD-TAMPER',
      testSuiteSummary: { totalTests: 10, passedTests: 5, coveragePercent: 50, buildPassed: false, lintErrors: 5 }
    });

    // An attacker alters the payload to claim 100% passed tests while reusing the original HMAC
    const tamperedPayload = JSON.parse(bundle.canonicalPayload);
    tamperedPayload.metrics = { totalTests: 10, passedTests: 10, coveragePercent: 100, buildPassed: true, lintErrors: 0 };

    const tamperedBundle = {
      ...bundle,
      canonicalPayload: JSON.stringify(tamperedPayload)
    };

    const result = verifyZeroKnowledgeAttestation(tamperedBundle);

    assert.equal(result.valid, false);
    assert.equal(result.verdict, 'SIGNATURE_TAMPERED');
  });

  it('should return REVISE_DELIVERABLE when private CI test metrics score below the 90% payout gate', () => {
    const bundle = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-ZK-LOW-METRICS',
      testSuiteSummary: {
        totalTests: 20,
        passedTests: 8, // 40% pass ratio
        coveragePercent: 40,
        buildPassed: false,
        lintErrors: 12
      }
    });

    const verification = verifyZeroKnowledgeAttestation(bundle);

    assert.equal(verification.valid, true);
    assert.ok(verification.overallScore < 90, `Score was ${verification.overallScore}, expected < 90`);
    assert.equal(verification.verdict, 'REVISE_DELIVERABLE');
    assert.equal(verification.auditCertificate.payoutAuthorized, false);
    assert.ok(verification.recommendation.includes('below the 90% release threshold'));
  });

  it('should return INVALID_ATTESTATION_PROOF when bundle is null, empty, or missing signature', () => {
    assert.equal(verifyZeroKnowledgeAttestation(null).verdict, 'INVALID_ATTESTATION_PROOF');
    assert.equal(verifyZeroKnowledgeAttestation({}).verdict, 'INVALID_ATTESTATION_PROOF');
    assert.equal(
      verifyZeroKnowledgeAttestation({ canonicalPayload: '{}' }).verdict,
      'INVALID_ATTESTATION_PROOF'
    );
  });
});
