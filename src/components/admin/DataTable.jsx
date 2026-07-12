import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function DataTable({
  data = [],
  columns = [],
  searchKeys = [],
  searchPlaceholder = 'Search...',
  emptyMessage = 'No records found',
  pageSize = 10,
  rowKey = 'id',
  onRowClick
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return data;
    const lower = search.toLowerCase();
    return data.filter(row =>
      searchKeys.some(key => {
        const val = row[key];
        if (val == null) return false;
        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(lower));
        return String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.ceil(sorted.length / pageSize);
  const currentData = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {searchKeys.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(0); }}
              placeholder={searchPlaceholder}
              className="pl-9 bg-background"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:text-foreground transition-colors select-none",
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="inline-flex">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="w-8 h-8 opacity-50" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentData.map((row, idx) => (
                <tr
                  key={row[rowKey] || idx}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    idx % 2 === 1 && "bg-muted/20",
                    onRowClick && "cursor-pointer hover:bg-primary/5"
                  )}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn("px-4 py-3 text-sm text-foreground", col.className)}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: pageCount }, (_, i) => i).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-8 h-8 text-xs font-medium rounded-md transition-colors",
                  page === currentPage
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                )}
              >
                {page + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(pageCount - 1, currentPage + 1))}
              disabled={currentPage >= pageCount - 1}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}