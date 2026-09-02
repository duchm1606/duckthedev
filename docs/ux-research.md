# UX research — refactor UI/UX theo hướng minimal

Ngày: 2026-08-25. Phạm vi: 5 trang chính (home, blog post, series index, chapter reader, topics, about) + shell chung (masthead, footer).
Phương pháp: đọc source (`src/styles/global.css`, `src/layouts/Base.astro`, `src/pages/**`), đo bằng Playwright trên bản `dist` (desktop 1440 / mobile 390), đối chiếu pattern trên Mobbin.

Ảnh chứng cứ: `docs/ux-research/mobile-home.png`, `docs/ux-research/mobile-chapter.png`. Ảnh desktop có sẵn ở root (`home.png`, `post-page.png`, `chapter.png`, `series.png`, `topics.png`, `about.png`).

---

## 1. Tóm tắt

Desktop đang **đẹp và có bản sắc** (editorial/letterpress, Fraunces + Newsreader + JetBrains Mono, palette giấy cũ). Vấn đề không nằm ở gu thẩm mỹ mà ở **mật độ**: quá nhiều lớp meta, nhãn mono viết hoa, số La Mã, chip, stat — mỗi thứ đều hợp lý riêng lẻ nhưng cộng lại làm trang nặng hơn nội dung. Trên mobile site **hỏng thật** chứ không chỉ "chưa tối ưu".

Ba kết luận chính:

1. **P0 — mobile đang không dùng được.** Nav tràn ra ngoài viewport (Topics/About/theme toggle không bấm tới được), chapter reader tràn ngang 605px trong viewport 390px, tiêu đề chương bị cắt, người đọc phải cuộn qua 484px outline mới thấy bài.
2. **P1 — giảm mật độ, không giảm bản sắc.** 54% text node trên home < 11px; 40% text leaf trên trang post là nhãn mono uppercase; 117 khai báo `font-size` với ~25 giá trị khác nhau. Mục tiêu: 1 type scale 6 bậc, không có chữ < 12px, mỗi row/card tối đa 1 dòng meta.
3. **P1 — cắt section trên home.** Hero (2 CTA + ornament + desk log) + 5 section đánh số I–V, cao 7.5k px trên mobile. Mục tiêu: hero 1 câu + 1 CTA, 3 section.

---

## 2. Hiện trạng đo được

### 2.1 Mobile (390×844)

| Trang | Số liệu | Ý nghĩa |
|---|---|---|
| Mọi trang | `.primary-nav` rộng 355px, cạnh phải ở x=562 (viewport 390) | Topics, About, nút theme nằm ngoài màn hình. `body { overflow-x: hidden }` nên không cuộn tới được → **không điều hướng được** từ điện thoại |
| Home | `scrollWidth` 561, cao 7 579px | Tràn ngang + quá dài |
| Chapter | `scrollWidth` 605; `.outline` rộng 585px; h1 bị cắt ("...lec") | Nguyên nhân: `@media (max-width:900px) .reader-grid { grid-template-columns: 1fr }` — `1fr` = `minmax(auto,1fr)`, kết hợp `.part-meta { white-space: nowrap }` (`global.css:731`) nên cột bị min-content đẩy rộng ra |
| Chapter | outline ở y=190, cao 484px; h1 ở y=730 | Người đọc phải cuộn gần 1 màn hình outline trước khi thấy bài. Related/TOC bên phải thì rơi xuống cuối trang (y=7 708) — vô dụng |
| Home | 120/221 text leaf < 11px; 30/67 link/button cao < 32px | Chữ nhỏ và tap target nhỏ (chuẩn WCAG 2.5.8: 24px, Apple HIG: 44pt) |

### 2.2 Desktop (1440×900), trang post

| Số liệu | Giá trị | Nhận xét |
|---|---|---|
| Cột nội dung | 702px, chữ 18px | ≈ 81 ký tự/dòng; ngưỡng dễ đọc 60–75 |
| h1 ở y=208, body bắt đầu y=530 | 322px "đầu bài" | breadcrumb → eyebrow → h1 → deck → 4 stat (published/updated/words/min) → rule → drop cap lede. 5 lớp trước khi đọc |
| Font-size computed khác nhau | 15 | Trang đọc chỉ cần ~6 |
| Tỉ lệ text leaf dùng mono | 40% | Mono uppercase đang là *giọng chính* của trang chứ không còn là nhấn |
| Font load | 3 family, 16 biến thể qua Google Fonts | Không có `font-display` tự kiểm soát, chờ mạng bên thứ ba |

