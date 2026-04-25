import { useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, useUpdateMyProfile, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User as UserIcon, Copy, LogOut, CheckCircle2, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: meData } = useGetMe();
  const user = meData?.user;
  
  const updateProfile = useUpdateMyProfile();
  const logout = useLogout();

  const [name, setName] = useState(user?.name || "");
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const isAdmin = !!user.isAdmin;

  const handleSaveName = () => {
    updateProfile.mutate({ data: { name } }, {
      onSuccess: () => {
        toast({ title: "Profile updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err?.message, variant: "destructive" });
      }
    });
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 p-4 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your account details.</p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
          {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon />}
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-500 text-xs uppercase tracking-wider">Phone Number</Label>
                <div className="font-medium text-lg mt-1">{user.phone}</div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <Label className="text-gray-500 text-xs uppercase tracking-wider">Display Name</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your name" 
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSaveName} 
                    disabled={name === (user.name || "") || updateProfile.isPending}
                    variant="secondary"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <Label className="text-gray-500 text-xs uppercase tracking-wider">Wallet Balance</Label>
                <div className="font-bold text-2xl text-primary mt-1">{formatCurrency(user.balance)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900">Refer a Friend</h3>
                <p className="text-sm text-gray-600 mt-1">Share your code and earn KSh 50 when they make their first purchase.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 bg-white p-2 rounded-lg border border-gray-200">
              <div className="flex-1 text-center font-mono font-bold tracking-widest text-lg text-primary">
                {user.referralCode}
              </div>
              <Button size="icon" variant="ghost" onClick={copyReferral} className="h-10 w-10 shrink-0">
                {copied ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-500" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Button 
            variant="outline" 
            className="w-full h-12 border-primary text-primary hover:bg-primary hover:text-white"
            onClick={() => setLocation("/admin")}
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Button>
        )}

        <Button 
          variant="ghost" 
          className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}