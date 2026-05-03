import { useAuth } from "@/lib/auth";
import { useGetRestaurantOverview, getGetRestaurantOverviewQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  UtensilsCrossed,
  DollarSign,
  ArrowRight,
  ChefHat,
  XCircle,
  Zap,
} from "lucide-react";
import { inr } from "@/lib/fmt";
import { Link } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DeliveryRing({ delivered, total }: { delivered: number; total: number }) {
  const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          strokeWidth="8"
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="stroke-emerald-500 transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-lg font-bold text-foreground">{pct}%</span>
      </div>
    </div>
  );
}

const ACTIVITY_CONFIG: Record<string, { color: string; label: string }> = {
  cancellation: { color: "bg-orange-500", label: "Cancelled" },
  subscription: { color: "bg-emerald-500", label: "Subscribed" },
  delivery: { color: "bg-blue-500", label: "Delivered" },
  settlement: { color: "bg-violet-500", label: "Settlement" },
  refund: { color: "bg-red-500", label: "Refund" },
  no_show: { color: "bg-amber-500", label: "No Show" },
};

function getActivityConfig(description: string) {
  const lower = description.toLowerCase();
  if (lower.includes("cancel")) return ACTIVITY_CONFIG["cancellation"]!;
  if (lower.includes("subscri")) return ACTIVITY_CONFIG["subscription"]!;
  if (lower.includes("deliver")) return ACTIVITY_CONFIG["delivery"]!;
  if (lower.includes("settl") || lower.includes("payout")) return ACTIVITY_CONFIG["settlement"]!;
  if (lower.includes("refund")) return ACTIVITY_CONFIG["refund"]!;
  if (lower.includes("no_show") || lower.includes("no show")) return ACTIVITY_CONFIG["no_show"]!;
  return { color: "bg-primary", label: "Activity" };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card className="bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${accent ?? "text-foreground"}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickAction({
  href,
  icon: Icon,
  label,
  sublabel,
  badge,
  badgeColor,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Link href={href}>
      <div className="group flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/3 transition-all cursor-pointer">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{sublabel}</p>
        </div>
        {badge && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${badgeColor ?? ""}`}>
            {badge}
          </Badge>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary/70 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Overview() {
  const { activeRestaurantId } = useAuth();

  const { data, isLoading } = useGetRestaurantOverview(
    activeRestaurantId!,
    {},
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantOverviewQueryKey(activeRestaurantId!, {}),
      },
    },
  );

  if (!activeRestaurantId) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-5">
                <div className="h-4 w-32 bg-muted animate-pulse rounded mb-3" />
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Failed to load overview data</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const deliveryPct =
    data.mealsScheduledToday > 0
      ? Math.round((data.mealsDeliveredToday / data.mealsScheduledToday) * 100)
      : 0;

  const totalCancellations = data.freeCancellations + data.lateCancellations + data.noShows;
  const pendingOrders = data.mealsScheduledToday - data.mealsDeliveredToday;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Today's operations and key metrics at a glance.
          </p>
        </div>
        {pendingOrders > 0 && (
          <Link href="/dashboard/upcoming-meals">
            <Button size="sm" className="gap-1.5 shrink-0">
              <Zap className="w-3.5 h-3.5" />
              {pendingOrders} pending
            </Button>
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Settlement"
          value={inr(data.pendingSettlementAmount)}
          sub={`~${data.estimatedPayoutPeriod} days to payout`}
          icon={TrendingUp}
          accent="text-primary"
        />
        <StatCard
          title="Active Subscribers"
          value={data.activeSubscribers}
          sub={`Across ${data.activePackages} package${data.activePackages !== 1 ? "s" : ""}`}
          icon={Users}
        />
        <StatCard
          title="Meals Locked Today"
          value={data.mealsLockedForPrep}
          sub={`Lunch: ${data.lunchLockedCount}  ·  Dinner: ${data.dinnerLockedCount}`}
          icon={Clock}
        />
        <StatCard
          title="Delivered Today"
          value={`${data.mealsDeliveredToday} / ${data.mealsScheduledToday}`}
          sub={
            deliveryPct === 100
              ? "All meals delivered ✓"
              : deliveryPct > 0
                ? `${100 - deliveryPct}% still pending`
                : "None delivered yet"
          }
          icon={CheckCircle2}
          accent={deliveryPct === 100 ? "text-emerald-600" : undefined}
        />
      </div>

      {/* Main section */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Today's delivery status */}
        <Card className="lg:col-span-2 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Today's Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-6 pt-2 gap-3">
            <DeliveryRing
              delivered={data.mealsDeliveredToday}
              total={data.mealsScheduledToday}
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {data.mealsDeliveredToday} of {data.mealsScheduledToday} meals
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {deliveryPct === 100
                  ? "All complete"
                  : `${data.mealsScheduledToday - data.mealsDeliveredToday} remaining`}
              </p>
            </div>
            <div className="w-full grid grid-cols-2 gap-2 mt-1">
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-center">
                <p className="text-xs text-amber-600 font-medium">Lunch</p>
                <p className="text-lg font-bold text-amber-700">{data.lunchLockedCount}</p>
              </div>
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2 text-center">
                <p className="text-xs text-indigo-600 font-medium">Dinner</p>
                <p className="text-lg font-bold text-indigo-700">{data.dinnerLockedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation impact */}
        <Card className="lg:col-span-2 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Cancellations (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm text-muted-foreground">Free (advance)</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-foreground">{data.freeCancellations}</span>
                <span className="text-xs text-muted-foreground ml-1">no cost</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-sm text-orange-700">Late cancel</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-orange-700">{data.lateCancellations}</span>
                <span className="text-xs text-muted-foreground ml-1">50% back</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-700">No shows</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-red-700">{data.noShows}</span>
                <span className="text-xs text-muted-foreground ml-1">full payout</span>
              </div>
            </div>

            {totalCancellations > 0 && (
              <div className="mt-3">
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  {data.freeCancellations > 0 && (
                    <div
                      className="bg-slate-300 rounded-full"
                      style={{ width: `${(data.freeCancellations / totalCancellations) * 100}%` }}
                    />
                  )}
                  {data.lateCancellations > 0 && (
                    <div
                      className="bg-orange-400 rounded-full"
                      style={{ width: `${(data.lateCancellations / totalCancellations) * 100}%` }}
                    />
                  )}
                  {data.noShows > 0 && (
                    <div
                      className="bg-red-500 rounded-full"
                      style={{ width: `${(data.noShows / totalCancellations) * 100}%` }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{totalCancellations} total in last 30 days</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-3 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {data.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.slice(0, 6).map((activity, i) => {
                  const config = getActivityConfig(activity.description);
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.color}`} />
                        {i < Math.min(data.recentActivity.length, 6) - 1 && (
                          <div className="w-px h-4 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm text-foreground leading-tight capitalize">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                          {activity.amount ? (
                            <span className="text-xs font-medium text-primary">{inr(activity.amount)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Access
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/dashboard/upcoming-meals"
            icon={UtensilsCrossed}
            label="Daily Prep"
            sublabel="Mark deliveries & check-ins"
            badge={pendingOrders > 0 ? `${pendingOrders} pending` : undefined}
            badgeColor="bg-amber-50 text-amber-700 border-amber-200"
          />
          <QuickAction
            href="/dashboard/settlements"
            icon={DollarSign}
            label="Settlements"
            sublabel={inr(data.pendingSettlementAmount) + " pending payout"}
          />
          <QuickAction
            href="/dashboard/cancellations"
            icon={XCircle}
            label="Cancellations"
            sublabel={`${totalCancellations} in last 30 days`}
          />
          <QuickAction
            href="/dashboard/menu"
            icon={ChefHat}
            label="Menu CMS"
            sublabel="Edit meals and packages"
          />
        </div>
      </div>
    </div>
  );
}
