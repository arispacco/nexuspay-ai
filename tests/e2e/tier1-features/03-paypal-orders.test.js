import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPayPalOrder, getPayPalTelemetry } from '../../../server/paypalClient.js';

describe('Tier 1 — Feature 03: PayPal Orders v2 Escrow Lock', () => {
  it('should create an escrow order returning a valid PayPal Order ID', async () => {
    const order = await createPayPalOrder({
      amount: 250.0,
      currency: 'USD',
      description: 'Milestone Escrow Hold for Feature 03',
      customId: 'SMA-ORDER-001'
    });

    assert.equal(order.success, true);
    assert.ok(order.orderId);
    assert.ok(order.orderId.startsWith('8XP') || order.mode === 'live_sandbox');
    assert.ok(['CREATED', 'SAVED', 'APPROVED'].includes(order.status));
  });

  it('should lock funds with escrowState LOCKED and formatted amount and currency', async () => {
    const order = await createPayPalOrder({
      amount: 420.75,
      currency: 'USD',
      description: 'Autonomous Escrow Deposit',
      customId: 'SMA-ORDER-002'
    });

    assert.equal(order.escrowState, 'LOCKED');
    assert.deepEqual(order.amount, {
      currency: 'USD',
      value: '420.75'
    });
    assert.equal(order.description, 'Autonomous Escrow Deposit');
    assert.ok(!isNaN(Date.parse(order.createdAt)));
  });

  it('should include HATEOAS approval and capture action links', async () => {
    const order = await createPayPalOrder({
      amount: 150.0,
      customId: 'SMA-ORDER-LINKS'
    });

    assert.ok(Array.isArray(order.links));
    assert.ok(order.links.length >= 2);

    const approveLink = order.links.find((l) => l.rel === 'approve');
    const captureLink = order.links.find((l) => l.rel === 'capture');

    assert.ok(approveLink, 'Expected an approval HATEOAS link');
    assert.equal(approveLink.method, 'GET');
    assert.ok(approveLink.href.includes(order.orderId));

    assert.ok(captureLink, 'Expected a capture HATEOAS link');
    assert.equal(captureLink.method, 'POST');
    assert.ok(captureLink.href.includes(order.orderId));
  });

  it('should link customId agreement identifier through to telemetry audit preview', async () => {
    const customAgreementId = 'SMA-AGREEMENT-LINK-999';

    await createPayPalOrder({
      amount: 300.0,
      currency: 'USD',
      customId: customAgreementId
    });

    const telemetry = getPayPalTelemetry();
    const match = telemetry.find((t) => t.payloadPreview?.custom_id === customAgreementId);

    assert.ok(match, 'Expected telemetry to record custom_id tracking');
    assert.equal(match.tool, 'create_order');
    assert.equal(match.payloadPreview.amount.value, '300.00');
  });

  it('should support alternative currencies like EUR and GBP with proper formatting', async () => {
    const eurOrder = await createPayPalOrder({
      amount: 320.5,
      currency: 'EUR',
      description: 'Euro Escrow Milestone'
    });

    assert.equal(eurOrder.amount.currency, 'EUR');
    assert.equal(eurOrder.amount.value, '320.50');

    const gbpOrder = await createPayPalOrder({
      amount: 199.99,
      currency: 'GBP',
      description: 'British Pound Escrow Milestone'
    });

    assert.equal(gbpOrder.amount.currency, 'GBP');
    assert.equal(gbpOrder.amount.value, '199.99');
  });

  it('should activate simulated sandbox mode when running with test or unconfigured credentials', async () => {
    const order = await createPayPalOrder({
      amount: 100.0,
      clientId: 'test',
      clientSecret: 'test_secret'
    });

    assert.equal(order.success, true);
    assert.equal(order.mode, 'simulated_sandbox');
    assert.ok(order.orderId.startsWith('8XP'));
  });
});
