# Notion CMS — kiến trúc DB cho duckthedev

Suy ra trực tiếp từ mock tĩnh ban đầu (đã gỡ khỏi repo sau khi port xong — xem lịch sử git nếu cần). Mọi property dưới đây đều có ít nhất một chỗ hiển thị
thật trên giao diện; cái gì không hiển thị thì không tồn tại.

## 0. Ba nguyên tắc

1. **Notion chỉ lưu thứ bạn gõ bằng tay.** Reading time, số chapter, "9 of 12 out", "24 entries",
   TOC cấp 2, prev/next, nhóm theo năm — tất cả tính lúc build. Lưu chúng trong Notion nghĩa là
   tự nhận việc cập nhật tay mãi mãi.
2. **Một content type duy nhất cho mọi bài viết.** Article, note và chapter dùng chung một DB
   `Posts`. Chapter *là* một article có `Series`. Không tách DB, vì tách là nhân đôi renderer,
   TOC, RSS, sitemap, related.
3. **Series và Topic là hai trục vuông góc.** Một chapter vừa thuộc series "System Design", vừa
   được filed dưới topic Architecture + Go. Không bắt chọn một trong hai.

## 1. Sơ đồ quan hệ

```
Topics ──┬──< Posts >──── Series ──< Parts
         │      │            │         │
         └──────┴────────────┘         │
                └── Part (relation) ───┘
```

4 DB bắt buộc: `Posts`, `Series`, `Parts`, `Topics`.
1 DB tuỳ chọn: `Site` (key/value).

---

## 2. DB `Posts` — mọi thứ có nội dung

Body bài viết = chính nội dung page Notion. Các property chỉ là metadata.

| Property | Notion type | Bắt buộc | Hiển thị ở đâu trên site |
|---|---|---|---|
| `Title` | Title | ✔ | `art-title`, `chapter-title`, `feat-title` |
| `Slug` | Rich text | ✔ | URL. Unique toàn site (kể cả chapter) |
| `Type` | Select: `article` \| `note` | ✔ | badge `note`, filter Articles/Notes trên `/blog` |
| `Status` | Select: `idea` \| `draft` \| `review` \| `published` | ✔ | chỉ `published` mới render; khác → `chap-row locked` |
| `Date` | Date | ✔ | `art-date`, `chap-stat`. Với chapter chưa ra: **ngày dự kiến** → render `due 07 Aug` |
| `Updated` | Date (gõ tay) | | "Updated 28 Jul". **Đừng dùng `Last edited time`** — nó đổi khi bạn sửa một dấu phẩy |
| `Description` | Rich text (1–2 câu) | ✔ | `art-desc`, `chap-sub`, `feat-desc`, meta description, RSS |
| `Topics` | Relation → `Topics` | ✔ | `tag-chips`, trang topic, "Filed under" |
| `Series` | Relation → `Series` (single) | | có = chapter → route `/series/...`, render cột outline trái |
| `Part` | Relation → `Parts` (single) | | nhóm trong `series-map` và trong `<details>` của outline |
| `Order` | Number | | số chapter (`chap-no` 01…12). Chỉ cần khi có `Series` |
| `Pinned` | Checkbox | | lên mục featured ở home (tối đa 4 bài lẻ, mới nhất trước) |
| `Related` | Relation → `Posts` (self, **một chiều**) | | khối "Elsewhere" ở cuối bài lẻ. Bỏ trống thì fallback theo topic chung |
| `Lang` | Select: `en` \| `vi` | | `<html lang>` của trang bài (screen reader, ngắt chữ, SEO). Trống = `en` |

**Không nên thêm:** `Reading time`, `Word count`, `TOC`, `Year`, `Author`. Ba cái đầu derive được,
cái cuối luôn là bạn. **Đã bỏ (2026-10-13):** `Featured order` (featured lấy theo `Pinned` + ngày),
`Cover` (OG image luôn tự vẽ, `src/lib/og.ts`), và cột ngược `Referenced by` của `Related`.

**Về `Type` cho chapter:** chapter vẫn là `article`. Việc nó là chapter do `Series` quyết định,
không phải một giá trị select thứ ba — nếu không bạn sẽ có trạng thái vô nghĩa
(`type=chapter` mà `Series` trống).

