// -------------------------------------------------
// Seed script — run with:  npm run db:seed
//
// Creates:
//   • 3 Users (Admin, Billing, Godown)
//   • 25 Laminate SKUs across 3 brands
//   • Stock entries for Showroom + Godown
//   • 5 Customers + 3 Carpenters/Architects
//   • 2 Sample unbilled challans
// -------------------------------------------------

import 'dotenv/config';
import { PrismaClient, ProductCategory, ProductUnit, StockLocation, PartyType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Lammart POS database...\n');

  // ── Users ─────────────────────────────────────
  const hash = await bcrypt.hash('admin123', 10);
  const billingHash = await bcrypt.hash('billing123', 10);
  const godownHash = await bcrypt.hash('godown123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: hash, displayName: 'Owner', role: UserRole.Admin_Owner },
  });
  await prisma.user.upsert({
    where: { username: 'billing' },
    update: {},
    create: { username: 'billing', passwordHash: billingHash, displayName: 'Counter Staff', role: UserRole.Billing_Counter },
  });
  await prisma.user.upsert({
    where: { username: 'godown' },
    update: {},
    create: { username: 'godown', passwordHash: godownHash, displayName: 'Godown Manager', role: UserRole.Godown_Manager },
  });
  console.log('  ✓ 3 users created (admin/admin123, billing/billing123, godown/godown123)');

  // ── Product Variants (25 laminates) ───────────
  const variants = [
    // Merino (9)
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '21094', designName: 'Frosty White',    finish: 'Matte',      thicknessMm: 1.0,  basePurchasePrice: 950,  defaultSellingPrice: 1450 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '21094', designName: 'Frosty White',    finish: 'High Gloss', thicknessMm: 0.8,  basePurchasePrice: 850,  defaultSellingPrice: 1300 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '44458', designName: 'Natural Walnut',  finish: 'Suede',      thicknessMm: 1.0,  basePurchasePrice: 1100, defaultSellingPrice: 1650 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '44458', designName: 'Natural Walnut',  finish: 'Matte',      thicknessMm: 0.8,  basePurchasePrice: 880,  defaultSellingPrice: 1350 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '21103', designName: 'Pear Wood',       finish: 'Textured',   thicknessMm: 1.0,  basePurchasePrice: 1050, defaultSellingPrice: 1550 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '22014', designName: 'Silver Grey',     finish: 'Matte',      thicknessMm: 1.0,  basePurchasePrice: 980,  defaultSellingPrice: 1500 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '21029', designName: 'Jet Black',       finish: 'Suede',      thicknessMm: 1.0,  basePurchasePrice: 1000, defaultSellingPrice: 1500 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '21001', designName: 'Snow White',      finish: 'High Gloss', thicknessMm: 0.8,  basePurchasePrice: 820,  defaultSellingPrice: 1250 },
    { brand: 'Merino', category: ProductCategory.Laminate, designCode: '21715', designName: 'Burma Teak',      finish: 'Matte',      thicknessMm: 1.25, basePurchasePrice: 1300, defaultSellingPrice: 1950 },

    // Greenlam (9)
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '101',  designName: 'Bright White',   finish: 'Matte',      thicknessMm: 0.8,  basePurchasePrice: 780,  defaultSellingPrice: 1200 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '101',  designName: 'Bright White',   finish: 'High Gloss', thicknessMm: 1.0,  basePurchasePrice: 950,  defaultSellingPrice: 1450 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '2302', designName: 'Dark Walnut',    finish: 'Suede',      thicknessMm: 1.0,  basePurchasePrice: 1080, defaultSellingPrice: 1600 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '2302', designName: 'Dark Walnut',    finish: 'Matte',      thicknessMm: 0.72, basePurchasePrice: 720,  defaultSellingPrice: 1100 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '1101', designName: 'Classic Oak',    finish: 'Textured',   thicknessMm: 1.0,  basePurchasePrice: 1000, defaultSellingPrice: 1500 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '9014', designName: 'Charcoal Grey',  finish: 'Matte',      thicknessMm: 1.0,  basePurchasePrice: 980,  defaultSellingPrice: 1480 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '3401', designName: 'Ivory Cream',    finish: 'High Gloss', thicknessMm: 0.8,  basePurchasePrice: 850,  defaultSellingPrice: 1300 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '7788', designName: 'Marble White',   finish: 'High Gloss', thicknessMm: 1.25, basePurchasePrice: 1350, defaultSellingPrice: 2000 },
    { brand: 'Greenlam', category: ProductCategory.Laminate, designCode: '5501', designName: 'Indian Rosewood',finish: 'Fluted',     thicknessMm: 1.0,  basePurchasePrice: 1200, defaultSellingPrice: 1800 },

    // Century (7)
    { brand: 'Century', category: ProductCategory.Laminate, designCode: '2644', designName: 'Sapeli Wood',    finish: 'Matte',      thicknessMm: 1.0,  basePurchasePrice: 920,  defaultSellingPrice: 1400 },
    { brand: 'Century', category: ProductCategory.Laminate, designCode: '2644', designName: 'Sapeli Wood',    finish: 'Suede',      thicknessMm: 1.25, basePurchasePrice: 1250, defaultSellingPrice: 1850 },
    { brand: 'Century', category: ProductCategory.Laminate, designCode: '1001', designName: 'Plain White',    finish: 'Matte',      thicknessMm: 0.8,  basePurchasePrice: 700,  defaultSellingPrice: 1050 },
    { brand: 'Century', category: ProductCategory.Laminate, designCode: '7709', designName: 'Grey Stone',     finish: 'Textured',   thicknessMm: 1.0,  basePurchasePrice: 980,  defaultSellingPrice: 1480 },
    { brand: 'Century', category: ProductCategory.Laminate, designCode: '3344', designName: 'Teak Premium',   finish: 'Matte',      thicknessMm: 1.0,  basePurchasePrice: 1050, defaultSellingPrice: 1550 },
    { brand: 'Century', category: ProductCategory.Laminate, designCode: '8891', designName: 'Black Cement',   finish: 'Matte',      thicknessMm: 1.0,  basePurchasePrice: 950,  defaultSellingPrice: 1420 },
    { brand: 'Century', category: ProductCategory.Laminate, designCode: '4455', designName: 'Sandy Oak',      finish: 'Suede',      thicknessMm: 1.0,  basePurchasePrice: 1000, defaultSellingPrice: 1500 },
  ];

  for (const v of variants) {
    const existing = await prisma.productVariant.findFirst({
      where: { brand: v.brand, designCode: v.designCode, finish: v.finish, thicknessMm: v.thicknessMm },
    });
    if (existing) continue;

    const created = await prisma.productVariant.create({
      data: {
        ...v,
        unit: ProductUnit.Sheet,
        sheetsPerBox: 10,
        hsnCode: '4823',
        gstRate: 18.0,
        size: '8x4 ft',
        reorderLevel: 5,
      },
    });

    // Seed stock in both locations
    const showroomQty = Math.floor(Math.random() * 15) + 2;  // 2–16 sheets
    const godownQty = Math.floor(Math.random() * 40) + 10;   // 10–49 sheets

    await prisma.stockLedger.createMany({
      data: [
        { variantId: created.id, location: StockLocation.Showroom, quantityOnHand: showroomQty },
        { variantId: created.id, location: StockLocation.Godown,   quantityOnHand: godownQty },
      ],
    });
  }
  console.log(`  ✓ ${variants.length} product variants with stock`);

  // ── Parties ───────────────────────────────────
  const parties = [
    // Customers
    { name: 'Ramesh Patel',               phone: '9876543210', partyType: PartyType.Retail_Customer, stateCode: '24', billingAddress: '12 MG Road, Ahmedabad, Gujarat 380001' },
    { name: 'Sunrise Interiors Pvt Ltd',   phone: '9876543211', partyType: PartyType.Contractor,     stateCode: '24', billingAddress: '45 Industrial Area, Ahmedabad', gstin: '24AACCS1234F1ZG' },
    { name: 'Vikram Shah',                 phone: '9876543212', partyType: PartyType.Retail_Customer, stateCode: '24', billingAddress: '78 Satellite Rd, Ahmedabad' },
    { name: 'Modern Living Solutions',     phone: '9876543213', partyType: PartyType.Contractor,     stateCode: '27', billingAddress: '23 Linking Rd, Mumbai', gstin: '27AABCM5678G1Z5' },
    { name: 'Priya Desai',                 phone: '9876543214', partyType: PartyType.Retail_Customer, stateCode: '24', billingAddress: '56 Law Garden, Ahmedabad' },
    // Carpenters / Architects
    { name: 'Suresh Kumar',    phone: '9876543220', partyType: PartyType.Carpenter,            defaultCommissionPercent: 5 },
    { name: 'Rajesh Sharma',   phone: '9876543221', partyType: PartyType.Carpenter,            defaultCommissionPercent: 4 },
    { name: 'Ar. Neha Mehta',  phone: '9876543222', partyType: PartyType.Architect_Designer,   defaultCommissionPercent: 3 },
  ];

  for (const p of parties) {
    await prisma.party.upsert({
      where: { phone: p.phone },
      update: {},
      create: p as any,
    });
  }
  console.log('  ✓ 5 customers + 3 carpenters/architects');

  // ── Sample Unbilled Challans ──────────────────
  const ramesh = await prisma.party.findUnique({ where: { phone: '9876543210' } });
  const sunrise = await prisma.party.findUnique({ where: { phone: '9876543211' } });
  const suresh = await prisma.party.findUnique({ where: { phone: '9876543220' } });
  const allVariants = await prisma.productVariant.findMany({ take: 5 });

  if (ramesh && allVariants.length >= 3) {
    const existing = await prisma.transaction.findFirst({ where: { documentNumber: 'DC-2627-001' } });
    if (!existing) {
      await prisma.transaction.create({
        data: {
          transactionType: 'Delivery_Challan',
          documentNumber: 'DC-2627-001',
          customerId: ramesh.id,
          referrerId: suresh?.id,
          status: 'Unbilled_Challan',
          dispatchFrom: 'Godown',
          transportDetails: 'Auto — GJ05AB1234',
          subtotal: 4500,
          totalCgst: 405, totalSgst: 405, totalIgst: 0,
          grandTotal: 5310,
          lineItems: {
            create: [
              { variantId: allVariants[0].id, quantity: 2, rate: 1450, discountPercent: 0, taxableAmount: 2900, cgst: 261, sgst: 261, igst: 0, total: 3422 },
              { variantId: allVariants[1].id, quantity: 1, rate: 1300, discountPercent: 0, taxableAmount: 1300, cgst: 117, sgst: 117, igst: 0, total: 1534 },
            ],
          },
        },
      });
      // Update sequence
      await prisma.sequence.upsert({
        where: { id: 'DC-2627' }, update: { lastNumber: 1 },
        create: { id: 'DC-2627', prefix: 'DC', financialYear: '2627', lastNumber: 1 },
      });
    }
  }

  if (sunrise && allVariants.length >= 5) {
    const existing = await prisma.transaction.findFirst({ where: { documentNumber: 'DC-2627-002' } });
    if (!existing) {
      await prisma.transaction.create({
        data: {
          transactionType: 'Delivery_Challan',
          documentNumber: 'DC-2627-002',
          customerId: sunrise.id,
          status: 'Unbilled_Challan',
          dispatchFrom: 'Showroom',
          transportDetails: 'Tempo — GJ01CD5678',
          subtotal: 7900,
          totalCgst: 711, totalSgst: 711, totalIgst: 0,
          grandTotal: 9322,
          lineItems: {
            create: [
              { variantId: allVariants[2].id, quantity: 3, rate: 1650, discountPercent: 5, taxableAmount: 4702.5, cgst: 423.23, sgst: 423.23, igst: 0, total: 5548.95 },
              { variantId: allVariants[3].id, quantity: 2, rate: 1350, discountPercent: 0, taxableAmount: 2700, cgst: 243, sgst: 243, igst: 0, total: 3186 },
            ],
          },
        },
      });
      await prisma.sequence.upsert({
        where: { id: 'DC-2627' }, update: { lastNumber: 2 },
        create: { id: 'DC-2627', prefix: 'DC', financialYear: '2627', lastNumber: 2 },
      });
    }
  }
  console.log('  ✓ 2 sample unbilled challans');

  console.log('\n✅  Seed complete!');
  console.log('    Logins:  admin/admin123  •  billing/billing123  •  godown/godown123\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
