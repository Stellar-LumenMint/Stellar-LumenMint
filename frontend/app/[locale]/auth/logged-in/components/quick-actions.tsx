import { Plus, TrendingUp, Grid3X3, Users } from "lucide-react"

export const QuickActions = () => (
  <div className="rounded-lg border border-lumen-border bg-lumen-card p-6">
    <h2 className="text-lg font-semibold text-lumen-text mb-4">Quick Actions</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { icon: Plus,        label: "Create NFT" },
        { icon: Grid3X3,    label: "New Collection" },
        { icon: TrendingUp, label: "Analytics" },
        { icon: Users,      label: "Community" },
      ].map(({ icon: Icon, label }) => (
        <button
          key={label}
          className="flex items-center gap-3 p-4 border border-dashed border-lumen-border rounded-lg hover:border-lumen-teal/60 hover:bg-lumen-surface2 transition-colors"
        >
          <Icon className="w-5 h-5 text-lumen-teal" />
          <span className="text-sm font-medium text-lumen-subtext">{label}</span>
        </button>
      ))}
    </div>
  </div>
)
