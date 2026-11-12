// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import {
  createPayPalOrder,
  authorizePayPalOrder,
  capturePayPalOrder,
  capturePayPalAuthorization,
  voidPayPalAuthorization,
  getPayPalConnectionStatus,
  refundPayPalOrder,
  createPayPalMilestoneInvoice,
  generatePayPalClientToken,
  verifyPayPalWebhookSignature,
  getPayPalAccessToken,
  getPayPalMcpCapabilities,
  getPayPalTelemetry
} from './paypalClient.js';
import { runAgenticNegotiation, evaluateDeliverable, arbitrateDispute } from './aiEngine.js';
import {
  sanitizeDeliverableInRam,
  generateZeroKnowledgeAttestation,
  verifyZeroKnowledgeAttestation
} from './privacyShield.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Persistent transaction ledger and contract storage powered by SQLite (server/db.js)

// --- API ROUTES ---

app.get('/api/health', (req, res) => {
  const mcp = getPayPalMcpCapabilities();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NexusPay AI Agentic Escrow Protocol',
    version: '2.0.0',
    paypalMcpSdk: mcp.sdkPackage,
    registeredMcpTools: mcp.registeredTools
  });
});

// Honest runtime status: which parts are real and which are emulated
app.get('/api/status', async (req, res) => {
  const { live } = await getPayPalConnectionStatus();
  res.json({
    paypal: live ? 'live' : 'simulated',
    paypalEnvironment: live ? (process.env.PAYPAL_ENVIRONMENT === 'production' ? 'live' : 'sandbox') : 'emulator',
    paypalClientId: live ? process.env.PAYPAL_CLIENT_ID : null,
    ai: process.env.GEMINI_API_KEY ? 'gemini' : 'rules'
  });
});

