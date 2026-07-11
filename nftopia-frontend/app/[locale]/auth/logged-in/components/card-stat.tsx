import { StatCardSkeleton } from "./skelletons/stat-card-skeleton"

export interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
  change?: number;
  isLoading?: boolean;
}
export const StatCard = ({ icon: Icon, label, value, change, isLoading = false }: StatCardProps) => {
  if (isLoading) return <StatCardSkeleton />

  return (
    <div className="rounded-lg border border-lumen-border bg-lumen-card p-6 hover:border-lumen-teal/30 hover:shadow-lm-glow-sm transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-8 h-8 text-lumen-teal" />
        {change !== undefined && (
          <span className={`text-sm font-medium ${change > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-lumen-text mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-lumen-subtext">{label}</div>
    </div>
  )
}
