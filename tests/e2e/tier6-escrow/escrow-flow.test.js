// tests/e2e/tier6-escrow/escrow-flow.test.js
// End-to-end check of the two-step escrow: authorize, gated partial captures, dispute settlement.
// Requires the server on http://localhost:3000.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function call(path, body) {
  const res = await fetch(BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function fundedDeal() {
  const { data } = await call('/api/negotiate', { projectTitle: 'Escrow flow test', projectScope: 'Build a checkout', initialBudget: 400, ndaRequired: false });
  const deal = data.agreement;
  const order = (await call('/api/paypal/create-order', { amount: deal.totalBudget, currency: 'USD', customId: deal.id, intent: 'AUTHORIZE' })).data;
  return { deal, order };
}

const CLEAN = `import { PayPalButtons } from '@paypal/react-paypal-js';
export function Checkout() {
  return <PayPalButtons createOrder={(d, a) => a.order.create({ purchase_units: [{ amount: { value: '10' } }] })}
    onApprove={async (d, a) => { try { await a.order.capture(); } catch (e) { console.error(e); } }} />;
}`;

test('status endpoint reports honest modes', async () => {
  const { status, data } = await call('/api/status');
  assert.equal(status, 200);
  assert.ok(['live', 'simulated'].includes(data.paypal));
  assert.ok(['gemini', 'rules'].includes(data.ai));
});

test('release is refused before funding', async () => {
  const { data } = await call('/api/negotiate', { projectTitle: 'Unfunded', projectScope: 'x', initialBudget: 100, ndaRequired: false });
  const r = await call(`/api/agreements/${data.agreement.id}/milestones/M1/release`, {});
  assert.equal(r.status, 402);
});

test('release is refused until the milestone is verified, then milestones pay in order', async () => {
  const { deal, order } = await fundedDeal();
  await call('/api/paypal/authorize-order', { orderId: order.orderId, agreementId: deal.id });

  const early = await call(`/api/agreements/${deal.id}/milestones/M1/release`, {});
  assert.equal(early.status, 403, 'unverified milestone must not be paid');

  const m1 = deal.milestones[0];
  const bad = await call('/api/verify-deliverable', { agreementId: deal.id, milestoneId: 'M1', milestone: m1, deliverableType: 'code', deliverableContent: 'function x( {' });
  assert.notEqual(bad.data.verdict, 'AUTO_RELEASE_PAYOUT');
  assert.equal((await call(`/api/agreements/${deal.id}/milestones/M1/release`, {})).status, 403);

  const good = await call('/api/verify-deliverable', { agreementId: deal.id, milestoneId: 'M1', milestone: m1, deliverableType: 'code', deliverableContent: CLEAN });
  assert.equal(good.data.verdict, 'AUTO_RELEASE_PAYOUT');

  const skip = await call(`/api/agreements/${deal.id}/milestones/M2/release`, {});
  assert.ok([403, 409].includes(skip.status), 'milestone 2 cannot be paid first');

  const paid = await call(`/api/agreements/${deal.id}/milestones/M1/release`, {});
  assert.equal(paid.status, 200);
  assert.equal(paid.data.releasedAmount, m1.amount);
  assert.equal(paid.data.dealCompleted, false);
  assert.equal((await call(`/api/agreements/${deal.id}/milestones/M1/release`, {})).status, 409, 'no double payment');
});

test('dispute settlement pays the freelancer share and closes the deal', async () => {
  const { deal, order } = await fundedDeal();
  await call('/api/paypal/authorize-order', { orderId: order.orderId, agreementId: deal.id });
  const s = await call(`/api/agreements/${deal.id}/settle-dispute`, { freelancerAmount: deal.totalBudget * 0.5, ruling: 'test' });
  assert.equal(s.status, 200);
  assert.equal(s.data.freelancerPaid + s.data.buyerRefunded, deal.totalBudget);
  const after = (await call(`/api/agreements/${deal.id}`)).data;
  assert.equal(after.escrowStatus, 'ARBITRATED_SPLIT');
  assert.ok(after.milestones.every((m) => m.status === 'RELEASED'));
});

test('arbitration follows the audit score when evidence exists', async () => {
  const a = await call('/api/arbitrate-dispute', { contract: { title: 'T', totalBudget: 200 }, clientClaim: 'bad', freelancerClaim: 'good', evidenceScore: 60 });
  assert.equal(a.data.allocation.freelancerPayoutPercent, 60);
});
