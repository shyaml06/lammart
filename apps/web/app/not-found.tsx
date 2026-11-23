import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold">We couldn’t find that page</h1>
      <p className="mt-3 text-[#5B6660]">The listing may have moved or been removed.</p>
      <Link href="/search" className="mt-6 inline-flex rounded-xl bg-[#0B7A55] px-5 py-3 font-semibold text-white">Back to catalog</Link>
    </section>
  );
}
