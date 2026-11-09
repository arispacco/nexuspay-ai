import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDeliverable } from '../../../server/aiEngine.js';
import { sanitizeDeliverableInRam } from '../../../server/privacyShield.js';

describe('Tier 2 — Boundary 02: Payload & Code Boundaries', () => {
  const milestone = {
    id: 'M1',
    criteria: [
      'Valid modular syntax with balanced delimiters and zero stubs',
      'Clean exported component/service with async lifecycle handling',
      'PayPal SDK / REST order lifecycle & responsive layout compliance'
    ]
  };

  it('should reject empty string payload with critical length penalty and REVISE_DELIVERABLE', async () => {
    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: ''
    });

    assert.equal(result.verdict, 'REVISE_DELIVERABLE');
    assert.ok(result.overallScore <= 35);
    assert.equal(result.dlpProtection.redactionCount, 0);
  });

  it('should process a massive 10,000-line deliverable without stack overflow or catastrophic regex backtracking', async () => {
    // Generate a 10,000-line valid ES module with PayPal integration
    const lines = [
      'export async function massiveEnterpriseEscrowService() {',
      '  try {',
      '    const client = new PayPal.Client();'
    ];

    for (let i = 0; i < 10000; i++) {
      lines.push(`    const logEntry_${i} = "audit_record_${i}";`);
    }

    lines.push('    return await client.capture();');
    lines.push('  } catch (err) {');
    lines.push('    return null;');
    lines.push('  }');
    lines.push('}');

    const massivePayload = lines.join('\n');
    assert.ok(massivePayload.length > 250000);

    const t0 = Date.now();
    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: massivePayload,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai'
    });
    const elapsed = Date.now() - t0;

    assert.ok(result);
    assert.ok(result.overallScore >= 90);
    assert.equal(result.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.ok(elapsed < 2000, `Massive inspection took ${elapsed}ms, expected < 2000ms`);
  });

  it('should preserve unicode, emojis, and non-ASCII characters without encoding corruption', async () => {
    const unicodePayload = `
      // 🚀 NexusPay AI 跨境支付模块 • ゼロ知識証明 • 決済システム
      export async function processMultiCurrencyCheckout() {
        try {
          const notes = "Transactions in € EUR, £ GBP, and ¥ JPY 🛡️";
          return await PayPal.createOrder({ note: notes });
        } catch (e) {
          return null;
        }
      }
    `;

    const dlpResult = sanitizeDeliverableInRam(unicodePayload);
    assert.ok(dlpResult.scrubbedContent.includes('🚀 NexusPay AI 跨境支付模块'));
    assert.ok(dlpResult.scrubbedContent.includes('ゼロ知識証明'));
    assert.ok(dlpResult.scrubbedContent.includes('€ EUR, £ GBP, and ¥ JPY 🛡️'));

    const evalResult = await evaluateDeliverable({
      milestone,
      deliverableContent: unicodePayload,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai'
    });

    assert.ok(evalResult.overallScore >= 90);
    assert.equal(evalResult.verdict, 'AUTO_RELEASE_PAYOUT');
  });

  it('should correctly balance 100 levels of nested brackets and parentheses without delimiter error', async () => {
    let nestedCode = 'export async function deeplyNested() { try { return await PayPal.capture(';
    for (let i = 0; i < 100; i++) {
      nestedCode += '({ level: ';
    }
    nestedCode += '100';
    for (let i = 0; i < 100; i++) {
      nestedCode += ' })';
    }
    nestedCode += '); } catch(e) { return null; } }';

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: nestedCode,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai'
    });

    assert.ok(result.overallScore >= 90);
    assert.equal(result.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.ok(result.criteriaBreakdown[0].notes.includes('Balanced delimiters'));
  });

  it('should detect unbalanced delimiters when one bracket is missing in nested code', async () => {
    let unbalanceNested = 'export async function deeplyNested() { try { return await PayPal.capture(';
    for (let i = 0; i < 50; i++) {
      unbalanceNested += '{ ';
    }
    unbalanceNested += 'val: 1';
    for (let i = 0; i < 49; i++) { // One bracket missing!
      unbalanceNested += ' }';
    }
    unbalanceNested += '); } catch(e) { return null; } }';

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: unbalanceNested
    });

    assert.ok(result.overallScore < 78);
    assert.equal(result.verdict, 'REVISE_DELIVERABLE');
    assert.ok(result.criteriaBreakdown[0].notes.includes('unbalanced delimiters'));
  });

  it('should reject deliverable consisting entirely of whitespace, newlines, and tabs', async () => {
    const whitespacePayload = '   \n\n\t\t\r\n    \t  \n  ';

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: whitespacePayload
    });

    assert.equal(result.verdict, 'REVISE_DELIVERABLE');
    assert.ok(result.overallScore <= 35);
  });
});
