// -------------------------------------------------
// Reports & Dashboard
//   GET /dashboard    — overview stats
//   GET /commissions  — commission ledger
//   PATCH /commissions/:id/pay — mark commission paid
//   GET /payments     — payment history
//   POST /payments    — record a payment
// -------------------------------------------------

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ── Dashboard stats ─────────────────────────────
router.get('/dashboard', async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalVariants, totalParties, unbilledChallans, todaySales,
           pendingCommissions, lowStockCount] = await Promise.all([
      prisma.productVariant.count({ where: { isActive: true } }),
      prisma.party.count(),
      prisma.transaction.count({ where: { transactionType: 'Delivery_Challan', status: 'Unbilled_Challan' } }),
      prisma.transaction.aggregate({
        where: { transactionType: 'Tax_Invoice', status: 'Billed', date: { gte: today } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.commissionEntry.aggregate({
        where: { status: 'Pending' },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM stock_ledgers sl
        JOIN product_variants pv ON sl.variant_id = pv.id
        WHERE pv.is_active = true AND sl.quantity_on_hand <= pv.reorder_level
      `,
    ]);

    res.json({
      data: {
        totalVariants,
        totalParties,
        unbilledChallans,
        todaySalesAmount: todaySales._sum.grandTotal || 0,
        todaySalesCount: todaySales._count,
        pendingCommissionAmount: pendingCommissions._sum.commissionAmount || 0,
        pendingCommissionCount: pendingCommissions._count,
        lowStockCount: Number(lowStockCount[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ── Commissions ─────────────────────────────────

router.get('/commissions', async (req, res) => {
  try {
    const { referrerId, status, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (referrerId) where.referrerId = referrerId;
    if (status) where.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));

    const [entries, total] = await Promise.all([
      prisma.commissionEntry.findMany({
        where,
        include: { referrer: true, transaction: { select: { documentNumber: true, date: true, grandTotal: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.commissionEntry.count({ where }),
    ]);

    res.json({ data: entries, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Commissions error:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

router.patch('/commissions/:id/pay', async (req, res) => {
  try {
    const id = req.params.id as string;
    const entry = await prisma.commissionEntry.update({
      where: { id },
      data: { status: 'Paid', paidAt: new Date(), payoutNotes: req.body.payoutNotes || null },
    });
    res.json({ data: entry });
  } catch (error) {
    console.error('Pay commission error:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// ── Payments ────────────────────────────────────

router.get('/payments', async (req, res) => {
  try {
    const { partyId, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (partyId) where.partyId = partyId;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { party: true, transaction: { select: { documentNumber: true } } },
        orderBy: { date: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ data: payments, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/payments', async (req, res) => {
  try {
    const { partyId, transactionId, amount, paymentMode, referenceNumber, notes } = req.body;

    if (!partyId || !amount || !paymentMode) {
      return res.status(400).json({ error: 'partyId, amount, paymentMode required' });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          partyId,
          transactionId: transactionId || null,
          amount: Number(amount),
          paymentMode: paymentMode as any,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        },
        include: { party: true },
      });

      // Update party balance (reduce receivable)
      await tx.party.update({
        where: { id: partyId },
        data: { currentBalance: { decrement: Number(amount) } },
      });

      // If linked to a transaction, check if fully paid
      if (transactionId) {
        const totalPaid = await tx.payment.aggregate({
          where: { transactionId },
          _sum: { amount: true },
        });
        const txn = await tx.transaction.findUnique({ where: { id: transactionId } });
        if (txn) {
          const paid = totalPaid._sum.amount || 0;
          const paymentStatus = Number(paid) >= Number(txn.grandTotal) ? 'Paid' : 'Partial';
          await tx.transaction.update({ where: { id: transactionId }, data: { paymentStatus: paymentStatus as any } });
        }
      }

      return p;
    });

    res.status(201).json({ data: payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

export default router;
