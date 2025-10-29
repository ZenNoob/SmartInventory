import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { List, ListChecks, ListPlus, Truck } from "lucide-react"

export default function GuidePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Hướng dẫn sử dụng</h1>
      <p className="text-muted-foreground mb-8">
        Chào mừng bạn đến với hệ thống Quản lý Bán hàng. Dưới đây là hướng dẫn chi tiết về các chức năng chính.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quản lý Sản phẩm & Kho</CardTitle>
            <CardDescription>Các chức năng liên quan đến việc thiết lập và quản lý sản phẩm.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <span>Bước 1: Quản lý Danh mục & Đơn vị tính</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p>Đây là bước thiết lập nền tảng, cần thực hiện trước khi thêm sản phẩm.</p>
                  <p><strong>Danh mục:</strong></p>
                  <ul>
                    <li>Truy cập trang <strong>Danh mục</strong> từ menu bên trái.</li>
                    <li>Nhấn nút "Thêm danh mục".</li>
                    <li>Điền tên danh mục (ví dụ: "Giống lúa", "Phân bón") và mô tả nếu cần, sau đó lưu lại.</li>
                  </ul>
                  <p><strong>Đơn vị tính (Rất quan trọng):</strong></p>
                  <ul>
                    <li>Truy cập trang <strong>Đơn vị tính</strong>.</li>
                    <li><strong>Tạo đơn vị cơ sở:</strong> Thêm các đơn vị nhỏ nhất như "kg", "cái", "chai". Khi thêm, để trống phần "Quy đổi đơn vị".</li>
                    <li><strong>Tạo đơn vị quy đổi:</strong> Thêm các đơn vị lớn hơn như "Bao", "Thùng".
                      <ul>
                        <li>Trong form, điền tên "Bao".</li>
                        <li>Ở phần "Quy đổi", chọn "Đơn vị cơ sở" là "kg".</li>
                        <li>Nhập "Hệ số quy đổi" là 40 (nếu 1 Bao = 40 kg).</li>
                      </ul>
                    </li>
                     <li>Làm tương tự cho các đơn vị khác (ví dụ: 1 Thùng = 24 Chai).</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <ListPlus className="h-5 w-5 text-primary" />
                    <span>Bước 2: Quản lý Sản phẩm</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p>Trang <strong>Sản phẩm</strong> là nơi bạn quản lý toàn bộ hàng hóa của mình.</p>
                  <p><strong>Thêm sản phẩm mới:</strong></p>
                  <ul>
                    <li>Truy cập trang <strong>Sản phẩm</strong> và nhấn "Thêm sản phẩm".</li>
                    <li>Điền tên sản phẩm, chọn Danh mục và Đơn vị tính chính (ví dụ: đơn vị bán ra chủ yếu là "Bao").</li>
                    <li><strong>Lưu ý:</strong> Đơn vị tính chính sẽ không thể thay đổi sau khi bạn thêm lô nhập hàng đầu tiên.</li>
                  </ul>
                   <p><strong>Nhập hàng (Thêm lô hàng):</strong></p>
                   <ul>
                    <li>Trong form sản phẩm (khi thêm mới hoặc sửa), nhấn nút "Thêm đợt nhập".</li>
                    <li>Điền thông tin cho từng đợt nhập: Ngày nhập, Đơn vị (có thể là "Bao" hoặc "kg"), Số lượng, và Giá nhập trên một đơn vị cơ sở (ví dụ: giá trên 1 kg).</li>
                    <li>Bạn có thể thêm nhiều đợt nhập hàng cho một sản phẩm. Đây là cơ sở để hệ thống tính giá vốn trung bình và tồn kho.</li>
                   </ul>
                  <p><strong>Tồn kho:</strong></p>
                  <ul>
                    <li>Hệ thống tự động tính toán tồn kho dựa trên tổng lượng hàng đã nhập và tổng lượng hàng đã bán.</li>
                    <li>Cột "Tồn kho" trên danh sách sản phẩm hiển thị số lượng còn lại theo đơn vị tính chính của sản phẩm đó.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <span>Bước 3: Quản lý Nhập hàng (Phiếu nhập kho)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p>Trang <strong>Nhập hàng</strong> cho phép bạn tạo các đơn nhập hàng lớn, chứa nhiều sản phẩm khác nhau trong cùng một lần nhập.</p>
                  <p><strong>Tạo đơn nhập hàng:</strong></p>
                  <ul>
                    <li>Truy cập trang <strong>Nhập hàng</strong> từ menu và nhấn "Tạo đơn nhập".</li>
                    <li>Điền các thông tin chung như Ngày nhập hàng và Ghi chú.</li>
                    <li>Nhấn "Thêm sản phẩm" để tìm và chọn các sản phẩm cần nhập vào đơn.</li>
                    <li>Với mỗi sản phẩm, nhập Số lượng và Giá nhập (trên một đơn vị cơ sở).</li>
                    <li>Sau khi thêm tất cả sản phẩm, nhấn "Lưu đơn nhập" để hoàn tất.</li>
                  </ul>
                   <p><strong>Cập nhật tồn kho:</strong></p>
                   <ul>
                    <li>Khi một đơn nhập hàng được tạo hoặc cập nhật, hệ thống sẽ tự động thêm một "lô hàng" tương ứng vào mỗi sản phẩm trong đơn.</li>
                    <li>Tồn kho của sản phẩm sẽ được cập nhật ngay lập tức.</li>
                   </ul>
                   <p><strong>Quản lý phiếu nhập:</strong></p>
                   <ul>
                    <li>Tại trang danh sách, bạn có thể xem lại, sửa hoặc xóa các phiếu nhập hàng đã tạo.</li>
                    <li>Việc sửa/xóa phiếu nhập cũng sẽ tự động điều chỉnh lại tồn kho sản phẩm cho chính xác.</li>
                   </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bán hàng & Khách hàng</CardTitle>
            <CardDescription>Các chức năng liên quan đến giao dịch và quản lý khách hàng.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <ListPlus className="h-5 w-5 text-primary" />
                        <span>Tạo và Quản lý Đơn hàng</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                   <p>Trang <strong>Bán hàng</strong> là nơi thực hiện các giao dịch.</p>
                   <p><strong>Tạo đơn hàng mới:</strong></p>
                   <ul>
                    <li>Truy cập trang <strong>Bán hàng</strong> và nhấn "Tạo đơn hàng".</li>
                    <li>Chọn khách hàng từ danh sách (có thể tìm kiếm theo tên/SĐT) và chọn ngày bán.</li>
                    <li>Nhấn "Thêm sản phẩm" và chọn các sản phẩm khách mua từ danh sách.</li>
                    <li>Với mỗi sản phẩm, nhập Số lượng bán (theo đơn vị bán) và Đơn giá (trên 1 đơn vị cơ sở). Hệ thống sẽ hiển thị tồn kho và giá nhập trung bình để bạn tham khảo.</li>
                    <li>Phía bên phải, nhập thông tin thanh toán: Giảm giá (nếu có), và số tiền Khách thanh toán.</li>
                    <li>Hệ thống sẽ tự động tính toán Nợ cũ, Tổng tiền phải trả và Nợ còn lại.</li>
                    <li>Nhấn "Tạo đơn hàng" để hoàn tất. Sau khi tạo, bạn sẽ được chuyển đến trang chi tiết hóa đơn.</li>
                   </ul>
                   <p><strong>In và quản lý hóa đơn:</strong></p>
                   <ul>
                    <li>Tại trang chi tiết, bạn có thể "In hóa đơn" hoặc "Xuất PDF".</li>
                    <li>Tại trang danh sách đơn hàng, bạn có thể sửa, xem chi tiết, in lại hoặc xóa đơn hàng.</li>
                   </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-primary" />
                        <span>Quản lý Khách hàng</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p>Trang <strong>Khách hàng</strong> giúp bạn quản lý thông tin và công nợ.</p>
                    <ul>
                      <li><strong>Thêm/Sửa khách hàng:</strong> Quản lý thông tin chi tiết của khách hàng, bao gồm thông tin liên hệ, địa chỉ, hạn mức tín dụng và thông tin ngân hàng.</li>
                      <li><strong>Nhập/Xuất file:</strong> Bạn có thể tải về file Excel mẫu, điền thông tin khách hàng và nhập hàng loạt vào hệ thống.</li>
                      <li><strong>Theo dõi Công nợ:</strong> Cột "Công nợ" hiển thị tổng số tiền khách hàng đã trả và số nợ còn lại. Nhấp vào tên khách hàng để xem trang chi tiết lịch sử giao dịch và thanh toán.</li>
                      <li><strong>Dự đoán rủi ro:</strong> Trong trang chi tiết khách hàng, sử dụng chức năng AI "Dự đoán rủi ro" để phân tích khả năng thanh toán nợ của khách hàng.</li>
                    </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Báo cáo & Thống kê</CardTitle>
            <CardDescription>Các công cụ giúp bạn phân tích tình hình kinh doanh.</CardDescription>
          </CardHeader>
          <CardContent>
             <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-primary" />
                        <span>Các loại báo cáo</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p>Menu <strong>Báo cáo</strong> cung cấp các báo cáo chi tiết:</p>
                   <ul>
                    <li><strong>Báo cáo Công nợ:</strong> Tổng hợp công nợ của tất cả khách hàng. Cho phép bạn ghi nhận thanh toán công nợ nhanh chóng cho những khách hàng có nợ cuối kỳ.</li>
                    <li><strong>Báo cáo Doanh thu:</strong> Phân tích doanh thu theo khoảng thời gian tùy chọn (tuần, tháng, năm) hoặc một khoảng ngày cụ thể. Có biểu đồ trực quan hóa dữ liệu.</li>
                    <li><strong>Báo cáo Sản phẩm đã bán:</strong> Thống kê các sản phẩm đã bán trong một khoảng thời gian, giúp bạn biết sản phẩm nào bán chạy nhất, đóng góp bao nhiêu vào tổng doanh thu.</li>
                    <li><strong>Xuất Excel:</strong> Tất cả các báo cáo đều có chức năng xuất ra file Excel để bạn lưu trữ hoặc phân tích sâu hơn.</li>
                   </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
