# 📚 HackFlow9 — Tài liệu Dự án

> **Nguyên tắc:** Chỉ lưu tài liệu **có giá trị tham chiếu lâu dài** —  
> tức là tài liệu mà thành viên mới hoặc phase sau vẫn cần đọc để hiểu hệ thống.

---

## 📂 Cấu trúc

```
docs/
├── ba/          ← Phân tích nghiệp vụ, User Stories, Acceptance Criteria
├── frontend/    ← Đặc tả kỹ thuật Frontend (thêm khi có)
├── ui-ux/       ← Design System, Style Guide (thêm khi có)
├── backend/     ← API Contract, DB Schema, Auth Flow (thêm khi có)
└── meetings/    ← Biên bản họp quan trọng (thêm tay)
```

---

## 📄 Tài liệu hiện có

### 🔵 Business Analysis

| Tài liệu | Mô tả | Tác giả | Sprint |
|---------|-------|---------|--------|
| [BA-01 — Phân tích Nghiệp vụ & Bài toán HackFlow](./ba/ba-01-ke-hoach-phan-tich-nghiep-vu-bai-toan-hackflo.md) | Bài toán HackFlow · 20 User Stories (US-01~20) · Acceptance Criteria đầy đủ · Ma trận ưu tiên P0/P1 · Danh sách điểm cần chốt | Đinh Phương Ly | Sprint 0 |

### 🟢 Architecture & Database Specification (Backend / System)

| Tài liệu | Mô tả | Tác giả | Sprint |
|---------|-------|---------|--------|
| [Kiến trúc Hệ thống Toàn diện (`system-architecture.md`)](./backend/system-architecture.md) | Kiến trúc Full-Stack (React 19 + FastAPI 3-Tier) · Sơ đồ Topology & Sequence · Cơ chế Concurrency `SELECT FOR UPDATE` · Time-Gated Checkpoints · Phân quyền Đội trưởng & Deploy Cloud | Lê Tiến Minh | Sprint 1–4 |
| [Thiết kế Cơ sở Dữ liệu Chi tiết (`database-schema.md`)](./backend/database-schema.md) | Sơ đồ ERD 12 bảng · Đặc tả từng cột, kiểu dữ liệu, PK/FK, Unique Constraints, Indexes · Mở rộng `user_profiles.json` · Dữ liệu Seed mặc định | Lê Tiến Minh | Sprint 1–4 |
| [Bàn giao Hợp đồng API (`api-contract-handover.md`)](./backend/api-contract-handover.md) | Chuẩn ApiResponse Envelope · Danh mục Endpoints · Mã lỗi chuẩn hóa | Lê Tiến Minh | Sprint 1–2 |

---

## 🤔 Khi nào nên thêm vào `docs/`?

| ✅ Nên lưu | ❌ Không cần |
|-----------|------------|
| Đặc tả nghiệp vụ, User Stories, AC | Task setup thông thường (FE-01, UI-01…) |
| API contract, DB schema, Auth flow | Checklist task đã xong |
| Biên bản họp có quyết định thiết kế quan trọng | Ghi chú nháp |
| Tài liệu onboarding thành viên mới | Task hướng dẫn cài đặt môi trường |

---

## 🔄 Kéo tài liệu từ Notion

```bash
cd notion-module

# Kéo task cụ thể — tự phân loại vào đúng thư mục
npm run pull-doc -- --id="HF-17"       # → docs/backend/
npm run pull-doc -- --id="HF-03"       # → docs/ba/

# Chỉ định thư mục cụ thể
npm run pull-doc -- --id="HF-19" --out="docs/backend"
```

> **Lưu ý:** Nội dung từ Notion khi nén block sẽ là text thuần.  
> Nên tự format lại thành Markdown có cấu trúc sau khi kéo về (như BA-01).

---

*Cập nhật: 29/09/2026 · Tổng: 1 tài liệu*
