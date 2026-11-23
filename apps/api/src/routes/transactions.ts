// -------------------------------------------------
// Transactions — Estimates, Delivery Challans,
// Tax Invoices, Credit Notes
//
// Key flows:
//   POST   /                — create new transaction
//   GET    /                — list with filters
//   GET    /:id             — single transaction
//   POST   /convert-challan — merge challans → invoice
//   PATCH  /:id/cancel      — cancel a transaction
// -------------------------------------------------

import { Router } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { nextDocumentNumber } from '../lib/documents';
import { calculateGst, taxableAfterDiscount, round2 } from '../lib/gst';

const router = Router();
router.use(requireAuth);

// ── Types for request body ──────────────────────
interface LineItemInput {
  variantId: string;
  quantity: number;
  rate: number;
  discountPercent?: number;
}

// ── Helpers ─────────────────────────────────────

/** Compute all tax fields for a line item */
async function computeLineItem(item: LineItemInput, customerStateCode: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
  if (!variant) throw new Error(`Variant ${item.variantId} not found`);

  const qty = new Decimal(item.quantity);
  const rate = new Decimal(item.rate);
  const disc = new Decimal(item.discountPercent || 0);

  const taxable = taxableAfterDiscount(qty, rate, disc);
  const gst = calculateGst(taxable, variant.gstRate, customerStateCode);
  const total = round2(taxable.add(gst.cgst).add(gst.sgst).add(gst.igst));

  return {
    variantId: item.variantId,
    quantity: qty,
    rate,
    discountPercent: disc,
    taxableAmount: taxable,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    total,
  };
}

/** Deduct stock from a location and log the movement */
async function deductStock(
  variantId: string,
  location: string,
  qty: Decimal,
  movementType: string,
  referenceId: string,
  userId?: string,
) {
  // Update stock ledger
  await prisma.stockLedger.updateMany({
    where: { variantId, location: location as any },
    data: { quantityOnHand: { decrement: qty } },
  });

  // Log immutable movement
  await prisma.stockMovement.create({
    data: {
      variantId,
      location: location as any,
      movementType: movementType as any,
      quantity: qty.negated(), // negative = outward
      referenceType: 'Transaction',
      referenceId,
      createdBy: userId,
    },
  });
}

// ── POST / — create transaction ─────────────────
router.post('/', async (req, res) => {
  try {
    const { transactionType, customerId, referrerId, dispatchFrom,
            transportDetails, notes, lineItems } = req.body as {
      transactionType: string;
      customerId: string;
      referrerId?: string;
      dispatchFrom?: string;
      transportDetails?: string;
      notes?: string;
      lineItems: LineItemInput[];
    };

    if (!transactionType || !customerId || !lineItems?.length) {
      return res.status(400).json({ error: 'transactionType, customerId, and lineItems are required' });
    }

    // Look up customer for GST state
    const customer = await prisma.party.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(400).json({ error: 'Customer not found' });

    // Compute all line items
    const computed = await Promise.all(
      lineItems.map((li) => computeLineItem(li, customer.stateCode)),
    );

    // Totals
    const subtotal = computed.reduce((s, li) => s.add(li.taxableAmount), new Decimal(0));
    const totalCgst = computed.reduce((s, li) => s.add(li.cgst), new Decimal(0));
    const totalSgst = computed.reduce((s, li) => s.add(li.sgst), new Decimal(0));
    const totalIgst = computed.reduce((s, li) => s.add(li.igst), new Decimal(0));
    const grandTotal = computed.reduce((s, li) => s.add(li.total), new Decimal(0));

    // Determine initial status
    let status: string;
    if (transactionType === 'Estimate') status = 'Draft';
    else if (transactionType === 'Delivery_Challan') status = 'Unbilled_Challan';
    else status = 'Billed';

    const docNumber = await nextDocumentNumber(transactionType as any);

    // Create transaction + line items in a single DB transaction
    const txn = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          transactionType: transactionType as any,
          documentNumber: docNumber,
          customerId,
          referrerId: referrerId || null,
          status: status as any,
          dispatchFrom: dispatchFrom as any || null,
          transportDetails: transportDetails || null,
          notes: notes || null,
          subtotal: round2(subtotal),
          totalCgst: round2(totalCgst),
          totalSgst: round2(totalSgst),
          totalIgst: round2(totalIgst),
          grandTotal: round2(grandTotal),
          lineItems: {
            create: computed,
          },
        },
        include: { lineItems: { include: { variant: true } }, customer: true, referrer: true },
      });

      // Deduct stock for Challans and Invoices (not Estimates)
      if (transactionType !== 'Estimate' && dispatchFrom) {
        for (const li of computed) {
          await deductStock(
            li.variantId,
            dispatchFrom,
            li.quantity,
            transactionType === 'Delivery_Challan' ? 'Challan_Dispatch' : 'Sale_Outward',
            transaction.id,
            req.user?.id,
          );
        }
      }

      // Create commission entry if referrer is tagged on an Invoice
      if (referrerId && transactionType === 'Tax_Invoice') {
        const referrer = await tx.party.findUnique({ where: { id: referrerId } });
        if (referrer && referrer.defaultCommissionPercent.greaterThan(0)) {
          const commAmt = round2(subtotal.mul(referrer.defaultCommissionPercent).div(100));
          await tx.commissionEntry.create({
            data: {
              referrerId,
              transactionId: transaction.id,
              eligibleAmount: round2(subtotal),
              commissionPercent: referrer.defaultCommissionPercent,
              commissionAmount: commAmt,
            },
          });
        }
      }

      return transaction;
    });

    res.status(201).json({ data: txn });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// ── GET / — list transactions ───────────────────
