import { useAuth } from "@/lib/auth";
import { useGetRestaurantSettlements, getGetRestaurantSettlementsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function Settlements() {
  const { activeRestaurantId } = useAuth();
  
  const { data, isLoading } = useGetRestaurantSettlements(
    activeRestaurantId!, 
    {}, 
    { 
      query: { 
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantSettlementsQueryKey(activeRestaurantId!, {})
      } 
    }
  );

  if (!activeRestaurantId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
        <p className="text-muted-foreground mt-1">Track payouts, commissions, and account balance.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Failed to load settlements data.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-primary text-primary-foreground shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Pending Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${(data.summary.pendingAmount / 100).toFixed(2)}</div>
                <p className="text-xs mt-1 opacity-80">Awaiting next payout cycle</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">${(data.summary.paidAmount / 100).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime cleared payouts</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">${(data.summary.platformCommission / 100).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Platform service fees</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Payout Periods</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Meals</TableHead>
                    <TableHead className="text-right">Gross Value</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.periods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <DollarSign className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        No settlement periods found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell>
                          <div className="font-medium">
                            {format(new Date(period.periodStart), "MMM d")} - {format(new Date(period.periodEnd), "MMM d, yyyy")}
                          </div>
                          {period.payoutDate && (
                            <div className="text-xs text-muted-foreground mt-1">Paid on {format(new Date(period.payoutDate), "MMM d")}</div>
                          )}
                        </TableCell>
                        <TableCell>{period.mealsDelivered}</TableCell>
                        <TableCell className="text-right">${(period.grossValue / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-destructive">-${(period.commission / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          ${(period.netPayable / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={
                            period.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                            period.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            period.status === 'payable' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }>
                            {period.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
