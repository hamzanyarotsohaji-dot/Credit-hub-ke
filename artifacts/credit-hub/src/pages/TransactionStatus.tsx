import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetTransaction, getGetTransactionQueryKey } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, ArrowLeft, RefreshCw } from "lucide-react";

export function TransactionStatus() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const txId = Number(id);

  const { data: transaction, isLoading, refetch } = useGetTransaction(txId, { 
    query: { 
      enabled: !!txId, 
      queryKey: getGetTransactionQueryKey(txId), 
      refetchInterval: (query) => query.state.data?.status === 'pending' ? 3000 : false 
    } 
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-[80vh]">
        <RefreshCw className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-bold">Loading transaction...</h2>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-[80vh] p-6 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Transaction Not Found</h2>
        <Button onClick={() => setLocation("/home")} className="mt-4">Return Home</Button>
      </div>
    );
  }

  const isPending = transaction.status === 'pending';
  const isPaid = transaction.status === 'paid';
  const isFailed = transaction.status === 'failed';

  return (
    <div className="flex flex-col flex-1 p-4 pb-20 bg-gray-50 min-h-[100dvh]">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation("/home")} className="p-2 -ml-2 rounded-full hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Transaction Status</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-8 mb-4">
        {isPending && (
          <>
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 border-4 border-amber-400 rounded-full border-t-transparent animate-spin"></div>
              <Clock className="w-12 h-12 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting for Payment</h2>
            <p className="text-gray-500 text-center max-w-[280px]">
              Please check your phone and enter your M-Pesa PIN to complete the transaction.
            </p>
          </>
        )}

        {isPaid && (
          <>
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-14 h-14 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 text-center max-w-[280px]">
              Your bundle has been processed successfully.
            </p>
            {transaction.mpesaCode && (
              <div className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-mono font-bold tracking-widest text-lg border border-gray-200">
                {transaction.mpesaCode}
              </div>
            )}
          </>
        )}

        {isFailed && (
          <>
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-14 h-14 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-500 text-center max-w-[280px]">
              The transaction was cancelled or timed out. You have not been charged.
            </p>
          </>
        )}
      </div>

      <Card className="border-gray-200 shadow-sm mt-auto mb-6">
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between items-center p-4">
              <span className="text-gray-500">Item</span>
              <span className="font-semibold text-gray-900">{transaction.bundleName}</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-gray-500">Recipient</span>
              <span className="font-semibold text-gray-900">{transaction.recipientPhone}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50/50">
              <span className="text-gray-600 font-medium">Amount</span>
              <span className="font-bold text-lg text-gray-900">{formatCurrency(transaction.amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isPending && (
        <Button variant="outline" onClick={() => refetch()} className="w-full h-12 font-medium mb-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Check Status
        </Button>
      )}

      {(isPaid || isFailed) && (
        <Button onClick={() => setLocation("/home")} className="w-full h-14 text-lg font-bold rounded-xl">
          Return to Home
        </Button>
      )}
    </div>
  );
}