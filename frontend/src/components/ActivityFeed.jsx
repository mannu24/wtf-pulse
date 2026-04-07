import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

const typeColors = {
  checkin: 'var(--accent-green)',
  checkout: 'var(--accent-orange)',
  payment: 'var(--accent-teal)',
};

const typeLabels = {
  checkin: '→ IN',
  checkout: '← OUT',
  payment: '₹ PAY',
};

export default function ActivityFeed({ gymId }) {
  const { events } = useStore();
  const feedRef = useRef(null);
  const filtered = events.filter((e) => e.gym_id === gymId);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [filtered.length]);

  return (
    <div className="card" style={{ maxHeight: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Activity Feed
      </div>
      <div ref={feedRef} style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' }}>
            No recent activity. Start the simulator to see events.
          </div>
        ) : (
          filtered.map((event, i) => (
            <div
              key={event.id || i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0', borderBottom: '1px solid var(--border)',
                fontSize: 13,
              }}
            >
              <span className="mono" style={{
                color: typeColors[event.type], fontSize: 11, fontWeight: 600,
                minWidth: 50,
              }}>
                {typeLabels[event.type]}
              </span>
              <span style={{ flex: 1 }}>{event.member_name}</span>
              {event.type === 'payment' && (
                <span className="mono" style={{ color: 'var(--accent-teal)', fontSize: 12 }}>
                  ₹{event.amount?.toLocaleString('en-IN')}
                </span>
              )}
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
