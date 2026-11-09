// src/components/McpTelemetryBar.jsx
import React, { useState, useEffect } from 'react';
import { Terminal, ChevronUp, ChevronDown, RefreshCw, CheckCircle2, Activity, Cpu } from 'lucide-react';

export default function McpTelemetryBar({ refreshTrigger }) {
  const [expanded, setExpanded] = useState(false);
  const [mcpData, setMcpData] = useState({
    registeredTools: [
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
    ],
    telemetry: [],
    sdkPackage: '@paypal/agent-toolkit/mcp'
  });

  const loadTelemetry = async () => {
    try {
      const res = await fetch('/api/paypal/mcp-tools');
      const data = await res.json();
      setMcpData(data);
    } catch {
      // safe fallback if offline
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, [refreshTrigger]);

  const getToolBadgeStyle = (tool) => {
    if (tool?.includes('order') || tool?.includes('pay')) {
      return { bg: 'rgba(0, 112, 186, 0.12)', color: 'var(--pp-blue)', border: 'rgba(0, 112, 186, 0.25)' };
    }
    if (tool?.includes('invoice')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.25)' };
    }
    if (tool?.includes('dispute')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.25)' };
    }
    return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: 'rgba(16, 185, 129, 0.25)' };
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
      fontSize: '0.78rem',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      <div className="app-container" style={{ padding: '0.65rem 1.5rem' }}>
        {/* Clickable Header Bar */}
        <div
          onClick={() => { setExpanded(!expanded); loadTelemetry(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setExpanded(!expanded); loadTelemetry(); } }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            flexWrap: 'wrap',
            gap: '0.65rem',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 112, 186, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pp-blue)'
            }}>
              <Terminal size={14} />
            </div>
            <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
              PayPal Agent Toolkit &amp; Model Context Protocol (MCP) Stream
            </span>
            <span className="privacy-chip zk" style={{ fontSize: '0.68rem' }}>
              <Cpu size={12} />
              {mcpData.sdkPackage || '@paypal/agent-toolkit/mcp'} • {mcpData.registeredTools?.length || 10} Tools Active
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-secondary)' }}>
            <span className="font-mono" style={{ fontSize: '0.74rem' }}>
              {mcpData.telemetry?.length || 0} event(s) logged
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
          </div>
        </div>

        {/* Expanded Telemetry Details */}
        {expanded && (
          <div style={{
            marginTop: '0.85rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            {/* Registered Tools Chips Toolbar */}
            <div style={{
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="body-secondary" style={{ fontSize: '0.74rem', fontWeight: 600, marginRight: '0.25rem' }}>
                  Introspected MCP Capabilities:
                </span>
                {(mcpData.registeredTools || []).map((tool) => {
                  const style = getToolBadgeStyle(tool);
                  return (
                    <span
                      key={tool}
                      style={{
                        backgroundColor: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '5px',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600
                      }}
                    >
                      {tool}
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); loadTelemetry(); }}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
              >
                <RefreshCw size={12} />
                <span>Refresh Stream</span>
              </button>
            </div>

            {/* Telemetry Stream Rows */}
            {mcpData.telemetry?.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '0.35rem'
              }}>
                {mcpData.telemetry.map((entry, idx) => {
                  const style = getToolBadgeStyle(entry.tool);
                  return (
                    <div
                      key={entry.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '7px',
                        fontSize: '0.74rem',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                        <CheckCircle2 size={13} color="#10B981" />
                        <span style={{
                          backgroundColor: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`,
                          padding: '0.12rem 0.4rem',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.68rem'
                        }}>
                          {entry.tool}
                        </span>
                        <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                          {entry.method} {entry.endpoint}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          — {entry.summary}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="font-mono" style={{
                          color: entry.status < 300 ? '#10B981' : '#EF4444',
                          fontWeight: 600
                        }}>
                          HTTP {entry.status}
                        </span>
                        <span className="font-mono" style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>
                          • {entry.latencyMs}ms
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '1.25rem 0',
                color: 'var(--text-muted)',
                fontSize: '0.78rem'
              }}>
                Execute an Escrow Lock, Milestone Invoice, Deliverable Capture, or Arbitrated Refund above to stream real-time PayPal MCP tool executions.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
