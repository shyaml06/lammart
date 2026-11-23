'use client';

import { useState, useEffect } from 'react';
import {
  Layers, ArrowLeftRight, PackagePlus, AlertTriangle,
  Search, Filter, CheckCircle2, Building, Warehouse
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { formatINR } from '@/lib/formatters';

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
  sheetsPerBox?: number;
  reorderLevel: number;
  defaultSellingPrice: number;
  stockLedgers: { location: 'Showroom' | 'Godown'; quantityOnHand: number }[];
}

export default function InventoryPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modals
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);

  // Inward form
  const [inwardLocation, setInwardLocation] = useState<'Godown' | 'Showroom'>('Godown');
  const [inwardQty, setInwardQty] = useState<number>(10);
  const [inwardInBoxes, setInwardInBoxes] = useState<boolean>(true);
  const [inwardNotes, setInwardNotes] = useState<string>('');

  // Transfer form
  const [transferFrom, setTransferFrom] = useState<'Godown' | 'Showroom'>('Godown');
  const [transferTo, setTransferTo] = useState<'Godown' | 'Showroom'>('Showroom');
  const [transferQty, setTransferQty] = useState<number>(5);
  const [transferNotes, setTransferNotes] = useState<string>('');

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [stockError, setStockError] = useState('');

  // Load catalog variants with stock
  const loadStock = async () => {
    setStockError('');
    setIsLoading(true);
    try {
      let url = `/catalog/variants?limit=100`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (selectedBrand) url += `&brand=${encodeURIComponent(selectedBrand)}`;

      const res = await apiRequest(url);
      setVariants(res.data || []);
    } catch (err) {
      setStockError('Could not load stock. Displayed quantities may be out of date.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStock();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedBrand]);

  // Execute Purchase Inward
  const handlePurchaseInward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVariant) return;

    try {
      const res = await apiRequest('/inventory/purchase-inward', {
        method: 'POST',
        body: JSON.stringify({
          variantId: activeVariant.id,
          location: inwardLocation,
          quantity: inwardQty,
          inBoxes: inwardInBoxes,
          notes: inwardNotes || null,
        }),
      });

      setActionSuccess(res.message || 'Purchase inward recorded successfully!');
      setShowInwardModal(false);
      loadStock();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase inward');
    }
  };

  // Execute Stock Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVariant) return;

    try {
      const res = await apiRequest('/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify({
          variantId: activeVariant.id,
          fromLocation: transferFrom,
          toLocation: transferTo,
          quantity: transferQty,
          notes: transferNotes || null,
        }),
      });

      setActionSuccess(res.message || 'Stock transfer complete!');
      setShowTransferModal(false);
      loadStock();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Transfer failed');
    }
  };

  // Filter low stock items if toggled
  const filteredVariants = variants.filter((v) => {
    if (!filterLowStock) return true;
    const totalStock = v.stockLedgers.reduce((sum, s) => sum + Number(s.quantityOnHand), 0);
    return totalStock <= v.reorderLevel;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E7E2D9] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-['Space_Grotesk'] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0B7A55]" />
            <span>Multi-Location Inventory Matrix</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time stock balance across Main Godown and Showroom Counter with instant transfers and box-inward conversion.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search shade code / brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-600 w-56 text-gray-900"
            />
          </div>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
          >
            <option value="">All Brands</option>
            <option value="Merino">Merino</option>
            <option value="Greenlam">Greenlam</option>
            <option value="Century">Century</option>
          </select>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              filterLowStock
                ? 'bg-amber-500 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alert</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Stock Matrix Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E7E2D9] overflow-hidden">
        {stockError && <div className="p-4"><p role="alert">{stockError}</p><button type="button" className="min-h-11 underline" onClick={loadStock}>Retry stock lookup</button></div>}
        <div role="region" aria-label="Stock and godown table; scroll for more columns" tabIndex={0} className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Design Code & Name</th>
                <th className="py-3 px-4">Finish / Thickness</th>
                <th className="py-3 px-4 text-right">Reorder Lvl</th>
                <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-950">Showroom Stock</th>
                <th className="py-3 px-4 text-right bg-blue-50/50 text-blue-950">Godown Stock</th>
                <th className="py-3 px-4 text-right font-bold">Total Stock</th>
                <th className="py-3 px-4 text-right">Selling Rate</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">Loading inventory matrix...</td>
                </tr>
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">No matching laminate variants found.</td>
                </tr>
              ) : (
                filteredVariants.map((v) => {
                  const showroom = Number(v.stockLedgers?.find((s) => s.location === 'Showroom')?.quantityOnHand || 0);
                  const godown = Number(v.stockLedgers?.find((s) => s.location === 'Godown')?.quantityOnHand || 0);
                  const total = showroom + godown;
                  const isLow = total <= v.reorderLevel;

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{v.brand}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-emerald-800">{v.designCode}</span>
                        <div className="text-xs text-gray-500 font-medium">{v.designName}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {v.finish} | {v.thicknessMm}mm ({v.size})
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums tabular-nums text-xs text-content-muted">{v.reorderLevel}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums tabular-nums font-bold text-emerald-900 bg-emerald-50/20">
                        {showroom}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums tabular-nums font-bold text-blue-900 bg-blue-50/20">
                        {godown}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-full ${
                            isLow
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {total} {v.unit}s
                        </span>
                        {isLow && <span className="ml-2 whitespace-nowrap text-xs font-semibold text-red-800">Low stock</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-gray-900">
                        {formatINR(v.defaultSellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Inward Button */}
                          <button
                            onClick={() => {
                              setActiveVariant(v);
                              setShowInwardModal(true);
                            }}
                            title="Inward from Supplier (Boxes -> Sheets)"
                            className="flex min-h-11 items-center gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>Inward</span>
                          </button>

                          {/* Transfer Button */}
                          <button
                            onClick={() => {
                              setActiveVariant(v);
                              setShowTransferModal(true);
                            }}
                            title="Transfer Stock between Locations"
                            className="flex min-h-11 items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Transfer</span>
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

      {/* Purchase Inward Modal */}
      {showInwardModal && activeVariant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base font-['Space_Grotesk'] flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-700" />
                <span>Purchase Inward Entry</span>
              </h3>
              <button onClick={() => setShowInwardModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
              <div className="font-bold text-gray-900 text-sm">
                {activeVariant.brand} {activeVariant.designCode} — {activeVariant.designName}
              </div>
              <div className="text-gray-500">
                {activeVariant.finish} • {activeVariant.thicknessMm}mm • {activeVariant.sheetsPerBox || 10} sheets per box
              </div>
            </div>

            <form onSubmit={handlePurchaseInward} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Destination Location</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInwardLocation('Godown')}
                    className={`py-2 rounded-lg text-xs font-semibold border ${
                      inwardLocation === 'Godown' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    Main Godown
                  </button>
                  <button
                    type="button"
                    onClick={() => setInwardLocation('Showroom')}
                    className={`py-2 rounded-lg text-xs font-semibold border ${
                      inwardLocation === 'Showroom' ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    Showroom Counter
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Quantity Inward {inwardInBoxes ? '(Boxes)' : `(${activeVariant.unit}s)`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inwardQty}
                    onChange={(e) => setInwardQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={inwardInBoxes}
                      onChange={(e) => setInwardInBoxes(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Convert from Boxes ({activeVariant.sheetsPerBox || 10} sheets/box)</span>
                  </label>
                </div>
              </div>

              {inwardInBoxes && (
                <div className="bg-emerald-50 text-emerald-900 p-2.5 rounded-lg text-xs font-medium">
                  Result: <span className="font-bold font-mono">+{inwardQty * (activeVariant.sheetsPerBox || 10)}</span> sheets will be credited to {inwardLocation}.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Supplier / Inward Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #PO-9912 from Greenlam Distributor"
                  value={inwardNotes}
                  onChange={(e) => setInwardNotes(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0B7A55] hover:bg-[#086143] text-white px-5 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && activeVariant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base font-['Space_Grotesk'] flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-700" />
                <span>Move Stock Between Locations</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
              <div className="font-bold text-gray-900 text-sm">
                {activeVariant.brand} {activeVariant.designCode} — {activeVariant.designName}
              </div>
              <div className="text-gray-600">
                Showroom Balance: <span className="font-bold text-emerald-800">{activeVariant.stockLedgers.find(s=>s.location==='Showroom')?.quantityOnHand || 0}</span> | Godown Balance: <span className="font-bold text-blue-800">{activeVariant.stockLedgers.find(s=>s.location==='Godown')?.quantityOnHand || 0}</span>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Transfer From (Source)</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => {
                      const from = e.target.value as 'Godown' | 'Showroom';
                      setTransferFrom(from);
                      setTransferTo(from === 'Godown' ? 'Showroom' : 'Godown');
                    }}
                    className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs font-semibold text-gray-900"
                  >
                    <option value="Godown">Main Godown</option>
                    <option value="Showroom">Showroom Counter</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Transfer To (Destination)</label>
                  <input
                    type="text"
                    disabled
                    value={transferTo === 'Godown' ? 'Main Godown' : 'Showroom Counter'}
                    className="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Quantity to Move (Sheets)</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Transfer Reason / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Replenish display counter rack"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
