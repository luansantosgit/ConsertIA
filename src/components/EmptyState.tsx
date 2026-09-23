import React from 'react';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="empty-state">
    <div className="empty-state-icon">
      <Icon size={28} />
    </div>
    <h3 className="empty-state-title">{title}</h3>
    {description && <p className="empty-state-desc">{description}</p>}
    {actionLabel && onAction && (
      <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
