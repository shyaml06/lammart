'use client';

import { useState, useEffect } from 'react';
import {
  Users, UserCheck, DollarSign, CreditCard, CheckCircle2,
  Phone, Plus, Calendar, ArrowUpRight
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { formatINR, formatDate, formatDateTime } from '@/lib/formatters';

export default function PartiesPage() {
  const [activeTab, setActiveTab] = useState<'parties' | 'commissions'>('parties');

  // Parties state
  const [parties, setParties] = useState<any[]>([]);
  const [isLoadingParties, setIsLoadingParties] = useState(true);

  // Commissions state
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(true);

  // Payment receipt modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('UPI');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  const [notification, setNotification] = useState<string | null>(null);

  const loadParties = async () => {
    setIsLoadingParties(true);
    try {
      const res = await apiRequest('/parties?limit=100');
      setParties(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingParties(false);
    }
  };

  const loadCommissions = async () => {
    setIsLoadingCommissions(true);
    try {
      const res = await apiRequest('/reports/commissions?limit=100');
      setCommissions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCommissions(false);
    }
  };

  useEffect(() => {
    loadParties();
    loadCommissions();
  }, []);

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

      setNotification(`Payment of ${formatINR(payAmount)} received from ${selectedParty.name}`);
      setShowPaymentModal(false);
      setPayAmount(0);
      setPayRef('');
      setPayNotes('');
      loadParties();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
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
      setNotification(`Commission paid to ${name}!`);
      loadCommissions();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update commission');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0B7A55]" />
            <span>Party Ledgers & Carpenter Commission Tracking</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Customer outstanding dues, payment receipt entry, and Carpenter/Architect commission payouts.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-sm font-semibold">
          <button
            onClick={() => setActiveTab('parties')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'parties' ? 'bg-[#0B7A55] text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Parties & Customer Dues
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'commissions' ? 'bg-[#0B7A55] text-white shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Carpenter Commissions
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tab 1: Parties Table */}
      {activeTab === 'parties' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E7E2D9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Party Type</th>
                  <th className="py-3 px-4">GSTIN / State</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Current Balance</th>
                  <th className="py-3 px-4 text-center">Receipt Entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoadingParties ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">Loading parties...</td>
                  </tr>
                ) : (
                  parties.map((p) => {
                    const balance = Number(p.currentBalance || 0);

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {p.name}
                          {p.billingAddress && (
                            <div className="text-xs text-gray-400 font-normal truncate max-w-xs">
                              {p.billingAddress}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-700">{p.phone}</td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full font-medium">
                            {p.partyType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-600">
                          {p.gstin || 'Unregistered'} ({p.stateCode})
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs text-gray-500">
                          {formatINR(p.creditLimit)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                          <span className={balance > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                            {formatINR(balance)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedParty(p);
                              setShowPaymentModal(true);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-200 transition flex items-center gap-1 mx-auto"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Receive Pay</span>
                          </button>
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

      {/* Tab 2: Commissions Table */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E7E2D9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">
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
              <tbody className="divide-y divide-gray-200">
                {isLoadingCommissions ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">Loading commissions...</td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No commission entries generated yet. Tag a carpenter on a Tax Invoice to automatically accrue commissions.
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => {
                    const isPending = c.status === 'Pending';

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {c.referrer?.name}
                          <div className="text-xs text-gray-500 font-mono">{c.referrer?.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-800 text-xs">
                          {c.transaction?.documentNumber}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600">{formatDate(c.createdAt)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                          {formatINR(c.eligibleAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">{c.commissionPercent}%</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-gray-900">
                          {formatINR(c.commissionAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
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
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-mono">Paid {formatDate(c.paidAt)}</span>
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

      {/* Payment Receipt Modal */}
      {showPaymentModal && selectedParty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base font-['Space_Grotesk'] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <span>Receive Payment Receipt</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
              <div className="font-bold text-gray-900 text-sm">{selectedParty.name}</div>
              <div className="text-gray-600">
                Current Outstanding Balance: <span className="font-mono font-bold text-amber-800">{formatINR(selectedParty.currentBalance)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-base font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Cash', 'UPI', 'NEFT', 'Cheque'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayMode(mode)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border ${
                        payMode === mode ? 'bg-[#0B7A55] text-white border-[#0B7A55]' : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Ref / UTR / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-990141203"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Part payment against Site Bopal invoice"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0B7A55] hover:bg-[#086143] text-white px-5 py-2 rounded-xl text-xs font-bold shadow"
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
