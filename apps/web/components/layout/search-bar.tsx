'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Hash, Tag, Package, ArrowRight } from 'lucide-react';
import { SearchSuggestion } from '@lammart/shared';
import { fetchSearchSuggestions } from '@/lib/api';

export function SearchBar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Debounced search query
  React.useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchSearchSuggestions(query);
        setSuggestions(results);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchSuggestion) => {
    setIsOpen(false);
    if (item.type === 'brand') {
      router.push(`/search?brand=${encodeURIComponent(item.slug)}`);
    } else {
      router.push(`/p/${encodeURIComponent(item.slug)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else if (query.trim()) {
        setIsOpen(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const designCodes = suggestions.filter((s) => s.type === 'design_code');
  const products = suggestions.filter((s) => s.type === 'product');
  const brands = suggestions.filter((s) => s.type === 'brand');

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search laminates, e.g. #1000, plywood, handles"
          className="h-[48px] w-full rounded-[12px] border border-[#D9D3C7] bg-[#FAF8F4] pl-10 pr-9 text-[15px] text-[#14201B] placeholder:text-[#5B6660] focus:bg-white focus:border-[#0B7A55] focus:outline-none transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 text-zinc-400 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Popover */}
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl animate-in fade-in-80 zoom-in-95">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">Searching catalog...</div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto p-2 divide-y divide-zinc-100">
              {/* Design Codes Section */}
              {designCodes.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Design Codes
                  </div>
                  {designCodes.map((item, idx) => {
                    const globalIndex = suggestions.indexOf(item);
                    return (
                      <button
                        key={`${item.slug}-${idx}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm transition-colors cursor-pointer ${selectedIndex === globalIndex ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-zinc-50 text-zinc-800'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {item.title}
                          </span>
                          <span className="text-xs text-zinc-600 line-clamp-1">{item.subtitle}</span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Products Section */}
              {products.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Package className="h-3 w-3" /> Products
                  </div>
                  {products.map((item, idx) => {
                    const globalIndex = suggestions.indexOf(item);
                    return (
                      <button
                        key={`${item.slug}-${idx}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm transition-colors cursor-pointer ${selectedIndex === globalIndex ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-zinc-50 text-zinc-800'
                          }`}
                      >
                        <div>
                          <p className="font-medium text-xs text-zinc-900">{item.title}</p>
                          {item.subtitle && <p className="text-[11px] text-zinc-500">{item.subtitle}</p>}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Brands Section */}
              {brands.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Brands
                  </div>
                  {brands.map((item, idx) => {
                    const globalIndex = suggestions.indexOf(item);
                    return (
                      <button
                        key={`${item.slug}-${idx}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm transition-colors cursor-pointer ${selectedIndex === globalIndex ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-zinc-50 text-zinc-800'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-900">{item.title}</span>
                          {item.subtitle && <span className="text-[11px] text-zinc-400">({item.subtitle})</span>}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* View all results footer */}
              <div className="p-2 pt-1.5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                >
                  See all results for &quot;{query}&quot;
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
