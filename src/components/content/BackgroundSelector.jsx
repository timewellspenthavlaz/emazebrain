import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

const CATEGORY_LABELS = {
  solid_warm: 'Solid Warm',
  solid_cold: 'Solid Cold',
  textured_warm: 'Textured Warm',
  textured_cold: 'Textured Cold',
};

const CATEGORY_ORDER = ['solid_warm', 'solid_cold', 'textured_warm', 'textured_cold'];

export default function BackgroundSelector({ selectedId, onSelect }) {
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.GameBackground.list('sort_order', 100);
        setBackgrounds(data);
      } catch {
        // silent fail — backgrounds are optional
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (backgrounds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No backgrounds available.</p>
    );
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: backgrounds.filter(b => b.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4 mt-1">
      {grouped.map(group => (
        <div key={group.category}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
          <div className="grid grid-cols-4 gap-3">
            {group.items.map(bg => (
              <button
                key={bg.id}
                type="button"
                onClick={() => onSelect(bg)}
                className={cn(
                  "relative rounded-lg overflow-hidden border-2 transition-all group",
                  selectedId === bg.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                <div className="aspect-video w-full">
                  <img src={bg.image_url} alt={bg.name} className="w-full h-full object-cover" />
                </div>
                {selectedId === bg.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <div className="px-1.5 py-1.5 text-center">
                  <p className="text-xs font-medium truncate">{bg.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}