---
id: "HF-04"
title: "Viáº¿t Ä‘áº·c táº£ SRS luá»“ng Táº¡o Ä‘á»™i & Chá»n Ä‘á» tÃ i"
status: "In Review"
assignee: "Phuong ly Dinh"
priority: "P0"
deadline: "2026-10-05"
notion_url: "https://app.notion.com/p/HF-04-Vi-t-c-t-SRS-lu-ng-T-o-i-Ch-n-t-i-6b6ae9627fac485db5ca4ade280f69a1"
last_edited: "00:00:00 5/10/2026"
pulled_at: "00:05:54 5/10/2026"
---

# HF-04 â€” Viáº¿t Ä‘áº·c táº£ SRS luá»“ng Táº¡o Ä‘á»™i & Chá»n Ä‘á» tÃ i

| | |
|---|---|
| **Status** | In Review |
| **Assignee** | Phuong ly Dinh |
| **Sprint** | â€” |
| **Æ¯u tiÃªn** | P0 |
| **Háº¡n hoÃ n thÃ nh** | 2026-10-05 |
| **Cáº­p nháº­t** | 00:00:00 5/10/2026 |
| **Notion** | [Má»Ÿ trang](https://app.notion.com/p/HF-04-Vi-t-c-t-SRS-lu-ng-T-o-i-Ch-n-t-i-6b6ae9627fac485db5ca4ade280f69a1) |

---

@Phuong ly Dinh

# Má»¥c tiÃªu
Viáº¿t Ä‘áº·c táº£ chá»©c nÄƒng cho táº¡o/join Ä‘á»™i vÃ  chá»n Ä‘á» tÃ i cÃ³ quota, khÃ³a sau khi chá»n.

## Checklist thá»±c hiá»‡n
- Trong SRS â€” Sprint 1 & 2, mÃ´ táº£ Ä‘iá»u kiá»‡n chá»‰ tÃ i khoáº£n APPROVED má»›i Ä‘Æ°á»£c táº¡o hoáº·c tham gia Ä‘á»™i.
- Äáº·c táº£ táº¡o Ä‘á»™i, sinh mÃ£ má»i duy nháº¥t, kiá»ƒm tra tÃªn Ä‘á»™i vÃ  giá»›i háº¡n 3â€“5 ngÆ°á»i.
- Äáº·c táº£ join báº±ng invite code: mÃ£ sai/háº¿t háº¡n, Ä‘á»™i Ä‘áº§y, ngÆ°á»i dÃ¹ng Ä‘Ã£ thuá»™c Ä‘á»™i khÃ¡c vÃ  dá»¯ liá»‡u khÃ´ng Ä‘á»•i khi lá»—i.
- Äáº·c táº£ danh sÃ¡ch Ä‘á» tÃ i, quota, current_teams, chá»n má»™t Ä‘á» tÃ i vÃ  cÆ¡ cháº¿ khÃ³a/há»§y chá»n khi cÃ²n háº¡n.
- MÃ´ táº£ tranh cháº¥p Ä‘á»“ng thá»i báº±ng transaction + SELECT FOR UPDATE, lá»—i TOPIC_FULL vÃ  cÃ¡c quyá»n bá»‹ cháº·n.
- Váº½ flowchart hoáº·c sequence diagram cho happy path vÃ  exception/error path.

## Definition of Done
SRS cÃ³ Ä‘áº§y Ä‘á»§ rule 3â€“5 thÃ nh viÃªn, invite code, quota, khÃ³a Ä‘á» tÃ i, kiá»ƒm tra phÃ¢n quyá»n, transaction vÃ  mÃ£ lá»—i; Ä‘á»§ chi tiáº¿t Ä‘á»ƒ chuyá»ƒn thÃ nh API/UI/test case.

## Quy Æ°á»›c bÃ n giao
- Cáº­p nháº­t tráº¡ng thÃ¡i In Review khi Ä‘Ã£ cÃ³ sáº£n pháº©m vÃ  link bÃ n giao.
- Chá»‰ chuyá»ƒn Done sau khi PM kiá»ƒm tra DoD vÃ  nghiá»‡m thu.

## Sáº£n pháº©m bÃ n giao
ÄÃ£ hoÃ n thiá»‡n Ä‘áº·c táº£ trong SRS â€” Sprint 1 & 2: Auth & Onboarding, má»¥c 9. SRS â€” Teams & Topics (HF-04).
Ná»™i dung Ä‘Ã£ bao phá»§ Ä‘Ãºng Definition of Done cá»§a HF-04:
- Äiá»u kiá»‡n quyá»n: chá»‰ role CANDIDATE cÃ³ approval_status = APPROVED Ä‘Æ°á»£c táº¡o/join Ä‘á»™i vÃ  chá»n/há»§y chá»n Ä‘á» tÃ i; PENDING/REJECTED bá»‹ cháº·n.
- Luá»“ng táº¡o Ä‘á»™i: validate tÃªn Ä‘á»™i, giá»›i háº¡n 3â€“5 thÃ nh viÃªn, sinh invite code unique 6 kÃ½ tá»±, gÃ¡n Ä‘á»™i trÆ°á»Ÿng vÃ  tráº¡ng thÃ¡i INCOMPLETE/VALID.
- Luá»“ng join: mÃ£ sai/háº¿t háº¡n/khÃ¡c cuá»™c thi, Ä‘á»™i Ä‘áº§y, user Ä‘Ã£ thuá»™c Ä‘á»™i khÃ¡c, request trÃ¹ng/Ä‘á»“ng thá»i; lá»—i khÃ´ng lÃ m thay Ä‘á»•i dá»¯ liá»‡u.
- Luá»“ng Topics: danh sÃ¡ch Ä‘á» tÃ i, max_teams_quota, current_teams, chá»n má»™t Ä‘á» tÃ i, khÃ³a sau thá»i gian cho phÃ©p vÃ  há»§y chá»n khi cÃ²n háº¡n.
- Concurrency: transaction + SELECT FOR UPDATE trÃªn Team/Topic; cáº­p nháº­t team.topic_id vÃ  current_teams nguyÃªn tá»­; quota Ä‘áº§y tráº£ TOPIC_FULL vÃ  rollback.
- API contract, API envelope, mÃ£ lá»—i, flowchart happy/exception path, sequence diagram vÃ  ma tráº­n bÃ n giao UI/Backend/UAT.

### LiÃªn káº¿t triá»ƒn khai theo luá»“ng dá»± Ã¡n
- Backend triá»ƒn khai Teams API theo POST /api/v1/teams vÃ  POST /api/v1/teams/join táº¡i HF-20.
- Backend triá»ƒn khai Topics API theo POST /api/v1/topics/select, transaction vÃ  SELECT FOR UPDATE táº¡i HF-21.
- UI/UX sá»­ dá»¥ng cÃ¡c tráº¡ng thÃ¡i Teams/Topics, quota, Háº¾T SLOT, ÄÃƒ CHá»ŒN vÃ  Há»§y chá»n táº¡i HF-09.
- BA/UAT chuyá»ƒn cÃ¡c nhÃ¡nh happy path, exception path vÃ  concurrency trong SRS thÃ nh test case táº¡i HF-05.
Tráº¡ng thÃ¡i bÃ n giao: In Review â€” chá» Minh kiá»ƒm tra Definition of Done vÃ  nghiá»‡m thu; khÃ´ng tá»± chuyá»ƒn sang Done trÆ°á»›c khi PM xÃ¡c nháº­n.

---
*KÃ©o tá»« Notion lÃºc 00:05:54 5/10/2026 bá»Ÿi notion-module*


---

## Nội dung chi tiết Mục 9 (Từ SRS Master Page)


## 9. SRS â€” Teams & Topics (HF-04)

PhiÃªn báº£n: v1.0 â€” 04/10/2026
Pháº¡m vi: Sprint 1 â€” Core MVP; chuáº©n bá»‹ ná»n táº£ng cho Sprint 2.
Phá»¥ thuá»™c: Auth & Onboarding; tÃ i khoáº£n pháº£i cÃ³ approval_status = APPROVED.


### 9.1. Má»¥c tiÃªu vÃ  pháº¡m vi

Äáº·c táº£ hai luá»“ng nghiá»‡p vá»¥ cá»§a thÃ­ sinh:

1. Teams: táº¡o Ä‘á»™i hoáº·c tham gia Ä‘á»™i báº±ng invite code.
1. Topics: xem danh sÃ¡ch Ä‘á» tÃ i cÃ³ quota, chá»n má»™t Ä‘á» tÃ i vÃ  há»§y lá»±a chá»n khi cÃ²n trong thá»i gian cho phÃ©p.
KhÃ´ng cho phÃ©p tÃ i khoáº£n PENDING hoáº·c REJECTED táº¡o/tham gia Ä‘á»™i, chá»n/há»§y chá»n Ä‘á» tÃ i. Backend/API lÃ  lá»›p quyáº¿t Ä‘á»‹nh cuá»‘i cÃ¹ng; viá»‡c áº©n hoáº·c disable nÃºt trÃªn UI khÃ´ng thay tháº¿ kiá»ƒm tra quyá»n á»Ÿ Backend.


### 9.2. TÃ¡c nhÃ¢n vÃ  quyá»n



| TÃ¡c nhÃ¢n | Quyá»n trong pháº¡m vi HF-04 |
| ThÃ­ sinh CANDIDATE  â€¢ APPROVED | Táº¡o Ä‘á»™i náº¿u chÆ°a thuá»™c Ä‘á»™i; tham gia Ä‘á»™i báº±ng mÃ£ má»i náº¿u chÆ°a thuá»™c Ä‘á»™i; xem Ä‘á»™i cá»§a mÃ¬nh; xem danh sÃ¡ch Ä‘á» tÃ i; chá»n/há»§y chá»n Ä‘á» tÃ i theo rule. |
| ThÃ­ sinh PENDING | Chá»‰ xem/cáº­p nháº­t onboarding vÃ  tráº¡ng thÃ¡i duyá»‡t; bá»‹ cháº·n toÃ n bá»™ API Teams/Topics. |
| ThÃ­ sinh REJECTED | Bá»‹ cháº·n Teams/Topics; UI hiá»ƒn thá»‹ lÃ½ do tá»« chá»‘i vÃ  hÆ°á»›ng dáº«n liÃªn há»‡ há»— trá»£. |
| Ban tá»• chá»©c | Cáº¥u hÃ¬nh danh sÃ¡ch Ä‘á» tÃ i, quota, thá»i gian; xem vÃ  quáº£n lÃ½ dá»¯ liá»‡u Ä‘á»™i/Ä‘á» tÃ i theo quyá»n quáº£n trá»‹. KhÃ´ng dÃ¹ng quyá»n quáº£n trá»‹ Ä‘á»ƒ bá» qua transaction hoáº·c lÃ m sai lá»‹ch sá»­ lá»±a chá»n. |
| Backend/API | XÃ¡c thá»±c phiÃªn, RBAC, approval_status, constraint dá»¯ liá»‡u, transaction, lock vÃ  API envelope. |



### 9.3. Quy táº¯c nghiá»‡p vá»¥ Teams


#### 9.3.1. Äiá»u kiá»‡n chung

- Chá»‰ user Ä‘Äƒng nháº­p há»£p lá»‡, role CANDIDATE vÃ  approval_status = APPROVED má»›i Ä‘Æ°á»£c gá»i API Teams.
- Má»™t user chá»‰ thuá»™c tá»‘i Ä‘a má»™t Ä‘á»™i trong má»™t cuá»™c thi.
- Má»™t Ä‘á»™i há»£p lá»‡ cÃ³ tá»‘i thiá»ƒu 3 vÃ  tá»‘i Ä‘a 5 thÃ nh viÃªn. Khi má»›i táº¡o, Ä‘á»™i trÆ°á»Ÿng lÃ  thÃ nh viÃªn Ä‘áº§u tiÃªn; Ä‘á»™i cÃ³ thá»ƒ á»Ÿ tráº¡ng thÃ¡i INCOMPLETE cho tá»›i khi Ä‘á»§ 3 ngÆ°á»i.
- TÃªn Ä‘á»™i lÃ  báº¯t buá»™c, Ä‘Æ°á»£c trim khoáº£ng tráº¯ng, dÃ i 3â€“50 kÃ½ tá»±, khÃ´ng chá»‰ gá»“m khoáº£ng tráº¯ng vÃ  khÃ´ng Ä‘Æ°á»£c trÃ¹ng trong cÃ¹ng cuá»™c thi sau khi chuáº©n hÃ³a khÃ´ng phÃ¢n biá»‡t hoa thÆ°á»ng.
- Invite code do Backend sinh ngáº«u nhiÃªn, duy nháº¥t trong pháº¡m vi cuá»™c thi, dÃ i 6 kÃ½ tá»±, dá»… Ä‘á»c vÃ  khÃ´ng chá»©a khoáº£ng tráº¯ng. Client khÃ´ng tá»± sinh hoáº·c tá»± sá»­a mÃ£.
- Invite code cÃ³ tráº¡ng thÃ¡i ACTIVE/EXPIRED/REVOKED; chá»‰ mÃ£ ACTIVE má»›i Ä‘Æ°á»£c dÃ¹ng Ä‘á»ƒ join.
- Náº¿u má»™t bÆ°á»›c kiá»ƒm tra tháº¥t báº¡i, transaction rollback; khÃ´ng táº¡o Ä‘á»™i, khÃ´ng thÃªm thÃ nh viÃªn vÃ  khÃ´ng thay Ä‘á»•i dá»¯ liá»‡u Ä‘Ã£ cÃ³.

#### 9.3.2. Táº¡o Ä‘á»™i â€” happy path

Input: competition_id, name. User láº¥y tá»« session hiá»‡n táº¡i; client khÃ´ng Ä‘Æ°á»£c tá»± truyá»n owner_id hoáº·c approval_status Ä‘á»ƒ quyáº¿t Ä‘á»‹nh quyá»n.

1. Backend xÃ¡c thá»±c session, role vÃ  approval_status.
1. Kiá»ƒm tra user chÆ°a thuá»™c Ä‘á»™i trong competition_id.
1. Chuáº©n hÃ³a vÃ  kiá»ƒm tra tÃªn Ä‘á»™i chÆ°a tá»“n táº¡i.
1. Sinh invite code 6 kÃ½ tá»± vÃ  kiá»ƒm tra uniqueness; náº¿u cÃ³ xung Ä‘á»™t hiáº¿m gáº·p, sinh láº¡i trong transaction.
1. Táº¡o Team á»Ÿ tráº¡ng thÃ¡i INCOMPLETE, gÃ¡n user hiá»‡n táº¡i lÃ  LEADER, táº¡o TeamMember Ä‘áº§u tiÃªn vÃ  tráº£ thÃ´ng tin Ä‘á»™i.
Output thÃ nh cÃ´ng: HTTP 201, API envelope success = true, gá»“m team_id, name, status, invite_code, member_count = 1, min_members = 3, max_members = 5, topic_id = null.


#### 9.3.3. Tham gia Ä‘á»™i báº±ng invite code â€” happy path

Input: competition_id, invite_code.

1. Backend xÃ¡c thá»±c user lÃ  APPROVED vÃ  chÆ°a thuá»™c Ä‘á»™i trong cuá»™c thi.
1. TÃ¬m invite code Ä‘Ãºng cuá»™c thi, kiá»ƒm tra mÃ£ tá»“n táº¡i vÃ  cÃ²n hiá»‡u lá»±c.
1. KhÃ³a/kiá»ƒm tra dá»¯ liá»‡u Ä‘á»™i trong transaction Ä‘á»ƒ khÃ´ng vÆ°á»£t giá»›i háº¡n 5 ngÆ°á»i khi cÃ³ nhiá»u request Ä‘á»“ng thá»i.
1. Náº¿u Ä‘á»™i cÃ²n chá»—, thÃªm user Ä‘Ãºng má»™t láº§n vÃ o TeamMember.
1. Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘á»™i thÃ nh VALID khi member count Ä‘áº¡t 3â€“5; náº¿u chÆ°a Ä‘á»§, giá»¯ INCOMPLETE.
Output thÃ nh cÃ´ng: HTTP 200, tráº£ team_id, name, status, member_count, danh sÃ¡ch thÃ nh viÃªn trong pháº¡m vi Ä‘Æ°á»£c phÃ©p vÃ  topic_id hiá»‡n táº¡i.


#### 9.3.4. CÃ¡c trÆ°á»ng há»£p bá»‹ cháº·n vÃ  khÃ´ng Ä‘á»•i dá»¯ liá»‡u

- PENDING/REJECTED: HTTP 403, ACCOUNT_NOT_APPROVED; khÃ´ng táº¡o/join Ä‘á»™i.
- User Ä‘Ã£ thuá»™c Ä‘á»™i: HTTP 409, ALREADY_IN_TEAM; khÃ´ng thÃªm thÃ nh viÃªn.
- Invite code sai, khÃ¡c cuá»™c thi, háº¿t háº¡n hoáº·c bá»‹ thu há»“i: HTTP 404 hoáº·c 400 theo quy Æ°á»›c API, INVITE_CODE_INVALID; khÃ´ng Ä‘á»•i dá»¯ liá»‡u.
- Äá»™i Ä‘Ã£ Ä‘á»§ 5 ngÆ°á»i: HTTP 409, TEAM_FULL; khÃ´ng thÃªm thÃ nh viÃªn.
- TÃªn Ä‘á»™i trá»‘ng, quÃ¡ dÃ i hoáº·c trÃ¹ng: HTTP 422 vá»›i TEAM_NAME_INVALID hoáº·c HTTP 409 vá»›i TEAM_NAME_TAKEN.
- Request trÃ¹ng/Ä‘á»“ng thá»i: há»‡ thá»‘ng chá»‰ ghi nháº­n má»™t thÃ nh viÃªn; request cÃ²n láº¡i tráº£ lá»—i nghiá»‡p vá»¥ phÃ¹ há»£p hoáº·c káº¿t quáº£ idempotent theo Idempotency-Key, khÃ´ng táº¡o duplicate.

### 9.4. Quy táº¯c nghiá»‡p vá»¥ Topics


#### 9.4.1. Dá»¯ liá»‡u Ä‘á» tÃ i

Má»—i Topic tá»‘i thiá»ƒu cÃ³:

- topic_id, title, description, domain.
- max_teams_quota: quota tá»‘i Ä‘a, sá»‘ nguyÃªn dÆ°Æ¡ng.
- current_teams: sá»‘ Ä‘á»™i hiá»‡n Ä‘ang giá»¯ Ä‘á» tÃ i, khÃ´ng Ã¢m vÃ  khÃ´ng vÆ°á»£t max_teams_quota.
- selection_start_at, selection_end_at, status (OPEN, CLOSED, ARCHIVED).
- mentor_id hoáº·c thÃ´ng tin mentor phá»¥ trÃ¡ch náº¿u Ä‘Ã£ Ä‘Æ°á»£c phÃ¢n cÃ´ng.
Danh sÃ¡ch Topics tráº£ vá» current_teams, max_teams_quota, sá»‘ slot cÃ²n láº¡i vÃ  tráº¡ng thÃ¡i hiá»ƒn thá»‹ AVAILABLE, FULL, NOT_STARTED hoáº·c CLOSED. Client khÃ´ng Ä‘Æ°á»£c tá»± suy ra quota cuá»‘i cÃ¹ng Ä‘á»ƒ quyáº¿t Ä‘á»‹nh; Backend kiá»ƒm tra láº¡i táº¡i thá»i Ä‘iá»ƒm ghi dá»¯ liá»‡u.


#### 9.4.2. Äiá»u kiá»‡n chá»n Ä‘á» tÃ i

- User pháº£i lÃ  APPROVED.
- Team pháº£i tá»“n táº¡i trong cuá»™c thi, user pháº£i lÃ  thÃ nh viÃªn cá»§a team vÃ  team pháº£i á»Ÿ tráº¡ng thÃ¡i VALID (Ä‘á»§ 3â€“5 ngÆ°á»i).
- Team chÆ°a cÃ³ topic_id; khÃ´ng Ä‘Æ°á»£c chá»n Ä‘á» tÃ i thá»© hai hoáº·c ghi Ä‘Ã¨ Ä‘á» tÃ i hiá»‡n táº¡i.
- Topic pháº£i tá»“n táº¡i, á»Ÿ tráº¡ng thÃ¡i OPEN vÃ  thá»i Ä‘iá»ƒm server náº±m trong khoáº£ng cho phÃ©p.
- Chá»‰ cháº¥p nháº­n khi current_teams < max_teams_quota.

#### 9.4.3. Chá»n Ä‘á» tÃ i â€” transaction vÃ  tranh cháº¥p Ä‘á»“ng thá»i

Endpoint POST /api/v1/topics/select nháº­n { "topic_id": "uuid" }. Backend thá»±c hiá»‡n trong má»™t transaction:

1. XÃ¡c thá»±c user/session, APPROVED, role vÃ  membership cá»§a team.
1. KhÃ³a báº£n ghi Team vÃ  Topic liÃªn quan báº±ng SELECT FOR UPDATE.
1. Äá»c láº¡i tráº¡ng thÃ¡i thá»i gian, team.topic_id, current_teams vÃ  max_teams_quota sau khi Ä‘Ã£ cÃ³ lock.
1. Náº¿u má»i Ä‘iá»u kiá»‡n há»£p lá»‡, cáº­p nháº­t team.topic_id = topic_id vÃ  tÄƒng current_teams Ä‘Ãºng má»™t láº§n.
1. Commit; tráº£ vá» Ä‘á» tÃ i Ä‘Ã£ chá»n vÃ  sá»‘ slot cÃ²n láº¡i.
1. Náº¿u báº¥t ká»³ bÆ°á»›c nÃ o lá»—i, rollback toÃ n bá»™; khÃ´ng cáº­p nháº­t má»™t pháº§n Team hoáº·c Topic.
Khi nhiá»u Ä‘á»™i cÃ¹ng chá»n slot cuá»‘i, chá»‰ transaction giÃ nh Ä‘Æ°á»£c lock trÆ°á»›c vÃ  cÃ²n quota má»›i thÃ nh cÃ´ng. CÃ¡c transaction sau khi Ä‘á»c láº¡i dá»¯ liá»‡u pháº£i tráº£ 409 TOPIC_FULL, khÃ´ng Ä‘Æ°á»£c lÃ m current_teams vÆ°á»£t quota.


#### 9.4.4. Há»§y chá»n Ä‘á» tÃ i khi cÃ²n háº¡n

Endpoint POST /api/v1/topics/cancel nháº­n { "team_id": "uuid" }.

- Chá»‰ Ä‘á»™i trÆ°á»Ÿng hoáº·c thÃ nh viÃªn APPROVED thuá»™c Ä‘Ãºng team má»›i Ä‘Æ°á»£c yÃªu cáº§u há»§y; triá»ƒn khai cáº§n chá»‘t má»™t quyá»n chÃ­nh thá»©c á»Ÿ API, máº·c Ä‘á»‹nh Æ°u tiÃªn Ä‘á»™i trÆ°á»Ÿng Ä‘á»ƒ trÃ¡nh há»§y ngoÃ i Ã½ muá»‘n.
- Team pháº£i Ä‘ang cÃ³ topic_id vÃ  thá»i Ä‘iá»ƒm server váº«n náº±m trong selection_end_at.
- Backend khÃ³a Team vÃ  Topic báº±ng transaction + SELECT FOR UPDATE, kiá»ƒm tra quan há»‡ hiá»‡n táº¡i, sau Ä‘Ã³ Ä‘áº·t team.topic_id = null vÃ  giáº£m topic.current_teams Ä‘Ãºng má»™t láº§n.
- Sau khi há»§y, team Ä‘Æ°á»£c phÃ©p chá»n láº¡i má»™t Ä‘á» tÃ i khÃ¡c náº¿u cÃ²n háº¡n; khÃ´ng Ä‘Æ°á»£c chuyá»ƒn tháº³ng tá»« Topic A sang Topic B trong cÃ¹ng request.
- Sau selection_end_at, tráº£ 409 TOPIC_SELECTION_LOCKED; khÃ´ng thay Ä‘á»•i team.topic_id hoáº·c current_teams.
- Náº¿u Topic Ä‘Ã£ bá»‹ xÃ³a/khÃ´ng cÃ²n nháº¥t quÃ¡n, rollback vÃ  táº¡o cáº£nh bÃ¡o Ä‘á»ƒ BTC xá»­ lÃ½; tuyá»‡t Ä‘á»‘i khÃ´ng giáº£m quota Ã¢m.

#### 9.4.5. CÃ¡c trÆ°á»ng há»£p chá»n Ä‘á» tÃ i bá»‹ cháº·n

- PENDING/REJECTED: 403 ACCOUNT_NOT_APPROVED.
- Team khÃ´ng tá»“n táº¡i hoáº·c user khÃ´ng thuá»™c team: 403 TEAM_ACCESS_DENIED.
- Team chÆ°a Ä‘á»§ 3 thÃ nh viÃªn: 409 TEAM_NOT_VALID.
- Team Ä‘Ã£ cÃ³ Ä‘á» tÃ i: 409 TEAM_TOPIC_ALREADY_SELECTED.
- Topic khÃ´ng tá»“n táº¡i: 404 TOPIC_NOT_FOUND.
- NgoÃ i thá»i gian hoáº·c Topic Ä‘Ã£ Ä‘Ã³ng: 409 TOPIC_SELECTION_CLOSED.
- Quota Ä‘Ã£ Ä‘áº§y táº¡i thá»i Ä‘iá»ƒm transaction: 409 TOPIC_FULL.
- Dá»¯ liá»‡u cáº­p nháº­t khÃ´ng cÃ²n Ä‘Ãºng trong lÃºc transaction: rollback, tráº£ mÃ£ lá»—i phÃ¹ há»£p vÃ  khÃ´ng Ä‘á»•i dá»¯ liá»‡u.

### 9.5. API contract Ä‘á» xuáº¥t



| Method | Endpoint | Má»¥c Ä‘Ã­ch | Quyá»n |
| GET | /api/v1/teams/me | Xem Ä‘á»™i hiá»‡n táº¡i cá»§a user trong cuá»™c thi | APPROVED |
| POST | /api/v1/teams | Táº¡o Ä‘á»™i, sinh invite code vÃ  gÃ¡n leader | APPROVED, chÆ°a thuá»™c Ä‘á»™i |
| POST | /api/v1/teams/join | Tham gia báº±ng invite_code | APPROVED, chÆ°a thuá»™c Ä‘á»™i |
| GET | /api/v1/topics | Xem danh sÃ¡ch Ä‘á» tÃ i, quota vÃ  tráº¡ng thÃ¡i | User Ä‘Ã£ Ä‘Äƒng nháº­p |
| POST | /api/v1/topics/select | Chá»n má»™t Ä‘á» tÃ i báº±ng transaction + lock | APPROVED, team VALID |
| POST | /api/v1/topics/cancel | Há»§y lá»±a chá»n khi cÃ²n háº¡n | APPROVED, thÃ nh viÃªn Ä‘Ãºng team; máº·c Ä‘á»‹nh leader |


Envelope thÃ nh cÃ´ng:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed",
  "error_code": null
}
```

Envelope lá»—i:

```json
{
  "success": false,
  "data": null,
  "message": "Readable business error",
  "error_code": "TOPIC_FULL"
}
```


### 9.6. Flowchart nghiá»‡p vá»¥


#### 9.6.1. Táº¡o/join Ä‘á»™i â€” happy path vÃ  exception path

```mermaid
flowchart TD
    A[User gá»­i create/join request] --> B{Session há»£p lá»‡?}
    B -- KhÃ´ng --> E401[401 AUTHENTICATION_FAILED]
    B -- CÃ³ --> C{approval_status = APPROVED?}
    C -- KhÃ´ng --> E403[403 ACCOUNT_NOT_APPROVED]
    C -- CÃ³ --> D{User Ä‘Ã£ thuá»™c Ä‘á»™i?}
    D -- CÃ³ --> E409A[409 ALREADY_IN_TEAM]
    D -- KhÃ´ng --> F{Create hay Join?}
    F -- Create --> G{TÃªn Ä‘á»™i há»£p lá»‡ vÃ  chÆ°a trÃ¹ng?}
    G -- KhÃ´ng --> E409B[409 TEAM_NAME_TAKEN hoáº·c 422 TEAM_NAME_INVALID]
    G -- CÃ³ --> H[Sinh invite code unique 6 kÃ½ tá»±]
    H --> I[Táº¡o Team + TeamMember leader]
    F -- Join --> J{MÃ£ má»i tá»“n táº¡i vÃ  cÃ²n háº¡n?}
    J -- KhÃ´ng --> E400[400 INVITE_CODE_INVALID]
    J -- CÃ³ --> K[Transaction + lock Team]
    K --> L{member_count < 5?}
    L -- KhÃ´ng --> E409C[409 TEAM_FULL]
    L -- CÃ³ --> M[ThÃªm TeamMember má»™t láº§n]
    I --> N[Tráº£ team vÃ  invite code]
    M --> O{member_count >= 3?}
    O -- CÃ³ --> P[Team VALID]
    O -- KhÃ´ng --> Q[Team INCOMPLETE]
    P --> R[Commit + response]
    Q --> R
