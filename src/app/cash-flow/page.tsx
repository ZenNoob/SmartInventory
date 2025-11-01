'use client'

import { useState, useMemo } from "react"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ArrowUp,
  ArrowDown,
  ListFilter,
  File,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
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
import { collection, query, orderBy } from "firebase/firestore"
import { CashTransaction } from "@/lib/types"
import { CashTransactionForm } from "./components/cash-transaction-form"
import { deleteCashTransaction, generateCashTransactionsExcel } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

type SortKey = 'transactionDate' | 'type' | 'category' | 'amount' | 'reason';
type TypeFilter = 'all' | 'thu' | 'chi';

export default function CashFlowPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | undefined>(undefined);
  const [transactionToDelete, setTransactionToDelete] = useState<CashTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('transactionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "cash_transactions"), orderBy("transactionDate", "desc"));
  }, [firestore]);

  const { data: transactions, isLoading } = useCollection<CashTransaction>(transactionsQuery);

  const filteredTransactions = useMemo(() => {
    return transactions?.filter(transaction => {
        const typeMatch = typeFilter === 'all' || transaction.type === typeFilter;
        
        const term = searchTerm.toLowerCase();
        const searchMatch = !term ||
            transaction.reason.toLowerCase().includes(term) ||
            (transaction.category && transaction.category.toLowerCase().includes(term));
            
        return typeMatch && searchMatch;
    }) || [];
  }, [transactions, typeFilter, searchTerm]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...filteredTransactions];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        switch (sortKey) {
            case 'transactionDate':
                valA = new Date(a.transactionDate).getTime();
                valB = new Date(b.transactionDate).getTime();
                break;
            case 'amount':
                valA = a.amount;
                valB = b.amount;
                break;
            default:
                valA = (a[sortKey] || '').toString().toLowerCase();
                valB = (b[sortKey] || '').toString().toLowerCase();
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTransactions, sortKey, sortDirection]);

  const handleAddTransaction = () => {
    setSelectedTransaction(undefined);
    setIsFormOpen(true);
  }

  const handleEditTransaction = (transaction: CashTransaction) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  }

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    const result = await deleteCashTransaction(transactionToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa phiếu ${transactionToDelete.type === 'thu' ? 'thu' : 'chi'}.`,
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
    setTransactionToDelete(null);
  }
  
  const handleExport = async () => {
    if(!sortedTransactions || sortedTransactions.length === 0) {
      toast({ title: "Không có dữ liệu để xuất." });
      return;
    }
    const result = await generateCashTransactionsExcel(sortedTransactions);
    if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
        link.download = "so_quy.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Thành công", description: "Đã xuất file sổ quỹ." });
    } else {
        toast({ variant: "destructive", title: "Lỗi", description: result.error });
    }
  }

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );
  
  const totalThu = useMemo(() => sortedTransactions.filter(t => t.type === 'thu').reduce((acc, t) => acc + t.amount, 0), [sortedTransactions]);
  const totalChi = useMemo(() => sortedTransactions.filter(t => t.type === 'chi').reduce((acc, t) => acc + t.amount, 0), [sortedTransactions]);
  const balance = totalThu - totalChi;

  return (
    <>
      <CashTransactionForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        transaction={selectedTransaction}
      />
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn phiếu này.
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
            <h1 className="text-2xl font-semibold tracking-tight">Sổ quỹ</h1>
            <p className="text-sm text-muted-foreground">
                Quản lý các giao dịch thu, chi tiền mặt của bạn.
            </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handleExport} size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              Xuất file
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={handleAddTransaction}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Tạo phiếu mới
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
           <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo lý do, danh mục..."
                    className="w-full rounded-lg bg-background pl-8 md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 gap-1">
                    <ListFilter className="h-3.5 w-3.5" />
                    <span>Lọc loại phiếu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Lọc theo loại</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                        <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="thu">Phiếu thu</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="chi">Phiếu chi</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 hidden md:table-cell">STT</TableHead>
                <SortableHeader sortKey="transactionDate">Ngày</SortableHeader>
                <SortableHeader sortKey="type">Loại phiếu</SortableHeader>
                <SortableHeader sortKey="amount" className="text-right">Số tiền</SortableHeader>
                <SortableHeader sortKey="reason">Lý do</SortableHeader>
                <SortableHeader sortKey="category">Danh mục</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedTransactions.map((transaction, index) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium hidden md:table-cell">{index + 1}</TableCell>
                    <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'thu' ? 'default' : 'destructive'}>
                        {transaction.type === 'thu' ? 'Phiếu thu' : 'Phiếu chi'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {transaction.type === 'thu' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>{transaction.reason}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setTransactionToDelete(transaction)}>Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && sortedTransactions.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                            Chưa có giao dịch nào.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="font-bold">Tổng cộng</TableCell>
                    <TableCell className="text-right font-bold text-primary">{formatCurrency(totalThu)}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{formatCurrency(totalChi)}</TableCell>
                    <TableCell colSpan={2} className={`text-right font-bold text-lg ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(balance)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedTransactions?.length || 0}</strong> trên <strong>{transactions?.length || 0}</strong> phiếu
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
