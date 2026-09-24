import React from 'react';
import { SkeletonLine, SkeletonCircle } from '@/components/Skeleton';

export const DashboardSkeleton: React.FC = () => (
  <>
    <div className="dash-kpis">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="dash-kpi">
          <div className="dash-kpi-top">
            <SkeletonCircle width={42} height={42} />
            <SkeletonLine width={56} height={22} />
          </div>
          <div>
            <SkeletonLine width="50%" height={30} />
            <SkeletonLine width="70%" height={12} />
          </div>
          <SkeletonLine width="80%" height={12} />
        </div>
      ))}
    </div>
    <div className="dash-row-2">
      {['', '', ''].map((_, i) => (
        <div key={i} className="card card-p">
          <SkeletonLine width="60%" height={16} />
          <SkeletonLine height={i === 0 ? 220 : 120} />
          <SkeletonLine width="40%" height={12} />
        </div>
      ))}
    </div>
    <div className="dash-row-3">
      {['', '', ''].map((_, i) => (
        <div key={i} className="card card-p">
          <SkeletonLine width="60%" height={16} />
          <SkeletonLine height={140} />
        </div>
      ))}
    </div>
    <div className="dash-ai-banner">
      <SkeletonCircle width={48} height={48} />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="30%" height={16} />
        <SkeletonLine width="50%" height={12} />
      </div>
    </div>
  </>
);