```


#### 9.6.2. Chá»n/há»§y Ä‘á» tÃ i â€” quota vÃ  concurrency

```mermaid
flowchart TD
    A[POST select/cancel] --> B{APPROVED vÃ  Ä‘Ãºng team?}
    B -- KhÃ´ng --> E403[403 ACCOUNT_NOT_APPROVED hoáº·c TEAM_ACCESS_DENIED]
    B -- CÃ³ --> C[Begin transaction]
    C --> D[SELECT FOR UPDATE Team + Topic]
    D --> E{Trong thá»i gian cho phÃ©p?}
    E -- KhÃ´ng --> E409A[409 TOPIC_SELECTION_CLOSED]
    E -- CÃ³ --> F{Thao tÃ¡c select hay cancel?}
    F -- Select --> G{Team VALID vÃ  chÆ°a cÃ³ topic?}
    G -- KhÃ´ng --> E409B[409 TEAM_NOT_VALID hoáº·c TEAM_TOPIC_ALREADY_SELECTED]
    G -- CÃ³ --> H{current_teams < max_teams_quota?}
    H -- KhÃ´ng --> E409C[409 TOPIC_FULL + rollback]
    H -- CÃ³ --> I[Set team.topic_id vÃ  tÄƒng current_teams]
    F -- Cancel --> J{Team cÃ³ topic hiá»‡n táº¡i?}
    J -- KhÃ´ng --> E409D[409 TOPIC_NOT_SELECTED]
    J -- CÃ³ --> K[Set topic_id null vÃ  giáº£m current_teams]
    I --> L[Commit + tráº£ káº¿t quáº£]
    K --> L
