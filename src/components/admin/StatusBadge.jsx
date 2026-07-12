import React from 'react';
import { cn } from '@/lib/utils';

const statusConfig = {
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactive', classes: 'bg-gray-100 text-gray-500 border-gray-200' },
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  beginner: { label: 'Beginner', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  intermediate: { label: 'Intermediate', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  advanced: { label: 'Advanced', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  video: { label: 'Video', classes: 'bg-primary/10 text-primary border-primary/20' },
  game: { label: 'Game', classes: 'bg-accent/10 text-accent border-accent/20' },
  external: { label: 'External', classes: 'bg-gray-50 text-gray-600 border-gray-200' },
  'cdn_upload': { label: 'CDN', classes: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  in_clinic: { label: 'In-Clinic', classes: 'bg-teal-50 text-teal-600 border-teal-200' },
  'at_home': { label: 'At-Home', classes: 'bg-purple-50 text-purple-600 border-purple-200' },
  both: { label: 'Both', classes: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export default function StatusBadge({ status, customLabel }) {
  const config = statusConfig[status] || { label: status, classes: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
      config.classes
    )}>
      {customLabel || config.label}
    </span>
  );
}