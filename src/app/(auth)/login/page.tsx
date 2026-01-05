'use client'

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface LoginResponse {
  success?: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    permissions: Record<string, string[]>;
    stores: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  };
  token?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // User is already logged in, redirect based on role
            if (data.user.role === 'salesperson') {
              router.push('/pos');
            } else {
              router.push('/dashboard');
            }
            return;
          }
        }
      } catch {
        // Not logged in, continue to show login form
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Đăng nhập thất bại');
        setIsLoading(false);
        return;
      }

      // Store user info in localStorage for client-side access
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect based on role
        if (data.user.role === 'salesperson') {
          router.push('/pos');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.');
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Đang tải...</span>
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Đăng nhập</CardTitle>
        <CardDescription>
          Nhập email của bạn dưới đây để đăng nhập vào tài khoản của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Mật khẩu</Label>
              <a href="#" className="ml-auto inline-block text-sm underline">
                Quên mật khẩu?
              </a>
            </div>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
