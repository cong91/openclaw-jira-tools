# SKILL: Jira Chuẩn Hoá Theo Loại Issue (100% tiếng Việt)

## Mục tiêu
Thiết lập một chuẩn dùng Jira thống nhất cho toàn team (dev/product/qa), giảm trùng lặp giữa Epic/Story/Task/Bug/Sub-task, tăng khả năng theo dõi tiến độ, kiểm chứng bằng chứng và audit.

---

## Nguyên tắc vận hành
1. **Một issue = một mục tiêu rõ ràng, đo được**.
2. **Đúng loại issue ngay từ đầu**, tránh đổi loại giữa chừng trừ khi phát hiện sai phân loại.
3. **Issue cha quản lý “cái gì và vì sao”**, issue con quản lý “làm thế nào và khi nào”.
4. **Trạng thái chỉ được chuyển khi đủ bằng chứng**.
5. **Toàn bộ summary/description/comment dùng tiếng Việt**.
6. **Ưu tiên dùng native plugin tools `jira-tools`, không shell-out `jira-cli` host nếu đã có tool tương đương**.
7. **Luôn tận dụng defaults theo agent/user trước khi hỏi lại config**.

---

## 1) Framework phân loại issue

## Bảng mapping loại issue → mục đích → ví dụ
| Loại issue | Mục đích chính | Dấu hiệu nhận biết | Ví dụ ngắn |
|---|---|---|---|
| **Epic** | Gom một năng lực lớn, kéo dài nhiều sprint | Nhiều luồng nghiệp vụ, cần nhiều Story/Task/Bug con | "Trading Filter Simplification Phases A-E" |
| **Story** | Giá trị người dùng/nghiệp vụ có thể nghiệm thu | Viết được theo góc nhìn người dùng/hệ thống nghiệp vụ | "Là trader, tôi xem được verdict thị trường và lý do" |
| **Task** | Công việc kỹ thuật/vận hành độc lập | Không nhất thiết có user story, có đầu ra kỹ thuật rõ | "Thiết lập cron kiểm tra scheduler mỗi 5 phút" |
| **Bug** | Sửa sai lệch so với kỳ vọng đã có | Có bước tái hiện, có kỳ vọng vs thực tế, có mức độ ảnh hưởng | "GET /trading/positions trả 403 dù token hợp lệ" |
| **Sub-task** | Bước thi công nhỏ thuộc Story/Task/Bug | Không đứng độc lập, luôn thuộc issue cha | "Viết test cho JwtOrBotGuard" |

## Cây quyết định chọn loại issue
```text
Bắt đầu
 ├─ Đây có phải lỗi sai lệch hành vi đã kỳ vọng? 
 │   ├─ Có -> BUG
 │   └─ Không
 ├─ Đây có phải mục tiêu lớn kéo dài nhiều sprint, cần gom nhiều issue con?
 │   ├─ Có -> EPIC
 │   └─ Không
 ├─ Đây có tạo ra giá trị nghiệp vụ/người dùng có thể demo/nghiệm thu?
 │   ├─ Có -> STORY
 │   └─ Không -> TASK

Sau khi có Story/Task/Bug:
 └─ Công việc nhỏ để hoàn tất issue cha? -> SUB-TASK
```

## Tiêu chí chống trùng lặp
- Không tạo **Task** nếu nội dung thực chất là lỗi tái hiện được → phải là **Bug**.
- Không tạo **Epic** cho công việc 1-2 ngày chỉ có 1 ticket con.
- Không tạo **Story** nếu không chỉ ra được giá trị nghiệp vụ/người dùng.
- Không tạo **Sub-task** đứng độc lập (không có issue cha).

---

## 2) DoR/DoD theo từng loại issue

## 2.1 Epic
### Definition of Ready (DoR)
- Có mục tiêu business/kỹ thuật cấp năng lực.
- Có phạm vi tổng và ranh giới không làm.
- Có danh sách issue con dự kiến (Story/Task/Bug).
- Có KPI/thước đo thành công ở cấp Epic.

### Definition of Done (DoD)
- Tất cả issue con quan trọng đã Done hoặc có lý do loại trừ rõ.
- KPI Epic được đo và đạt/hoặc có biên bản chấp nhận.
- Có comment tổng kết: kết quả, rủi ro còn lại, bước vận hành tiếp theo.

## 2.2 Story
### DoR
- Viết rõ ngữ cảnh và giá trị người dùng/nghiệp vụ.
- AC kiểm thử được (pass/fail rõ ràng).
- Có phụ thuộc chính (nếu có).

