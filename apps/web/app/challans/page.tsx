'use client';

import { useState, useEffect } from 'react';
import {
  FileText, CheckSquare, Square, ArrowRight,
  Printer, XCircle, AlertCircle, Building2, User
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { formatINR, formatDate } from '@/lib/formatters';
import PrintModal from '@/components/PrintModal';

interface Challan {
  id: string;
  documentNumber: string;
  date: string;
  customerId: string;
  customer: { id: string; name: string; phone: string };
  referrerId?: string;
  referrer?: { id: string; name: string; phone: string };
  status: string;
  dispatchFrom?: string;
  transportDetails?: string;
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  lineItems: any[];
}

export default function PendingChallansPage() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [selectedChallanIds, setSelectedChallanIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  // Load unbilled challans
  const loadChallans = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/transactions?type=Delivery_Challan&status=Unbilled_Challan');
      setChallans(res.data || []);
      setSelectedChallanIds([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load pending challans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, []);

  // Toggle selection
  const handleToggleSelect = (id: string, customerId: string) => {
    // If selecting a new challan, verify it belongs to the same customer as already selected ones
    if (!selectedChallanIds.includes(id)) {
      if (selectedChallanIds.length > 0) {
        const firstSelected = challans.find((c) => c.id === selectedChallanIds[0]);
        if (firstSelected && firstSelected.customerId !== customerId) {
          setErrorMsg('You can only merge challans for the same customer into a single Tax Invoice.');
          return;
        }
      }
      setErrorMsg(null);
      setSelectedChallanIds((prev) => [...prev, id]);
    } else {
      setSelectedChallanIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // Convert selected challans to GST Invoice
  const handleConvertChallans = async () => {
    if (selectedChallanIds.length === 0) return;
    setIsConverting(true);
    setErrorMsg(null);

    try {
      const res = await apiRequest('/transactions/convert-challan', {
        method: 'POST',
        body: JSON.stringify({ challanIds: selectedChallanIds }),
      });

      setCreatedInvoice(res.data);
      setSelectedChallanIds([]);
      loadChallans(); // Refresh list
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to convert challans');
    } finally {
      setIsConverting(false);
    }
  };

  // Cancel / Return Challan (Restocks inventory)
  const handleCancelChallan = async (id: string, docNo: string) => {
    if (!confirm(`Are you sure you want to cancel and restock ${docNo}? Any deducted sheets will be returned to inventory.`)) {
      return;
    }

    try {
      await apiRequest(`/transactions/${id}/cancel`, { method: 'PATCH' });
      loadChallans();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel challan');
    }
  };

  // Group challans by customer for clarity
  const groupedByCustomer = challans.reduce((acc, c) => {
    const key = c.customer?.name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, Challan[]>);

  // Selected Total Value
  const selectedTotal = challans
    .filter((c) => selectedChallanIds.includes(c.id))
    .reduce((sum, c) => sum + Number(c.grandTotal), 0);

  return (
    <div className="space-y-6">
      {/* Header & Batch Conversion Action */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0B7A55]" />
            <span>Unbilled Delivery Challans</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Goods dispatched to sites awaiting conversion into GST Tax Invoices. No double-stock deduction occurs.
          </p>
        </div>

        {/* Batch Convert Action Button */}
        {selectedChallanIds.length > 0 && (
          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
            <div className="text-xs text-emerald-950">
              <span className="font-bold">{selectedChallanIds.length}</span> challan(s) selected | Total:{' '}
              <span className="font-mono font-bold text-emerald-800">{formatINR(selectedTotal)}</span>
            </div>
            <button
              onClick={handleConvertChallans}
              disabled={isConverting}
              className="bg-[#0B7A55] hover:bg-[#086143] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition flex items-center gap-1.5"
            >
              <span>{isConverting ? 'Converting...' : 'Convert to GST Tax Invoice'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span role="alert">{errorMsg}</span>
        </div>
      )}

      {/* Grouped Challans List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-[#E7E2D9]">
          Loading pending challans...
        </div>
      ) : Object.keys(groupedByCustomer).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-[#E7E2D9]">
          <FileText className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-gray-300" />
          <p className="font-medium text-gray-600 text-sm">No pending delivery challans!</p>
          <p className="text-xs text-gray-400 mt-1">All dispatched goods have been billed to GST Tax Invoices.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCustomer).map(([custName, custChallans]) => (
            <div key={custName} className="bg-white rounded-2xl shadow-sm border border-[#E7E2D9] overflow-hidden">
              {/* Customer Header */}
              <div className="bg-gray-50/80 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-gray-900 text-sm">{custName}</span>
                  <span className="text-xs text-gray-500 font-mono">({custChallans[0].customer?.phone})</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  {custChallans.length} Unbilled Challan(s)
                </span>
              </div>

              {/* Table of Challans for this customer */}
              <div role="region" aria-label="Challans table; scroll for more columns" tabIndex={0} className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase font-semibold text-gray-600 bg-gray-50/40 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Select</th>
                      <th className="py-3 px-4">Challan No.</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th className="py-3 px-4">Dispatch From</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4 text-right">Value (₹)</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {custChallans.map((c) => {
                      const isSelected = selectedChallanIds.includes(c.id);

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-gray-50/70 transition ${
                            isSelected ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <button
                              aria-pressed={isSelected}
                              aria-label={`Select challan ${c.documentNumber}`}
                              onClick={() => handleToggleSelect(c.id, c.customerId)}
                              className="icon-action text-emerald-800"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                            {c.documentNumber}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-600">{formatDate(c.date)}</td>
                          <td className="py-3 px-4 text-xs text-gray-700">
                            <div className="font-medium">
                              {c.lineItems?.length || 0} SKU(s) •{' '}
                              {c.lineItems?.reduce((s, li) => s + Number(li.quantity), 0)} Sheets
                            </div>
                            <div className="text-gray-400 truncate max-w-xs">
                              {c.lineItems?.map((li) => `${li.variant?.brand} ${li.variant?.designCode}`).join(', ')}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className="font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                              {c.dispatchFrom || 'Godown'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                            {c.transportDetails || 'Direct'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-gray-900">
                            {formatINR(c.grandTotal)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setCreatedInvoice(c)}
                                title="View and print challan"
                                aria-label={`View and print ${c.documentNumber}`}
                                className="text-gray-600 hover:text-emerald-700 icon-action hover:bg-gray-100"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelChallan(c.id, c.documentNumber)}
                                title="Cancel and restock"
                                aria-label={`Cancel and restock ${c.documentNumber}`}
                                className="text-red-500 hover:text-red-700 icon-action hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Print Modal */}
      {createdInvoice && (
        <PrintModal
          transaction={createdInvoice}
          onClose={() => setCreatedInvoice(null)}
        />
      )}
    </div>
  );
}
