import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDeliverable } from '../../../server/aiEngine.js';

describe('Tier 1 — Feature 06: Dynamic Code & Syntax Inspector', () => {
  const milestone = {
    id: 'M1',
    name: 'Milestone 1: PayPal Checkout Integration',
    criteria: [
      'Valid modular syntax with balanced delimiters and zero stubs',
      'Clean exported component/service with async lifecycle handling',
      'PayPal SDK / REST order lifecycle & responsive layout compliance'
    ]
  };

  it('should award >=90% score and AUTO_RELEASE_PAYOUT verdict for clean modular code with PayPal lifecycle', async () => {
    const cleanCode = `
      export default async function handlePayPalCheckout(orderData) {
        try {
          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
          });
          if (!response.ok) throw new Error('Order creation failed');
          const order = await response.json();
          return order.orderId;
        } catch (error) {
          console.error('Checkout error:', error);
          return null;
        }
      }
    `;

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: cleanCode,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai',
      deliverableUrl: 'https://nexuspay-ai.onrender.com'
    });

    assert.ok(result.overallScore >= 90, `Score was ${result.overallScore}, expected >= 90`);
    assert.equal(result.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.equal(result.auditCertificate.payoutAuthorized, true);
    assert.equal(result.criteriaBreakdown.length, 3);
    for (const c of result.criteriaBreakdown) {
      assert.equal(c.passed, true);
      assert.ok(c.score >= 80);
    }
  });

  it('should penalize broken syntax with unbalanced braces or parentheses to <78% with REVISE_DELIVERABLE', async () => {
    const brokenCode = `
      export async function checkout() {
        if (true) {
          try {
            const res = await PayPal.capture();
        // Missing closing braces for try, if, and function
    `;

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: brokenCode
    });

    assert.ok(result.overallScore < 78, `Score was ${result.overallScore}, expected < 78`);
    assert.equal(result.verdict, 'REVISE_DELIVERABLE');
    assert.equal(result.auditCertificate.payoutAuthorized, false);
    assert.ok(result.criteriaBreakdown[0].notes.includes('unbalanced delimiters'));
  });

  it('should penalize unresolved TODO/FIXME markers or unimplemented exception stubs', async () => {
    const stubCode = `
      export async function processData(input) {
        // TODO: implement real data transformation
        throw new Error('not implemented yet');
      }
    `;

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: stubCode
    });

    assert.ok(result.overallScore < 78, `Expected score < 78, got ${result.overallScore}`);
    assert.equal(result.verdict, 'REVISE_DELIVERABLE');
    assert.ok(result.criteriaBreakdown[0].notes.includes('unresolved TODO/FIXME'));
  });

  it('should severely penalize trivial submissions shorter than 35 characters', async () => {
    const trivialCode = `// Just a brief note`;

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: trivialCode
    });

    assert.ok(result.overallScore <= 35, `Score was ${result.overallScore}, expected <= 35`);
    assert.equal(result.verdict, 'REVISE_DELIVERABLE');
    assert.ok(result.criteriaBreakdown[0].notes.includes('empty or trivially short'));
  });

  it('should trigger MANUAL_CLIENT_REVIEW verdict for moderate score (78-89%) when missing export or PayPal markers', async () => {
    // Valid code but lacks export declaration and PayPal markers
    const missingExportCode = `
      async function calculateHash(input) {
        try {
          const res = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
          return Array.from(new Uint8Array(res)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
          return null;
        }
      }
    `;

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: missingExportCode,
      repoUrl: 'https://github.com/example/repo'
    });

    assert.ok(
      result.overallScore >= 78 && result.overallScore < 90,
      `Expected score between 78 and 89, got ${result.overallScore}`
    );
    assert.equal(result.verdict, 'MANUAL_CLIENT_REVIEW');
    assert.equal(result.auditCertificate.payoutAuthorized, false);
  });

  it('should seamlessly execute DLP scrubbing before static inspection on code with leaked secrets', async () => {
    const codeWithSecret = `
      const API_KEY = "test_secret_live_998877665544332211aabbcc";
      export async function checkout() {
        try {
          return await PayPal.createOrder();
        } catch (err) {
          return null;
        }
      }
    `;

    const result = await evaluateDeliverable({
      milestone,
      deliverableContent: codeWithSecret,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai'
    });

    assert.ok(result.dlpProtection.redactionCount >= 1);
    assert.equal(result.dlpProtection.scrubbedPreview.includes('test_secret_live_'), false);
    assert.ok(result.overallScore >= 90);
    assert.equal(result.verdict, 'AUTO_RELEASE_PAYOUT');
  });
});
