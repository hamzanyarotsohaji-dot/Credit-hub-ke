import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ListOrdered, Users, BarChart3 } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();

  const tabs = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Bundles", href: "/admin/bundles", icon: Package },
    { name: "Transactions", href: "/admin/transactions", icon: ListOrdered },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
    { name: "Users", href: "/admin/users", icon: Users },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-lg tracking-tight flex items-center gap-2">
            <span>Credit Hub Admin</span>
          </div>
          <Link href="/home" className="text-sm font-medium hover:underline text-primary-foreground/80">
            Exit Admin
          </Link>
        </div>
        <div className="max-w-6xl mx-auto px-2 flex overflow-x-auto hide-scrollbar border-t border-primary-foreground/10">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                location === tab.href ? "border-b-2 border-white text-white" : "text-primary-foreground/70 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
