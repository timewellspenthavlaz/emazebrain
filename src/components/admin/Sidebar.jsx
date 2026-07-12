import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  Users,
  Film,
  Gamepad2,
  Network,
  BarChart3,
  Settings,
  ChevronLeft,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { label: 'Analytics', icon: BarChart3, path: '/analytics' }
    ]
  },
  {
    label: 'Management',
    items: [
      { label: 'Clinics', icon: Building2, path: '/clinics' },
      { label: 'Therapists', icon: Stethoscope, path: '/therapists' },
      { label: 'Patients', icon: Users, path: '/patients' }
    ]
  },
  {
    label: 'Content & Taxonomy',
    items: [
      { label: 'Videos', icon: Film, path: '/videos' },
      { label: 'Games', icon: Gamepad2, path: '/games' },
      { label: 'Taxonomy', icon: Network, path: '/taxonomy' }
    ]
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', icon: Settings, path: '/settings' }
    ]
  }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out relative z-30",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shrink-0 shadow-lg shadow-primary/20">
            <Brain className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-heading font-bold text-lg tracking-tight text-white">
                eMaze<span className="text-accent">Brain</span>
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 mt-0.5 font-medium uppercase tracking-wider">Admin Panel</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-sidebar-primary-foreground")} strokeWidth={2} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}