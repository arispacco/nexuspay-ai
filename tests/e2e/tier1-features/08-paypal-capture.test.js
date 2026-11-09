import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 1 — Feature 08: Autonomous PayPal Milestone Capture', () => {
  it('should capture an existing PayPal escrow order and return a unique Capture ID', async () => {
    const order = await createPayPalOrder({
      amount: 320.0,
      description: 'Capture test escrow'
    });

    const capture = await capturePayPalOrder({ orderId: order.orderId });

    assert.equal(capture.success, true);
    assert.equal(capture.orderId, order.orderId);
    assert.ok(capture.captureId);
    assert.ok(capture.captureId.startsWith('CAP-'));
    assert.equal(capture.status, 'COMPLETED');
  });

  it('should confirm instant payout disbursement and valid ISO release timestamp', async () => {
    const order = await createPayPalOrder({ amount: 150.0 });
    const capture = await capturePayPalOrder({ orderId: order.orderId });

    assert.equal(capture.payoutMethod, 'PayPal Instant Payout');
    assert.ok(!isNaN(Date.parse(capture.releasedAt)));
  });

  it('should log capture execution in the MCP telemetry audit stream', async () => {
    const order = await createPayPalOrder({ amount: 200.0, customId: 'SMA-CAP-TEL' });
    const capture = await capturePayPalOrder({ orderId: order.orderId });

    const telemetry = getPayPalTelemetry();
    const entry = telemetry.find(
      (t) => t.tool === 'pay_order' && t.payloadPreview?.captureId === capture.captureId
    );

    assert.ok(entry, 'Expected telemetry entry for pay_order');
    assert.equal(entry.endpoint, `/v2/checkout/orders/${order.orderId}/capture`);
    assert.equal(entry.method, 'POST');
    assert.equal(entry.status, 201);
    assert.equal(entry.payloadPreview.status, 'COMPLETED');
  });

  it('should generate distinct Capture IDs for multiple subsequent captures', async () => {
    const order1 = await createPayPalOrder({ amount: 100 });
    const order2 = await createPayPalOrder({ amount: 200 });

    const cap1 = await capturePayPalOrder({ orderId: order1.orderId });
    const cap2 = await capturePayPalOrder({ orderId: order2.orderId });

    assert.notEqual(cap1.captureId, cap2.captureId);
  });

  it('should support simulated sandbox mode without external network failures', async () => {
    const capture = await capturePayPalOrder({
      orderId: '8XP999888777MOCK',
      clientId: 'test',
      clientSecret: 'test_secret'
    });

    assert.equal(capture.success, true);
    assert.equal(capture.mode, 'simulated_sandbox');
    assert.equal(capture.status, 'COMPLETED');
  });

  it('should safely capture when orderId is provided with fallback mock ID if missing', async () => {
    const capture = await capturePayPalOrder({});

    assert.equal(capture.success, true);
    assert.ok(capture.captureId.startsWith('CAP-'));
  });
});
