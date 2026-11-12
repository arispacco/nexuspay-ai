// src/components/FundStep.jsx — step 2: place the budget on hold with PayPal (authorization, not payment).
import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { api, money } from '../api.js';

export default function FundStep({ deal, status, onFunded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const live = status?.paypal === 'live' && status.paypalClientId;

  const orderBody = {
    amount: deal.totalBudget,
    currency: deal.currency,
    description: `${deal.title} (escrow hold)`,
    customId: deal.id,
    intent: 'AUTHORIZE',
    privacyMode: deal.ndaProtected ? 'ZK-NDA' : 'ZDR-DLP'
  };

  async function simulateApproval() {
    setBusy(true);
    setError('');
    try {
      const order = await api('/api/paypal/create-order', { body: orderBody });
      await api('/api/paypal/authorize-order', { body: { orderId: order.orderId, agreementId: deal.id } });
      await onFunded();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="deal-top">
        <div>
          <h2>{deal.title}</h2>
          <p className="sub">
            PayPal reserves this amount on the buyer’s account. Nothing reaches the freelancer until a milestone is verified, and
            whatever is not earned goes back to the buyer.
          </p>
        </div>
        <div className="amount">
          {money(deal.totalBudget, deal.currency)}
          <small>held, not paid</small>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        {live ? (
          <PayPalScriptProvider
            options={{ clientId: status.paypalClientId, currency: deal.currency, intent: 'authorize', components: 'buttons' }}
          >
            <PayPalButtons
              style={{ layout: 'vertical', shape: 'pill', label: 'paypal' }}
              disabled={busy}
              createOrder={async () => {
                const order = await api('/api/paypal/create-order', { body: orderBody });
                return order.orderId;
              }}
              onApprove={async (data) => {
                setBusy(true);
                try {
                  await api('/api/paypal/authorize-order', { body: { orderId: data.orderID, agreementId: deal.id } });
                  await onFunded();
                } catch (err) {
                  setError(err.message);
                  setBusy(false);
                }
              }}
              onError={(err) => setError(String(err?.message || err))}
            />
          </PayPalScriptProvider>
        ) : (
          <>
            <button className="btn primary block" onClick={simulateApproval} disabled={busy}>
              {busy && <span className="spinner" />}
              {busy ? 'Placing the hold…' : `Hold ${money(deal.totalBudget, deal.currency)} (simulated PayPal)`}
            </button>
            <div className="notice">
              This server has no PayPal sandbox keys, so PayPal is simulated. Add <code>PAYPAL_CLIENT_ID</code> and{' '}
              <code>PAYPAL_CLIENT_SECRET</code> to use the real PayPal sandbox with this same button flow.
            </div>
          </>
        )}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
