import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ReportsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo</CardTitle>
        <CardDescription>
          Đây là nơi các báo cáo bán hàng, tồn kho và công nợ sẽ được tạo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Chức năng báo cáo đang được xây dựng.</p>
      </CardContent>
    </Card>
  )
}
