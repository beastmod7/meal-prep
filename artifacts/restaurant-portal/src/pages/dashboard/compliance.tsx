import { useAuth } from "@/lib/auth";
import { useRestaurantPortalMe, getRestaurantPortalMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ShieldCheck,
  CreditCard,
  FileText,
  Info,
  Loader2,
} from "lucide-react";

type FieldStatus = "verified" | "pending" | "missing";

function StatusBadge({ status }: { status: FieldStatus }) {
  if (status === "verified")
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Verified
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Clock className="w-3 h-3" /> Pending
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
      <XCircle className="w-3 h-3" /> Not provided
    </Badge>
  );
}

function ProfileRow({ label, value, status }: { label: string; value: string; status?: FieldStatus }) {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5 text-foreground">{value}</p>
      </div>
      {status && <StatusBadge status={status} />}
    </div>
  );
}

const MOCK_KYC = {
  legalName: "—",
  tradeName: "—",
  gstin: null as string | null,
  pan: null as string | null,
  fssai: null as string | null,
  registeredAddress: "—",
  restaurantType: "Normal Restaurant",
  compositionTaxpayer: "No",
  gstRegistered: false,
  bankHolder: "—",
  bankName: "—",
  accountNumber: "—",
  ifsc: "—",
  upiId: "—",
  bankVerified: false,
  agreementSigned: true,
  lastKycUpdate: "—",
  settlementCycle: "Weekly (Mon–Sun)",
  invoiceResponsibility: "Platform (ECO under Sec 9(5))",
  taxClassification: "Restaurant service via e-commerce operator",
  sacCode: "996331",
};

export default function CompliancePage() {
  const { activeRestaurantId, token } = useAuth();

  const { data: user, isLoading } = useRestaurantPortalMe({
    query: {
      enabled: !!token,
      queryKey: getRestaurantPortalMeQueryKey(),
      retry: false,
    },
  });

  if (!activeRestaurantId) return null;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const restaurantIndex = user?.restaurantIds.indexOf(activeRestaurantId) ?? 0;
  const restaurantName = user?.restaurantNames[restaurantIndex] ?? "—";
  const kyc = { ...MOCK_KYC, tradeName: restaurantName };

  const blockers = [
    !kyc.gstin && "GSTIN not provided",
    !kyc.pan && "PAN not provided",
    !kyc.fssai && "FSSAI licence not provided",
    !kyc.bankVerified && "Bank account not verified",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Profile</h1>
        <p className="text-muted-foreground mt-1">
          KYC, GST registration, bank details, and settlement configuration. Payouts are paused until
          all mandatory fields are verified.
        </p>
      </div>

      {/* Warning banner */}
      {blockers.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Payouts paused — profile incomplete</p>
            <p className="text-sm text-red-700 mt-1">
              The following must be completed before settlements can be processed:
            </p>
            <ul className="mt-2 space-y-1">
              {blockers.map((b) => (
                <li key={b} className="text-sm text-red-700 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> {b}
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-2">
              Contact your account manager or email compliance@mealpass.in to submit documents.
            </p>
          </div>
        </div>
      )}

      {/* Status overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "GSTIN",
            status: kyc.gstin ? "verified" : ("missing" as FieldStatus),
            icon: FileText,
          },
          {
            label: "FSSAI Licence",
            status: kyc.fssai ? "verified" : ("missing" as FieldStatus),
            icon: ShieldCheck,
          },
          {
            label: "Bank Account",
            status: kyc.bankVerified ? "verified" : ("pending" as FieldStatus),
            icon: CreditCard,
          },
          {
            label: "Agreement",
            status: kyc.agreementSigned ? "verified" : ("missing" as FieldStatus),
            icon: CheckCircle2,
          },
        ].map(({ label, status, icon: Icon }) => (
          <Card key={label} className="bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  status === "verified"
                    ? "bg-green-50"
                    : status === "pending"
                      ? "bg-amber-50"
                      : "bg-red-50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    status === "verified"
                      ? "text-green-600"
                      : status === "pending"
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <StatusBadge status={status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business & GST */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4 text-primary" /> Business & GST Details
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-6">
            <ProfileRow label="Legal Business Name" value={kyc.legalName} />
            <ProfileRow label="Trade Name" value={kyc.tradeName} />
            <ProfileRow
              label="GSTIN"
              value={kyc.gstin ?? "Not provided"}
              status={kyc.gstin ? "verified" : "missing"}
            />
            <ProfileRow
              label="PAN"
              value={kyc.pan ?? "Not provided"}
              status={kyc.pan ? "verified" : "missing"}
            />
            <ProfileRow
              label="FSSAI Licence Number"
              value={kyc.fssai ?? "Not provided"}
              status={kyc.fssai ? "verified" : "missing"}
            />
            <ProfileRow label="Registered Address" value={kyc.registeredAddress} />
            <ProfileRow label="Restaurant Type" value={kyc.restaurantType} />
            <ProfileRow label="Composition Taxpayer" value={kyc.compositionTaxpayer} />
            <ProfileRow
              label="GST Registered"
              value={kyc.gstRegistered ? "Yes" : "No"}
              status={kyc.gstRegistered ? "verified" : "missing"}
            />
          </CardContent>
        </Card>

        {/* Bank & Settlement */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4 text-primary" /> Bank Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border px-6">
              <ProfileRow label="Account Holder Name" value={kyc.bankHolder} />
              <ProfileRow label="Bank Name" value={kyc.bankName} />
              <ProfileRow label="Account Number" value={kyc.accountNumber} />
              <ProfileRow label="IFSC Code" value={kyc.ifsc} />
              <ProfileRow label="UPI ID (optional)" value={kyc.upiId} />
              <ProfileRow
                label="Verification Status"
                value={kyc.bankVerified ? "Verified" : "Pending verification"}
                status={kyc.bankVerified ? "verified" : "pending"}
              />
            </CardContent>
          </Card>

          {/* Tax & Settlement Config */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-4 h-4 text-primary" /> Tax & Settlement Config
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border px-6">
              <ProfileRow label="Settlement Cycle" value={kyc.settlementCycle} />
              <ProfileRow label="Invoice Responsibility" value={kyc.invoiceResponsibility} />
              <ProfileRow label="Tax Classification" value={kyc.taxClassification} />
              <ProfileRow label="HSN/SAC Code" value={kyc.sacCode} />
              <ProfileRow
                label="Platform Agreement"
                value={kyc.agreementSigned ? "Signed" : "Not signed"}
                status={kyc.agreementSigned ? "verified" : "missing"}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Regulatory note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800 leading-relaxed">
          <span className="font-semibold">Regulatory note:</span> Meal Pass operates as an
          e-commerce operator (ECO) under Section 9(5) of the CGST Act. GST on restaurant services
          supplied through the platform is discharged by the platform, not the restaurant. The
          restaurant receives a net settlement after platform commission. A separate commission
          invoice (with 18% GST on commission) is issued by the platform to the restaurant. Your CA
          should verify the applicable SAC code and confirm the correct tax treatment before filing.
        </p>
      </div>
    </div>
  );
}
