

'use client'

import * as React from 'react'
import { useEffect, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { upsertThemeSettings, recalculateAllLoyaltyPoints, deleteAllTransactionalData, backupAllTransactionalData } from './actions'
import type { ThemeSettings, LoyaltySettings } from '@/lib/types'
import { hexToHsl, hslToHex } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, FileDown, Loader2, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const loyaltyTierSchema = z.object({
  name: z.enum(['bronze', 'silver', 'gold', 'diamond']),
  vietnameseName: z.string(),
  threshold: z.coerce.number().min(0, "Ngưỡng điểm phải là số không âm."),
});

const loyaltySettingsSchema = z.object({
  pointsPerAmount: z.coerce.number().min(1, "Giá trị phải lớn hơn 0."),
  pointsToVndRate: z.coerce.number().min(0, "Giá trị phải là số không âm."),
  tiers: z.array(loyaltyTierSchema),
});


const themeFormSchema = z.object({
  primary: z.string().min(1, "Bắt buộc"),
  primaryForeground: z.string().min(1, "Bắt buộc"),
  background: z.string().min(1, "Bắt buộc"),
  foreground: z.string().min(1, "Bắt buộc"),
  accent: z.string().min(1, "Bắt buộc"),
  accentForeground: z.string().min(1, "Bắt buộc"),
  lowStockThreshold: z.coerce.number().min(0, "Ngưỡng phải là số dương."),
  vatRate: z.coerce.number().min(0, "Tỷ lệ VAT phải là số không âm.").optional(),
  companyName: z.string().optional(),
  companyBusinessLine: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  loyalty: loyaltySettingsSchema.optional(),
});

type ThemeFormValues = z.infer<typeof themeFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [isRecalculating, startRecalculatingTransition] = useTransition();
  const [isDeletingData, startDataDeletionTransition] = useTransition();
  const [isBackingUp, startBackupTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);


  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'theme');
  }, [firestore]);

  const { data: themeSettings, isLoading } = useDoc<ThemeSettings>(settingsRef);
  
  const defaultLoyaltySettings: LoyaltySettings = {
    pointsPerAmount: 100000, // 100,000 VND for 1 point
    pointsToVndRate: 1000, // 1 point = 1,000 VND
    tiers: [
      { name: 'bronze', vietnameseName: 'Đồng', threshold: 0 },
      { name: 'silver', vietnameseName: 'Bạc', threshold: 50 },
      { name: 'gold', vietnameseName: 'Vàng', threshold: 200 },
      { name: 'diamond', vietnameseName: 'Kim Cương', threshold: 500 },
    ],
  };

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      primary: '#ff6600',
      primaryForeground: '#111827',
      background: '#f2f5f9',
      foreground: '#111827',
      accent: '#ff6600',
      accentForeground: '#111827',
      lowStockThreshold: 10,
      vatRate: 0,
      companyName: '',
      companyBusinessLine: '',
      companyAddress: '',
      companyPhone: '',
      loyalty: defaultLoyaltySettings
    },
  });

  const { fields: tierFields } = useFieldArray({
    control: form.control,
    name: "loyalty.tiers",
  });
  
  useEffect(() => {
    if (themeSettings) {
      form.reset({
        primary: hslToHex(themeSettings.primary),
        primaryForeground: hslToHex(themeSettings.primaryForeground),
        background: hslToHex(themeSettings.background),
        foreground: hslToHex(themeSettings.foreground),
        accent: hslToHex(themeSettings.accent),
        accentForeground: hslToHex(themeSettings.accentForeground),
        lowStockThreshold: themeSettings.lowStockThreshold || 10,
        vatRate: themeSettings.vatRate || 0,
        companyName: themeSettings.companyName || '',
        companyBusinessLine: themeSettings.companyBusinessLine || '',
        companyAddress: themeSettings.companyAddress || '',
        companyPhone: themeSettings.companyPhone || '',
        loyalty: themeSettings.loyalty || defaultLoyaltySettings,
      });
    }
  }, [themeSettings, form]);

  const onSubmit = async (data: ThemeFormValues) => {
    const hslData: ThemeSettings = {
      primary: hexToHsl(data.primary),
      primaryForeground: hexToHsl(data.primaryForeground),
      background: hexToHsl(data.background),
      foreground: hexToHsl(data.foreground),
      accent: hexToHsl(data.accent),
      accentForeground: hexToHsl(data.accentForeground),
      lowStockThreshold: data.lowStockThreshold,
      vatRate: data.vatRate,
      companyName: data.companyName,
      companyBusinessLine: data.companyBusinessLine,
      companyAddress: data.companyAddress,
      companyPhone: data.companyPhone,
      loyalty: data.loyalty,
    };
    const result = await upsertThemeSettings(hslData);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: "Đã cập nhật cài đặt.",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };

  const handleRecalculate = () => {
    startRecalculatingTransition(async () => {
      toast({
        title: "Đang bắt đầu...",
        description: "Quá trình tính lại điểm và phân hạng đang được chuẩn bị.",
      });
      const result = await recalculateAllLoyaltyPoints();
      if (result.success) {
        toast({
          title: "Hoàn tất!",
          description: `Đã tính toán lại điểm và phân hạng cho ${result.processedCount} khách hàng.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Ôi! Đã có lỗi xảy ra khi tính lại.",
          description: result.error,
        });
      }
    });
  }
  
  const handleBackup = () => {
    startBackupTransition(async () => {
        toast({ title: "Đang tạo bản sao lưu...", description: "Quá trình này có thể mất một chút thời gian." });
        const result = await backupAllTransactionalData();
        if (result.success && result.data) {
            const link = document.createElement("a");
            link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
            link.download = `backup_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Sao lưu thành công!", description: "Tệp Excel đã được tải xuống." });
        } else {
            toast({ variant: "destructive", title: "Lỗi sao lưu", description: result.error });
        }
    });
  };


  const handleDeleteData = () => {
    startDataDeletionTransition(async () => {
      toast({
        title: "Đang tiến hành xóa...",
        description: "Quá trình này có thể mất một vài phút. Vui lòng không đóng trang.",
      });
      const result = await deleteAllTransactionalData();
      if (result.success) {
        toast({
          title: "Xóa thành công!",
          description: "Tất cả dữ liệu giao dịch đã được dọn dẹp.",
        });
        router.refresh(); // Refresh page to reflect changes
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi khi xóa dữ liệu",
          description: result.error,
        });
      }
      setShowDeleteConfirm(false);
    });
  };

  const ColorField = ({ name, label }: { name: keyof Omit<ThemeFormValues, 'lowStockThreshold' | 'vatRate' |'companyName' | 'companyBusinessLine' | 'companyAddress' | 'companyPhone' | 'loyalty'>, label: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-4">
            <FormControl>
              <Input type="color" {...field} className="w-16 h-10 p-1" />
            </FormControl>
            <span className="text-sm text-muted-foreground font-mono">{field.value}</span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );


  return (
    <div className="space-y-6">
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có hoàn toàn chắc chắn?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này <span className="font-bold text-destructive">không thể</span> hoàn tác. Thao tác này sẽ xóa vĩnh viễn:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Tất cả đơn hàng bán và chi tiết đơn hàng.</li>
                <li>Tất cả phiếu nhập hàng và chi tiết phiếu nhập.</li>
                <li>Toàn bộ lịch sử thanh toán của khách hàng.</li>
                <li>Reset toàn bộ điểm thưởng và lịch sử nhập kho.</li>
              </ul>
              <strong className="mt-2 block">Rất khuyến khích bạn tạo bản sao lưu trước khi xóa.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingData}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteData} disabled={isDeletingData} className="bg-destructive hover:bg-destructive/90">
              {isDeletingData ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xóa...</> : 'Tôi hiểu, hãy xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt chung</CardTitle>
              <CardDescription>
                Tùy chỉnh giao diện và các cài đặt chung cho ứng dụng của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {isLoading && <p>Đang tải cài đặt...</p>}
              {!isLoading && (
                <>
                  <div>
                    <h3 className="text-lg font-medium">Thông tin doanh nghiệp</h3>
                    <p className="text-sm text-muted-foreground mb-6">Thông tin này sẽ được hiển thị trên hóa đơn.</p>
                    <div className='space-y-4'>
                      <FormField
                          control={form.control}
                          name="companyBusinessLine"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Ngành nghề kinh doanh</FormLabel>
                              <FormControl>
                                  <Input placeholder="Vd: CƠ SỞ SẢN XUẤT VÀ KINH DOANH GIỐNG CÂY TRỒNG" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Tên doanh nghiệp</FormLabel>
                              <FormControl>
                                  <Input placeholder="Vd: MINH PHÁT" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="companyAddress"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Địa chỉ</FormLabel>
                              <FormControl>
                                  <Input placeholder="Vd: 70 Ấp 1, X. Mỹ Thạnh, H. Thủ Thừa, T. Long an" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="companyPhone"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Số điện thoại</FormLabel>
                              <FormControl>
                                  <Input placeholder="Vd: 0915 582 447" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                        />
                    </div>
                  </div>

                  <Separator />

                  <div>
                      <h3 className="text-lg font-medium">Giao diện</h3>
                      <p className="text-sm text-muted-foreground mb-6">Tùy chỉnh màu sắc của ứng dụng.</p>
                      <div className='space-y-8'>
                          <div className='grid md:grid-cols-2 gap-8'>
                              <ColorField name="background" label="Màu nền (Background)" />
                              <ColorField name="foreground" label="Màu chữ (Foreground)" />
                          </div>
                          <Separator />
                          <div className='grid md:grid-cols-2 gap-8'>
                              <ColorField name="primary" label="Màu chủ đạo (Primary)" />
                              <ColorField name="primaryForeground" label="Chữ trên màu chủ đạo" />
                          </div>
                          <Separator />
                          <div className='grid md:grid-cols-2 gap-8'>
                              <ColorField name="accent" label="Màu nhấn (Accent/Hover)" />
                              <ColorField name="accentForeground" label="Chữ trên màu nhấn" />
                          </div>
                      </div>
                  </div>
                  <Separator />
                  <div>
                      <h3 className="text-lg font-medium">Hàng tồn kho</h3>
                      <p className="text-sm text-muted-foreground mb-6">Cài đặt liên quan đến quản lý hàng tồn kho.</p>
                      <FormField
                          control={form.control}
                          name="lowStockThreshold"
                          render={({ field }) => (
                              <FormItem className="max-w-xs">
                              <FormLabel>Ngưỡng cảnh báo tồn kho</FormLabel>
                              <FormControl>
                                  <Input type="number" placeholder="Ví dụ: 10" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                  </div>
                  <Separator />
                  <div>
                      <h3 className="text-lg font-medium">Thuế</h3>
                      <p className="text-sm text-muted-foreground mb-6">Cài đặt liên quan đến thuế giá trị gia tăng (VAT).</p>
                      <FormField
                          control={form.control}
                          name="vatRate"
                          render={({ field }) => (
                              <FormItem className="max-w-xs">
                              <FormLabel>Tỷ lệ thuế VAT (%)</FormLabel>
                              <FormControl>
                                  <Input type="number" placeholder="Ví dụ: 10" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                  </div>
                  <Separator />
                  <div>
                      <h3 className="text-lg font-medium">Chương trình khách hàng thân thiết</h3>
                      <p className="text-sm text-muted-foreground mb-6">Cấu hình cách tích điểm và phân hạng thành viên.</p>
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="loyalty.pointsPerAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tỷ lệ tích điểm</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Số tiền (VNĐ) cần chi tiêu để nhận được 1 điểm.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="loyalty.pointsToVndRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tỷ lệ quy đổi điểm</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Giá trị của 1 điểm khi khách hàng sử dụng (VNĐ).
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Ngưỡng lên hạng (dựa trên tổng điểm đã tích lũy)</h4>
                          <div className="space-y-4">
                              {tierFields.map((field, index) => (
                                <FormField
                                  key={field.id}
                                  control={form.control}
                                  name={`loyalty.tiers.${index}.threshold`}
                                  render={({ field }) => (
                                      <FormItem className="max-w-xs">
                                          <FormLabel>Hạng {tierFields[index].vietnameseName}</FormLabel>
                                          <FormControl>
                                              <Input type="number" {...field} />
                                          </FormControl>
                                          <FormDescription>
                                              Tổng điểm tích lũy tối thiểu để đạt hạng này.
                                          </FormDescription>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                                />
                              ))}
                          </div>
                        </div>
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Lưu cài đặt trước khi tính lại điểm. Việc tính toán lại có thể mất vài phút.
                          </AlertDescription>
                        </Alert>
                        <Button type="button" variant="outline" onClick={handleRecalculate} disabled={isRecalculating || form.formState.isSubmitting}>
                            {isRecalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tính lại điểm & phân hạng cho toàn bộ khách hàng
                          </Button>
                      </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu cài đặt'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Khu vực nguy hiểm</CardTitle>
            <CardDescription>
              Các hành động này không thể hoàn tác. Hãy sao lưu dữ liệu trước khi thực hiện.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <Button variant="outline" onClick={handleBackup} disabled={isBackingUp}>
                    {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    {isBackingUp ? 'Đang sao lưu...' : 'Sao lưu toàn bộ dữ liệu'}
                </Button>
                 <p className="text-sm text-muted-foreground mt-2">
                    Tải xuống một tệp Excel chứa toàn bộ dữ liệu giao dịch của bạn.
                </p>
            </div>
            <Separator />
            <div>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa tất cả dữ liệu giao dịch
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                Thao tác này sẽ xóa toàn bộ lịch sử bán hàng, nhập hàng, thanh toán và reset điểm khách hàng.
                </p>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
