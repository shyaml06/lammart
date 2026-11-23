// -------------------------------------------------
// Product variant catalog — CRUD + fast search
//
// Public:
//   GET  /variants          — list / search / filter
//   GET  /variants/:id      — single variant with stock
// Admin:
//   POST   /variants        — create variant
//   PUT    /variants/:id    — update variant
//   DELETE /variants/:id    — deactivate
// -------------------------------------------------

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ── GET /variants — search & filter ─────────────
// Quick search:  ?q=21094+suede+1mm
// Filters:       ?brand=Merino&category=Laminate&finish=Matte&status=all
router.get('/variants', requireAuth, async (req, res) => {
  try {
    const { q, brand, category, finish, status, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status === 'inactive') {
      where.isActive = false;
    } else if (status !== 'all') {
      where.isActive = true;
    }

    // Full-text-style search across brand + designCode + designName + finish
    if (q) {
      const terms = (q as string).split(/\s+/).filter(Boolean);
      where.AND = terms.map((term) => ({
        OR: [
          { brand: { contains: term, mode: 'insensitive' } },
          { designCode: { contains: term, mode: 'insensitive' } },
          { designName: { contains: term, mode: 'insensitive' } },
          { finish: { contains: term, mode: 'insensitive' } },
        ],
      }));
    }

    if (brand) where.brand = { equals: brand as string, mode: 'insensitive' };
    if (category) where.category = category as string;
    if (finish) where.finish = { equals: finish as string, mode: 'insensitive' };

    const [variants, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: { stockLedgers: true },
        orderBy: [{ brand: 'asc' }, { designCode: 'asc' }],
        skip,
        take: limitNum,
      }),
      prisma.productVariant.count({ where }),
    ]);

    res.json({ data: variants, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Variants list error:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// ── GET /variants/:id ───────────────────────────
router.get('/variants/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { stockLedgers: true },
    });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    res.json({ data: variant });
  } catch (error) {
    console.error('Variant fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch variant' });
  }
});

// ── POST /variants — create ─────────────────────
router.post('/variants', requireAuth, requireRole('Admin_Owner'), async (req, res) => {
  try {
    const { brand, category, designCode, designName, finish, thicknessMm,
            size, hsnCode, gstRate, basePurchasePrice, defaultSellingPrice,
            unit, sheetsPerBox, reorderLevel, imageUrl, showroomStock, godownStock } = req.body;

    if (!brand || !designCode || !designName) {
      return res.status(400).json({ error: 'brand, designCode, and designName are required' });
    }

    const variant = await prisma.productVariant.create({
      data: {
        brand, category: category || 'Laminate', designCode, designName,
        finish: finish || '', thicknessMm: thicknessMm || 1.0,
        size: size || '8x4 ft', hsnCode: hsnCode || '4823',
        gstRate: gstRate ?? 18.0,
        basePurchasePrice: basePurchasePrice || 0,
        defaultSellingPrice: defaultSellingPrice || 0,
        unit: unit || 'Sheet', sheetsPerBox: sheetsPerBox || null,
        reorderLevel: reorderLevel ?? 5,
        imageUrl: imageUrl || null,
      },
    });

    // Create stock ledger entries for both locations
    await prisma.stockLedger.createMany({
      data: [
        { variantId: variant.id, location: 'Showroom', quantityOnHand: Number(showroomStock) || 0 },
        { variantId: variant.id, location: 'Godown', quantityOnHand: Number(godownStock) || 0 },
      ],
    });

    const full = await prisma.productVariant.findUnique({
      where: { id: variant.id },
      include: { stockLedgers: true },
    });

    res.status(201).json({ data: full });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A variant with this brand+design+finish+thickness+size already exists' });
    }
    console.error('Create variant error:', error);
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// ── PUT /variants/:id — update ──────────────────
router.put('/variants/:id', requireAuth, requireRole('Admin_Owner'), async (req, res) => {
  try {
    const data: any = {};
    const fields = ['brand', 'designCode', 'designName', 'finish', 'size',
                    'hsnCode', 'unit', 'category', 'imageUrl'] as const;
    for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f];

    const decimals = ['thicknessMm', 'gstRate', 'basePurchasePrice', 'defaultSellingPrice'] as const;
    for (const f of decimals) if (req.body[f] !== undefined) data[f] = Number(req.body[f]);

    const ints = ['sheetsPerBox', 'reorderLevel'] as const;
    for (const f of ints) if (req.body[f] !== undefined) data[f] = req.body[f] === null ? null : Number(req.body[f]);

    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

    const id = req.params.id as string;
    const variant = await prisma.productVariant.update({
      where: { id },
      data,
      include: { stockLedgers: true },
    });

    // Update stock if showroomStock or godownStock provided
    if (req.body.showroomStock !== undefined) {
      await prisma.stockLedger.upsert({
        where: { variantId_location: { variantId: id, location: 'Showroom' } },
        update: { quantityOnHand: Number(req.body.showroomStock) || 0 },
        create: { variantId: id, location: 'Showroom', quantityOnHand: Number(req.body.showroomStock) || 0 },
      });
    }
    if (req.body.godownStock !== undefined) {
      await prisma.stockLedger.upsert({
        where: { variantId_location: { variantId: id, location: 'Godown' } },
        update: { quantityOnHand: Number(req.body.godownStock) || 0 },
        create: { variantId: id, location: 'Godown', quantityOnHand: Number(req.body.godownStock) || 0 },
      });
    }

    const updated = await prisma.productVariant.findUnique({
      where: { id },
      include: { stockLedgers: true },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update variant error:', error);
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

// ── DELETE /variants/:id — deactivate or hard delete ──────
router.delete('/variants/:id', requireAuth, requireRole('Admin_Owner'), async (req, res) => {
  try {
    const id = req.params.id as string;
    const hard = req.query.hard === 'true';

    if (hard) {
      const lineCount = await prisma.transactionLineItem.count({ where: { variantId: id } });
      if (lineCount > 0) {
        await prisma.productVariant.update({ where: { id }, data: { isActive: false } });
        return res.json({ success: true, message: 'Variant has past transaction history, marked as inactive/out-of-stock.' });
      }
      await prisma.stockLedger.deleteMany({ where: { variantId: id } });
      await prisma.stockMovement.deleteMany({ where: { variantId: id } });
      await prisma.productVariant.delete({ where: { id } });
      return res.json({ success: true, message: 'Variant removed permanently.' });
    }

    await prisma.productVariant.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete variant error:', error);
    res.status(500).json({ error: 'Failed to deactivate variant' });
  }
});

export default router;
