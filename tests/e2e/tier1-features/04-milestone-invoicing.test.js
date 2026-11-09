import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPayPalMilestoneInvoice, getPayPalTelemetry } from '../../../server/paypalClient.js';

describe('Tier 1 — Feature 04: PayPal Smart Milestone Invoicing', () => {
  const sampleAgreement = {
    id: 'SMA-INV-001',
    title: 'Autonomous Escrow Payment Gateway',
    totalBudget: 480,
    currency: 'USD',
    milestones: [
      { id: 'M1', name: 'Milestone 1: Backend Architecture', amount: 192 },
      { id: 'M2', name: 'Milestone 2: Security & ZK Attestation', amount: 288 }
    ]
  };

  it('should generate a PayPal Smart Milestone Invoice with unique ID and number', async () => {
    const invoice = await createPayPalMilestoneInvoice({ agreement: sampleAgreement });

    assert.equal(invoice.success, true);
    assert.ok(invoice.invoiceId);
    assert.ok(invoice.invoiceId.startsWith('INV2-SBX-') || invoice.mode === 'live_sandbox');
    assert.ok(invoice.invoiceNumber.startsWith('INV-'));
    assert.ok(['SENT_TO_SANDBOX', 'DRAFT_CREATED'].includes(invoice.status));
  });

  it('should reflect total contract budget and currency in invoice payload', async () => {
    const invoice = await createPayPalMilestoneInvoice({ agreement: sampleAgreement });

    assert.equal(invoice.amount, 480);
    assert.equal(invoice.currency, 'USD');
    assert.ok(!isNaN(Date.parse(invoice.createdAt)));
  });

  it('should provide an interactive sandbox payment URL for the recipient', async () => {
    const invoice = await createPayPalMilestoneInvoice({ agreement: sampleAgreement });

    assert.ok(invoice.payUrl);
    assert.ok(invoice.payUrl.startsWith('https://www.sandbox.paypal.com/invoice/p/#'));
  });

  it('should accept custom recipient email address', async () => {
    const customEmail = 'freelancer-expert@merchant.example.com';
    const invoice = await createPayPalMilestoneInvoice({
      agreement: sampleAgreement,
      recipientEmail: customEmail
    });

    assert.equal(invoice.success, true);
    assert.ok(invoice.invoiceId);
  });

  it('should log invoice generation into the MCP telemetry audit stream', async () => {
    const testAgreement = {
      id: 'SMA-INV-AUDIT',
      totalBudget: 550,
      milestones: [
        { id: 'M1', name: 'M1', amount: 220 },
        { id: 'M2', name: 'M2', amount: 330 }
      ]
    };

    await createPayPalMilestoneInvoice({ agreement: testAgreement });

    const telemetry = getPayPalTelemetry();
    const entry = telemetry.find(
      (t) => t.tool === 'create_invoice' && t.payloadPreview?.total === 550
    );

    assert.ok(entry, 'Expected telemetry entry for create_invoice with total 550');
    assert.equal(entry.endpoint, '/v2/invoicing/invoices');
    assert.equal(entry.method, 'POST');
    assert.equal(entry.payloadPreview.milestones, 2);
  });

  it('should gracefully handle empty or single-milestone agreements with default values', async () => {
    const minimalAgreement = {
      id: 'SMA-MINIMAL'
    };

    const invoice = await createPayPalMilestoneInvoice({ agreement: minimalAgreement });

    assert.equal(invoice.success, true);
    assert.ok(invoice.amount >= 350);
    assert.ok(invoice.invoiceNumber.startsWith('INV-'));
  });
});