```


### 9.7. Sequence diagram chá»n Ä‘á» tÃ i

```mermaid
sequenceDiagram
    participant C as Client
    participant API as FastAPI Teams/Topics API
    participant DB as Database
    C->>API: POST /topics/select {topic_id}
    API->>API: Validate session, role, APPROVED, team membership
    API->>DB: BEGIN transaction
    API->>DB: SELECT team FOR UPDATE
    API->>DB: SELECT topic FOR UPDATE
    DB-->>API: Current team/topic/quota state
    alt Team invalid, selected, closed, or quota full
        API->>DB: ROLLBACK
        API-->>C: 4xx envelope + error_code
    else All rules pass
        API->>DB: UPDATE team.topic_id
        API->>DB: UPDATE topic.current_teams = current + 1
        API->>DB: COMMIT
        API-->>C: 200 success + selected topic + remaining slots
    end
```


### 9.8. Mapping sang UI, Backend vÃ  UAT



| Háº¡ng má»¥c | UI/UX cáº§n thá»ƒ hiá»‡n | Backend cáº§n báº£o Ä‘áº£m | UAT tá»‘i thiá»ƒu |
| Teams chÆ°a cÃ³ Ä‘á»™i | Hai lá»±a chá»n Táº¡o Ä‘á»™i má»›i vÃ  Nháº­p mÃ£ má»i | Quyá»n APPROVED, tÃªn Ä‘á»™i, code unique, membership | Táº¡o thÃ nh cÃ´ng; tÃªn trÃ¹ng; PENDING/REJECTED; mÃ£ sai; Ä‘á»™i Ä‘áº§y; Ä‘Ã£ thuá»™c Ä‘á»™i |
| Teams Ä‘Ã£ cÃ³ Ä‘á»™i | TÃªn Ä‘á»™i, code + Copy, leader/member badge, 3â€“5 thÃ nh viÃªn | KhÃ´ng join/create Ä‘á»™i thá»© hai; member count khÃ´ng vÆ°á»£t 5 | Join Ä‘á»“ng thá»i; duplicate request; Ä‘á»™i chuyá»ƒn VALID á»Ÿ thÃ nh viÃªn thá»© 3 |
| Topics | Card tÃªn/lÄ©nh vá»±c, current_teams/max_teams_quota, mentor, Chá»n, ÄÃƒ CHá»ŒN, Háº¾T SLOT | Quota kiá»ƒm tra láº¡i trong transaction; SELECT FOR UPDATE; TOPIC_FULL | Chá»n thÃ nh cÃ´ng; team chÆ°a Ä‘á»§ ngÆ°á»i; Ä‘Ã£ chá»n; ngoÃ i háº¡n; quota Ä‘áº§y; race condition |
| Há»§y chá»n | NÃºt Há»§y chá»n chá»‰ hiá»‡n khi cÃ²n háº¡n; modal xÃ¡c nháº­n; card khÃ¡c má»Ÿ láº¡i sau khi há»§y | Lock Team + Topic; giáº£m quota Ä‘Ãºng má»™t láº§n; khÃ³a sau deadline | Há»§y thÃ nh cÃ´ng; há»§y sau háº¡n; há»§y khi khÃ´ng cÃ³ topic; chá»n láº¡i sau khi há»§y |
| Tráº¡ng thÃ¡i lá»—i | Loading, empty, error; message dá»… hiá»ƒu; khÃ´ng giá»¯ tráº¡ng thÃ¡i thÃ nh cÃ´ng giáº£ | API envelope thá»‘ng nháº¥t, rollback khi lá»—i | Refresh sau lá»—i; retry; khÃ´ng cÃ³ dá»¯ liá»‡u má»™t pháº§n |



### 9.9. MÃ£ lá»—i chuáº©n cá»§a Teams & Topics



| HTTP | error_code | Ã nghÄ©a |
| 401 | AUTHENTICATION_FAILED / SESSION_EXPIRED | ChÆ°a Ä‘Äƒng nháº­p hoáº·c phiÃªn háº¿t háº¡n |
| 403 | ACCOUNT_NOT_APPROVED | PENDING hoáº·c REJECTED gá»i chá»©c nÄƒng bá»‹ khÃ³a |
| 403 | TEAM_ACCESS_DENIED | User khÃ´ng thuá»™c team hoáº·c khÃ´ng cÃ³ quyá»n thao tÃ¡c |
| 409 | ALREADY_IN_TEAM | User Ä‘Ã£ thuá»™c Ä‘á»™i trong cuá»™c thi |
| 409 | TEAM_NAME_TAKEN | TÃªn Ä‘á»™i Ä‘Ã£ tá»“n táº¡i trong cuá»™c thi |
| 409 | TEAM_FULL | Äá»™i Ä‘Ã£ Ä‘á»§ 5 ngÆ°á»i |
| 409 | TEAM_NOT_VALID | Äá»™i chÆ°a Ä‘á»§ 3 ngÆ°á»i hoáº·c khÃ´ng Ä‘áº¡t Ä‘iá»u kiá»‡n |
| 409 | TEAM_TOPIC_ALREADY_SELECTED | Äá»™i Ä‘Ã£ cÃ³ Ä‘á» tÃ i, khÃ´ng Ä‘Æ°á»£c ghi Ä‘Ã¨ |
| 409 | TOPIC_FULL | Quota Ä‘Ã£ Ä‘áº§y sau khi lock vÃ  kiá»ƒm tra láº¡i |
| 409 | TOPIC_SELECTION_CLOSED | NgoÃ i thá»i gian chá»n/há»§y hoáº·c Topic Ä‘Ã£ Ä‘Ã³ng |
| 409 | TOPIC_NOT_SELECTED | Team chÆ°a cÃ³ Ä‘á» tÃ i Ä‘á»ƒ há»§y |
| 400 | INVITE_CODE_INVALID | MÃ£ má»i sai, háº¿t háº¡n, bá»‹ thu há»“i hoáº·c khÃ¡c cuá»™c thi |
| 404 | TOPIC_NOT_FOUND | KhÃ´ng tÃ¬m tháº¥y Ä‘á» tÃ i |
| 422 | TEAM_NAME_INVALID / VALIDATION_ERROR | Input thiáº¿u hoáº·c sai Ä‘á»‹nh dáº¡ng |
| 500 | TRANSACTION_FAILED | Lá»—i há»‡ thá»‘ng; pháº£i rollback toÃ n bá»™ |



### 9.10. Traceability vÃ  Definition of Done

- US-03: Ä‘Æ°á»£c bao phá»§ bá»Ÿi má»¥c 9.3, API Teams, flowchart Teams vÃ  cÃ¡c case create/join/error.
- US-04: Ä‘Æ°á»£c bao phá»§ bá»Ÿi má»¥c 9.4, API Topics, transaction/SELECT FOR UPDATE, flowchart Topics vÃ  concurrency test.
- SRS mÃ´ táº£ Ä‘á»§ actor, precondition, input/output, happy path, exception path, tráº¡ng thÃ¡i, quyá»n vÃ  mÃ£ lá»—i.
- Rule Ä‘á»™i 3â€“5 ngÆ°á»i, invite code unique 6 kÃ½ tá»±, quota/current_teams, khÃ³a Ä‘á» tÃ i sau thá»i gian vÃ  há»§y chá»n khi cÃ²n háº¡n Ä‘Ã£ Ä‘Æ°á»£c chá»‘t trong tÃ i liá»‡u.
- TOPIC_FULL chá»‰ tráº£ sau khi transaction Ä‘Ã£ lock vÃ  Ä‘á»c láº¡i quota; lá»—i pháº£i rollback, khÃ´ng lÃ m thay Ä‘á»•i dá»¯ liá»‡u má»™t pháº§n.
- SRS Ä‘á»§ chi tiáº¿t Ä‘á»ƒ Backend triá»ƒn khai HF-20/HF-21, UI/UX triá»ƒn khai HF-09, Frontend tÃ­ch há»£p Teams/Topics vÃ  BA táº¡o test case HF-05.

