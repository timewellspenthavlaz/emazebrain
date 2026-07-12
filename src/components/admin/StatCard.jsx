import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, accent = 'primary', trend, subtitle }) {
  const accentClasses = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/20' },
    accent: { bg: 'bg-accent/10', text: 'text-accent', ring: 'ring-accent/20' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  };

  const styles = accentClasses[accent] || accentClasses.primary;

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-heading font-bold text-foreground mt-2">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-lg ring-4", styles.bg, styles.text, styles.ring)}>
          {Icon && <Icon className="w-6 h-6" strokeWidth={2} />}
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-500" />
          )}
          <span className={cn("text-sm font-semibold", trend >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}