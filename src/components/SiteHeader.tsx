import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <Logo className="size-7 text-brand" />
          <span className="text-lg">TechRadar</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="rounded-button px-3 py-2 hover:bg-brand-soft hover:text-brand-deep">
            Découvrir
          </Link>
        </nav>
      </div>
    </header>
  );
}
