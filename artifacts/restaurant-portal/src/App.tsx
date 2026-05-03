import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/login";
import Overview from "@/pages/dashboard/overview";
import Packages from "@/pages/dashboard/packages";
import UpcomingMeals from "@/pages/dashboard/upcoming-meals";
import Cancellations from "@/pages/dashboard/cancellations";
import Settlements from "@/pages/dashboard/settlements";
import Menu from "@/pages/dashboard/menu";
import InvoicesGst from "@/pages/dashboard/invoices";
import CompliancePage from "@/pages/dashboard/compliance";
import Disputes from "@/pages/dashboard/disputes";

const queryClient = new QueryClient();

function RootRedirect() {
  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.location.replace(`${base}/dashboard`);
  }, []);
  return null;
}

function DashboardPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={RootRedirect} />
      <Route path="/dashboard">
        <DashboardPage component={Overview} />
      </Route>
      <Route path="/dashboard/menu">
        <DashboardPage component={Menu} />
      </Route>
      <Route path="/dashboard/packages">
        <DashboardPage component={Packages} />
      </Route>
      <Route path="/dashboard/upcoming-meals">
        <DashboardPage component={UpcomingMeals} />
      </Route>
      <Route path="/dashboard/cancellations">
        <DashboardPage component={Cancellations} />
      </Route>
      <Route path="/dashboard/settlements">
        <DashboardPage component={Settlements} />
      </Route>
      <Route path="/dashboard/invoices">
        <DashboardPage component={InvoicesGst} />
      </Route>
      <Route path="/dashboard/disputes">
        <DashboardPage component={Disputes} />
      </Route>
      <Route path="/dashboard/compliance">
        <DashboardPage component={CompliancePage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
