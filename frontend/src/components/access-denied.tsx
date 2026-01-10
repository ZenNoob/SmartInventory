'use client';

import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function AccessDenied({
  title = 'Truy cập bị từ chối',
  description = 'Bạn không có quyền truy cập trang này.',
  showBackButton = true,
  showHomeButton = true,
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>
            Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị viên để được cấp quyền truy cập.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          {showBackButton && (
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          )}
          {showHomeButton && (
            <Button onClick={() => router.push('/dashboard')}>
              <Home className="mr-2 h-4 w-4" />
              Trang chủ
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
