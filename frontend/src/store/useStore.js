import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Auth
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  setAuth: (token, user) => set({ token, user }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  // Gyms
  gyms: [],
  selectedGymId: null,
  setGyms: (gyms) => set({ gyms, selectedGymId: gyms[0]?.id || null }),
  selectGym: (id) => set({ selectedGymId: id }),

  // Live occupancy map: { gymId: { occupancy, capacityPct } }
  occupancyMap: {},
  updateOccupancy: (gymId, occupancy, capacityPct) =>
    set((s) => ({
      occupancyMap: { ...s.occupancyMap, [gymId]: { occupancy, capacityPct } },
    })),

  // Revenue map: { gymId: todayTotal }
  revenueMap: {},
  updateRevenue: (gymId, total) =>
    set((s) => ({
      revenueMap: { ...s.revenueMap, [gymId]: total },
    })),

  // Activity feed (last 20 events)
  events: [],
  addEvent: (event) =>
    set((s) => ({
      events: [{ ...event, id: Date.now() + Math.random() }, ...s.events].slice(0, 20),
    })),

  // Anomalies
  anomalies: [],
  unreadAnomalyCount: 0,
  setAnomalies: (anomalies) => set({ anomalies }),
  addAnomaly: (anomaly) =>
    set((s) => ({
      anomalies: [anomaly, ...s.anomalies],
      unreadAnomalyCount: s.unreadAnomalyCount + 1,
    })),
  resolveAnomaly: (id) =>
    set((s) => ({
      anomalies: s.anomalies.map((a) =>
        a.anomaly_id === id || a.id === id
          ? { ...a, resolved: true, resolvedAt: new Date().toISOString() }
          : a
      ),
    })),
  clearUnreadAnomalies: () => set({ unreadAnomalyCount: 0 }),

  // Simulator
  simulatorStatus: 'stopped',
  simulatorSpeed: 1,
  setSimulatorStatus: (status) => set({ simulatorStatus: status }),
  setSimulatorSpeed: (speed) => set({ simulatorSpeed: speed }),
}));
