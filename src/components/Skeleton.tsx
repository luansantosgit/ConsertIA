import React from 'react';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

const ShimmerKeyframes: React.FC = () => (
  <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
);

interface SkeletonLineProps {
  width?: string | number;
  height?: number;
  className?: string;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({ width = '100%', height = 14, className = '' }) => (
  <div
    className={className}
    style={{ ...shimmerStyle, width, height, borderRadius: 6 }}
  />
);

export const SkeletonCircle: React.FC<SkeletonLineProps> = ({ width = 44, height, className = '' }) => (
  <div
    className={className}
    style={{ ...shimmerStyle, width, height: height || width, borderRadius: '50%', flexShrink: 0 }}
  />
);

export const SkeletonCard: React.FC<SkeletonLineProps> = ({ className = '' }) => (
  <div className={className} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--card-radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <SkeletonLine width="60%" height={16} />
    <SkeletonLine height={12} />
    <SkeletonLine height={12} />
    <SkeletonLine width="80%" height={12} />
  </div>
);

export const SkeletonTable: React.FC<SkeletonLineProps> = ({ className = '' }) => (
  <div className={className}>
    <ShimmerKeyframes />
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {Array.from({ length: 5 }).map((_, i) => (
              <th key={i}><SkeletonLine height={12} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, row) => (
            <tr key={row}>
              {Array.from({ length: 5 }).map((_, col) => (
                <td key={col}><SkeletonLine height={14} width={col === 0 ? '80%' : '60%'} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SkeletonStats: React.FC<SkeletonLineProps> = ({ className = '' }) => (
  <div className={`stat-cards ${className}`}>
    <ShimmerKeyframes />
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--card-radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="flex items-center justify-between">
          <SkeletonCircle width={42} height={42} />
          <SkeletonLine width={56} height={20} />
        </div>
        <SkeletonLine width="50%" height={28} />
        <SkeletonLine width="70%" height={12} />
      </div>
    ))}
  </div>
);
