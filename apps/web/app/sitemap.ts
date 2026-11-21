import { MetadataRoute } from 'next';
import { fetchCategories, fetchProducts } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://lammart.com';
  const lastModified = new Date();

  // Static routes
  const routes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/shipping-policy`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/returns`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/quote`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/samples`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified, changeFrequency: 'daily', priority: 0.7 },
  ];

  try {
    // Categories
    const categories = await fetchCategories();
    for (const cat of categories) {
      routes.push({
        url: `${baseUrl}/c/${cat.slug}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
      if (cat.children) {
        for (const child of cat.children) {
          routes.push({
            url: `${baseUrl}/c/${child.slug}`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }
    }

    // Products
    const productsRes = await fetchProducts({ limit: 100 });
    for (const prod of productsRes.data) {
      routes.push({
        url: `${baseUrl}/p/${prod.slug}`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.9,
      });
    }
  } catch {
    // If API error, return static routes
  }

  return routes;
}
