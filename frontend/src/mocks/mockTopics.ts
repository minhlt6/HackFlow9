import type { Topic } from '../types/topic';

export const INITIAL_MOCK_TOPICS: Topic[] = [
  {
    id: 'top-01',
    title: 'AI Agent Tự Động Hóa Quy Trình Doanh Nghiệp (Enterprise AI Agents)',
    description: '',
    max_teams: 5,
    current_teams: 3,
    remaining_slots: 2,
    is_active: true,
    status: 'AVAILABLE',
    subtopics: [
      {
        id: 'sub-01-a',
        topic_id: 'top-01',
        title: 'Hệ thống AI Customer Support Agent Đa Kênh với Hybrid Search RAG',
        description:
          'Tự động xử lý khiếu nại, đối soát thông tin giao dịch và phản hồi khách hàng theo thời gian thực.',
        max_teams: 3,
        current_teams: 2,
        remaining_slots: 1,
        is_active: true,
      },
      {
        id: 'sub-01-b',
        topic_id: 'top-01',
        title: 'AI Agent Tự Động Đối Soát Hợp Đồng & Thẩm Định Hồ Sơ Pháp Lý',
        description:
          'Trích xuất điều khoản, kiểm tra rủi ro tuân thủ pháp lý và cảnh báo sai lệch tài chính.',
        max_teams: 2,
        current_teams: 1,
        remaining_slots: 1,
        is_active: true,
      },
    ],
  },
  {
    id: 'top-02',
    title: 'DeepTech & Generative AI Trong Y Tế & Chăm Sóc Sức Khỏe',
    description:
      'Ứng dụng các mô hình thị giác máy tính và học sâu trên dữ liệu ảnh y tế (DICOM/X-quang) kết hợp Large Language Models hỗ trợ bác sĩ sàng lọc tiền lâm sàng.',
    max_teams: 5,
    current_teams: 5,
    remaining_slots: 0,
    is_active: true,
    status: 'FULL',
    subtopics: [
      {
        id: 'sub-02-a',
        topic_id: 'top-02',
        title: 'Sàng Lọc Tổn Thương Phổi Thời Gian Thực Trên Ảnh Chụp X-Quang',
        description:
          'Mô hình phân vùng tổn thương hỗ trợ bác sĩ chẩn đoán tại trạm y tế tuyến đầu.',
        max_teams: 3,
        current_teams: 3,
        remaining_slots: 0,
        is_active: true,
      },
      {
        id: 'sub-02-b',
        topic_id: 'top-02',
        title: 'Trợ Lý Ảo Tổng Hợp Bệnh Án & Khuyến Nghị Liều Lượng Thuốc',
        description:
          'Phân tích tiền sử bệnh nhân, tương tác thuốc và cảnh báo dị ứng tự động.',
        max_teams: 2,
        current_teams: 2,
        remaining_slots: 0,
        is_active: true,
      },
    ],
  },
  {
    id: 'top-03',
    title: 'GreenTech & Tối Ưu Năng Lượng Tái Tạo Với AI & IoT',
    description:
      'Phát triển giải pháp giám sát, phân tích chuỗi thời gian (Time-series) và dự báo phụ tải năng lượng mặt trời, điện gió kết hợp điều khiển biên IoT thông minh.',
    max_teams: 5,
    current_teams: 1,
    remaining_slots: 4,
    is_active: true,
    status: 'AVAILABLE',
    subtopics: [
      {
        id: 'sub-03-a',
        topic_id: 'top-03',
        title: 'Dự Báo Sản Lượng Điện Năng Lượng Mặt Trời Bằng Vision & Weather AI',
        description:
          'Kết hợp ảnh mây vệ tinh và dữ liệu thời tiết để dự báo công suất phát lưới điện.',
        max_teams: 3,
        current_teams: 1,
        remaining_slots: 2,
        is_active: true,
      },
      {
        id: 'sub-03-b',
        topic_id: 'top-03',
        title: 'Hệ Thống Tối Ưu Tiêu Thụ Điện Tòa Nhà Thông Minh Theo Thời Gian Thực',
        description:
          'Học tăng cường (RL) điều chỉnh HVAC và chiếu sáng giảm phát thải carbon.',
        max_teams: 2,
        current_teams: 0,
        remaining_slots: 2,
        is_active: true,
      },
    ],
  },
  {
    id: 'top-04',
    title: 'FinTech: Phát Hiện Gian Lận Giao Dịch Bằng Đồ Thị Tri Thức (Graph AI)',
    description:
      'Sử dụng Graph Neural Networks (GNN) và phân tích luồng tiền đa tầng nhằm phát hiện các mẫu hình rửa tiền, tài khoản mạo danh và mạng lưới gian lận thẻ tín dụng.',
    max_teams: 4,
    current_teams: 4,
    remaining_slots: 0,
    is_active: true,
    status: 'FULL',
    subtopics: [],
  },
  {
    id: 'top-05',
    title: 'Smart City: Điều Tiết Giao Thông Thông Minh & Edge Vision AI',
    description:
      'Triển khai các mô hình Object Detection nhẹ chạy trực tiếp trên thiết bị nhúng (Jetson, Raspberry Pi) để đếm lưu lượng, phát hiện sự cố và điều phối tín hiệu đèn.',
    max_teams: 6,
    current_teams: 2,
    remaining_slots: 4,
    is_active: true,
    status: 'AVAILABLE',
    subtopics: [
      {
        id: 'sub-05-a',
        topic_id: 'top-05',
        title: 'Tự Động Phát Hiện Tai Nạn & Xe Cứu Hộ Tại Các Nút Giao',
        description:
          'Ưu tiên luồng xanh cho phương tiện khẩn cấp và cảnh báo va chạm giao thông.',
        max_teams: 3,
        current_teams: 1,
        remaining_slots: 2,
        is_active: true,
      },
      {
        id: 'sub-05-b',
        topic_id: 'top-05',
        title: 'Thuật Toán Điều Tiết Chu Kỳ Đèn Giao Thông Thích Ứng Mật Độ Xe',
        description:
          'Giảm thời gian chờ trung bình tại các giao lộ giờ cao điểm bằng Machine Learning.',
        max_teams: 3,
        current_teams: 1,
        remaining_slots: 2,
        is_active: true,
      },
    ],
  },
];
