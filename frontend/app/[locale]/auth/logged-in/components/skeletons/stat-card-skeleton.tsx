export const StatCardSkeleton = () => (
  <div className="bg-lumen-card border border-lumen-border rounded-lg p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-8 h-8 bg-lumen-surface2 rounded-md" />
      <div className="w-12 h-4 bg-lumen-surface2 rounded" />
    </div>
    <div className="w-16 h-8 bg-lumen-surface2 rounded mb-2" />
    <div className="w-20 h-4 bg-lumen-surface2 rounded" />
  </div>
)
