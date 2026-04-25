import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRequestOtp, useVerifyOtp, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizePhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Phone } from "lucide-react";

const phoneSchema = z.object({
  phone: z.string().min(9, "Enter a valid phone number").transform(normalizePhone),
});

const otpSchema = z.object({
  code: z.string().length(4, "OTP must be 4 digits"),
});

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
    requestOtp.mutate({ data: { phone: values.phone } }, {
      onSuccess: (res) => {
        setPhoneNumber(values.phone);
        setStep("otp");
        if (res.devOtp) {
          setDevOtp(res.devOtp);
          otpForm.setValue("code", res.devOtp);
        }
      },
      onError: (err: any) => {
        toast({
          title: "Failed to request OTP",
          description: err?.message || "Please try again",
          variant: "destructive"
        });
      }
    });
  }

  function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    verifyOtp.mutate({ data: { phone: phoneNumber, code: values.code } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/home");
      },
      onError: (err: any) => {
        toast({
          title: "Verification failed",
          description: err?.message || "Invalid OTP code",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <div className="min-h-[100dvh] max-w-md mx-auto bg-white flex flex-col px-6 py-12">
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Hub KE</h1>
          <p className="text-gray-500">Your everyday local credit kiosk.</p>
        </div>

        {step === "phone" ? (
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="07XX XXX XXX" type="tel" {...field} className="text-lg h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={requestOtp.isPending}>
                {requestOtp.isPending ? "Sending..." : "Login"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-8 flex flex-col items-center">
              <div className="text-center">
                <p className="text-gray-600 mb-2">We sent a 4-digit code to</p>
                <p className="font-medium">{phoneNumber}</p>
                <button type="button" onClick={() => setStep("phone")} className="text-primary text-sm font-medium mt-1">Change number</button>
              </div>

              <FormField
                control={otpForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <InputOTP maxLength={4} {...field}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-14 h-16 text-2xl" />
                          <InputOTPSlot index={1} className="w-14 h-16 text-2xl" />
                          <InputOTPSlot index={2} className="w-14 h-16 text-2xl" />
                          <InputOTPSlot index={3} className="w-14 h-16 text-2xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {devOtp && (
                <div className="bg-orange-50 text-orange-800 text-sm px-4 py-2 rounded-md border border-orange-200">
                  Dev OTP: {devOtp} (Auto-filled)
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-lg font-medium mt-4" disabled={verifyOtp.isPending}>
                {verifyOtp.isPending ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
