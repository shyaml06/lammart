// -------------------------------------------------
// Party management — CRUD for Customers, Carpenters,
// Architects, Contractors, Suppliers
// -------------------------------------------------

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /parties?type=Carpenter&q=search
router.get('/', async (req, res) => {
  try {
    const { type, q, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (type) where.partyType = type as string;
    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { phone: { contains: q as string } },
      ];
    }

    const [parties, total] = await Promise.all([
      prisma.party.findMany({ where, orderBy: { name: 'asc' }, skip, take: limitNum }),
      prisma.party.count({ where }),
    ]);

    res.json({ data: parties, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Parties list error:', error);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

// GET /parties/:id — with recent transactions
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const party = await prisma.party.findUnique({ where: { id } });
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const transactions = await prisma.transaction.findMany({
      where: { customerId: party.id },
      orderBy: { date: 'desc' },
      take: 20,
      include: { lineItems: true },
    });

    res.json({ data: { ...party, recentTransactions: transactions } });
  } catch (error) {
    console.error('Party fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch party' });
  }
});

// POST /parties
router.post('/', async (req, res) => {
  try {
    const { name, phone, partyType, gstin, billingAddress, stateCode,
            creditLimit, defaultCommissionPercent } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const party = await prisma.party.create({
      data: {
        name, phone,
        partyType: partyType || 'Retail_Customer',
        gstin: gstin || null,
        billingAddress: billingAddress || null,
        stateCode: stateCode || '24',
        creditLimit: creditLimit || 0,
        defaultCommissionPercent: defaultCommissionPercent || 0,
      },
    });

    res.status(201).json({ data: party });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Phone number already exists' });
    console.error('Create party error:', error);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// PUT /parties/:id
router.put('/:id', async (req, res) => {
  try {
    const data: any = {};
    for (const f of ['name', 'phone', 'partyType', 'gstin', 'billingAddress', 'stateCode']) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    if (req.body.creditLimit !== undefined) data.creditLimit = Number(req.body.creditLimit);
    if (req.body.defaultCommissionPercent !== undefined)
      data.defaultCommissionPercent = Number(req.body.defaultCommissionPercent);

    const id = req.params.id as string;
    const party = await prisma.party.update({ where: { id }, data });
    res.json({ data: party });
  } catch (error) {
    console.error('Update party error:', error);
    res.status(500).json({ error: 'Failed to update party' });
  }
});

export default router;
