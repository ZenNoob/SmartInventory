
'use server'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import type { Shift } from '@/lib/types'
import { getAdminServices } from '@/lib/admin-actions'
import { toPlainObject } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { EditShiftForm } from './components/edit-shift-form'


async function getShift(shiftId: string): Promise<Shift | null> {
    try {
        const { firestore } = await getAdminServices();
        const shiftDoc = await firestore.collection('shifts').doc(shiftId).get();

        if (!shiftDoc.exists) {
            return null;
        }
        return toPlainObject(shiftDoc.data()) as Shift;
    } catch (error) {
        console.error("Error fetching shift:", error);
        return null;
    }
}


export default async function EditShiftPage({ params }: { params: { id: string } }) {
  const shift = await getShift(params.id);

  if (!shift) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href={`/shifts/${shift.id}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Chỉnh sửa Ca làm việc</h1>
          <p className="text-sm text-muted-foreground">
            Điều chỉnh lại số tiền đầu ca và cuối ca cho ca của {shift.userName}.
          </p>
        </div>
      </div>

      <EditShiftForm shift={shift} />
    </div>
  );
}