### DoD
- Tất cả AC đạt và có bằng chứng.
- Có test/smoke phù hợp với phạm vi thay đổi.
- Có cập nhật tài liệu sử dụng nếu tác động hành vi người dùng.

## 2.3 Task
### DoR
- Mục tiêu kỹ thuật cụ thể.
- Đầu ra mong đợi đo được (artifact/log/config/code).
- Rủi ro chính và cách rollback tối thiểu.

### DoD
- Đầu ra kỹ thuật đã bàn giao đúng định nghĩa.
- Có bằng chứng chạy được/hoạt động đúng.
- Không tạo nợ kỹ thuật nghiêm trọng chưa ghi nhận.

## 2.4 Bug
### DoR
- Có bước tái hiện tối thiểu.
- Có kỳ vọng vs thực tế.
- Có phạm vi ảnh hưởng và mức độ ưu tiên.

### DoD
- Không còn tái hiện theo kịch bản đã nêu.
- Có test hoặc bằng chứng ngăn tái phát tương ứng.
- Có xác nhận môi trường kiểm thử phù hợp.

## 2.5 Sub-task
### DoR
- Liên kết issue cha rõ ràng.
- Mục tiêu thi công nhỏ, hoàn tất trong thời gian ngắn.

### DoD
- Hoàn tất đúng đầu ra con.
- Đã cập nhật tiến độ vào issue cha.

---

## 3) Luồng trạng thái khuyến nghị + SLA cập nhật

## Trạng thái chuẩn
**To Do → In Progress → In Review → Done**

Trạng thái phụ: **Blocked**

## Quy tắc chuyển trạng thái
- **To Do → In Progress**: Có kế hoạch ngắn + xác nhận DoR đạt.
- **In Progress → In Review**: Có thay đổi thực thi + bằng chứng ban đầu (commit/test/log).
- **In Review → Done**: Đạt DoD + có comment chốt bằng chứng.
- **Bất kỳ → Blocked**: Phải ghi blocker, người cần hỗ trợ, tác động deadline, phương án tháo gỡ.

## SLA cập nhật tiến độ
- Issue đang **In Progress**: cập nhật tối thiểu **mỗi 24 giờ làm việc**.
- Issue **Blocked**: cập nhật tối thiểu **mỗi 8 giờ làm việc** hoặc ngay khi có thay đổi.
- Issue **In Review**: phản hồi review tối đa **24 giờ làm việc**.

---

## 4) Template nội dung chuẩn cho từng loại issue

## 4.1 Template Epic
```md
## Mục tiêu Epic
- Năng lực cần đạt:
- Chỉ số thành công (KPI):

## Bối cảnh
...

## Phạm vi Epic
- Bao gồm:
- Không bao gồm:

## Danh sách issue con dự kiến
- Story:
- Task:
- Bug:

## Rủi ro chính
- ...

## Tiêu chí hoàn tất Epic
- [ ] KPI 1
- [ ] KPI 2
```

## 4.2 Template Story
```md
## Giá trị nghiệp vụ/người dùng
Là [vai trò], tôi muốn [nhu cầu] để [giá trị].

## Bối cảnh
...

## Acceptance Criteria
- [ ] AC1:
- [ ] AC2:

## Phạm vi
- Bao gồm:
- Không bao gồm:

## Phụ thuộc
- ...

## Rủi ro/Rollback
- Rủi ro:
- Rollback:
```

## 4.3 Template Task
```md
## Mục tiêu kỹ thuật
...

## Đầu ra mong đợi
- [ ] Artifact 1
- [ ] Artifact 2

## Cách thực hiện ngắn
...

## Tiêu chí hoàn tất
- [ ] Build/Test/Smoke đạt
- [ ] Có bằng chứng đính kèm

## Rủi ro/Rollback
- ...
```

## 4.4 Template Bug
```md
## Mô tả lỗi
...

## Bước tái hiện
1) ...
2) ...
3) ...

## Kỳ vọng
...

## Thực tế
...

## Phạm vi ảnh hưởng
- Người dùng/chức năng bị ảnh hưởng:
- Mức độ ưu tiên:

## Tiêu chí fix xong
- [ ] Không còn tái hiện theo kịch bản trên
- [ ] Có bằng chứng test/log/screenshot
- [ ] Có biện pháp ngăn tái phát phù hợp
```

## 4.5 Template Sub-task
```md
## Issue cha
- Key:

## Mục tiêu sub-task
...

## Đầu ra cụ thể
- [ ] ...

## Tiêu chí hoàn tất
- [ ] Cập nhật comment vào issue cha
```

