import { cn } from '@/lib/utils';
import type { DogStatus, RescueStatus, ApplicationStatus } from '@/types';

type StatusType = DogStatus | RescueStatus | ApplicationStatus;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Dog Status
  reported: { label: 'Reported', className: 'badge-reported' },
  in_progress: { label: 'In Progress', className: 'badge-progress' },
  treated: { label: 'Treated', className: 'badge-treated' },
  adoptable: { label: 'Adoptable', className: 'badge-adoptable' },
  adopted: { label: 'Adopted', className: 'badge-adopted' },
  
  // Rescue Status
  pending: { label: 'Pending', className: 'badge-reported' },
  assigned: { label: 'Assigned', className: 'badge-progress' },
  completed: { label: 'Completed', className: 'badge-adopted' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
  
  // Application Status
  under_review: { label: 'Under Review', className: 'badge-progress' },
  approved: { label: 'Approved', className: 'badge-adopted' },
  rejected: { label: 'Rejected', className: 'bg-destructive/15 text-destructive' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