### 2.3 Kiểm kê thành phần "trang trí" (candidate để bỏ)

- `body::before` paper grain (fixed overlay, `global.css:66`)
- `.hero-deco` "Now writing / Jul — Sep 2026" (ẩn < 1180px nên phần lớn người dùng không thấy)
- `.hero-ornament` "Set in Fraunces, Newsreader & JetBrains Mono" + SVG nét lượn
- Số La Mã cho section (`I. Featured` … `V. Topics`) và cho item (`i.`, `ii.`)
- Drop cap `p.lede::first-letter`
- `list-foot` "Showing 6 of 8 articles."
- 4 stat dạng `**9** years of experience` lặp ở mọi page-head (blog, series, topics, about)
- Chip topic xuất hiện 2–3 lần cho cùng 1 bài (kicker, chip, filed-under)
- Footer 4 cột + colophon tech + 2 dòng chân

### 2.4 Cái đang tốt, giữ nguyên

- Cặp font Fraunces/Newsreader và palette (`--bg #f3ebd9`, `--accent #8a2317`) — đây là bản sắc, minimal không có nghĩa là đổi sang sans trắng.
- Dim theme, reading progress line, prev/next ở cuối bài.
- Reader 3 cột trên desktop; outline nhóm theo Part với `<details>`; chapter locked mờ đi.
- Bài viết có TOC hai cấp, callout, code block có header ngôn ngữ/số dòng.
- Nội dung copy (hero, deck, colophon) — giọng văn tốt, chỉ cần bớt số lượng.

---

## 3. Pattern tham khảo từ Mobbin

Chọn theo tiêu chí: cùng bài toán (blog kỹ thuật cá nhân, đọc dài, có series), càng ít lớp meta càng tốt.

