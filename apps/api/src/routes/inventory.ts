// -------------------------------------------------
// Inventory management
//   GET  /stock              — stock matrix with filters
//   POST /purchase-inward    — record purchase entry
//   POST /transfer           — move stock between locations
//   GET  /movements          — movement history
//   GET  /low-stock          — items below reorder level
// -------------------------------------------------

import { Router } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ── GET /stock — current stock matrix ───────────
router.get('/stock', async (req, res) => {
  try {
    const { brand, category, location, q, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const variantWhere: any = { isActive: true };
    if (brand) variantWhere.brand = { equals: brand as string, mode: 'insensitive' };
    if (category) variantWhere.category = category;
    if (q) {
      const terms = (q as string).split(/\s+/);
      variantWhere.AND = terms.map((t) => ({
        OR: [
          { designCode: { contains: t, mode: 'insensitive' } },
          { designName: { contains: t, mode: 'insensitive' } },
          { brand: { contains: t, mode: 'insensitive' } },
        ],
      }));
    }

    const stockWhere: any = { variant: variantWhere };
    if (location) stockWhere.location = location;

    const [ledgers, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where: stockWhere,
        include: { variant: true },
        orderBy: { variant: { brand: 'asc' } },
        skip,
        take: limitNum,
      }),
      prisma.stockLedger.count({ where: stockWhere }),
    ]);

    res.json({ data: ledgers, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Stock matrix error:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

// ── POST /purchase-inward ───────────────────────
// Receives supplier goods. Supports box → sheet conversion.
router.post('/purchase-inward', async (req, res) => {
  try {
    const { variantId, location, quantity, inBoxes, notes } = req.body;

    if (!variantId || !location || quantity == null) {
      return res.status(400).json({ error: 'variantId, location, quantity required' });
    }

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    // If inBoxes=true and sheetsPerBox is set, convert
    let finalQty = new Decimal(quantity);
    if (inBoxes && variant.sheetsPerBox) {
      finalQty = finalQty.mul(variant.sheetsPerBox);
    }

    await prisma.$transaction(async (tx) => {
      // Update (or create) stock ledger
      await tx.stockLedger.upsert({
        where: { variantId_location: { variantId, location: location as any } },
        update: { quantityOnHand: { increment: finalQty } },
        create: { variantId, location: location as any, quantityOnHand: finalQty },
      });

      // Log movement
      await tx.stockMovement.create({
        data: {
          variantId,
          location: location as any,
          movementType: 'Purchase_Inward',
          quantity: finalQty,
          notes: notes || (inBoxes ? `${quantity} boxes × ${variant.sheetsPerBox} = ${finalQty} sheets` : null),
          createdBy: req.user?.id,
        },
      });
    });

    const updated = await prisma.stockLedger.findUnique({
      where: { variantId_location: { variantId, location: location as any } },
      include: { variant: true },
    });

    res.json({ data: updated, message: `+${finalQty} sheets added to ${location}` });
  } catch (error) {
    console.error('Purchase inward error:', error);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
});

// ── POST /transfer — move between Showroom ↔ Godown ─
router.post('/transfer', async (req, res) => {
  try {
    const { variantId, fromLocation, toLocation, quantity, notes } = req.body;

    if (!variantId || !fromLocation || !toLocation || !quantity) {
      return res.status(400).json({ error: 'variantId, fromLocation, toLocation, quantity required' });
    }
    if (fromLocation === toLocation) {
      return res.status(400).json({ error: 'Source and destination must be different' });
    }

    const qty = new Decimal(quantity);

    // Check available stock
    const source = await prisma.stockLedger.findUnique({
      where: { variantId_location: { variantId, location: fromLocation as any } },
    });
    if (!source || source.quantityOnHand.lessThan(qty)) {
      return res.status(400).json({ error: `Insufficient stock in ${fromLocation}. Available: ${source?.quantityOnHand || 0}` });
    }

    await prisma.$transaction(async (tx) => {
      // Deduct from source
      await tx.stockLedger.update({
        where: { variantId_location: { variantId, location: fromLocation as any } },
        data: { quantityOnHand: { decrement: qty } },
      });

      // Add to destination
      await tx.stockLedger.upsert({
        where: { variantId_location: { variantId, location: toLocation as any } },
        update: { quantityOnHand: { increment: qty } },
        create: { variantId, location: toLocation as any, quantityOnHand: qty },
      });

      // Log both movements
      await tx.stockMovement.createMany({
        data: [
          { variantId, location: fromLocation, movementType: 'Transfer_Out', quantity: qty.negated(), notes, createdBy: req.user?.id },
          { variantId, location: toLocation, movementType: 'Transfer_In', quantity: qty, notes, createdBy: req.user?.id },
        ],
      });
    });

    res.json({ success: true, message: `Transferred ${qty} from ${fromLocation} to ${toLocation}` });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Failed to transfer stock' });
  }
});

// ── GET /movements — history log ────────────────
router.get('/movements', async (req, res) => {
  try {
    const { variantId, location, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Number(limit));

    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (location) where.location = location;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { variant: true },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({ data: movements, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Movements error:', error);
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

// ── GET /low-stock ──────────────────────────────
router.get('/low-stock', async (_req, res) => {
  try {
    const ledgers = await prisma.$queryRaw`
      SELECT sl.*, pv.brand, pv.design_code, pv.design_name, pv.finish,
             pv.thickness_mm, pv.reorder_level, pv.unit
      FROM stock_ledgers sl
      JOIN product_variants pv ON sl.variant_id = pv.id
      WHERE pv.is_active = true
        AND sl.quantity_on_hand <= pv.reorder_level
      ORDER BY sl.quantity_on_hand ASC
    `;
    res.json({ data: ledgers });
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ error: 'Failed to fetch low-stock items' });
  }
});

export default router;
