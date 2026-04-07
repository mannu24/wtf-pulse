import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import Skeleton from '../components/Skeleton';
import { apiFetch } from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#2DD4BF', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Analytics() {
  const { gyms, selectedGymId } = useStore();
  const [dateRange, setDateRange] = useState('30d');
  const [data, setData] = useState(null);
  const [crossGym, setCrossGym] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedGymId) return;
    setLoading(true);
    apiFetch(`/api/gyms/${selectedGymId}/analytics?dateRange=${dateRange}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedGymId, dateRange]);

  useEffect(() => {
    apiFetch('/api/analytics/cross-gym')
      .then((r) => r.json())
      .then(setCrossGym)
      .catch(console.error);
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={250} />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['7d', '30d', '90d'].map((r) => (
          <button
            key={r}
            className={dateRange === r ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setDateRange(r)}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            {r}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Peak Hours Heatmap */}
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            7-Day Peak Hours
          </div>
          <HeatmapGrid data={data.peakHours} />
        </div>

        {/* Revenue by Plan */}
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Revenue by Plan Type
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.revenueByPlan}
                dataKey="total"
                nameKey="planType"
                cx="50%" cy="50%"
                outerRadius={80}
                label={({ planType, total }) => `${planType}: ₹${total.toLocaleString('en-IN')}`}
              >
                {data.revenueByPlan.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Risk */}
        <div className="card" style={{ maxHeight: 300, overflow: 'auto' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Churn Risk Members (no check-in 45+ days)
          </div>
          {data.churnRisk.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No at-risk members</div>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Last Check-in</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.churnRisk.slice(0, 50).map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px' }}>{m.name}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                      {m.lastCheckinAt ? new Date(m.lastCheckinAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <span className={`badge badge-${m.riskLevel}`}>
                        {m.riskLevel.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* New vs Renewal */}
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            New vs Renewal Members
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.newVsRenewal}
                dataKey="count"
                nameKey="memberType"
                cx="50%" cy="50%"
                outerRadius={80}
                label
              >
                {data.newVsRenewal.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross-gym revenue */}
      {crossGym && (
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Cross-Gym Revenue Comparison (Last 30 Days)
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={crossGym} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis dataKey="gymName" type="category" width={140} tick={{ fill: '#E2E8F0', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A4A', color: '#E2E8F0' }}
                formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
              />
              <Bar dataKey="revenue" fill="#2DD4BF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function HeatmapGrid({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No data yet. Refresh materialized view.</div>;
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxCount = Math.max(...data.map((d) => d.checkin_count || 0), 1);

  const lookup = {};
  data.forEach((d) => {
    lookup[`${d.day_of_week}-${d.hour}`] = d.checkin_count;
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `50px repeat(24, 1fr)`, gap: 2, fontSize: 10 }}>
        <div />
        {hours.map((h) => (
          <div key={h} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            {h}
          </div>
        ))}
        {days.map((day, di) => (
          <React.Fragment key={day}>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              {day}
            </div>
            {hours.map((h) => {
              const count = lookup[`${di}-${h}`] || 0;
              const intensity = count / maxCount;
              return (
                <div
                  key={h}
                  title={`${day} ${h}:00 — ${count} check-ins`}
                  style={{
                    height: 18,
                    borderRadius: 2,
                    background: `rgba(45, 212, 191, ${0.1 + intensity * 0.9})`,
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
