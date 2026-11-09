// src/components/EscrowLedgerGrid.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  DollarSign,
  Search,
  Download,
  RefreshCw,
  Shield,
  CheckCircle,
  Clock,
  Lock,
  Zap,
  Check,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import TransactionInspectorDrawer from './TransactionInspectorDrawer.jsx';

// Required for AG Grid v33+ modular architecture
ModuleRegistry.registerModules([AllCommunityModule]);

export default function EscrowLedgerGrid() {
  const [rowData, setRowData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWebhookAlert, setLiveWebhookAlert] = useState(null);
  const gridRef = useRef(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      const rows = data.transactions || [];
      setRowData(rows);
      if (!selectedTx && rows.length > 0) {
        setSelectedTx(rows[0]);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Status filtering matching requirement: All, Locked, Released, Arbitrated
  const filteredRows = useMemo(() => {
    if (statusFilter === 'ALL') return rowData;
    if (statusFilter === 'LOCKED') {
      return rowData.filter((r) => r.status === 'ESCROW_LOCKED');
    }
    if (statusFilter === 'RELEASED') {
      return rowData.filter((r) => r.status === 'RELEASED' || r.status === 'COMPLETED');
    }
    if (statusFilter === 'ARBITRATED') {
      return rowData.filter(
        (r) =>
          r.status === 'ARBITRATED_SPLIT' ||
          r.status === 'ARBITRATED' ||
          r.status === 'REFUNDED_PARTIAL' ||
          r.status === 'REFUNDED'
      );
    }
    return rowData;
  }, [rowData, statusFilter]);

  // Interactive Live Webhook Event Simulation
  const handleSimulateWebhook = async () => {
    setIsSimulating(true);

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newTxId = `TXN-WH-${randomNum}`;
    const newOrderId = `8XP${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const newCaptureId = `CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const agreementId = `SMA-${randomNum}`;
    const amount = Number((250 + Math.floor(Math.random() * 5) * 50).toFixed(2));
    const nowIso = new Date().toISOString();
    const proofHash = `sha256:${Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const webhookPayload = {
      id: `WH-SIM-${Date.now()}`,
      event_version: '1.0',
      create_time: nowIso,
      resource_type: 'capture',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      summary: `Payment capture of $${amount.toFixed(2)} USD completed for Autonomous Escrow Milestone`,
      resource: {
        id: newCaptureId,
        amount: { currency_code: 'USD', value: amount.toFixed(2) },
        status: 'COMPLETED',
        custom_id: agreementId,
        supplementary_data: {
          related_ids: { order_id: newOrderId }
        }
      }
    };

    const newTx = {
      id: newTxId,
      agreementId,
      milestoneId: 'M1',
      project: 'Milestone 2: Real-Time Webhook Gateway Verification',
      projectTitle: 'Milestone 2: Real-Time Webhook Gateway Verification',
      buyer: 'Atlas (Buyer Agent)',
      freelancer: 'Nova (Seller Agent)',
      amount,
      currency: 'USD',
      paypalOrderId: newOrderId,
      paypalCaptureId: newCaptureId,
      status: 'RELEASED',
      privacyMode: 'ZK-NDA',
      aiScore: 98,
      proofHash,
      date: nowIso,
      createdAt: nowIso,
      type: 'PayPal Webhook Capture Confirmation',
      rawPayload: webhookPayload
    };

    // Post to server webhook endpoint for persistence & audit trail
    try {
      await fetch('/api/paypal/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-transmission-id': `WH-TX-${Date.now()}`,
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-SBX-01',
          'paypal-transmission-sig': `MOCK_SIG_${Date.now()}`,
          'paypal-transmission-time': nowIso
        },
        body: JSON.stringify(webhookPayload)
      });
    } catch (err) {
      console.warn('Webhook transmission background sync notice:', err);
    }

    // Insert into grid with smooth animation
    setRowData((prev) => [newTx, ...prev]);
    setLiveWebhookAlert({
      txId: newTxId,
      orderId: newOrderId,
      captureId: newCaptureId,
      amount: amount.toFixed(2),
      tx: newTx
    });

    setTimeout(() => {
      setIsSimulating(false);
      setSelectedTx(newTx);
      setIsDrawerOpen(true);

      // Flash the first row in AG Grid
      if (gridRef.current?.api) {
        try {
          const firstNode = gridRef.current.api.getDisplayedRowAtIndex(0);
          if (firstNode) {
            gridRef.current.api.flashCells({ rowNodes: [firstNode] });
          }
        } catch {
          // grid flash fallback
        }
      }
    }, 400);
  };

  // Modern Column Definitions per Milestone 3 requirements
  const columnDefs = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'Tx ID',
        width: 115,
        pinned: 'left',
        cellRenderer: (p) => (
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 800,
              color: '#0070BA',
              letterSpacing: '0.02em'
            }}
          >
            {p.value}
          </span>
        )
      },
      {
        field: 'buyer',
        headerName: 'Buyer (KYA)',
        width: 175,
        cellRenderer: (p) => {
          const name = p.value || 'Atlas Agent';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
              <span className="avatar-chip buyer">A</span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {name}
              </span>
            </div>
          );
        }
      },
      {
        field: 'freelancer',
        headerName: 'Seller / Agent',
        width: 175,
        cellRenderer: (p) => {
          const name = p.value || 'Nova Agent';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
              <span className="avatar-chip seller">N</span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {name}
              </span>
            </div>
          );
        }
      },
      {
        field: 'project',
        headerName: 'Milestone Scope',
        minWidth: 230,
        flex: 1,
        filter: 'agTextColumnFilter',
        cellRenderer: (p) => (
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {p.value || p.data?.projectTitle || 'Autonomous Milestone Scope'}
          </span>
        )
      },
      {
        field: 'amount',
        headerName: 'Escrow Amount',
        width: 145,
        filter: 'agNumberColumnFilter',
        cellRenderer: (p) => {
          const formatted = Number(p.value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          const curr = p.data?.currency || 'USD';
          return (
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                fontSize: '0.8125rem'
              }}
            >
              ${formatted} {curr}
            </span>
          );
        }
      },
      {
        field: 'status',
        headerName: 'Escrow State',
        width: 165,
        cellRenderer: (p) => {
          const s = p.value;
          let badgeCls = 'badge-locked';
          let label = 'ESCROW LOCKED';

          if (s === 'ESCROW_LOCKED') {
            badgeCls = 'badge-locked';
            label = 'ESCROW LOCKED';
          } else if (s === 'RELEASED' || s === 'COMPLETED') {
            badgeCls = 'badge-released';
            label = 'RELEASED';
          } else if (s === 'ARBITRATED_SPLIT' || s === 'ARBITRATED') {
            badgeCls = 'badge-zk';
            label = 'ARBITRATED SPLIT';
          } else if (s === 'REFUNDED_PARTIAL' || s === 'REFUNDED') {
            badgeCls = 'badge-dispute';
            label = 'REFUNDED PARTIAL';
          } else {
            badgeCls = 'badge-locked';
            label = String(s || 'UNKNOWN').replace('_', ' ');
          }

          return <span className={`status-pill ${badgeCls}`}>{label}</span>;
        }
      },
      {
        field: 'privacyMode',
        headerName: 'Confidentiality',
        width: 135,
        cellRenderer: (p) => {
          const mode = p.value || 'ZDR-DLP';
          const isZk = mode === 'ZK-NDA';
          return (
            <span className={`privacy-chip ${isZk ? 'zk' : 'zdr'}`}>
              {isZk ? '🔒 ZK-NDA' : '🛡️ ZDR-DLP'}
            </span>
          );
        }
      },
      {
        field: 'aiScore',
        headerName: 'Audit Score',
        width: 140,
        filter: 'agNumberColumnFilter',
        cellRenderer: (p) => {
          const val = p.value;
          if (val === null || val === undefined) {
            return (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Pending
              </span>
            );
          }
          const fillClass = val >= 90 ? 'pass' : val >= 75 ? 'warn' : 'fail';
          const color = val >= 90 ? '#10B981' : val >= 75 ? '#F59E0B' : '#EF4444';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', height: '100%' }}>
              <div className="progress-bar-track" style={{ flex: 1, height: '6px' }}>
                <div
                  className={`progress-bar-fill ${fillClass}`}
                  style={{ width: `${Math.min(Math.max(val, 0), 100)}%` }}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color
                }}
              >
                {val}%
              </span>
            </div>
          );
        }
      },
      {
        field: 'paypalOrderId',
        headerName: 'PayPal Order ID',
        width: 165,
        cellRenderer: (p) => (
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)'
            }}
          >
            {p.value || 'N/A'}
          </span>
        )
      },
      {
        field: 'date',
        headerName: 'Timestamp',
        width: 165,
        valueFormatter: (p) => {
          if (!p.value) return '';
          try {
            return new Date(p.value).toLocaleString([], {
              dateStyle: 'short',
              timeStyle: 'short'
            });
          } catch {
            return String(p.value);
          }
        }
      }
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      filter: true
    }),
    []
  );

  const onExportCsv = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: 'NexusPay-AI-PayPal-Escrow-Ledger.csv'
    });
  };

  const totalLocked = rowData
    .filter((r) => r.status === 'ESCROW_LOCKED')
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  const totalReleased = rowData
    .filter((r) => r.status === 'COMPLETED' || r.status === 'RELEASED' || r.status === 'ARBITRATED_SPLIT')
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="surface-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <DollarSign size={15} color="#0070BA" /> Total Escrow Volume
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ${(totalLocked + totalReleased).toFixed(2)}{' '}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <Clock size={15} color="#F59E0B" /> Vaulted in PayPal Escrow
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>
            ${totalLocked.toFixed(2)}{' '}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <CheckCircle size={15} color="#10B981" /> Autonomous Releases
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>
            ${totalReleased.toFixed(2)}{' '}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
          </div>
        </div>

        <div className="surface-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <Shield size={15} color="#0070BA" /> Confidential ZK / ZDR Proofs
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {rowData.length}{' '}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>verified</span>
          </div>
        </div>
      </div>

      {/* Live Webhook Alert Notification Banner */}
      {liveWebhookAlert && (
        <div
          style={{
            backgroundColor: 'rgba(0, 112, 186, 0.12)',
            border: '1px solid rgba(0, 112, 186, 0.35)',
            borderRadius: '8px',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            animation: 'fadeInBackdrop 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0070BA', color: '#FFF' }}>
              <Zap size={14} />
            </span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
              <strong>Live Inbound PayPal Webhook Ingested:</strong>{' '}
              <code style={{ color: '#0070BA', fontWeight: 700 }}>PAYMENT.CAPTURE.COMPLETED</code>{' '}
              — Order <span style={{ fontFamily: 'var(--font-mono)' }}>{liveWebhookAlert.orderId}</span> (${liveWebhookAlert.amount} USD) vaulted and inserted into ledger.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedTx(liveWebhookAlert.tx);
                setIsDrawerOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.72rem', padding: '0.28rem 0.65rem' }}
            >
              Inspect Event
            </button>
            <button
              type="button"
              onClick={() => setLiveWebhookAlert(null)}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.28rem 0.45rem' }}
              aria-label="Dismiss banner"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* AG Grid Financial Table Container */}
      <div className="surface-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.95rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                PayPal Agentic Escrow Ledger
              </h3>
              <span className="badge badge-paypal" style={{ fontSize: '0.62rem' }}>
                AG GRID v33 QUARTZ
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Click any transaction row below to trigger the Slide-out Transaction Audit Drawer with cryptographic attestation &amp; webhook payload
            </p>
          </div>

          {/* Ledger Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Status Filter Pills: All, Locked, Released, Arbitrated */}
            <div
              style={{
                display: 'flex',
                gap: '0.2rem',
                backgroundColor: 'var(--bg-subtle, #0B0F19)',
                padding: '0.22rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #1E293B)'
              }}
            >
              {[
                { key: 'ALL', label: 'All' },
                { key: 'LOCKED', label: 'Locked' },
                { key: 'RELEASED', label: 'Released' },
                { key: 'ARBITRATED', label: 'Arbitrated' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className="btn btn-sm"
                  style={{
                    padding: '0.28rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: statusFilter === key ? 700 : 500,
                    backgroundColor: statusFilter === key ? 'var(--bg-surface-elevated, #141B2D)' : 'transparent',
                    color: statusFilter === key ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: statusFilter === key ? '1px solid var(--border-default, #2A3852)' : '1px solid transparent',
                    borderRadius: '6px'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Quick search input across all fields */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                placeholder="Quick search..."
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                style={{
                  padding: '0.42rem 0.65rem 0.42rem 1.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  backgroundColor: 'var(--bg-subtle, #0B0F19)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  width: '160px'
                }}
              />
            </div>

            {/* Simulate Live Webhook Event Button */}
            <button
              type="button"
              onClick={handleSimulateWebhook}
              disabled={isSimulating}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
                padding: '0.42rem 0.75rem',
                backgroundColor: '#0070BA',
                color: '#FFFFFF'
              }}
              title="Simulate inbound PayPal webhook event & animate into grid"
            >
              <Zap size={13} color="#FFC439" />
              {isSimulating ? 'Processing Webhook...' : 'Simulate Live Webhook Event'}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchTransactions}
              className="btn btn-outline btn-sm"
              title="Refresh ledger transactions"
              style={{ padding: '0.42rem 0.6rem' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={onExportCsv}
              className="btn btn-outline btn-sm"
              title="Export CSV"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.42rem 0.6rem', fontSize: '0.72rem' }}
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>

        {/* Modern AG Grid v33 Quartz container without deprecated theme="legacy" */}
        <div className="ag-theme-quartz" style={{ height: '460px', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={filteredRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[5, 10, 25, 50]}
            onRowClicked={(e) => {
              setSelectedTx(e.data);
              setIsDrawerOpen(true);
            }}
            rowStyle={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Slide-out Transaction Audit Drawer */}
      <TransactionInspectorDrawer
        isOpen={isDrawerOpen}
        tx={selectedTx}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