router.get('/', async (req, res) => {
  try {
    const { type, status, customerId, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (type) where.transactionType = type;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { customer: true, referrer: true, lineItems: true },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ data: transactions, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Transactions list error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ── GET /:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const txn = await prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        referrer: true,
        lineItems: { include: { variant: true } },
        commissions: true,
        payments: true,
        asChallans: { include: { invoice: true } },
        asInvoices: { include: { challan: true } },
      },
    });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ data: txn });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// ── POST /convert-challan — merge challans into invoice ──
router.post('/convert-challan', async (req, res) => {
  try {
    const { challanIds, transportDetails, notes } = req.body as {
      challanIds: string[];
      transportDetails?: string;
      notes?: string;
    };

    if (!challanIds?.length) {
      return res.status(400).json({ error: 'At least one challan ID required' });
    }

    // Fetch all challans
    const challans = await prisma.transaction.findMany({
      where: { id: { in: challanIds }, transactionType: 'Delivery_Challan' },
      include: { lineItems: { include: { variant: true } }, customer: true },
    });

    if (challans.length !== challanIds.length) {
      return res.status(400).json({ error: 'Some challans not found or not of type Delivery_Challan' });
    }

    // All challans must be for the same customer
    const customerIds = new Set(challans.map((c) => c.customerId));
    if (customerIds.size > 1) {
      return res.status(400).json({ error: 'All challans must belong to the same customer' });
    }

    const customer = challans[0].customer;
    const referrerId = challans[0].referrerId; // use first challan's referrer

    // Merge all line items and recompute tax
    const allLineItems = challans.flatMap((c) =>
      c.lineItems.map((li) => ({
        variantId: li.variantId,
        quantity: Number(li.quantity),
        rate: Number(li.rate),
        discountPercent: Number(li.discountPercent),
      })),
    );

    const computed = await Promise.all(
      allLineItems.map((li) => computeLineItem(li, customer.stateCode)),
    );

    const subtotal = computed.reduce((s, li) => s.add(li.taxableAmount), new Decimal(0));
    const totalCgst = computed.reduce((s, li) => s.add(li.cgst), new Decimal(0));
    const totalSgst = computed.reduce((s, li) => s.add(li.sgst), new Decimal(0));
    const totalIgst = computed.reduce((s, li) => s.add(li.igst), new Decimal(0));
    const grandTotal = computed.reduce((s, li) => s.add(li.total), new Decimal(0));

    const docNumber = await nextDocumentNumber('Tax_Invoice');

    const invoice = await prisma.$transaction(async (tx) => {
      // Create the invoice (NO stock deduction — already done by challan)
      const inv = await tx.transaction.create({
        data: {
          transactionType: 'Tax_Invoice',
          documentNumber: docNumber,
          customerId: customer.id,
          referrerId,
          status: 'Billed',
          transportDetails: transportDetails || null,
          notes: notes || null,
          subtotal: round2(subtotal),
          totalCgst: round2(totalCgst),
          totalSgst: round2(totalSgst),
          totalIgst: round2(totalIgst),
          grandTotal: round2(grandTotal),
          lineItems: { create: computed },
        },
        include: { lineItems: { include: { variant: true } }, customer: true },
      });

      // Link challans → invoice and update their status
      for (const c of challans) {
        await tx.challanInvoiceLink.create({
          data: { challanId: c.id, invoiceId: inv.id },
        });
        await tx.transaction.update({
          where: { id: c.id },
          data: { status: 'Billed' },
        });
      }

      // Commission
      if (referrerId) {
        const referrer = await tx.party.findUnique({ where: { id: referrerId } });
        if (referrer && referrer.defaultCommissionPercent.greaterThan(0)) {
          await tx.commissionEntry.create({
            data: {
              referrerId,
              transactionId: inv.id,
              eligibleAmount: round2(subtotal),
              commissionPercent: referrer.defaultCommissionPercent,
              commissionAmount: round2(subtotal.mul(referrer.defaultCommissionPercent).div(100)),
            },
          });
        }
      }

      return inv;
    });

    res.status(201).json({ data: invoice });
  } catch (error) {
    console.error('Convert challan error:', error);
    res.status(500).json({ error: 'Failed to convert challans to invoice' });
  }
});

// ── PATCH /:id/cancel ───────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    const id = req.params.id as string;
    const txn = await prisma.transaction.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status === 'Cancelled') return res.status(400).json({ error: 'Already cancelled' });

    await prisma.$transaction(async (tx) => {
      // Reverse stock if it was deducted
      if (['Delivery_Challan', 'Tax_Invoice'].includes(txn.transactionType) && txn.dispatchFrom) {
        for (const li of txn.lineItems) {
          await tx.stockLedger.updateMany({
            where: { variantId: li.variantId, location: txn.dispatchFrom as any },
            data: { quantityOnHand: { increment: li.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              variantId: li.variantId,
              location: txn.dispatchFrom as any,
              movementType: 'Challan_Return',
              quantity: li.quantity, // positive = inward
              referenceType: 'Transaction',
              referenceId: txn.id,
              notes: 'Auto-reversal on cancel',
              createdBy: req.user?.id,
            },
          });
        }
      }

      await tx.transaction.update({
        where: { id: txn.id },
        data: { status: 'Cancelled' },
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ error: 'Failed to cancel transaction' });
  }
});

export default router;
