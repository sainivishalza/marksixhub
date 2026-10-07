export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading">
      <div className="h-9 w-56 rounded-lg bg-panel" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-panel" />)}
      </div>
      <div className="h-72 rounded-2xl bg-panel" />
    </div>
  );
}
