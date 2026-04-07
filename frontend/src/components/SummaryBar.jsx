import React from 'react';
import { useStore } from '../store/useStore';
import AnimatedNumber from './AnimatedNumber';

export default function SummaryBar() {
  const { gyms, occupancyMap, revenueMap, anomalies } = useStore();

  const totalCheckedIn = gyms.reduce((sum, g) => {
    const occ = occupancyMap[g.id]?.occupancy ?? g.currentOccupancy ?? 0;
    return sum + occ;
  }, 0);

  const totalRevenue = gyms.reduce((sum, g) => {
    return sum + (revenueMap[g.id] ?? g.todayRevenue ?? 0);
  }, 0);

  const activeAnomalies = anomalies.filter((a) => !a.resolved).length;

  return (
    <div style={{
      display: 'flex', gap: 24, padding: '12px 24px',
      borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
    }}>
      <Stat label="Total Checked In" value={totalCheckedIn} />
      <Stat label="Total Revenue Today" value={`₹${totalRevenue.toLocaleString('en-IN')}`} />
      <Stat label="Active Anomalies" value={activeAnomalies} color={activeAnomalies > 0 ? 'var(--accent-red)' : undefined} />
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}:</span>
      <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--accent-teal)' }}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </span>
    </div>
  );
}
