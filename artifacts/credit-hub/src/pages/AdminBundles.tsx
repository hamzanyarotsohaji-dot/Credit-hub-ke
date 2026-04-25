import { useState } from "react";
import { useAdminListBundles, useAdminCreateBundle, useAdminUpdateBundle, useAdminDeleteBundle, getAdminListBundlesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";

import { type Bundle } from "@workspace/api-client-react";

const bundleSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["airtime", "data", "sms"]),
  amount: z.string().min(1),
  sellingPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  active: z.boolean().default(true),
  validity: z.string().optional().nullable(),
});

export function AdminBundles() {
  const { data: bundles, isLoading } = useAdminListBundles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBundle = useAdminCreateBundle();
  const updateBundle = useAdminUpdateBundle();
  const deleteBundle = useAdminDeleteBundle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);

  const form = useForm<z.infer<typeof bundleSchema>>({
    resolver: zodResolver(bundleSchema),
    defaultValues: {
      name: "", type: "data", amount: "", sellingPrice: 0, costPrice: 0, active: true, validity: ""
    }
  });

  const openCreate = () => {
    setEditingBundle(null);
    form.reset({ name: "", type: "data", amount: "", sellingPrice: 0, costPrice: 0, active: true, validity: "" });
    setDialogOpen(true);
  };

  const openEdit = (bundle: Bundle) => {
    setEditingBundle(bundle);
    form.reset({
      name: bundle.name,
      type: bundle.type,
      amount: bundle.amount,
      sellingPrice: bundle.sellingPrice,
      costPrice: bundle.costPrice,
      active: bundle.active,
      validity: bundle.validity || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this bundle?")) {
      deleteBundle.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Bundle deleted" });
          queryClient.invalidateQueries({ queryKey: getAdminListBundlesQueryKey() });
        }
      });
    }
  };

  const onSubmit = (values: z.infer<typeof bundleSchema>) => {
    const data = { ...values, validity: values.validity || null };
    
    if (editingBundle) {
      updateBundle.mutate({ id: editingBundle.id, data }, {
        onSuccess: () => {
          toast({ title: "Bundle updated" });
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getAdminListBundlesQueryKey() });
        }
      });
    } else {
      createBundle.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Bundle created" });
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getAdminListBundlesQueryKey() });
        }
      });
    }
  };

  if (isLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Manage Bundles</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Bundle
        </Button>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Price / Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundles?.map((bundle) => (
              <TableRow key={bundle.id}>
                <TableCell className="font-medium">{bundle.name}</TableCell>
                <TableCell className="capitalize">{bundle.type}</TableCell>
                <TableCell>{bundle.amount}</TableCell>
                <TableCell>
                  <div className="font-medium text-primary">{formatCurrency(bundle.sellingPrice)}</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(bundle.costPrice)}</div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bundle.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {bundle.active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(bundle)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(bundle.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingBundle ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Bundle Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Daily 1GB" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="airtime">Airtime</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Amount</FormLabel>
                    <FormControl><Input placeholder="e.g. 1GB" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (KSh)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price (KSh)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="validity" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Validity (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. 24 Hours" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">Is this bundle visible in the shop?</div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createBundle.isPending || updateBundle.isPending}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}