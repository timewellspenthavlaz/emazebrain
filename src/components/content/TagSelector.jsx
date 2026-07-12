import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const colorSchemes = {
  primary: 'bg-primary/10 text-primary border-primary/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function TagSelector({ label, items, selectedIds = [], onToggle, colorScheme = 'primary', emptyText = 'No items defined.' }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-2 mt-2 p-3 border border-border rounded-lg bg-muted/20 max-h-32 overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                selectedIds.includes(item.id)
                  ? colorSchemes[colorScheme]
                  : 'bg-background text-muted-foreground border-border hover:border-primary/30'
              )}
            >
              {item.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}