import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />

      <Route path="/dashboard/:rest*">
        <AppLayout>
          <Switch>
            <Route path="/dashboard" component={Overview} />
            <Route path="/dashboard/menu" component={Menu} />
            <Route path="/dashboard/packages" component={Packages} />
            <Route path="/dashboard/upcoming-meals" component={UpcomingMeals} />
            <Route path="/dashboard/cancellations" component={Cancellations} />
            <Route path="/dashboard/settlements" component={Settlements} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
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
