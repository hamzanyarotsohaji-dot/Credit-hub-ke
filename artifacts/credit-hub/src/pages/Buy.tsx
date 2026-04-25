import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useListBundles, useMpesaStkPush, useGetMe } from "@workspace/api-client-react";
import { normalizePhone, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Smartphone } from "lucide-react";

const buySchema = z.object({
  recipientPhone: z.string().min(9, "Enter a valid phone number").transform(normalizePhone),
  payerPhone: z.string().min(9, "Enter a valid M-Pesa number").transform(normalizePhone),
});

export function Buy() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: meData } = useGetMe();
  const user = meData?.user;

  const { data: bundles, isLoading: bundlesLoading } = useListBundles();
  const bundle = bundles?.find(b => b.id === Number(bundleId));

  const mpesaStkPush = useMpesaStkPush();
  const [forSomeoneElse, setForSomeoneElse] = useState(false);

  const form = useForm<z.infer<typeof buySchema>>({
    resolver: zodResolver(buySchema),
    defaultValues: { 
      recipientPhone: user?.phone || "", 
      payerPhone: user?.phone || "" 
    },
  });

  useEffect(() => {
    if (user?.phone) {
      if (!form.getValues("payerPhone")) form.setValue("payerPhone", user.phone);
      if (!form.getValues("recipientPhone")) form.setValue("recipientPhone", user.phone);
    }
  }, [user, form]);

  useEffect(() => {
    if (!forSomeoneElse && user?.phone) {
      form.setValue("recipientPhone", user.phone);
    }
  }, [forSomeoneElse, user, form]);

  function onSubmit(values: z.infer<typeof buySchema>) {
    if (!bundle) return;
    
    mpesaStkPush.mutate({ 
      data: { 
        bundleId: bundle.id,
        recipientPhone: values.recipientPhone,
        payerPhone: values.payerPhone
      } 
    }, {
      onSuccess: (res) => {
        toast({
          title: "M-Pesa Prompt Sent!",
          description: "Please check your phone and enter your PIN to complete the purchase.",
        });
        setLocation(`/transactions/${res.transactionId}`);
      },
      onError: (err: any) => {
        toast({
          title: "Request failed",
          description: err?.message || "Could not initiate M-Pesa payment",
          variant: "destructive"
        });
      }
    });
  }

  if (bundlesLoading) {
    return <div className="flex h-full flex-1 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!bundle) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Bundle Not Found</h2>
        <Button onClick={() => setLocation("/home")}>Back to Shop</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 pb-20 bg-gray-50">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation("/home")} className="p-2 -ml-2 rounded-full hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Purchase Detail</h1>
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-sm text-primary font-medium uppercase tracking-wider mb-1">{bundle.type}</div>
              <h2 className="text-2xl font-bold text-gray-900">{bundle.name}</h2>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Amount</div>
              <div className="font-bold text-xl">{bundle.amount}</div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-primary/10 flex justify-between items-center">
            <span className="text-gray-600 font-medium">Total to Pay</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(bundle.sellingPrice)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
        <div>
          <h3 className="font-semibold text-gray-900">Buy for someone else?</h3>
          <p className="text-sm text-gray-500">Send to another number</p>
        </div>
        <Switch checked={forSomeoneElse} onCheckedChange={setForSomeoneElse} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
          {forSomeoneElse && (
            <FormField
              control={form.control}
              name="recipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input placeholder="07XX XXX XXX" type="tel" className="pl-10 h-12 text-lg" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="payerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>M-Pesa Number (Paying)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input placeholder="07XX XXX XXX" type="tel" className="pl-10 h-12 text-lg" {...field} />
                  </div>
                </FormControl>
                <p className="text-xs text-gray-500 mt-1">This number will receive the M-Pesa PIN prompt.</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-auto pt-6">
            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl shadow-md" disabled={mpesaStkPush.isPending}>
              {mpesaStkPush.isPending ? "Initiating..." : `Lipa na M-Pesa ${formatCurrency(bundle.sellingPrice)}`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}