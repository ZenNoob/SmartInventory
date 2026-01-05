'use client'

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import {
  ArrowLeft,
  Save,
  Globe,
  Palette,
  Mail,
  MapPin,
  Image as ImageIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getOnlineStore, updateOnlineStore, OnlineStore } from "../../actions"

const THEMES = [
  { id: 'default', name: 'Mặc định', description: 'Giao diện sáng, hiện đại' },
  { id: 'minimal', name: 'Tối giản', description: 'Thiết kế đơn giản, tập trung vào sản phẩm' },
  { id: 'elegant', name: 'Sang trọng', description: 'Phong cách cao cấp, tinh tế' },
];

const FONTS = [
  { id: 'Inter', name: 'Inter' },
  { id: 'Roboto', name: 'Roboto' },
  { id: 'Open Sans', name: 'Open Sans' },
  { id: 'Montserrat', name: 'Montserrat' },
  { id: 'Nunito', name: 'Nunito' },
];

const formSchema = z.object({
  storeName: z.string().min(1, "Tên cửa hàng là bắt buộc"),
  slug: z.string()
    .min(3, "Slug phải có ít nhất 3 ký tự")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang"),
  description: z.string().optional(),
  isActive: z.boolean(),
  // Contact
  contactEmail: z.string().email("Email không hợp lệ"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  // Theme
  themeId: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  fontFamily: z.string(),
  // Branding
  logo: z.string().optional(),
  favicon: z.string().optional(),
  // Social
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function OnlineStoreSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const [store, setStore] = useState<OnlineStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: "",
      slug: "",
      description: "",
      isActive: true,
      contactEmail: "",
      contactPhone: "",
      address: "",
      themeId: "default",
      primaryColor: "#3B82F6",
      secondaryColor: "#10B981",
      fontFamily: "Inter",
      logo: "",
      favicon: "",
      facebookUrl: "",
      instagramUrl: "",
    },
  });

  const fetchStore = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getOnlineStore(storeId);
      if (result.success && result.data) {
        setStore(result.data);
        form.reset({
          storeName: result.data.storeName,
          slug: result.data.slug,
          description: result.data.description || "",
          isActive: result.data.isActive,
          contactEmail: result.data.contactEmail,
          contactPhone: result.data.contactPhone || "",
          address: result.data.address || "",
          themeId: result.data.themeId,
          primaryColor: result.data.primaryColor,
          secondaryColor: result.data.secondaryColor,
          fontFamily: result.data.fontFamily,
          logo: result.data.logo || "",
          favicon: result.data.favicon || "",
          facebookUrl: result.data.facebookUrl || "",
          instagramUrl: result.data.instagramUrl || "",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể tải thông tin cửa hàng",
        });
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, form, toast]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const result = await updateOnlineStore(storeId, values);
      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Đã cập nhật cài đặt cửa hàng.",
        });
        fetchStore();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi cập nhật cài đặt",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!store) {
    return <div className="p-6">Không tìm thấy cửa hàng</div>;
  }

  const watchedValues = form.watch();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/online-stores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{store.storeName}</h1>
          <p className="text-muted-foreground">Cài đặt cửa hàng online</p>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList>
              <TabsTrigger value="general">
                <Globe className="h-4 w-4 mr-2" />
                Thông tin chung
              </TabsTrigger>
              <TabsTrigger value="theme">
                <Palette className="h-4 w-4 mr-2" />
                Giao diện
              </TabsTrigger>
              <TabsTrigger value="branding">
                <ImageIcon className="h-4 w-4 mr-2" />
                Thương hiệu
              </TabsTrigger>
              <TabsTrigger value="contact">
                <Mail className="h-4 w-4 mr-2" />
                Liên hệ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin chung</CardTitle>
                  <CardDescription>Cấu hình thông tin cơ bản của cửa hàng</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên cửa hàng</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug (URL)</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <Input {...field} />
                            <span className="ml-2 text-sm text-muted-foreground whitespace-nowrap">
                              .smartinventory.com
                            </span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Đường dẫn URL của cửa hàng
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Trạng thái hoạt động</FormLabel>
                          <FormDescription>
                            Khi tắt, cửa hàng sẽ không hiển thị với khách hàng
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="theme">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Chọn giao diện</CardTitle>
                    <CardDescription>Chọn theme cho cửa hàng của bạn</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="themeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid gap-3">
                              {THEMES.map((theme) => (
                                <div
                                  key={theme.id}
                                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                                    field.value === theme.id
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-muted-foreground/50"
                                  }`}
                                  onClick={() => field.onChange(theme.id)}
                                >
                                  <div className="font-medium">{theme.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {theme.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fontFamily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font chữ</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FONTS.map((font) => (
                                <SelectItem key={font.id} value={font.id}>
                                  {font.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Màu sắc</CardTitle>
                    <CardDescription>Tùy chỉnh màu sắc cho cửa hàng</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Màu chính</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Input
                                type="color"
                                className="w-12 h-10 p-1 cursor-pointer"
                                {...field}
                              />
                              <Input {...field} className="flex-1" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Màu phụ</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Input
                                type="color"
                                className="w-12 h-10 p-1 cursor-pointer"
                                {...field}
                              />
                              <Input {...field} className="flex-1" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preview */}
                    <div className="mt-6 p-4 rounded-lg border">
                      <div className="text-sm font-medium mb-3">Xem trước</div>
                      <div className="flex gap-2">
                        <div
                          className="px-4 py-2 rounded text-white text-sm"
                          style={{ backgroundColor: watchedValues.primaryColor }}
                        >
                          Nút chính
                        </div>
                        <div
                          className="px-4 py-2 rounded text-white text-sm"
                          style={{ backgroundColor: watchedValues.secondaryColor }}
                        >
                          Nút phụ
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Thương hiệu</CardTitle>
                  <CardDescription>Logo và hình ảnh đại diện cho cửa hàng</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo</FormLabel>
                        <FormControl>
                          <Input placeholder="URL hình ảnh logo" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nhập URL hình ảnh logo (PNG, JPG, SVG - tối đa 2MB)
                        </FormDescription>
                        <FormMessage />
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Logo preview"
                              className="h-16 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="favicon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Favicon</FormLabel>
                        <FormControl>
                          <Input placeholder="URL hình ảnh favicon" {...field} />
                        </FormControl>
                        <FormDescription>
                          Icon hiển thị trên tab trình duyệt
                        </FormDescription>
                        <FormMessage />
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Favicon preview"
                              className="h-8 w-8 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin liên hệ</CardTitle>
                  <CardDescription>Thông tin liên hệ hiển thị trên cửa hàng</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số điện thoại</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Địa chỉ</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-4">Mạng xã hội</h4>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="facebookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facebook</FormLabel>
                            <FormControl>
                              <Input placeholder="https://facebook.com/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagramUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="https://instagram.com/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
