
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
import { List, ListChecks, ListPlus, Truck, BarChart2, DollarSign, FileText, History, Home, Settings, ShoppingCart, Store, User, Users2, Warehouse, Wallet, Building, Briefcase, Sparkles, PackagePlus, LineChart } from "lucide-react"

export default function GuidePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Hướng dẫn sử dụng Hệ thống</h1>
      <p className="text-muted-foreground mb-8">
        Chào mừng bạn đến với hệ thống Quản lý Bán hàng Thông minh. Dưới đây là hướng dẫn chi tiết về các chức năng chính, mục đích và vai trò người dùng tương ứng.
      </p>

      <div className="space-y-6">

        {/* =======================
              Bảng điều khiển
        ======================== */}
        <Card>
          <CardHeader>
            <CardTitle>1. Bảng điều khiển (Dashboard)</CardTitle>
            <CardDescription>Nơi tổng quan nhanh về tình hình kinh doanh của bạn.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    <span>Tổng quan và Ý nghĩa</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p><strong>Ý nghĩa:</strong> Cung cấp một cái nhìn tổng thể, nhanh chóng về các chỉ số kinh doanh quan trọng nhất trong một khoảng thời gian tùy chọn.</p>
                  <p><strong>Dành cho ai?</strong></p>
                  <ul>
                    <li><strong>Quản trị viên & Kế toán:</strong> Có thể xem tất cả các thẻ chỉ số (Doanh thu, Công nợ, Tồn kho) và các biểu đồ, báo cáo chi tiết.</li>
                    <li><strong>Quản lý kho:</strong> Thường chỉ thấy các thông tin liên quan đến sản phẩm và tồn kho.</li>
                    <li><strong>Nhân viên bán hàng:</strong> Thường không có quyền truy cập Bảng điều khiển, thay vào đó sẽ làm việc chính trên giao diện POS.</li>
                  </ul>
                  <p><strong>Cách sử dụng:</strong></p>
                   <ul>
                    <li><strong>Bộ lọc thời gian:</strong> Sử dụng bộ lọc ngày ở góc trên bên phải để xem dữ liệu theo tuần, tháng, năm hoặc một khoảng thời gian tùy chỉnh.</li>
                    <li><strong>Xem chi tiết:</strong> Nhấp vào các thẻ chỉ số như "Tổng doanh thu", "Tổng nợ phải thu" để xem danh sách chi tiết các giao dịch liên quan.</li>
                    <li><strong>Biểu đồ:</strong> Biểu đồ doanh thu trực quan hóa xu hướng kinh doanh theo thời gian.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* =======================
              Thiết lập ban đầu
        ======================== */}
        <Card>
          <CardHeader>
            <CardTitle>2. Thiết lập Dữ liệu nền tảng</CardTitle>
            <CardDescription>Các bước cấu hình ban đầu cần thiết để hệ thống hoạt động chính xác.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <span>Bước 1: Danh mục & Đơn vị tính</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p><strong>Ý nghĩa:</strong> Đây là bước nền tảng để phân loại sản phẩm và quản lý số lượng một cách chính xác. Cần thực hiện trước khi thêm sản phẩm.</p>
                  <p><strong>Dành cho ai:</strong> Quản trị viên, Quản lý kho.</p>
                  
                  <p><strong>Danh mục (Trang "Danh mục"):</strong></p>
                  <ul>
                    <li>Giúp nhóm các sản phẩm có cùng tính chất (ví dụ: "Phân bón lá", "Thuốc trừ sâu").</li>
                    <li>Nhấn "Thêm danh mục" và điền tên để tạo mới.</li>
                  </ul>

                  <p><strong>Đơn vị tính (Trang "Đơn vị tính"):</strong></p>
                  <ul>
                    <li><strong>Đơn vị cơ sở:</strong> Thêm các đơn vị nhỏ nhất bạn dùng để quản lý (kg, lít, cái, chai). Khi thêm, để trống phần "Quy đổi".</li>
                    <li><strong>Đơn vị quy đổi:</strong> Thêm các đơn vị lớn hơn (Bao, Thùng). Ví dụ: để tạo "Bao", chọn "Đơn vị cơ sở" là "kg" và nhập "Hệ số quy đổi" là 40 (nếu 1 Bao = 40 kg).</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <span>Bước 2: Nhà cung cấp</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p><strong>Ý nghĩa:</strong> Quản lý danh sách các đối tác cung cấp hàng hóa, là cơ sở để tạo phiếu nhập và theo dõi công nợ phải trả.</p>
                    <p><strong>Dành cho ai:</strong> Quản trị viên, Quản lý kho.</p>
                    <p><strong>Cách sử dụng:</strong></p>
                    <ul>
                        <li>Truy cập trang "Nhà cung cấp" từ menu Danh mục.</li>
                        <li>Nhấn "Thêm NCC" và điền các thông tin cần thiết như tên, số điện thoại, địa chỉ...</li>
                    </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <ListPlus className="h-5 w-5 text-primary" />
                    <span>Bước 3: Sản phẩm</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p><strong>Ý nghĩa:</strong> Quản lý toàn bộ hàng hóa kinh doanh, bao gồm giá bán, thông tin và quan trọng nhất là lịch sử nhập kho.</p>
                    <p><strong>Dành cho ai:</strong> Quản trị viên, Quản lý kho.</p>
                    <p><strong>Cách sử dụng:</strong></p>
                    <ul>
                        <li>Truy cập trang "Sản phẩm", nhấn "Thêm sản phẩm".</li>
                        <li>Điền tên, chọn Danh mục và Đơn vị tính chính (là đơn vị bạn thường dùng để bán).</li>
                        <li>Nhập giá bán đề xuất (tính trên 1 đơn vị cơ sở).</li>
                        <li><strong>Nhập hàng:</strong> Trong form sản phẩm, nhấn "Thêm đợt nhập" để ghi nhận các lô hàng đã mua, bao gồm ngày nhập, số lượng và giá nhập. Đây là cơ sở để hệ thống tính tồn kho và giá vốn.</li>
                    </ul>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>

        {/* =======================
              Nghiệp vụ hằng ngày
        ======================== */}
        <Card>
          <CardHeader>
            <CardTitle>3. Nghiệp vụ Hằng ngày</CardTitle>
            <CardDescription>Các hoạt động chính diễn ra mỗi ngày tại cửa hàng.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <span>Nhập hàng (Tạo phiếu nhập kho)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p><strong>Ý nghĩa:</strong> Ghi nhận việc nhập hàng hóa từ nhà cung cấp một cách có hệ thống, tự động cập nhật tồn kho cho nhiều sản phẩm cùng lúc.</p>
                  <p><strong>Dành cho ai:</strong> Quản trị viên, Quản lý kho.</p>
                  <p><strong>Cách sử dụng:</strong></p>
                  <ul>
                    <li>Truy cập trang "Nhập hàng", nhấn "Tạo đơn nhập".</li>
                    <li>Chọn Nhà cung cấp, ngày nhập.</li>
                    <li>Dùng thanh tìm kiếm hoặc quét mã vạch để thêm các sản phẩm vào phiếu.</li>
                    <li>Với mỗi sản phẩm, nhập Số lượng và Giá nhập (trên một đơn vị cơ sở).</li>
                    <li>Lưu đơn nhập để hoàn tất. Tồn kho của các sản phẩm sẽ được tự động cộng thêm.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <span>POS - Bán hàng tại quầy</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                  <p><strong>Ý nghĩa:</strong> Giao diện tối ưu cho việc bán hàng nhanh chóng, hiệu quả tại quầy. Hỗ trợ quét mã vạch, quản lý ca làm việc và tự động tính toán công nợ.</p>
                  <p><strong>Dành cho ai:</strong> Nhân viên bán hàng, Quản trị viên, Kế toán, Quản lý kho.</p>
                  <p><strong>Quy trình làm việc:</strong></p>
                   <ol>
                        <li><strong>Bắt đầu ca:</strong> Khi bắt đầu, nhân viên cần nhập số tiền mặt có sẵn trong ngăn kéo để hệ thống theo dõi.</li>
                        <li><strong>Bán hàng:</strong>
                            <ul>
                                <li>Quét mã vạch hoặc tìm kiếm để thêm sản phẩm vào đơn hàng.</li>
                                <li>Chọn khách hàng (có thể chọn "Khách lẻ").</li>
                                <li>Điều chỉnh số lượng, giá bán nếu cần.</li>
                                <li>Nhập thông tin giảm giá, điểm thưởng (nếu có).</li>
                                <li>Nhập số tiền khách đưa, hệ thống sẽ tự tính tiền thối lại.</li>
                            </ul>
                        </li>
                        <li><strong>Thanh toán:</strong> Nhấn "Thanh toán" để hoàn tất. Đơn hàng và công nợ (nếu có) sẽ được tự động ghi nhận.</li>
                        <li><strong>Đóng ca:</strong> Cuối ca làm việc, nhân viên chọn "Đóng ca", nhập số tiền mặt thực tế trong ngăn kéo. Hệ thống sẽ tạo một báo cáo ca chi tiết, so sánh doanh thu và chênh lệch tiền mặt.</li>
                   </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span>Sổ quỹ (Thu - Chi)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p><strong>Ý nghĩa:</strong> Ghi nhận tất cả các khoản thu và chi tiền mặt không liên quan trực tiếp đến việc bán hàng hay nhập hàng (ví dụ: chi tiền điện, thu tiền cho thuê mặt bằng).</p>
                    <p><strong>Dành cho ai:</strong> Quản trị viên, Kế toán.</p>
                    <p><strong>Cách sử dụng:</strong></p>
                    <ul>
                        <li>Truy cập trang "Sổ quỹ", nhấn "Tạo phiếu mới".</li>
                        <li>Chọn loại "Phiếu thu" hoặc "Phiếu chi".</li>
                        <li>Điền ngày, số tiền, lý do và danh mục (nếu có) rồi lưu lại.</li>
                    </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* =======================
              Báo cáo & Phân tích
        ======================== */}
        <Card>
          <CardHeader>
            <CardTitle>4. Báo cáo, Phân tích & Quản lý</CardTitle>
            <CardDescription>Các công cụ giúp bạn theo dõi, phân tích và quản lý hoạt động kinh doanh.</CardDescription>
          </CardHeader>
          <CardContent>
             <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-primary" />
                        <span>Các loại báo cáo</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                   <p>Menu "Báo cáo & Quản lý" cung cấp các báo cáo chi tiết, mỗi báo cáo phục vụ một mục đích và vai trò cụ thể.</p>
                   <ul>
                    <li><strong>Quản lý Ca:</strong> (Quản trị viên) Xem lại lịch sử các ca làm việc, chi tiết doanh thu, chênh lệch tiền mặt của từng ca.</li>
                    <li><strong>Báo cáo Thu-Chi:</strong> (Quản trị viên, Kế toán) Tổng hợp tất cả doanh thu bán hàng, chi phí nhập hàng và các khoản thu/chi khác từ sổ quỹ để cho ra lợi nhuận cuối cùng.</li>
                    <li><strong>Báo cáo Lợi nhuận:</strong> (Quản trị viên, Kế toán) Phân tích lợi nhuận trên từng sản phẩm, dựa trên doanh thu và giá vốn trung bình.</li>
                    <li><strong>Công nợ KH:</strong> (Quản trị viên, Kế toán) Tổng hợp công nợ của tất cả khách hàng. Cho phép ghi nhận thanh toán nhanh.</li>
                    <li><strong>Công nợ NCC:</strong> (Quản trị viên, Kế toán, Quản lý kho) Tổng hợp công nợ phải trả cho tất cả nhà cung cấp.</li>
                    <li><strong>Lịch sử Giao dịch:</strong> (Quản trị viên, Kế toán) Xem chi tiết biến động công nợ (phát sinh, thanh toán) của từng khách hàng trong một kỳ.</li>
                    <li><strong>Đối soát Công nợ NCC:</strong> (Quản trị viên, Kế toán, Quản lý kho) Xem chi tiết biến động công nợ với nhà cung cấp.</li>
                    <li><strong>Doanh thu & Sản phẩm đã bán:</strong> (Quản trị viên, Kế toán) Phân tích doanh thu theo thời gian, xem sản phẩm nào bán chạy nhất.</li>
                    <li><strong>Tồn kho:</strong> (Quản trị viên, Quản lý kho) Báo cáo nhập - xuất - tồn chi tiết cho từng sản phẩm.</li>
                   </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <span>Phân tích bằng Trí tuệ nhân tạo (AI)</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p><strong>Ý nghĩa:</strong> Tận dụng AI để khám phá các thông tin chi tiết ẩn sau dữ liệu bán hàng, giúp đưa ra quyết định kinh doanh tốt hơn.</p>
                    <p><strong>Dành cho ai:</strong> Quản trị viên, Kế toán.</p>
                    <ul>
                      <li><strong>Phân khúc khách hàng:</strong> AI sẽ tự động phân nhóm khách hàng (VIP, Tiềm năng, Nguy cơ rời bỏ...) dựa trên lịch sử mua hàng và đưa ra gợi ý chăm sóc phù hợp cho từng nhóm.</li>
                      <li><strong>Phân tích rổ hàng:</strong> AI phân tích các đơn hàng để tìm ra những sản phẩm nào thường được mua cùng nhau, từ đó đề xuất các chiến lược bán chéo, tạo combo khuyến mãi.</li>
                      <li><strong>Dự báo & Đề xuất (trên trang Sản phẩm):</strong> AI dự báo nhu cầu sản phẩm trong tương lai và đề xuất số lượng cần nhập hàng, giúp tối ưu tồn kho.</li>
                    </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* =======================
              Quản trị hệ thống
        ======================== */}
        <Card>
          <CardHeader>
            <CardTitle>5. Quản trị Hệ thống</CardTitle>
            <CardDescription>Các chức năng dành riêng cho Quản trị viên.</CardDescription>
          </CardHeader>
          <CardContent>
             <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Users2 className="h-5 w-5 text-primary" />
                        <span>Quản lý Người dùng & Phân quyền</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p><strong>Ý nghĩa:</strong> Tạo tài khoản cho nhân viên và kiểm soát chặt chẽ quyền truy cập của họ vào từng chức năng.</p>
                    <p><strong>Dành cho ai:</strong> Quản trị viên.</p>
                     <p><strong>Cách sử dụng:</strong></p>
                    <ul>
                      <li>Truy cập trang "Người dùng", nhấn "Thêm người dùng".</li>
                      <li>Nhập thông tin tài khoản, mật khẩu và chọn một vai trò (Role).</li>
                      <li>Nếu chọn vai trò "Tùy chỉnh", bạn có thể tích vào các ô để cấp quyền chi tiết cho từng module (Xem, Thêm, Sửa, Xóa).</li>
                      <li>Sử dụng nút "Áp dụng mặc định" để nhanh chóng gán bộ quyền chuẩn cho một vai trò, sau đó tùy chỉnh thêm nếu cần.</li>
                    </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <span>Cài đặt</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pl-7 text-muted-foreground">
                    <p><strong>Ý nghĩa:</strong> Tùy chỉnh các thông số chung của toàn bộ hệ thống.</p>
                    <p><strong>Dành cho ai:</strong> Quản trị viên.</p>
                     <p><strong>Các cài đặt chính:</strong></p>
                    <ul>
                      <li><strong>Thông tin doanh nghiệp:</strong> Cập nhật tên, địa chỉ, SĐT để hiển thị trên hóa đơn.</li>
                      <li><strong>Giao diện:</strong> Thay đổi màu sắc chủ đạo của ứng dụng.</li>
                      <li><strong>Hàng tồn kho:</strong> Thiết lập ngưỡng cảnh báo tồn kho tối thiểu chung cho tất cả sản phẩm.</li>
                      <li><strong>Thuế:</strong> Cấu hình tỷ lệ VAT.</li>
                      <li><strong>Khách hàng thân thiết:</strong> Bật/tắt và cấu hình chương trình tích điểm, phân hạng thành viên.</li>
                      <li><strong>Khu vực nguy hiểm:</strong> Sao lưu toàn bộ dữ liệu ra file Excel hoặc xóa dữ liệu giao dịch để làm mới hệ thống. <strong>Hãy thận trọng với chức năng này.</strong></li>
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
