'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatINR, formatDate } from '@/lib/formatters';

interface PrintModalProps {
  transaction: any;
  onClose: () => void;
}

export default function PrintModal({ transaction, onClose }: PrintModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [layout, setLayout] = useState<'a4' | 'thermal'>('a4');
  const isOpen = Boolean(transaction);

  useEffect(() => {
    const element = dialog.current;
    const previous = window.document.activeElement;
    if (isOpen && element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!transaction || typeof window === 'undefined') return null;
  const isChallan = transaction.transactionType === 'Delivery_Challan';
  const isEstimate = transaction.transactionType === 'Estimate';
  const docTitle = isChallan ? 'DELIVERY CHALLAN' : isEstimate ? 'ESTIMATE / QUOTATION' : 'TAX INVOICE';

  const pageCss = layout === 'a4'
    ? '@page { size: A4; margin: 10mm; }'
    : '@page { size: auto; margin: 3mm; }';
  const a4 = (
    <article className="print-document p-6 text-gray-900">
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
          <table className="print-table w-full text-left text-sm border-collapse mb-6">
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
                    <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-600">{li.variant?.hsnCode || '—'}</td>
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
          <div className="print-keep flex justify-between items-start border-t-2 border-gray-800 pt-4">
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
                  <span>CGST:</span>
                  <span className="font-mono">{formatINR(transaction.totalCgst)}</span>
                </div>
              )}
              {!isChallan && Number(transaction.totalSgst) > 0 && (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>SGST:</span>
                  <span className="font-mono">{formatINR(transaction.totalSgst)}</span>
                </div>
              )}
              {!isChallan && Number(transaction.totalIgst) > 0 && (
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>IGST:</span>
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
          <div className="print-keep flex justify-between items-end mt-16 pt-8 border-t border-dashed border-gray-300 text-xs text-gray-600">
            <div>
              <div className="border-t border-gray-400 w-48 mb-1"></div>
              <span>Receiver&apos;s Signature</span>
            </div>
            <div className="text-right">
              <div className="border-t border-gray-400 w-48 mb-1 ml-auto"></div>
              <span>For LAMMART LAMINATES (Authorized Signatory)</span>
            </div>
          </div>
    </article>
  );
  const receipt = (
    <article className="print-document thermal-document mx-auto space-y-2 p-2 font-mono text-xs tabular-nums">
      <h2 className="text-sm font-bold">LAMMART</h2>
      <p>{docTitle} • {transaction.documentNumber}</p>
      <p>{formatDate(transaction.date)} • {transaction.customer?.name}</p>
      <ol className="space-y-2 border-y border-current py-2">
        {transaction.lineItems?.map((li: any, index: number) => (
          <li key={li.id ?? index} className="print-keep">
            <p className="break-words font-semibold">{li.variant?.brand} {li.variant?.designCode} {li.variant?.designName}</p>
            <p>HSN: {li.variant?.hsnCode || '—'}</p>
            <p className="flex justify-between gap-2"><span>{li.quantity} × {formatINR(li.rate)}</span><strong>{formatINR(li.total)}</strong></p>
            {Number(li.discountPercent) > 0 && <p>Discount: {li.discountPercent}%</p>}
          </li>
        ))}
      </ol>
      <div className="print-keep">
        {!isChallan && <>
          <p>Taxable: {formatINR(transaction.subtotal)}</p>
          {Number(transaction.totalCgst) > 0 && <p>CGST: {formatINR(transaction.totalCgst)}</p>}
          {Number(transaction.totalSgst) > 0 && <p>SGST: {formatINR(transaction.totalSgst)}</p>}
          {Number(transaction.totalIgst) > 0 && <p>IGST: {formatINR(transaction.totalIgst)}</p>}
        </>}
        <p className="border-t border-current pt-1 font-bold">Total: {formatINR(transaction.grandTotal)}</p>
        {transaction.transactionType === 'Tax_Invoice' && <p>Receipt copy • Full tax invoice available</p>}
      </div>
    </article>
  );

  return createPortal(
    <>
      <dialog ref={dialog} aria-labelledby="print-preview-title"
        onCancel={(event) => { event.preventDefault(); onClose(); }}
        className="no-print max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-lg bg-surface text-text p-0 border border-border shadow-pop backdrop:bg-black/40 backdrop:backdrop-blur-sm">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface p-4">
          <h2 id="print-preview-title" className="font-serif text-lg font-normal text-text">{docTitle} preview</h2>
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-muted flex items-center gap-1.5">
              <span>Paper format</span>
              <select className="h-8 rounded-md border border-border bg-surface-sunken px-2 text-xs text-text focus-visible:ring-2 focus-visible:ring-accent/40" value={layout} onChange={(event) => setLayout(event.target.value === 'thermal' ? 'thermal' : 'a4')}>
                <option value="a4">A4 document</option>
                <option value="thermal">80 mm receipt copy</option>
              </select>
            </label>
            <button type="button" onClick={() => window.print()} className="h-8 rounded-md bg-accent px-3.5 text-xs font-medium text-white hover:bg-accent-hover transition duration-150">Print document</button>
            <button type="button" onClick={onClose} aria-label="Close print preview" title="Close print preview" className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-sunken transition duration-150"><X aria-hidden="true" className="h-4 w-4 stroke-[1.5]" /></button>
          </div>
        </div>
        <div className="overflow-x-auto bg-surface">{layout === 'a4' ? a4 : receipt}</div>
      </dialog>
      <div className="print-copy" aria-hidden="true"><style>{pageCss}</style>{layout === 'a4' ? a4 : receipt}</div>
    </>, window.document.body,
  );
}