// Step 2 of escrow: after the buyer approves the order, place the funds on hold
app.post('/api/paypal/authorize-order', async (req, res) => {
  try {
    const { orderId, agreementId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    const auth = await authorizePayPalOrder({ orderId });
    db.updateLedgerTransaction(orderId, { status: 'ESCROW_AUTHORIZED' });
    if (agreementId && db.getAgreement(agreementId)) {
      db.updateAgreement(agreementId, {
        paypalOrderId: orderId,
        paypalAuthorizationId: auth.authorizationId,
        escrowStatus: 'ESCROW_AUTHORIZED'
      });
    }
    res.json(auth);
  } catch (err) {
    console.error('Authorize order error:', err);
    res.status(500).json({ error: 'Failed to authorize PayPal order' });
  }
});

// Official @paypal/agent-toolkit MCP Inspection & Telemetry
app.get('/api/paypal/mcp-tools', (req, res) => {
  const capabilities = getPayPalMcpCapabilities();
  res.json({
    ...capabilities,
    telemetry: getPayPalTelemetry()
  });
});

// Run Agentic Negotiation
app.post('/api/negotiate', async (req, res) => {
  try {
    const { projectTitle, projectScope, initialBudget, freelancerSkills, ndaRequired, geminiApiKey } = req.body;
    const result = await runAgenticNegotiation({
      projectTitle,
      projectScope,
      initialBudget,
      freelancerSkills,
      ndaRequired,
      geminiApiKey
    });

    if (result.agreement) {
      db.saveAgreement(result.agreement);
    }

    res.json(result);
  } catch (err) {
    console.error('Negotiation error:', err);
    res.status(500).json({ error: 'Failed to run agent negotiation' });
  }
});

// Create PayPal Order (Escrow Deposit with Two-Step Auth support)
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { amount, currency, description, customId, intent, privacyMode, clientId, clientSecret } = req.body;
    const order = await createPayPalOrder({
      amount: parseFloat(amount) || 100,
      currency: currency || 'USD',
      description,
      customId,
      intent: intent || 'CAPTURE',
      clientId,
      clientSecret
    });

    const txId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
    const agreementId = customId || `SMA-${Math.floor(1000 + Math.random() * 9000)}`;
    const isAuth = order.intent === 'AUTHORIZE';

    db.addLedgerTransaction({
      id: txId,
      agreementId,
      project: description || 'Milestone Escrow Hold',
      buyer: 'Atlas (Buyer Agent)',
      freelancer: 'Nova (Seller Agent)',
      amount: parseFloat(amount) || 100,
      currency: currency || 'USD',
      paypalOrderId: order.orderId,
      status: isAuth ? 'ESCROW_AUTHORIZED' : 'ESCROW_LOCKED',
      privacyMode: privacyMode || 'ZDR-DLP',
      proofHash: 'sha256:awaiting-milestone-proof',
      aiScore: null,
      date: new Date().toISOString(),
      type: isAuth ? 'PayPal Two-Step Authorization Hold' : 'PayPal Escrow Deposit',
      rawPayload: order
    });

    const existingAg = db.getAgreement(agreementId);
    if (existingAg) {
      db.updateAgreement(agreementId, {
        paypalOrderId: order.orderId,
        escrowStatus: isAuth ? 'ESCROW_AUTHORIZED' : 'ESCROW_LOCKED'
      });
    }

    res.json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// Generate PayPal Smart Milestone Invoice
app.post('/api/paypal/create-invoice', async (req, res) => {
  try {
    const { agreement, recipientEmail, clientId, clientSecret } = req.body;
    const invoice = await createPayPalMilestoneInvoice({
      agreement,
      recipientEmail,
      clientId,
      clientSecret
    });
    res.json(invoice);
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create PayPal invoice' });
  }
});

// Capture PayPal Order (Milestone Release)
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderId, agreementId, score, privacyMode, proofHash, milestoneId, clientId, clientSecret } = req.body;
    const capture = await capturePayPalOrder({ orderId, clientId, clientSecret });

    const updated = db.updateLedgerTransaction(orderId, {
      status: 'COMPLETED',
      paypalCaptureId: capture.captureId,
      aiScore: score || 95,
      privacyMode: privacyMode || 'ZDR-DLP',
      proofHash: proofHash || 'sha256:verified-audit-digest',
      type: privacyMode === 'ZK-NDA' ? 'ZK-Attested Auto-Release' : 'Milestone Auto-Release'
    });

    if (!updated) {
      db.addLedgerTransaction({
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        agreementId: agreementId || 'SMA-LIVE',
        milestoneId: milestoneId || 'M1',
        project: 'Autonomous Milestone Release',
        buyer: 'Atlas (Buyer Agent)',
        freelancer: 'Nova (Seller Agent)',
        amount: 350.0,
        currency: 'USD',
        paypalOrderId: orderId,
        paypalCaptureId: capture.captureId,
        status: 'COMPLETED',
        privacyMode: privacyMode || 'ZDR-DLP',
        proofHash: proofHash || 'sha256:verified-audit-digest',
        aiScore: score || 95,
        date: new Date().toISOString(),
        type: privacyMode === 'ZK-NDA' ? 'ZK-Attested Auto-Release' : 'Milestone Auto-Release',
        rawPayload: capture
      });
    }

    const targetAgId = agreementId || (updated ? updated.agreementId : null);
    if (targetAgId) {
      const ag = db.getAgreement(targetAgId);
      if (ag) {
        const targetMId = milestoneId || (ag.milestones?.[0]?.id) || 'M1';
        db.updateMilestone(targetAgId, targetMId, {
          status: 'RELEASED',
          paypalCaptureId: capture.captureId,
          aiScore: score || 95,
          verdict: 'AUTO_RELEASE_PAYOUT'
        });
      }
    }

    res.json(capture);
  } catch (err) {
    console.error('Capture order error:', err);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

// Refund PayPal Order (Dispute Settlement)
app.post('/api/paypal/refund-order', async (req, res) => {
  try {
    const { captureId, amount, reason, orderId, agreementId, clientId, clientSecret } = req.body;
    const refund = await refundPayPalOrder({ captureId, amount, reason, clientId, clientSecret });

    db.addLedgerTransaction({
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      agreementId: agreementId || 'SMA-3204',
      project: 'Arbitrated Resolution Settlement',
      buyer: 'Atlas (Buyer Agent)',
      freelancer: 'Nova (Seller Agent)',
      amount: parseFloat(amount) || 125,
      currency: 'USD',
      paypalOrderId: orderId || refund.refundId,
      paypalCaptureId: captureId || null,
      paypalRefundId: refund.refundId,
      status: 'REFUNDED_PARTIAL',
      privacyMode: 'ZDR-DLP',
      proofHash: `sha256:arb-${Date.now().toString(16)}`,
      aiScore: 75,
      date: new Date().toISOString(),
      type: 'PayPal Arbitrated Refund',
      rawPayload: refund
    });

    if (agreementId) {
      db.updateAgreement(agreementId, { escrowStatus: 'REFUNDED_PARTIAL' });
    }

    res.json(refund);
  } catch (err) {
    console.error('Refund order error:', err);
    res.status(500).json({ error: 'Failed to process PayPal refund' });
  }
});

// Verify Deliverable with DLP + AI Engine
app.post('/api/verify-deliverable', async (req, res) => {
  try {
    const { milestone, deliverableType, deliverableContent, deliverableUrl, repoUrl, geminiApiKey, agreementId, milestoneId } = req.body;
    const evaluation = await evaluateDeliverable({
      milestone,
      deliverableType,
      deliverableContent,
      deliverableUrl,
      repoUrl,
      geminiApiKey
    });
    if (agreementId && milestoneId) {
      // Remember the verdict server-side: payouts are only possible for a verified milestone
      db.updateMilestone(agreementId, milestoneId, { aiScore: evaluation.overallScore, verdict: evaluation.verdict });
    }
    res.json(evaluation);
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Failed to evaluate deliverable' });
  }
});

// Live DLP Sanitization Preview Endpoint
app.post('/api/privacy/sanitize', (req, res) => {
  const { content } = req.body;
  const result = sanitizeDeliverableInRam(content || '');
  res.json(result);
});

// Generate Zero-Knowledge Attestation Proof (Simulates Private NDA CI Runner)
app.post('/api/privacy/generate-zk-proof', (req, res) => {
  const { agreementId, milestoneId, testSuiteSummary, ndaDomain } = req.body;
  const bundle = generateZeroKnowledgeAttestation({
    agreementId,
    milestoneId,
    testSuiteSummary,
    ndaDomain
  });

  try {
    db.saveZkAttestation({
      attestationId: bundle.attestationId,
      agreementId: bundle.payload?.agreementId,
      milestoneId: bundle.payload?.milestoneId,
      artifactDigest: bundle.payload?.artifactDigest,
      metrics: bundle.payload?.metrics,
      runnerOrigin: bundle.payload?.runnerOrigin,
      hmacSignature: bundle.hmacSha256Signature,
      score: 100,
      verdict: 'AUTO_RELEASE_PAYOUT'
    });
  } catch {
    // Non-blocking attestation persistence
  }

  res.json(bundle);
});

// Verify Zero-Knowledge Attestation Proof without Source Code Exposure
app.post('/api/privacy/verify-zk-proof', (req, res) => {
  const { attestationBundle } = req.body;
  const verification = verifyZeroKnowledgeAttestation(attestationBundle);

  const attAgreementId = attestationBundle?.payload?.agreementId;
  const attMilestoneId = attestationBundle?.payload?.milestoneId;
  if (verification.valid && attAgreementId && attMilestoneId) {
    db.updateMilestone(attAgreementId, attMilestoneId, { aiScore: verification.overallScore, verdict: verification.verdict });
  }

  if (attestationBundle?.attestationId) {
    try {
      db.saveZkAttestation({
        attestationId: attestationBundle.attestationId,
        agreementId: attestationBundle.payload?.agreementId,
        milestoneId: attestationBundle.payload?.milestoneId,
        artifactDigest: attestationBundle.payload?.artifactDigest,
        metrics: attestationBundle.payload?.metrics,
        runnerOrigin: attestationBundle.payload?.runnerOrigin,
        hmacSignature: attestationBundle.hmacSha256Signature,
        score: verification.overallScore || 0,
        verdict: verification.verdict || 'REJECTED'
      });
    } catch {
      // Non-blocking attestation persistence
    }
  }

  res.json(verification);
});

// Retrieve Persisted ZK Attestation Certificate
app.get('/api/privacy/attestation/:id', (req, res) => {
  const attestation = db.getZkAttestation(req.params.id);
  if (!attestation) {
    return res.status(404).json({ error: `Attestation ${req.params.id} not found` });
  }
  res.json(attestation);
});

// Arbitrate Dispute
app.post('/api/arbitrate-dispute', async (req, res) => {
  try {
    const { contract, disputeReason, clientClaim, freelancerClaim, evidenceScore, geminiApiKey } = req.body;
    const arbitration = await arbitrateDispute({
      contract,
      disputeReason,
      clientClaim,
      freelancerClaim,
      evidenceScore,
      geminiApiKey
    });
    res.json(arbitration);
  } catch (err) {
    console.error('Arbitration error:', err);
    res.status(500).json({ error: 'Failed to arbitrate dispute' });
  }
});

// Get Transaction Ledger (AG Grid data source powered by persistent SQLite)
app.get('/api/transactions', (req, res) => {
  const transactions = db.getLedgerTransactions();
  res.json({
    totalCount: transactions.length,
    transactions
  });
});

// Get all persistent agreements
app.get('/api/agreements', (req, res) => {
  const agreements = db.getAgreements();
  res.json({
    totalCount: agreements.length,
    agreements
  });
});

// Fetch active agreement and milestones by ID
app.get('/api/agreements/:id', (req, res) => {
  const agreement = db.getAgreement(req.params.id);
  if (!agreement) {
    return res.status(404).json({ error: `Agreement ${req.params.id} not found` });
  }
  res.json(agreement);
});

// Milestone-level payout release.
// With a PayPal authorization on hold, each milestone is a partial capture of that authorization;
// the last milestone is flagged as the final capture so PayPal closes the authorization.
app.post('/api/agreements/:id/milestones/:mId/release', async (req, res) => {
  try {
    const { id: agreementId, mId: milestoneId } = req.params;
    const { score, proofHash, buyerApproved } = req.body || {};

    const agreement = db.getAgreement(agreementId);
    if (!agreement) {
      return res.status(404).json({ error: `Agreement ${agreementId} not found` });
    }

    const milestone = (agreement.milestones || []).find(
      (m) => m.id === milestoneId || m.fullId === milestoneId || m.milestoneIndex === parseInt(milestoneId, 10)
    );
    if (!milestone) {
      return res.status(404).json({ error: `Milestone ${milestoneId} not found in agreement ${agreementId}` });
    }
    if (milestone.status === 'RELEASED') {
      return res.status(409).json({ error: `Milestone ${milestone.id} was already paid` });
    }

    if (!agreement.paypalAuthorizationId) {
      return res.status(402).json({ error: 'Escrow is not funded yet; approve the PayPal hold first' });
    }
    const earlierOpen = (agreement.milestones || []).some(
      (m) => m.milestoneIndex < milestone.milestoneIndex && m.status !== 'RELEASED'
    );
    if (earlierOpen) {
      return res.status(409).json({ error: 'Earlier milestones must be paid first' });
    }

    // Funds move only after a passing verification, or after the buyer explicitly approves a borderline one
    const verified = milestone.verdict === 'AUTO_RELEASE_PAYOUT';
    const approvedByBuyer = milestone.verdict === 'MANUAL_CLIENT_REVIEW' && buyerApproved === true;
    if (!verified && !approvedByBuyer) {
      return res.status(403).json({
        error: milestone.verdict
          ? `Milestone ${milestone.id} did not pass verification (${milestone.verdict}); funds stay on hold`
          : `Milestone ${milestone.id} has not been verified yet; funds stay on hold`
      });
    }

    const orderId = agreement.paypalOrderId || `8XP-${agreementId}`;
    const stillOpen = (agreement.milestones || []).filter((m) => m.status !== 'RELEASED' && m.id !== milestone.id);
    let captureResult;
    if (agreement.paypalAuthorizationId) {
      captureResult = await capturePayPalAuthorization({
        authorizationId: agreement.paypalAuthorizationId,
        amount: milestone.amount,
        currency: agreement.currency || 'USD',
        isFinal: stillOpen.length === 0
      });
    } else {
      captureResult = await capturePayPalOrder({ orderId });
    }

    const releaseScore = score !== undefined ? score : (milestone.aiScore || 95);
    const updatedMilestone = db.updateMilestone(agreementId, milestone.id, {
      status: 'RELEASED',
      paypalCaptureId: captureResult.captureId,
      aiScore: releaseScore,
      verdict: 'AUTO_RELEASE_PAYOUT'
    });

    const txId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
    db.addLedgerTransaction({
      id: txId,
      agreementId,
      milestoneId: milestone.id,
      project: `${agreement.title} (${milestone.name})`,
      buyer: 'Atlas (Buyer Agent)',
      freelancer: 'Nova (Seller Agent)',
      amount: milestone.amount,
      currency: agreement.currency || 'USD',
      paypalOrderId: orderId,
      paypalCaptureId: captureResult.captureId,
      status: 'COMPLETED',
      privacyMode: agreement.ndaProtected ? 'ZK-NDA' : 'ZDR-DLP',
      proofHash: proofHash || `sha256:release-${milestone.id}-${Date.now().toString(16)}`,
      aiScore: releaseScore,
      date: new Date().toISOString(),
      type: agreement.ndaProtected ? 'ZK-Attested Auto-Release' : 'Milestone Auto-Release',
      rawPayload: captureResult
    });

    res.json({
      success: true,
      agreementId,
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      releasedAmount: milestone.amount,
      currency: agreement.currency || 'USD',
      paypalCaptureId: captureResult.captureId,
      mode: captureResult.mode,
      status: 'RELEASED',
      dealCompleted: stillOpen.length === 0,
      milestone: updatedMilestone
    });
  } catch (err) {
    console.error('Milestone release error:', err);
    res.status(500).json({ error: 'Failed to release milestone payout' });
  }
});

// Settle a dispute on the funds still held: pay the freelancer their share, return the rest to the buyer.
// A final partial capture closes the authorization and PayPal releases the remainder to the buyer.
app.post('/api/agreements/:id/settle-dispute', async (req, res) => {
  try {
    const agreementId = req.params.id;
    const { freelancerAmount, clientRefundAmount, ruling } = req.body || {};
    const agreement = db.getAgreement(agreementId);
    if (!agreement) {
      return res.status(404).json({ error: `Agreement ${agreementId} not found` });
    }

    if (!agreement.paypalAuthorizationId) {
      return res.status(402).json({ error: 'Escrow is not funded; there is nothing to settle' });
    }

    const heldAmount = (agreement.milestones || [])
      .filter((m) => m.status !== 'RELEASED')
      .reduce((sum, m) => sum + m.amount, 0);
    const payout = Math.min(Math.max(Number(freelancerAmount) || 0, 0), heldAmount);
    const refund = Math.round((heldAmount - payout) * 100) / 100;
    const orderId = agreement.paypalOrderId || `8XP-${agreementId}`;
    const authorizationId = agreement.paypalAuthorizationId;

    let captureId = null;
    let mode;
    if (payout > 0) {
      const capture = await capturePayPalAuthorization({
        authorizationId,
        amount: payout,
        currency: agreement.currency || 'USD',
        isFinal: true
      });
      captureId = capture.captureId;
      mode = capture.mode;
    } else {
      const voided = await voidPayPalAuthorization({ authorizationId });
      mode = voided.mode;
    }

    for (const m of agreement.milestones || []) {
      if (m.status !== 'RELEASED') {
        db.updateMilestone(agreementId, m.id, { status: 'RELEASED', paypalCaptureId: captureId, verdict: 'ARBITRATED' });
      }
    }
    db.updateAgreement(agreementId, { escrowStatus: 'ARBITRATED_SPLIT' });

    db.addLedgerTransaction({
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      agreementId,
      project: `${agreement.title} (dispute settlement)`,
      buyer: 'Atlas (Buyer Agent)',
      freelancer: 'Nova (Seller Agent)',
      amount: payout,
      currency: agreement.currency || 'USD',
      paypalOrderId: orderId,
      paypalCaptureId: captureId,
      status: 'ARBITRATED_SPLIT',
      privacyMode: agreement.ndaProtected ? 'ZK-NDA' : 'ZDR-DLP',
      proofHash: `sha256:arb-${Date.now().toString(16)}`,
      aiScore: null,
      date: new Date().toISOString(),
      type: `AI Dispute Resolution (${payout.toFixed(2)} paid / ${refund.toFixed(2)} refunded)`,
      rawPayload: { ruling, freelancerAmount: payout, clientRefundAmount: clientRefundAmount ?? refund }
    });

    res.json({
      success: true,
      agreementId,
      freelancerPaid: payout,
      buyerRefunded: refund,
      currency: agreement.currency || 'USD',
      paypalCaptureId: captureId,
      mode
    });
  } catch (err) {
    console.error('Settle dispute error:', err);
    res.status(500).json({ error: 'Failed to settle dispute' });
  }
});

// Client token generator for PayPal SDK
app.get('/api/paypal/client-token', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.query;
    const clientToken = await generatePayPalClientToken(clientId, clientSecret);
    res.json({ clientToken });
  } catch (err) {
    console.error('Client token generation error:', err);
    res.status(500).json({ error: 'Failed to generate PayPal client token' });
  }
});

