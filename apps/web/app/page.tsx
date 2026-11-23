'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Trash2, Printer, ArrowRight,
  Truck, UserCheck, ShieldAlert, Package,
  Layers, AlertTriangle, RefreshCw
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
  hsnCode?: string;
  gstRate?: number;
  unit: string;
  defaultSellingPrice: number;
  stockLedgers: { location: 'Showroom' | 'Godown'; quantityOnHand: number }[];
}

interface Party {
  id: string;
  name: string;
  phone: string;
  partyType: string;
  stateCode?: string;
  defaultCommissionPercent?: number;
}

interface CartItem {
  id: string;
  variant: Variant;
  quantity: number | string;
  rate: number;
  discountPercent: number;
}

export function formatPartyType(type?: string): string {
  if (!type) return '';
  return type.replace(/_/g, ' ');
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
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [partyError, setPartyError] = useState('');

  // Search & Variant selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Variant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Line item inputs (itemQty stored as string to allow empty while typing)
  const [itemQty, setItemQty] = useState<string>('1');
  const [itemRate, setItemRate] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [allowOversell, setAllowOversell] = useState<boolean>(false);

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Created Transaction for Print Modal
  const [createdTransaction, setCreatedTransaction] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userNotification, setUserNotification] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeResult, setActiveResult] = useState(-1);
  const [searchError, setSearchError] = useState('');
  const submitLock = useRef(false);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    qtyInputRef.current?.focus();
    qtyInputRef.current?.select();
  }, [selectedVariant]);

  useEffect(() => {
    if (activeResult >= 0) document.getElementById(`sku-option-${activeResult}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeResult]);

  // Load Customers & Referrers
  const loadParties = async () => {
    setPartiesLoading(true);
    setPartyError('');
    try {
      const [custRes, contRes, carpRes, archRes] = await Promise.all([
        apiRequest('/parties?type=Retail_Customer'),
        apiRequest('/parties?type=Contractor'),
        apiRequest('/parties?type=Carpenter'),
        apiRequest('/parties?type=Architect_Designer'),
      ]);

      const allCust: Party[] = [...(custRes.data || []), ...(contRes.data || [])];
      const allRef: Party[] = [...(carpRes.data || []), ...(archRes.data || [])];

      setCustomers(allCust);
      setReferrers(allRef);
    } catch {
      setPartyError('Failed to load customers and referrers. Please check connection and retry.');
    } finally {
      setPartiesLoading(false);
    }
  };

  useEffect(() => {
    loadParties();
  }, []);

  // Quick Autocomplete Search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError('');

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(`/catalog/variants?q=${encodeURIComponent(query)}&limit=10`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setSearchResults(res.data || []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchError('Search failed. Refine your query or check connection.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // When a variant is picked from search
  const handleSelectVariant = (v: Variant) => {
    setSelectedVariant(v);
    setItemRate(Math.max(0, Number(v.defaultSellingPrice)));
    setItemQty('1');
    setItemDiscount(0);
    setAllowOversell(false);
    setSearchQuery('');
    setSearchResults([]);
    setActiveResult(-1);
  };

  // Stock check for selected variant
  const selectedLocationStock = selectedVariant
    ? Number(selectedVariant.stockLedgers?.find((s) => s.location === dispatchFrom)?.quantityOnHand || 0)
    : 0;
  const parsedQty = parseFloat(itemQty) || 0;
  const isStockDeficit = Boolean(selectedVariant && docType !== 'Estimate' && parsedQty > selectedLocationStock);

  // Add line item (with duplicate merge logic)
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVariant || parsedQty <= 0) return;

    if (isStockDeficit && !allowOversell) {
      setErrorMessage(`Insufficient stock in ${dispatchFrom} (${selectedLocationStock} available). Check override to proceed.`);
      return;
    }

    setErrorMessage(null);

    // Merge duplicate variants if already present in cart
    const existingIndex = cartItems.findIndex((ci) => ci.variant.id === selectedVariant.id);
    if (existingIndex >= 0) {
      const existing = cartItems[existingIndex];
      const newQty = (parseFloat(String(existing.quantity)) || 0) + parsedQty;
      const updatedCart = [...cartItems];
      updatedCart[existingIndex] = {
        ...existing,
        quantity: newQty,
        rate: itemRate,
        discountPercent: itemDiscount,
      };
      setCartItems(updatedCart);
      setUserNotification(`Merged into existing line: ${selectedVariant.brand} ${selectedVariant.designCode} now at ${newQty} ${selectedVariant.unit}s.`);
      setTimeout(() => setUserNotification(null), 3500);
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          id: `cart-${selectedVariant.id}-${Date.now()}`,
          variant: selectedVariant,
          quantity: parsedQty,
          rate: itemRate,
          discountPercent: itemDiscount,
        },
      ]);
    }

    setSelectedVariant(null);
    setItemQty('1');
    setItemRate(0);
    setItemDiscount(0);
    setAllowOversell(false);
    searchInputRef.current?.focus();
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Selected customer info
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const isSameState = (selectedCustomer?.stateCode || '24') === '24'; // Store state is 24 (Gujarat)

  // Compute money with integer paise math (preventing float drift)
  let totalTaxablePaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;

  cartItems.forEach((item) => {
    const qty = parseFloat(String(item.quantity)) || 0;
    const ratePaise = Math.round(item.rate * 100);
    const disc = Math.min(100, Math.max(0, item.discountPercent || 0));
    const grossPaise = Math.round(qty * ratePaise);
    const discountPaise = Math.round((grossPaise * disc) / 100);
    const lineTaxablePaise = grossPaise - discountPaise;
    totalTaxablePaise += lineTaxablePaise;

    if (docType !== 'Estimate') {
      const gstRate = Number(item.variant.gstRate ?? 18);
      if (isSameState) {
        const halfRate = gstRate / 2;
        const cgstPaise = Math.round((lineTaxablePaise * halfRate) / 100);
        const sgstPaise = Math.round((lineTaxablePaise * halfRate) / 100);
        totalCgstPaise += cgstPaise;
        totalSgstPaise += sgstPaise;
      } else {
        const igstPaise = Math.round((lineTaxablePaise * gstRate) / 100);
        totalIgstPaise += igstPaise;
      }
    }
  });

  const subtotal = totalTaxablePaise / 100;
  const totalCgst = totalCgstPaise / 100;
  const totalSgst = totalSgstPaise / 100;
  const totalIgst = totalIgstPaise / 100;
  const taxAmount = (totalCgstPaise + totalSgstPaise + totalIgstPaise) / 100;
  const grandTotal = (totalTaxablePaise + totalCgstPaise + totalSgstPaise + totalIgstPaise) / 100;

  // Selected Referrer Commission Preview
  const selectedReferrer = referrers.find((r) => r.id === selectedReferrerId);
  const commissionPercent = selectedReferrer?.defaultCommissionPercent ?? 0;
  const estimatedCommission = Math.round((subtotal * commissionPercent)) / 100;

  // Submit Transaction (Save & Print)
  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer or Walk-in Customer before creating a transaction.');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Add at least one item to the bill before submitting.');
      return;
    }

    if (submitLock.current) return;
    submitLock.current = true;
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
          quantity: parseFloat(String(item.quantity)) || 1,
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
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" onKeyDown={(e) => {
      if (e.defaultPrevented || e.nativeEvent.isComposing || e.repeat || createdTransaction) return;
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F8' && !searchResults.length && !selectedVariant && !submitLock.current) {
        e.preventDefault();
        setDocType(current => current === 'Delivery_Challan' ? 'Tax_Invoice' : current === 'Tax_Invoice' ? 'Estimate' : 'Delivery_Challan');
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !selectedVariant && !searchResults.length) {
        e.preventDefault();
        void handleSubmit();
      }
    }}>
      {/* Top Banner: Mode & Settings Switcher */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E7E2D9] flex flex-wrap items-center justify-between gap-4">
        {/* Document Mode Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            aria-pressed={docType === 'Delivery_Challan'}
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
            aria-pressed={docType === 'Tax_Invoice'}
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
            aria-pressed={docType === 'Estimate'}
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Autocomplete & Cart Table */}
        <div className="min-w-0 xl:col-span-2 space-y-6">
          {/* Quick Search & Fast Entry Bar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                aria-label="Search shades and SKUs"
                aria-describedby="pos-shortcuts"
                aria-keyshortcuts="F2"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchResults.length > 0}
                autoComplete="off"
                aria-controls={searchResults.length ? 'sku-results' : undefined}
                aria-activedescendant={activeResult >= 0 ? `sku-option-${activeResult}` : undefined}
                onBlur={() => { setSearchResults([]); setActiveResult(-1); }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
                  if (!searchResults.length) return;
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const delta = e.key === 'ArrowDown' ? 1 : -1;
                    setActiveResult(i => i < 0 ? (delta === 1 ? 0 : searchResults.length - 1) : (i + delta + searchResults.length) % searchResults.length);
                  } else if (e.key === 'Enter' && activeResult >= 0) {
                    e.preventDefault();
                    handleSelectVariant(searchResults[activeResult]);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchResults([]);
                    setActiveResult(-1);
                  }
                }}
                ref={searchInputRef}
                type="text"
                placeholder="Brand, shade code or finish"
                value={searchQuery}
                onChange={(e) => {
                  setSearchResults([]);
                  setActiveResult(-1);
                  setSearchError('');
                  setIsSearching(Boolean(e.target.value.trim()));
                  setSearchQuery(e.target.value);
                }}
                className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0B7A55] focus:bg-white text-gray-900 shadow-inner"
              />

              <p id="pos-shortcuts" className="mt-2 text-xs text-content-muted">F2 Search · ↑ ↓ Choose · Enter Select · F8 Change document · Ctrl/⌘ + Enter Save &amp; Print</p>
              <p role="status" className="sr-only">{isSearching ? 'Searching' : searchQuery && !searchError ? `${searchResults.length} suggestions` : ''}</p>
              {searchError && <p role="alert" className="mt-2 text-sm text-red-800">{searchError}</p>}
              {isSearching && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  <span>Searching catalog variants...</span>
                </div>
              )}
              {searchQuery.trim() && !isSearching && !searchError && !searchResults.length && <p className="mt-2 text-sm text-gray-700">No suggestions displayed. Refine your search.</p>}
              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div id="sku-results" role="listbox" aria-label="Matching variants" className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {searchResults.map((v, index) => {
                    const showroomStock = v.stockLedgers?.find((s) => s.location === 'Showroom')?.quantityOnHand || 0;
                    const godownStock = v.stockLedgers?.find((s) => s.location === 'Godown')?.quantityOnHand || 0;

                    return (
                      <div
                        key={v.id}
                        id={`sku-option-${index}`}
                        role="option"
                        aria-selected={activeResult === index}
                        onPointerDown={(event) => { event.preventDefault(); }}
                        onClick={() => handleSelectVariant(v)}
                        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 p-3 text-left text-sm hover:bg-primary-tint ${activeResult === index ? "bg-primary-tint ring-2 ring-inset ring-primary" : ""}`}
                      >
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-emerald-800">
                            {v.brand} - {v.designCode} ({v.designName})
                          </div>
                          <div className="text-xs text-gray-500">
                            {v.finish} | {v.thicknessMm}mm | {v.size} | {v.category}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div className="text-xs space-y-1">
                            <div className={`px-2 py-0.5 rounded ${dispatchFrom === 'Godown' ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300' : 'text-gray-600'}`}>
                              Godown: <span className="font-bold">{godownStock}</span>
                            </div>
                            <div className={`px-2 py-0.5 rounded ${dispatchFrom === 'Showroom' ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300' : 'text-gray-600'}`}>
                              Showroom: <span className="font-bold">{showroomStock}</span>
                            </div>
                          </div>
                          <div className="font-mono font-bold text-emerald-700 text-base">
                            {formatINR(v.defaultSellingPrice)}
                          </div>
                        </div>
                      </div>
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

                {isStockDeficit && (
                  <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Warning: Only {selectedLocationStock} available in {dispatchFrom} (requested {parsedQty || 0}).</span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-amber-950">
                      <input
                        type="checkbox"
                        checked={allowOversell}
                        onChange={(e) => setAllowOversell(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Allow Oversell / Backorder</span>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1 xl:grid-cols-4">
                  <div>
                    <label htmlFor="line-qty" className="text-xs font-semibold text-gray-600 block mb-1">Quantity ({selectedVariant.unit})</label>
                    <input
                      id="line-qty"
                      ref={qtyInputRef}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          if (e.currentTarget.reportValidity()) { rateInputRef.current?.focus(); rateInputRef.current?.select(); }
                        }
                      }}
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      onBlur={() => {
                        if (!itemQty || parseFloat(itemQty) <= 0) setItemQty('1');
                      }}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="line-rate" className="text-xs font-semibold text-gray-600 block mb-1">Selling Rate (₹)</label>
                    <input
                      type="number"
                      ref={rateInputRef}
                      id="line-rate"
                      min="0"
                      step="0.01"
                      value={itemRate}
                      onChange={(e) => setItemRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="pos-discount" className="text-xs font-semibold text-gray-600 block mb-1">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      id="pos-discount"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
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
                      const qty = parseFloat(String(item.quantity)) || 0;
                      const lineGross = qty * item.rate;
                      const lineNet = lineGross - lineGross * (item.discountPercent / 100);

                      return (
                        <tr key={item.id || idx} className="hover:bg-gray-50 transition">
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
                              aria-label={`Remove line ${idx + 1}: ${item.variant.designCode}`}
                              title={`Remove line ${idx + 1}`}
                              className="text-red-500 hover:text-red-700 inline-grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-red-50 transition"
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
              <label htmlFor="pos-customer" className="text-xs font-semibold text-gray-600 block mb-1">
                Billed To (Customer / Contractor) <span className="text-red-500">*</span>
              </label>
              <select
                id="pos-customer"
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
              >
                <option value="">-- Select Customer or Cash Walk-in --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) — {formatPartyType(c.partyType)}
                  </option>
                ))}
              </select>
            </div>

            {/* Carpenter / Architect Referrer Dropdown */}
            <div>
              <label htmlFor="pos-referrer" className="text-xs font-semibold text-gray-600 block mb-1">Tag Carpenter / Architect (Optional)</label>
              <select
                id="pos-referrer"
                value={selectedReferrerId}
                onChange={(e) => setSelectedReferrerId(e.target.value)}
                className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
              >
                <option value="">No Referrer</option>
                {referrers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.phone}) — {formatPartyType(r.partyType)} ({r.defaultCommissionPercent != null ? `${r.defaultCommissionPercent}% comm.` : '0% comm.'})
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
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base font-['Space_Grotesk']">
                Summary & Totals
              </h3>
              <span className="text-[11px] text-gray-400 italic">Preview only</span>
            </div>

            <div className="space-y-2 text-sm border-b border-gray-200 pb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Taxable Net):</span>
                <span className="font-mono font-semibold text-gray-900">{formatINR(subtotal)}</span>
              </div>
              {docType === 'Estimate' ? (
                <div className="flex justify-between text-gray-500 text-xs italic">
                  <span>GST (Quotation):</span>
                  <span className="font-mono">Tax Free (₹0.00)</span>
                </div>
              ) : isSameState ? (
                <>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>CGST (Intra-state):</span>
                    <span className="font-mono">{formatINR(totalCgst)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>SGST (Intra-state):</span>
                    <span className="font-mono">{formatINR(totalSgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>IGST (Inter-state - {selectedCustomer?.stateCode || 'Out of state'}):</span>
                  <span className="font-mono">{formatINR(totalIgst)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 text-lg font-black text-gray-900">
                <span>Grand Total:</span>
                <span className="font-mono text-[#0B7A55] text-xl">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {userNotification && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-medium">
                {userNotification}
              </div>
            )}

            {partyError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center justify-between gap-2">
                <span role="alert">{partyError}</span>
                <button
                  type="button"
                  onClick={loadParties}
                  disabled={partiesLoading}
                  className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-800 px-2.5 py-1 rounded-lg font-semibold text-xs transition shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${partiesLoading ? 'animate-spin' : ''}`} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span role="alert">{errorMessage}</span>
              </div>
            )}

            {/* Save & Print Action Button */}
            <button
              onClick={handleSubmit}
              aria-keyshortcuts="Control+Enter Meta+Enter"
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
          onClose={() => { setCreatedTransaction(null); requestAnimationFrame(() => searchInputRef.current?.focus()); }}
        />
      )}
    </div>
  );
}