**Home / danh sách bài**
- [OpenAI — Index](https://mobbin.com/sites/sections/1e4d6891-db02-4b62-8ae8-8addb56aa87e): archive 2 cột — năm ở trái, phải là *title + "date — category"*. Không chip, không deck, không stat. Đây là mức tối giản nhất vẫn có cấu trúc theo năm — khớp `/blog`.
- [Greptile — All Posts](https://mobbin.com/sites/sections/e09ffa72-0fab-4bd7-9f85-28059bc08467): mono cho ngày/tác giả, serif cho title, 1 dòng deck; sidebar trái là danh sách category kèm count `[22]`. Chứng minh mono + serif vẫn minimal được nếu mono chỉ dùng cho **1 cột dữ liệu**.
- [Runner — Latest posts](https://mobbin.com/sites/sections/8a45fc11-ad1b-4810-be6a-d27aeaf33995): chip topic + RSS trên **một** hàng, dưới là list. Có thể thay cả section "Topics" + filter-row hiện tại.
- [Substack — Archive](https://mobbin.com/screens/ab559473-d1dd-44d4-8332-9679d2a363a0): nhóm theo tháng bằng 1 nhãn nhỏ, không có filter per-year.

**Hero**
- [Frontify](https://mobbin.com/sites/sections/9dc7cb3d-08cc-4c17-bb89-4373060676f2): headline serif lớn 2 dòng, 1 câu phụ, 1 nút. Không aside.
- [SSENSE editorial](https://mobbin.com/sites/sections/4de98a06-dbff-4e54-83c6-a301c519bba0): title + deck + 1 nút outline, căn giữa.

**Trang đọc**
- [Substack — post](https://mobbin.com/screens/748e369a-1f0e-444f-a010-dd66dafd23bb): kicker → title → subtitle → 1 dòng (tác giả · ngày) → rule → nội dung. Meta gói trong 1 dòng.
- [Matter — reader](https://mobbin.com/screens/9f0a7178-98a4-4da6-897f-f1978bd235d9): 1 cột duy nhất, cột đọc hẹp, control dồn vào rail trái. Tham chiếu cho mobile và cho blog post không cần sidebar.
- [Hashnode — TOC inline](https://mobbin.com/screens/e6c71473-167b-4a23-91ab-b2727852b8ef): TOC là block collapsible ngay trên bài (`Show more`) — pattern đúng cho mobile thay vì sidebar rơi xuống cuối.
- [Mintlify — docs](https://mobbin.com/screens/93535887-7be3-4091-a56d-2156e3a2d653): left nav nhóm theo section + right "On this page" có thụt cấp; toàn bộ 12–13px sans, không nhãn viết hoa. Chapter reader hiện tại đã đúng cấu trúc này, chỉ cần bớt lớp.

**Series**
- [Sketch — Course lessons](https://mobbin.com/sites/sections/c6fdb3c9-c8dc-4758-a1ac-fbbfae854618): bảng chapter nhóm theo Part, mỗi dòng `1.1  Tên  1:51`; card bên phải chỉ có 4 fact + 1 nút. Khớp trang series detail.
- [Workable — course list](https://mobbin.com/sites/sections/5f651baa-bea0-4fdd-a065-74796814e3f8): danh sách series chỉ là tên + mũi tên, ngăn bằng rule.

**Topics**
- [Zendesk — Browse by topic](https://mobbin.com/sites/sections/1bd6137f-6da0-4633-b9f8-86cf6c5f0ab4): 1 lưới tên topic, không icon, không mô tả, không count.
- [Webflow — Topics](https://mobbin.com/sites/sections/e0cf962d-5c0b-46f0-9228-5ce688b9e409): topic + 1 câu mô tả + 2 bài gần nhất — thay cho card Pinned hiện tại nếu muốn giữ mô tả.

**About / CV**
- [Figma — profile](https://mobbin.com/screens/928c9e80-3fc4-44cd-9d7c-561a3b0f26d3): cột ngày `2017 — Now` bên trái, role + công ty bên phải, không card, không chip.
- [Open — about](https://mobbin.com/screens/42b1de87-8742-45c7-8c76-7b67c90683c4): thuần text, heading nhỏ + đoạn.

**Footer**
- [Faculty Department](https://mobbin.com/sites/sections/61c49280-bcb2-4ddc-b79d-63883c3a5d18): 1 dòng — brand / © / 3 link.
- [Visitors](https://mobbin.com/sites/sections/17c6b36b-7e35-4efa-8000-9c5fdf472dc3): blurb ngắn + 3 cột link ngắn, không cột "colophon".

---

## 4. Đề xuất

### P0 — Sửa lỗi mobile (làm trước, không phụ thuộc quyết định thiết kế)

1. **Nav**: dưới 720px đổi `.primary-nav` thành hàng cuộn ngang được (`overflow-x:auto`, không hamburger) hoặc ẩn `Home` (brand đã là link Home) + giảm gap. Với 4 link mono 10px thì hàng cuộn ngang là đủ, không cần JS.
2. **Reader grid**: `@media (max-width:900px) .reader-grid { grid-template-columns: minmax(0,1fr) }` và bỏ `white-space:nowrap` ở `.part-meta` (`global.css:731`). Một dòng CSS sửa cả overflow lẫn tiêu đề bị cắt.
3. **Outline trên mobile**: chuyển thành `<details>` đóng mặc định ngay dưới h1 (pattern Hashnode), summary = "Ch. 5 of 12 · System Design ▸". Reorder DOM hoặc dùng `order` trong grid để `.post-body` lên trước `.outline`.
4. **Tap target**: `.nav-link`, `.chip`, `.filter`, `.toc a` tối thiểu `min-height: 32px` (desktop) / 40px (touch).
5. Kiểm thử lại bằng cùng script đo (scrollWidth phải = 390).

### P1 — Giảm mật độ (đây là phần "minimal")

**Type scale — 6 bậc, không có gì < 12px**

| Token | Size | Dùng cho |
|---|---|---|
| `--t-display` | 44/56px (mobile/desktop) | h1 trang |
| `--t-title` | 26px | h2 bài, tiêu đề featured |
| `--t-heading` | 20px | h3, tên item trong list |
| `--t-body` | 18px | thân bài (giữ), deck |
| `--t-small` | 15px | mô tả trong list, footer |
| `--t-meta` | 12px mono | **duy nhất** một cỡ cho mọi nhãn: ngày, kicker, chip, count |

Áp dụng bằng cách thay 117 khai báo `font-size` bằng 6 biến; xoá 9.5/10/10.5/8.5/11/11.5/13/13.5/14.5/15.5px.

**Quy tắc mono**: mono chỉ cho *dữ liệu* (ngày, số chương, ký hiệu code), không cho *nhãn* (section title, eyebrow, button). Eyebrow/section head đổi sang Newsreader italic 15px hoặc bỏ hẳn. Nút dùng Fraunces 15px. Kết quả: tỉ lệ mono từ 40% xuống ~10%.

**Home — từ 6 khối xuống 3**

```
Hero        h1 (giữ "I write down what I break.") + 1 câu deck + 1 link "About →"
            Bỏ: btn-primary "Read the latest essay", ornament, hero-deco, Desk log aside
Writing     Danh sách 8 bài mới nhất (article + note trộn, note có dấu §), 1 dòng/bài:
            [date mono] Title — one-line description       [topic]
            Bỏ Featured grid; bài pinned chỉ cần lên đầu list.
            Bỏ filter-row; hàng chip topic đặt ngay trên list (pattern Runner) — link sang /topics/x, không JS.
Series      3 series: tên + 1 câu + "9/12 chapters · latest 24 Jul". Không chip, không level, không số La Mã.
Footer      1 dòng: duckthedev · © 2019–2026 Duc Hoang · Series / Blog / Topics / About / RSS / GitHub
```

Notes grid (§IV) và Topics (§V) gộp vào list và footer; Desk log nếu vẫn muốn giữ thì thành 1 dòng text "Now: Observability for a system you didn't design — out 07 Aug" dưới hero.

**Trang post — đầu bài 2 dòng**

```
Kicker:  Kubernetes · Golang                       (mono 12, 1 dòng, là link topic)
h1
Deck (Newsreader italic 20)
Meta:    26 Jul 2026 · 4 min                       (mono 12, 1 dòng)
────
Body 68ch
```

Bỏ: breadcrumb (nav đã có Blog), `Published/Updated` (chỉ hiện updated khi khác published, ở cuối bài), `77 words`, drop cap, "Filed under" (đã có kicker), ô "Last edited". Cột body `max-width: 68ch`. Aside phải chỉ giữ TOC (`On this page`) — "Related" chuyển xuống dưới prev/next thành 3 dòng text; trên mobile TOC thành `<details>`.

**Chapter reader**: giữ 3 cột; outline bỏ `outline-kicker`/`outline-note`, chỉ tên series + "9 published"; mỗi chapter `02  Tên`; Part là summary. Cột phải chỉ TOC, bỏ "Elsewhere".

**Series index**: bỏ page-stats 4 số + filter All/Ongoing/Finished/Planned (6 item không cần filter). Mỗi row: tên · 1 câu · `9 of 12 · weekly`. State tag gộp vào dòng meta thay vì badge có viền.

**Series detail**: bảng chapter theo Part như Sketch: `01  Tên chương  9 min`, chương chưa ra mờ + ngày dự kiến.

**Topics**: bỏ Pinned card grid + filter Languages/Data/Infra + thanh A–Z. Một danh sách 2 cột `Tên topic — count`, pinned in đậm (Zendesk). Mô tả topic chỉ hiển thị ở trang `/topics/[slug]`.

**About**: giữ quote và Say hello; Experience theo cột ngày (Figma) — bỏ ô monogram `Ax/Lm/Nv`, bỏ chip công nghệ dưới từng job (đã có Skills). Skills từ 6 card thành 6 dòng `Languages — Go, TypeScript, Python, SQL`. Bỏ ô portrait "DH" + 4 stat.

**Footer chung** (Base.astro): 1 hàng như Faculty Department. Colophon tech chuyển vào `/about` nếu tiếc.

**Bỏ trang trí**: paper grain `body::before`, hero SVG, ornament, số La Mã (section & item), "Showing X of Y", "Built with more coffee than sense" (giữ được nếu thay cho dòng © — chọn 1).

**Font**: self-host 3 family qua `@font-face` + `font-display: swap`, cắt còn Fraunces 700/800 + italic 400, Newsreader 400/500 + italic 400, JetBrains Mono 400 → 7 file thay vì 16.

### P2 — Sau khi P1 ổn định

- Search (⌘K) đơn giản trên `/blog` — hiện không có cách tìm bài ngoài cuộn.
- Trang post: nút copy code, anchor link cho h2.
- `prefers-color-scheme` để chọn dim mặc định (hiện đã có `reduced-motion`).
- Xem xét bỏ theme toggle khỏi masthead → đưa xuống footer (giảm 1 item trên nav mobile).

---

## 5. Thứ tự làm & file liên quan

| Bước | File | Ghi chú |
|---|---|---|
| P0.1 nav mobile | `src/styles/global.css:131` `.primary-nav`, `Base.astro:57` | CSS-only |
| P0.2 reader overflow | `global.css:761` `.reader-grid`, `:731` `.part-meta` | 2 dòng |
| P0.3 outline → details | `src/pages/series/[slug]/[chapter].astro` | đổi thứ tự DOM |
| P1.1 type scale | `global.css` tokens `:root` + thay toàn bộ `font-size` | mechanical, làm 1 commit riêng để diff sạch |
| P1.2 home | `src/pages/index.astro`, `src/config/site.ts` (`hero.*`) | bỏ `deskLog`, `featured`, `notes`, `pinnedTopics` khỏi page |
| P1.3 post head | `src/pages/blog/[slug].astro`, `.post-head*` CSS | |
| P1.4 footer | `Base.astro:75–110`, `.colo-*` CSS | |
| P1.5 series/topics/about | các page tương ứng, `SeriesItem.astro` | |
| P1.6 fonts | `Base.astro:38–41` → `public/fonts/` + `@font-face` | |

Mỗi bước có thể verify bằng script đo ở §2 (scrollWidth, số text < 12px, số font-size distinct, chiều cao trang).

---

## 6. Quyết định cần chốt trước khi code

1. **Desk log** trên home: bỏ hẳn hay giữ dạng 1 dòng? (Đề xuất: bỏ — "scheduled" chapter đã hiện ở series detail.)
2. **Featured**: bỏ grid, chỉ pin lên đầu list? (Đề xuất: có.)
3. **Paper grain + số La Mã**: đây là 2 thứ định hình "letterpress" nhất; bỏ cả hai thì site tối giản rõ rệt nhưng bớt cá tính. Đề xuất: bỏ grain (chi phí render, không ai nhận ra), giữ số La Mã **chỉ** cho chapter trong series detail.
4. Font tự host hay tiếp tục Google Fonts.

---

## 7. Đã triển khai (2026-08-25, cùng ngày)

Toàn bộ P0 + P1 đã code xong; P2 chưa làm. Ảnh sau refactor: `docs/ux-research/after-*.png`.

### Quyết định đã chốt (theo đề xuất §6)
- Desk log: **bỏ**. Featured grid: **bỏ**, bài pinned lên đầu list.
- Paper grain: **bỏ**. Số La Mã: chỉ còn ở tên Part trong series detail và outline chapter.
- Font: **self-host** (`public/fonts/`, `src/styles/fonts.css`) — 10 file woff2 variable, subset latin + vietnamese, `font-display: swap`. Không còn gọi Google Fonts.

### Số liệu sau refactor (cùng script đo ở §2)

| Chỉ số | Trước | Sau |
|---|---|---|
| Mobile 390 — `scrollWidth` home / chapter | 561 / 605 | **390 / 390** |
| Mobile — cạnh phải nav | 562 (Topics/About ngoài màn hình) | **370** |
| Mobile — h1 chapter ở y= | 730 | **220** (outline gập thành 1 dòng 50px, mở ra 605px, 19 link, không tràn) |
| Mobile — chiều cao home | 7 579px | **3 365px** |
| Text node < 12px (home mobile) | 120/221 | **0/88** |
| `font-size` trong CSS | 117 khai báo, ~25 giá trị | **40 khai báo, 6 token** (+ 3 ngoại lệ: brand 24/20px, code 13.5px) |
| Cỡ chữ computed khác nhau trên trang post | 15 | **7** |
| Trang post — cột body | 702px | **673px = 68ch** |
| Trang post — h1 / body bắt đầu ở y= | 208 / 530 | **146 / 388** |
| `global.css` | 1 234 dòng | **461 dòng** |
| Font request | 16 biến thể qua Google Fonts | 10 file local (2 preload bỏ vì gây warning) |

### Thay đổi theo file
- `src/styles/global.css` — viết lại; tokens `--t-*`, một rule chung cho mọi nhãn mono 12px.
- `src/layouts/Base.astro` — nav 4 mục (brand = Home), footer 2 dòng, import `fonts.css`.
- `src/config/site.ts` — bỏ `deskLog*`, `ornament`, `portrait`, `coloFoot`, `colophonTech`; thêm `description`, `footerNote`, `hero.kicker`.
- `src/scripts/app.js` — bỏ filter JS (không còn filter nào); scroll-spy chấp nhận 2 bản `.toc`.
- `src/components/SeriesOutline.astro` (mới) — dùng cho cột trái desktop và `<details class="outline-sheet">` trên mobile.
- `ArticleRow` / `SeriesItem` — 1 dòng meta, không chip, không số La Mã.
- Tất cả page dưới `src/pages/` — cấu trúc `kicker → h1 → deck → (meta)`; bỏ breadcrumb, page-stats, filter-row, list-foot, Related/Elsewhere sidebar (Related chuyển xuống cuối bài).

### Còn lại (P2)
Search, copy-code button, anchor link h2, `prefers-color-scheme`, cân nhắc chuyển theme toggle xuống footer.
