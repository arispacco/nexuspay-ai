import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgenticNegotiation } from '../../../server/aiEngine.js';
import { issueKyaAgentMandates } from '../../../server/privacyShield.js';

describe('Tier 1 — Feature 02: KYA-Authenticated Agentic Negotiation', () => {
  it('should generate a structured 4-turn negotiation transcript between Buyer Agent Atlas and Seller Agent Nova', async () => {
    const result = await runAgenticNegotiation({
      projectTitle: 'PayPal Real-Time Webhook Gateway',
      projectScope: 'Express router with HMAC signature verification and idempotency ledger',
      initialBudget: 450,
      freelancerSkills: 'Node.js, Express, PayPal SDK, Cryptography',
      ndaRequired: true
    });

    assert.ok(result);
    assert.ok(Array.isArray(result.transcript));
    assert.equal(result.transcript.length, 4);

    // Verify turn order and participants
    assert.equal(result.transcript[0].agent, 'BuyerAgent');
    assert.ok(result.transcript[0].name.includes('Atlas'));
    assert.equal(result.transcript[1].agent, 'SellerAgent');
    assert.ok(result.transcript[1].name.includes('Nova'));
    assert.equal(result.transcript[2].agent, 'BuyerAgent');
    assert.equal(result.transcript[3].agent, 'SellerAgent');
  });

  it('should produce a binding Smart Agreement object with valid identifiers and budget', async () => {
    const result = await runAgenticNegotiation({
      projectTitle: 'AI Fraud Scoring Module',
      projectScope: 'Risk assessment engine for e-commerce transactions',
      initialBudget: 350,
      freelancerSkills: 'Python, Node.js, PayPal REST API',
      ndaRequired: false
    });

    const agreement = result.agreement;
    assert.ok(agreement);
    assert.ok(agreement.id.startsWith('SMA-'));
    assert.equal(agreement.title, 'AI Fraud Scoring Module');
    assert.ok(typeof agreement.totalBudget === 'number' && agreement.totalBudget > 0);
    assert.equal(agreement.currency, 'USD');
    assert.equal(agreement.escrowStatus, 'AWAITING_PAYPAL_DEPOSIT');
    assert.equal(agreement.contractHash.startsWith('sha256:'), true);
  });

  it('should issue cryptographic KYA Buyer Passport with autonomous spend limits and PCI boundaries', () => {
    const mandates = issueKyaAgentMandates({ budgetCap: 600, agreementId: 'SMA-TEST-002' });

    assert.ok(mandates.buyerPassport);
    const buyer = mandates.buyerPassport;
    assert.equal(buyer.kyaId, 'KYA-PP-ATLAS-094');
    assert.ok(buyer.agentName.includes('Atlas'));
    assert.equal(buyer.principalEntity, 'Verified PayPal Business Principal');
    assert.equal(buyer.pciScope, 'ORCHESTRATOR_ONLY_NO_RAW_PAN');
    assert.ok(buyer.maxAutonomousSpendUsd >= 600);
    assert.ok(buyer.allowedActions.includes('paypal.orders.create'));
    assert.ok(buyer.allowedActions.includes('paypal.orders.capture'));
    assert.ok(buyer.mandateSignature.startsWith('ed25519:'));
  });

  it('should issue cryptographic KYA Seller Passport with permitted action scopes', () => {
    const mandates = issueKyaAgentMandates({ budgetCap: 600, agreementId: 'SMA-TEST-002' });

    assert.ok(mandates.sellerPassport);
    const seller = mandates.sellerPassport;
    assert.equal(seller.kyaId, 'KYA-PP-NOVA-318');
    assert.ok(seller.agentName.includes('Nova'));
    assert.equal(seller.principalEntity, 'Verified PayPal Merchant / Creator');
    assert.ok(seller.allowedActions.includes('nexuspay.deliverable.submit'));
    assert.ok(seller.allowedActions.includes('nexuspay.zk.attest'));
    assert.ok(seller.allowedActions.includes('paypal.payouts.receive'));
    assert.ok(seller.mandateSignature.startsWith('ed25519:'));
  });

  it('should partition contract into itemized milestones summing to the total budget', async () => {
    const result = await runAgenticNegotiation({
      projectTitle: 'Zero-Knowledge Attestation Microservice',
      projectScope: 'HMAC-SHA256 test suite auditor with RAM DLP scrubbing',
      initialBudget: 500,
      freelancerSkills: 'Node.js, Cryptography',
      ndaRequired: true
    });

    const milestones = result.agreement.milestones;
    assert.ok(Array.isArray(milestones));
    assert.equal(milestones.length, 2);

    assert.equal(milestones[0].id, 'M1');
    assert.equal(milestones[1].id, 'M2');
    assert.equal(milestones[0].status, 'PENDING_DEPOSIT');
    assert.equal(milestones[1].status, 'LOCKED');

    const sumMilestones = milestones[0].amount + milestones[1].amount;
    assert.equal(sumMilestones, result.agreement.totalBudget);
    assert.ok(milestones[0].criteria.length > 0);
    assert.ok(milestones[1].criteria.length > 0);
  });

  it('should enforce NDA requirement flags and configure Zero-Data-Retention privacy terms', async () => {
    const ndaResult = await runAgenticNegotiation({
      projectTitle: 'Confidential Fintech Core',
      projectScope: 'Banking ledger with confidential data',
      initialBudget: 400,
      freelancerSkills: 'Security, Node.js',
      ndaRequired: true
    });

    assert.equal(ndaResult.agreement.ndaProtected, true);
    assert.ok(ndaResult.transcript[0].message.includes('Zero-Data-Retention') || ndaResult.transcript[0].message.includes('NDA Shield'));

    const nonNdaResult = await runAgenticNegotiation({
      projectTitle: 'Public Portfolio Website',
      projectScope: 'Static HTML/CSS landing page',
      initialBudget: 200,
      freelancerSkills: 'HTML, CSS',
      ndaRequired: false
    });

    assert.equal(nonNdaResult.agreement.ndaProtected, false);
    assert.ok(nonNdaResult.transcript[0].message.includes('Standard Audit'));
  });
});
