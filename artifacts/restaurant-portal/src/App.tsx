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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />

      <Route path="/dashboard">
        <AppLayout>
          <Overview />
        </AppLayout>
      </Route>

      <Route path="/dashboard/packages">
        <AppLayout>
          <Packages />
        </AppLayout>
      </Route>

      <Route path="/dashboard/upcoming-meals">
        <AppLayout>
          <UpcomingMeals />
        </AppLayout>
      </Route>

      <Route path="/dashboard/cancellations">
        <AppLayout>
          <Cancellations />
        </AppLayout>
      </Route>

      <Route path="/dashboard/settlements">
        <AppLayout>
          <Settlements />
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
