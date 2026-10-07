import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-gold-bright">404</p>
      <h1 className="mt-2 text-4xl">That page does not exist</h1>
      <p className="mt-3 text-mute">The link may be old or mistyped. Try the number picker or the latest results.</p>
      <p className="mt-6 flex justify-center gap-4">
        <Link href="/picker" className="text-gold-bright underline-offset-4 hover:underline">Number picker</Link>
        <Link href="/results" className="text-gold-bright underline-offset-4 hover:underline">Results</Link>
      </p>
    </div>
  );
}
