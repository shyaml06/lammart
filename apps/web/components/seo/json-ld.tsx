import * as React from 'react';
import { Product, ProductVariant } from '@lammart/shared';

export function ProductJsonLd({
  product,
  selectedVariant,
}: {
  product: Product;
  selectedVariant?: ProductVariant;
}) {
  const activeVariant = selectedVariant || product.variants?.[0];
  const priceINR = activeVariant ? (activeVariant.price / 100).toFixed(2) : '0.00';
  const inStock = activeVariant ? activeVariant.stock > 0 : true;

  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.images?.map((img) => img.path) || [],
    description: product.description,
    sku: activeVariant?.sku || product.slug,
    mpn: activeVariant?.designCode || activeVariant?.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand?.name || 'Lammart',
    },
    offers: {
      '@type': 'Offer',
      url: `https://lammart.com/p/${product.slug}`,
      priceCurrency: 'INR',
      price: priceINR,
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Lammart Surfaces Pvt. Ltd.',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `https://lammart.com${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lammart Surfaces',
    legalName: 'Lammart Surfaces Pvt. Ltd.',
    url: 'https://lammart.com',
    logo: 'https://lammart.com/images/logo.png',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Ground Floor, Trade Center, S.G. Highway, Bodakdev',
      addressLocality: 'Ahmedabad',
      addressRegion: 'Gujarat',
      postalCode: '380054',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-98765-43210',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi', 'gu'],
    },
    sameAs: [
      'https://www.facebook.com/lammart',
      'https://www.instagram.com/lammart',
      'https://twitter.com/lammart',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
