import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (val: [number, number]) => void;
  className?: string;
}

export function Slider({
  min,
  max,
  step = 100,
  value,
  onValueChange,
  className,
}: SliderProps) {
  const [minVal, maxVal] = value;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), maxVal - step);
    onValueChange([val, maxVal]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), minVal + step);
    onValueChange([minVal, val]);
  };

  return (
    <div className={cn('relative w-full py-2 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label className="text-[10px] text-zinc-400 uppercase font-semibold">Min (₹)</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={minVal}
            onChange={handleMinChange}
            className="w-full text-xs font-semibold px-2 py-1 border border-zinc-200 rounded focus:outline-none focus:border-emerald-500"
          />
        </div>
        <span className="text-zinc-400 mt-3">–</span>
        <div className="flex-1">
          <label className="text-[10px] text-zinc-400 uppercase font-semibold">Max (₹)</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={maxVal}
            onChange={handleMaxChange}
            className="w-full text-xs font-semibold px-2 py-1 border border-zinc-200 rounded focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