// Zapier Webhook Bridge: forward escrow and dispute events
app.post('/api/webhooks/zapier', async (req, res) => {
  try {
    const { event, payload, targetUrl } = req.body;
    const eventType = event || 'ESCROW_PAYOUT_TRIGGERED';
    const eventId = `ZAP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const eventRecord = db.recordWebhookEvent({
      eventId,
      eventType: `ZAPIER.${eventType}`,
      resourceType: 'zapier_bridge',
      resourceId: payload?.agreementId || payload?.orderId || eventId,
      summary: `Zapier Webhook Bridge: ${eventType}`,
      status: 'PROCESSED'
    });

    let forwarded = false;
    let forwardResponse = null;

    if (targetUrl) {
      try {
        const fwd = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            event: eventType,
            timestamp: new Date().toISOString(),
            payload: payload || {}
          })
        });
        forwarded = fwd.ok;
        forwardResponse = { status: fwd.status };
      } catch (fwdErr) {
        forwardResponse = { error: fwdErr.message };
      }
    }

    res.json({
      success: true,
      eventId,
      event: eventType,
      forwarded,
      forwardResponse,
      recordedInDb: !eventRecord.duplicate,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Zapier webhook bridge error:', err);
    res.status(500).json({ error: 'Failed to process Zapier webhook bridge' });
  }
});

// Inbound PayPal Webhooks Endpoint with Header Validation & Event Idempotency
app.post('/api/paypal/webhook', async (req, res) => {
  try {
    const headers = req.headers || {};
    const body = req.body || {};

    // 1. Validate required PayPal headers
    const authAlgo = headers['paypal-auth-algo'];
    const transmissionId = headers['paypal-transmission-id'];
    const certUrl = headers['paypal-cert-url'];
    const transmissionSig = headers['paypal-transmission-sig'];
    const transmissionTime = headers['paypal-transmission-time'];

    if (!authAlgo || !transmissionId || !certUrl || !transmissionSig || !transmissionTime) {
      return res.status(400).json({
        error: 'Missing required PayPal webhook headers',
        requiredHeaders: [
          'paypal-auth-algo',
          'paypal-transmission-id',
          'paypal-cert-url',
          'paypal-transmission-sig',
          'paypal-transmission-time'
        ]
      });
    }

    // 2. Validate cert URL to prevent SSRF
    const verification = await verifyPayPalWebhookSignature({
      headers,
      body,
      clientId: req.query.clientId,
      clientSecret: req.query.clientSecret
    });

    if (!verification.verified && verification.status === 'FAILURE') {
      return res.status(401).json({
        error: 'PayPal webhook signature verification failed',
        reason: verification.reason
      });
    }

    // 3. Idempotency Check via db.recordWebhookEvent
    const eventId = body.id || transmissionId;
    const eventType = body.event_type || 'UNKNOWN';
    const resource = body.resource || {};
    const resourceType = body.resource_type || (eventType.startsWith('PAYMENT.CAPTURE') ? 'capture' : (eventType.startsWith('CUSTOMER.DISPUTE') ? 'dispute' : 'order'));
    const resourceId = resource.id || transmissionId;

    const recordResult = db.recordWebhookEvent({
      eventId,
      eventType,
      resourceType,
      resourceId,
      summary: body.summary || `PayPal Webhook Event ${eventType} (${resourceId})`,
      status: 'PROCESSED'
    });

    if (recordResult.duplicate) {
      return res.status(200).json({
        received: true,
        status: 'DUPLICATE',
        eventId,
        message: 'Event already processed'
      });
    }

    // 4. Handle Specific Event Types
    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED': {
        const orderId = resource.id;
        const customId = resource.purchase_units?.[0]?.custom_id;
        const ag = (customId && db.getAgreement(customId)) || (orderId && db.getAgreementByOrderId(orderId));
        if (ag) {
          db.updateAgreement(ag.id, {
            paypalOrderId: orderId,
            escrowStatus: 'ESCROW_LOCKED'
          });
        }
        db.updateLedgerTransaction(orderId, { status: 'ESCROW_LOCKED' });
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const captureId = resource.id;
        const orderId = resource.supplementary_data?.related_ids?.order_id;
        const ag = orderId ? db.getAgreementByOrderId(orderId) : null;
        if (ag) {
          const firstPendingMilestone = (ag.milestones || []).find((m) => m.status !== 'RELEASED');
          if (firstPendingMilestone) {
            db.updateMilestone(ag.id, firstPendingMilestone.id, {
              status: 'RELEASED',
              paypalCaptureId: captureId,
              verdict: 'AUTO_RELEASE_PAYOUT'
            });
          }
        }
        if (orderId) {
          db.updateLedgerTransaction(orderId, {
            status: 'COMPLETED',
            paypalCaptureId: captureId,
            type: 'PayPal Webhook Capture Confirmation'
          });
        }
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const refundId = resource.id;
        const captureId = resource.links?.find((l) => l.rel === 'up')?.href?.split('/').pop();
        const tx = captureId ? db.getLedgerTransactions().find((t) => t.paypalCaptureId === captureId) : null;
        if (tx && tx.agreementId) {
          db.updateAgreement(tx.agreementId, { escrowStatus: 'REFUNDED_PARTIAL' });
        }
        if (captureId) {
          db.updateLedgerTransaction(captureId, {
            status: 'REFUNDED_PARTIAL',
            paypalRefundId: refundId,
            type: 'PayPal Webhook Refund Settled'
          });
        }
        break;
      }

      case 'CUSTOMER.DISPUTE.CREATED': {
        const disputeId = resource.dispute_id || resource.id;
        const disputedTxId = resource.disputed_transactions?.[0]?.seller_transaction_id;
        const tx = disputedTxId ? db.getLedgerTransactions().find((t) => t.paypalCaptureId === disputedTxId || t.paypalOrderId === disputedTxId) : null;
        if (tx && tx.agreementId) {
          db.updateAgreement(tx.agreementId, { escrowStatus: 'DISPUTED' });
        }
        if (disputedTxId) {
          db.updateLedgerTransaction(disputedTxId, {
            status: 'DISPUTED',
            type: `PayPal Dispute Opened (${disputeId})`
          });
        }
        break;
      }

      default:
        // Other events logged and stored in idempotency ledger
        break;
    }

    res.status(200).json({
      received: true,
      status: 'PROCESSED',
      eventId,
      eventType,
      resourceId
    });
  } catch (err) {
    console.error('PayPal webhook error:', err);
    res.status(500).json({ error: 'Failed to process PayPal webhook' });
  }
});

// View logged webhook events
app.get('/api/webhooks/events', (req, res) => {
  const events = db.getWebhookEvents(parseInt(req.query.limit, 10) || 50);
  res.json({
    totalCount: events.length,
    events
  });
});

// Validate PayPal Credentials
app.post('/api/validate-paypal', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    const token = await getPayPalAccessToken(clientId, clientSecret);
    if (token) {
      res.json({ valid: true, message: 'PayPal Sandbox OAuth2 credentials verified successfully!' });
    } else {
      res.json({
        valid: false,
        message: 'Using zero-friction Sandbox Emulator mode (enter valid Sandbox Client ID + Secret for live calls).'
      });
    }
  } catch (err) {
    res.json({ valid: false, message: err.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: rootDir
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(rootDir, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(rootDir, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NexusPay AI v2.0 running at http://localhost:${PORT}`);
  });
}

startServer();