---

## 5) Template comment tiến độ chuẩn (áp dụng cho mọi loại)
```md
## Cập nhật tiến độ
- Đã làm:
  - ...
- Kết quả:
  - ...
- Bằng chứng:
  - Commit/PR:
  - Log/Test/Screenshot:
- Blocker:
  - ... (nếu không có ghi: Không)
- Bước tiếp theo:
  - ...
- ETA:
  - ...
```

Quy định:
- Không được ghi "xong" nếu thiếu bằng chứng.
- Bằng chứng phải kiểm chứng được (link/ảnh/log/test).

---

## 6) Quy tắc link issue

- **Epic Link**: Story/Task/Bug thuộc phạm vi Epic phải gắn Epic Link.
- **blocks**: Dùng khi issue A chặn issue B thực sự.
- **relates to**: Có liên quan thông tin nhưng không chặn tiến độ.
- **caused by**: Dùng khi lỗi phát sinh do thay đổi/issue trước đó.
- **duplicates**: Dùng khi trùng bản chất; giữ 1 issue chuẩn, issue còn lại đóng theo duplicate.

Quy tắc chống nhiễu:
- Không gắn quá nhiều link "relates to" nếu không phục vụ quyết định.
- Với "blocks", luôn ghi rõ điều kiện mở chặn.

---

## 6.1) Bộ native Jira tools phải ưu tiên dùng

> Nếu runtime đã expose plugin id `jira-tools`, agent phải ưu tiên bộ tools này thay vì tự nghĩ ra command khác.

## Nhóm tạo issue / thiết lập mặc định
- `jira_create_task`
- `jira_create_epic`
- `jira_create_subtask`
- `jira_set_defaults`
- `jira_inspect_project`

## Nhóm issue management
- `jira_issue_list`
- `jira_issue_view`
- `jira_open`
- `jira_issue_edit`
- `jira_issue_assign`
- `jira_issue_attachment_add`
- `jira_issue_comment_add`
- `jira_issue_clone`
- `jira_issue_delete`
- `jira_issue_watch`
- `jira_issue_move`
- `jira_issue_worklog_add`
- `jira_issue_link`
- `jira_issue_unlink`

## Nhóm epic / project / board / sprint / release
- `jira_epic_list`
- `jira_epic_view`
- `jira_epic_add`
- `jira_epic_remove`
- `jira_project_list`
- `jira_project_view`
- `jira_board_list`
- `jira_sprint_list`
- `jira_sprint_add`
- `jira_sprint_close`
- `jira_release_list`
- `jira_me`
- `jira_serverinfo`

## 6.2) Quy tắc chọn tool theo ý định người dùng

- Người dùng nói **"tạo task / log task"** → dùng `jira_create_task`
- Người dùng nói **"tạo epic"** → dùng `jira_create_epic`
- Người dùng nói **"tạo subtask"** → dùng `jira_create_subtask`
- Người dùng nói **"set mặc định / nhớ config Jira"** → dùng `jira_set_defaults`
- Người dùng nói **"xem project / inspect field / xem create screen"** → dùng `jira_inspect_project` hoặc `jira_project_view`
- Người dùng nói **"xem issue"** → dùng `jira_issue_view`
- Người dùng nói **"list issue / tìm issue"** → dùng `jira_issue_list`
- Người dùng nói **"mở issue"** → dùng `jira_open`
- Người dùng nói **"sửa issue"** → dùng `jira_issue_edit`
- Người dùng nói **"assign issue"** → dùng `jira_issue_assign`
- Người dùng nói **"upload file / đính kèm file / attach artifact thật"** → dùng `jira_issue_attachment_add`
- Người dùng nói **"comment / cập nhật tiến độ"** → dùng `jira_issue_comment_add`
- Người dùng nói **"clone issue"** → dùng `jira_issue_clone`
- Người dùng nói **"watch issue"** → dùng `jira_issue_watch`
- Người dùng nói **"transition / move issue"** → dùng `jira_issue_move`
- Người dùng nói **"log work / worklog"** → dùng `jira_issue_worklog_add`
- Người dùng nói **"link / unlink issue"** → dùng `jira_issue_link` / `jira_issue_unlink`
- Người dùng nói **"gắn issue vào epic"** → dùng `jira_epic_add`
- Người dùng nói **"bỏ epic link"** → dùng `jira_epic_remove`
- Người dùng nói **"xem board / sprint / release"** → dùng `jira_board_list` / `jira_sprint_list` / `jira_release_list`

## 6.3) Quy tắc defaults để agent không quên config

