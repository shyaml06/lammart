import * as React from 'react';
import { Product, ProductVariant } from '@lammart/shared';

export function TechnicalSpecs({
  product,
  variant,
}: {
  product: Product;
  variant: ProductVariant;
}) {
  const specs: { label: string; value: string }[] = [];

  // Core product properties
  if (product.brand?.name) {
    specs.push({ label: 'Brand / Manufacturer', value: product.brand.name });
  }
  if (product.category?.name) {
    specs.push({ label: 'Category', value: product.category.name });
  }
  if (variant.sku) {
    specs.push({ label: 'Product SKU', value: variant.sku });
  }
  if (variant.designCode) {
    specs.push({ label: 'Design Code', value: `#${variant.designCode}` });
  }

  // Variant attributes
  if (variant.attributes) {
    for (const [k, v] of Object.entries(variant.attributes)) {
      const formattedLabel = k
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      specs.push({ label: formattedLabel, value: v });
    }
  }

  // Common statutory / logistics specs
  if (product.unit) {
    specs.push({ label: 'Selling Unit', value: product.unit.toUpperCase() });
  }
  if (product.hsnCode) {
    specs.push({ label: 'HSN Code', value: product.hsnCode });
  }
  if (product.gstRate) {
    specs.push({ label: 'GST Tax Rate', value: `${product.gstRate}% (Inclusive)` });
  }
  if (variant.weightGrams) {
    const kg = (variant.weightGrams / 1000).toFixed(2);
    specs.push({ label: 'Unit Weight', value: `${kg} kg (${variant.weightGrams}g)` });
  }
  specs.push({
    label: 'Packaging',
    value: product.isHeavy
      ? 'Heavy Crated Wooden Corner Protection'
      : 'Corrugated Corner Caps with Moisture Sealed Shrink Wrap',
  });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
      <div>
        <h4 className="font-bold text-zinc-950 text-base">Technical Specifications</h4>
        <p className="text-xs text-zinc-500">
          Factory engineered specifications and compliance certifications
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 divide-y divide-zinc-200 text-xs">
        {specs.map((item, idx) => (
          <div
            key={item.label + idx}
            className={`grid grid-cols-1 sm:grid-cols-3 px-4 py-3 ${
              idx % 2 === 0 ? 'bg-zinc-50/50' : 'bg-white'
            }`}
          >
            <span className="font-semibold text-zinc-600 sm:col-span-1">{item.label}</span>
            <span className="font-medium text-zinc-950 sm:col-span-2 mt-0.5 sm:mt-0">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
