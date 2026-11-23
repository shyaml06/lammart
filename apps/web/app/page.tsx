'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Trash2, Printer, Check, ArrowRight,
  Truck, UserCheck, ShieldAlert, FileSpreadsheet, Package,
  Layers, MapPin, Building2
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { formatINR } from '@/lib/formatters';
import PrintModal from '@/components/PrintModal';

interface Variant {
  id: string;
  brand: string;
  category: string;
  designCode: string;
  designName: string;
  finish: string;
  thicknessMm: number;
  size: string;
  unit: string;
  defaultSellingPrice: number;
  stockLedgers: { location: 'Showroom' | 'Godown'; quantityOnHand: number }[];
}

interface Party {
  id: string;
  name: string;
  phone: string;
  partyType: string;
  defaultCommissionPercent?: number;
}

interface CartItem {
  variant: Variant;
  quantity: number;
  rate: number;
  discountPercent: number;
}

export default function CounterBillingPage() {
  // Document mode
  const [docType, setDocType] = useState<'Delivery_Challan' | 'Tax_Invoice' | 'Estimate'>('Delivery_Challan');
  const [dispatchFrom, setDispatchFrom] = useState<'Showroom' | 'Godown'>('Godown');
  const [transportDetails, setTransportDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Parties
  const [customers, setCustomers] = useState<Party[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [referrers, setReferrers] = useState<Party[]>([]);
  const [selectedReferrerId, setSelectedReferrerId] = useState<string>('');

  // Search & Variant selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Variant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Line item inputs
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemRate, setItemRate] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Created Transaction for Print Modal
  const [createdTransaction, setCreatedTransaction] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Load Customers & Referrers on mount
  useEffect(() => {
    async function loadParties() {
      try {
        const custRes = await apiRequest('/parties?type=Retail_Customer');
        const contRes = await apiRequest('/parties?type=Contractor');
        const carpRes = await apiRequest('/parties?type=Carpenter');
        const archRes = await apiRequest('/parties?type=Architect_Designer');

        const allCust = [...(custRes.data || []), ...(contRes.data || [])];
        const allRef = [...(carpRes.data || []), ...(archRes.data || [])];

        setCustomers(allCust);
        if (allCust.length > 0) setSelectedCustomerId(allCust[0].id);

        setReferrers(allRef);
      } catch (err: any) {
        console.error('Failed to load parties:', err);
      }
    }
    loadParties();
  }, []);

  // Quick Autocomplete Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiRequest(`/catalog/variants?q=${encodeURIComponent(searchQuery)}&limit=10`);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When a variant is picked from search
  const handleSelectVariant = (v: Variant) => {
    setSelectedVariant(v);
    setItemRate(Number(v.defaultSellingPrice));
    setItemQty(1);
    setItemDiscount(0);
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  // Add line item
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVariant || itemQty <= 0) return;

    setCartItems((prev) => [
      ...prev,
      {
        variant: selectedVariant,
        quantity: itemQty,
        rate: itemRate,
        discountPercent: itemDiscount,
      },
    ]);

    setSelectedVariant(null);
    setItemQty(1);
    setItemRate(0);
    setItemDiscount(0);
    searchInputRef.current?.focus();
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const gross = item.quantity * item.rate;
    const discount = gross * (item.discountPercent / 100);
    return sum + (gross - discount);
  }, 0);

  const gstRate = 0.18; // 18% standard for laminates
  const taxAmount = docType === 'Estimate' ? 0 : subtotal * gstRate;
  const grandTotal = subtotal + taxAmount;

  // Selected Referrer Commission Preview
  const selectedReferrer = referrers.find((r) => r.id === selectedReferrerId);
  const commissionPercent = selectedReferrer?.defaultCommissionPercent || 0;
  const estimatedCommission = (subtotal * commissionPercent) / 100;

  // Submit Transaction (Save & Print)
  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Add at least one item to the bill');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        transactionType: docType,
        customerId: selectedCustomerId,
        referrerId: selectedReferrerId || null,
        dispatchFrom: docType === 'Estimate' ? null : dispatchFrom,
        transportDetails: transportDetails || null,
        notes: notes || null,
        lineItems: cartItems.map((item) => ({
          variantId: item.variant.id,
          quantity: item.quantity,
          rate: item.rate,
          discountPercent: item.discountPercent,
        })),
      };

      const res = await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedTransaction(res.data);
      // Reset form
      setCartItems([]);
      setTransportDetails('');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Mode & Settings Switcher */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E7E2D9] flex flex-wrap items-center justify-between gap-4">
        {/* Document Mode Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setDocType('Delivery_Challan')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              docType === 'Delivery_Challan'
                ? 'bg-[#0B7A55] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Delivery Challan
          </button>
          <button
            onClick={() => setDocType('Tax_Invoice')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              docType === 'Tax_Invoice'
                ? 'bg-[#0B7A55] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            GST Tax Invoice
          </button>
          <button
            onClick={() => setDocType('Estimate')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              docType === 'Estimate'
                ? 'bg-[#0B7A55] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Quotation / Estimate
          </button>
        </div>

        {/* Dispatch Location Selector (for Challan & Invoice) */}
        {docType !== 'Estimate' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 font-medium">Dispatch From:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                type="button"
                onClick={() => setDispatchFrom('Godown')}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  dispatchFrom === 'Godown' ? 'bg-emerald-800 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Main Godown
              </button>
              <button
                type="button"
                onClick={() => setDispatchFrom('Showroom')}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  dispatchFrom === 'Showroom' ? 'bg-emerald-800 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Showroom Display
              </button>
            </div>
          </div>
        )}

        {/* Transport Details */}
        <div className="flex items-center gap-2 text-sm">
          <Truck className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Vehicle / Tempo No. (e.g. GJ01AB1234)"
            value={transportDetails}
            onChange={(e) => setTransportDetails(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Main Grid: Left = Item Entry & Cart, Right = Customer & Billing Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Autocomplete & Cart Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Search & Fast Entry Bar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
                <Search className="w-4 h-4 text-[#0B7A55]" />
                <span>Instant Shade & SKU Search</span>
              </h2>
              <span className="text-xs text-gray-500">
                Type shade code, brand or finish (e.g. <span className="font-mono text-emerald-700 font-semibold">"21094 suede"</span>)
              </span>
            </div>

            {/* Autocomplete Input */}
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Brand + Shade Code + Finish (Press Enter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0B7A55] focus:bg-white text-gray-900 shadow-inner"
              />

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {searchResults.map((v) => {
                    const showroomStock = v.stockLedgers?.find((s) => s.location === 'Showroom')?.quantityOnHand || 0;
                    const godownStock = v.stockLedgers?.find((s) => s.location === 'Godown')?.quantityOnHand || 0;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className="w-full text-left p-3 hover:bg-emerald-50/60 transition flex items-center justify-between text-sm group"
                      >
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-emerald-800">
                            {v.brand} - {v.designCode} ({v.designName})
                          </div>
                          <div className="text-xs text-gray-500">
                            {v.finish} | {v.thicknessMm}mm | {v.size} | {v.category}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div className="text-xs space-y-0.5">
                            <div className="text-gray-600">
                              Godown: <span className="font-bold text-gray-900">{godownStock}</span>
                            </div>
                            <div className="text-gray-600">
                              Showroom: <span className="font-bold text-gray-900">{showroomStock}</span>
                            </div>
                          </div>
                          <div className="font-mono font-bold text-emerald-700 text-base">
                            {formatINR(v.defaultSellingPrice)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Variant - Fast Keyboard Entry Form */}
            {selectedVariant && (
              <form onSubmit={handleAddItem} className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-emerald-950 text-base">
                    {selectedVariant.brand} {selectedVariant.designCode} — {selectedVariant.designName}
                  </div>
                  <div className="text-xs text-emerald-700 font-medium">
                    {selectedVariant.finish} • {selectedVariant.thicknessMm}mm • {selectedVariant.size}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Quantity ({selectedVariant.unit})</label>
                    <input
                      ref={qtyInputRef}
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Selling Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemRate}
                      onChange={(e) => setItemRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-[#0B7A55] hover:bg-[#086143] text-white font-semibold py-2 px-4 rounded-lg text-sm shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Bill</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Line Items Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E7E2D9] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm font-['Space_Grotesk']">
                Billed Items ({cartItems.length})
              </h3>
              <span className="text-xs text-gray-500">Live Item Ledger</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-gray-300" />
                <p className="font-medium text-sm">No items in the bill yet.</p>
                <p className="text-xs text-gray-400 mt-1">Use the search box above to add laminates or hardware.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100/75 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Brand & Design</th>
                      <th className="py-3 px-4">Finish / Thickness</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Rate</th>
                      <th className="py-3 px-4 text-right">Disc %</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cartItems.map((item, idx) => {
                      const lineGross = item.quantity * item.rate;
                      const lineNet = lineGross - lineGross * (item.discountPercent / 100);

                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {item.variant.brand} {item.variant.designCode}
                            <div className="text-xs text-gray-500 font-normal">{item.variant.designName}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-xs">
                            {item.variant.finish} | {item.variant.thicknessMm}mm
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-900">
                            {item.quantity} {item.variant.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">{formatINR(item.rate)}</td>
                          <td className="py-3 px-4 text-right font-mono text-gray-500">
                            {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                            {formatINR(lineNet)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Selection, Commission & Summary */}
        <div className="space-y-6">
          {/* Party & Referrer Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] space-y-4">
            <h3 className="font-bold text-gray-900 text-base font-['Space_Grotesk'] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0B7A55]" />
              <span>Customer & Referrer</span>
            </h3>

            {/* Customer Dropdown */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Billed To (Customer / Contractor)</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) — {c.partyType.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Carpenter / Architect Referrer Dropdown */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tag Carpenter / Architect (Optional)</label>
              <select
                value={selectedReferrerId}
                onChange={(e) => setSelectedReferrerId(e.target.value)}
                className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="">No Referrer</option>
                {referrers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.phone}) — {r.partyType} ({r.defaultCommissionPercent}% comm.)
                  </option>
                ))}
              </select>

              {/* Live Commission Calculation Preview */}
              {selectedReferrer && subtotal > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex justify-between items-center">
                  <span>Commission ({commissionPercent}%):</span>
                  <span className="font-mono font-bold text-amber-800">{formatINR(estimatedCommission)}</span>
                </div>
              )}
            </div>

            {/* Bill Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Remarks / Site Address</label>
              <textarea
                rows={2}
                placeholder="e.g. Deliver to Villa 42, Bopal site"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Payment & Bill Totals Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] space-y-4">
            <h3 className="font-bold text-gray-900 text-base font-['Space_Grotesk']">
              Summary & Totals
            </h3>

            <div className="space-y-2 text-sm border-b border-gray-200 pb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Net Items):</span>
                <span className="font-mono font-semibold text-gray-900">{formatINR(subtotal)}</span>
              </div>
              {docType !== 'Estimate' && (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>GST (CGST 9% + SGST 9%):</span>
                  <span className="font-mono">{formatINR(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 text-lg font-black text-gray-900">
                <span>Grand Total:</span>
                <span className="font-mono text-[#0B7A55] text-xl">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Save & Print Action Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cartItems.length === 0}
              className={`w-full py-3.5 px-6 rounded-xl text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2 ${
                cartItems.length === 0 || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#0B7A55] hover:bg-[#086143]'
              }`}
            >
              <Printer className="w-5 h-5" />
              <span>
                {isSubmitting ? 'Creating...' : `Save & Print ${docType.replace('_', ' ')}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {createdTransaction && (
        <PrintModal
          transaction={createdTransaction}
          onClose={() => setCreatedTransaction(null)}
        />
      )}
    </div>
  );
}
