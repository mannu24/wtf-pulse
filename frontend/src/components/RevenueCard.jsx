import React from 'react';
import { useStore } from '../store/useStore';
import AnimatedNumber from './AnimatedNumber';

export default function RevenueCard({ gym }) {
  const { revenueMap } = useStore();
  const revenue = revenueMap[gym.id] ?? gym.todayRevenue ?? 0;

  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Today's Revenue
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}>₹</span>
        <span className="kpi-number" style={{ color: 'var(--accent-teal)' }}>
          <AnimatedNumber value={Math.round(revenue)} />
        </span>
      </div>
    </div>
  );
}
