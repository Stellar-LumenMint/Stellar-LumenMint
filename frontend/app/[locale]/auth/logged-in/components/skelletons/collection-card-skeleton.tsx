export const CollectionCardSkeleton = () => (
  <div className="rounded-lg border border-lumen-border bg-lumen-card overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-lumen-surface2" />
    <div className="p-4">
      <div className="w-32 h-6 bg-lumen-surface2 rounded mb-2" />
      <div className="w-full h-4 bg-lumen-surface2 rounded mb-4" />
      <div className="flex justify-between items-center mb-3">
        <div className="w-16 h-4 bg-lumen-surface2 rounded" />
        <div className="w-20 h-4 bg-lumen-surface2 rounded" />
      </div>
      <div className="flex justify-between items-center">
        <div className="w-24 h-4 bg-lumen-surface2 rounded" />
        <div className="w-8 h-8 bg-lumen-surface2 rounded-full" />
      </div>
    </div>
  </div>
)
