import React from 'react';

export default function Skeleton({ width = '100%', height = 20, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, ...style }}
      role="status"
      aria-label="Loading"
    />
  );
}
