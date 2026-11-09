import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPayPalMcpCapabilities,
  getPayPalTelemetry,
  createPayPalOrder
} from '../../../server/paypalClient.js';

describe('Tier 1 — Feature 01: Official @paypal/agent-toolkit MCP & Telemetry', () => {
  it('should inspect MCP server capabilities and package metadata', () => {
    const capabilities = getPayPalMcpCapabilities();

    assert.equal(capabilities.sdkPackage, '@paypal/agent-toolkit/mcp');
    assert.equal(capabilities.sdkVersion, '1.11.0');
    assert.equal(typeof capabilities.sandbox, 'boolean');
    assert.ok(Array.isArray(capabilities.registeredTools));
    assert.ok(capabilities.registeredTools.length >= 10);
  });

  it('should register all 10 required MCP tools for autonomous agent commerce', () => {
    const capabilities = getPayPalMcpCapabilities();
    const requiredTools = [
      'create_invoice',
      'list_invoices',
      'send_invoice',
      'create_shipment_tracking',
      'get_shipment_tracking',
      'create_order',
      'get_order',
      'pay_order',
      'list_disputes',
      'get_dispute'
    ];

    for (const tool of requiredTools) {
      assert.ok(
        capabilities.registeredTools.includes(tool),
        `Expected registered MCP tools to include '${tool}'`
      );
    }
  });

  it('should log operations in the live MCP telemetry ring-buffer', async () => {
    const initialTelemetry = getPayPalTelemetry();
    const initialCount = initialTelemetry.length;

    const order = await createPayPalOrder({
      amount: 175.5,
      currency: 'USD',
      description: 'Telemetry verification escrow order',
      customId: 'SMA-TEL-001'
    });

    assert.ok(order.orderId);

    const updatedTelemetry = getPayPalTelemetry();
    assert.ok(updatedTelemetry.length >= initialCount);

    const latestEntry = updatedTelemetry[0];
    assert.equal(latestEntry.tool, 'create_order');
    assert.equal(latestEntry.endpoint, '/v2/checkout/orders');
    assert.equal(latestEntry.method, 'POST');
    assert.equal(latestEntry.status, 201);
    assert.ok(['live_sandbox', 'sandbox_emulator'].includes(latestEntry.mode));
    assert.ok(typeof latestEntry.latencyMs === 'number' && latestEntry.latencyMs >= 0);
    assert.ok(latestEntry.summary.includes('175.50'));
  });

  it('should maintain ring-buffer bounds at maximum 50 entries', async () => {
    // Fire multiple mock orders to test buffer capping
    for (let i = 0; i < 55; i++) {
      await createPayPalOrder({
        amount: 10 + i,
        currency: 'USD',
        description: `Stress buffer ${i}`,
        customId: `SMA-BUF-${i}`
      });
    }

    const telemetry = getPayPalTelemetry();
    assert.ok(telemetry.length <= 50, `Telemetry buffer length was ${telemetry.length}, expected <= 50`);
  });

  it('should accept custom Client ID and Client Secret in capability introspection', () => {
    const customId = 'CUSTOM_TEST_CLIENT_ID_99';
    const customSecret = 'CUSTOM_TEST_SECRET_KEY_99';

    const capabilities = getPayPalMcpCapabilities(customId, customSecret);
    assert.equal(capabilities.sdkPackage, '@paypal/agent-toolkit/mcp');
    assert.ok(Array.isArray(capabilities.registeredTools));
    assert.ok(capabilities.registeredTools.includes('create_order'));
  });

  it('should include payloadPreview and ISO timestamp in every telemetry event', async () => {
    await createPayPalOrder({
      amount: 88.0,
      currency: 'USD',
      description: 'Payload structure verification',
      customId: 'SMA-TEL-STRUCT'
    });

    const telemetry = getPayPalTelemetry();
    const latest = telemetry[0];

    assert.ok(latest.id.startsWith('MCP-'));
    assert.ok(!isNaN(Date.parse(latest.timestamp)));
    assert.ok(latest.payloadPreview !== null && typeof latest.payloadPreview === 'object');
    assert.equal(latest.payloadPreview.intent, 'CAPTURE');
  });
});
