import { useLocation } from "wouter";
import { useListMyTransactions } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { format, isToday, isThisWeek } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Wallet as WalletIcon, ReceiptText } from "lucide-react";
import { type Transaction } from "@workspace/api-client-react";

export function Wallet() {
  const [, setLocation] = useLocation();
  const { data: transactions, isLoading } = useListMyTransactions();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const sortedTransactions = [...(transactions || [])].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const today = sortedTransactions.filter(t => isToday(new Date(t.createdAt)));
  const thisWeek = sortedTransactions.filter(t => !isToday(new Date(t.createdAt)) && isThisWeek(new Date(t.createdAt)));
  const older = sortedTransactions.filter(t => !isToday(new Date(t.createdAt)) && !isThisWeek(new Date(t.createdAt)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const TransactionGroup = ({ title, txs }: { title: string, txs: Transaction[] }) => {
    if (txs.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{title}</h3>
        <div className="space-y-3">
          {txs.map(tx => (
            <Card key={tx.id} className="overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setLocation(`/transactions/${tx.id}`)}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900">{tx.bundleName}</div>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      <ArrowRight className="w-3 h-3 mr-1 inline" /> {tx.recipientPhone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatCurrency(tx.amount)}</div>
                    <div className="text-xs text-gray-400 mt-1">{format(new Date(tx.createdAt), 'h:mm a')}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-1">
                  <Badge variant="outline" className={`${getStatusColor(tx.status)} px-2 py-0.5 text-xs capitalize`}>
                    {tx.status}
                  </Badge>
                  {tx.mpesaCode && tx.status === 'paid' && (
                    <span className="text-xs font-mono text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                      {tx.mpesaCode}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 p-4 pb-20">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet History</h1>
          <p className="text-gray-500 text-sm mt-1">Your recent purchases and top-ups.</p>
        </div>
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <ReceiptText className="w-5 h-5 text-primary" />
        </div>
      </div>

      {sortedTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-10 mt-10">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <WalletIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Transactions Yet</h3>
          <p className="text-gray-500 max-w-[250px] mt-2 mb-6">You haven't made any purchases. Head to home to buy your first bundle.</p>
          <button onClick={() => setLocation("/home")} className="bg-primary text-white font-medium px-6 py-2.5 rounded-full">
            Browse Bundles
          </button>
        </div>
      ) : (
        <>
          <TransactionGroup title="Today" txs={today} />
          <TransactionGroup title="This Week" txs={thisWeek} />
          <TransactionGroup title="Older" txs={older} />
        </>
      )}
    </div>
  );
}