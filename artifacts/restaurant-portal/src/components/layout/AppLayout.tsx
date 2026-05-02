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
  SidebarHeader
} from "@/components/ui/sidebar";
import { LayoutDashboard, Package, UtensilsCrossed, XCircle, DollarSign, LogOut, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Packages", url: "/dashboard/packages", icon: Package },
  { title: "Daily Prep", url: "/dashboard/upcoming-meals", icon: UtensilsCrossed },
  { title: "Cancellations", url: "/dashboard/cancellations", icon: XCircle },
  { title: "Settlements", url: "/dashboard/settlements", icon: DollarSign },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, setToken, activeRestaurantId, setActiveRestaurantId } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: user, isLoading, isError } = useRestaurantPortalMe({
    query: {
      enabled: !!token,
      queryKey: getRestaurantPortalMeQueryKey(),
      retry: false
    }
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
            <h2 className="text-lg font-bold tracking-tight text-primary">Partner Portal</h2>
            {user && user.restaurantIds.length > 0 && (
              <div className="mt-4">
                <Select value={activeRestaurantId || ""} onValueChange={setActiveRestaurantId}>
                  <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-accent-border text-sidebar-accent-foreground">
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
              </div>
            )}
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground font-semibold tracking-wider text-xs uppercase">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive(item.url)}
                      >
                        <Link href={item.url} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="p-4 mt-auto border-t border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-sidebar-foreground">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role.replace("_", " ")}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b border-border bg-card px-6">
            <SidebarTrigger className="text-foreground" />
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
