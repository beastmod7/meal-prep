import { useAuth } from "@/lib/auth";
import { useGetRestaurantCancellations, getGetRestaurantCancellationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingDown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

export default function Cancellations() {
  const { activeRestaurantId } = useAuth();
  const [type, setType] = useState<string>("all");
  
  const { data, isLoading } = useGetRestaurantCancellations(
    activeRestaurantId!, 
    { type: type === "all" ? undefined : type as any }, 
    { 
      query: { 
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantCancellationsQueryKey(activeRestaurantId!, { type: type === "all" ? undefined : type as any })
      } 
    }
  );

  if (!activeRestaurantId) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cancellations</h1>
          <p className="text-muted-foreground mt-1">Review deduction impacts and cancellation logs.</p>
        </div>
        <div className="w-[200px]">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cancellations</SelectItem>
              <SelectItem value="free_cancellation">Free (Advance)</SelectItem>
              <SelectItem value="late_cancellation">Late (Locked)</SelectItem>
              <SelectItem value="no_show">No Shows</SelectItem>
              <SelectItem value="restaurant_cancelled">Restaurant Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Failed to load cancellations data.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-card border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="text-2xl font-bold text-foreground">-${(data.summary.totalImpact / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Late Cancellations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.summary.lateCancellations}</div>
                <p className="text-xs text-muted-foreground mt-1">Platform shares cost</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">No Shows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.summary.noShows}</div>
                <p className="text-xs text-muted-foreground mt-1">Full payout preserved</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Free Cancellations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.summary.freeCancellations}</div>
                <p className="text-xs text-muted-foreground mt-1">Before lock time</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Package / Slot</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Deduction</TableHead>
                    <TableHead className="text-right">Final Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        No cancellations match your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {format(new Date(item.mealDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{item.studentName}</TableCell>
                        <TableCell>
                          {item.packageName}
                          <div className="text-xs text-muted-foreground capitalize mt-1">{item.mealSlot}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            item.cancellationType === 'late_cancellation' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            item.cancellationType === 'no_show' ? 'bg-red-50 text-red-700 border-red-200' :
                            item.cancellationType === 'free_cancellation' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                            'bg-destructive/10 text-destructive'
                          }>
                            {item.cancellationType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {item.deductionAmount > 0 ? `-$${(item.deductionAmount / 100).toFixed(2)}` : "$0.00"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ${(item.restaurantPayout / 100).toFixed(2)}
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
