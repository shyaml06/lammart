'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Trash2, Printer, ArrowRight,
  Truck, UserCheck, ShieldAlert, Package,
  Layers, AlertTriangle, RefreshCw, X, UserPlus, Check
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
  gstin?: string;
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

  // Customer Combobox & Add Customer Modal
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustType, setNewCustType] = useState('Retail_Customer');
  const [newCustState, setNewCustState] = useState('24');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [isSavingParty, setIsSavingParty] = useState(false);
  const [partyCreateError, setPartyCreateError] = useState('');
  const customerComboboxRef = useRef<HTMLDivElement>(null);

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

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeResult, setActiveResult] = useState(-1);
  const [searchError, setSearchError] = useState('');
  const submitLock = useRef(false);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Autofocus search on load
  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) searchInputRef.current?.focus();
  }, []);

  // Autofocus qty when a variant is selected
  useEffect(() => {
    if (selectedVariant) {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }
  }, [selectedVariant]);

  // Keep active result scrolled into view
  useEffect(() => {
    if (activeResult >= 0) document.getElementById(`sku-option-${activeResult}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeResult]);

  // Click-outside listener for Search dropdown and Customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
        setActiveResult(-1);
      }
      if (customerComboboxRef.current && !customerComboboxRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Warn on page leave (beforeunload) when cart has items
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cartItems.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cartItems.length]);

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
          setActiveResult(0); // Default to first result
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
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  // Inline update of cart item fields
  const handleUpdateCartItem = (id: string, field: 'quantity' | 'rate' | 'discountPercent', value: any) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      })
    );
  };

  // Remove line item by ID
  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Quick Add Customer Handler
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setPartyCreateError('Name and phone number are required.');
      return;
    }
    setIsSavingParty(true);
    setPartyCreateError('');
    try {
      const res = await apiRequest('/parties', {
        method: 'POST',
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          partyType: newCustType,
          stateCode: newCustState.trim() || '24',
          gstin: newCustGstin.trim() || null,
        }),
      });

      const newParty: Party = res.data;
      setCustomers((prev) => [newParty, ...prev]);
      setSelectedCustomerId(newParty.id);
      setIsAddCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustGstin('');
      setUserNotification(`Customer "${newParty.name}" added and selected.`);
      setTimeout(() => setUserNotification(null), 3500);
    } catch (err: any) {
      setPartyCreateError(err.message || 'Failed to create customer');
    } finally {
      setIsSavingParty(false);
    }
  };

  // Selected customer info
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const isSameState = (selectedCustomer?.stateCode || '24') === '24'; // Store state is 24 (Gujarat)

  // Filtered customer list for combobox
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.partyType.toLowerCase().includes(q)
    );
  });

  // Compute money with integer paise math (preventing float drift)
  let totalTaxablePaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;

  cartItems.forEach((item) => {
    const qty = parseFloat(String(item.quantity)) || 0;
    const ratePaise = Math.round(Number(item.rate || 0) * 100);
    const disc = Math.min(100, Math.max(0, Number(item.discountPercent || 0)));
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
          rate: Number(item.rate) || 0,
          discountPercent: Number(item.discountPercent) || 0,
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
    <div
      className="space-y-6"
      onKeyDown={(e) => {
        if (e.defaultPrevented || e.nativeEvent.isComposing || createdTransaction) return;
        // F2: Focus SKU Search
        if (e.key === 'F2') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
        // F8: Cycle document type
        if (e.key === 'F8' && !searchResults.length && !selectedVariant && !submitLock.current) {
          e.preventDefault();
          setDocType((current) =>
            current === 'Delivery_Challan'
              ? 'Tax_Invoice'
              : current === 'Tax_Invoice'
              ? 'Estimate'
              : 'Delivery_Challan'
          );
        }
        // Ctrl+Enter or Cmd+Enter: Save & Print
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void handleSubmit();
        }
      }}
    >
      {/* Top Banner: Mode & Settings Switcher */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Document Mode Switcher */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          <button
            type="button"
            aria-pressed={docType === 'Delivery_Challan'}
            onClick={() => setDocType('Delivery_Challan')}
            className={`flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              docType === 'Delivery_Challan'
                ? 'bg-brand text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Delivery Challan
          </button>
          <button
            type="button"
            aria-pressed={docType === 'Tax_Invoice'}
            onClick={() => setDocType('Tax_Invoice')}
            className={`flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              docType === 'Tax_Invoice'
                ? 'bg-brand text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            GST Tax Invoice
          </button>
          <button
            type="button"
            aria-pressed={docType === 'Estimate'}
            onClick={() => setDocType('Estimate')}
            className={`flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              docType === 'Estimate'
                ? 'bg-brand text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Quotation / Estimate
          </button>
        </div>

        {/* Right controls: Dispatch Location & Transport */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          {/* Dispatch Location Selector (for Challan & Invoice) */}
          {docType !== 'Estimate' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 font-medium text-xs">Dispatch From:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  type="button"
                  aria-pressed={dispatchFrom === 'Godown'}
                  onClick={() => setDispatchFrom('Godown')}
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    dispatchFrom === 'Godown' ? 'bg-brand-dark text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  Main Godown
                </button>
                <button
                  type="button"
                  aria-pressed={dispatchFrom === 'Showroom'}
                  onClick={() => setDispatchFrom('Showroom')}
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    dispatchFrom === 'Showroom' ? 'bg-brand-dark text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  Showroom Display
                </button>
              </div>
            </div>
          )}

          {/* Transport Details (hidden for Estimate, full width on mobile) */}
          {docType !== 'Estimate' && (
            <div className="flex items-center gap-2 text-sm w-full sm:w-auto">
              <Truck className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Vehicle / Tempo No. (e.g. GJ01AB1234)"
                value={transportDetails}
                onChange={(e) => setTransportDetails(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-full sm:w-56 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left = Item Entry & Cart, Right = Customer & Billing Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Quick Autocomplete & Cart Table */}
        <div className="min-w-0 lg:col-span-2 space-y-6">
          {/* Quick Search & Fast Entry Bar */}
          <div ref={searchContainerRef} className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-brand" />
                <span>Instant Shade & SKU Search</span>
                <span className="text-[11px] font-normal bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded tabular-nums">
                  F2
                </span>
              </h2>
              <span className="text-xs text-gray-500">
                Type shade code, brand or finish (e.g. <span className="tabular-nums text-brand font-semibold">"21094 suede"</span>)
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
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'ArrowDown') {
                    if (!searchResults.length) return;
                    e.preventDefault();
                    setActiveResult((i) => (i < searchResults.length - 1 ? i + 1 : 0));
                  } else if (e.key === 'ArrowUp') {
                    if (!searchResults.length) return;
                    e.preventDefault();
                    setActiveResult((i) => (i > 0 ? i - 1 : searchResults.length - 1));
                  } else if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      e.preventDefault();
                      const chosen = activeResult >= 0 ? searchResults[activeResult] : searchResults[0];
                      handleSelectVariant(chosen);
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchQuery('');
                    setSearchResults([]);
                    setActiveResult(-1);
                  }
                }}
                ref={searchInputRef}
                type="text"
                placeholder="Search brand, shade code, finish or size... (Press F2)"
                value={searchQuery}
                onChange={(e) => {
                  setActiveResult(-1);
                  setSearchError('');
                  setIsSearching(Boolean(e.target.value.trim()));
                  setSearchQuery(e.target.value);
                }}
                className="w-full bg-surface border border-input-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand focus:bg-white text-gray-900 shadow-inner"
              />

              <p id="pos-shortcuts" className="mt-2 text-xs text-gray-500">
                <kbd className="font-semibold text-gray-700">F2</kbd> Search · <kbd className="font-semibold text-gray-700">↑ ↓</kbd> Choose · <kbd className="font-semibold text-gray-700">Enter</kbd> Select · <kbd className="font-semibold text-gray-700">Esc</kbd> Clear · <kbd className="font-semibold text-gray-700">Ctrl+Enter</kbd> Save &amp; Print
              </p>
              <p role="status" className="sr-only">
                {isSearching ? 'Searching' : searchQuery && !searchError ? `${searchResults.length} suggestions` : ''}
              </p>
              {searchError && <p role="alert" className="mt-2 text-sm text-red-800">{searchError}</p>}
              
              {isSearching && (
                <div role="status" className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" />
                  <span>Searching catalog variants...</span>
                </div>
              )}

              {searchQuery.trim() && !isSearching && !searchError && searchResults.length === 0 && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  No matching variants found for <span className="font-bold">"{searchQuery}"</span>. Try searching by brand, finish, or code.
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div
                  id="sku-results"
                  role="listbox"
                  aria-label="Matching variants"
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-gray-100"
                >
                  {searchResults.map((v, index) => {
                    const showroomStock = v.stockLedgers?.find((s) => s.location === 'Showroom')?.quantityOnHand || 0;
                    const godownStock = v.stockLedgers?.find((s) => s.location === 'Godown')?.quantityOnHand || 0;

                    return (
                      <div
                        key={v.id}
                        id={`sku-option-${index}`}
                        role="option"
                        aria-selected={activeResult === index}
                        onMouseDown={(event) => {
                          event.preventDefault(); // Prevent input blur before click fires
                          handleSelectVariant(v);
                        }}
                        className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 p-3 text-left text-sm transition ${
                          activeResult === index ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-gray-900">
                            {v.brand} - {v.designCode} ({v.designName})
                          </div>
                          <div className="text-[13px] text-gray-700 font-medium">
                            {v.finish} | {v.thicknessMm}mm | {v.size} | {v.category}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div className="text-xs space-y-1">
                            <div
                              className={`px-2 py-0.5 rounded ${
                                dispatchFrom === 'Godown'
                                  ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                                  : 'text-gray-600'
                              }`}
                            >
                              Godown: <span className="font-bold">{godownStock}</span>
                            </div>
                            <div
                              className={`px-2 py-0.5 rounded ${
                                dispatchFrom === 'Showroom'
                                  ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                                  : 'text-gray-600'
                              }`}
                            >
                              Showroom: <span className="font-bold">{showroomStock}</span>
                            </div>
                          </div>
                          <div className="tabular-nums font-bold text-brand text-base">
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
                  <div className="text-xs text-brand font-medium">
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label htmlFor="line-qty" className="text-xs font-semibold text-gray-600 block mb-1">
                      Quantity ({selectedVariant.unit})
                    </label>
                    <input
                      id="line-qty"
                      ref={qtyInputRef}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          rateInputRef.current?.focus();
                          rateInputRef.current?.select();
                        }
                      }}
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      onBlur={() => {
                        if (!itemQty || parseFloat(itemQty) <= 0) setItemQty('1');
                      }}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                    />
                  </div>

                  <div>
                    <label htmlFor="line-rate" className="text-xs font-semibold text-gray-600 block mb-1">
                      Selling Rate (₹)
                    </label>
                    <input
                      type="number"
                      ref={rateInputRef}
                      id="line-rate"
                      min="0"
                      step="0.01"
                      value={itemRate}
                      onChange={(e) => setItemRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm tabular-nums font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                    />
                  </div>

                  <div>
                    <label htmlFor="pos-discount" className="text-xs font-semibold text-gray-600 block mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      id="pos-discount"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm tabular-nums text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2 px-4 rounded-lg text-sm shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Bill</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Line Items Table with Inline Editing */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">
                Billed Items ({cartItems.length})
              </h3>
              <span className="text-xs text-gray-500">Edit Quantity, Rate or Disc inline</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-gray-300" />
                <p className="font-medium text-sm">No items in the bill yet.</p>
                <p className="text-xs text-gray-400 mt-1">Press <kbd className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-[11px] tabular-nums">F2</kbd> to search and add laminates or hardware.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-gray-100/75 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Brand & Design</th>
                      <th className="py-3 px-4">Finish / Thick</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-right">Rate (₹)</th>
                      <th className="py-3 px-3 text-right">Disc %</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cartItems.map((item, idx) => {
                      const qty = parseFloat(String(item.quantity)) || 0;
                      const lineGross = qty * Number(item.rate || 0);
                      const lineNet = lineGross - lineGross * (Number(item.discountPercent || 0) / 100);

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {item.variant.brand} {item.variant.designCode}
                            <div className="text-xs text-gray-600 font-normal">{item.variant.designName}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-700 text-[13px] font-medium">
                            {item.variant.finish} | {item.variant.thicknessMm}mm
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleUpdateCartItem(item.id, 'quantity', e.target.value)}
                                onBlur={() => {
                                  const val = parseFloat(String(item.quantity)) || 0;
                                  if (val <= 0) handleUpdateCartItem(item.id, 'quantity', 1);
                                }}
                                aria-label={`Quantity for line ${idx + 1}: ${item.variant.designCode}`}
                                className="w-16 bg-white border border-gray-300 rounded px-1.5 py-1 text-center text-sm font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand shadow-sm"
                              />
                              <span className="text-xs text-gray-500">{item.variant.unit}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) =>
                                handleUpdateCartItem(item.id, 'rate', Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              aria-label={`Rate for line ${idx + 1}: ${item.variant.designCode}`}
                              className="w-24 bg-white border border-gray-300 rounded px-1.5 py-1 text-right text-sm tabular-nums font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand shadow-sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={item.discountPercent}
                              onChange={(e) =>
                                handleUpdateCartItem(
                                  item.id,
                                  'discountPercent',
                                  Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                )
                              }
                              aria-label={`Discount for line ${idx + 1}: ${item.variant.designCode}`}
                              className="w-16 bg-white border border-gray-300 rounded px-1.5 py-1 text-right text-sm tabular-nums text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand shadow-sm"
                            />
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-gray-900">
                            {formatINR(lineNet)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label={`Remove line ${idx + 1}: ${item.variant.brand} ${item.variant.designCode}`}
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

        {/* Right Column: Customer Combobox, Commission & Summary */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* Party & Referrer Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand" />
                <span>Customer &amp; Referrer</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(true)}
                className="text-xs text-brand hover:text-brand-dark font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            </h3>

            {/* Customer Searchable Combobox */}
            <div ref={customerComboboxRef} className="relative">
              <label htmlFor="customer-combobox-input" className="text-xs font-semibold text-gray-600 block mb-1">
                Billed To (Customer / Contractor) <span className="text-red-500">*</span>
              </label>

              {selectedCustomer ? (
                <div className="bg-surface border border-brand rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{selectedCustomer.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedCustomer.phone} • {formatPartyType(selectedCustomer.partyType)} (State: {selectedCustomer.stateCode || '24'})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerSearch('');
                      setIsCustomerDropdownOpen(true);
                    }}
                    className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100 font-medium transition"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    id="customer-combobox-input"
                    type="text"
                    role="combobox"
                    aria-expanded={isCustomerDropdownOpen}
                    aria-controls="customer-combobox-list"
                    autoComplete="off"
                    placeholder="Search name, phone or type..."
                    value={customerSearch}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    className="w-full bg-surface border border-input-border rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand font-medium"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Combobox Dropdown */}
              {!selectedCustomerId && isCustomerDropdownOpen && (
                <div
                  id="customer-combobox-list"
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-gray-100"
                >
                  <div className="p-2 bg-gray-50 flex items-center justify-between text-xs text-gray-500 border-b border-gray-200">
                    <span>{filteredCustomers.length} customers found</span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsAddCustomerModalOpen(true);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="text-brand font-bold hover:underline"
                    >
                      + Create New
                    </button>
                  </div>
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                      No matching customer found.
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsAddCustomerModalOpen(true);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="block mx-auto mt-2 text-brand font-semibold"
                      >
                        + Add "{customerSearch}" as customer
                      </button>
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        role="option"
                        aria-selected={selectedCustomerId === c.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCustomerId(c.id);
                          setIsCustomerDropdownOpen(false);
                          setErrorMessage(null);
                        }}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer text-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.phone} • {formatPartyType(c.partyType)}
                          </div>
                        </div>
                        <span className="text-[11px] tabular-nums text-gray-400">
                          State: {c.stateCode || '24'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Carpenter / Architect Referrer Dropdown */}
            <div>
              <label htmlFor="pos-referrer" className="text-xs font-semibold text-gray-600 block mb-1">
                Tag Carpenter / Architect (Optional)
              </label>
              <select
                id="pos-referrer"
                value={selectedReferrerId}
                onChange={(e) => setSelectedReferrerId(e.target.value)}
                className="w-full bg-surface border border-input-border rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
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
                  <span className="tabular-nums font-bold text-amber-800">{formatINR(estimatedCommission)}</span>
                </div>
              )}
            </div>

            {/* Bill Notes */}
            <div>
              <label htmlFor="pos-notes" className="text-xs font-semibold text-gray-600 block mb-1">
                Remarks / Site Address
              </label>
              <textarea
                id="pos-notes"
                rows={2}
                placeholder="e.g. Deliver to Villa 42, Bopal site"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-surface border border-input-border rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
              />
            </div>
          </div>

          {/* Payment & Bill Totals Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">
                Summary & Totals
              </h3>
              <span className="text-[11px] text-gray-400 italic">Preview only</span>
            </div>

            <div className="space-y-2 text-sm border-b border-gray-200 pb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Taxable Net):</span>
                <span className="tabular-nums font-semibold text-gray-900">{formatINR(subtotal)}</span>
              </div>
              {docType === 'Estimate' ? (
                <div className="flex justify-between text-gray-500 text-xs italic">
                  <span>GST (Quotation):</span>
                  <span className="tabular-nums">Tax Free (₹0.00)</span>
                </div>
              ) : isSameState ? (
                <>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>CGST (Intra-state):</span>
                    <span className="tabular-nums">{formatINR(totalCgst)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>SGST (Intra-state):</span>
                    <span className="tabular-nums">{formatINR(totalSgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>IGST (Inter-state - {selectedCustomer?.stateCode || 'Out of state'}):</span>
                  <span className="tabular-nums">{formatINR(totalIgst)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 text-lg font-black text-gray-900">
                <span>Grand Total:</span>
                <span className="tabular-nums text-brand text-xl">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {userNotification && (
              <div className="bg-emerald-50 border border-emerald-200 text-brand-dark text-xs p-3 rounded-xl font-medium">
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
                  : 'bg-brand hover:bg-brand-dark'
              }`}
            >
              <Printer className="w-5 h-5" />
              <span>
                {isSubmitting ? 'Creating...' : `Save & Print ${docType.replace('_', ' ')}`}
              </span>
              <kbd className="hidden sm:inline-block text-[11px] bg-black/20 text-white px-2 py-0.5 rounded tabular-nums font-normal">
                Ctrl+Enter
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-customer-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 id="add-customer-title" className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand" />
                <span>Add New Customer / Contractor</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {partyCreateError && (
              <div role="alert" className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {partyCreateError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label htmlFor="new-cust-name" className="text-xs font-semibold text-gray-700 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="new-cust-name"
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                />
              </div>

              <div>
                <label htmlFor="new-cust-phone" className="text-xs font-semibold text-gray-700 block mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="new-cust-phone"
                  type="tel"
                  required
                  placeholder="e.g. 9825012345"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-cust-type" className="text-xs font-semibold text-gray-700 block mb-1">
                    Party Type
                  </label>
                  <select
                    id="new-cust-type"
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                  >
                    <option value="Retail_Customer">Retail Customer</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-cust-state" className="text-xs font-semibold text-gray-700 block mb-1">
                    State Code (GST)
                  </label>
                  <input
                    id="new-cust-state"
                    type="text"
                    maxLength={2}
                    placeholder="24"
                    value={newCustState}
                    onChange={(e) => setNewCustState(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-cust-gstin" className="text-xs font-semibold text-gray-700 block mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  id="new-cust-gstin"
                  type="text"
                  placeholder="e.g. 24AAACG1234F1Z5"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm uppercase text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus:border-brand"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingParty}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow transition"
                >
                  {isSavingParty ? 'Saving...' : 'Save & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {createdTransaction && (
        <PrintModal
          transaction={createdTransaction}
          onClose={() => {
            setCreatedTransaction(null);
            requestAnimationFrame(() => searchInputRef.current?.focus());
          }}
        />
      )}
    </div>
  );
}
