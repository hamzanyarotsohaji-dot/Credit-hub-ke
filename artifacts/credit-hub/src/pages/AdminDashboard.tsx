import { useAdminDashboard, getAdminDashboardQueryKey } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Activity, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";

export function AdminDashboard() {
  const { data: dashboard, isLoading } = useAdminDashboard();

  if (isLoading || !dashboard) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const statCards = [
    {
      title: "Mauzo Leo (Sales)",
      value: formatCurrency(dashboard.salesTodayAmount),
      subtext: `${dashboard.salesTodayCount} transactions`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Faida Leo (Profit)",
      value: formatCurrency(dashboard.profitToday),
      subtext: "Estimated margin",
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Wateja (Users)",
      value: dashboard.totalUsers.toLocaleString(),
      subtext: `+${dashboard.newUsersToday} today`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Transactions",
      value: dashboard.paidCount.toLocaleString(),
      subtext: `${dashboard.pendingCount} pending`,
      icon: ShoppingCart,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  const chartData = dashboard.salesByType.map(item => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    amount: item.amount,
    count: item.count
  }));

  const COLORS = ['#00A651', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales by Type (Amount)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 14 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dx={-10} tickFormatter={(val) => `KSh ${val}`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${formatCurrency(value)}`, 'Sales']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.recentTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center pb-4 border-b last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{tx.bundleName}</p>
                    <p className="text-xs text-muted-foreground">{tx.userPhone} → {tx.recipientPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(tx.amount)}</p>
                    <p className="text-xs font-medium capitalize" 
                      style={{ color: tx.status === 'paid' ? '#00A651' : tx.status === 'failed' ? '#ef4444' : '#f59e0b' }}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
              {dashboard.recentTransactions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No recent transactions.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}