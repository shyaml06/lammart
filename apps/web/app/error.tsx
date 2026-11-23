'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold">This page is temporarily unavailable</h1>
      <p className="mt-3 text-[#5B6660]">Try again, or send us a material enquiry.</p>
      <div className="mt-6 flex flex-wrap gap-4">
        <button type="button" onClick={reset} className="rounded-xl bg-[#0B7A55] px-5 py-3 font-semibold text-white">Try again</button>
        <Link href="/contact" className="rounded-xl border border-[#D9D3C7] px-5 py-3 font-semibold">Contact us</Link>
      </div>
    </section>
  );
}
