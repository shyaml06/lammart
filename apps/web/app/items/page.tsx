'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  PackagePlus,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  Box,
  Tag,
  ShieldAlert,
  X
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatINR } from '@/lib/formatters';

const CATEGORIES = [
  'All',
  'Laminate',
  'Liner',
  'Plywood',
  'EdgeBand',
  'Adhesive',
  'Hardware',
] as const;

const BRANDS = [
  'Merino',
  'Greenlam',
  'Century',
  'Royal Touché',
  'Advance',
  'Fevicol',
  'Action TESA',
  'Other',
];

const FINISHES = [
  'Matte',
  'Suede',
  'High Gloss',
  'Fluted',
  'Textured',
  'Gloss',
  'Woodgrain',
  'Standard',
];

const UNITS = ['Sheet', 'Box', 'Roll', 'Kg', 'Piece'];

export default function ItemsMasterPage() {
  const { user, isAdmin } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [formBrand, setFormBrand] = useState('Merino');
  const [formCategory, setFormCategory] = useState('Laminate');
  const [formDesignCode, setFormDesignCode] = useState('');
  const [formDesignName, setFormDesignName] = useState('');
  const [formFinish, setFormFinish] = useState('Matte');
  const [formThickness, setFormThickness] = useState('1.0');
  const [formSize, setFormSize] = useState('8x4 ft');
  const [formHsnCode, setFormHsnCode] = useState('4823');
  const [formGstRate, setFormGstRate] = useState('18');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formUnit, setFormUnit] = useState('Sheet');
  const [formReorderLevel, setFormReorderLevel] = useState('5');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formShowroomStock, setFormShowroomStock] = useState('10');
  const [formGodownStock, setFormGodownStock] = useState('25');
  const [formIsActive, setFormIsActive] = useState(true);

  // Load items
  const loadItems = async () => {
    setIsLoading(true);
    try {
      let endpoint = `/catalog/variants?limit=150&status=all`;
      if (searchQuery.trim()) {
        endpoint += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (selectedCategory !== 'All') {
        endpoint += `&category=${encodeURIComponent(selectedCategory)}`;
      }

      const res = await apiRequest(endpoint);
      setItems(res.data || []);
      setTotalItems(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load items:', err);
      showNotification(err?.message || 'Failed to load catalog items', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadItems();
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormBrand('Merino');
    setFormCategory('Laminate');
    setFormDesignCode('');
    setFormDesignName('');
    setFormFinish('Matte');
    setFormThickness('1.0');
    setFormSize('8x4 ft');
    setFormHsnCode('4823');
    setFormGstRate('18');
    setFormPurchasePrice('1200');
    setFormSellingPrice('1550');
    setFormUnit('Sheet');
    setFormReorderLevel('5');
    setFormImageUrl('');
    setFormShowroomStock('5');
    setFormGodownStock('20');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormBrand(item.brand || 'Merino');
    setFormCategory(item.category || 'Laminate');
    setFormDesignCode(item.designCode || '');
    setFormDesignName(item.designName || '');
    setFormFinish(item.finish || 'Matte');
    setFormThickness(item.thicknessMm ? String(item.thicknessMm) : '1.0');
    setFormSize(item.size || '8x4 ft');
    setFormHsnCode(item.hsnCode || '4823');
    setFormGstRate(item.gstRate ? String(item.gstRate) : '18');
    setFormPurchasePrice(item.basePurchasePrice ? String(item.basePurchasePrice) : '0');
    setFormSellingPrice(item.defaultSellingPrice ? String(item.defaultSellingPrice) : '0');
    setFormUnit(item.unit || 'Sheet');
    setFormReorderLevel(item.reorderLevel ? String(item.reorderLevel) : '5');
    setFormImageUrl(item.imageUrl || '');

    const showroom = item.stockLedgers?.find((s: any) => s.location === 'Showroom')?.quantityOnHand || 0;
    const godown = item.stockLedgers?.find((s: any) => s.location === 'Godown')?.quantityOnHand || 0;
    setFormShowroomStock(String(showroom));
    setFormGodownStock(String(godown));
    setFormIsActive(item.isActive !== false);

    setIsModalOpen(true);
  };

  // Image file upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lammart_token')}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      const uploadedUrl = data?.url || data?.file?.url;
      if (!uploadedUrl) {
        throw new Error('No image URL returned by server');
      }

      setFormImageUrl(uploadedUrl);
      showNotification('Image uploaded successfully!');
    } catch (err: any) {
      showNotification(err.message || 'Image upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Save (Create or Update) Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrand || !formDesignCode || !formDesignName) {
      showNotification('Brand, Shade Code, and Design Name are required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        brand: formBrand,
        category: formCategory,
        designCode: formDesignCode.trim(),
        designName: formDesignName.trim(),
        finish: formFinish,
        thicknessMm: parseFloat(formThickness) || 1.0,
        size: formSize,
        hsnCode: formHsnCode || '4823',
        gstRate: parseFloat(formGstRate) || 18,
        basePurchasePrice: parseFloat(formPurchasePrice) || 0,
        defaultSellingPrice: parseFloat(formSellingPrice) || 0,
        unit: formUnit,
        reorderLevel: parseInt(formReorderLevel, 10) || 5,
        imageUrl: formImageUrl || null,
        showroomStock: parseFloat(formShowroomStock) || 0,
        godownStock: parseFloat(formGodownStock) || 0,
      };

      if (editingItem) {
        payload.isActive = formIsActive;
        await apiRequest(`/catalog/variants/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showNotification(`Updated item ${formBrand} ${formDesignCode}`);
      } else {
        await apiRequest('/catalog/variants', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showNotification(`Added new item ${formBrand} ${formDesignCode}`);
      }

      setIsModalOpen(false);
      loadItems();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Visibility / In-Stock
  const handleToggleActive = async (item: any) => {
    const newStatus = !item.isActive;
    try {
      await apiRequest(`/catalog/variants/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: newStatus }),
      });
      showNotification(
        `Item ${item.brand} ${item.designCode} marked as ${newStatus ? 'Visible / Active' : 'Hidden / Out of Stock'}`
      );
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: newStatus } : i))
      );
    } catch (err: any) {
      showNotification(err.message || 'Failed to update item status', 'error');
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: any) => {
    if (!confirm(`Are you sure you want to delete ${item.brand} ${item.designCode} (${item.designName})?`)) {
      return;
    }

    try {
      await apiRequest(`/catalog/variants/${item.id}?hard=true`, {
        method: 'DELETE',
      });
      showNotification(`Item ${item.brand} ${item.designCode} deleted`);
      loadItems();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete item', 'error');
    }
  };

  // Filter items by stock status in frontend
  const filteredItems = items.filter((item) => {
    const showroom = item.stockLedgers?.find((s: any) => s.location === 'Showroom')?.quantityOnHand || 0;
    const godown = item.stockLedgers?.find((s: any) => s.location === 'Godown')?.quantityOnHand || 0;
    const totalStock = showroom + godown;
    const reorder = item.reorderLevel || 5;

    if (stockStatusFilter === 'in_stock') return totalStock > 0 && item.isActive;
    if (stockStatusFilter === 'out_of_stock') return totalStock <= 0 || !item.isActive;
    if (stockStatusFilter === 'low_stock') return totalStock > 0 && totalStock <= reorder;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Stats Bar */}
      <div className="bg-surface rounded-2xl p-6 border border-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-text">
              Catalog & Items Master
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-soft text-accent font-semibold border border-accent/20">
              Admin Master
            </span>
          </div>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Manage decorative laminates, liners, edge bands, and adhesives. Upload catalog photos, adjust stock, and toggle visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadItems}
            className="p-2.5 text-text-muted hover:text-text bg-surface-sunken hover:bg-surface border border-border rounded-xl transition"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
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

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-2xl p-4 border border-border space-y-4">
        {/* Categories Tab Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
          <span className="text-text-muted shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-accent text-white font-semibold shadow-sm'
                  : 'bg-surface-sunken text-text-muted hover:text-text hover:bg-surface border border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Stock Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] relative">
            <Search className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Shade code (e.g. 21094), Brand (Merino), or Finish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2 bg-surface-sunken border border-border focus:border-border-strong rounded-xl text-xs md:text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-accent-soft text-accent hover:bg-accent hover:text-white rounded-lg text-xs font-semibold transition"
            >
              Search
            </button>
          </form>

          {/* Stock status pills */}
          <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-xl text-xs">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                stockStatusFilter === 'all' ? 'bg-surface text-text font-semibold shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('in_stock')}
              className={`px-2.5 py-1 rounded-lg transition ${
                stockStatusFilter === 'in_stock' ? 'bg-surface text-emerald-800 font-semibold shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => setStockStatusFilter('low_stock')}
              className={`px-2.5 py-1 rounded-lg transition ${
                stockStatusFilter === 'low_stock' ? 'bg-surface text-amber-800 font-semibold shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockStatusFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-lg transition ${
                stockStatusFilter === 'out_of_stock' ? 'bg-surface text-rose-800 font-semibold shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Out of Stock / Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Items */}
      {isLoading ? (
        <div className="bg-surface rounded-2xl p-12 border border-border text-center text-text-muted space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent" />
          <p className="text-sm">Loading catalog items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 border border-border text-center text-text-muted space-y-3">
          <Box className="w-10 h-10 mx-auto text-text-faint" />
          <h3 className="font-serif text-lg font-medium text-text">No items found</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {searchQuery
              ? `No matching items found for "${searchQuery}". Try a different shade code or filter.`
              : 'No items in this category yet. Click "Add New Item" above to create one.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const showroomStock = item.stockLedgers?.find((s: any) => s.location === 'Showroom')?.quantityOnHand || 0;
            const godownStock = item.stockLedgers?.find((s: any) => s.location === 'Godown')?.quantityOnHand || 0;
            const totalStock = showroomStock + godownStock;
            const isOutOfStock = totalStock <= 0;
            const isLowStock = totalStock > 0 && totalStock <= (item.reorderLevel || 5);

            return (
              <div
                key={item.id}
                className={`bg-surface rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden hover:shadow-md ${
                  !item.isActive
                    ? 'border-border/60 opacity-60 bg-surface-sunken/30'
                    : isOutOfStock
                    ? 'border-rose-200/60'
                    : 'border-border'
                }`}
              >
                {/* Photo & Category Banner */}
                <div className="relative h-44 bg-[#FAF7F2] border-b border-border flex items-center justify-center overflow-hidden group">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`${item.brand} ${item.designCode}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-2 font-serif text-lg font-bold">
                        {item.brand.charAt(0)}
                      </div>
                      <span className="text-[11px] text-text-faint font-medium">No photo uploaded</span>
                    </div>
                  )}

                  {/* Category Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface/90 backdrop-blur-xs text-text border border-border shadow-xs">
                      {item.category}
                    </span>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {!item.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-100 shadow-xs">
                        Deactivated
                      </span>
                    ) : isOutOfStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 shadow-xs">
                        Out of stock
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
                        Low Stock ({totalStock})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                        In Stock ({totalStock})
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Brand and Shade Code */}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                        {item.brand}
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-sunken text-text border border-border">
                        #{item.designCode}
                      </span>
                    </div>

                    {/* Design Name */}
                    <h3 className="font-serif text-base font-medium text-text mt-1 line-clamp-1">
                      {item.designName}
                    </h3>

                    {/* Attributes chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px] text-text-muted">
                      <span className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border">
                        {item.finish}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border font-mono">
                        {item.thicknessMm}mm
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border">
                        {item.size}
                      </span>
                      {item.hsnCode && (
                        <span className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-faint font-mono">
                          HSN {item.hsnCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Breakdown */}
                  <div className="pt-2 border-t border-border/70 text-xs">
                    <div className="flex justify-between items-center text-text-muted mb-1">
                      <span>Stock Location:</span>
                      <span className="font-mono tabular-nums font-semibold text-text">
                        Total {totalStock} {item.unit}s
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface-sunken p-2 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Showroom:</span>
                        <span className="font-mono font-medium text-text">{showroomStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Godown:</span>
                        <span className="font-mono font-medium text-text">{godownStock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action row */}
                  <div className="pt-2 flex items-center justify-between border-t border-border/70">
                    <div>
                      <div className="text-[10px] text-text-muted">Selling Rate</div>
                      <div className="text-sm font-semibold font-serif text-text">
                        {formatINR(item.defaultSellingPrice)}
                        <span className="text-[10px] font-normal text-text-faint ml-0.5">/{item.unit}</span>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`p-2 rounded-lg text-xs transition border ${
                          item.isActive
                            ? 'bg-surface-sunken hover:bg-surface text-text-muted border-border'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                        }`}
                        title={item.isActive ? 'Hide / Mark Out of Stock' : 'Make Active / In Stock'}
                      >
                        {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 rounded-lg text-xs bg-surface-sunken hover:bg-surface text-text-muted hover:text-text border border-border transition"
                        title="Edit Item Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 rounded-lg text-xs bg-surface-sunken hover:bg-rose-50 text-text-muted hover:text-rose-700 border border-border hover:border-rose-200 transition"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl max-w-2xl w-full border border-border shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-sunken/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-medium text-text">
                    {editingItem ? 'Edit Item / Laminate Shade' : 'Add New Item to Catalog'}
                  </h2>
                  <p className="text-xs text-text-muted">
                    Configure design specs, stock ledgers, photo, and default pricing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Photo Upload & Preview Section */}
              <div className="p-4 bg-surface-sunken rounded-xl border border-border space-y-3">
                <label className="block text-xs font-semibold text-text">
                  Item Photo / Shade Texture
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Thumbnail preview */}
                  <div className="w-20 h-20 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0">
                    {formImageUrl ? (
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-text-faint" />
                    )}
                  </div>

                  <div className="flex-1 min-w-[200px] space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-3 py-1.5 bg-surface hover:bg-surface-sunken border border-border rounded-xl text-xs font-semibold text-text flex items-center gap-1.5 transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-accent" />
                        <span>{isUploading ? 'Uploading...' : 'Upload Image File'}</span>
                      </button>

                      {formImageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('')}
                          className="text-xs text-rose-700 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      placeholder="Or paste image URL (https://...)"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Core Details Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Merino, Greenlam, Century"
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Core Details Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Design / Shade Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDesignCode}
                    onChange={(e) => setFormDesignCode(e.target.value)}
                    placeholder="e.g. 21094 or 101"
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text font-mono font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Design Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDesignName}
                    onChange={(e) => setFormDesignName(e.target.value)}
                    placeholder="e.g. Frosty White, Natural Walnut"
                    className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Attributes Row 3 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Finish</label>
                  <select
                    value={formFinish}
                    onChange={(e) => setFormFinish(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text"
                  >
                    {FINISHES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Thickness (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formThickness}
                    onChange={(e) => setFormThickness(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Sheet Size</label>
                  <input
                    type="text"
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-text"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & GST Row 4 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono font-bold text-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formHsnCode}
                    onChange={(e) => setFormHsnCode(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">GST Rate %</label>
                  <input
                    type="number"
                    value={formGstRate}
                    onChange={(e) => setFormGstRate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-surface-sunken border border-border rounded-xl text-xs font-mono text-text"
                  />
                </div>
              </div>

              {/* Initial Stock & Reorder Row 5 */}
              <div className="p-4 bg-surface-sunken/60 rounded-xl border border-border space-y-2">
                <div className="text-xs font-semibold text-text flex items-center justify-between">
                  <span>Inventory Ledgers & Stock Balance</span>
                  <span className="text-[11px] text-text-muted font-normal">Showroom vs Main Godown</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">Showroom Qty</label>
                    <input
                      type="number"
                      value={formShowroomStock}
                      onChange={(e) => setFormShowroomStock(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono text-text"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">Godown Qty</label>
                    <input
                      type="number"
                      value={formGodownStock}
                      onChange={(e) => setFormGodownStock(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono text-text"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">Reorder Alert Level</label>
                    <input
                      type="number"
                      value={formReorderLevel}
                      onChange={(e) => setFormReorderLevel(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono text-text"
                    />
                  </div>
                </div>
              </div>

              {/* Visibility Status */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="isActive" className="text-xs text-text font-medium cursor-pointer">
                  Visible in Billing & Counter Search (uncheck to mark out-of-stock or discontinue)
                </label>
              </div>

              {/* Form buttons */}
              <div className="pt-4 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-sunken border border-border rounded-xl text-xs font-semibold text-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Item...' : editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
