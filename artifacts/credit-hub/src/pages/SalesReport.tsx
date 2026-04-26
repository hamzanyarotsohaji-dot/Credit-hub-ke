import { useState } from "react";
import { useAdminSalesReport } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, DollarSign, CheckCircle2, XCircle, Clock, Wifi, Phone, MessageSquare, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function typeIcon(type: string) {
  switch (type) {
    case "data": return <Wifi className="w-4 h-4" />;
    case "airtime": return <Phone className="w-4 h-4" />;
    case "sms": return <MessageSquare className="w-4 h-4" />;
    case "minutes": return <Clock className="w-4 h-4" />;
    default: return null;
  }
}

function typeColor(type: string) {
  switch (type) {
    case "data": return "bg-blue-100 text-blue-600";
    case "airtime": return "bg-green-100 text-green-600";
    case "sms": return "bg-purple-100 text-purple-600";
    case "minutes": return "bg-amber-100 text-amber-600";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function SalesReport() {
  const [date, setDate] = useState(todayIso());
  const { data: report, isLoading } = useAdminSalesReport({ date });

  function exportCsv() {
    if (!report) return;
    const lines: string[] = [];
    lines.push(`Sales Report,${report.date}`);
    lines.push("");
    lines.push("Metric,Value");
    lines.push(`Revenue,${report.revenue}`);
    lines.push(`Profit,${report.profit}`);
    lines.push(`Total Transactions,${report.transactionCount}`);
    lines.push(`Completed,${report.completedCount}`);
    lines.push(`Paid (awaiting delivery),${report.paidCount}`);
    lines.push(`Failed,${report.failedCount}`);
    lines.push(`Pending,${report.pendingCount}`);
    lines.push("");
    lines.push("By Type,Count,Revenue,Profit");
    report.byType.forEach((r) => lines.push(`${r.type},${r.count},${r.revenue},${r.profit}`));
    lines.push("");
    lines.push("Top Bundles,Type,Count,Revenue");
    report.topBundles.forEach((r) => lines.push(`${r.name},${r.type},${r.count},${r.revenue}`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${report.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !report) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const stats = [
    { title: "Mauzo (Revenue)", value: formatCurrency(report.revenue), icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { title: "Faida (Profit)", value: formatCurrency(report.profit), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "Zilizokamilika", value: report.completedCount.toString(), icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Zilizoshindwa", value: report.failedCount.toString(), icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  ];

  const hourChart = report.byHour.filter((h) => h.count > 0 || h.revenue > 0).map((h) => ({
    hour: `${String(h.hour).padStart(2, "0")}:00`,
    revenue: h.revenue,
    count: h.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Sales Report</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(report.date + "T00:00:00Z"), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="w-[160px]"
          />
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">{s.title}</p>
                <h3 className="text-xl font-bold">{s.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue by Hour</CardTitle></CardHeader>
          <CardContent>
            {hourChart.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No sales for this day yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hourChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="revenue" fill="#00A651" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <StatusRow label="Completed" count={report.completedCount} color="bg-green-500" />
            <StatusRow label="Paid (delivering)" count={report.paidCount} color="bg-blue-500" />
            <StatusRow label="Pending" count={report.pendingCount} color="bg-yellow-500" />
            <StatusRow label="Failed" count={report.failedCount} color="bg-red-500" />
            <div className="pt-2 border-t flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{report.transactionCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Sales by Type</CardTitle></CardHeader>
          <CardContent>
            {report.byType.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No sales.</div>
            ) : (
              <div className="space-y-3">
                {report.byType.map((r) => (
                  <div key={r.type} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${typeColor(r.type)}`}>
                        {typeIcon(r.type)}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{r.type}</div>
                        <div className="text-xs text-muted-foreground">{r.count} sales</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(r.revenue)}</div>
                      <div className="text-xs text-emerald-600">+{formatCurrency(r.profit)} faida</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Bundles</CardTitle></CardHeader>
          <CardContent>
            {report.topBundles.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No sales.</div>
            ) : (
              <div className="space-y-3">
                {report.topBundles.map((r, i) => (
                  <div key={r.bundleId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${typeColor(r.type)}`}>
                        {typeIcon(r.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.count} sold</div>
                      </div>
                    </div>
                    <div className="font-semibold">{formatCurrency(r.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {report.recentFailures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-red-600">Recent Failures</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.recentFailures.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.bundleName} → {t.recipientPhone}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(t.createdAt), "HH:mm")} · {t.userPhone}</div>
                  </div>
                  <div className="font-semibold text-red-600">{formatCurrency(t.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
      <span className="font-semibold">{count}</span>
    </div>
  );
}
