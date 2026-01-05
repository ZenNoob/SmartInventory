'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Unit } from '@/hooks/use-units'
import { upsertUnit } from '../actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

const unitFormSchema = z.object({
  name: z.string().min(1, "Tên đơn vị tính không được để trống."),
  description: z.string().optional(),
  baseUnitId: z.string().optional(),
  conversionFactor: z.coerce.number().optional(),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface UnitFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  unit?: Unit;
  allUnits: Unit[];
  onSuccess?: () => void;
}

export function UnitForm({ isOpen, onOpenChange, unit, allUnits, onSuccess }: UnitFormProps) {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: '',
      description: '',
      baseUnitId: '',
      conversionFactor: 1
    },
  });
  
  const baseUnitIdValue = form.watch('baseUnitId');

  useEffect(() => {
    if (isOpen) {
      form.reset(
        unit 
        ? { 
            name: unit.name, 
            description: unit.description || '',
            baseUnitId: unit.baseUnitId || '',
            conversionFactor: unit.conversionFactor || 1,
          } 
        : { 
            name: '', 
            description: '',
            baseUnitId: '',
            conversionFactor: 1,
          }
      );
    }
  }, [unit, isOpen, form]);

  const onSubmit = async (data: UnitFormValues) => {
    const dataToSubmit = {
      ...data,
      id: unit?.id,
      // Ensure conversionFactor is only sent if baseUnitId exists
      conversionFactor: data.baseUnitId ? data.conversionFactor : undefined,
    }
    const result = await upsertUnit(dataToSubmit);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã ${unit ? 'cập nhật' : 'tạo'} đơn vị tính thành công.`,
      });
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
  };
  
  const availableBaseUnits = allUnits.filter(u => u.id !== unit?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{unit ? 'Chỉnh sửa đơn vị' : 'Thêm đơn vị mới'}</DialogTitle>
          <DialogDescription>
            {unit ? 'Cập nhật chi tiết cho đơn vị tính này.' : 'Tạo một đơn vị tính mới để sử dụng cho sản phẩm.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên đơn vị tính</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Cái, Hộp, Kg" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Mô tả ngắn về đơn vị tính này." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            
            <div>
              <h3 className="text-md font-medium">Quy đổi đơn vị (Không bắt buộc)</h3>
              <p className="text-sm text-muted-foreground">Sử dụng nếu đây là đơn vị tính chẵn (VD: Thùng, Hộp) cần quy đổi ra đơn vị cơ sở (VD: Cái).</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="baseUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị cơ sở</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn đơn vị cơ sở" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableBaseUnits.map(u => (
                           <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Đơn vị nhỏ nhất để quy đổi.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {baseUnitIdValue && (
                  <FormField
                    control={form.control}
                    name="conversionFactor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hệ số quy đổi</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ví dụ: 24" {...field} />
                        </FormControl>
                        <FormDescription>
                            1 {form.getValues('name') || 'đơn vị này'} = ? đơn vị cơ sở
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
            </div>


            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
