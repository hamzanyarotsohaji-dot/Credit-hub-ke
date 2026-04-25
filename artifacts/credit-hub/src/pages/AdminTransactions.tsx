import { useState } from "react";
import { useAdminListTransactions } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function AdminTransactions() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "failed">("all");
  
  const { data: transactions, isLoading } = useAdminListTransactions({
    status: statusFilter === "all" ? undefined : statusFilter
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'paid': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'pending': return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'failed': return 'bg-red-100 text-red-800 hover:bg-red-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <div className="w-[180px]">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Bundle</TableHead>
              <TableHead>User / Payer</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>M-Pesa Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                </TableCell>
              </TableRow>
            ) : transactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{format(new Date(tx.createdAt), 'MMM d, yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), 'h:mm:ss a')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{tx.bundleName}</div>
                    <div className="text-xs uppercase text-muted-foreground">{tx.bundleType}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{tx.userPhone}</div>
                    {tx.userName && <div className="text-xs text-muted-foreground">{tx.userName}</div>}
                  </TableCell>
                  <TableCell className="font-medium">{tx.recipientPhone}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(tx.amount)}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(tx.status)} px-2 py-0.5 text-xs capitalize shadow-none border-none`}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">
                    {tx.mpesaCode || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}