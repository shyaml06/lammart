'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Trash2, Printer,
  Truck, ShieldAlert,
  AlertTriangle, RefreshCw, X, UserPlus, Check,
  Sun, Moon, RotateCcw
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
  return type.replace(/_/g, ' ').toLowerCase();
}

export default function CounterBillingPage() {
  // Document mode
  const [docType, setDocType] = useState<'Delivery_Challan' | 'Tax_Invoice' | 'Estimate'>('Delivery_Challan');
  const [dispatchFrom, setDispatchFrom] = useState<'Showroom' | 'Godown'>('Godown');
  const [transportDetails, setTransportDetails] = useState('');
  const [notes, setNotes] = useState('');

  // UI preferences
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [isDark, setIsDark] = useState(false);

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

  // Initialize theme from document or localStorage
  useEffect(() => {
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    setIsDark(isDarkTheme);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

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

      // Default to Walk-in customer if present, or leave unselected
      const walkIn = allCust.find((c) => c.name.toLowerCase().includes('walk-in') || c.phone === '9000000000');
      if (walkIn && !selectedCustomerId) {
        setSelectedCustomerId(walkIn.id);
      }
    } catch {
      setPartyError('Unable to load customer list. Please check your network and retry.');
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
          setSearchError('Search failed. Try a shade code or refine your keywords.');
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
      setErrorMessage(`Only ${selectedLocationStock} available in ${dispatchFrom.toLowerCase()}. Check allow oversell to proceed.`);
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
      setUserNotification(`Merged into existing row: ${selectedVariant.brand} ${selectedVariant.designCode} now at ${newQty} ${selectedVariant.unit.toLowerCase()}s.`);
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

  // Clear entire cart
  const handleClearCart = () => {
    if (cartItems.length > 0 && confirm('Clear all items from this bill?')) {
      setCartItems([]);
      setErrorMessage(null);
      setUserNotification(null);
      searchInputRef.current?.focus();
    }
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
      setPartyCreateError(err.message || 'Failed to save customer');
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
  const grandTotal = (totalTaxablePaise + totalCgstPaise + totalSgstPaise + totalIgstPaise) / 100;

  // Selected Referrer Commission Preview
  const selectedReferrer = referrers.find((r) => r.id === selectedReferrerId);
  const commissionPercent = selectedReferrer?.defaultCommissionPercent ?? 0;
  const estimatedCommission = Math.round((subtotal * commissionPercent)) / 100;

  // Submit Transaction (Save & Print)
  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      setErrorMessage('Pick a customer to continue.');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Add at least one item to the bill before saving.');
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
      setErrorMessage(err.message || 'Failed to save transaction');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const docActionLabel =
    docType === 'Delivery_Challan'
      ? 'Save and print challan'
      : docType === 'Tax_Invoice'
      ? 'Save and print invoice'
      : 'Save and print estimate';

  return (
    <div
      className="max-w-[1200px] mx-auto space-y-8 pb-24 lg:pb-8"
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
      {/* Editorial Header */}
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-text tracking-tight">
              New bill
            </h1>
            <p className="text-sm text-text-muted mt-1 font-normal">
              Create a delivery challan, GST tax invoice, or estimate.
            </p>
          </div>

          {/* Quick utility toggles (Density & Theme) */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              className="text-xs text-text-muted hover:text-text px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-sunken transition duration-150"
              title="Toggle table density"
            >
              {density === 'comfortable' ? 'Compact' : 'Comfortable'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="w-8 h-8 rounded-md border border-border bg-surface text-text-muted hover:text-text flex items-center justify-center hover:bg-surface-sunken transition duration-150"
            >
              {isDark ? <Sun className="w-4 h-4 stroke-[1.5]" /> : <Moon className="w-4 h-4 stroke-[1.5]" />}
            </button>
          </div>
        </div>

        {/* Quiet Document Switcher & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Pill Segmented Switcher */}
          <div
            role="tablist"
            aria-label="Document type"
            className="inline-flex items-center gap-1 bg-surface-sunken p-1 rounded-pill border border-border"
          >
            <button
              type="button"
              role="tab"
              aria-selected={docType === 'Delivery_Challan'}
              aria-pressed={docType === 'Delivery_Challan'}
              onClick={() => setDocType('Delivery_Challan')}
              className={`px-3.5 py-1 text-xs sm:text-sm rounded-pill transition duration-150 font-normal ${
                docType === 'Delivery_Challan'
                  ? 'bg-surface text-text shadow-sm border border-border/80 font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Delivery challan
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={docType === 'Tax_Invoice'}
              aria-pressed={docType === 'Tax_Invoice'}
              onClick={() => setDocType('Tax_Invoice')}
              className={`px-3.5 py-1 text-xs sm:text-sm rounded-pill transition duration-150 font-normal ${
                docType === 'Tax_Invoice'
                  ? 'bg-surface text-text shadow-sm border border-border/80 font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Tax invoice
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={docType === 'Estimate'}
              aria-pressed={docType === 'Estimate'}
              onClick={() => setDocType('Estimate')}
              className={`px-3.5 py-1 text-xs sm:text-sm rounded-pill transition duration-150 font-normal ${
                docType === 'Estimate'
                  ? 'bg-surface text-text shadow-sm border border-border/80 font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Estimate
            </button>
          </div>

          {/* Secondary Dispatch & Transport Controls */}
          {docType !== 'Estimate' && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Dispatch-from switcher */}
              <div className="inline-flex items-center gap-0.5 bg-surface-sunken p-0.5 rounded-pill border border-border text-xs">
                <span className="text-text-faint pl-2 pr-1 text-[11px]">From</span>
                <button
                  type="button"
                  aria-pressed={dispatchFrom === 'Godown'}
                  onClick={() => setDispatchFrom('Godown')}
                  className={`px-2.5 py-1 rounded-pill transition duration-150 ${
                    dispatchFrom === 'Godown'
                      ? 'bg-surface text-text shadow-sm font-medium'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Main godown
                </button>
                <button
                  type="button"
                  aria-pressed={dispatchFrom === 'Showroom'}
                  onClick={() => setDispatchFrom('Showroom')}
                  className={`px-2.5 py-1 rounded-pill transition duration-150 ${
                    dispatchFrom === 'Showroom'
                      ? 'bg-surface text-text shadow-sm font-medium'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Showroom
                </button>
              </div>

              {/* Transport Vehicle Input */}
              <div className="relative">
                <label htmlFor="pos-transport" className="sr-only">Vehicle or tempo number</label>
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-faint">
                  <Truck className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
                <input
                  id="pos-transport"
                  type="text"
                  placeholder="Vehicle / tempo no."
                  value={transportDetails}
                  onChange={(e) => setTransportDetails(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs bg-surface-sunken border border-border rounded-md text-text placeholder:text-text-faint focus-visible:border-accent transition duration-150"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace (2 columns on lg+) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Search & Items Ledger (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Hero Search Box */}
          <div ref={searchContainerRef} className="relative">
            <div className="relative flex items-center">
              <label htmlFor="shade-search-input" className="sr-only">
                Search shades, brand, finish or code
              </label>
              <div className="absolute left-4 pointer-events-none text-text-muted">
                <Search className="w-4 h-4 stroke-[1.5]" />
              </div>
              <input
                id="shade-search-input"
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-expanded={searchResults.length > 0}
                aria-controls="sku-results"
                aria-autocomplete="list"
                aria-activedescendant={activeResult >= 0 ? `sku-option-${activeResult}` : undefined}
                autoComplete="off"
                placeholder="Search a shade, brand or finish... (Press F2)"
                value={searchQuery}
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
                onChange={(e) => {
                  setActiveResult(-1);
                  setSearchError('');
                  setIsSearching(Boolean(e.target.value.trim()));
                  setSearchQuery(e.target.value);
                }}
                className="w-full h-12 bg-surface-sunken border border-border rounded-md pl-11 pr-14 text-sm text-text placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition duration-150"
              />
              <div className="absolute right-3.5 flex items-center gap-1 pointer-events-none">
                <kbd className="text-[11px] font-sans text-text-faint border border-border bg-surface px-1.5 py-0.5 rounded">
                  F2
                </kbd>
              </div>
            </div>

            {/* Quiet Search State / Skeletons */}
            {isSearching && (
              <div
                role="status"
                className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-pop z-30 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span>Searching catalog...</span>
                </div>
                <div className="space-y-2 pt-1 animate-pulse">
                  <div className="h-3.5 bg-surface-sunken rounded w-3/4"></div>
                  <div className="h-2.5 bg-surface-sunken rounded w-1/2"></div>
                </div>
              </div>
            )}

            {searchError && (
              <p role="alert" className="mt-2 text-xs text-danger-text">
                {searchError}
              </p>
            )}

            {searchQuery.trim() && !isSearching && !searchError && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-pop z-30 p-4 text-xs text-text-muted">
                No matching items found for “{searchQuery}”. Try searching by shade code or finish.
              </div>
            )}

            {/* Results Dropdown */}
            {searchResults.length > 0 && (
              <div
                id="sku-results"
                role="listbox"
                aria-label="Matching items"
                className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-md shadow-pop z-30 max-h-80 overflow-y-auto divide-y divide-border"
              >
                {searchResults.map((v, index) => {
                  const showroomStock = v.stockLedgers?.find((s) => s.location === 'Showroom')?.quantityOnHand || 0;
                  const godownStock = v.stockLedgers?.find((s) => s.location === 'Godown')?.quantityOnHand || 0;
                  const isSelected = activeResult === index;

                  return (
                    <div
                      key={v.id}
                      id={`sku-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelectVariant(v);
                      }}
                      className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition duration-150 ${
                        isSelected ? 'bg-accent-soft' : 'hover:bg-accent-soft/40'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-sm font-medium text-text truncate">
                          {v.brand} · {v.designCode} · {v.designName}
                        </div>
                        <div className="text-[13px] text-text-muted">
                          {v.finish} · {v.thicknessMm}mm · {v.size}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="text-sm font-medium text-text tabular-nums">
                          {formatINR(v.defaultSellingPrice)}
                        </div>
                        <div className="text-xs text-text-muted flex items-center gap-1.5 justify-end">
                          <span className={dispatchFrom === 'Godown' ? 'font-medium text-text' : 'text-text-faint'}>
                            Godown {godownStock}
                          </span>
                          <span className="text-text-faint">·</span>
                          <span className={dispatchFrom === 'Showroom' ? 'font-medium text-text' : 'text-text-faint'}>
                            Showroom {showroomStock}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Line Item Fast Entry Form (Soft slide-in when item chosen) */}
          {selectedVariant && (
            <form
              onSubmit={handleAddItem}
              className="bg-surface rounded-md border border-border p-4 space-y-3.5 transition-all duration-150"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2.5">
                <div>
                  <h3 className="font-serif text-base text-text font-normal">
                    {selectedVariant.brand} {selectedVariant.designCode} — {selectedVariant.designName}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedVariant.finish} · {selectedVariant.thicknessMm}mm · {selectedVariant.size}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
                  className="text-xs text-text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>

              {/* Soft Warning when stock deficit */}
              {isStockDeficit && (
                <div className="bg-warn-soft text-warn-text rounded-md p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-normal">
                    <AlertTriangle className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                    <span>
                      {selectedLocationStock} available in {dispatchFrom.toLowerCase()} (requested {parsedQty || 0}).
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-xs">
                    <input
                      type="checkbox"
                      checked={allowOversell}
                      onChange={(e) => setAllowOversell(e.target.checked)}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span>Allow oversell / backorder</span>
                  </label>
                </div>
              )}

              {/* Inputs row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 items-end">
                <div>
                  <label htmlFor="line-qty" className="text-[13px] text-text-muted font-medium mb-1 block">
                    Quantity ({selectedVariant.unit.toLowerCase()})
                  </label>
                  <input
                    id="line-qty"
                    ref={qtyInputRef}
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        rateInputRef.current?.focus();
                        rateInputRef.current?.select();
                      }
                    }}
                    onBlur={() => {
                      if (!itemQty || parseFloat(itemQty) <= 0) setItemQty('1');
                    }}
                    className="w-full h-9 bg-surface-sunken border border-border rounded-md px-3 text-sm text-text tabular-nums font-medium focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="line-rate" className="text-[13px] text-text-muted font-medium mb-1 block">
                    Rate (₹)
                  </label>
                  <input
                    id="line-rate"
                    ref={rateInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemRate}
                    onChange={(e) => setItemRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-9 bg-surface-sunken border border-border rounded-md px-3 text-sm text-text tabular-nums font-medium focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="line-discount" className="text-[13px] text-text-muted font-medium mb-1 block">
                    Discount %
                  </label>
                  <input
                    id="line-discount"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={itemDiscount}
                    onChange={(e) =>
                      setItemDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                    }
                    className="w-full h-9 bg-surface-sunken border border-border rounded-md px-3 text-sm text-text tabular-nums focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full h-9 bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-medium rounded-md flex items-center justify-center gap-1.5 transition duration-150"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
                    <span>Add to bill</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Items Ledger Table */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-border pb-2">
              <h2 className="font-serif text-lg text-text font-normal">
                Items ({cartItems.length})
              </h2>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-text-muted hover:text-danger-text transition duration-150"
                >
                  Clear all
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-sm space-y-1">
                <p>No items in this bill yet.</p>
                <p className="text-xs text-text-faint">
                  Press <kbd className="text-[11px] font-sans border border-border bg-surface px-1 py-0.5 rounded">F2</kbd> to search and add laminates or hardware.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-left text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border font-medium">
                      <th className={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} w-10`}>#</th>
                      <th className={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-2.5'}`}>Item</th>
                      <th className={`px-2 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-center w-24`}>Qty</th>
                      <th className={`px-2 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-right w-24`}>Rate (₹)</th>
                      <th className={`px-2 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-right w-20`}>Disc %</th>
                      <th className={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-right w-28`}>Total</th>
                      <th className={`px-2 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-center w-12`}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cartItems.map((item, idx) => {
                      const qty = parseFloat(String(item.quantity)) || 0;
                      const lineGross = qty * Number(item.rate || 0);
                      const lineNet = lineGross - lineGross * (Number(item.discountPercent || 0) / 100);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-accent-soft/30 transition duration-150 group"
                        >
                          <td className={`px-3 ${density === 'compact' ? 'py-2' : 'py-3.5'} text-xs text-text-faint`}>
                            {idx + 1}
                          </td>
                          <td className={`px-3 ${density === 'compact' ? 'py-2' : 'py-3.5'}`}>
                            <div className="font-medium text-text">
                              {item.variant.brand} · {item.variant.designCode}
                            </div>
                            <div className="text-[13px] text-text-muted mt-0.5">
                              {item.variant.finish} · {item.variant.thicknessMm}mm · {item.variant.designName}
                            </div>
                          </td>
                          <td className={`px-2 ${density === 'compact' ? 'py-2' : 'py-3.5'} text-center`}>
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
                              aria-label={`Quantity for line ${idx + 1}`}
                              className="w-16 h-8 text-center text-sm font-medium tabular-nums bg-surface-sunken border border-border rounded px-1 text-text focus-visible:border-accent"
                            />
                          </td>
                          <td className={`px-2 ${density === 'compact' ? 'py-2' : 'py-3.5'} text-right`}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) =>
                                handleUpdateCartItem(item.id, 'rate', Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              aria-label={`Rate for line ${idx + 1}`}
                              className="w-20 h-8 text-right text-sm font-medium tabular-nums bg-surface-sunken border border-border rounded px-1.5 text-text focus-visible:border-accent"
                            />
                          </td>
                          <td className={`px-2 ${density === 'compact' ? 'py-2' : 'py-3.5'} text-right`}>
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
                              aria-label={`Discount for line ${idx + 1}`}
                              className="w-14 h-8 text-right text-sm tabular-nums bg-surface-sunken border border-border rounded px-1 text-text-muted focus-visible:border-accent"
                            />
                          </td>
                          <td className={`px-3 ${density === 'compact' ? 'py-2' : 'py-3.5'} text-right font-medium text-text tabular-nums`}>
                            {formatINR(lineNet)}
                          </td>
                          <td className={`px-2 ${density === 'compact' ? 'py-2' : 'py-3.5'} text-center`}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label={`Remove line ${idx + 1}: ${item.variant.brand} ${item.variant.designCode}`}
                              title="Remove item"
                              className="w-7 h-7 rounded inline-flex items-center justify-center text-text-faint hover:text-danger-text hover:bg-danger-soft transition duration-150"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
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

        {/* Right Column: Customer & Summary (One soft surface, sticky on lg+) */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6 self-start">
          <div className="bg-surface rounded-lg border border-border p-5 space-y-6">
            {/* Customer Section */}
            <div className="space-y-3.5">
              <div className="flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="font-serif text-lg text-text font-normal">Customer</h2>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition"
                >
                  <UserPlus className="w-3 h-3 stroke-[1.5]" />
                  <span>+ Add customer</span>
                </button>
              </div>

              {/* Customer Searchable Combobox */}
              <div ref={customerComboboxRef} className="relative">
                {selectedCustomer ? (
                  <div className="bg-surface-sunken border border-border rounded-md p-3 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-text flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-accent stroke-[2]" />
                        <span>{selectedCustomer.name}</span>
                      </div>
                      <div className="text-xs text-text-muted">
                        {selectedCustomer.phone} · {formatPartyType(selectedCustomer.partyType)} (State {selectedCustomer.stateCode || '24'})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearch('');
                        setIsCustomerDropdownOpen(true);
                      }}
                      className="text-xs text-text-muted hover:text-text px-2 py-0.5 rounded transition"
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
                      placeholder="Search customer name or phone..."
                      value={customerSearch}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      className="w-full h-10 bg-surface-sunken border border-border rounded-md px-3 text-sm text-text placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent"
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearch('')}
                        className="absolute right-3 top-2.5 text-text-muted hover:text-text"
                      >
                        <X className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    )}
                  </div>
                )}

                {/* Combobox Dropdown */}
                {!selectedCustomerId && isCustomerDropdownOpen && (
                  <div
                    id="customer-combobox-list"
                    role="listbox"
                    className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-pop z-20 max-h-60 overflow-y-auto divide-y divide-border"
                  >
                    <div className="p-2.5 bg-surface-sunken flex items-center justify-between text-xs text-text-muted border-b border-border">
                      <span>{filteredCustomers.length} customers</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsAddCustomerModalOpen(true);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="text-accent font-medium hover:underline"
                      >
                        + Create new
                      </button>
                    </div>

                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-text-muted">
                        No matching customer.
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setIsAddCustomerModalOpen(true);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="block mx-auto mt-2 text-accent font-medium"
                        >
                          + Add "{customerSearch}"
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
                          className="p-2.5 hover:bg-accent-soft/40 cursor-pointer text-sm flex items-center justify-between transition duration-150"
                        >
                          <div>
                            <div className="font-medium text-text">{c.name}</div>
                            <div className="text-xs text-text-muted">
                              {c.phone} · {formatPartyType(c.partyType)}
                            </div>
                          </div>
                          <span className="text-[11px] text-text-faint font-mono">
                            State {c.stateCode || '24'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Tag Referrer (Carpenter / Architect) */}
              <div>
                <label htmlFor="pos-referrer" className="text-xs text-text-muted font-normal block mb-1">
                  Tag architect or carpenter (optional)
                </label>
                <select
                  id="pos-referrer"
                  value={selectedReferrerId}
                  onChange={(e) => setSelectedReferrerId(e.target.value)}
                  className="w-full h-9 bg-surface-sunken border border-border rounded-md px-2.5 text-xs text-text focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <option value="">No referrer</option>
                  {referrers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.phone}) — {formatPartyType(r.partyType)}{' '}
                      {r.defaultCommissionPercent != null ? `(${r.defaultCommissionPercent}% comm.)` : ''}
                    </option>
                  ))}
                </select>

                {/* Soft Commission preview note */}
                {selectedReferrer && subtotal > 0 && (
                  <div className="mt-2 bg-warn-soft text-warn-text rounded-md px-3 py-2 text-xs flex justify-between items-center border border-warn-text/10">
                    <span>Commission ({commissionPercent}%)</span>
                    <span className="tabular-nums font-medium">{formatINR(estimatedCommission)}</span>
                  </div>
                )}
              </div>

              {/* Remarks / Site Address */}
              <div>
                <label htmlFor="pos-notes" className="text-xs text-text-muted font-normal block mb-1">
                  Remarks or site address
                </label>
                <textarea
                  id="pos-notes"
                  rows={2}
                  placeholder="e.g. Delivery to Villa 42, Bopal site"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-md p-2.5 text-xs text-text placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </div>
            </div>

            {/* Summary & Totals Section */}
            <div className="space-y-4 pt-2">
              <h2 className="font-serif text-lg text-text font-normal border-b border-border pb-2">
                Summary
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal (taxable)</span>
                  <span className="tabular-nums font-medium text-text">{formatINR(subtotal)}</span>
                </div>

                {docType === 'Estimate' ? (
                  <div className="flex justify-between text-text-faint text-xs italic">
                    <span>GST (Quotation)</span>
                    <span className="tabular-nums">Tax free (₹0.00)</span>
                  </div>
                ) : isSameState ? (
                  <>
                    <div className="flex justify-between text-text-muted text-xs">
                      <span>CGST (Intra-state)</span>
                      <span className="tabular-nums">{formatINR(totalCgst)}</span>
                    </div>
                    <div className="flex justify-between text-text-muted text-xs">
                      <span>SGST (Intra-state)</span>
                      <span className="tabular-nums">{formatINR(totalSgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-text-muted text-xs">
                    <span>IGST ({selectedCustomer?.stateCode ? `State ${selectedCustomer.stateCode}` : 'Inter-state'})</span>
                    <span className="tabular-nums">{formatINR(totalIgst)}</span>
                  </div>
                )}

                {/* Grand Total Hairline */}
                <div className="border-t border-border pt-3 mt-3 flex justify-between items-baseline">
                  <span className="font-serif text-lg text-text">Total</span>
                  <span className="font-serif text-2xl sm:text-3xl text-accent tabular-nums tracking-tight font-normal">
                    {formatINR(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Feedback Alerts */}
              {userNotification && (
                <div role="status" aria-live="polite" className="bg-accent-soft text-accent text-xs p-3 rounded-md font-medium">
                  {userNotification}
                </div>
              )}

              {partyError && (
                <div role="alert" className="bg-danger-soft text-danger-text p-3 rounded-md text-xs flex items-center justify-between gap-2">
                  <span>{partyError}</span>
                  <button
                    type="button"
                    onClick={loadParties}
                    disabled={partiesLoading}
                    className="underline font-medium hover:opacity-80"
                  >
                    Retry
                  </button>
                </div>
              )}

              {errorMessage && (
                <div role="alert" className="bg-danger-soft text-danger-text text-xs p-3 rounded-md font-normal flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 stroke-[1.5]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleSubmit}
                aria-keyshortcuts="Control+Enter Meta+Enter"
                disabled={isSubmitting || cartItems.length === 0}
                className={`w-full h-12 rounded-md text-sm font-medium transition duration-150 flex items-center justify-center gap-2 ${
                  cartItems.length === 0 || isSubmitting
                    ? 'bg-surface-sunken text-text-muted/60 border border-border cursor-not-allowed'
                    : 'bg-accent hover:bg-accent-hover text-white'
                }`}
              >
                <Printer className="w-4 h-4 stroke-[1.5]" />
                <span>{isSubmitting ? 'Saving...' : docActionLabel}</span>
                <kbd className="hidden sm:inline-block text-[11px] font-sans bg-white/20 text-white px-1.5 py-0.5 rounded ml-1 font-normal">
                  Ctrl+Enter
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-surface border-t border-border shadow-pop z-30 lg:hidden flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-text-muted uppercase block">Total</span>
          <span className="font-serif text-lg text-accent tabular-nums font-normal">
            {formatINR(grandTotal)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || cartItems.length === 0}
          className={`h-11 px-5 rounded-md text-xs font-medium transition duration-150 flex items-center gap-1.5 ${
            cartItems.length === 0 || isSubmitting
              ? 'bg-surface-sunken text-text-muted border border-border cursor-not-allowed'
              : 'bg-accent text-white hover:bg-accent-hover'
          }`}
        >
          <Printer className="w-4 h-4 stroke-[1.5]" />
          <span>{isSubmitting ? 'Saving...' : 'Save & print'}</span>
        </button>
      </div>

      {/* Quick Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-customer-title"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-pop border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="add-customer-title" className="font-serif text-lg font-normal text-text">
                Add new customer
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="text-text-muted hover:text-text rounded p-1"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            {partyCreateError && (
              <div role="alert" className="p-3 bg-danger-soft text-danger-text text-xs rounded-md">
                {partyCreateError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label htmlFor="new-cust-name" className="text-xs font-medium text-text-muted block mb-1">
                  Full name <span className="text-danger-text">*</span>
                </label>
                <input
                  id="new-cust-name"
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full h-9 bg-surface-sunken border border-border rounded-md px-3 text-sm text-text focus-visible:border-accent"
                />
              </div>

              <div>
                <label htmlFor="new-cust-phone" className="text-xs font-medium text-text-muted block mb-1">
                  Phone number <span className="text-danger-text">*</span>
                </label>
                <input
                  id="new-cust-phone"
                  type="tel"
                  required
                  placeholder="e.g. 9825012345"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full h-9 bg-surface-sunken border border-border rounded-md px-3 text-sm text-text focus-visible:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-cust-type" className="text-xs font-medium text-text-muted block mb-1">
                    Party type
                  </label>
                  <select
                    id="new-cust-type"
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value)}
                    className="w-full h-9 bg-surface-sunken border border-border rounded-md px-2 text-xs text-text focus-visible:border-accent"
                  >
                    <option value="Retail_Customer">Retail customer</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-cust-state" className="text-xs font-medium text-text-muted block mb-1">
                    State code
                  </label>
                  <input
                    id="new-cust-state"
                    type="text"
                    maxLength={2}
                    placeholder="24"
                    value={newCustState}
                    onChange={(e) => setNewCustState(e.target.value)}
                    className="w-full h-9 bg-surface-sunken border border-border rounded-md px-3 text-sm text-text tabular-nums focus-visible:border-accent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-cust-gstin" className="text-xs font-medium text-text-muted block mb-1">
                  GSTIN (optional)
                </label>
                <input
                  id="new-cust-gstin"
                  type="text"
                  placeholder="e.g. 24AAACG1234F1Z5"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                  className="w-full h-9 bg-surface-sunken border border-border rounded-md px-3 text-sm uppercase text-text focus-visible:border-accent"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-3.5 py-2 rounded-md text-xs text-text-muted hover:text-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingParty}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-accent hover:bg-accent-hover text-white transition"
                >
                  {isSavingParty ? 'Saving...' : 'Save & select customer'}
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
