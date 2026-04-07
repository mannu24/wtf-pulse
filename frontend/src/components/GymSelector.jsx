import React from 'react';
import { useStore } from '../store/useStore';

export default function GymSelector() {
  const { gyms, selectedGymId, selectGym } = useStore();

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {gyms.map((gym) => (
        <button
          key={gym.id}
          onClick={() => selectGym(gym.id)}
          style={{
            background: selectedGymId === gym.id ? 'var(--accent-teal)' : 'var(--bg-card)',
            color: selectedGymId === gym.id ? 'var(--bg-primary)' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            padding: '6px 14px',
            fontSize: 13,
            borderRadius: 8,
          }}
        >
          {gym.name}
          <span style={{
            fontSize: 10, marginLeft: 6, opacity: 0.7,
          }}>
            {gym.city}
          </span>
        </button>
      ))}
    </div>
  );
}
