import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPayPalOrder } from '../../../server/paypalClient.js';
import { runAgenticNegotiation, arbitrateDispute } from '../../../server/aiEngine.js';
import { issueKyaAgentMandates } from '../../../server/privacyShield.js';

describe('Tier 2 — Boundary 01: Budget & Currency Boundaries', () => {
  it('should enforce the $50 minimum budget floor when negotiation receives $0 or negative input', async () => {
    const zeroResult = await runAgenticNegotiation({
      projectTitle: 'Zero Budget RFP',
      projectScope: 'Test boundary enforcement',
      initialBudget: 0
    });

    assert.ok(
      zeroResult.agreement.totalBudget >= 50,
      `Expected totalBudget >= 50, got ${zeroResult.agreement.totalBudget}`
    );

    const negativeResult = await runAgenticNegotiation({
      projectTitle: 'Negative Budget RFP',
      projectScope: 'Test boundary enforcement',
      initialBudget: -250
    });

    assert.ok(
      negativeResult.agreement.totalBudget >= 50,
      `Expected totalBudget >= 50, got ${negativeResult.agreement.totalBudget}`
    );
  });

  it('should correctly format 4 decimal place precision to 2 decimal places in PayPal orders', async () => {
    const fractionalOrder = await createPayPalOrder({
      amount: 350.5555,
      currency: 'USD',
      description: 'Fractional precision rounding test'
    });

    assert.equal(fractionalOrder.amount.value, '350.56');

    const subCentOrder = await createPayPalOrder({
      amount: 99.9949,
      currency: 'USD'
    });

    assert.equal(subCentOrder.amount.value, '99.99');
  });

  it('should handle enterprise-scale $1,000,000 budget without numerical overflow', async () => {
    const millionOrder = await createPayPalOrder({
      amount: 1000000,
      currency: 'USD',
      description: 'Enterprise treasury escrow hold'
    });

    assert.equal(millionOrder.amount.value, '1000000.00');
    assert.equal(millionOrder.success, true);

    const millionMandates = issueKyaAgentMandates({
      budgetCap: 1000000,
      agreementId: 'SMA-TREASURY-01'
    });

    assert.ok(millionMandates.buyerPassport.maxAutonomousSpendUsd >= 1000000);
  });

  it('should format micro-transaction amounts down to $0.01 cent', async () => {
    const microOrder = await createPayPalOrder({
      amount: 0.01,
      currency: 'USD',
      description: 'Micro-escrow verification ping'
    });

    assert.equal(microOrder.amount.value, '0.01');
    assert.equal(microOrder.success, true);
  });

  it('should fall back to safe defaults when non-numeric or string budget inputs are provided', async () => {
    const stringNegotiation = await runAgenticNegotiation({
      projectTitle: 'Invalid Budget Type',
      projectScope: 'Test NaN fallback',
      initialBudget: 'NOT_A_NUMBER'
    });

    assert.ok(typeof stringNegotiation.agreement.totalBudget === 'number');
    assert.ok(!isNaN(stringNegotiation.agreement.totalBudget));
    assert.ok(stringNegotiation.agreement.totalBudget >= 50);

    const disputeWithNullBudget = await arbitrateDispute({
      contract: { totalBudget: undefined },
      clientClaim: 'Deficiency',
      freelancerClaim: 'Delivered'
    });

    assert.equal(disputeWithNullBudget.allocation.totalDisputed, 500);
    assert.equal(
      disputeWithNullBudget.allocation.clientRefundAmount +
        disputeWithNullBudget.allocation.freelancerPayoutAmount,
      500
    );
  });

  it('should accurately partition exact boundary budget of $50 into milestones', async () => {
    const exactMinResult = await runAgenticNegotiation({
      projectTitle: 'Exact Minimum Contract',
      projectScope: 'Boundary test at $50 floor',
      initialBudget: 50
    });

    const agreement = exactMinResult.agreement;
    const m1 = agreement.milestones[0];
    const m2 = agreement.milestones[1];

    assert.equal(m1.amount + m2.amount, agreement.totalBudget);
    assert.ok(m1.amount > 0);
    assert.ok(m2.amount > 0);
  });
});
