import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">Cette page n&apos;existe pas.</h1>
      <p className="mt-3 text-muted">L&apos;événement a peut-être été retiré ou son adresse a changé.</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-button bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
      >
        Voir tous les événements
      </Link>
    </div>
  );
}
