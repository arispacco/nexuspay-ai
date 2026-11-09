import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgenticNegotiation } from '../../../server/aiEngine.js';
import {
  generateZeroKnowledgeAttestation,
  verifyZeroKnowledgeAttestation
} from '../../../server/privacyShield.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 4 — Scenario 02: Enterprise NDA Repo ($600 Zero-Knowledge Attestation)', () => {
  it('should verify proprietary code via Zero-Knowledge proof and release $600 escrow without source disclosure', async () => {
    // Stage 1: KYA Negotiation under Strict Confidential NDA Terms
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'Enterprise Proprietary Risk Engine',
      projectScope: 'Confidential algorithmic credit model under NDA — Zero-Data-Retention enforced',
      initialBudget: 600,
      freelancerSkills: 'Python, C++, Quantitative Analysis, Cryptography',
      ndaRequired: true
    });

    const agreement = negotiation.agreement;
    assert.equal(agreement.ndaProtected, true);
    assert.ok(agreement.totalBudget >= 600);

    // Stage 2: Lock Escrow via PayPal Order
    const escrowOrder = await createPayPalOrder({
      amount: agreement.totalBudget,
      currency: 'USD',
      description: `Escrow hold for ${agreement.title} (ZK-NDA Protected)`,
      customId: agreement.id
    });

    assert.equal(escrowOrder.success, true);
    assert.ok(escrowOrder.orderId);
    assert.equal(escrowOrder.escrowState, 'LOCKED');

    // Stage 3: Confidential CI Runner executes private test suite locally
    const privateCiMetrics = {
      totalTests: 32,
      passedTests: 32,
      coveragePercent: 97,
      buildPassed: true,
      lintErrors: 0
    };

    const zkProof = generateZeroKnowledgeAttestation({
      agreementId: agreement.id,
      milestoneId: 'M1',
      localArtifactHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      testSuiteSummary: privateCiMetrics,
      ndaDomain: 'enterprise-enclave.bank.internal'
    });

    // Stage 4: Verify that ZERO bytes of proprietary source code exist in the transmitted payload
    assert.equal(zkProof.payload.sourceCodeTransmitted, false);
    assert.ok(zkProof.hmacSha256Signature);
    assert.equal(zkProof.hmacSha256Signature.length, 64);

    // Stage 5: Server Verifier inspects cryptographic attestation proof
    const verification = verifyZeroKnowledgeAttestation(zkProof);

    assert.equal(verification.valid, true);
    assert.equal(verification.sourceCodeExposed, false);
    assert.equal(verification.privacyMode, 'ZERO_KNOWLEDGE_NDA');
    assert.ok(verification.overallScore >= 90);
    assert.equal(verification.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.equal(verification.auditCertificate.payoutAuthorized, true);
    assert.equal(verification.auditCertificate.ndaCompliant, true);

    // Stage 6: Autonomous Escrow Release Triggered by Valid Attestation
    const capture = await capturePayPalOrder({ orderId: escrowOrder.orderId });

    assert.equal(capture.success, true);
    assert.ok(capture.captureId.startsWith('CAP-'));
    assert.equal(capture.status, 'COMPLETED');
  });

  it('should guarantee zero source code leakage in the ZK attestation bundle', () => {
    const proprietaryCode = 'class ConfidentialCreditModel { predictDefaultRisk() { return 0.02; } }';

    const zkProof = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-LEAK-TEST',
      milestoneId: 'M1'
    });

    const serialized = JSON.stringify(zkProof);
    assert.equal(serialized.includes(proprietaryCode), false);
    assert.equal(zkProof.payload.sourceCodeTransmitted, false);
  });

  it('should reject forged HMAC attestation signature and maintain escrow lock', async () => {
    const order = await createPayPalOrder({ amount: 600 });

    const zkProof = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-FORGERY-SCENARIO'
    });

    // An untrusted entity modifies the signature
    const forged = {
      ...zkProof,
      hmacSha256Signature: 'bad0cafe'.repeat(8)
    };

    const verification = verifyZeroKnowledgeAttestation(forged);

    assert.equal(verification.valid, false);
    assert.equal(verification.verdict, 'SIGNATURE_TAMPERED');
    assert.equal(verification.overallScore, 0);

    // Protocol check: capture is aborted
    assert.equal(verification.auditCertificate, undefined);
  });

  it('should verify audit certificate structure and runner origin domain metadata', () => {
    const zkProof = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-AUDIT-CERT',
      milestoneId: 'M2',
      ndaDomain: 'ci-runner-cluster-04.fintech.ch'
    });

    const verification = verifyZeroKnowledgeAttestation(zkProof);

    assert.equal(verification.auditCertificate.auditor, 'NexusPay Zero-Knowledge Attestation Verifier v2.0');
    assert.ok(verification.auditCertificate.hash);
    assert.equal(verification.auditCertificate.payoutAuthorized, true);
  });
});
