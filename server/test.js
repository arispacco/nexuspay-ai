// server/test.js
// Comprehensive 8-Stage Automated Verification Suite for NexusPay AI v2.0

import db from './db.js';
import {
  createPayPalOrder,
  authorizePayPalOrder,
  capturePayPalAuthorization,
  generatePayPalClientToken,
  verifyPayPalWebhookSignature,
  createPayPalMilestoneInvoice,
  capturePayPalOrder,
  refundPayPalOrder,
  getPayPalMcpCapabilities
} from './paypalClient.js';
import { runAgenticNegotiation, evaluateDeliverable, arbitrateDispute } from './aiEngine.js';
import {
  sanitizeDeliverableInRam,
  generateZeroKnowledgeAttestation,
  verifyZeroKnowledgeAttestation
} from './privacyShield.js';

async function runTests() {
  console.log('--- STARTING NEXUSPAY AI v2.0 CHAMPIONSHIP VERIFICATION SUITE ---');

  // 1. Official @paypal/agent-toolkit MCP SDK Verification
  console.log('\n[1/8] Verifying Official @paypal/agent-toolkit MCP Integration...');
  const mcp = getPayPalMcpCapabilities();
  if (!mcp.registeredTools.includes('create_order') || !mcp.registeredTools.includes('create_invoice')) {
    throw new Error('@paypal/agent-toolkit failed to register expected MCP tools');
  }
  console.log(`✓ PayPal MCP Toolkit active (${mcp.registeredTools.length} tools: ${mcp.registeredTools.join(', ')})`);

  // 2. KYA-Authenticated Agentic Negotiation
  console.log('\n[2/8] Testing KYA-Authenticated Agentic Negotiation...');
  const negotiation = await runAgenticNegotiation({
    projectTitle: 'Confidential FinTech Risk Engine',
    projectScope: 'Microservice with PayPal webhook listener and strict NDA shield',
    initialBudget: 400,
    freelancerSkills: 'Node.js, PayPal SDK, Cryptography',
    ndaRequired: true
  });
  if (!negotiation.agreement?.kyaMandates?.buyerPassport?.kyaId) {
    throw new Error('Negotiation missing Know-Your-Agent (KYA) passport mandates');
  }
  console.log(`✓ Agreement ${negotiation.agreement.id} ($${negotiation.agreement.totalBudget}) signed with KYA mandate ${negotiation.agreement.kyaMandates.buyerPassport.kyaId}`);

  // 3. PayPal Sandbox Order + Smart Milestone Invoice
  console.log('\n[3/8] Testing PayPal Order Lock & Milestone Invoice...');
  const order = await createPayPalOrder({
    amount: negotiation.agreement.totalBudget,
    description: `Escrow for ${negotiation.agreement.title}`,
    customId: negotiation.agreement.id
  });
  const invoice = await createPayPalMilestoneInvoice({ agreement: negotiation.agreement });
  if (!order.orderId || !invoice.invoiceId) {
    throw new Error('PayPal order or invoice creation failed');
  }
  console.log(`✓ PayPal Order ${order.orderId} & Invoice ${invoice.invoiceId} (#${invoice.invoiceNumber}) created`);

  // 4. DLP Secret & PII Sanitizer in Volatile RAM
  console.log('\n[4/8] Testing Real-Time DLP Secret & PII Redaction Shield...');
  const leakedSample = `
    const API_KEY = "test_secret_live_998877665544332211";
    const CONTACT = "lead@secret-bank.org";
    export async function pay() { try { return await PayPal.capture(); } catch(e) {} }
  `;
  const dlp = sanitizeDeliverableInRam(leakedSample);
  if (dlp.redactionCount < 2 || dlp.scrubbedContent.includes('test_secret_live_') || dlp.scrubbedContent.includes('secret-bank.org')) {
    throw new Error('DLP Sanitizer failed to scrub leaked credentials or PII');
  }
  console.log(`✓ DLP Shield scrubbed ${dlp.redactionCount} secrets/PII in ${dlp.zdrCertificate.sanitizationLatencyMs}ms (0 leaks)`);

  // 5. Dynamic Static + AI Deliverable Inspector (Clean vs Broken Syntax)
  console.log('\n[5/8] Testing Dynamic Code Inspector (Valid vs Broken Syntax)...');
  const validEval = await evaluateDeliverable({
    milestone: negotiation.agreement.milestones[0],
    deliverableContent: `export async function checkout() { try { return await PayPal.createOrder(); } catch (e) { return null; } }`,
    repoUrl: 'https://github.com/arispacco/nexuspay-ai'
  });
  const brokenEval = await evaluateDeliverable({
    milestone: negotiation.agreement.milestones[0],
    deliverableContent: `function broken() { if (true) { // missing closing braces`
  });
  if (validEval.overallScore < 90 || brokenEval.overallScore >= 78) {
    throw new Error(`Dynamic code inspector failed differentiation: valid=${validEval.overallScore}, broken=${brokenEval.overallScore}`);
  }
  console.log(`✓ Clean code scored ${validEval.overallScore}% (${validEval.verdict}); Broken syntax caught at ${brokenEval.overallScore}% (${brokenEval.verdict})`);

  // 6. Zero-Knowledge HMAC-SHA256 NDA Proof + Tamper Rejection
  console.log('\n[6/8] Testing Zero-Knowledge NDA Proof & Forged Signature Rejection...');
  const zkProof = generateZeroKnowledgeAttestation({
    agreementId: negotiation.agreement.id,
    testSuiteSummary: { totalTests: 20, passedTests: 20, coveragePercent: 95, buildPassed: true, lintErrors: 0 }
  });
  const zkValid = verifyZeroKnowledgeAttestation(zkProof);
  const zkTampered = verifyZeroKnowledgeAttestation({
    ...zkProof,
    hmacSha256Signature: '0000deadbeef1111deadbeef2222deadbeef3333deadbeef4444deadbeef5555'
  });
  if (!zkValid.valid || zkValid.verdict !== 'AUTO_RELEASE_PAYOUT' || zkTampered.valid || zkTampered.verdict !== 'SIGNATURE_TAMPERED') {
    throw new Error('Zero-Knowledge HMAC verification or tamper defense failed');
  }
  console.log(`✓ Valid ZK Proof verified (${zkValid.overallScore}%, 0 bytes code exposed); Tampered proof blocked (${zkTampered.verdict})`);

  // 7. Autonomous PayPal Capture
  console.log('\n[7/8] Testing Autonomous PayPal Milestone Capture...');
  const capture = await capturePayPalOrder({ orderId: order.orderId });
  if (!capture.captureId || capture.status !== 'COMPLETED') {
    throw new Error('PayPal capture failed');
  }
  console.log(`✓ PayPal Funds released! Capture ID: ${capture.captureId}`);

  // 8. AI Dispute Arbitration & PayPal Split Refund
  console.log('\n[8/8] Testing AI Dispute Arbitration & PayPal Split Refund...');
  const arbitration = await arbitrateDispute({
    contract: negotiation.agreement,
    clientClaim: 'Minor delay in tablet breakpoints',
    freelancerClaim: 'Core PayPal checkout and 8 screens delivered'
  });
  const refund = await refundPayPalOrder({
    captureId: capture.captureId,
    amount: arbitration.allocation.clientRefundAmount,
    reason: arbitration.summary
  });
  if (!refund.refundId) {
    throw new Error('Dispute refund execution failed');
  }
  console.log(`✓ Dispute settled (${arbitration.allocation.freelancerPayoutPercent}/${arbitration.allocation.clientRefundPercent} split) -> PayPal Refund ${refund.refundId}`);

  console.log('\n✓ Core 8/8 Championship Tests Passed!');

  // 9. Persistent SQLite Storage & Agreement Relational Schema
  console.log('\n[9/12] Testing SQLite Persistent Storage & Agreement Relational Schema...');
  const agreements = db.getAgreements();
  if (agreements.length < 3) {
    throw new Error(`Expected at least 3 pre-seeded agreements, got ${agreements.length}`);
  }
  const agreement4481 = db.getAgreement('SMA-4481');
  if (!agreement4481 || agreement4481.milestones.length !== 2) {
    throw new Error('Agreement SMA-4481 missing or milestones count mismatch');
  }
  const testAgId = `SMA-TEST-${Date.now().toString().slice(-4)}`;
  const savedAg = db.saveAgreement({
    id: testAgId,
    title: 'Automated Test Protocol Agreement',
    scope: 'Comprehensive backend verification contract',
    totalBudget: 600,
    currency: 'USD',
    ndaProtected: true,
    milestones: [
      { id: 'M1', name: 'Phase 1 Architecture', amount: 300, status: 'PENDING_DEPOSIT' },
      { id: 'M2', name: 'Phase 2 Hardening', amount: 300, status: 'LOCKED' }
    ]
  });
  if (!savedAg || savedAg.id !== testAgId || savedAg.milestones.length !== 2) {
    throw new Error('Failed to persist new agreement in SQLite database');
  }
  const updatedM = db.updateMilestone(testAgId, 'M1', { status: 'RELEASED', paypalCaptureId: 'CAP-TEST-M1', aiScore: 97 });
  if (updatedM.status !== 'RELEASED' || updatedM.paypalCaptureId !== 'CAP-TEST-M1') {
    throw new Error('Failed to update milestone in SQLite database');
  }
  console.log(`✓ SQLite Persistent Store active: ${agreements.length + 1} agreements, pre-seeded SMA-4481 verified, milestone release updated`);

  // 10. PayPal Orders v2 Two-Step Authorization & Client Token
  console.log('\n[10/12] Testing PayPal Two-Step Authorization & Escrow Hold...');
  const authOrder = await createPayPalOrder({
    amount: 250,
    description: 'Two-Step Escrow Authorization Test',
    customId: testAgId,
    intent: 'AUTHORIZE'
  });
  if (authOrder.intent !== 'AUTHORIZE' || authOrder.escrowState !== 'AUTHORIZED') {
    throw new Error(`Expected intent AUTHORIZE and escrowState AUTHORIZED, got ${authOrder.intent} / ${authOrder.escrowState}`);
  }
  const authExec = await authorizePayPalOrder({ orderId: authOrder.orderId });
  if (!authExec.authorizationId || authExec.status !== 'COMPLETED') {
    throw new Error('PayPal authorization execution failed');
  }
  const authCapture = await capturePayPalAuthorization({
    authorizationId: authExec.authorizationId,
    amount: 150
  });
  if (!authCapture.captureId || authCapture.status !== 'COMPLETED') {
    throw new Error('PayPal authorization capture failed');
  }
  const clientToken = await generatePayPalClientToken();
  if (!clientToken || typeof clientToken !== 'string') {
    throw new Error('PayPal client token generation failed');
  }
  console.log(`✓ Two-step authorization hold secured (${authExec.authorizationId}) -> captured $150 (${authCapture.captureId}) + Client Token ready`);

  // 11. Inbound PayPal Webhook Signature Validation & Event Idempotency
  console.log('\n[11/12] Testing Inbound PayPal Webhook Validation & Event Idempotency...');
  const invalidSig = await verifyPayPalWebhookSignature({
    headers: { 'paypal-transmission-id': 'WH-INCOMPLETE' }
  });
  if (invalidSig.verified !== false) {
    throw new Error('Expected incomplete webhook headers to fail validation');
  }
  const validSig = await verifyPayPalWebhookSignature({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-id': 'WH-TEST-TR-99',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1234',
      'paypal-transmission-sig': 'MOCK_BASE64_SIG==',
      'paypal-transmission-time': new Date().toISOString()
    },
    body: { id: 'WH-EVT-ALPHA', event_type: 'CHECKOUT.ORDER.APPROVED' }
  });
  if (validSig.verified !== true) {
    throw new Error('Expected valid simulated webhook headers to pass verification');
  }
  const whEventId = `WH-IDEMPOTENCY-${Date.now()}`;
  const firstLog = db.recordWebhookEvent({
    eventId: whEventId,
    eventType: 'PAYMENT.CAPTURE.COMPLETED',
    resourceType: 'capture',
    resourceId: 'CAP-WH-001',
    summary: 'Test Capture Webhook'
  });
  const dupLog = db.recordWebhookEvent({
    eventId: whEventId,
    eventType: 'PAYMENT.CAPTURE.COMPLETED',
    resourceType: 'capture',
    resourceId: 'CAP-WH-001',
    summary: 'Duplicate Test Capture Webhook'
  });
  if (firstLog.duplicate !== false || dupLog.duplicate !== true) {
    throw new Error('Webhook idempotency failed: duplicate event was not flagged');
  }
  console.log(`✓ Webhook signature validation active; Idempotency verified (${whEventId} first=PROCESSED, duplicate=DUPLICATE)`);

  // 12. Transaction Ledger Durability & Webhook Ingestion Buffer
  console.log('\n[12/12] Testing AG Grid Transaction Ledger Durability & Webhook Log...');
  const ledgerTxs = db.getLedgerTransactions();
  if (ledgerTxs.length < 4) {
    throw new Error(`Expected at least 4 pre-seeded ledger transactions, got ${ledgerTxs.length}`);
  }
  const sampleTx = ledgerTxs.find((t) => t.id === 'TXN-9081');
  if (!sampleTx || sampleTx.status !== 'COMPLETED' || !sampleTx.proofHash) {
    throw new Error('Pre-seeded transaction TXN-9081 integrity check failed');
  }
  const loggedWhEvents = db.getWebhookEvents(10);
  if (loggedWhEvents.length === 0) {
    throw new Error('Webhook events log buffer is empty');
  }
  console.log(`✓ AG Grid ledger durability confirmed (${ledgerTxs.length} records in SQLite); Webhook buffer active (${loggedWhEvents.length} events logged)`);

  console.log('\n🏆 ALL 12/12 CHAMPIONSHIP INTEGRATION, PERSISTENCE & WEBHOOK TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