### View cần tạo trong Notion
- `Editorial` — group by `Status`, dùng để viết.
- `Published` — filter `Status = published`, sort `Date` desc. Đây là view mà build đọc.
- `Series board` — group by `Series`, sort `Order` asc. Nhìn ra ngay chapter nào còn thiếu.

---

## 3. DB `Series`

| Property | Notion type | Hiển thị |
|---|---|---|
| `Name` | Title | `ser-title`, `page-title`, `outline-title` |
| `Slug` | Rich text | `/series/<slug>` |
| `Description` | Rich text | `ser-desc` trên `/series`, `page-deck` trên trang series |
| `Topics` | Relation → `Topics` | 3 topic đầu cạnh tiêu đề trang series. **Chọn tay 3–5 cái**, đừng rollup từ chapter — rollup sẽ ra 15 tag và vô nghĩa |
| `Level` | Select: `beginner` \| `intermediate` \| `advanced` | dòng meta trên `/series`, bảng facts trên trang series |
| `Order` | Number | số La Mã `i. ii. iii.` trên `/series` |
| `Cadence` | Rich text | "publishing weekly", "starts September 2026" — câu tự do, ẩn khi series complete |
| `Planned chapters` | Number | **tổng số chương dự kiến.** Chapter được tạo lúc bắt tay viết, nên đây mới là độ dài thật của series |
| `Status` | Select: `draft` \| `published` | series đang phác thảo thì ẩn ở prod |
| `Chapters`, `Parts` | (cột ngược của relation) | không đọc lúc build, chỉ để xem trong Notion |

Derive lúc build:
- **Tổng chương** = `max(số chapter đã tạo, Planned chapters)` → "0 / 19 out".
- **State** — không còn là property gõ tay (bỏ 2026-10-13): chưa có chapter published → `planned`;
  số published ≥ `Planned chapters` → `complete`; còn lại → `ongoing`. Không điền `Planned chapters`
  thì series không bao giờ tự `complete`.
- `3 parts`, `9 published`, `≈ 5 h`, `latest 24 Jul`, `Next 07 Aug` (= `Date` nhỏ nhất trong các
  chapter chưa published).

`Cover` cũng đã bỏ — OG image tự vẽ.

---

## 4. DB `Parts`

Nhỏ, nhưng đáng có một DB riêng: tên part xuất hiện ở 2 chỗ (`series-map` và outline reader),
để select-text thì bạn sẽ gõ lại và sai chính tả.

| Property | Notion type | Hiển thị |
|---|---|---|
| `Name` | Title | `part-name` — "One box, and what breaks it" |
| `Series` | Relation → `Series` | |
| `Order` | Number | `part-kicker` → Part I / II / III |
| `Chapters` | (cột ngược của `Posts.Part`) | chỉ để xem trong Notion |

Chỉ 2 cấp: Series → Part → Chapter. Part **không có trang riêng, không có nội dung** — nó là
nhóm, không phải bài viết. Thêm cấp thứ ba là bạn tự tạo ra loạt trang rỗng.

> Muốn gọn hơn: bỏ DB này, đổi thành 2 property trên `Posts`: `Part number` (number) +
> `Part name` (select). Đánh đổi: tên part lặp lại ở mỗi chapter, đổi tên part phải sửa 4 dòng.

---

## 5. DB `Topics`

| Property | Notion type | Hiển thị |
|---|---|---|
| `Name` | Title | dòng trên `/topics`, tiêu đề `/topics/<slug>`, "Filed under" cuối bài |
| `Slug` | Rich text | `/topics/<slug>` |
| `Description` | Rich text | `page-deck` + meta description của trang topic |
| `Pinned` | Checkbox | in đậm, xếp đầu danh sách `/topics` |
| `Order` | Number | thứ tự giữa các topic pinned (phần còn lại xếp A–Z) |

Derive: số bài mỗi topic (`18 articles · 13 notes`), ngày cập nhật gần nhất. Topic 0 bài vẫn
hiện nhưng mờ đi.

