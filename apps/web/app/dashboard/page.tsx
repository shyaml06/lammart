'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, TrendingUp, FileText, AlertTriangle,
  Users, DollarSign, Download, ArrowUpRight, ShoppingCart
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { formatINR, formatDate, formatDateTime } from '@/lib/formatters';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [dashRes, txnRes, lowRes] = await Promise.all([
          apiRequest('/reports/dashboard'),
          apiRequest('/transactions?limit=10'),
          apiRequest('/inventory/low-stock'),
        ]);

        setStats(dashRes.data);
        setRecentTxns(txnRes.data || []);
        setLowStockItems(lowRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Simple CSV export of recent transactions
  const exportCsv = () => {
    if (recentTxns.length === 0) return;
    const headers = ['DocNumber', 'Type', 'Customer', 'Date', 'Subtotal', 'Tax', 'GrandTotal', 'Status'];
    const rows = recentTxns.map((t) => [
      t.documentNumber,
      t.transactionType,
      `"${t.customer?.name || ''}"`,
      t.date,
      t.subtotal,
      Number(t.totalCgst) + Number(t.totalSgst) + Number(t.totalIgst),
      t.grandTotal,
      t.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lammart_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-[#0B7A55]" />
            <span>Store Overview & Management Summary</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time sales tracking, unbilled challan commitments, inventory alerts and GSTR sales export.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 bg-[#FAF8F4] border border-[#D9D3C7] hover:bg-white text-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export Sales CSV</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 bg-[#0B7A55] hover:bg-[#086143] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Bill / Challan</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Billed Sales */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Invoiced Sales</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-gray-900">
              {formatINR(stats?.todaySalesAmount || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-emerald-700">{stats?.todaySalesCount || 0}</span> Tax Invoices billed today
            </div>
          </div>
        </div>

        {/* KPI 2: Unbilled Challans */}
        <Link
          href="/challans"
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-col justify-between hover:border-emerald-500 transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unbilled Challans</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-amber-700">
              {stats?.unbilledChallans || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 group-hover:text-emerald-700">
              <span>Awaiting GST billing</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        {/* KPI 3: Pending Carpenter Commissions */}
        <Link
          href="/parties"
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-col justify-between hover:border-emerald-500 transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Commission</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-purple-900">
              {formatINR(stats?.pendingCommissionAmount || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 group-hover:text-purple-700">
              <span>{stats?.pendingCommissionCount || 0} carpenters pending</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        {/* KPI 4: Low Stock Items */}
        <Link
          href="/inventory"
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-col justify-between hover:border-red-400 transition group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock Warnings</span>
            <div className="p-2 bg-red-50 text-red-700 rounded-xl group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-red-700">
              {stats?.lowStockCount || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 group-hover:text-red-700">
              <span>Items at or below reorder level</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      </div>

      {/* Main Bottom Section: Recent Documents & Low Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#E7E2D9] overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-900 text-sm font-['Space_Grotesk']">
              Recent Transactions (Estimates, Challans, Invoices)
            </h3>
            <span className="text-xs text-gray-400">Latest 10 activities</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase font-semibold text-gray-600 bg-gray-50/40 border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Doc No.</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">Loading recent activities...</td>
                  </tr>
                ) : recentTxns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">No transactions recorded yet.</td>
                  </tr>
                ) : (
                  recentTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800 text-xs">
                        {t.documentNumber}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            t.transactionType === 'Delivery_Challan'
                              ? 'bg-blue-100 text-blue-800'
                              : t.transactionType === 'Tax_Invoice'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {t.transactionType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 text-xs">
                        {t.customer?.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 font-mono">{formatDate(t.date)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {formatINR(t.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        <span className="font-semibold text-gray-700">{t.status.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist (1 Col) */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E7E2D9] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-50/30">
            <h3 className="font-bold text-gray-900 text-sm font-['Space_Grotesk'] flex items-center gap-1.5 text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Low Stock Watchlist</span>
            </h3>
            <Link href="/inventory" className="text-xs text-emerald-700 font-semibold hover:underline">
              Manage →
            </Link>
          </div>

          <div className="p-4 divide-y divide-gray-100 overflow-y-auto max-h-[380px]">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                All SKUs are comfortably above reorder levels.
              </div>
            ) : (
              lowStockItems.slice(0, 8).map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-gray-900">
                      {item.brand} {item.design_code}
                    </div>
                    <div className="text-gray-500 text-[11px]">
                      {item.design_name} ({item.finish}) • in {item.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-red-600 text-sm">
                      {Number(item.quantity_on_hand)} {item.unit}s
                    </span>
                    <div className="text-[10px] text-gray-400">Min: {item.reorder_level}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
