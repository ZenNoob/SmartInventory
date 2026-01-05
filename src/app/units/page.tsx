'use client'

import { useState, useMemo } from "react"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ArrowUp,
  ArrowDown,
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
import { UnitForm } from "./components/unit-form"
import { deleteUnit } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useUserRole } from "@/hooks/use-user-role"
import { useUnits, type Unit } from "@/hooks/use-units"
import Link from "next/link"

type SortKey = 'name' | 'description' | 'quyDoi';

export default function UnitsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const { toast } = useToast();
  const { permissions, isLoading: isRoleLoading } = useUserRole();
  const { units, isLoading: unitsLoading, refetch, unitsMap } = useUnits({ includeBaseUnit: true });

  const filteredUnits = units?.filter(unit => {
    const term = searchTerm.toLowerCase();
    const baseUnitName = unit.baseUnitId ? unitsMap.get(unit.baseUnitId)?.toLowerCase() : '';
    return (
      unit.name.toLowerCase().includes(term) ||
      (unit.description && unit.description.toLowerCase().includes(term)) ||
      (baseUnitName && baseUnitName.includes(term))
    );
  })

  const handleAddUnit = () => {
    setSelectedUnit(undefined);
    setIsFormOpen(true);
  }

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsFormOpen(true);
  }

  const handleFormSuccess = () => {
    refetch();
  }

  const handleDelete = async () => {
    if (!unitToDelete) return;
    setIsDeleting(true);
    const result = await deleteUnit(unitToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa đơn vị tính "${unitToDelete.name}".`,
      });
      refetch();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setUnitToDelete(null);
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedUnits = useMemo(() => {
    let sortableItems = [...(filteredUnits || [])];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA: string | number | undefined, valB: string | number | undefined;
        
        switch (sortKey) {
          case 'name':
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            break;
          case 'description':
            valA = a.description?.toLowerCase() || '';
            valB = b.description?.toLowerCase() || '';
            break;
          case 'quyDoi':
            valA = a.conversionFactor || 0;
            valB = b.conversionFactor || 0;
            break;
          default:
            return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredUnits, sortKey, sortDirection]);

  const SortableHeader = ({ sortKey: key, children }: { sortKey: SortKey; children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  const isLoading = unitsLoading || isRoleLoading;
  const canView = permissions?.units?.includes('view');
  const canAdd = permissions?.units?.includes('add');
  const canEdit = permissions?.units?.includes('edit');
  const canDelete = permissions?.units?.includes('delete');

  if (isLoading) {
      return <p>Đang tải...</p>
  }
  
  if (!canView) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Truy cập bị từ chối</CardTitle>
                  <CardDescription>Bạn không có quyền xem trang này.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button asChild><Link href="/dashboard">Quay lại Bảng điều khiển</Link></Button>
              </CardContent>
          </Card>
      )
  }

  return (
    <>
      <UnitForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        unit={selectedUnit}
        allUnits={units || []}
        onSuccess={handleFormSuccess}
      />
      <AlertDialog open={!!unitToDelete} onOpenChange={(open) => !open && setUnitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn đơn vị tính{' '}
              <strong>{unitToDelete?.name}</strong>.
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
            <h1 className="text-2xl font-semibold tracking-tight">Đơn vị tính</h1>
            <p className="text-sm text-muted-foreground">
                Thêm, sửa, xóa và tìm kiếm các đơn vị tính cho sản phẩm của bạn.
            </p>
        </div>
        {canAdd && <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={handleAddUnit}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Thêm đơn vị
            </span>
          </Button>
        </div>}
      </div>
      <Card>
        <CardHeader>
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm theo tên, mô tả, đơn vị cơ sở..."
                    className="w-full rounded-lg bg-background pl-8 md:w-1/3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">STT</TableHead>
                <SortableHeader sortKey="name">Tên</SortableHeader>
                <SortableHeader sortKey="description">Mô tả</SortableHeader>
                <SortableHeader sortKey="quyDoi">Quy đổi</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedUnits?.map((unit, index) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {unit.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {unit.description}
                    </TableCell>
                    <TableCell>
                      {unit.baseUnitId && unit.conversionFactor && (
                        <Badge variant="secondary">
                          1 {unit.name} = {unit.conversionFactor} {unitsMap.get(unit.baseUnitId)}
                        </Badge>
                      )}
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
                          {canEdit && <DropdownMenuItem onClick={() => handleEditUnit(unit)}>Sửa</DropdownMenuItem>}
                          {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => setUnitToDelete(unit)}>Xóa</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && sortedUnits?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            Không tìm thấy đơn vị tính nào. Hãy thử một từ khóa tìm kiếm khác hoặc thêm một đơn vị mới.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedUnits?.length || 0}</strong> trên <strong>{units?.length || 0}</strong> đơn vị tính
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