**Đã bỏ (2026-10-13):** `Icon`, `Icon class`, `Glyph`, `Group` — thuộc lưới topic-card/filter chip
của bản UI đầu, giao diện Forge hiện tại chỉ là một danh sách chữ.

Đừng dùng Notion rollup để đếm — rollup không filter được `Status = published`, nên nó sẽ đếm cả
draft. Đếm lúc build.

---

## 6. CV — nằm trong repo, không ở Notion

`/about` đọc `src/config/cv.ts`. DB `CV entries` đã xoá (2026-10-13): nó chỉ chứa seed giả,
và một CV sửa vài lần một năm không đáng một request Notion mỗi build.

---

## 7. Skills — đã bỏ

Từng là từ vựng chung cho `tech-row` ở CV và lưới Skills. Cả hai đã bị gỡ khỏi `/about`, nên
DB `Skills` cũng xoá theo (2026-10-13).

---

## 8. `Site` — mấy chuỗi lẻ

Không cần DB. Những thứ này thay đổi vài lần một năm, để trong `config/site.ts` của repo
là đủ và nhanh hơn một request Notion: tagline, các `page-deck`, footer, nav, socials, email.

Thứ duy nhất **nên** để Notion vì bạn sẽ đổi khi đang không mở laptop dev: dòng `availability`
("Open to interesting problems") dưới desk log ở home. DB `Site` kiểu `Key` (title) / `Value`
(rich text), hiện chỉ có đúng key đó.

---

## 9. Routing

```
/                      home
/blog                  archive, group theo năm
/blog/<slug>           post không có Series  (article + note)
/topics                index
/topics/<slug>         shelf của một topic
/series                index
/series/<slug>         series map (Parts → chapters)
/series/<slug>/<order:02d>-<slug>   chapter
/about                 CV
```

```ts
function postUrl(p: Post) {
  return p.series
    ? `/series/${p.series.slug}/${String(p.order).padStart(2, '0')}-${p.slug}`
    : `/blog/${p.slug}`
}
```

`Slug` unique toàn site kể cả khi chapter đã có prefix — để sau này chuyển một chapter
thành bài lẻ (hoặc ngược lại) mà không đụng gì khác. Đổi route thì thêm redirect 301,
đừng đổi slug.

---

## 10. Notion block → class CSS

| Notion block | Render thành |
|---|---|
| `heading_2` / `heading_3` | `<h2 id>` / `<h3 id>` + là nguồn của TOC cấp 2 (`post-aside`) |
| `paragraph` (đầu tiên) | `p.lede` — đoạn mở có chữ to |
| `code` (có caption) | `.code-block` với `.code-head` = caption + `<ngôn ngữ> · N lines` |
| `code` ngôn ngữ **HTML** | `.html-demo` — preview sống trong iframe sandbox (xem §10.1) |
| `callout` | `.callout`, icon Notion → `.ico` |
| `quote` | `.quote-block` (dùng ở `/about`) |
| `bulleted_list` | `ul.bullets` |
| `image` + caption | `<figure>` + `<figcaption>` |
| `divider` | hairline `1px solid var(--rule)` |
| `bookmark` / `embed` | link thường — đừng render iframe, nó phá layout letterpress |

TOC cấp 1 (outline series) lấy từ DB: `Parts` sort theo `Order`, mỗi part chứa `Posts`
sort theo `Order`. TOC cấp 2 lấy từ heading. Hai nguồn khác nhau, đó là lý do chúng
tách thành hai cột trong `chapter.html`.

### 10.1. Illustration tương tác — code block HTML

Một code block đặt ngôn ngữ **HTML** không hiển thị dưới dạng markup, nó chạy thật
trong `<iframe srcdoc sandbox="allow-scripts">` (`src/components/blocks/HtmlDemo.astro`).
Đây là pattern visualizer trong ghi chú CS149: mỗi demo là một tài liệu HTML tự chứa,
CSS của nó không rò rỉ ra layout letterpress và ngược lại.

