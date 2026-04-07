import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import Skeleton from '../components/Skeleton';
import { apiFetch } from '../utils/api';

export default function AnomalyLog() {
  const { anomalies, setAnomalies } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/anomalies')
      .then((r) => r.json())
      .then((data) => {
        setAnomalies(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load anomalies:', err);
        setLoading(false);
      });
  }, [setAnomalies]);

  const dismiss = async (id) => {
    if (!confirm('Dismiss this anomaly?')) return;
    try {
      const res = await apiFetch(`/api/anomalies/${id}/dismiss`, { method: 'PATCH' });
      if (res.status === 403) {
        alert('Cannot dismiss critical anomalies');
        return;
      }
      const updated = await res.json();
      setAnomalies(anomalies.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    } catch (err) {
      console.error('Dismiss error:', err);
    }
  };

  if (loading) {
    return <div style={{ display: 'grid', gap: 8 }}>{[1, 2, 3].map((i) => <Skeleton key={i} height={50} />)}</div>;
  }

  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Anomaly Log
      </div>
      {anomalies.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' }}>
          No anomalies detected
        </div>
      ) : (
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Gym</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Severity</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Message</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Detected</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => (
              <tr key={a.id || a.anomaly_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px' }}>{a.gym?.name || a.gym_name || '—'}</td>
                <td style={{ padding: '8px' }} className="mono">{a.type || a.anomaly_type}</td>
                <td style={{ padding: '8px' }}>
                  <span className={`badge badge-${a.severity}`}>
                    {a.severity?.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.message}
                </td>
                <td style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: 12 }}>
                  {a.detectedAt || a.detected_at
                    ? new Date(a.detectedAt || a.detected_at).toLocaleString()
                    : '—'}
                </td>
                <td style={{ padding: '8px' }}>
                  {a.resolved || a.dismissed ? (
                    <span className="badge badge-resolved">Resolved</span>
                  ) : (
                    <span className="badge badge-critical">Active</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>
                  {!a.resolved && !a.dismissed && a.severity !== 'critical' && (
                    <button
                      className="btn-secondary"
                      onClick={() => dismiss(a.id || a.anomaly_id)}
                      style={{ fontSize: 11, padding: '3px 8px' }}
                    >
                      Dismiss
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
