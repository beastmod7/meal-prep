import { useAuth } from "@/lib/auth";
import { useGetRestaurantPackages, getGetRestaurantPackagesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package as PackageIcon, Download, Users, TrendingUp, Tag, UtensilsCrossed, ChefHat, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { inr } from "@/lib/fmt";
import { downloadCsv } from "@/lib/download";
import { useToast } from "@/hooks/use-toast";

const SLOT_STYLE: Record<string, { badge: string; label: string; icon: string }> = {
  lunch: { badge: "text-amber-700 bg-amber-50 border-amber-200", label: "Lunch", icon: "☀️" },
  dinner: { badge: "text-indigo-700 bg-indigo-50 border-indigo-200", label: "Dinner", icon: "🌙" },
  both: { badge: "text-purple-700 bg-purple-50 border-purple-200", label: "Lunch + Dinner", icon: "🍽️" },
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200",
};

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg }: { pkg: {
  id: string;
  name: string;
  mealSlot: string;
  validityDays: number;
  pricePerDay: number;
  discountPct?: number | null;
  description?: string | null;
  status: string;
  activeSubscribers: number;
  totalSold: number;
  revenueGenerated: number;
} }) {
  const slot = SLOT_STYLE[pkg.mealSlot] ?? SLOT_STYLE.lunch!;
  const totalValue = pkg.pricePerDay * pkg.validityDays;
  const discountedValue = pkg.discountPct ? totalValue * (1 - pkg.discountPct / 100) : totalValue;
  const isActive = pkg.status === "active";

  return (
    <Card className={`bg-card transition-all hover:shadow-md ${isActive ? "border-border" : "opacity-60"}`}>
      <CardContent className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-[10px] shrink-0 ${slot.badge}`}>
                {slot.icon} {slot.label}
              </Badge>
              {pkg.discountPct && pkg.discountPct > 0 && (
                <Badge variant="outline" className="text-[10px] shrink-0 bg-rose-50 text-rose-700 border-rose-200">
                  <Tag className="w-2.5 h-2.5 mr-0.5" />
                  {pkg.discountPct}% off
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base text-foreground leading-tight truncate">{pkg.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{pkg.validityDays}-day plan</p>
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_STYLE[pkg.status] ?? ""}`}>
            {pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
          </Badge>
        </div>

        {/* Pricing */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 mb-4">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-primary">{inr(pkg.pricePerDay)}</span>
              <span className="text-xs text-muted-foreground ml-1">/ day</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">{inr(discountedValue)}</div>
              <div className="text-[10px] text-muted-foreground">total plan</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{pkg.activeSubscribers}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Active</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{pkg.totalSold}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Sold</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-sm font-bold text-primary leading-relaxed mt-1">{inr(pkg.revenueGenerated)}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Revenue</p>
          </div>
        </div>

        {pkg.description && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{pkg.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Packages() {
  const { activeRestaurantId, token } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const { data: packages, isLoading } = useGetRestaurantPackages(
    activeRestaurantId!,
    {},
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantPackagesQueryKey(activeRestaurantId!, {}),
      },
    },
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const params = new URLSearchParams({ reportType: "package_performance" });
      const res = await fetch(
        `${base}/api/restaurant-portal/restaurants/${activeRestaurantId}/reports/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      downloadCsv(json.headers, json.rows, `packages-${new Date().toISOString().split("T")[0]}.csv`);
    } catch {
      toast({ title: "Export failed", description: "Could not download report.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!activeRestaurantId) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-36 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-5">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded mb-3" />
                <div className="h-8 w-1/2 bg-muted animate-pulse rounded mb-4" />
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activePackages = packages?.filter((p) => p.status === "active") ?? [];
  const totalSubscribers = activePackages.reduce((s, p) => s + p.activeSubscribers, 0);
  const totalRevenue = (packages ?? []).reduce((s, p) => s + p.revenueGenerated, 0);
  const totalSold = (packages ?? []).reduce((s, p) => s + p.totalSold, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packages</h1>
          <p className="text-muted-foreground mt-1">Your meal subscription offerings and subscriber performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/menu">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ChefHat className="w-4 h-4" />
              Edit in Menu CMS
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export
          </Button>
        </div>
      </div>

      {/* KPI row */}
      {packages && packages.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm opacity-85">Active Subscribers</p>
                <p className="text-3xl font-bold mt-0.5">{totalSubscribers}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-primary mt-0.5">{inr(totalRevenue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Packages Sold</p>
                <p className="text-3xl font-bold mt-0.5">{totalSold}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Package cards */}
      {!packages || packages.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <PackageIcon className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No packages yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Create your first meal subscription package in the Menu CMS.
            </p>
            <Link href="/dashboard/menu">
              <Button size="sm" className="gap-1.5">
                <ChefHat className="w-4 h-4" />
                Go to Menu CMS
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active packages */}
          {activePackages.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active Packages
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activePackages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </div>
          )}

          {/* Paused/archived */}
          {packages.filter((p) => p.status !== "active").length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Paused & Archived
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {packages.filter((p) => p.status !== "active").map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </div>
          )}

          {/* Detail table */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Performance Table
            </h2>
            <Card className="bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package Name</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Price / Day</TableHead>
                      <TableHead className="text-center">Active Subs</TableHead>
                      <TableHead className="text-center">Total Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => {
                      const slot = SLOT_STYLE[pkg.mealSlot] ?? SLOT_STYLE.lunch!;
                      return (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium">
                            {pkg.name}
                            {pkg.discountPct && pkg.discountPct > 0 && (
                              <Badge variant="outline" className="ml-2 bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                {pkg.discountPct}% off
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${slot.badge}`}>
                              {slot.icon} {slot.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{pkg.validityDays} days</TableCell>
                          <TableCell className="font-medium">{inr(pkg.pricePerDay)}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{pkg.activeSubscribers}</span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{pkg.totalSold}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {inr(pkg.revenueGenerated)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={`text-xs ${STATUS_STYLE[pkg.status] ?? ""}`}>
                              {pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
