// src/components/HoodDrawer.jsx — an honest "what is real here" panel plus the live PayPal call log.
import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function HoodDrawer({ status, onClose }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api('/api/paypal/mcp-tools').then(setInfo).catch(() => setInfo(null));
  }, []);

  const live = status?.paypal === 'live';

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer hood" aria-label="How it works">
        <div className="drawer-head">
          <div>
            <h2>How it works</h2>
            <p className="sub">What is real in this build, and what is not.</p>
          </div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <h3>The flow</h3>
        <ul>
          <li>Two AI agents turn your brief into a contract with two milestones.</li>
          <li>PayPal places the budget on hold with an <b>authorization</b>. Nothing is paid yet.</li>
          <li>Each delivery is checked. A pass triggers a PayPal <b>partial capture</b> for that milestone only.</li>
          <li>In a dispute, an AI arbitrator splits what is left; the final capture closes the hold and PayPal returns the rest.</li>
        </ul>

        <h3>Real or simulated</h3>
        <ul>
          <li>
            <b>PayPal:</b>{' '}
            {live
              ? 'connected to the real PayPal sandbox. Orders, authorizations and captures are real sandbox objects.'
              : 'simulated on this server, because no sandbox keys are configured. The calls and IDs are emulated with the same shapes.'}
          </li>
          <li>
            <b>AI:</b>{' '}
            {status?.ai === 'gemini'
              ? 'Google Gemini reviews the code and writes the contract.'
              : 'a rule-based code analyser (syntax, structure, PayPal usage, secrets). Set a Gemini key to add an LLM review.'}
          </li>
          <li>
            <b>Confidential mode:</b> an HMAC-signed test report. It proves the results were not edited, but it is not a zero-knowledge proof.
          </li>
        </ul>

        <h3>Recent PayPal calls</h3>
        {info?.telemetry?.length ? (
          <table className="calls">
            <thead>
              <tr><th>Tool</th><th>Endpoint</th><th>Mode</th></tr>
            </thead>
            <tbody>
              {info.telemetry.slice(0, 8).map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.tool}</td>
                  <td className="mono">{t.endpoint.replace('/v2/', '')}</td>
                  <td>{t.mode === 'live_sandbox' ? 'sandbox' : 'simulated'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small">No call yet. Start a deal and they will appear here.</p>
        )}
        {info?.sdkPackage && (
          <p className="small" style={{ marginTop: 14 }}>
            Tools come from the official <code>{info.sdkPackage}</code> ({info.registeredTools.length} registered).
          </p>
        )}
      </aside>
    </>
  );
}
