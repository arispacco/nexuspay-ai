import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { arbitrateDispute } from '../../../server/aiEngine.js';
import { refundPayPalOrder, getPayPalTelemetry } from '../../../server/paypalClient.js';

describe('Tier 1 — Feature 09: AI Dispute Arbitration & PayPal Split Refund', () => {
  const sampleContract = {
    id: 'SMA-DISP-001',
    title: 'Fintech Responsive Dashboard',
    totalBudget: 500,
    currency: 'USD'
  };

  it('should arbitrate conflicting client and freelancer claims with a binding split resolution', async () => {
    const result = await arbitrateDispute({
      contract: sampleContract,
      clientClaim: 'Deliverable has minor alignment issues on iPad viewport',
      freelancerClaim: 'Delivered all 8 screens, full backend API, and passing tests'
    });

    assert.ok(result.arbitrationId.startsWith('ARB-'));
    assert.equal(result.status, 'SETTLED');
    assert.ok(result.summary);
    assert.ok(result.ruling);
    assert.ok(result.allocation);
  });

  it('should calculate proportional percentage split summing to exactly 100%', async () => {
    const result = await arbitrateDispute({
      contract: sampleContract,
      clientClaim: 'Minor tablet layout delay',
      freelancerClaim: 'Completed full core functionality'
    });

    const { freelancerPayoutPercent, clientRefundPercent } = result.allocation;
    assert.equal(freelancerPayoutPercent + clientRefundPercent, 100);
    assert.ok(freelancerPayoutPercent >= 0 && freelancerPayoutPercent <= 100);
    assert.ok(clientRefundPercent >= 0 && clientRefundPercent <= 100);
  });

  it('should calculate exact monetary refund and payout amounts matching total contract budget', async () => {
    const result = await arbitrateDispute({
      contract: sampleContract,
      clientClaim: 'Minor tablet layout delay',
      freelancerClaim: 'Completed full core functionality'
    });

    const { clientRefundAmount, freelancerPayoutAmount } = result.allocation;
    const totalAllocated = clientRefundAmount + freelancerPayoutAmount;
    assert.equal(totalAllocated, 500);
  });

  it('should format an actionable PayPal refund command payload', async () => {
    const result = await arbitrateDispute({
      contract: sampleContract,
      clientClaim: 'Partial delivery',
      freelancerClaim: 'Substantial completion'
    });

    const action = result.paypalActionPayload;
    assert.ok(action);
    assert.equal(action.refundExecution, 'IMMEDIATE');
    assert.equal(action.releaseExecution, 'IMMEDIATE');
    assert.ok(action.note.includes('NexusPay AI Arbitrated Settlement'));
  });

  it('should execute a PayPal split refund and return a valid Refund ID', async () => {
    const refund = await refundPayPalOrder({
      captureId: 'CAP-TEST-CAPTURE-88',
      amount: 125.0,
      reason: 'Arbitrated dispute resolution settlement'
    });

    assert.equal(refund.success, true);
    assert.ok(refund.refundId);
    assert.ok(refund.refundId.startsWith('REF-'));
    assert.equal(refund.status, 'COMPLETED');
    assert.equal(refund.refundAmount, '$125.00');
    assert.equal(refund.reason, 'Arbitrated dispute resolution settlement');
    assert.ok(!isNaN(Date.parse(refund.timestamp)));
  });

  it('should log dispute refund operations into the MCP telemetry audit buffer', async () => {
    const reasonText = 'Telemetry arbitration refund verification';
    const refund = await refundPayPalOrder({
      captureId: 'CAP-TEL-REFUND',
      amount: 175.25,
      reason: reasonText
    });

    const telemetry = getPayPalTelemetry();
    const entry = telemetry.find(
      (t) => t.tool === 'captures_refund' && t.payloadPreview?.refundId === refund.refundId
    );

    assert.ok(entry, 'Expected telemetry entry for captures_refund');
    assert.equal(entry.endpoint, '/v2/payments/captures/CAP-TEL-REFUND/refund');
    assert.equal(entry.status, 201);
    assert.equal(entry.payloadPreview.amount, '175.25');
  });
});
