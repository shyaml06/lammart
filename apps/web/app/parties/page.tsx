'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  DollarSign,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Phone,
  Building,
  Briefcase,
  Layers,
  Sparkles,
  FileText,
  RefreshCw,
  X,
  CreditCard,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatINR, formatDate } from '@/lib/formatters';

const PARTY_ROLES = [
  { id: 'All', label: 'All Parties' },
  { id: 'Retail_Customer', label: 'Retail Customers' },
  { id: 'Architect_Designer', label: 'Architects & Designers' },
  { id: 'Carpenter', label: 'Carpenters' },
  { id: 'Contractor', label: 'Contractors' },
  { id: 'Supplier', label: 'Suppliers' },
] as const;

export default function PartiesMasterPage() {
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'directory' | 'commissions'>('directory');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Parties state
  const [parties, setParties] = useState<any[]>([]);
  const [totalParties, setTotalParties] = useState(0);
  const [isLoadingParties, setIsLoadingParties] = useState(true);

  // Commissions state
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(true);

  // Add / Edit Modal state
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any | null>(null);
  const [isSubmittingParty, setIsSubmittingParty] = useState(false);

  // Party Form fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPartyType, setFormPartyType] = useState('Retail_Customer');
  const [formGstin, setFormGstin] = useState('');
  const [formStateCode, setFormStateCode] = useState('24');
  const [formAddress, setFormAddress] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('0');
  const [formCommission, setFormCommission] = useState('0');

  // Payment receipt modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('UPI');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadParties = async () => {
    setIsLoadingParties(true);
    try {
      let endpoint = `/parties?limit=150`;
      if (selectedRole !== 'All') {
        endpoint += `&type=${encodeURIComponent(selectedRole)}`;
      }
      if (searchQuery.trim()) {
        endpoint += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await apiRequest(endpoint);
      setParties(res.data || []);
      setTotalParties(res.total || 0);
    } catch (err: any) {
      console.error(err);
      showNotification(err?.message || 'Failed to load parties', 'error');
    } finally {
      setIsLoadingParties(false);
    }
  };

  const loadCommissions = async () => {
    setIsLoadingCommissions(true);
    try {
      const res = await apiRequest('/reports/commissions?limit=100');
      setCommissions(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingCommissions(false);
    }
  };

  useEffect(() => {
    loadParties();
  }, [selectedRole]);

  useEffect(() => {
    if (activeTab === 'commissions') {
      loadCommissions();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadParties();
  };

  // Open Add Party modal
  const handleOpenAdd = () => {
    setEditingParty(null);
    setFormName('');
    setFormPhone('');
    setFormPartyType(selectedRole !== 'All' ? selectedRole : 'Retail_Customer');
    setFormGstin('');
    setFormStateCode('24');
    setFormAddress('');
    setFormCreditLimit('0');
    setFormCommission(selectedRole === 'Carpenter' || selectedRole === 'Architect_Designer' ? '5' : '0');
    setIsPartyModalOpen(true);
  };

  // Open Edit Party modal
  const handleOpenEdit = (p: any) => {
    setEditingParty(p);
    setFormName(p.name || '');
    setFormPhone(p.phone || '');
    setFormPartyType(p.partyType || 'Retail_Customer');
    setFormGstin(p.gstin || '');
    setFormStateCode(p.stateCode || '24');
    setFormAddress(p.billingAddress || '');
    setFormCreditLimit(p.creditLimit ? String(p.creditLimit) : '0');
    setFormCommission(p.defaultCommissionPercent ? String(p.defaultCommissionPercent) : '0');
    setIsPartyModalOpen(true);
  };

  // Save Party
  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showNotification('Party name and phone number are required', 'error');
      return;
    }

    setIsSubmittingParty(true);
    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim(),
        partyType: formPartyType,
        gstin: formGstin.trim() || null,
        stateCode: formStateCode.trim() || '24',
        billingAddress: formAddress.trim() || null,
        creditLimit: parseFloat(formCreditLimit) || 0,
        defaultCommissionPercent: parseFloat(formCommission) || 0,
      };

      if (editingParty) {
        await apiRequest(`/parties/${editingParty.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showNotification(`Party "${payload.name}" updated successfully`);
      } else {
        await apiRequest('/parties', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showNotification(`New party "${payload.name}" added to directory`);
      }

      setIsPartyModalOpen(false);
      loadParties();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save party', 'error');
    } finally {
      setIsSubmittingParty(false);
    }
  };

  // Delete Party
  const handleDeleteParty = async (party: any) => {
    if (!confirm(`Are you sure you want to delete ${party.name} (${party.phone})?`)) {
      return;
    }

    try {
      await apiRequest(`/parties/${party.id}`, {
        method: 'DELETE',
      });
      showNotification(`Party "${party.name}" removed from directory`);
      loadParties();
    } catch (err: any) {
      showNotification(err.message || 'Cannot delete party linked to transactions or ledgers', 'error');
    }
  };

  // Record payment receipt
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || payAmount <= 0) return;

    try {
      await apiRequest('/reports/payments', {
        method: 'POST',
        body: JSON.stringify({
          partyId: selectedParty.id,
          amount: payAmount,
          paymentMode: payMode,
          referenceNumber: payRef || null,
          notes: payNotes || null,
        }),
      });

      showNotification(`Payment of ${formatINR(payAmount)} received from ${selectedParty.name}`);
      setShowPaymentModal(false);
      setPayAmount(0);
      setPayRef('');
      setPayNotes('');
      loadParties();
    } catch (err: any) {
      showNotification(err.message || 'Failed to record payment', 'error');
    }
  };

  // Mark commission paid
  const handlePayCommission = async (id: string, name: string, amount: number) => {
    if (!confirm(`Mark ${formatINR(amount)} commission to ${name} as PAID?`)) return;

    try {
      await apiRequest(`/reports/commissions/${id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({ payoutNotes: 'Paid via direct counter transfer' }),
      });
      showNotification(`Commission paid to ${name}!`);
      loadCommissions();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update commission', 'error');
    }
  };

  const getRoleBadgeColor = (type: string) => {
    switch (type) {
      case 'Architect_Designer':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Carpenter':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Contractor':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Supplier':
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-surface rounded-2xl p-6 border border-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-text">
              Parties Directory & Master
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-soft text-accent font-semibold border border-accent/20">
              Customer & Partner Ledgers
            </span>
          </div>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Maintain customers, architects, carpenters, contractors, and suppliers. Track outstanding balances and referral commissions.
          </p>
        </div>

        {/* Tab Switcher & Add Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-sunken p-1 rounded-xl text-xs font-semibold border border-border">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'directory'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Parties Directory
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'commissions'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Carpenter Commissions
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Party</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Tab 1: Parties Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Category & Search Filter Bar */}
          <div className="bg-surface rounded-2xl p-4 border border-border space-y-4">
            {/* Category / Role filter tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
              <span className="text-text-muted shrink-0 mr-1 flex items-center gap-1">
                Role / Category:
              </span>
              {PARTY_ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                    selectedRole === role.id
                      ? 'bg-accent text-white font-semibold shadow-sm'
                      : 'bg-surface-sunken text-text-muted hover:text-text hover:bg-surface border border-border'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            {/* Search row */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by party name, phone number, or GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-24 py-2 bg-surface-sunken border border-border focus:border-border-strong rounded-xl text-xs md:text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition"
              >
                Search
              </button>
              <button
                type="button"
                onClick={loadParties}
                className="p-2 text-text-muted hover:text-text bg-surface-sunken border border-border rounded-xl transition"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingParties ? 'animate-spin' : ''}`} />
              </button>
            </form>
          </div>

          {/* Parties List Table */}
          <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="table-scroll">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="text-[11px] uppercase tracking-wider font-semibold text-text-muted bg-surface-sunken border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Party & Address</th>
                    <th className="py-3 px-4">Role / Category</th>
                    <th className="py-3 px-4">Phone / Contact</th>
                    <th className="py-3 px-4">GSTIN & State</th>
                    <th className="py-3 px-4 text-center">Default Comm.</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingParties ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-muted">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
                        <span>Loading parties directory...</span>
                      </td>
                    </tr>
                  ) : parties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-muted space-y-2">
                        <Users className="w-8 h-8 mx-auto text-text-faint" />
                        <div className="font-serif text-base text-text">No parties found</div>
                        <div className="text-xs text-text-muted">
                          {searchQuery
                            ? `No parties found matching "${searchQuery}".`
                            : 'No parties registered under this category yet.'}
                        </div>
                        <button
                          onClick={handleOpenAdd}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Party</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    parties.map((p) => {
                      const balance = Number(p.currentBalance || 0);

                      return (
                        <tr key={p.id} className="hover:bg-surface-sunken/40 transition">
                          {/* Name & Address */}
                          <td className="py-3.5 px-4 font-semibold text-text">
                            <div>{p.name}</div>
                            {p.billingAddress && (
                              <div className="text-[11px] text-text-muted font-normal truncate max-w-xs flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0 text-text-faint" />
                                <span>{p.billingAddress}</span>
                              </div>
                            )}
                          </td>

                          {/* Role / Category */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeColor(
                                p.partyType
                              )}`}
                            >
                              {p.partyType.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4 font-mono text-xs text-text">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-text-faint" />
                              <span>{p.phone}</span>
                            </div>
                          </td>

                          {/* GSTIN / State */}
                          <td className="py-3.5 px-4 text-xs font-mono text-text-muted">
                            {p.gstin ? (
                              <span className="font-semibold text-text">{p.gstin}</span>
                            ) : (
                              <span className="text-text-faint italic">Unregistered</span>
                            )}
                            <span className="text-[10px] ml-1 text-text-faint">(State {p.stateCode})</span>
                          </td>

                          {/* Comm % */}
                          <td className="py-3.5 px-4 text-center font-mono text-xs">
                            {p.defaultCommissionPercent > 0 ? (
                              <span className="font-bold text-accent">{p.defaultCommissionPercent}%</span>
                            ) : (
                              <span className="text-text-faint">-</span>
                            )}
                          </td>

                          {/* Credit Limit */}
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-text-muted">
                            {formatINR(p.creditLimit)}
                          </td>

                          {/* Current Balance */}
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-sm">
                            <span className={balance > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                              {formatINR(balance)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Receive Payment */}
                              <button
                                onClick={() => {
                                  setSelectedParty(p);
                                  setShowPaymentModal(true);
                                }}
                                className="px-2.5 py-1 bg-accent-soft hover:bg-accent text-accent hover:text-white rounded-lg text-xs font-semibold transition border border-accent/20"
                                title="Record Payment Receipt"
                              >
                                <DollarSign className="w-3.5 h-3.5 inline mr-0.5" />
                                <span>Pay</span>
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-text-muted hover:text-text bg-surface-sunken hover:bg-surface rounded-lg border border-border transition"
                                title="Edit Party Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteParty(p)}
                                className="p-1.5 text-text-muted hover:text-rose-700 bg-surface-sunken hover:bg-rose-50 rounded-lg border border-border hover:border-rose-200 transition"
                                title="Delete Party"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Commissions Table */}
      {activeTab === 'commissions' && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-sunken/40 flex justify-between items-center">
            <div>
              <h3 className="font-serif text-base font-medium text-text">
                Carpenter & Architect Commission Ledger
              </h3>
              <p className="text-xs text-text-muted">
                Commissions auto-accrue when you tag a carpenter or architect on GST Tax Invoices.
              </p>
            </div>
            <button
              onClick={loadCommissions}
              className="p-2 text-text-muted hover:text-text bg-surface border border-border rounded-xl transition"
              title="Refresh Commissions"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingCommissions ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="table-scroll">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="text-[11px] uppercase tracking-wider font-semibold text-text-muted bg-surface-sunken border-b border-border">
                <tr>
                  <th className="py-3 px-4">Carpenter / Architect</th>
                  <th className="py-3 px-4">Invoice No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Eligible Sales (₹)</th>
                  <th className="py-3 px-4 text-center">Comm. %</th>
                  <th className="py-3 px-4 text-right font-bold">Commission Amt (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoadingCommissions ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted">Loading commissions...</td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted space-y-1">
                      <FileText className="w-8 h-8 mx-auto text-text-faint" />
                      <div className="font-serif text-base text-text">No commission entries yet</div>
                      <div className="text-xs text-text-muted max-w-sm mx-auto">
                        Tag an architect or carpenter in the Counter POS when billing a Tax Invoice to automatically accrue commissions.
                      </div>
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => {
                    const isPending = c.status === 'Pending';

                    return (
                      <tr key={c.id} className="hover:bg-surface-sunken/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-text">
                          {c.referrer?.name}
                          <div className="text-[11px] text-text-muted font-mono">{c.referrer?.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-accent text-xs">
                          {c.transaction?.documentNumber}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-text-muted">{formatDate(c.createdAt)}</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-text">
                          {formatINR(c.eligibleAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">{c.commissionPercent}%</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-sm text-text">
                          {formatINR(c.commissionAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isPending ? (
                            <button
                              onClick={() => handlePayCommission(c.id, c.referrer?.name, Number(c.commissionAmount))}
                              className="bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded-lg text-xs font-semibold transition shadow-xs"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[11px] text-text-faint font-mono">Paid {formatDate(c.paidAt)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Party Modal */}
      {isPartyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl max-w-lg w-full border border-border shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-sunken/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-medium text-text">
                    {editingParty ? 'Edit Party Details' : 'Add New Party / Customer'}
                  </h2>
                  <p className="text-xs text-text-muted">
                    Set role, GSTIN, credit limit, and commission percentage.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPartyModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="p-6 space-y-4">
              {/* Role / Category selector */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Party Category / Role *
                </label>
                <select
                  value={formPartyType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setFormPartyType(newType);
                    if ((newType === 'Carpenter' || newType === 'Architect_Designer') && formCommission === '0') {
                      setFormCommission('5');
                    }
                  }}
                  className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent font-semibold"
                >
                  <option value="Retail_Customer">Retail Customer (Walk-in / Direct Buyer)</option>
                  <option value="Architect_Designer">Architect & Interior Designer</option>
                  <option value="Carpenter">Carpenter / Fabricator</option>
                  <option value="Contractor">Contractor / Builder</option>
                  <option value="Supplier">Supplier / Laminate Manufacturer</option>
                </select>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Full Name / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel or Sky Interiors"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Phone Number * (10 Digits)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* GSTIN & State Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    GSTIN (Optional, for B2B)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text uppercase focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    State Code
                  </label>
                  <input
                    type="text"
                    value={formStateCode}
                    onChange={(e) => setFormStateCode(e.target.value)}
                    placeholder="24"
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Billing Address / Site Location */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Billing Address / Site Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 402, Shivalik Highstreet, Bopal Road, Ahmedabad"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Credit Limit & Commission */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Referral Comm. %
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formCommission}
                    onChange={(e) => setFormCommission(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPartyModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-sunken border border-border rounded-xl text-xs font-semibold text-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingParty}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingParty ? 'Saving Party...' : editingParty ? 'Save Changes' : 'Create Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {showPaymentModal && selectedParty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-medium text-text text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                <span>Receive Payment Receipt</span>
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-sunken"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-surface-sunken p-3.5 rounded-xl text-xs space-y-1 border border-border">
              <div className="font-semibold text-text text-sm">{selectedParty.name}</div>
              <div className="text-text-muted">
                Current Outstanding Balance:{' '}
                <span className="font-mono font-bold text-amber-800">
                  {formatINR(selectedParty.currentBalance)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-text-muted block mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-surface-sunken border border-border rounded-xl px-3 py-2 text-base font-mono font-bold text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="font-medium text-text-muted block mb-1">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Cash', 'UPI', 'NEFT', 'Cheque'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayMode(mode)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                        payMode === mode
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface text-text-muted border-border hover:bg-surface-sunken'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-medium text-text-muted block mb-1">
                  Ref / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-990141203"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="font-medium text-text-muted block mb-1">Notes / Site Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Part payment against Site Bopal invoice"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:bg-surface-sunken text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
