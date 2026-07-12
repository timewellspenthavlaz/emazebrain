import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ExternalLink, Film, Gamepad2, Brain, Zap, Stethoscope, Users, Clock, BarChart3, Tag } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';

export default function ContentPreviewDrawer({ open, onOpenChange, item, contentType, brainRegions, skills, diagnoses, therapists }) {
  if (!item) return null;

  const namesFor = (ids, source, field) => (ids || []).map(id => source.find(x => x.id === id)?.[field]).filter(Boolean);
  const regions = namesFor(item.brain_region_ids, brainRegions, 'name');
  const sList = namesFor(item.functional_skill_ids, skills, 'name');
  const dList = namesFor(item.diagnosis_ids, diagnoses, 'name');
  const tNames = namesFor(item.therapist_ids, therapists, 'full_name');
  const Icon = contentType === 'video' ? Film : Gamepad2;

  const TagSection = ({ icon: Icon, label, items, color }) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">No {label.toLowerCase()} tagged</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {items.map((n, i) => (
            <span key={i} className={`px-2 py-1 rounded-md text-xs font-medium ${color}`}>{n}</span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <SheetTitle className="text-lg">{item.title}</SheetTitle>
          </div>
          <SheetDescription className="text-left">
            {item.description || 'No description provided.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          {/* Snapshot */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Film className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Snapshot</span>
            </div>
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt={item.title} className="w-full rounded-lg border border-border" />
            ) : (
              <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
                <Icon className="w-8 h-8 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Media link */}
          {item.url && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Media Link</span>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-sm text-primary hover:underline pl-6">
                Open {contentType} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Level</span>
              </div>
              <span className="text-sm capitalize">{item.level || 'beginner'}</span>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Duration</span>
              </div>
              <span className="text-sm">{item.duration_minutes || 5} min</span>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Usage</span>
              </div>
              <span className="text-sm capitalize">{(item.usage_setting || 'both').replace('_', ' ')}</span>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Status</span>
              </div>
              <StatusBadge status={item.status} customLabel={item.status === 'active' ? 'Available' : 'Unavailable'} />
            </div>
          </div>

          {/* Age groups */}
          {item.age_groups?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Age Groups</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-6">
                {item.age_groups.map((a, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">Ages {a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Taxonomy tags */}
          <div className="space-y-4 pt-2 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Taxonomy Tags</h3>
            <TagSection icon={Brain} label="Brain Regions" items={regions} color="bg-primary/10 text-primary" />
            <TagSection icon={Zap} label="Functional Skills" items={sList} color="bg-accent/10 text-accent" />
            <TagSection icon={Stethoscope} label="Diagnoses" items={dList} color="bg-purple-50 text-purple-600" />
          </div>

          {/* Connected therapists */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Connected Therapists</span>
              <span className="text-xs text-muted-foreground">({tNames.length})</span>
            </div>
            {tNames.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">No therapists assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pl-6">
                {tNames.map((n, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">{n}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}