'use client';

import * as React from 'react';
import { MapPin, Truck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Pincode } from '@lammart/shared';
import { checkPincode } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { Button } from '@/components/ui/button';

export function PincodeWidget({ isHeavy }: { isHeavy?: boolean }) {
  const [pincode, setPincode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Pincode | null | undefined>(undefined);
  const [error, setError] = React.useState('');

  const handleCheck = React.useCallback(async (pinToCheck?: string) => {
    const pin = pinToCheck || pincode;
    setError('');

    if (!pin || !/^\d{6}$/.test(pin.trim())) {
      setError('Please enter a valid 6-digit Indian PIN code');
      setResult(undefined);
      return;
    }

    setLoading(true);
    try {
      const data = await checkPincode(pin.trim());
      setResult(data);
      if (data && data.isServiceable) {
        localStorage.setItem('lammart_pincode', pin.trim());
      }
    } catch (err: any) {
      setError(err?.message || 'Error verifying pincode');
      setResult(undefined);
    } finally {
      setLoading(false);
    }
  }, [pincode]);

  // Load saved pincode from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('lammart_pincode');
      if (saved && /^\d{6}$/.test(saved)) {
        setPincode(saved);
        handleCheck(saved);
      }
    } catch {
      // Ignore
    }
  }, [handleCheck]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3.5 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900">
        <MapPin className="h-4 w-4 text-emerald-600" />
        <span>Check Site Delivery &amp; Transit Time</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setPincode(val);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCheck();
            }
          }}
          placeholder="Enter 6-digit PIN code (e.g. 380001)"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-mono font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <Button
          type="button"
          size="sm"
          disabled={loading || pincode.length !== 6}
          onClick={() => handleCheck()}
          className="text-xs px-4 h-9"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Check'}
        </Button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* Results Display */}
      {result !== undefined && (
        <div className="pt-2 border-t border-zinc-100 text-xs space-y-2">
          {result && result.isServiceable ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-emerald-800 font-semibold bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p>
                    Direct site crated delivery serviceable to{' '}
                    <strong>
                      {result.city}, {result.state} ({result.pincode})
                    </strong>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                    Estimated delivery timeline: <strong>{result.deliveryDays} business days</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-zinc-400" />
                  <span>
                    Base Freight:{' '}
                    <strong className="text-zinc-900">
                      {result.baseCharge === 0 ? 'FREE' : formatPrice(result.baseCharge)}
                    </strong>
                  </span>
                </div>
                <div>
                  Payment: <strong>{result.codAllowed ? 'COD & Online' : 'Prepaid Only'}</strong>
                </div>
              </div>

              <p className="text-[10px] text-zinc-400">
                Orders above ₹5,000 without heavy freight qualify for complimentary shipping.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <XCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Direct courier delivery currently unavailable for this pincode</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  We frequently arrange dedicated truckload logistics. Please contact our dispatch desk on WhatsApp (+91 98765 43210) for custom transport quotes.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
