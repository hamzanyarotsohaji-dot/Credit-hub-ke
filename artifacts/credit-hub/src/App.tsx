import { useGetMe } from "@workspace/api-client-react";
import { useLocation, Route, Switch } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Login } from "@/pages/Login";
import { Home } from "@/pages/Home";
import { Buy } from "@/pages/Buy";
import { TransactionStatus } from "@/pages/TransactionStatus";
import { Wallet } from "@/pages/Wallet";
import { Profile } from "@/pages/Profile";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminBundles } from "@/pages/AdminBundles";
import { AdminTransactions } from "@/pages/AdminTransactions";
import { AdminUsers } from "@/pages/AdminUsers";
import { SalesReport } from "@/pages/SalesReport";

function GuardedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const [location, setLocation] = useLocation();
  const { data: meData, isLoading } = useGetMe();

  useEffect(() => {
    if (!isLoading && !meData?.user && location !== "/") {
      setLocation("/");
    }
  }, [meData, isLoading, location, setLocation]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!meData?.user) {
    return null; // Will redirect in useEffect
  }

  if (adminOnly && !meData.user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">You don't have permission to view this page.</p>
        <button onClick={() => setLocation("/home")} className="bg-primary text-white px-6 py-3 rounded-lg font-medium">Return Home</button>
      </div>
    );
  }

  return <Component />;
}

export default function App() {
  const [location, setLocation] = useLocation();
  const { data: meData, isLoading } = useGetMe();

  useEffect(() => {
    if (!isLoading && meData?.user && location === "/") {
      setLocation("/home");
    }
  }, [meData, isLoading, location, setLocation]);

  if (isLoading && location === "/") {
    return <div className="flex h-[100dvh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <Switch>
      <Route path="/" component={Login} />
      
      {/* App Routes */}
      <Route path="/home">
        {() => (
          <AppLayout>
            <GuardedRoute component={Home} />
          </AppLayout>
        )}
      </Route>
      <Route path="/buy/:bundleId">
        {() => (
          <AppLayout>
            <GuardedRoute component={Buy} />
          </AppLayout>
        )}
      </Route>
      <Route path="/transactions/:id">
        {() => (
          <AppLayout>
            <GuardedRoute component={TransactionStatus} />
          </AppLayout>
        )}
      </Route>
      <Route path="/wallet">
        {() => (
          <AppLayout>
            <GuardedRoute component={Wallet} />
          </AppLayout>
        )}
      </Route>
      <Route path="/profile">
        {() => (
          <AppLayout>
            <GuardedRoute component={Profile} />
          </AppLayout>
        )}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        {() => (
          <AdminLayout>
            <GuardedRoute component={AdminDashboard} adminOnly />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/bundles">
        {() => (
          <AdminLayout>
            <GuardedRoute component={AdminBundles} adminOnly />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/transactions">
        {() => (
          <AdminLayout>
            <GuardedRoute component={AdminTransactions} adminOnly />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/reports">
        {() => (
          <AdminLayout>
            <GuardedRoute component={SalesReport} adminOnly />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/users">
        {() => (
          <AdminLayout>
            <GuardedRoute component={AdminUsers} adminOnly />
          </AdminLayout>
        )}
      </Route>
    </Switch>
  );
}