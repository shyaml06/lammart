'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function HomePage() {
  const [selectedThickness, setSelectedThickness] = React.useState('1.0 mm');
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>(['Greenlam']);
  const [quoteItems, setQuoteItems] = React.useState<string[]>([]);
  const [swatchItems, setSwatchItems] = React.useState<string[]>([]);

  const brands = [
    { name: 'Greenlam', count: 5 },
    { name: 'CenturyPly', count: 5 },
    { name: 'Merino', count: 4 },
    { name: 'Royale Touche', count: 4 },
    { name: 'Godrej', count: 3 },
    { name: 'Dorset', count: 3 },
  ];

  const thicknesses = ['0.8 mm', '1.0 mm', '1.25 mm', '1.5 mm', '6 mm', '18 mm'];

  const products = [
    {
      id: '1',
      code: '#7011',
      thickness: '1.0 mm',
      brand: 'MERINO',
      name: 'Walnut Grain',
      price: '₹1,450',
      swatchStyle:
        'repeating-linear-gradient(90deg, #5a3b26 0 6px, #6b4630 6px 11px, #4e3220 11px 15px)',
      slug: 'merino-walnut-grain-7011',
    },
    {
      id: '2',
      code: '#6020',
      thickness: '1.0 mm',
      brand: 'GREENLAM',
      name: 'Sage Matte',
      price: '₹1,280',
      swatchStyle: 'linear-gradient(135deg, #7a9985, #5a7a67)',
      slug: 'greenlam-sage-matte-6020',
    },
    {
      id: '3',
      code: '#5042',
      thickness: '1.0 mm',
      brand: 'ROYALE TOUCHE',
      name: 'Calacatta Marble',
      price: '₹2,100',
      swatchStyle:
        'linear-gradient(120deg, #ecebe7, #d3d1c9 40%, #f3f2ee 60%, #c9c7bf)',
      slug: 'royale-touche-calacatta-marble-5042',
    },
    {
      id: '4',
      code: '#4108',
      thickness: '1.0 mm',
      brand: 'GODREJ',
      name: 'Natural Oak',
      price: '₹1,650',
      swatchStyle:
        'repeating-linear-gradient(90deg, #d9b98b 0 7px, #cfae7e 7px 12px, #e0c298 12px 18px)',
      slug: 'godrej-natural-oak-4108',
    },
    {
      id: '5',
      code: '#1000',
      thickness: '1.0 mm',
      brand: 'CENTURYPLY',
      name: 'Charcoal Suede',
      price: '₹1,390',
      swatchStyle: 'linear-gradient(160deg, #30353a, #1b1e21)',
      slug: 'centuryply-charcoal-suede-1000',
    },
    {
      id: '6',
      code: '#3217',
      thickness: '1.0 mm',
      brand: 'DORSET',
      name: 'Terracotta Linen',
      price: '₹1,520',
      swatchStyle: 'linear-gradient(135deg, #bd6a44, #a2522f)',
      slug: 'dorset-terracotta-linen-3217',
    },
  ];

  const handleToggleBrand = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((b) => b !== brandName)
        : [...prev, brandName]
    );
  };

  const handleAddSwatch = (code: string, name: string) => {
    if (swatchItems.includes(code)) {
      toast.info(`${name} swatch is already in your sample box`);
      return;
    }
    if (swatchItems.length >= 5) {
      toast.error('Maximum 5 free swatches per sample request');
      return;
    }
    setSwatchItems((prev) => [...prev, code]);
    toast.success(`Added ${name} (${code}) to sample swatches (Free)`);
  };

  const handleAddQuote = (code: string, name: string) => {
    setQuoteItems((prev) => [...prev, code]);
    toast.success(`Added ${name} (${code}) to B2B Quote Cart`);
  };

  return (
    <div className="bg-[#FAF8F4] text-[#14201B] min-h-[1400px]">
      {/* Category Heading & Breadcrumb Bar */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 pt-8 pb-6">
        <p className="m-0 mb-3 text-[14px] text-[#5B6660]">
          <Link href="/" className="hover:text-[#0B7A55]">
            Home
          </Link>{' '}
          /{' '}
          <b className="text-[#14201B] font-medium">Laminates</b>
        </p>
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div>
            <h1 className="font-display m-0 text-3xl sm:text-[44px] leading-[1.1] font-bold text-[#14201B]">
              Laminates
            </h1>
            <p className="m-0 mt-2 text-[17px] text-[#5B6660]">
              Decorative, liner and premium laminates, ready to quote.
            </p>
          </div>
          <p className="m-0 text-[14px] text-[#5B6660]">8 products</p>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Catalog Products Grid */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 pb-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Left Filter Sidebar */}
        <aside className="bg-white border border-[#E7E2D9] rounded-[16px] p-5 self-start shadow-xs">
          <h2 className="font-display m-0 mb-2 text-[18px] font-bold text-[#14201B]">
            Filters
          </h2>

          {/* Brand Filter */}
          <p className="mt-4 mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#5B6660] uppercase">
            BRAND
          </p>
          <div className="flex flex-col">
            {brands.map((b) => (
              <label
                key={b.name}
                className="flex items-center gap-3 min-h-[44px] text-[15px] text-[#14201B] cursor-pointer hover:text-[#0B7A55] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b.name)}
                  onChange={() => handleToggleBrand(b.name)}
                  className="w-[18px] h-[18px] rounded border-[#D9D3C7] text-[#0B7A55] accent-[#0B7A55] cursor-pointer"
                />
                <span>{b.name}</span>
                <span className="ml-auto text-[13px] text-[#5B6660]">{b.count}</span>
              </label>
            ))}
          </div>

          {/* Thickness Chips Filter */}
          <p className="mt-5 mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#5B6660] uppercase">
            THICKNESS
          </p>
          <div className="flex flex-wrap gap-2 pb-3">
            {thicknesses.map((th) => {
              const isSelected = selectedThickness === th;
              return (
                <button
                  key={th}
                  onClick={() => setSelectedThickness(th)}
                  className={`chip ${isSelected ? 'chip-active' : ''}`}
                >
                  {th}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Product Grid */}
        <main>
          {/* Active Chips & Sort Row */}
          <div className="flex justify-between items-center gap-4 flex-wrap mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedThickness && (
                <button
                  onClick={() => setSelectedThickness('')}
                  className="chip chip-active"
                >
                  {selectedThickness} ×
                </button>
              )}
              {selectedBrands.map((b) => (
                <button
                  key={b}
                  onClick={() => handleToggleBrand(b)}
                  className="chip chip-active"
                >
                  {b} ×
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedThickness('');
                  setSelectedBrands([]);
                }}
                className="chip border-none bg-transparent text-[#5B6660] hover:text-[#14201B]"
              >
                Clear all
              </button>
            </div>

            <label className="text-[14px] text-[#5B6660] flex items-center gap-2">
              Sort
              <select className="h-[44px] border border-[#D9D3C7] rounded-[10px] px-3 font-inherit text-[14px] bg-white text-[#14201B] focus:outline-none focus:border-[#0B7A55]">
                <option>Newest arrivals</option>
                <option>Brand</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </label>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((p) => (
              <article key={p.id} className="swatch-card group">
                {/* Visual Swatch Preview Box */}
                <div
                  className="h-[210px] relative transition-transform duration-300"
                  style={{ background: p.swatchStyle }}
                >
                  {/* Top-Left Code Pill */}
                  <span className="absolute top-3 left-3 bg-white text-[#14201B] text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-xs">
                    {p.code}
                  </span>
                  {/* Top-Right Thickness Pill */}
                  <span className="absolute top-3 right-3 bg-[rgba(20,32,27,0.72)] text-white text-[12px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs">
                    {p.thickness}
                  </span>
                </div>

                {/* Card Info Content */}
                <div className="p-4 flex flex-col gap-1 bg-white">
                  <span className="text-[12px] font-semibold tracking-[0.08em] text-[#5B6660] uppercase">
                    {p.brand}
                  </span>
                  <Link href={`/p/${p.slug}`}>
                    <h3 className="font-display m-0 text-[19px] font-bold text-[#14201B] hover:text-[#0B7A55] transition-colors">
                      {p.name}
                    </h3>
                  </Link>
                  <p className="m-0 mt-1 mb-3 text-[14px] text-[#5B6660]">
                    <span className="font-semibold text-[#14201B]">{p.price}</span> per sheet
                  </p>

                  {/* Dual Action Buttons from Mockup */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddSwatch(p.code, p.name)}
                      className="btn-b1 flex-1"
                    >
                      Free swatch
                    </button>
                    <button
                      onClick={() => handleAddQuote(p.code, p.name)}
                      className="btn-b2 flex-1"
                    >
                      Add to quote
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
