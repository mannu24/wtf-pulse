import React from 'react';
import { useStore } from '../store/useStore';
import GymSelector from '../components/GymSelector';
import OccupancyCard from '../components/OccupancyCard';
import RevenueCard from '../components/RevenueCard';
import ActivityFeed from '../components/ActivityFeed';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  const { gyms, selectedGymId } = useStore();
  const gym = gyms.find((g) => g.id === selectedGymId);

  if (!gyms.length) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <Skeleton height={40} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Skeleton height={180} />
          <Skeleton height={180} />
          <Skeleton height={180} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <GymSelector />
      {gym && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 16 }}>
          <OccupancyCard gym={gym} />
          <RevenueCard gym={gym} />
          <ActivityFeed gymId={gym.id} />
        </div>
      )}
    </div>
  );
}
