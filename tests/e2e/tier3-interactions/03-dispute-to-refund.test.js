import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateDispute } from '../../../server/aiEngine.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  refundPayPalOrder,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 3 — Interaction 03: Deliverable Dispute to Proportional PayPal Split Refund', () => {
  it('should execute end-to-end flow from disputed deliverable through AI arbitration to PayPal refund', async () => {
    // 1. Establish initial escrow lock
    const order = await createPayPalOrder({
      amount: 500.0,
      description: 'Full-stack contract with disputed deliverable'
    });
    const capture = await capturePayPalOrder({ orderId: order.orderId });

    // 2. Client initiates dispute on secondary scope
    const contract = {
      id: 'SMA-DISP-E2E',
      title: 'Full-Stack Fintech App',
      totalBudget: 500
    };

    const arbitration = await arbitrateDispute({
      contract,
      clientClaim: 'Delivered core backend but missed tablet breakpoints and 1 bonus screen',
      freelancerClaim: 'Completed all 7 primary screens, payment integration, and passing test suite'
    });

    assert.equal(arbitration.status, 'SETTLED');
    assert.ok(arbitration.allocation.clientRefundAmount > 0);
    assert.ok(arbitration.allocation.freelancerPayoutAmount > 0);

    // 3. Execute PayPal Split Refund for the awarded buyer amount
    const refund = await refundPayPalOrder({
      captureId: capture.captureId,
      amount: arbitration.allocation.clientRefundAmount,
      reason: arbitration.summary
    });

    assert.equal(refund.success, true);
    assert.ok(refund.refundId.startsWith('REF-'));
    assert.equal(refund.status, 'COMPLETED');
    assert.equal(
      refund.refundAmount,
      `$${arbitration.allocation.clientRefundAmount.toFixed(2)}`
    );
  });

  it('should maintain mathematical conservation of funds across arbitration and refund execution', async () => {
    const contractBudget = 750;
    const contract = { id: 'SMA-MATH-CHECK', totalBudget: contractBudget };

    const arbitration = await arbitrateDispute({
      contract,
      clientClaim: 'Minor delay in delivery',
      freelancerClaim: 'High quality delivered'
    });

    const { clientRefundAmount, freelancerPayoutAmount, clientRefundPercent, freelancerPayoutPercent } =
      arbitration.allocation;

    assert.equal(clientRefundPercent + freelancerPayoutPercent, 100);
    assert.equal(clientRefundAmount + freelancerPayoutAmount, contractBudget);
  });

  it('should support severe deficiency disputes (e.g. 50% split refund)', async () => {
    const contract = { id: 'SMA-MAJOR-DEFICIT', totalBudget: 400 };

    const arbitration = await arbitrateDispute({
      contract,
      clientClaim: 'App crashes on checkout and only half scope delivered',
      freelancerClaim: 'Server API is complete but client app has bugs'
    });

    assert.equal(arbitration.allocation.clientRefundPercent, 50);
    assert.equal(arbitration.allocation.freelancerPayoutPercent, 50);
    assert.equal(arbitration.allocation.clientRefundAmount, 200);
    assert.equal(arbitration.allocation.freelancerPayoutAmount, 200);
  });

  it('should support non-delivery or fraud disputes awarding maximum refund', async () => {
    const contract = { id: 'SMA-FRAUD-CLAIM', totalBudget: 300 };

    const arbitration = await arbitrateDispute({
      contract,
      clientClaim: 'Fraudulent submission, nothing delivered, empty code repository',
      freelancerClaim: 'Short note'
    });

    // When client claims non-delivery, freelancer is given minimal or 10% allocation
    assert.ok(arbitration.allocation.clientRefundPercent >= 90);
    assert.ok(arbitration.allocation.clientRefundAmount >= 270);
  });

  it('should record the complete dispute settlement sequence in the telemetry audit trail', async () => {
    const order = await createPayPalOrder({ amount: 250.0 });
    const capture = await capturePayPalOrder({ orderId: order.orderId });
    const refund = await refundPayPalOrder({
      captureId: capture.captureId,
      amount: 62.5,
      reason: '25% dispute settlement'
    });

    const telemetry = getPayPalTelemetry();
    const refundEntry = telemetry.find(
      (t) => t.tool === 'captures_refund' && t.payloadPreview?.refundId === refund.refundId
    );

    assert.ok(refundEntry);
    assert.equal(refundEntry.payloadPreview.amount, '62.50');
    assert.equal(refundEntry.status, 201);
  });
});