Trước khi hỏi user thêm, agent phải ưu tiên kiểm tra/default theo thứ tự:
1. params user truyền trực tiếp
2. defaults đã lưu qua `jira_set_defaults`
3. plugin config `jira-tools` (`server/email/token/defaultProject`)
4. nếu vẫn thiếu field bắt buộc mới hỏi lại đúng field còn thiếu

Các defaults nên tận dụng:
- `defaultProject`
- `assigneeEmail`
- `assigneeName`
- `labels`
- `epicKey`
- `parentLink`
- `templateTask`
- `templateEpic`
- `templateSubtask`

## 6.4) Quy tắc vận hành với Epic Name / screen config

Nếu Jira screen không cho set field Epic Name hoặc field custom khác:
- không retry mù quáng
- sanitize field theo create screen/createmeta
- báo rõ đây là **blocker cấu hình Jira**, không phải blocker code
- nếu cần vẫn tạo issue theo fallback hợp lệ và comment rõ giới hạn

## 7) Kế hoạch triển khai nâng cấp skill Jira (Phase A-E)

## Phase A: Chuẩn phân loại issue
- Áp dụng cây quyết định + bảng mapping.
- Rà soát backlog hiện tại, sửa sai loại issue nếu cần.

## Phase B: Chuẩn template + comment progress
- Bắt buộc dùng template theo loại issue.
- Comment tiến độ theo mẫu chuẩn và có bằng chứng.

## Phase C: Chuẩn workflow trạng thái + SLA cập nhật
- Áp dụng luồng trạng thái chuẩn.
- Áp SLA cập nhật In Progress/Blocked/In Review.

## Phase D: Checklist QA/Jira hygiene
- Kiểm tra đầy đủ DoR/DoD.
- Kiểm tra link issue đúng ngữ nghĩa.
- Kiểm tra không còn issue "mồ côi" thiếu Epic/cha.

## Phase E: Rollout cho assistant/fullstack/creator
- Đồng bộ cách viết issue/comment 100% tiếng Việt.
- Dùng cùng mẫu chuyển trạng thái và cùng checklist trước khi Done.

---

## 8) Checklist QA/Jira Hygiene trước khi chuyển Done
- [ ] Đúng loại issue theo cây quyết định.
- [ ] Đạt DoR từ đầu và đạt DoD khi kết thúc.
- [ ] AC/tiêu chí hoàn tất đã được xác nhận.
- [ ] Có bằng chứng kiểm chứng được.
- [ ] Link issue đúng ngữ nghĩa (Epic Link/blocks/relates/caused by/duplicates).
- [ ] Không còn blocker mở mà chưa ghi chú xử lý.

---

## 9) Quy tắc thực thi bắt buộc
1. Không sửa SOUL/IDENTITY khi thực thi skill này.
2. Chỉ cập nhật trong phạm vi skill Jira và docs hướng dẫn liên quan.
3. Mọi output vận hành phải bằng tiếng Việt.
4. Nếu thiếu thông tin để phân loại issue, phải hỏi rõ trước khi tạo ticket.
5. Nếu `jira-tools` khả dụng, không ưu tiên shell command `jira ...`; chỉ dùng native tools đã register.
6. Khi có thể dùng plugin id `jira-tools`, coi đó là bộ Jira group thực tế trong allowlist của agent.
7. Khi tool đã đủ schema/params, không được tự bịa field ngoài screen Jira; phải sanitize hoặc inspect trước.

---

## 10) Fallback khi bị chặn đổi Issue Type bởi Jira scheme/quyền
Khi framework yêu cầu đổi loại issue (ví dụ Task -> Bug) nhưng Jira không cho phép đổi loại do workflow/scheme/quyền:

1. **Không force update nhiều lần** gây nhiễu lịch sử.
2. Giữ loại hiện tại, sau đó **gắn nhãn phản ánh ý định phân loại**:
   - `intended-bug` hoặc `intended-task`/`intended-story`.
   - `type-<current>-by-scheme` (ví dụ `type-task-by-scheme`).
3. Cập nhật description thêm mục “Phân loại issue theo framework” nêu rõ:
   - Loại đúng theo framework là gì.
   - Vì sao chưa đổi được (scheme/quyền nào đang chặn).
4. Comment tiến độ bắt buộc ghi rõ:
   - **Blocker cấu hình Jira** (không phải blocker code).
   - Kế hoạch fallback tạm thời bằng label + link issue.
5. Mở ticket hỗ trợ Jira admin (hoặc comment @admin) để yêu cầu mở issue type phù hợp trên project/screen.
