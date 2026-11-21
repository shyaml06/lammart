import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchProductBySlug } from '@/lib/api';
import { ProductPageClient } from '@/components/pdp/product-page-client';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';

interface Props {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProductBySlug(params.slug);
  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const primaryVariant = product.variants?.[0];
  const designCodeText = primaryVariant?.designCode ? ` (Design #${primaryVariant.designCode})` : '';
  const title = `${product.name}${designCodeText} - ${product.brand?.name || 'Lammart'}`;
  const description =
    product.description ||
    `Shop ${product.name} at direct manufacturer pricing from Lammart Ahmedabad showroom. Fast crated site delivery across Gujarat and India.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Lammart`,
      description,
      url: `https://lammart.com/p/${product.slug}`,
      images: product.images?.[0] ? [{ url: product.images[0].path, alt: product.name }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await fetchProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    ...(product.category
      ? [{ name: product.category.name, url: `/c/${product.category.slug}` }]
      : []),
    { name: product.name, url: `/p/${product.slug}` },
  ];

  return (
    <div>
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd items={breadcrumbs} />
      <ProductPageClient product={product} />
    </div>
  );
}
