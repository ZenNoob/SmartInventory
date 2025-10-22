'use client'

import { useState } from "react"
import {
  MoreHorizontal,
  PlusCircle,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Button } from "@/components/ui/button"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Category } from "@/lib/types"
import { CategoryForm } from "./components/category-form"
import { deleteCategory } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function CategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "categories"));
  }, [firestore]);

  const { data: categories, isLoading } = useCollection<Category>(categoriesQuery);

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setIsFormOpen(true);
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    const result = await deleteCategory(categoryToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa danh mục "${categoryToDelete.name}".`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setCategoryToDelete(null);
  }

  return (
    <>
      <CategoryForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={selectedCategory}
      />
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn danh mục{' '}
              <strong>{categoryToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2 mb-4">
        <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Danh mục sản phẩm</h1>
            <p className="text-sm text-muted-foreground">
                Thêm, sửa hoặc xóa các danh mục sản phẩm của bạn.
            </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={handleAddCategory}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Thêm danh mục
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead className="hidden md:table-cell">Mô tả</TableHead>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {category.description}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Chuyển đổi menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditCategory(category)}>Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setCategoryToDelete(category)}>Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && categories?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">
                            Không tìm thấy danh mục nào. Hãy bắt đầu bằng cách thêm một danh mục mới.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>1-{categories?.length || 0}</strong> trên <strong>{categories?.length || 0}</strong> danh mục
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
