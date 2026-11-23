// -------------------------------------------------
// Auto-incrementing document number generator
//
// Format:  DC-2627-001,  INV-2627-042,  EST-2627-003
//          ^^  ^^^^  ^^^
//          |   FY    sequence
//          prefix
// -------------------------------------------------

import { prisma } from './prisma';

/** Indian financial year: Apr 2026 → Mar 2027 = "2627" */
function currentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
}

const prefixMap: Record<string, string> = {
  Estimate: 'EST',
  Delivery_Challan: 'DC',
  Tax_Invoice: 'INV',
  Credit_Note_Return: 'CN',
};

/**
 * Get the next document number for a given transaction type.
 * Uses Prisma upsert for atomic increment.
 */
export async function nextDocumentNumber(
  transactionType: keyof typeof prefixMap,
): Promise<string> {
  const prefix = prefixMap[transactionType] || transactionType;
  const fy = currentFinancialYear();
  const seqId = `${prefix}-${fy}`;

  const seq = await prisma.sequence.upsert({
    where: { id: seqId },
    update: { lastNumber: { increment: 1 } },
    create: { id: seqId, prefix, financialYear: fy, lastNumber: 1 },
  });

  return `${prefix}-${fy}-${String(seq.lastNumber).padStart(3, '0')}`;
}
