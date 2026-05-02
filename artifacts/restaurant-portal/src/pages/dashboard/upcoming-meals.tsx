import { useAuth } from "@/lib/auth";
import { useGetRestaurantUpcomingMeals, getGetRestaurantUpcomingMealsQueryKey, useUpdateMealOrderStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function UpcomingMeals() {
  const { activeRestaurantId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Default to today
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useGetRestaurantUpcomingMeals(
    activeRestaurantId!, 
    { date }, 
    { 
      query: { 
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantUpcomingMealsQueryKey(activeRestaurantId!, { date })
      } 
    }
  );

  const updateStatus = useUpdateMealOrderStatus();

  const handleStatusUpdate = (orderId: string, newStatus: "accepted" | "preparing" | "ready" | "delivered" | "no_show") => {
    updateStatus.mutate({
      restaurantId: activeRestaurantId!,
      orderId,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        toast({ description: `Order status updated to ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: getGetRestaurantUpcomingMealsQueryKey(activeRestaurantId!, { date }) });
      }
    });
  };

  if (!activeRestaurantId) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Prep</h1>
          <p className="text-muted-foreground mt-1">Manage kitchen locks and order fulfillments.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-md p-1 shadow-sm">
          <CalendarIcon className="w-4 h-4 ml-2 text-muted-foreground" />
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="border-0 shadow-none focus-visible:ring-0 w-[150px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No data available for this date.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Lunch Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-3xl font-bold">{data.lunchLocked}</div>
                    <p className="text-sm text-muted-foreground">Locked for prep</p>
                  </div>
                  <div className="text-right space-y-1 text-sm">
                    <div>Total: <span className="font-medium">{data.lunchTotal}</span></div>
                    <div className="text-destructive">Cancelled: <span className="font-medium">{data.lunchCancelled}</span></div>
                    <div className="text-green-600">Delivered: <span className="font-medium">{data.lunchDelivered}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Dinner Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-3xl font-bold">{data.dinnerLocked}</div>
                    <p className="text-sm text-muted-foreground">Locked for prep</p>
                  </div>
                  <div className="text-right space-y-1 text-sm">
                    <div>Total: <span className="font-medium">{data.dinnerTotal}</span></div>
                    <div className="text-destructive">Cancelled: <span className="font-medium">{data.dinnerCancelled}</span></div>
                    <div className="text-green-600">Delivered: <span className="font-medium">{data.dinnerDelivered}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Order List</CardTitle>
              {data.isLockPassed && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  <Clock className="w-3 h-3 mr-1" /> Prep Locked
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No orders scheduled for this date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.studentName}</div>
                          <div className="text-xs text-muted-foreground">{order.studentPhoneMasked}</div>
                        </TableCell>
                        <TableCell>{order.packageName}</TableCell>
                        <TableCell className="capitalize">
                          <Badge variant="outline" className={order.mealSlot === 'lunch' ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-blue-600 border-blue-200 bg-blue-50'}>
                            {order.mealSlot}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'delivered' ? 'default' : 
                            order.status === 'cancelled' ? 'destructive' : 
                            'secondary'
                          } className={order.status === 'delivered' ? 'bg-green-600' : ''}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                          {order.isLocked && order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <div className="text-xs text-primary mt-1 font-medium flex items-center">
                              <Clock className="w-3 h-3 mr-1" /> Locked
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'no_show' && (
                            <div className="flex justify-end gap-2">
                              {order.status === 'scheduled' && order.isLocked && (
                                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, 'preparing')}>
                                  Prep
                                </Button>
                              )}
                              {(order.status === 'preparing' || order.status === 'scheduled') && order.isLocked && (
                                <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'delivered')} className="bg-green-600 hover:bg-green-700">
                                  Deliver
                                </Button>
                              )}
                              {order.status !== 'scheduled' && (
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleStatusUpdate(order.id, 'no_show')}>
                                  No Show
                                </Button>
                              )}
                            </div>
                          )}
                          {order.status === 'delivered' && (
                            <span className="text-green-600 flex items-center justify-end text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Done
                            </span>
                          )}
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
