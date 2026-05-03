import { useAuth } from "@/lib/auth";
import { useRestaurantPortalMe, getRestaurantPortalMeQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  XCircle,
  DollarSign,
  LogOut,
  Loader2,
  ChefHat,
  FileText,
  ShieldCheck,
  Scale,
  BookOpen,
  Utensils,
} from "lucide-react";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ─── Navigation groups ────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
      { title: "Menu CMS", url: "/dashboard/menu", icon: ChefHat },
      { title: "Packages", url: "/dashboard/packages", icon: Package },
      { title: "Daily Prep", url: "/dashboard/upcoming-meals", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Cancellations", url: "/dashboard/cancellations", icon: XCircle },
      { title: "Settlements", url: "/dashboard/settlements", icon: DollarSign },
      { title: "Invoices & GST", url: "/dashboard/invoices", icon: FileText },
      { title: "Redemption Ledger", url: "/dashboard/redemptions", icon: BookOpen },
    ],
  },
  {
    label: "Compliance",
    items: [
      { title: "Compliance", url: "/dashboard/compliance", icon: ShieldCheck },
      { title: "Disputes", url: "/dashboard/disputes", icon: Scale },
    ],
  },
];

// ─── Page title mapping ───────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/menu": "Menu CMS",
  "/dashboard/packages": "Packages",
  "/dashboard/upcoming-meals": "Daily Prep",
  "/dashboard/cancellations": "Cancellations",
  "/dashboard/settlements": "Settlements",
  "/dashboard/invoices": "Invoices & GST",
  "/dashboard/disputes": "Disputes",
  "/dashboard/compliance": "Compliance",
  "/dashboard/redemptions": "Redemption Ledger",
};

function getPageTitle(location: string): string {
  // Exact match first
  if (PAGE_TITLES[location]) return PAGE_TITLES[location];
  // Prefix match
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (location.startsWith(path) && path !== "/dashboard") return title;
  }
  return "Partner Portal";
}

// ─── Date utils ───────────────────────────────────────────────────────────────

function formatHeaderDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, setToken, activeRestaurantId, setActiveRestaurantId } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: user, isLoading, isError } = useRestaurantPortalMe({
    query: {
      enabled: !!token,
      queryKey: getRestaurantPortalMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (!token || isError) {
      setToken(null);
      setLocation("/login");
    }
  }, [token, isError, setLocation, setToken]);

  useEffect(() => {
    if (user && user.restaurantIds.length > 0 && !activeRestaurantId) {
      setActiveRestaurantId(user.restaurantIds[0]);
    }
  }, [user, activeRestaurantId, setActiveRestaurantId]);

  if (!token) return null;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Utensils className="w-5 h-5 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const logout = () => {
    setToken(null);
    setActiveRestaurantId(null);
    setLocation("/login");
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return location === "/dashboard";
    return location.startsWith(url);
  };

  const pageTitle = getPageTitle(location);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* ── Sidebar ── */}
        <Sidebar className="border-r border-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
            {/* Brand */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Utensils className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">
                  Partner Portal
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">by Meal Pass</p>
              </div>
            </div>

            {/* Restaurant selector */}
            {user && user.restaurantIds.length > 0 && (
              <Select value={activeRestaurantId || ""} onValueChange={setActiveRestaurantId}>
                <SelectTrigger className="w-full h-9 text-sm bg-sidebar-accent/60 border-sidebar-border">
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {user.restaurantIds.map((id, index) => (
                    <SelectItem key={id} value={id}>
                      {user.restaurantNames[index]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </SidebarHeader>

          <SidebarContent className="py-2">
            {NAV_GROUPS.map((group, gi) => (
              <SidebarGroup key={group.label} className={gi > 0 ? "pt-1" : ""}>
                <SidebarGroupLabel className="text-muted-foreground font-semibold tracking-wider text-[10px] uppercase px-3">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isActive(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            tooltip={item.title}
                            isActive={active}
                            className={active ? "font-medium" : ""}
                          >
                            <Link href={item.url} className="flex items-center gap-3">
                              <item.icon className="w-4 h-4" />
                              <span className="text-sm">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
                {gi < NAV_GROUPS.length - 1 && <SidebarSeparator className="mt-1" />}
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* User footer */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(user?.name ?? "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize leading-tight">
                  {user?.role.replace(/_/g, " ")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Sidebar>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          {/* Header */}
          <header className="flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-6 sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">{pageTitle}</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:block">{formatHeaderDate()}</span>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
