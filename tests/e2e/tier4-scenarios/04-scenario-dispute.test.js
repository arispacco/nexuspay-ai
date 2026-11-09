import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateDispute } from '../../../server/aiEngine.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  refundPayPalOrder,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 4 — Scenario 04: API Scope Dispute ($500 AI Tribunal & 75/25 Split Refund)', () => {
  const disputedContract = {
    id: 'SMA-3204-DISPUTE',
    title: 'Fintech Mobile UI & SDK Kit',
    totalBudget: 500,
    currency: 'USD'
  };

  it('should adjudicate contested contract and execute an atomic 75/25 PayPal split refund', async () => {
    // Stage 1: Deposit $500 in PayPal Escrow and Capture upon Initial Submission
    const order = await createPayPalOrder({
      amount: disputedContract.totalBudget,
      currency: disputedContract.currency,
      description: disputedContract.title,
      customId: disputedContract.id
    });
    const capture = await capturePayPalOrder({ orderId: order.orderId });

    assert.equal(capture.status, 'COMPLETED');

    // Stage 2: Buyer contests unfulfilled secondary scope (missing tablet breakpoint)
    const clientClaim = 'Freelancer delivered primary mobile screens but missed tablet breakpoints and 1 bonus screen.';
    const freelancerClaim = 'Delivered all 8 screens, full React Native export, and comprehensive passing test suite.';

    // Stage 3: AI Arbitration Tribunal convenes
    const arbitration = await arbitrateDispute({
      contract: disputedContract,
      clientClaim,
      freelancerClaim
    });

    assert.equal(arbitration.status, 'SETTLED');
    assert.ok(arbitration.arbitrationId.startsWith('ARB-'));
    assert.ok(arbitration.ruling.includes('AI Arbitration Tribunal'));

    // Stage 4: Verify 75/25 Proportional Apportionment
    const {
      clientRefundPercent,
      freelancerPayoutPercent,
      clientRefundAmount,
      freelancerPayoutAmount,
      totalDisputed
    } = arbitration.allocation;

    assert.equal(totalDisputed, 500);
    assert.equal(freelancerPayoutPercent, 75);
    assert.equal(clientRefundPercent, 25);
    assert.equal(freelancerPayoutAmount, 375);
    assert.equal(clientRefundAmount, 125);
    assert.equal(clientRefundAmount + freelancerPayoutAmount, 500);

    // Stage 5: Execute 1-Click PayPal Split Refund for Buyer's $125 award
    const refund = await refundPayPalOrder({
      captureId: capture.captureId,
      amount: clientRefundAmount,
      reason: arbitration.summary
    });

    assert.equal(refund.success, true);
    assert.ok(refund.refundId.startsWith('REF-'));
    assert.equal(refund.status, 'COMPLETED');
    assert.equal(refund.refundAmount, '$125.00');

    // Stage 6: Observability Audit in MCP Telemetry
    const telemetry = getPayPalTelemetry();
    const refundEvent = telemetry.find(
      (t) => t.tool === 'captures_refund' && t.payloadPreview?.refundId === refund.refundId
    );

    assert.ok(refundEvent);
    assert.equal(refundEvent.payloadPreview.amount, '125.00');
    assert.equal(refundEvent.status, 201);
  });

  it('should generate three evidence analysis factors justifying the ruling', async () => {
    const arbitration = await arbitrateDispute({
      contract: disputedContract,
      clientClaim: 'Minor delay and tablet layout issue',
      freelancerClaim: 'Completed all core features'
    });

    assert.equal(arbitration.analysisBreakdown.length, 3);
    assert.equal(arbitration.analysisBreakdown[0].factor, 'Contractual Milestone Evidence');
    assert.equal(arbitration.analysisBreakdown[1].factor, 'Validated Buyer Deficiency Claim');
    assert.equal(arbitration.analysisBreakdown[2].factor, 'Atomic PayPal Settlement Protocol');
  });

  it('should verify immediate execution directive in PayPal action payload', async () => {
    const arbitration = await arbitrateDispute({
      contract: disputedContract,
      clientClaim: 'Minor deficiency',
      freelancerClaim: 'Substantially complete'
    });

    assert.equal(arbitration.paypalActionPayload.refundExecution, 'IMMEDIATE');
    assert.equal(arbitration.paypalActionPayload.releaseExecution, 'IMMEDIATE');
    assert.ok(arbitration.paypalActionPayload.note);
  });

  it('should verify complete refund tracking details and ISO timestamp', async () => {
    const refund = await refundPayPalOrder({
      captureId: 'CAP-DISP-SCENARIO-4',
      amount: 125.0,
      reason: '75/25 Tribunal Award'
    });

    assert.equal(refund.refundAmount, '$125.00');
    assert.equal(refund.reason, '75/25 Tribunal Award');
    assert.ok(!isNaN(Date.parse(refund.timestamp)));
  });
});
