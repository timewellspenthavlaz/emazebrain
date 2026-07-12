import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Film, Gamepad2, ExternalLink } from 'lucide-react';

export default function MediaPreviewDialog({ open, onOpenChange, item, contentType }) {
  if (!item) return null;
  const Icon = contentType === 'video' ? Film : Gamepad2;
  const isVideo = contentType === 'video';

  // Convert YouTube watch URLs to embed URLs
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  const embedUrl = getEmbedUrl(item.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-8">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <DialogTitle className="truncate">{item.title}</DialogTitle>
            </div>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="mt-2">
          {item.url ? (
            isVideo && item.link_type === 'cdn_upload' ? (
              <video src={embedUrl} controls autoPlay className="w-full rounded-lg border border-border max-h-[60vh]" />
            ) : (
              <iframe src={embedUrl} className="w-full rounded-lg border border-border" style={{ height: '60vh' }}
                      allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
            )
          ) : (
            <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
              <Icon className="w-10 h-10 text-muted-foreground/40" />
            </div>
          )}
          {item.description && (
            <p className="text-sm text-muted-foreground mt-3">{item.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}