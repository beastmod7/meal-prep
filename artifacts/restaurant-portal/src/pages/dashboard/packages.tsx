import { useAuth } from "@/lib/auth";
import { useGetRestaurantPackages, getGetRestaurantPackagesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package as PackageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Packages() {
  const { activeRestaurantId } = useAuth();
  
  const { data: packages, isLoading } = useGetRestaurantPackages(
    activeRestaurantId!, 
    {}, 
    { 
      query: { 
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantPackagesQueryKey(activeRestaurantId!, {})
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packages</h1>
          <p className="text-muted-foreground mt-1">Manage your meal subscription offerings.</p>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!packages || packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <PackageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No packages found.
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      {pkg.name}
                      <div className="text-xs text-muted-foreground mt-1">{pkg.validityDays} days</div>
                    </TableCell>
                    <TableCell className="capitalize">{pkg.mealSlot}</TableCell>
                    <TableCell>
                      ${(pkg.pricePerDay / 100).toFixed(2)}/day
                      {pkg.discountPct && pkg.discountPct > 0 && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                          {pkg.discountPct}% off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{pkg.activeSubscribers}</span> active
                      <div className="text-xs text-muted-foreground mt-1">{pkg.totalSold} total sold</div>
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      ${(pkg.revenueGenerated / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={pkg.status === "active" ? "default" : pkg.status === "paused" ? "secondary" : "outline"}
                        className={pkg.status === "active" ? "bg-primary text-primary-foreground" : ""}
                      >
                        {pkg.status}
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
