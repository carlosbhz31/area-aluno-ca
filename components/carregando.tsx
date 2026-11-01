/** Esqueleto mostrado na hora da troca de página, enquanto os dados chegam. */
export function Carregando({ largo = false }: { largo?: boolean }) {
  return (
    <div className={`mx-auto w-full animate-pulse space-y-4 pt-2 ${largo ? "max-w-6xl" : "max-w-xl"}`} aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-40 rounded-lg bg-borda" />
      <div className="h-36 rounded-2xl bg-borda/70" />
      <div className="h-24 rounded-2xl bg-borda/60" />
      <div className="h-24 rounded-2xl bg-borda/50" />
    </div>
  );
}
