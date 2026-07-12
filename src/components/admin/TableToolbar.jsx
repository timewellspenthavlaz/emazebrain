import React from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  sortValue,
  onSortChange,
  sortOptions = [],
  onClear
}) {
  const hasActiveFilters = filters.some(f => f.value !== 'all') || (search && search.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {search !== undefined && onSearchChange && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => onSearchChange(e.target.value)} placeholder={searchPlaceholder} className="pl-9 bg-card" />
        </div>
      )}
      {filters.map(f => (
        <Select key={f.key} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger className="w-[170px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{f.allLabel || 'All'}</SelectItem>
            {f.options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {sortOptions.length > 0 && (
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] bg-card ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hasActiveFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs">
          <X className="w-3.5 h-3.5 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}