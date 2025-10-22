'use client'

import { useState } from "react"
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { formatCurrency } from "@/lib/utils"
import Image from "next/image"
import { PredictShortageForm } from "./components/predict-shortage-form"
import { ProductForm } from "./components/product-form"
import { AppUser, Category, Product } from "@/lib/types"
import { collection, query } from "firebase/firestore"

export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"));
  }, [firestore]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "categories"));
  }, [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

  const handleAddProduct = () => {
    setSelectedProduct(undefined);
    setIsFormOpen(true);
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  }

  const isLoading = productsLoading || categoriesLoading;
  
  const getStock = (product: Product) => {
    return product.purchaseLots?.reduce((acc, lot) => acc + lot.quantity, 0) || 0
  }

  return (
    <>
      <ProductForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
        categories={categories || []}
      />
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="active">Hoạt động</TabsTrigger>
            <TabsTrigger value="draft">Bản nháp</TabsTrigger>
            <TabsTrigger value="archived" className="hidden sm:flex">
              Lưu trữ
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Lọc
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lọc theo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>
                  Hoạt động
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Bản nháp</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  Lưu trữ
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Xuất
              </span>
            </Button>
            <PredictShortageForm />
            <Button size="sm" className="h-8 gap-1" onClick={handleAddProduct}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Thêm sản phẩm
              </span>
            </Button>
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
              <CardDescription>
                Quản lý sản phẩm của bạn và xem hiệu suất bán hàng của chúng.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                      <span className="sr-only">Hình ảnh</span>
                    </TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Giá nhập trung bình
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Tồn kho
                    </TableHead>
                    <TableHead>
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Đang tải...</TableCell></TableRow>}
                  {!isLoading && products?.map((product) => {
                    const category = categories?.find(c => c.id === product.categoryId);
                    const stock = getStock(product);
                    const averageCost = product.purchaseLots?.length > 0
                      ? product.purchaseLots.reduce((acc, lot) => acc + lot.cost, 0) / product.purchaseLots.length
                      : 0;

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="hidden sm:table-cell">
                          <Image
                            alt={product.name}
                            className="aspect-square rounded-md object-cover"
                            height="64"
                            src={`https://picsum.photos/seed/${product.id}/64/64`}
                            width="64"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(averageCost)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {stock}
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
                              <DropdownMenuItem onClick={() => handleEditProduct(product)}>Sửa</DropdownMenuItem>
                              <DropdownMenuItem>Xóa</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>1-{products?.length || 0}</strong> trên <strong>{products?.length || 0}</strong>{" "}
                sản phẩm
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
