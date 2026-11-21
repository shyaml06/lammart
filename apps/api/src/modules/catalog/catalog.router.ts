import { Router, Request, Response } from 'express';
import { productFilterSchema } from '@lammart/shared';
import { CategoryRepository } from './category.repository';
import { ProductRepository } from './product.repository';
import { PincodeRepository } from './pincode.repository';

export const catalogRouter = Router();

const categoryRepo = new CategoryRepository();
const productRepo = new ProductRepository();
const pincodeRepo = new PincodeRepository();

/**
 * GET /categories
 * Returns hierarchical nested category tree
 */
catalogRouter.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = categoryRepo.getCategoryTree();
    res.status(200).json(categories);
  } catch (err: any) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: err.message || 'Failed to fetch categories',
    });
  }
});

/**
 * GET /products
 * Filterable, searchable, sorted, paginated product list
 */
catalogRouter.get('/products', (req: Request, res: Response) => {
  try {
    const parseResult = productFilterSchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid product query parameters',
        details: parseResult.error.format(),
      });
      return;
    }

    const result = productRepo.listProducts(req.query as any);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: err.message || 'Failed to list products',
    });
  }
});

/**
 * GET /products/:slug
 * Full product details including variants, attributes, price tiers, and images
 */
catalogRouter.get('/products/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const product = productRepo.getProductBySlug(slug);

    if (!product) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: `Product with slug '${slug}' not found`,
      });
      return;
    }

    res.status(200).json(product);
  } catch (err: any) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: err.message || 'Failed to get product',
    });
  }
});

/**
 * GET /search/suggest
 * Autocomplete suggestions for search queries (FTS5 + design codes + brands)
 */
catalogRouter.get('/search/suggest', (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const suggestions = productRepo.getSearchSuggestions(q);
    res.status(200).json(suggestions);
  } catch (err: any) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: err.message || 'Failed to fetch search suggestions',
    });
  }
});

/**
 * GET /filters
 * Aggregated dynamic attribute values and counts (optionally by category)
 */
catalogRouter.get('/filters', (req: Request, res: Response) => {
  try {
    const categoryQuery = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;

    if (categoryQuery) {
      // Validate category existence if supplied
      const cat = /^\d+$/.test(categoryQuery)
        ? categoryRepo.findById(parseInt(categoryQuery, 10))
        : categoryRepo.findBySlug(categoryQuery);

      if (!cat) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: `Category '${categoryQuery}' not found`,
        });
        return;
      }
    }

    const filters = productRepo.getFilterAggregations(categoryQuery);
    res.status(200).json(filters);
  } catch (err: any) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: err.message || 'Failed to aggregate filters',
    });
  }
});

/**
 * GET /pincode/:pincode
 * Pincode serviceability, charges, and delivery days
 */
catalogRouter.get('/pincode/:pincode', (req: Request, res: Response) => {
  try {
    const { pincode } = req.params;

    if (!/^\d{6}$/.test(pincode)) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Pincode must be exactly 6 digits',
      });
      return;
    }

    const info = pincodeRepo.findByPincode(pincode);
    if (!info) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: `Pincode '${pincode}' not found`,
      });
      return;
    }

    res.status(200).json(info);
  } catch (err: any) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: err.message || 'Failed to check pincode',
    });
  }
});

export default catalogRouter;
