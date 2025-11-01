'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  ArrowUp,
  ArrowDown,
  MoreHorizontal
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import { Shift } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

type SortKey = 'startTime' | 'userName' | 'status' | 'totalRevenue' | 'cashDifference';

export default function ShiftsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('startTime')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const firestore = useFirestore()

  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'shifts'), orderBy('startTime', 'desc'))
  }, [firestore])

  const { data: shifts, isLoading } = useCollection<Shift>(shiftsQuery)

  const filteredShifts = shifts?.filter(shift => {
    const term = searchTerm.toLowerCase()
    return (
      shift.userName.toLowerCase().includes(term) ||
      shift.id.toLowerCase().includes(term)
    )
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedShifts = useMemo(() => {
    let sortableItems = [...(filteredShifts || [])]
    if (sortKey) {
      sortableItems.sort((a, b) => {
        let valA, valB

        switch (sortKey) {
          case 'startTime':
            valA = new Date(a.startTime).getTime()
            valB = new Date(b.startTime).getTime()
            break
          case 'totalRevenue':
          case 'cashDifference':
            valA = a[sortKey] || 0
            valB = b[sortKey] || 0
            break
          default:
            valA = (a[sortKey] || '').toString().toLowerCase()
            valB = (b[sortKey] || '').toString().toLowerCase()
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [filteredShifts, sortKey, sortDirection])

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Quản lý Ca làm việc</CardTitle>
              <CardDescription>
                Xem lại lịch sử và chi tiết các ca làm việc của nhân viên.
              </CardDescription>
            </div>
          </div>
           <div className="flex items-center gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo tên nhân viên, mã ca..."
                    className="w-full rounded-lg bg-background pl-8 md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 hidden md:table-cell">STT</TableHead>
                <SortableHeader sortKey="startTime">Thời gian bắt đầu</SortableHeader>
                <SortableHeader sortKey="userName">Nhân viên</SortableHeader>
                <SortableHeader sortKey="status">Trạng thái</SortableHeader>
                <TableHead className="text-right">Tiền đầu ca</TableHead>
                <SortableHeader sortKey="totalRevenue" className="text-right">Doanh thu</SortableHeader>
                <SortableHeader sortKey="cashDifference" className="text-right">Chênh lệch</SortableHeader>
                <TableHead>
                  <span className="sr-only">Hành động</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center">Đang tải...</TableCell></TableRow>}
              {!isLoading && sortedShifts?.map((shift, index) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium hidden md:table-cell">{index + 1}</TableCell>
                    <TableCell>
                      {new Date(shift.startTime).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell>{shift.userName}</TableCell>
                    <TableCell>
                        <Badge variant={shift.status === 'active' ? 'default' : 'secondary'}>
                            {shift.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
                        </Badge>
                    </TableCell>
                     <TableCell className="text-right">{formatCurrency(shift.startingCash)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(shift.totalRevenue)}</TableCell>
                    <TableCell className={`text-right font-semibold ${shift.cashDifference && shift.cashDifference !== 0 ? 'text-destructive' : ''}`}>{formatCurrency(shift.cashDifference || 0)}</TableCell>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/shifts/${shift.id}`}>Xem chi tiết</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && sortedShifts?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                           Chưa có ca làm việc nào.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedShifts?.length || 0}</strong> trên <strong>{shifts?.length || 0}</strong> ca làm việc
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
