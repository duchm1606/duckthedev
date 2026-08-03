# Notion CMS — kiến trúc DB cho duckthedev

Suy ra trực tiếp từ mock trong `mock/`. Mọi property dưới đây đều có ít nhất một chỗ hiển thị
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

Skills ──< CV entries          Skills ──< (skill groups on /about)
```

5 DB bắt buộc: `Posts`, `Series`, `Parts`, `Topics`, `CV entries`.
2 DB tuỳ chọn: `Skills`, `Site` (key/value).

---

## 2. DB `Posts` — mọi thứ có nội dung

Body bài viết = chính nội dung page Notion. Các property chỉ là metadata.

| Property | Notion type | Bắt buộc | Hiển thị ở đâu trong mock |
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
| `Pinned` | Checkbox | | badge `pinned` + section `I. FEATURED` ở home |
| `Featured order` | Number | | thứ tự trong 4 ô featured; trống = không lên featured |
| `Cover` | Files | | ảnh OG. Nếu trống → generate OG bằng title |
| `Related` | Relation → `Posts` (self) | | khối "Elsewhere" ở sidebar phải. Bỏ trống thì fallback theo topic chung |
| `Lang` | Select: `en` \| `vi` | | nếu sau này viết hai thứ tiếng |

**Không nên thêm:** `Reading time`, `Word count`, `TOC`, `Year`, `Author`. Ba cái đầu derive được,
cái cuối luôn là bạn.

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
| `Topics` | Relation → `Topics` | `ser-tags`. **Chọn tay 3–5 cái**, đừng rollup từ chapter — rollup sẽ ra 15 tag và vô nghĩa |
| `State` | Select: `planned` \| `ongoing` \| `complete` | `state-tag` (`publishing weekly` / `ongoing` / `complete`) |
| `Level` | Select: `beginner` \| `intermediate` \| `advanced` | `post-meta`, `page-stats` |
| `Order` | Number | số La Mã `i. ii. iii.` trên `/series` |
| `Cadence` | Rich text | "publishing weekly", "starts September 2026" — câu tự do dưới `state-tag` |
| `Planned chapters` | Number | chỉ cho series `planned`: "7 chapters planned" khi chưa có post nào |
| `Status` | Select: `draft` \| `published` | series đang phác thảo thì ẩn |
| `Cover` | Files | OG image |

Derive lúc build: `12 chapters`, `3 parts`, `9 published`, `≈ 5 h`, `latest 24 Jul`,
`Next out 07 Aug` (= `Date` nhỏ nhất trong các chapter chưa published).

---

## 4. DB `Parts`

Nhỏ, nhưng đáng có một DB riêng: tên part xuất hiện ở 2 chỗ (`series-map` và outline reader),
để select-text thì bạn sẽ gõ lại và sai chính tả.

| Property | Notion type | Hiển thị |
|---|---|---|
| `Name` | Title | `part-name` — "One box, and what breaks it" |
| `Series` | Relation → `Series` | |
| `Order` | Number | `part-kicker` → Part I / II / III |
| `Note` | Rich text | phần đuôi của `part-meta`, ví dụ "publishing" |

Chỉ 2 cấp: Series → Part → Chapter. Part **không có trang riêng, không có nội dung** — nó là
nhóm, không phải bài viết. Thêm cấp thứ ba là bạn tự tạo ra loạt trang rỗng.

> Muốn gọn hơn: bỏ DB này, đổi thành 2 property trên `Posts`: `Part number` (number) +
> `Part name` (select). Đánh đổi: tên part lặp lại ở mỗi chapter, đổi tên part phải sửa 4 dòng.

---

## 5. DB `Topics`

| Property | Notion type | Hiển thị |
|---|---|---|
| `Name` | Title | `chip`, `topic-card h3`, `topic-pill .name` |
| `Slug` | Rich text | `/topics/<slug>` |
| `Icon` | URL | logo SVG. **Ưu tiên 1** cho `topic-card-glyph` / `topic-pill .glyph` |
| `Icon class` | Select: `invert` \| `wide` | `invert` = logo đen, cần `filter:invert(1)` ở dark theme. `wide` = wordmark, không vuông |
| `Glyph` | Rich text (2 ký tự) | **fallback** khi `Icon` trống — `Ar`, `Op`, `In` |
| `Description` | Rich text | đoạn mô tả trong `topic-card` |
| `Group` | Select: `lang` \| `data` \| `infra` \| `practice` | filter chip trên `/topics` (`data-tags`) |
| `Pinned` | Checkbox | section `I. Pinned` (9 cái) |
| `Order` | Number | thứ tự trong lưới pinned |

### Icon: link công khai, không upload

Giống DB `dat.com-topics-db-ex` cũ (dùng Cloudinary), nhưng ở đây không cần tự host:

- **[Simple Icons](https://simpleicons.org)** — `https://cdn.simpleicons.org/<slug>`. SVG một màu, trả về đúng brand color. Hợp với letterpress hơn logo nhiều màu.
- Hai ngoại lệ phải lấy từ **devicon**: **AWS** (Simple Icons gỡ vì trademark) và **gRPC** (không có).
  AWS dùng bản `plain-wordmark` — một màu cam `#f90`, nhìn được ở cả hai theme. Bản
  `original-wordmark` có chữ navy `#252f3e`, chìm nghỉm ở dark.
