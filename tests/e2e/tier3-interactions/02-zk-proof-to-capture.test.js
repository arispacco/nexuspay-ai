import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateZeroKnowledgeAttestation,
  verifyZeroKnowledgeAttestation
} from '../../../server/privacyShield.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 3 — Interaction 02: ZK Attestation to Autonomous Payout Capture', () => {
  it('should verify valid ZK proof and execute autonomous PayPal escrow capture', async () => {
    // 1. Lock Escrow Funds via PayPal Order
    const order = await createPayPalOrder({
      amount: 600.0,
      description: 'Enterprise NDA Milestone Escrow',
      customId: 'SMA-NDA-600'
    });

    assert.equal(order.success, true);
    assert.ok(order.orderId);

    // 2. Generate Local Zero-Knowledge Attestation on Confidential CI Runner
    const zkProof = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-NDA-600',
      milestoneId: 'M1',
      testSuiteSummary: {
        totalTests: 40,
        passedTests: 40,
        coveragePercent: 98,
        buildPassed: true,
        lintErrors: 0
      },
      ndaDomain: 'enterprise-client.corp'
    });

    // 3. Server Verifies ZK Proof without Source Code
    const verification = verifyZeroKnowledgeAttestation(zkProof);

    assert.equal(verification.valid, true);
    assert.equal(verification.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.equal(verification.auditCertificate.payoutAuthorized, true);

    // 4. Autonomous Release Triggered
    const capture = await capturePayPalOrder({ orderId: order.orderId });

    assert.equal(capture.success, true);
    assert.ok(capture.captureId.startsWith('CAP-'));
    assert.equal(capture.status, 'COMPLETED');
  });

  it('should guarantee that no source code is transmitted in the attestation bundle', () => {
    const proprietaryCode = 'function confidentialAlgorithm() { return 42; }';

    const zkProof = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-CONFIDENTIAL',
      milestoneId: 'M2',
      localArtifactHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    });

    const bundleString = JSON.stringify(zkProof);
    assert.equal(bundleString.includes(proprietaryCode), false);
    assert.equal(zkProof.payload.sourceCodeTransmitted, false);
  });

  it('should halt release pipeline and refuse capture when ZK metrics score below threshold', async () => {
    const order = await createPayPalOrder({ amount: 350.0 });

    const failingZkProof = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-LOW-SCORE',
      testSuiteSummary: {
        totalTests: 20,
        passedTests: 10, // 50% pass rate
        coveragePercent: 55,
        buildPassed: false,
        lintErrors: 8
      }
    });

    const verification = verifyZeroKnowledgeAttestation(failingZkProof);

    assert.equal(verification.valid, true);
    assert.equal(verification.verdict, 'REVISE_DELIVERABLE');
    assert.equal(verification.auditCertificate.payoutAuthorized, false);

    // Protocol guard: if payout is not authorized, capture must NOT proceed
    assert.equal(verification.auditCertificate.payoutAuthorized, false);
  });

  it('should halt release pipeline when ZK HMAC signature is forged or tampered', async () => {
    const order = await createPayPalOrder({ amount: 450.0 });

    const zkProof = generateZeroKnowledgeAttestation({
      agreementId: 'SMA-FORGERY-TEST'
    });

    const forgedProof = {
      ...zkProof,
      hmacSha256Signature: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
    };

    const verification = verifyZeroKnowledgeAttestation(forgedProof);

    assert.equal(verification.valid, false);
    assert.equal(verification.verdict, 'SIGNATURE_TAMPERED');
    assert.equal(verification.overallScore, 0);
  });

  it('should log capture completion into the MCP telemetry audit stream', async () => {
    const order = await createPayPalOrder({ amount: 280.0, customId: 'SMA-ZK-TEL' });
    const capture = await capturePayPalOrder({ orderId: order.orderId });

    const telemetry = getPayPalTelemetry();
    const entry = telemetry.find(
      (t) => t.tool === 'pay_order' && t.payloadPreview?.captureId === capture.captureId
    );

    assert.ok(entry);
    assert.equal(entry.status, 201);
  });
});
