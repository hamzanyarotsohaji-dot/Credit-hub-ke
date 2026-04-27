import { z } from "zod";
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Weka email valid"),
  password: z.string().min(6, "Password lazima iwe 6+ characters"),
  mpesaNumber: z.string().min(10, "Weka namba ya M-Pesa").optional(),
});

export function Login() {
  const [, setLocation] = useLocation();
  const [isSignup, setIsSignup] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "", mpesaNumber: "" },
  });

  const onSubmit = async (values: z.infer<typeof authSchema>) => {
    try {
      const endpoint = isSignup ? '/api/signup' : '/api/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed');
      }
      
      const data = await res.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({ title: isSignup ? "Account Created!" : "Login Success!" });
      setLocation('/');
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Check email ama password", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isSignup ? "Create Account" : "Login"} - Credit Hub KE
        </h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input {...field} type="email" placeholder="you@gmail.com" className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input {...field} type="password" placeholder="******" className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSignup && (
              <FormField
                control={form.control}
                name="mpesaNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>M-Pesa Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input {...field} placeholder="0712345678" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              {isSignup ? "Create Account" : "Login"}
            </Button>
          </form>
        </Form>

        <p className="text-center mt-4 text-sm text-gray-600">
          {isSignup ? "Uko na account? " : "Huna account? "}
          <button 
            onClick={() => setIsSignup(!isSignup)} 
            className="text-blue-600 font-semibold hover:underline"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}