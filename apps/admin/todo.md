# Thẩm định vị trí cửa hàng giặt sấy — Liên Khu 4–5

- [x] Xác lập bộ tiêu chí điểm vị trí: cầu dân sinh, B2B, cạnh tranh, giao thông, chi phí và rủi ro môi trường.
- [x] Cập nhật đối thủ trực tiếp quanh Liên Khu 4–5, Liên Khu 5–6, Đường số 1/KDC Vĩnh Lộc và Bình Thành.
- [x] Xác minh các cụm dân cư, trường, y tế, lưu trú và F&B có thể tạo cầu định kỳ.
- [x] Chấm điểm và xếp hạng tối thiểu ba khu vực ứng viên.
- [x] Xác định thông số bắt buộc của mặt bằng và danh sách kiểm tra khảo sát thực địa.
- [x] Bàn giao khuyến nghị mở cửa hàng, điều kiện dừng và bước xác minh trước khi ký thuê.

## Nâng cấp website cửa hàng giặt sấy

- [x] Chuyển nhận diện website sang 4T: Tử tế – Tận tâm – Thơm sạch – Tiện lợi, sử dụng tài sản thương hiệu được cung cấp.
- [x] Hiển thị địa chỉ 123 Nguyễn Văn A, P. Bình Hòa, TP. Thuận An, Bình Dương và số hotline/Zalo 0909 123 456 theo thông tin brand.
- [x] Hoàn thiện mô hình dữ liệu cho đơn hàng, trạng thái, khách hàng, điểm, đánh giá và chỉ số quản trị.
- [x] Nâng cấp dự án sang nền tảng có cơ sở dữ liệu và tài khoản người dùng.
- [x] Xây dựng luồng đặt đơn cho khách chưa đăng nhập và khách có tài khoản.
- [x] Xây dựng tài khoản khách hàng, lịch sử đơn, tiến độ xử lý và tích điểm.
- [x] Xây dựng phương án thanh toán tiền mặt, chuyển khoản/QR và điểm mở rộng ví điện tử.
- [x] Xây dựng khu vực quản trị đơn hàng, khách hàng, đánh giá và thống kê truy cập/đơn hàng.
- [x] Hoàn thiện chat hỗ trợ và liên kết Zalo cửa hàng sau khi có số Zalo/đường dẫn chính thức.
- [x] Kiểm tra luồng người dùng, ràng buộc của khách vãng lai và điều kiện tích hợp thanh toán trước khi bàn giao.
- [ ] Kết nối thanh toán trực tuyến thật sau khi chủ cửa hàng chọn nhà cung cấp và cung cấp mã QR/ngân hàng hoặc thông tin merchant ví điện tử.

## Phiên bản một tệp HTML cục bộ

- [x] Rà soát tệp website.html người dùng cung cấp và giữ lại phần mã có thể tái sử dụng.
- [x] Đóng gói giao diện và tương tác 4T trong một tệp HTML chạy trực tiếp bằng trình duyệt.
- [x] Lưu đơn, tài khoản minh họa, điểm, đánh giá, chat và chỉ số cục bộ bằng localStorage.
- [x] Nêu rõ giới hạn: bản một tệp không có đăng nhập/xử lý thanh toán/cơ sở dữ liệu thật.
- [x] Kiểm tra tệp HTML độc lập trên trình duyệt và bàn giao tệp chạy được.

## Sửa lỗi phiên bản HTML độc lập

- [x] Chỉ hiển thị một hệ điều hướng: menu desktop hoặc menu điện thoại tùy theo kích thước màn hình.
- [x] Thay hình minh họa tự dựng trong hero bằng ảnh banner thương hiệu 4T chính thức do người dùng cung cấp.
- [x] Kiểm tra lại hiển thị desktop và điện thoại rồi bàn giao tệp HTML đã sửa.

## Sửa lỗi phông chữ tệp customer.html

- [x] Rà soát các khai báo phông chữ, mã hóa và đoạn văn tiếng Việt bị hiển thị không nhất quán.
- [x] Chuẩn hóa font stack hỗ trợ tiếng Việt cho nội dung, nút và biểu mẫu.
- [x] Kiểm tra trực tiếp và bàn giao tệp customer.html đã sửa.

## Mở rộng giao–nhận customer.html

- [x] Thêm lựa chọn giao–nhận tại cửa hàng hoặc theo thông tin khách hàng yêu cầu.
- [x] Tính phí giao–nhận theo khối lượng và khoảng cách ước tính: miễn phí khi trên 10 kg trong 5 km, các trường hợp khác 2.000 đồng/km.
- [x] Hiển thị rõ phí ship và tổng tiền cập nhật theo từng lựa chọn giao–nhận.
- [x] Tự điền thông tin tài khoản đã đăng nhập nhưng giữ các trường có thể chỉnh sửa.
- [x] Tối ưu biểu mẫu và bố cục cho cả desktop lẫn điện thoại.
- [x] Kiểm tra các kịch bản phí ship và bàn giao tệp customer.html cập nhật.

## Tự động tính khoảng cách theo địa chỉ

- [x] Cấu hình điểm xuất phát chính thức: 123 Liên Khu 4–5, Quận Bình Tân, TP.HCM.
- [x] Xác định dịch vụ định vị và định tuyến phù hợp cho website có máy chủ và dịch vụ bản đồ có xác thực.
- [x] Thêm cấu hình địa chỉ cửa hàng và tra cứu tuyến đường từ địa chỉ khách hàng điền.
- [x] Tính quãng đường theo tuyến xe và tự động cập nhật phí ship, tổng đơn cùng trạng thái tra cứu.
- [x] Xử lý rõ trường hợp không có mạng, không tìm thấy địa chỉ hoặc địa chỉ chưa đủ chi tiết.
- [x] Kiểm tra luồng tra cứu, giao diện desktop/điện thoại và chuẩn bị bàn giao website cập nhật.
- [x] Hiển thị thông báo thân thiện khi thiết bị mất mạng, dịch vụ bản đồ tạm thời không phản hồi hoặc địa chỉ không thể định tuyến.
- [x] Lưu checkpoint và bàn giao phiên bản website đã cập nhật định tuyến tự động.
- [ ] Gửi liên kết phiên bản website đã xuất bản có tính năng định tuyến tự động cho người dùng.
