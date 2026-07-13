import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — off-canvas on mobile, static on desktop */}
      <div
        className={cn(
          "fixed lg:relative z-50 h-full transition-transform duration-300 ease-in-out lg:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-y-auto scrollbar-thin w-full">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b bg-card sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <div className="min-h-full p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}