- **Caption = nhãn.** Tiền tố `demo` (nếu có) bị cắt: `demo · the ring` → nhãn `the ring`.
- **Muốn giữ nguyên code**, cho caption bắt đầu bằng `raw` — ví dụ `raw · dashboard row`.
- **Chiều cao tự động.** Frame tự đo `<body>` rồi `postMessage` chiều cao ra ngoài
  (kẹp trong khoảng 160–2000px). Đừng đo `documentElement.scrollHeight`: nó không bao
  giờ nhỏ hơn chiều cao hiện tại của iframe nên demo ngắn sẽ không co lại được.
- **Theme.** Iframe là document riêng nên không thừa hưởng `data-theme`; trang cha
  postMessage theme vào, shim set lại `data-theme` trên `<html>` của frame. Demo nào
  muốn theo sáng/tối thì khai báo biến màu dưới `:root` và `[data-theme="dim"]`.
- **Sandbox không có `allow-same-origin`** → `localStorage`, cookie và fetch cùng origin
  đều không dùng được trong demo. Cố tình như vậy: nội dung từ Notion là code chạy được.

Hai demo mẫu dùng đúng bộ token màu của site (ring consistent hashing, reconcile loop) nằm
trong `scripts/seed-showcase.mjs` ở lịch sử git (`git show 8566fb1:scripts/seed-showcase.mjs`).

---

## 11. Cạm bẫy Notion API (biết trước đỡ mất buổi chiều)

- **URL ảnh hết hạn ~1 giờ.** Phải tải về lúc build (`next/image` + local hoặc upload
  sang blob storage). Trỏ thẳng URL S3 của Notion là ảnh chết sau một tiếng.
- **Rate limit ~3 req/s**, mỗi lần trả tối đa 100 block → bài dài phải phân trang.
  Cache response ra `.cache/notion/` khi dev, không thì mỗi lần save là một đợt gọi API.
- `Last edited time` đổi khi bạn sửa property, không chỉ nội dung → dùng `Updated` gõ tay
  cho dòng "Updated 28 Jul".
- **Rollup không filter được theo property của bên kia**, nên mọi con số đếm phải tính ở build.
- Relation hai chiều tốn một property ở DB kia; đặt tên rõ (`Chapters`, `Posts`) để bảng
  Notion không đầy cột `Related to …`.
- Notion không có unique constraint cho `Slug` → thêm một check lúc build, fail sớm nếu trùng.
- ISR: revalidate theo thời gian (1h) + một route `/api/revalidate` gọi tay khi vừa publish.
  Notion không có webhook cho database change ở tier thường.

---

## 12. Kiểu dữ liệu sau khi normalize

```ts
type Post = {
  id: string
  title: string
  slug: string
  type: 'article' | 'note'
  status: 'idea' | 'draft' | 'review' | 'published'
  date: string            // ISO; là ngày dự kiến nếu chưa published
  updated?: string
  description: string
  topics: Topic[]
  series?: { slug: string; name: string }
  part?: { order: number; name: string }
  order?: number          // số chapter
  pinned: boolean
  relatedIds: string[]
  lang: 'en' | 'vi'
  published: boolean
  // derived
  url: string
}

type Series = {
  slug: string; name: string; description: string
  topics: Topic[]
  level?: 'beginner' | 'intermediate' | 'advanced'
  order?: number; cadence?: string; plannedChapters?: number
  // derived
  parts: { order: number; name: string; chapters: Post[] }[]
  chapterCount: number; publishedCount: number
  total: number                                  // max(chapterCount, plannedChapters)
  state: 'planned' | 'ongoing' | 'complete'
  latestDate?: string; nextDate?: string
}

type Topic = {
  slug: string; name: string
  description?: string
  pinned: boolean; order?: number
  // derived
  articleCount: number; noteCount: number; updated?: string
}
```

Reading time và heading TOC tính riêng theo từng bài (`src/lib/stats.ts`, `render.ts`).

---

## 13. Thứ tự dựng

1. `Topics` — không phụ thuộc ai, tạo trước.
2. `Posts` với `Type`/`Status`/`Date`/`Description`/`Topics`. Đủ chạy `/`, `/blog`, `/topics`.
3. `Series` + `Parts`, thêm `Series`/`Part`/`Order` vào `Posts`. Mở khoá `/series` và reader.
4. `Site` với key `availability` — tuỳ chọn.
