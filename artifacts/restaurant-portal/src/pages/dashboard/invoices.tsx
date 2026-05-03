import { useAuth } from "@/lib/auth";
import { useGetRestaurantSettlements, getGetRestaurantSettlementsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, FileText, ReceiptText, CreditCard, Info } from "lucide-react";
import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { inr } from "@/lib/fmt";
import { useToast } from "@/hooks/use-toast";

// ─── Mock invoice data ────────────────────────────────────────────────────────

const TODAY = new Date();
const FMT = (d: Date) => format(d, "d MMM yyyy");

const CUSTOMER_INVOICES = [
  { id: "INV-2025-0041", date: FMT(subMonths(TODAY, 0)), customer: "Student ••3210", package: "Lunch 30-Day Plan", taxableValue: 3809, cgst: 95, sgst: 95, total: 3999, status: "issued" },
  { id: "INV-2025-0040", date: FMT(subMonths(TODAY, 0)), customer: "Student ••7842", package: "Dinner 20-Day Plan", taxableValue: 2094, cgst: 52, sgst: 52, total: 2199, status: "issued" },
  { id: "INV-2025-0039", date: FMT(subMonths(TODAY, 0)), customer: "Student ••1195", package: "Lunch 10-Day Plan", taxableValue: 1143, cgst: 29, sgst: 29, total: 1199, status: "issued" },
  { id: "INV-2025-0038", date: FMT(subMonths(TODAY, 1)), customer: "Student ••5531", package: "Lunch 30-Day Plan", taxableValue: 3809, cgst: 95, sgst: 95, total: 3999, status: "issued" },
  { id: "INV-2025-0037", date: FMT(subMonths(TODAY, 1)), customer: "Student ••2203", package: "Lunch + Dinner 20-Day Plan", taxableValue: 3804, cgst: 95, sgst: 95, total: 3999, status: "issued" },
];

const COMMISSION_INVOICES = [
  { id: "COM-2025-0018", date: FMT(subMonths(TODAY, 0)), period: `${FMT(startOfMonth(TODAY))} – ${FMT(endOfMonth(TODAY))}`, grossCommission: 7200, gst: 1296, total: 8496, status: "issued" },
  { id: "COM-2025-0017", date: FMT(subMonths(TODAY, 1)), period: `${FMT(startOfMonth(subMonths(TODAY,1)))} – ${FMT(endOfMonth(subMonths(TODAY,1)))}`, grossCommission: 6600, gst: 1188, total: 7788, status: "issued" },
  { id: "COM-2025-0016", date: FMT(subMonths(TODAY, 2)), period: `${FMT(startOfMonth(subMonths(TODAY,2)))} – ${FMT(endOfMonth(subMonths(TODAY,2)))}`, grossCommission: 5400, gst: 972, total: 6372, status: "paid" },
];

const CREDIT_NOTES = [
  { id: "CN-2025-0009", date: FMT(subMonths(TODAY, 0)), linkedInvoice: "INV-2025-0038", reason: "Refund for unused meals after plan cancellation", mealsUnused: 14, taxableValue: -1778, gstAdj: -89, total: -1867, status: "issued" },
  { id: "CN-2025-0008", date: FMT(subMonths(TODAY, 1)), linkedInvoice: "INV-2025-0034", reason: "Refund for unused meals after plan cancellation", mealsUnused: 7, taxableValue: -889, gstAdj: -44, total: -933, status: "issued" },
];

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

function exportCustomerInvoicesCsv() {
  const headers = ["Invoice No", "Date", "Customer", "Package", "Taxable Value", "CGST (2.5%)", "SGST (2.5%)", "Total", "Status"];
  const rows = CUSTOMER_INVOICES.map((r) => [
    r.id, r.date, r.customer, r.package,
    String(r.taxableValue), String(r.cgst), String(r.sgst), String(r.total), r.status,
  ]);
  downloadCsv(headers, rows, `customer-invoices-${new Date().toISOString().split("T")[0]}.csv`);
}

function exportCommissionCsv() {
  const headers = ["Invoice No", "Date", "Period", "Commission (excl GST)", "GST @18%", "Total Invoice", "Status"];
  const rows = COMMISSION_INVOICES.map((r) => [
    r.id, r.date, r.period, String(r.grossCommission), String(r.gst), String(r.total), r.status,
  ]);
  downloadCsv(headers, rows, `commission-invoices-${new Date().toISOString().split("T")[0]}.csv`);
}

function exportCreditNotesCsv() {
  const headers = ["Credit Note No", "Date", "Linked Invoice", "Reason", "Meals Unused", "Taxable Adj", "GST Adj", "Total", "Status"];
  const rows = CREDIT_NOTES.map((r) => [
    r.id, r.date, r.linkedInvoice, r.reason, String(r.mealsUnused),
    String(r.taxableValue), String(r.gstAdj), String(r.total), r.status,
  ]);
  downloadCsv(headers, rows, `credit-notes-${new Date().toISOString().split("T")[0]}.csv`);
}

