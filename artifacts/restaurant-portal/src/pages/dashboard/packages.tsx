import { useAuth } from "@/lib/auth";
import { useGetRestaurantPackages, getGetRestaurantPackagesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Package as PackageIcon, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { inr } from "@/lib/fmt";
import { useToast } from "@/hooks/use-toast";

const slotLabel: Record<string, string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  both: "Lunch + Dinner",
};

const statusStyle: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200",
};

function downloadCsv(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
      const today = new Date().toISOString().split("T")[0];
      downloadCsv(json.headers, json.rows, `packages-${today}.csv`);
    } catch {
      toast({ title: "Export failed", description: "Could not download report.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!activeRestaurantId) return null;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packages</h1>
          <p className="text-muted-foreground mt-1">Your meal subscription offerings and performance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Export CSV
        </Button>
      </div>

      {packages && packages.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card">
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Total Active Subscribers</p>
              <p className="text-2xl font-bold mt-1">
                {packages.filter(p => p.status === "active").reduce((s, p) => s + p.activeSubscribers, 0)}
              </p>
            </div>
          </Card>
          <Card className="bg-card">
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {inr(packages.reduce((s, p) => s + p.revenueGenerated, 0))}
              </p>
            </div>
          </Card>
          <Card className="bg-card">
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Total Packages Sold</p>
              <p className="text-2xl font-bold mt-1">
                {packages.reduce((s, p) => s + p.totalSold, 0)}
              </p>
            </div>
          </Card>
        </div>
      )}

      <Card className="bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Price / Day</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Total Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!packages || packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    <PackageIcon className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    No packages found.
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      {pkg.name}
                      {pkg.discountPct && pkg.discountPct > 0 && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200 text-[10px]">
                          {pkg.discountPct}% off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        pkg.mealSlot === "lunch"
                          ? "text-orange-600 border-orange-200 bg-orange-50"
                          : pkg.mealSlot === "dinner"
                          ? "text-blue-600 border-blue-200 bg-blue-50"
                          : "text-purple-600 border-purple-200 bg-purple-50"
                      }>
                        {slotLabel[pkg.mealSlot] ?? pkg.mealSlot}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{pkg.validityDays} days</TableCell>
                    <TableCell>{inr(pkg.pricePerDay)}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{pkg.activeSubscribers}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{pkg.totalSold}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {inr(pkg.revenueGenerated)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={statusStyle[pkg.status] ?? ""}>
                        {pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
