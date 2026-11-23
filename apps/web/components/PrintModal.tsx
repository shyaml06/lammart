'use client';

import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatINR, formatDate } from '@/lib/formatters';

interface PrintModalProps {
  transaction: any;
  onClose: () => void;
}

export default function PrintModal({ transaction, onClose }: PrintModalProps) {
  if (!transaction) return null;

  const isChallan = transaction.transactionType === 'Delivery_Challan';
  const isEstimate = transaction.transactionType === 'Estimate';
  const docTitle = isChallan
    ? 'DELIVERY CHALLAN'
    : isEstimate
    ? 'ESTIMATE / QUOTATION'
    : 'TAX INVOICE';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-800">
              {docTitle} Created: <span className="font-mono text-emerald-700">{transaction.documentNumber}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-[#0B7A55] hover:bg-[#086143] text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto text-gray-900 font-sans print:p-0">
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#0B7A55] uppercase">LAMMART LAMINATES & HARDWARE</h1>
                <p className="text-sm text-gray-600 mt-1">104-106, Plywood Market, S.G. Highway, Ahmedabad - 380054</p>
                <p className="text-xs text-gray-500">Phone: +91 98765 43210 | Email: sales@lammart.in</p>
                <p className="text-xs font-semibold text-gray-700 mt-1">GSTIN: 24AAACL1234D1Z8 | State: 24-Gujarat</p>
              </div>
              <div className="text-right">
                <div className="inline-block bg-gray-900 text-white font-bold text-sm px-3 py-1 rounded">
                  {docTitle}
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Doc No:</span>{' '}
                  <span className="font-mono font-bold text-gray-900">{transaction.documentNumber}</span>
                </div>
                <div className="text-xs text-gray-600">
                  <span className="text-gray-500">Date:</span> {formatDate(transaction.date)}
                </div>
                {transaction.dispatchFrom && (
                  <div className="text-xs font-medium text-emerald-700 mt-1">
                    Dispatched from: {transaction.dispatchFrom}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Party Details */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-sm">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer / Consignee</div>
              <div className="font-bold text-gray-900 text-base">{transaction.customer?.name}</div>
              <div className="text-gray-600">{transaction.customer?.billingAddress || 'Local Customer'}</div>
              <div className="text-gray-600">Phone: {transaction.customer?.phone}</div>
              {transaction.customer?.gstin && (
                <div className="font-mono text-xs text-gray-700 font-semibold mt-1">
                  GSTIN: {transaction.customer?.gstin}
                </div>
              )}
            </div>
            <div className="border-l border-gray-200 pl-6">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transport & Reference</div>
              <div className="text-gray-700">
                <span className="text-gray-500">Vehicle / Transport:</span> {transaction.transportDetails || 'Direct Counter'}
              </div>
              {transaction.referrer && (
                <div className="text-gray-700 mt-1">
                  <span className="text-gray-500">Carpenter / Architect:</span> {transaction.referrer?.name} ({transaction.referrer?.phone})
                </div>
              )}
              {transaction.notes && (
                <div className="text-xs text-gray-500 mt-2 italic">Notes: {transaction.notes}</div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-gray-800 bg-gray-100 text-gray-800 text-xs uppercase font-bold">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Item Description (Brand + Shade + Finish + Size)</th>
                <th className="py-2 px-3 text-center">HSN</th>
                <th className="py-2 px-3 text-right">Qty</th>
                <th className="py-2 px-3 text-right">Rate</th>
                <th className="py-2 px-3 text-right">Disc %</th>
                {!isChallan && <th className="py-2 px-3 text-right">Taxable</th>}
                {!isChallan && <th className="py-2 px-3 text-right">GST</th>}
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transaction.lineItems?.map((li: any, idx: number) => {
                const desc = li.variant
                  ? `${li.variant.brand} ${li.variant.designCode} - ${li.variant.designName} (${li.variant.finish}, ${li.variant.thicknessMm}mm, ${li.variant.size})`
                  : 'Laminate Sheet';
                const gstTotal = Number(li.cgst || 0) + Number(li.sgst || 0) + Number(li.igst || 0);

                return (
                  <tr key={li.id || idx} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{desc}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-600">{li.variant?.hsnCode || '4823'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">{li.quantity} {li.variant?.unit || 'Sheets'}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatINR(li.rate)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-600">{li.discountPercent ? `${li.discountPercent}%` : '-'}</td>
                    {!isChallan && <td className="py-2.5 px-3 text-right font-mono">{formatINR(li.taxableAmount)}</td>}
                    {!isChallan && <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-600">{formatINR(gstTotal)}</td>}
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-gray-900">{formatINR(li.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary / Tax Split */}
          <div className="flex justify-between items-start border-t-2 border-gray-800 pt-4">
            <div className="max-w-md text-xs text-gray-500 space-y-1">
              <p className="font-bold text-gray-700">Terms & Conditions:</p>
              <p>1. Goods once sold will not be taken back without original challan.</p>
              <p>2. Subject to Ahmedabad jurisdiction only.</p>
              <p>3. This is a computer generated document.</p>
            </div>
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Taxable):</span>
                <span className="font-mono font-medium">{formatINR(transaction.subtotal)}</span>
              </div>
              {!isChallan && Number(transaction.totalCgst) > 0 && (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>CGST (9%):</span>
                  <span className="font-mono">{formatINR(transaction.totalCgst)}</span>
                </div>
              )}
              {!isChallan && Number(transaction.totalSgst) > 0 && (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>SGST (9%):</span>
                  <span className="font-mono">{formatINR(transaction.totalSgst)}</span>
                </div>
              )}
              {!isChallan && Number(transaction.totalIgst) > 0 && (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>IGST (18%):</span>
                  <span className="font-mono">{formatINR(transaction.totalIgst)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-800">{formatINR(transaction.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end mt-16 pt-8 border-t border-dashed border-gray-300 text-xs text-gray-600">
            <div>
              <div className="border-t border-gray-400 w-48 mb-1"></div>
              <span>Receiver's Signature</span>
            </div>
            <div className="text-right">
              <div className="border-t border-gray-400 w-48 mb-1 ml-auto"></div>
              <span>For LAMMART LAMINATES (Authorized Signatory)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
