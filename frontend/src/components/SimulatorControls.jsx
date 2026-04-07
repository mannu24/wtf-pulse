import React from 'react';
import { useStore } from '../store/useStore';
import { apiFetch } from '../utils/api';

export default function SimulatorControls() {
  const { simulatorStatus, simulatorSpeed, setSimulatorStatus, setSimulatorSpeed } = useStore();

  const start = async (speed) => {
    await apiFetch('/api/simulator/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed }),
    });
    setSimulatorStatus('running');
    setSimulatorSpeed(speed);
  };

  const stop = async () => {
    await apiFetch('/api/simulator/stop', { method: 'POST' });
    setSimulatorStatus('stopped');
  };

  const reset = async () => {
    await apiFetch('/api/simulator/reset', { method: 'POST' });
    setSimulatorStatus('stopped');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sim:</span>
      {simulatorStatus === 'running' ? (
        <button className="btn-danger" onClick={stop} style={{ fontSize: 12, padding: '4px 10px' }}>
          Pause
        </button>
      ) : (
        <button className="btn-primary" onClick={() => start(simulatorSpeed)} style={{ fontSize: 12, padding: '4px 10px' }}>
          Start
        </button>
      )}
      {[1, 5, 10].map((s) => (
        <button
          key={s}
          className={simulatorSpeed === s ? 'btn-primary' : 'btn-secondary'}
          onClick={() => {
            setSimulatorSpeed(s);
            if (simulatorStatus === 'running') start(s);
          }}
          style={{ fontSize: 11, padding: '3px 8px' }}
        >
          {s}x
        </button>
      ))}
      <button className="btn-secondary" onClick={reset} style={{ fontSize: 11, padding: '3px 8px' }}>
        Reset
      </button>
    </div>
  );
}
