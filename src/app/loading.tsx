export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-16 sm:px-6 lg:px-8" role="status" aria-label="Loading">
      <div className="h-14 w-2/3 max-w-xl rounded-xl bg-panel" />
      <div className="mt-6 h-5 w-1/2 max-w-md rounded bg-panel" />
      <div className="mt-10 grid grid-cols-7 gap-2 sm:max-w-lg">
        {Array.from({ length: 21 }, (_, i) => (
          <div key={i} className="aspect-square rounded-full bg-panel" />
        ))}
      </div>
    </div>
  );
}
