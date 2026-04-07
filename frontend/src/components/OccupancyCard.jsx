import React from 'react';
import { useStore } from '../store/useStore';
import AnimatedNumber from './AnimatedNumber';

export default function OccupancyCard({ gym }) {
  const { occupancyMap } = useStore();
  const live = occupancyMap[gym.id];
  const occupancy = live?.occupancy ?? gym.currentOccupancy ?? 0;
  const pct = gym.capacity > 0 ? Math.round((occupancy / gym.capacity) * 100) : 0;

  const color = pct > 85 ? 'var(--accent-red)' : pct > 60 ? 'var(--accent-orange)' : 'var(--accent-green)';

  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Live Occupancy
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="kpi-number" style={{ color }}>
          <AnimatedNumber value={occupancy} />
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          / {gym.capacity}
        </span>
      </div>
      <div style={{
        marginTop: 12, height: 8, borderRadius: 4,
        background: 'var(--bg-primary)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: '100%',
          background: color, borderRadius: 4,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
        <AnimatedNumber value={pct} />% capacity
      </div>
    </div>
  );
}