const invoiceStatusStyle: Record<string, string> = {
  issued: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  void: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function InvoicesGst() {
  const { activeRestaurantId, token } = useAuth();
  const { toast } = useToast();
  const [monthFilter, setMonthFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  const { data: settlements, isLoading } = useGetRestaurantSettlements(
    activeRestaurantId!,
    {},
    {
      query: {
        enabled: !!activeRestaurantId,
        queryKey: getGetRestaurantSettlementsQueryKey(activeRestaurantId!, {}),
      },
    },
  );

  const handleFullExport = async (reportType: string, filename: string) => {
    setExporting(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const params = new URLSearchParams({ reportType });
      const res = await fetch(
        `${base}/api/restaurant-portal/restaurants/${activeRestaurantId}/reports/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      downloadCsv(json.headers, json.rows, filename);
    } catch {
      toast({ title: "Export failed", description: "Could not download report.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!activeRestaurantId) return null;

  // Derive GST summary from settlements data
  const totalGrossValue = settlements?.periods.reduce((s, p) => s + p.grossValue, 0) ?? 0;
  const gstOnMealService = Math.round(totalGrossValue * 0.05); // 5% under Sec 9(5), paid by ECO
  const totalCommission = settlements?.summary.platformCommission ?? 0;
  const gstOnCommission = Math.round(totalCommission * 0.18); // 18% on platform commission
  const creditNotesTotal = CREDIT_NOTES.reduce((s, c) => s + Math.abs(c.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices & GST</h1>
          <p className="text-muted-foreground mt-1">
            Customer tax invoices, platform commission invoices, credit notes, and GST summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              <SelectItem value="current">{format(TODAY, "MMMM yyyy")}</SelectItem>
              <SelectItem value="prev">{format(subMonths(TODAY, 1), "MMMM yyyy")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFullExport("weekly_settlement", `gst-report-${new Date().toISOString().split("T")[0]}.csv`)}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export for CA
          </Button>
        </div>
      </div>

      {/* GST summary cards */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Gross Meal Service Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{inr(totalGrossValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime across all settlements</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4" /> GST on Meals (Sec 9(5))
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{inr(gstOnMealService)}</div>
              <p className="text-xs text-muted-foreground mt-1">5% paid by platform as ECO</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" /> GST on Commission (18%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{inr(gstOnCommission)}</div>
              <p className="text-xs text-muted-foreground mt-1">On ₹{inr(totalCommission)} platform fee</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Credit Notes Issued
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">-{inr(creditNotesTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">{CREDIT_NOTES.length} credit notes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice tabs */}
      <Tabs defaultValue="customer">
        <TabsList className="mb-4">
          <TabsTrigger value="customer">Customer Tax Invoices</TabsTrigger>
          <TabsTrigger value="commission">Commission Invoices</TabsTrigger>
          <TabsTrigger value="credit">Credit Notes</TabsTrigger>
        </TabsList>

        {/* Customer tax invoices */}
        <TabsContent value="customer">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Customer Tax Invoices</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCustomerInvoicesCsv}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST 2.5%</TableHead>
                    <TableHead className="text-right">SGST 2.5%</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CUSTOMER_INVOICES.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="text-sm">{inv.customer}</TableCell>
                      <TableCell className="text-sm">{inv.package}</TableCell>
                      <TableCell className="text-right">{inr(inv.taxableValue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{inr(inv.cgst)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{inr(inv.sgst)}</TableCell>
                      <TableCell className="text-right font-semibold">{inr(inv.total)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={invoiceStatusStyle[inv.status] ?? ""}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Under Sec 9(5), GST on restaurant services is paid by the platform (ECO). Customer invoices are
            issued by Meal Pass, not the restaurant. IGST applies for inter-state transactions.
          </p>
        </TabsContent>

        {/* Commission invoices */}
        <TabsContent value="commission">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Platform Commission Invoices</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCommissionCsv}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Commission (excl. GST)</TableHead>
                    <TableHead className="text-right">GST 18%</TableHead>
                    <TableHead className="text-right">Total Payable</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMMISSION_INVOICES.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.period}</TableCell>
                      <TableCell className="text-right">{inr(inv.grossCommission)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{inr(inv.gst)}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{inr(inv.total)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={invoiceStatusStyle[inv.status] ?? ""}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Platform commission (12% of gross meal service value) is the platform's own service to the
            restaurant, separately invoiced with 18% GST. This is deducted before settlement.
          </p>
        </TabsContent>

        {/* Credit notes */}
        <TabsContent value="credit">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Credit Notes (Refund Adjustments)</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCreditNotesCsv}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Linked Invoice</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Meals Unused</TableHead>
                    <TableHead className="text-right">Taxable Adj.</TableHead>
                    <TableHead className="text-right">GST Reversal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CREDIT_NOTES.map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-mono text-xs">{cn.id}</TableCell>
                      <TableCell className="text-sm">{cn.date}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{cn.linkedInvoice}</TableCell>
                      <TableCell className="text-sm max-w-[200px]">{cn.reason}</TableCell>
                      <TableCell className="text-right">{cn.mealsUnused}</TableCell>
                      <TableCell className="text-right text-destructive">{inr(cn.taxableValue)}</TableCell>
                      <TableCell className="text-right text-destructive">{inr(cn.gstAdj)}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{inr(cn.total)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={invoiceStatusStyle[cn.status] ?? ""}>
                          {cn.status.charAt(0).toUpperCase() + cn.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Credit notes are issued for refunds on unused meals after plan cancellation. GST reversal
            is applied proportionally. These reduce the net taxable value for the settlement period.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
