import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAgenticNegotiation, evaluateDeliverable } from '../../../server/aiEngine.js';
import {
  createPayPalOrder,
  createPayPalMilestoneInvoice,
  capturePayPalOrder,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 4 — Scenario 01: Full-Stack Agent ($350 Happy Path)', () => {
  it('should complete the entire autonomous lifecycle from KYA negotiation to instant escrow capture', async () => {
    // Stage 1: KYA-Authenticated Negotiation between Atlas (Buyer) and Nova (Freelancer)
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'Full-Stack Agentic Commerce Widget',
      projectScope: 'React 18 component with @paypal/react-paypal-js and clean error boundaries',
      initialBudget: 350,
      freelancerSkills: 'React, Node.js, PayPal SDK',
      ndaRequired: true
    });

    assert.ok(negotiation.agreement.id.startsWith('SMA-'));
    assert.ok(negotiation.agreement.totalBudget >= 350);
    assert.equal(negotiation.agreement.kyaMandates.buyerPassport.kyaId, 'KYA-PP-ATLAS-094');
    assert.equal(negotiation.agreement.kyaMandates.sellerPassport.kyaId, 'KYA-PP-NOVA-318');

    // Stage 2: Deposit Escrow Funds via PayPal Order
    const escrowOrder = await createPayPalOrder({
      amount: negotiation.agreement.totalBudget,
      currency: 'USD',
      description: `Escrow hold for ${negotiation.agreement.title}`,
      customId: negotiation.agreement.id
    });

    assert.equal(escrowOrder.success, true);
    assert.ok(escrowOrder.orderId);
    assert.equal(escrowOrder.escrowState, 'LOCKED');

    // Stage 3: Generate PayPal Smart Milestone Invoice
    const invoice = await createPayPalMilestoneInvoice({
      agreement: negotiation.agreement
    });

    assert.equal(invoice.success, true);
    assert.ok(invoice.invoiceId);
    assert.equal(invoice.amount, negotiation.agreement.totalBudget);

    // Stage 4: Freelancer submits deliverable for Milestone 1
    const cleanDeliverable = `
      import React from 'react';
      import { PayPalButtons } from '@paypal/react-paypal-js';

      export function AutonomousCheckout({ amount, onCapture }) {
        return (
          <div className="checkout-card">
            <h3>Instant PayPal Milestone Checkout</h3>
            <PayPalButtons
              style={{ layout: "vertical", color: "gold" }}
              createOrder={(data, actions) => {
                return actions.order.create({
                  purchase_units: [{ amount: { value: String(amount) } }]
                });
              }}
              onApprove={async (data, actions) => {
                try {
                  const details = await actions.order.capture();
                  onCapture(details);
                } catch (err) {
                  console.error("Capture error:", err);
                }
              }}
            />
          </div>
        );
      }
    `;

    const auditResult = await evaluateDeliverable({
      milestone: negotiation.agreement.milestones[0],
      deliverableContent: cleanDeliverable,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai',
      deliverableUrl: 'https://nexuspay-ai.onrender.com'
    });

    // Stage 5: Autonomous Code Inspection & Acceptance Gate
    assert.equal(auditResult.dlpProtection.redactionCount, 0);
    assert.ok(auditResult.overallScore >= 90, `Score was ${auditResult.overallScore}, expected >= 90`);
    assert.equal(auditResult.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.equal(auditResult.auditCertificate.payoutAuthorized, true);

    // Stage 6: Autonomous Escrow Payout Capture
    const capture = await capturePayPalOrder({ orderId: escrowOrder.orderId });

    assert.equal(capture.success, true);
    assert.ok(capture.captureId.startsWith('CAP-'));
    assert.equal(capture.status, 'COMPLETED');
    assert.equal(capture.payoutMethod, 'PayPal Instant Payout');

    // Stage 7: Observability Verification in Live MCP Telemetry
    const telemetry = getPayPalTelemetry();
    const hasOrder = telemetry.some((t) => t.tool === 'create_order');
    const hasInvoice = telemetry.some((t) => t.tool === 'create_invoice');
    const hasCapture = telemetry.some((t) => t.tool === 'pay_order');

    assert.ok(hasOrder, 'Telemetry must contain create_order');
    assert.ok(hasInvoice, 'Telemetry must contain create_invoice');
    assert.ok(hasCapture, 'Telemetry must contain pay_order');
  });

  it('should verify KYA delegated authority mandates during negotiation', async () => {
    const negotiation = await runAgenticNegotiation({
      projectTitle: 'KYA Verification Task',
      initialBudget: 350
    });

    const buyer = negotiation.agreement.kyaMandates.buyerPassport;
    const seller = negotiation.agreement.kyaMandates.sellerPassport;

    assert.equal(buyer.pciScope, 'ORCHESTRATOR_ONLY_NO_RAW_PAN');
    assert.ok(buyer.mandateSignature.startsWith('ed25519:'));
    assert.ok(seller.mandateSignature.startsWith('ed25519:'));
  });

  it('should verify code criteria breakdown satisfies all three acceptance gates', async () => {
    const code = `
      export default async function checkout() {
        try {
          return await PayPal.createOrder();
        } catch (e) {
          return null;
        }
      }
    `;

    const audit = await evaluateDeliverable({
      deliverableContent: code,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai'
    });

    assert.equal(audit.criteriaBreakdown.length, 3);
    for (const c of audit.criteriaBreakdown) {
      assert.equal(c.passed, true);
      assert.ok(c.score >= 80);
    }
  });

  it('should verify instantaneous payout authorization and release timestamp formatting', async () => {
    const order = await createPayPalOrder({ amount: 350 });
    const capture = await capturePayPalOrder({ orderId: order.orderId });

    assert.equal(capture.status, 'COMPLETED');
    assert.ok(Date.now() - Date.parse(capture.releasedAt) < 10000);
  });
});
