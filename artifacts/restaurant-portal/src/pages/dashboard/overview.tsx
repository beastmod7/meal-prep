import { useAuth } from "@/lib/auth";
import { useGetRestaurantOverview, getGetRestaurantOverviewQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Package as PackageIcon, Clock, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

export default function Overview() {
  const { activeRestaurantId } = useAuth();
  
  const { data, isLoading } = useGetRestaurantOverview(
    activeRestaurantId!, 
    {}, 
    { 
      query: { 
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantOverviewQueryKey(activeRestaurantId!, {})
      } 
    }
  );

  if (!activeRestaurantId) return null;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return <div>Failed to load overview data</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Today's performance and actionable metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Settlement</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${(data.pendingSettlementAmount / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated payout in {data.estimatedPayoutPeriod} days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data.activeSubscribers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {data.activePackages} active packages
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meals Locked (Today)</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data.mealsLockedForPrep}</div>
            <p className="text-xs text-muted-foreground mt-1">
              L: {data.lunchLockedCount} • D: {data.dinnerLockedCount}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meals Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data.mealsDeliveredToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {data.mealsScheduledToday} scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card">
          <CardHeader>
            <CardTitle>Cancellation Impact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground mb-1">Free</span>
              <span className="text-xl font-bold">{data.freeCancellations}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-accent/20 border border-accent rounded-lg">
              <span className="text-sm text-accent-foreground mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Late</span>
              <span className="text-xl font-bold text-accent-foreground">{data.lateCancellations}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <span className="text-sm text-destructive mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> No Shows</span>
              <span className="text-xl font-bold text-destructive">{data.noShows}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">No recent activity</div>
              ) : (
                data.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                        {activity.amount ? ` • $${(activity.amount / 100).toFixed(2)}` : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
