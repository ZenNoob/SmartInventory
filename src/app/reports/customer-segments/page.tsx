
'use client'

import { useState, useMemo } from "react"
import { Bot, Search, ArrowUp, ArrowDown, Sparkles } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Customer, Sale, Payment } from "@/lib/types"
import { type SegmentCustomersOutput } from "@/ai/flows/segment-customers-flow"
import { getCustomerSegments } from "@/app/actions"
import Link from "next/link"
import { useUserRole } from "@/hooks/use-user-role"

type SortKey = 'customerName' | 'segment';
type SegmentFilter = 'all' | 'VIP' | 'Trung thành' | 'Tiềm năng' | 'Nguy cơ rời bỏ' | 'Mới' | 'Không hoạt động';


const getSegmentVariant = (segment: SegmentFilter): "default" | "secondary" | "destructive" | "outline" => {
  switch (segment) {
    case 'VIP': return 'default';
    case 'Trung thành': return 'default';
    case 'Nguy cơ rời bỏ': return 'destructive';
    case 'Không hoạt động': return 'outline';
    default: return 'secondary';
  }
};

export default function CustomerSegmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('segment');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [analysisResult, setAnalysisResult] = useState<SegmentCustomersOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firestore = useFirestore();
  const { permissions } = useUserRole();

  const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "customers")) : null, [firestore]);
  const salesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "sales_transactions")) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "payments")) : null, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

  const handleAnalyze = async () => {
    if (!customers || !sales || !payments) {
      setError("Dữ liệu cần thiết chưa sẵn sàng. Vui lòng thử lại sau.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    const result = await getCustomerSegments({
      customers: JSON.stringify(customers),
      sales: JSON.stringify(sales),
      payments: JSON.stringify(payments),
    });

    if (result.success && result.data) {
      setAnalysisResult(result.data);
    } else {
      setError(result.error || "Đã xảy ra lỗi không xác định.");
    }
    setIsAnalyzing(false);
  };
  
  const filteredSegments = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.segments.filter(segment => {
        const segmentMatch = segmentFilter === 'all' || segment.segment === segmentFilter;
        const searchMatch = searchTerm ? segment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        return segmentMatch && searchMatch;
    });
  }, [analysisResult, segmentFilter, searchTerm]);


  const sortedSegments = useMemo(() => {
    let sortableItems = [...filteredSegments];
    sortableItems.sort((a, b) => {
        let valA, valB;
        if (sortKey === 'customerName') {
            valA = a.customerName.toLowerCase();
            valB = b.customerName.toLowerCase();
        } else {
            valA = a.segment.toLowerCase();
            valB = b.segment.toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    return sortableItems;
  }, [filteredSegments, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  const isLoading = customersLoading || salesLoading || paymentsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Báo cáo Phân khúc Khách hàng</CardTitle>
                <CardDescription>
                Sử dụng AI để phân tích và nhóm khách hàng của bạn vào các phân khúc chiến lược.
                </CardDescription>
            </div>
            {permissions?.ai_segmentation?.includes('view') && (
              <Button onClick={handleAnalyze} disabled={isLoading || isAnalyzing}>
                  {isAnalyzing ? (
                      <>
                          <Bot className="mr-2 h-4 w-4 animate-spin" />
                          Đang phân tích...
                      </>
                  ) : (
                      <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Chạy phân tích AI
                      </>
                  )}
              </Button>
            )}
        </div>
        {analysisResult && (
             <div className="flex items-center gap-4 pt-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm theo tên khách hàng..."
                        className="w-full rounded-lg bg-background pl-8 md:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                        Lọc theo phân khúc
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Chọn phân khúc</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={segmentFilter} onValueChange={(v) => setSegmentFilter(v as SegmentFilter)}>
                            <DropdownMenuRadioItem value="all">Tất cả</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="VIP">VIP</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Trung thành">Trung thành</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Tiềm năng">Tiềm năng</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Nguy cơ rời bỏ">Nguy cơ rời bỏ</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Mới">Mới</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Không hoạt động">Không hoạt động</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
        )}
      </CardHeader>
      <CardContent>
        {isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                <Bot className="h-12 w-12 animate-pulse" />
                <p>AI đang phân tích dữ liệu... Quá trình này có thể mất một chút thời gian.</p>
            </div>
        )}
        {error && <div className="text-destructive text-center p-4">{error}</div>}
        {!isAnalyzing && !analysisResult && !error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12" />
                <p>Sẵn sàng khám phá insight về khách hàng của bạn? <br/> Nhấn nút "Chạy phân tích AI" để bắt đầu.</p>
            </div>
        )}
        {analysisResult && (
            <>
                <div className="p-4 mb-6 border bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Tóm tắt của AI</h4>
                    <p className="text-sm text-muted-foreground">{analysisResult.analysisSummary}</p>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">STT</TableHead>
                            <SortableHeader sortKey="customerName">Tên khách hàng</SortableHeader>
                            <SortableHeader sortKey="segment">Phân khúc</SortableHeader>
                            <TableHead>Lý do</TableHead>
                            <TableHead>Hành động đề xuất</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedSegments.map((data, index) => (
                            <TableRow key={data.customerId}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                <Link href={`/customers/${data.customerId}`} className="hover:underline">
                                    {data.customerName}
                                </Link>
                                </TableCell>
                                <TableCell>
                                <Badge variant={getSegmentVariant(data.segment as SegmentFilter)}>{data.segment}</Badge>
                                </TableCell>
                                <TableCell>{data.reason}</TableCell>
                                <TableCell>{data.suggestedAction}</TableCell>
                            </TableRow>
                        ))}
                         {sortedSegments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">Không có khách hàng nào phù hợp với bộ lọc.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </>
        )}
      </CardContent>
       {analysisResult && (
            <CardFooter>
                <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{sortedSegments.length}</strong> trên <strong>{analysisResult.segments.length}</strong> khách hàng.
                </div>
            </CardFooter>
       )}
    </Card>
  )
}
