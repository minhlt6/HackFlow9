---
id: "HF-27"
title: "Lập trình API CRUD /announcements"
status: "In Review"
assignee: "Nông Lan Anh"
priority: "P1"
deadline: "2026-10-15"
notion_url: "https://app.notion.com/p/HF-27-L-p-tr-nh-API-CRUD-announcements-3f51caaa7e8581318608d4e8012fff25"
last_edited: "23:44:00 15/10/2026"
pulled_at: "09:15:51 16/10/2026"
---

# HF-27 — Lập trình API CRUD /announcements

| | |
|---|---|
| **Status** | In Review |
| **Assignee** | Nông Lan Anh |
| **Sprint** | — |
| **Ưu tiên** | P1 |
| **Hạn hoàn thành** | 2026-10-15 |
| **Cập nhật** | 23:44:00 15/10/2026 |
| **Notion** | [Mở trang](https://app.notion.com/p/HF-27-L-p-tr-nh-API-CRUD-announcements-3f51caaa7e8581318608d4e8012fff25) |

---

## 🎯 Mục tiêu
Lập trình bộ API quản lý thông báo cho Ban tổ chức.

## ✅ Acceptance Criteria
- [ ] POST /announcements (Chỉ Admin).
- [ ] GET /announcements (Cho mọi User đã đăng nhập, có hỗ trợ pagination).
- [ ] PUT và DELETE (Chỉ Admin).
- Dùng SQLAlchemy model Announcement gồm title, content, priority, created_at.

---
*Kéo từ Notion lúc 09:15:51 16/10/2026 bởi notion-module*