- Notion page icon set luôn cùng URL đó, nên trong Notion nhìn cũng ra logo chứ không chỉ là một ô text URL.

`Icon class = invert` cho 6 topic có logo đen tuyền — OpenTelemetry, Kafka (`#231F20`), Next.js,
Notion, Rust, và gRPC. Không có nó thì ở dark theme logo biến mất.

> gRPC là ca dễ sót: SVG của devicon **không có attribute `fill` nào cả**, nên trong `<img>` nó
> mặc định về đen. Grep `fill=` ra rỗng không có nghĩa là icon an toàn — nó nghĩa là icon màu đen.

```css
.topic-glyph img { width: 22px; height: 22px; object-fit: contain; }
[data-theme="dim"] .topic-glyph img.invert { filter: invert(1); }
.topic-glyph img.wide { width: auto; height: 16px; }   /* AWS wordmark */
```

13 topic không có brand (Architecture, Ops, Interviews, Debugging, Career & craft…) để `Icon` trống và rơi về `Glyph`. Đừng cố tìm logo cho chúng — icon chung chung nhìn tệ hơn hai chữ cái.

Derive: `31 entries`, `18 articles · 13 notes`, `Updated 28 Jul`, alpha index A–Z (chữ nào không
có topic thì `.off`).

Đừng dùng Notion rollup để đếm — rollup không filter được `Status = published`, nên nó sẽ đếm cả
draft. Đếm lúc build.

---

## 6. DB `CV entries`

Một DB cho cả Experience / Education / Projects. Chúng cùng một hình dạng
(`cv-logo` + role + org + date + bullets + tech), tách ba DB là tách ba lần cùng một schema.

| Property | Notion type | Hiển thị |
|---|---|---|
| `Role` | Title | `cv-role` — "Senior Backend Engineer", "outboxd" |
| `Kind` | Select: `experience` \| `education` \| `project` | quyết định nó nằm ở nhóm I, II hay IV |
| `Org` | Rich text | `cv-where` — "Axiom Pay", "University of Technology" |
| `Org URL` | URL | link trong `cv-where` |
| `Location` | Rich text | phần sau dấu `·` — "Singapore / remote" |
| `Logo` | Rich text (2 ký tự) | `cv-logo` — `Ax`, `Lm`, `ob`. Ký tự lạ như `§`, `✎` cũng được |
| `Start` / `End` | Date | `cv-date` — "2023 — present" (End trống = present) |
| `Order` | Number | fallback khi hai mục cùng ngày |
| `Tech` | Relation → `Skills` | `tech-row` |
| `Visible` | Checkbox | ẩn mục cũ mà không xoá |

Bullets (`cv-activity`) = **nội dung page**, không phải property. Gõ bullet list trong page,
build đọc block children. Property rich text sẽ chật và không xuống dòng đẹp.

---

## 7. DB `Skills` (tuỳ chọn nhưng nên có)

Một từ vựng dùng chung cho `tech-row` ở CV lẫn lưới `III. Skills`.

