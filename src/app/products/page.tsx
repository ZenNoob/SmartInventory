'use client'

import { useState } from "react"
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { PredictShortageForm } from "./components/predict-shortage-form"
import { ProductForm } from "./components/product-form"
import { Category, Product } from "@/lib/types"
import { collection, query } from "firebase/firestore"
import { Input } from "@/components/ui/input"

type ProductStatus = 'active' | 'draft' | 'archived' | 'all';


export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus>('all');
  
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

  const getAverageCost = (product: Product) => {
    if (!product.purchaseLots || product.purchaseLots.length === 0) return 0;
    const totalCost = product.purchaseLots.reduce((acc, lot) => acc + lot.cost * lot.quantity, 0);
    const totalQuantity = product.purchaseLots.reduce((acc, lot) => acc + lot.quantity, 0);
    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  }

  const filteredProducts = products?.filter(product => {
    // Status Filter
    if (statusFilter !== 'all' && product.status !== statusFilter) {
      return false;
    }
    
    // Category Filter
    if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) {
      return false;
    }

    // Search Term Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const category = categories?.find(c => c.id === product.categoryId);
      const averageCost = getAverageCost(product);
      
      const matchesSearchTerm = (
        product.name.toLowerCase().includes(term) ||
        (category && category.name.toLowerCase().includes(term)) ||
        averageCost.toString().includes(term) ||
        formatCurrency(averageCost).toLowerCase().includes(term)
      );

      return matchesSearchTerm;
    }
    
    return true; // if no search term, return all products matching other filters
  })


  return (
    <>
      <ProductForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
        categories={categories || []}
      />
      <Tabs defaultValue="all" onValueChange={(value) => setStatusFilter(value as ProductStatus)}>
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
                <DropdownMenuLabel>Lọc theo loại</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                  <DropdownMenuRadioItem value="all">Tất cả các loại</DropdownMenuRadioItem>
                  {categories?.map((category) => (
                    <DropdownMenuRadioItem key={category.id} value={category.id}>
                      {category.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
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
        <TabsContent value={statusFilter}>
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
              <CardDescription>
                Quản lý sản phẩm của bạn và xem hiệu suất bán hàng của chúng.
              </CardDescription>
               <div className="relative mt-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên, loại, giá..."
                    className="w-full rounded-lg bg-background pl-8 md:w-1/3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Trạng thái</TableHead>
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
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Đang tải...</TableCell></TableRow>}
                  {!isLoading && filteredProducts?.map((product, index) => {
                    const category = categories?.find(c => c.id === product.categoryId);
                    const stock = getStock(product);
                    const averageCost = getAverageCost(product)

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                         <TableCell>
                          <Badge variant={product.status === 'active' ? 'default' : product.status === 'draft' ? 'secondary' : 'destructive'}>
                            {product.status === 'active' ? 'Hoạt động' : product.status === 'draft' ? 'Bản nháp' : 'Lưu trữ'}
                          </Badge>
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
                   {!isLoading && filteredProducts?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                            Không tìm thấy sản phẩm nào.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{filteredProducts?.length || 0}</strong> trên <strong>{products?.length || 0}</strong>{" "}
                sản phẩm
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
