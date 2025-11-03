





'use client'

import * as React from 'react'
import { useEffect, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
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
import type { ThemeSettings, LoyaltySettings, SoftwarePackage } from '@/lib/types'
import { hexToHsl, hslToHex } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, FileDown, Loader2, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const loyaltyTierSchema = z.object({
  name: z.enum(['bronze', 'silver', 'gold', 'diamond']),
  vietnameseName: z.string(),
  threshold: z.coerce.number().min(0, "Ngưỡng điểm phải là số không âm."),
  discountPercentage: z.coerce.number().min(0, "Tỷ lệ giảm giá phải là số không âm.").default(0),
});

const loyaltySettingsSchema = z.object({
  enabled: z.boolean().default(false),
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
  printerType: z.enum(['none', '58mm', '80mm']).default('none'),
  companyName: z.string().optional(),
  companyBusinessLine: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyLogo: z.string().optional(),
  loyalty: loyaltySettingsSchema.optional(),
  softwarePackage: z.enum(['basic', 'standard', 'advanced']).default('advanced'),
});

type ThemeFormValues = z.infer<typeof themeFormSchema>;

const FormattedNumberInput = ({ value, onChange, ...props }: { value: number; onChange: (value: number) => void; [key: string]: any }) => {
  const [displayValue, setDisplayValue] = React.useState(value?.toLocaleString('en-US') || '');

  useEffect(() => {
    setDisplayValue(value?.toLocaleString('en-US') || '0');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    const numberValue = parseInt(rawValue, 10);

    if (!isNaN(numberValue)) {
      setDisplayValue(numberValue.toLocaleString('en-US'));
      onChange(numberValue);
    } else if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
    }
  };

  return <Input type="text" value={displayValue} onChange={handleChange} {...props} />;
};


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
    enabled: false,
    pointsPerAmount: 100000, // 100,000 VND for 1 point
    pointsToVndRate: 1000, // 1 point = 1,000 VND
    tiers: [
      { name: 'bronze', vietnameseName: 'Đồng', threshold: 0, discountPercentage: 0 },
      { name: 'silver', vietnameseName: 'Bạc', threshold: 50, discountPercentage: 2 },
      { name: 'gold', vietnameseName: 'Vàng', threshold: 200, discountPercentage: 5 },
      { name: 'diamond', vietnameseName: 'Kim Cương', threshold: 500, discountPercentage: 10 },
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
      printerType: 'none',
      companyName: '',
      companyBusinessLine: '',
      companyAddress: '',
      companyPhone: '',
      companyLogo: '',
      loyalty: defaultLoyaltySettings,
      softwarePackage: 'advanced'
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
        printerType: themeSettings.printerType || 'none',
        companyName: themeSettings.companyName || '',
        companyBusinessLine: themeSettings.companyBusinessLine || '',
        companyAddress: themeSettings.companyAddress || '',
        companyPhone: themeSettings.companyPhone || '',
        companyLogo: themeSettings.companyLogo || '',
        loyalty: themeSettings.loyalty ? { ...defaultLoyaltySettings, ...themeSettings.loyalty } : defaultLoyaltySettings,
        softwarePackage: themeSettings.softwarePackage || 'advanced',
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
      printerType: data.printerType,
      companyName: data.companyName,
      companyBusinessLine: data.companyBusinessLine,
      companyAddress: data.companyAddress,
      companyPhone: data.companyPhone,
      companyLogo: data.companyLogo,
      loyalty: data.loyalty,
      softwarePackage: data.softwarePackage,
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
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB size limit
        toast({
          variant: "destructive",
          title: "File quá lớn",
          description: "Vui lòng chọn file logo có dung lượng nhỏ hơn 1MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('companyLogo', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const ColorField = ({ name, label }: { name: keyof Omit<ThemeFormValues, 'lowStockThreshold' | 'vatRate' | 'companyName' | 'companyBusinessLine' | 'companyAddress' | 'companyPhone' | 'loyalty' | 'printerType' | 'companyLogo' | 'softwarePackage'>, label: string }) => (
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
  
  const loyaltyEnabled = form.watch('loyalty.enabled');
  
  const handleRecalculatePoints = () => {
    startRecalculatingTransition(async () => {
      const result = await recalculateAllLoyaltyPoints();
      if (result.success) {
        toast({
          title: "Hoàn tất!",
          description: `Đã xử lý và tính toán lại điểm cho ${result.processedCount} khách hàng.`,
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi tính toán",
          description: result.error,
        });
      }
    });
  };

  const handleBackup = () => {
    startBackupTransition(async () => {
      const result = await backupAllTransactionalData();
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
        link.download = `backup_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: "Sao lưu thành công!",
          description: "File sao lưu đã được tải xuống.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi sao lưu",
          description: result.error,
        });
      }
    });
  };

  const handleDeleteData = () => {
    startDataDeletionTransition(async () => {
      const result = await deleteAllTransactionalData();
      if (result.success) {
        toast({
          title: "Xóa thành công!",
          description: "Toàn bộ dữ liệu giao dịch đã được xóa.",
        });
        setShowDeleteConfirm(false);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi khi xóa dữ liệu",
          description: result.error,
        });
      }
    });
  };


  return (
    <div className="space-y-6">
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có hoàn toàn chắc chắn?</AlertDialogTitle>
            <AlertDialogDescription>
                <div>
                  Hành động này <span className="font-bold text-destructive">không thể</span> hoàn tác và sẽ xóa vĩnh viễn:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Tất cả đơn hàng bán và chi tiết đơn hàng.</li>
                    <li>Tất cả phiếu nhập hàng và chi tiết phiếu nhập.</li>
                    <li>Toàn bộ lịch sử thanh toán của khách hàng và nhà cung cấp.</li>
                    <li>Toàn bộ lịch sử thu/chi trên sổ quỹ.</li>
                    <li>Toàn bộ lịch sử ca làm việc.</li>
                    <li>Reset toàn bộ điểm thưởng và lịch sử nhập kho.</li>
                  </ul>
                  <strong className="mt-4 block">Rất khuyến khích bạn tạo bản sao lưu trước khi xóa.</strong>
                </div>
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
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt chung</CardTitle>
              <CardDescription>
                Tùy chỉnh các cài đặt chung cho ứng dụng của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && <p>Đang tải cài đặt...</p>}
              {!isLoading && (
                <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Thông tin chung</AccordionTrigger>
                    <AccordionContent className="space-y-8">
                       <div>
                        <h3 className="text-lg font-medium">Gói Phần mềm</h3>
                        <p className="text-sm text-muted-foreground mb-6">Chọn gói tính năng hiện tại cho hệ thống.</p>
                        <FormField
                          control={form.control}
                          name="softwarePackage"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="grid md:grid-cols-3 gap-4"
                                >
                                  <FormItem>
                                    <FormControl>
                                      <RadioGroupItem value="basic" id="pkg-basic" className="sr-only peer" />
                                    </FormControl>
                                    <FormLabel htmlFor="pkg-basic" className="flex flex-col rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                      <span className="font-bold text-lg mb-2">Cơ bản</span>
                                      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 text-left w-full">
                                        <li>POS - Bán tại quầy</li>
                                        <li>Quản lý Sản phẩm, Khách hàng</li>
                                        <li>Sổ quỹ Thu-Chi</li>
                                        <li>Báo cáo cơ bản</li>
                                      </ul>
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem>
                                    <FormControl>
                                      <RadioGroupItem value="standard" id="pkg-standard" className="sr-only peer" />
                                    </FormControl>
                                    <FormLabel htmlFor="pkg-standard" className="flex flex-col rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                       <span className="font-bold text-lg mb-2">Tiêu chuẩn</span>
                                       <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 text-left w-full">
                                        <li>Mọi tính năng gói Cơ bản</li>
                                        <li>Báo cáo nâng cao</li>
                                        <li>Quản lý Người dùng</li>
                                        <li>Khách hàng thân thiết</li>
                                      </ul>
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem>
                                    <FormControl>
                                      <RadioGroupItem value="advanced" id="pkg-advanced" className="sr-only peer" />
                                    </FormControl>
                                    <FormLabel htmlFor="pkg-advanced" className="flex flex-col rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                      <span className="font-bold text-lg mb-2">Nâng cao</span>
                                      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 text-left w-full">
                                        <li>Mọi tính năng gói Tiêu chuẩn</li>
                                        <li>Phân tích AI</li>
                                        <li>Dự báo doanh số</li>
                                      </ul>
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Separator />
                       <div>
                        <h3 className="text-lg font-medium">Thông tin doanh nghiệp</h3>
                        <p className="text-sm text-muted-foreground mb-6">Thông tin này sẽ được hiển thị trên hóa đơn.</p>
                        <div className='space-y-4'>
                          <FormField
                            control={form.control}
                            name="companyLogo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Logo công ty</FormLabel>
                                <div className="flex items-center gap-4">
                                  <FormControl>
                                    <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} className="max-w-xs" />
                                  </FormControl>
                                  {field.value && (
                                    <Image src={field.value} alt="Logo preview" width={64} height={64} className="h-16 w-16 object-contain border rounded-md" />
                                  )}
                                </div>
                                <FormDescription>Tải lên logo của bạn. Khuyến khích ảnh vuông, dung lượng dưới 1MB.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                              control={form.control}
                              name="companyBusinessLine"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Ngành nghề kinh doanh</FormLabel>
                                  <FormControl>
                                      <Input placeholder="Vd: CƠ SỞ SẢN XUẤT VÀ KINH DOANH GIỐNG CÂY TRỒNG" {...field} value={field.value ?? ''} />
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
                                      <Input placeholder="Vd: MINH PHÁT" {...field} value={field.value ?? ''} />
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
                                      <Input placeholder="Vd: 70 Ấp 1, X. Mỹ Thạnh, H. Thủ Thừa, T. Long an" {...field} value={field.value ?? ''} />
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
                                      <Input placeholder="Vd: 0915 582 447" {...field} value={field.value ?? ''}/>
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                            />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-2">
                    <AccordionTrigger>Cài đặt Vận hành</AccordionTrigger>
                    <AccordionContent className="space-y-8">
                       <div>
                        <h3 className="text-lg font-medium">Cài đặt In ấn</h3>
                        <p className="text-sm text-muted-foreground mb-6">Cấu hình máy in nhiệt cho quầy POS.</p>
                        <FormField
                          control={form.control}
                          name="printerType"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Tự động in hóa đơn sau khi thanh toán</FormLabel>
                              <FormDescription>Hệ thống sẽ tự động gửi lệnh in đến máy in mặc định của máy tính.</FormDescription>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex flex-col space-y-1"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="none" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Không in
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="58mm" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      In khổ 58mm
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="80mm" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      In khổ 80mm
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                                      <FormattedNumberInput {...field} />
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
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-3">
                    <AccordionTrigger>Giao diện</AccordionTrigger>
                    <AccordionContent>
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
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
            <CardFooter>
               <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu cài đặt'}
              </Button>
            </CardFooter>
          </Card>
          
           <Card>
            <CardHeader>
                <CardTitle>Chương trình khách hàng thân thiết</CardTitle>
                <CardDescription>Cấu hình cách tích điểm và phân hạng thành viên.</CardDescription>
            </CardHeader>
            <CardContent>
                 <FormField
                    control={form.control}
                    name="loyalty.enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-6">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Kích hoạt chương trình
                          </FormLabel>
                          <FormDescription>
                            Bật hoặc tắt hệ thống tích điểm và phân hạng khách hàng.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                    {loyaltyEnabled && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="loyalty.pointsPerAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tỷ lệ tích điểm</FormLabel>
                                  <FormControl>
                                    <FormattedNumberInput {...field} />
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
                                    <FormattedNumberInput {...field} />
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
                          <h4 className="font-medium mb-2">Cấu hình Hạng thành viên</h4>
                          <div className="space-y-4">
                              {tierFields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name={`loyalty.tiers.${index}.threshold`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hạng {tierFields[index].vietnameseName}</FormLabel>
                                            <FormControl>
                                                <FormattedNumberInput {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Tổng điểm tích lũy tối thiểu để đạt hạng này.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                  />
                                    <FormField
                                    control={form.control}
                                    name={`loyalty.tiers.${index}.discountPercentage`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ưu đãi giảm giá (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Giảm giá tự động cho hạng này.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Lưu cài đặt trước khi tính lại điểm. Việc tính toán lại có thể mất vài phút.
                          </AlertDescription>
                        </Alert>
                        <Button type="button" variant="outline" onClick={handleRecalculatePoints} disabled={isRecalculating || form.formState.isSubmitting}>
                            {isRecalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tính lại điểm & phân hạng cho toàn bộ khách hàng
                          </Button>
                      </div>
                    )}
            </CardContent>
             <CardFooter>
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
