import { Link, useLocation } from "wouter";
import { Home, Wallet, User as UserIcon } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

export function AppLayout({ children, hideHeader }: AppLayoutProps) {
  const [location] = useLocation();
  const { data: meData } = useGetMe();
  const user = meData?.user;

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-gray-50 border-x border-gray-200 relative pb-16">
      {!hideHeader && (
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-primary text-primary-foreground shadow-sm">
          <div className="font-bold text-lg tracking-tight">Credit Hub KE</div>
          {user && (
            <div className="flex flex-col items-end">
              <span className="text-xs opacity-90">Balance</span>
              <span className="font-semibold">{formatCurrency(user.balance)}</span>
            </div>
          )}
        </header>
      )}

      <main className="flex-1 flex flex-col">{children}</main>

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex items-center justify-around pb-safe z-50">
        <Link href="/home" className={`flex flex-col items-center py-3 px-6 ${location === "/home" ? "text-primary" : "text-gray-500"}`}>
          <Home className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Home</span>
        </Link>
        <Link href="/wallet" className={`flex flex-col items-center py-3 px-6 ${location === "/wallet" ? "text-primary" : "text-gray-500"}`}>
          <Wallet className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Wallet</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center py-3 px-6 ${location === "/profile" ? "text-primary" : "text-gray-500"}`}>
          <UserIcon className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
