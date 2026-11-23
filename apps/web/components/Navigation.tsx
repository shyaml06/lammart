'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  FileText,
  Layers,
  Users,
  LayoutDashboard,
  ShieldCheck,
  PackagePlus,
  LogOut,
  ChevronDown,
  User,
  Sparkles,
  Warehouse
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const links = [
    { href: '/', label: 'Counter POS', icon: ShoppingCart },
    { href: '/challans', label: 'Pending Challans', icon: FileText },
    { href: '/inventory', label: 'Stock & Godown', icon: Layers },
    { href: '/items', label: 'Items Master', icon: PackagePlus, badge: 'Admin' },
    { href: '/parties', label: 'Parties Master', icon: Users },
    { href: '/dashboard', label: 'Owner Dashboard', icon: LayoutDashboard },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'Admin_Owner':
        return { label: 'Admin / Owner', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50', icon: ShieldCheck };
      case 'Billing_Counter':
        return { label: 'Billing Counter', color: 'bg-blue-950/80 text-blue-300 border-blue-700/50', icon: ShoppingCart };
      case 'Godown_Manager':
        return { label: 'Godown Manager', color: 'bg-amber-950/80 text-amber-300 border-amber-700/50', icon: Warehouse };
      default:
        return { label: 'Staff User', color: 'bg-zinc-800 text-zinc-300 border-zinc-700', icon: User };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  return (
    <header className="bg-[#0F1A15] text-[#E6EFEA] border-b border-[#1f3128] sticky top-0 z-40">
      <div className="max-w-[1500px] mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#0B7A55] flex items-center justify-center font-bold text-white text-lg shadow-md group-hover:scale-105 transition">
            L
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-normal tracking-tight text-xl text-white">LAMMART</span>
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#1b2f25] text-[#66c3a2] border border-[#2b4d3d]">
                Retail POS & Challan
              </span>
            </div>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav aria-label="POS navigation" className="order-last sm:order-none w-full sm:w-auto flex items-center gap-1 overflow-x-auto py-1 sm:py-0 no-scrollbar">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#0B7A55] text-white shadow-sm font-semibold'
                    : 'text-[#a3b8af] hover:text-white hover:bg-[#192b22]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-0.5 text-[10px] px-1.5 py-0.2 bg-[#1b2f25] text-emerald-300 rounded font-normal border border-emerald-800">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile & location pill */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <div className="text-[11px] text-[#8aa396]">Active Location</div>
            <div className="text-xs font-semibold text-white flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Showroom + Godown
            </div>
          </div>

          <div className="hidden lg:block h-6 w-px bg-[#233a2f]"></div>

          {/* User badge with dropdown */}
          <div className="relative" ref={dropdownRef}>
            {user ? (
              <div>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${roleInfo.color} hover:brightness-110`}
                >
                  <RoleIcon className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{user.displayName}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-[#16241D] border border-[#2b4437] rounded-xl shadow-xl py-2 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-[#25392e]">
                      <div className="font-semibold text-white">{user.displayName}</div>
                      <div className="text-[#8aa396] text-[11px] font-mono">@{user.username}</div>
                      <div className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1b2f25] text-emerald-300 border border-[#2b4d3d]">
                        Role: {user.role.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[#a3b8af] hover:text-white hover:bg-[#1f3328]"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Switch Account</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-300 hover:text-red-200 hover:bg-red-950/30 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-[#0B7A55] hover:bg-[#096647] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
