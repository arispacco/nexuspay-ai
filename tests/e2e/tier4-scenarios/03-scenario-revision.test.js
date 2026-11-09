import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDeliverable } from '../../../server/aiEngine.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalTelemetry
} from '../../../server/paypalClient.js';

describe('Tier 4 — Scenario 03: Broken Syntax Build ($180 Escrow Guard & Revision Cycle)', () => {
  const milestone = {
    id: 'M1',
    name: 'Milestone 1: Core Checkout Module',
    amount: 180,
    criteria: [
      'Valid ES syntax with balanced delimiters',
      'Exported module with async capture error guards',
      'PayPal SDK / order lifecycle integration'
    ]
  };

  it('should freeze escrow on broken syntax and only disburse payout upon clean revision', async () => {
    // Stage 1: Deposit $180 into PayPal Escrow
    const escrowOrder = await createPayPalOrder({
      amount: 180.0,
      currency: 'USD',
      description: 'Checkout Widget & Responsive UI Tokens',
      customId: 'SMA-1802-REVISION'
    });

    assert.equal(escrowOrder.success, true);
    assert.equal(escrowOrder.escrowState, 'LOCKED');

    // Stage 2: Submission 1 — Incomplete draft with unbalanced braces and missing PayPal integration
    const brokenSyntaxSubmission = `
      // Incomplete draft with unbalanced braces and missing PayPal integration
      function brokenDraft() {
        // TODO: not implemented yet
        if (true) {
          console.log("unfinished");
    `;

    const firstAudit = await evaluateDeliverable({
      milestone,
      deliverableContent: brokenSyntaxSubmission
    });

    // Stage 3: Escrow Guard triggers — Score < 78%, REVISE_DELIVERABLE verdict
    assert.ok(
      firstAudit.overallScore < 78,
      `Expected score < 78 for broken draft, got ${firstAudit.overallScore}`
    );
    assert.equal(firstAudit.verdict, 'REVISE_DELIVERABLE');
    assert.equal(firstAudit.auditCertificate.payoutAuthorized, false);
    assert.ok(firstAudit.criteriaBreakdown[0].notes.includes('unbalanced delimiters'));

    // Capture must NOT be called for failing deliverables
    assert.equal(firstAudit.auditCertificate.payoutAuthorized, false);

    // Stage 4: Submission 2 (Revision) — Fixed syntax, balanced braces, clean export and PayPal hooks
    const revisedCleanSubmission = `
      import { PayPalButtons } from '@paypal/react-paypal-js';

      export function CleanCheckoutWidget({ amount, onCaptureSuccess }) {
        return (
          <div className="checkout-widget">
            <PayPalButtons
              createOrder={(data, actions) => {
                return actions.order.create({
                  purchase_units: [{ amount: { value: String(amount) } }]
                });
              }}
              onApprove={async (data, actions) => {
                try {
                  const details = await actions.order.capture();
                  onCaptureSuccess(details);
                } catch (err) {
                  console.error("Capture failure:", err);
                }
              }}
            />
          </div>
        );
      }
    `;

    const secondAudit = await evaluateDeliverable({
      milestone,
      deliverableContent: revisedCleanSubmission,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai'
    });

    // Stage 5: Revision approved — Score >= 90%, AUTO_RELEASE_PAYOUT verdict
    assert.ok(
      secondAudit.overallScore >= 90,
      `Expected revised score >= 90, got ${secondAudit.overallScore}`
    );
    assert.equal(secondAudit.verdict, 'AUTO_RELEASE_PAYOUT');
    assert.equal(secondAudit.auditCertificate.payoutAuthorized, true);

    // Stage 6: Autonomous Escrow Payout now authorized and executed
    const capture = await capturePayPalOrder({ orderId: escrowOrder.orderId });

    assert.equal(capture.success, true);
    assert.ok(capture.captureId.startsWith('CAP-'));
    assert.equal(capture.status, 'COMPLETED');
  });

  it('should provide specific actionable diagnosis in criteria breakdown for syntax defects', async () => {
    const unclosedParenCode = `
      export function parseOrder( ( {
        return true;
      }
    `;

    const audit = await evaluateDeliverable({
      milestone,
      deliverableContent: unclosedParenCode
    });

    assert.equal(audit.verdict, 'REVISE_DELIVERABLE');
    assert.ok(audit.criteriaBreakdown[0].notes.includes('unbalanced delimiters'));
    assert.equal(audit.criteriaBreakdown[0].passed, false);
  });

  it('should protect against accidental release when score is in manual review territory (78-89%)', async () => {
    // Valid code but lacks commerce integration markers
    const genericCode = `
      export async function calculateFibonacci(n) {
        try {
          if (n <= 1) return n;
          return await calculateFibonacci(n - 1) + await calculateFibonacci(n - 2);
        } catch (e) {
          return 0;
        }
      }
    `;

    const audit = await evaluateDeliverable({
      milestone,
      deliverableContent: genericCode,
      repoUrl: 'https://github.com/example/repo'
    });

    assert.ok(audit.overallScore >= 78 && audit.overallScore < 90);
    assert.equal(audit.verdict, 'MANUAL_CLIENT_REVIEW');
    assert.equal(audit.auditCertificate.payoutAuthorized, false);
  });

  it('should verify that DLP sanitization occurs transparently during revision checks', async () => {
    const codeWithSecretAndCleanSyntax = `
      const API_KEY = "test_secret_live_12345678901234567890";
      export async function processOrder() {
        try {
          return await PayPal.capture();
        } catch (e) {
          return null;
        }
      }
    `;

    const audit = await evaluateDeliverable({
      milestone,
      deliverableContent: codeWithSecretAndCleanSyntax,
      repoUrl: 'https://github.com/arispacco/nexuspay-ai'
    });

    assert.ok(audit.dlpProtection.redactionCount >= 1);
    assert.equal(audit.dlpProtection.scrubbedPreview.includes('test_secret_live_'), false);
    assert.equal(audit.verdict, 'AUTO_RELEASE_PAYOUT');
  });
});
