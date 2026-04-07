import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useStore } from './store/useStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import AnomalyLog from './pages/AnomalyLog';
import SimulatorControls from './components/SimulatorControls';
import SummaryBar from './components/SummaryBar';
import toast, { Toaster } from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;

const tabs = ['Dashboard', 'Analytics', 'Anomalies'];

export default function App() {
  const { token, user, logout, setGyms, unreadAnomalyCount, clearUnreadAnomalies, anomalies } = useStore();

  // If not authenticated, show login
  if (!token) {
    return (
      <>
        <Toaster position="top-right" />
        <Login />
      </>
    );
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const { connected } = useWebSocket();
  const { token, user, logout, setGyms, unreadAnomalyCount, clearUnreadAnomalies, anomalies } = useStore();

  useEffect(() => {
    fetch(`${API}/api/gyms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { logout(); return null; }
        return r.json();
      })
      .then((data) => data && setGyms(data))
      .catch((err) => console.error('Failed to load gyms:', err));
  }, [setGyms, token, logout]);

  // Toast on new anomaly
  const lastAnomaly = anomalies[0];
  useEffect(() => {
    if (lastAnomaly && !lastAnomaly.resolved) {
      toast(lastAnomaly.message || `New ${lastAnomaly.anomaly_type} anomaly`, {
        icon: lastAnomaly.severity === 'critical' ? '🔴' : '🟡',
        style: { background: '#1A1A2E', color: '#E2E8F0', border: '1px solid #2A2A4A' },
      });
    }
  }, [lastAnomaly]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Toaster position="top-right" />
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-teal)' }}>
            WTF LivePulse
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'Anomalies') clearUnreadAnomalies();
                }}
                style={{
                  background: activeTab === tab ? 'var(--accent-teal)' : 'transparent',
                  color: activeTab === tab ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  padding: '6px 16px', borderRadius: 6, fontSize: 14,
                  position: 'relative',
                }}
              >
                {tab}
                {tab === 'Anomalies' && unreadAnomalyCount > 0 && (
                  <span className="badge badge-critical" style={{
                    position: 'absolute', top: -6, right: -6, fontSize: 10,
                  }}>
                    {unreadAnomalyCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SimulatorControls />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className={`pulse-dot ${connected ? 'connected' : 'disconnected'}`} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {user?.name}
            </span>
            <button
              className="btn-secondary"
              onClick={logout}
              style={{ fontSize: 11, padding: '3px 10px' }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <SummaryBar />

      <main style={{ padding: 24 }}>
        {activeTab === 'Dashboard' && <Dashboard />}
        {activeTab === 'Analytics' && <Analytics />}
        {activeTab === 'Anomalies' && <AnomalyLog />}
      </main>
    </div>
  );
}