| Property | Notion type | Hiển thị |
|---|---|---|
| `Name` | Title | `tech` badge — viết thường: `go`, `postgres`, `github-actions` |
| `Group` | Select: `Languages` \| `Data` \| `Infrastructure` \| `Observability` \| `Practices` \| `Front-end` | tiêu đề `skill-block h4` |
| `Order` | Number | thứ tự trong nhóm |
| `Show in skills` | Checkbox | có cái chỉ dùng ở CV (`debezium`) mà không cần lên lưới skills |
| `Note` | Rich text | "(learning)" sau `rust` |

Không có DB này thì `Tech` trên CV thành multi-select và lưới Skills phải gõ tay trong repo.
Chấp nhận được nếu bạn không định sửa CV thường xuyên.

---

## 8. `Site` — mấy chuỗi lẻ

Không cần DB. Những thứ này thay đổi vài lần một năm, để trong `config/site.ts` của repo
là đủ và nhanh hơn một request Notion:

`brand-tag`, `colo-note`, các `page-deck`, `colo-foot`, danh sách nav, socials.

Riêng hai thứ **nên** để Notion vì bạn sẽ đổi khi đang không mở laptop dev:
`availability` ("Open to interesting problems") và link `CV PDF`. Một DB `Site` kiểu
`Key` (title) / `Value` (rich text) là đủ, hoặc một page Notion duy nhất parse ra.

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

## 10. Notion block → class trong mock

| Notion block | Render thành |
|---|---|
| `heading_2` / `heading_3` | `<h2 id>` / `<h3 id>` + là nguồn của TOC cấp 2 (`post-aside`) |
| `paragraph` (đầu tiên) | `p.lede` — đoạn mở có chữ to |
| `code` (có caption) | `.code-block` với `.code-head` = caption + `<ngôn ngữ> · N lines` |
| `callout` | `.callout`, icon Notion → `.ico` |
| `quote` | `.quote-block` (dùng ở `/about`) |
| `bulleted_list` | `ul.bullets` |
| `image` + caption | `<figure>` + `<figcaption>` |
| `divider` | hairline `1px solid var(--rule)` |
| `bookmark` / `embed` | link thường — đừng render iframe, nó phá layout letterpress |

TOC cấp 1 (outline series) lấy từ DB: `Parts` sort theo `Order`, mỗi part chứa `Posts`
sort theo `Order`. TOC cấp 2 lấy từ heading. Hai nguồn khác nhau, đó là lý do chúng
tách thành hai cột trong `chapter.html`.

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
  date: string            // ISO; là ngày dự kiến nếu chưa published
  updated?: string
  description: string
  topics: Topic[]
  series?: { slug: string; name: string }
  part?: { order: number; name: string }
  order?: number          // số chapter
  pinned: boolean
  featuredOrder?: number
  published: boolean
  // derived
  url: string
  readingMinutes: number
  headings: { id: string; text: string; level: 2 | 3 }[]
}

type Series = {
  slug: string; name: string; description: string
  topics: Topic[]
  state: 'planned' | 'ongoing' | 'complete'
  level: 'beginner' | 'intermediate' | 'advanced'
  order: number; cadence?: string
  // derived
  parts: { order: number; name: string; note?: string; chapters: Post[] }[]
  chapterCount: number; publishedCount: number
  totalMinutes: number; latestDate?: string; nextDate?: string
}

type Topic = {
  slug: string; name: string; glyph: string
  description?: string
  group?: 'lang' | 'data' | 'infra' | 'practice'
  pinned: boolean
  // derived
  articleCount: number; noteCount: number; updated: string
}
```

---

## 13. Thứ tự dựng

1. `Topics` + `Skills` — không phụ thuộc ai, tạo trước.
2. `Posts` với `Type`/`Status`/`Date`/`Description`/`Topics`. Đủ chạy `/`, `/blog`, `/topics`.
3. `Series` + `Parts`, thêm `Series`/`Part`/`Order` vào `Posts`. Mở khoá `/series` và reader 3 cột.
4. `CV entries`. `/about` là trang tĩnh nhất, làm cuối cũng được.

Đừng tạo cả 7 DB rồi mới code. Bước 2 xong là đã có site chạy được.
