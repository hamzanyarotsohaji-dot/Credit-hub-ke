import { useState } from "react";
import { useLocation } from "wouter";
import { useListBundles, getListBundlesQueryKey } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Wifi, Phone, MessageSquare, Package, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"all" | "airtime" | "data" | "sms" | "minutes">("all");
  const { data: bundles, isLoading } = useListBundles({ type: activeTab === "all" ? undefined : activeTab });

  const getIcon = (type: string) => {
    switch (type) {
      case "data": return <Wifi className="w-5 h-5" />;
      case "airtime": return <Phone className="w-5 h-5" />;
      case "sms": return <MessageSquare className="w-5 h-5" />;
      case "minutes": return <Clock className="w-5 h-5" />;
      default: return null;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "data": return "bg-blue-100 text-blue-600";
      case "airtime": return "bg-green-100 text-green-600";
      case "sms": return "bg-purple-100 text-purple-600";
      case "minutes": return "bg-amber-100 text-amber-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nunua Bundles</h1>
        <p className="text-gray-500 text-sm mt-1">Get airtime, data & SMS instantly via M-Pesa.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="airtime">Airtime</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="minutes">Mins</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : bundles && bundles.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {bundles.map((bundle, index) => (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setLocation(`/buy/${bundle.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getColor(bundle.type)}`}>
                      {getIcon(bundle.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{bundle.name}</h3>
                      <div className="text-sm text-gray-500 font-medium">{bundle.amount}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="font-bold text-lg text-primary">{formatCurrency(bundle.sellingPrice)}</div>
                    <Button size="sm" className="mt-1 h-8 px-4 rounded-full font-medium" onClick={(e) => { e.stopPropagation(); setLocation(`/buy/${bundle.id}`); }}>
                      Nunua
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Bundles Found</h3>
          <p className="text-gray-500 max-w-[250px] mt-2">We couldn't find any active bundles in this category.</p>
        </div>
      )}
    </div>
  );
}