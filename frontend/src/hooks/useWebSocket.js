import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:4000`;

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const [connected, setConnected] = useState(false);
  const {
    addEvent,
    updateOccupancy,
    updateRevenue,
    addAnomaly,
    resolveAnomaly,
  } = useStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, data } = msg;

        switch (type) {
          case 'CHECKIN_EVENT':
            addEvent({ ...data, type: 'checkin' });
            updateOccupancy(data.gym_id, data.current_occupancy, data.capacity_pct);
            break;
          case 'CHECKOUT_EVENT':
            addEvent({ ...data, type: 'checkout' });
            updateOccupancy(data.gym_id, data.current_occupancy, data.capacity_pct);
            break;
          case 'PAYMENT_EVENT':
            addEvent({ ...data, type: 'payment' });
            updateRevenue(data.gym_id, data.today_total);
            break;
          case 'ANOMALY_DETECTED':
            addAnomaly(data);
            break;
          case 'ANOMALY_RESOLVED':
            resolveAnomaly(data.anomaly_id);
            break;
        }
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    };
  }, [addEvent, updateOccupancy, updateRevenue, addAnomaly, resolveAnomaly]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
