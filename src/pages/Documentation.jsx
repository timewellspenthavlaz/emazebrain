import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/admin/PageHeader';

import projectMd from '@/docs/PROJECT.md?raw';
import dataModelMd from '@/docs/DATA-MODEL.md?raw';
import backendMd from '@/docs/BACKEND.md?raw';
import gamesOverviewMd from '@/docs/GAMES-OVERVIEW.md?raw';
import blockCrasherMd from '@/docs/games/block-crasher.md?raw';
import catchMeMd from '@/docs/games/catch-me-if-you-can.md?raw';
import orbitalOrderMd from '@/docs/games/orbital-order.md?raw';
import beepBeepMd from '@/docs/games/beep-beep.md?raw';
import echoKeysMd from '@/docs/games/echo-keys.md?raw';
import peekPeekMd from '@/docs/games/peek-peek.md?raw';
import tunnelRushMd from '@/docs/games/tunnel-rush.md?raw';

const TOPICS = [
  {
    group: 'Project',
    items: [
      { id: 'project', label: 'Project Overview', md: projectMd },
      { id: 'data-model', label: 'Data Model', md: dataModelMd },
      { id: 'backend', label: 'Backend & Results Contract', md: backendMd },
      { id: 'games-overview', label: 'Games Overview', md: gamesOverviewMd },
    ],
  },
  {
    group: 'Games',
    items: [
      { id: 'block-crasher', label: 'Block Crasher', md: blockCrasherMd },
      { id: 'catch-me-if-you-can', label: 'Catch Me If You Can', md: catchMeMd },
      { id: 'orbital-order', label: 'Orbital Order', md: orbitalOrderMd },
      { id: 'beep-beep', label: 'Beep Beep', md: beepBeepMd },
      { id: 'echo-keys', label: 'Echo Keys', md: echoKeysMd },
      { id: 'peek-peek', label: 'Peek Peek', md: peekPeekMd },
      { id: 'tunnel-rush', label: 'Tunnel Rush', md: tunnelRushMd },
    ],
  },
];

// Tailwind-styled mapping for rendered markdown elements.
const mdComponents = {
  h1: (p) => <h1 className="text-2xl font-heading font-bold text-foreground mt-2 mb-4 tracking-tight" {...p} />,
  h2: (p) => <h2 className="text-xl font-heading font-semibold text-foreground mt-8 mb-3 pb-2 border-b border-border" {...p} />,
  h3: (p) => <h3 className="text-base font-heading font-semibold text-foreground mt-6 mb-2" {...p} />,
  p: (p) => <p className="text-sm text-muted-foreground leading-relaxed my-2" {...p} />,
  a: (p) => <a className="text-primary underline underline-offset-2" {...p} />,
  strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
  ul: (p) => <ul className="list-disc pl-5 space-y-1 my-2 text-sm text-muted-foreground" {...p} />,
  ol: (p) => <ol className="list-decimal pl-5 space-y-1 my-2 text-sm text-muted-foreground" {...p} />,
  blockquote: (p) => <blockquote className="border-l-4 border-primary/40 pl-4 my-3 text-sm text-muted-foreground italic" {...p} />,
  hr: () => <hr className="my-6 border-border" />,
  code: (p) => <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[12px] text-foreground" {...p} />,
  pre: (p) => (
    <pre className="my-3 p-4 rounded-lg bg-muted overflow-x-auto scrollbar-thin text-[12px] leading-relaxed" {...p} />
  ),
  table: (p) => (
    <div className="my-4 overflow-x-auto scrollbar-thin rounded-lg border border-border">
      <table className="w-full text-sm" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-muted/60" {...p} />,
  th: (p) => <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border whitespace-nowrap" {...p} />,
  td: (p) => <td className="px-3 py-2 align-top border-b border-border/60 text-muted-foreground" {...p} />,
};

export default function Documentation() {
  const [activeId, setActiveId] = useState('project');
  const active = TOPICS.flatMap((g) => g.items).find((t) => t.id === activeId) || TOPICS[0].items[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation"
        description="Technical reference for the platform: project overview, data model, backend contract, and full design documents for all seven games."
        icon={BookOpen}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Topic navigation */}
        <nav className="lg:w-64 shrink-0 space-y-4">
          {TOPICS.map((group) => (
            <div key={group.group}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeId === t.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Rendered document */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-card p-6 lg:p-8">
            <ReactMarkdown components={mdComponents}>{active.md}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}