import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgenticNegotiation } from '../../../server/aiEngine.js';
import {
  createPayPalOrder,
  createPayPalMilestoneInvoice,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 3 — Interaction 01: RFP Negotiation to PayPal Escrow Deposit', () => {
  it('should execute end-to-end flow from KYA negotiation to PayPal order and invoice creation', async () => {
    // 1. Run Autonomous KYA Negotiation
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'Confidential Risk Scoring Engine',
      projectScope: 'High-throughput microservice with PayPal webhook listener',
      initialBudget: 420,
      freelancerSkills: 'Node.js, Express, Cryptography',
      ndaRequired: true
    });

    const agreement = negotiation.agreement;
    assert.ok(agreement.id.startsWith('SMA-'));
    assert.ok(agreement.totalBudget > 0);

    // 2. Lock Funds via PayPal Order
    const order = await createPayPalOrder({
      amount: agreement.totalBudget,
      currency: agreement.currency,
      description: `Escrow hold for ${agreement.title}`,
      customId: agreement.id
    });

    assert.equal(order.success, true);
    assert.ok(order.orderId);
    assert.equal(order.escrowState, 'LOCKED');

    // 3. Generate PayPal Milestone Invoice
    const invoice = await createPayPalMilestoneInvoice({ agreement });

    assert.equal(invoice.success, true);
    assert.ok(invoice.invoiceId);
    assert.equal(invoice.amount, agreement.totalBudget);
  });

  it('should propagate agreement customId consistently to the PayPal Order and telemetry preview', async () => {
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'Data Extraction Agent',
      projectScope: 'ETL worker with webhook notifications',
      initialBudget: 300
    });

    const agreementId = negotiation.agreement.id;

    const order = await createPayPalOrder({
      amount: negotiation.agreement.totalBudget,
      customId: agreementId
    });

    const telemetry = getPayPalTelemetry();
    const entry = telemetry.find((t) => t.payloadPreview?.orderId === order.orderId);

    assert.ok(entry);
    assert.equal(entry.payloadPreview.custom_id, agreementId);
  });

  it('should guarantee budget parity across agreement, PayPal order amount, and invoice total', async () => {
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'SDK Integration Suite',
      projectScope: 'Testing harness for agentic checkout',
      initialBudget: 520
    });

    const budget = negotiation.agreement.totalBudget;

    const order = await createPayPalOrder({
      amount: budget,
      customId: negotiation.agreement.id
    });

    const invoice = await createPayPalMilestoneInvoice({
      agreement: negotiation.agreement
    });

    assert.equal(Number(order.amount.value), budget);
    assert.equal(invoice.amount, budget);
  });

  it('should verify that KYA Buyer spend ceiling is strictly greater than or equal to agreed total', async () => {
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'Autonomous Trading Bot',
      projectScope: 'Algorithmic trading microservice',
      initialBudget: 600
    });

    const buyerPassport = negotiation.agreement.kyaMandates.buyerPassport;
    assert.ok(
      buyerPassport.maxAutonomousSpendUsd >= negotiation.agreement.totalBudget,
      `Buyer spend ceiling $${buyerPassport.maxAutonomousSpendUsd} must cover total budget $${negotiation.agreement.totalBudget}`
    );
  });

  it('should record sequential telemetry events for both create_order and create_invoice', async () => {
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'Telemetry Audit Pair',
      projectScope: 'Logging verification',
      initialBudget: 350
    });

    const order = await createPayPalOrder({
      amount: negotiation.agreement.totalBudget,
      customId: negotiation.agreement.id
    });

    const invoice = await createPayPalMilestoneInvoice({
      agreement: negotiation.agreement
    });

    const telemetry = getPayPalTelemetry();
    const orderIdx = telemetry.findIndex((t) => t.payloadPreview?.orderId === order.orderId);
    const invoiceIdx = telemetry.findIndex((t) => t.payloadPreview?.invoiceId === invoice.invoiceId);

    assert.ok(orderIdx >= 0, 'Order creation must be present in telemetry');
    assert.ok(invoiceIdx >= 0, 'Invoice creation must be present in telemetry');
    // Since unshift prepends latest events, invoice must appear before or at lower index than order
    assert.ok(invoiceIdx < orderIdx, 'Invoice event was logged after order event');
  });
});
