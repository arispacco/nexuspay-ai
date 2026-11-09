// src/App.jsx
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import JudgeScenarioBench from './components/JudgeScenarioBench.jsx';
import AgentNegotiator from './components/AgentNegotiator.jsx';
import DeliverableAuditor from './components/DeliverableAuditor.jsx';
import DisputeArbitrator from './components/DisputeArbitrator.jsx';
import EscrowLedgerGrid from './components/EscrowLedgerGrid.jsx';
import PayPalEscrowModal from './components/PayPalEscrowModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import McpTelemetryBar from './components/McpTelemetryBar.jsx';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nexuspay_theme') || 'dark';
  });
  const [activeTab, setActiveTab] = useState('negotiate');
  const [auditorInitialMode, setAuditorInitialMode] = useState('zdr');
  const [activeScenario, setActiveScenario] = useState('scenario-auto-release');
  const [activeAgreement, setActiveAgreement] = useState(null);
  const [negotiationTranscript, setNegotiationTranscript] = useState([]);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sandboxConfig, setSandboxConfig] = useState({ clientId: '', clientSecret: '', geminiApiKey: '' });
  const [telemetryTick, setTelemetryTick] = useState(0);

  const bumpTelemetry = () => setTelemetryTick((n) => n + 1);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexuspay_theme', theme);
  }, [theme]);

  const handleSelectScenario = (scenarioId) => {
    setActiveScenario(scenarioId);

    if (scenarioId === 'scenario-auto-release') {
      setAuditorInitialMode('zdr');
      setActiveTab('negotiate');
      handleStartNegotiation({
        projectTitle: 'Autonomous E-Commerce Recommender',
        projectScope: 'React checkout UI with PayPal Smart Buttons and Python recommendation API',
        initialBudget: 350,
        freelancerSkills: 'React, Python, PayPal REST API, AI Embeddings',
        ndaRequired: true
      });
    } else if (scenarioId === 'scenario-zk-nda') {
      setAuditorInitialMode('zk-nda');
      setActiveAgreement({
        id: 'SMA-NDA-600',
        title: 'Proprietary Banking Risk Microservice (Strict NDA)',
        scope: 'Confidential trading & risk engine verified via Zero-Knowledge HMAC-SHA256 CI attestation',
        totalBudget: 600,
        ndaProtected: true,
        paypalOrderId: '8XP600881NDA',
        milestones: [
          {
            id: 'M1',
            name: 'Milestone 1: Private Enclave Build & Test Suite',
            amount: 600,
            criteria: [
              'Private CI test suite >= 90% pass rate',
              'Deterministic build hash signed via HMAC-SHA256',
              'Zero proprietary source code transmitted externally'
            ]
          }
        ]
      });
      setActiveTab('deliverable');
    } else if (scenarioId === 'scenario-revision') {
      setAuditorInitialMode('zdr');
      setActiveAgreement({
        id: 'SMA-1802',
        title: 'Checkout Widget & Responsive UI Tokens',
        scope: 'Modular React PayPal checkout component with error handling and clean syntax',
        totalBudget: 180,
        ndaProtected: true,
        paypalOrderId: '8XP180299REV',
        milestones: [
          {
            id: 'M1',
            name: 'Milestone 1: Core Checkout Module',
            amount: 180,
            criteria: [
              'Valid ES syntax with balanced delimiters',
              'Exported module with async capture error guards',
              'PayPal SDK / order lifecycle integration'
            ]
          }
        ]
      });
      setActiveTab('deliverable');
    } else if (scenarioId === 'scenario-dispute') {
      setActiveTab('dispute');
    }
  };

  const handleStartNegotiation = async (params) => {
    setIsNegotiating(true);
    setNegotiationTranscript([]);
    setActiveAgreement(null);

    try {
      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          geminiApiKey: sandboxConfig?.geminiApiKey
        })
      });
      const data = await res.json();

      let currentTurns = [];
      for (let i = 0; i < data.transcript.length; i++) {
        await new Promise((r) => setTimeout(r, 380));
        currentTurns = [...currentTurns, data.transcript[i]];
        setNegotiationTranscript([...currentTurns]);
      }

      setActiveAgreement(data.agreement);
    } catch (err) {
      console.error(err);
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleTriggerPayPalDeposit = (agreement) => {
    setActiveAgreement(agreement);
    setShowEscrowModal(true);
  };

  const handleSuccessDeposit = (completedOrder) => {
    setActiveAgreement((prev) => ({
      ...prev,
      paypalOrderId: completedOrder.orderId,
      escrowStatus: 'ESCROW_LOCKED'
    }));
    bumpTelemetry();
    setActiveTab('deliverable');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onOpenSettings={() => setShowSettingsModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sandboxConfig={sandboxConfig}
      />

      <main className="app-container" style={{ flex: 1, paddingTop: '1.25rem' }}>
        <JudgeScenarioBench onSelectScenario={handleSelectScenario} activeScenario={activeScenario} />

        {activeTab === 'negotiate' && (
          <AgentNegotiator
            onAgreementCreated={setActiveAgreement}
            onTriggerPayPalDeposit={handleTriggerPayPalDeposit}
            activeAgreement={activeAgreement}
            negotiationTranscript={negotiationTranscript}
            isNegotiating={isNegotiating}
            onStartNegotiation={handleStartNegotiation}
            sandboxConfig={sandboxConfig}
            onTelemetryRefresh={bumpTelemetry}
          />
        )}

        {activeTab === 'deliverable' && (
          <DeliverableAuditor
            agreement={activeAgreement}
            initialMode={auditorInitialMode}
            onMilestoneReleased={bumpTelemetry}
            sandboxConfig={sandboxConfig}
            onTelemetryRefresh={bumpTelemetry}
          />
        )}

        {activeTab === 'dispute' && (
          <DisputeArbitrator
            onDisputeResolved={bumpTelemetry}
            sandboxConfig={sandboxConfig}
            onTelemetryRefresh={bumpTelemetry}
          />
        )}

        {activeTab === 'ledger' && <EscrowLedgerGrid />}
      </main>

      {/* Official @paypal/agent-toolkit MCP Telemetry Bar */}
      <div style={{ marginTop: '2.5rem' }}>
        <McpTelemetryBar refreshTrigger={telemetryTick} />
      </div>

      <footer style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.25rem 0',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        transition: 'background-color 0.18s ease, border-color 0.18s ease'
      }}>
        <div className="app-container" style={{ paddingBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>NexusPay AI v2.0</strong> — Built by <strong>Aristide Bienvenu EMCTHEU</strong> for the PayPal AI Hackathon 2026.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
            <span>@paypal/agent-toolkit MCP</span>
            <span>•</span>
            <span>PayPal Orders &amp; Invoicing v2</span>
            <span>•</span>
            <span>Zero-Knowledge NDA &amp; DLP Shield</span>
            <span>•</span>
            <span>AG Grid v33</span>
          </div>
        </div>
      </footer>

      {showEscrowModal && activeAgreement && (
        <PayPalEscrowModal
          agreement={activeAgreement}
          onClose={() => setShowEscrowModal(false)}
          onSuccessDeposit={handleSuccessDeposit}
          sandboxConfig={sandboxConfig}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          config={sandboxConfig}
          onSaveConfig={setSandboxConfig}
        />
      )}
    </div>
  );
}
