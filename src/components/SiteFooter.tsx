export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
        <p>Chaque fiche renvoie vers la page officielle de l&apos;événement.</p>
        <p>TechRadar France, {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
