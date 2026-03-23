# openclaw-jira-tools

> English README: [README.en.md](./README.en.md)

Plugin OpenClaw chuẩn để đăng ký native Jira tools cho agent, giúp agent dùng Jira nhất quán, không quên config và ưu tiên tool-native thay vì shell-out `jira-cli` trên host.

## Mục tiêu
- Chuẩn hóa Jira tools cho agent trong OpenClaw
- Không phụ thuộc `brew install jira-cli` trên máy host
- Đọc config Jira từ plugin config (`plugins.entries.jira-tools.config`)
- Hỗ trợ defaults theo agent/user để giảm quên config
- Sanitize field theo Jira `createmeta` / create screen
- Ưu tiên nội dung tiếng Việt trong flow vận hành Jira

## Bộ tools hiện có

### Tạo issue / defaults
- `jira_create_task`
- `jira_create_epic`
- `jira_create_subtask`
- `jira_set_defaults`
- `jira_inspect_project`

### Issue management
- `jira_issue_list`
- `jira_issue_view`
- `jira_issue_transitions`
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

### Epic / project / board / sprint / release
- `jira_epic_list`
- `jira_epic_view`
- `jira_epic_add` *(có fallback nhiều cách, nếu Jira instance chặn retroactive epic assignment thì trả lỗi rõ và hướng workaround)*
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

## Cấu trúc repo
```text
openclaw-jira-tools/
├── openclaw.plugin.json
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── lib/
│   ├── shared/
│   └── tools/
├── skill/
│   └── jira/
│       ├── SKILL.md
│       └── _meta.json
└── dist/
```

## Skill đi kèm
Repo này mang kèm skill Jira để hướng dẫn agent dùng bộ tools đúng flow:
- `skill/jira/SKILL.md`
- `skill/jira/_meta.json`

Skill này mô tả:
- chuẩn phân loại issue
- template tiếng Việt
- mapping ý định user → tool Jira tương ứng
- rule dùng `jira-tools` thay cho shell-out `jira-cli`
- rule defaults để agent không quên config

## Cài đặt đúng từ npm

> Package npm: https://www.npmjs.com/package/@mrc2204/openclaw-jira-tools

```bash
openclaw plugins install @mrc2204/openclaw-jira-tools
```

Nếu cần môi trường development/local thì dùng path install riêng, không dùng flow này để khóa version.

## Cài local cho phát triển
```bash
cd ~/Work/projects/jira-tools
npm install
npm run build
openclaw plugins install -l ~/Work/projects/jira-tools
```

## Config mẫu
```json5
{
  plugins: {
    entries: {
      "jira-tools": {
        enabled: true,
        config: {
          server: "https://your-domain.atlassian.net",
          email: "you@example.com",
          token: "<jira-token>",
          defaultProject: "TAA",
          language: "vi",
          requireClickableLinks: true
        }
      }
    }
  }
}
```

## Ghi chú
- Nếu allowlist của agent chứa `jira-tools`, OpenClaw sẽ bật toàn bộ tools của plugin này.
- Đây là plugin-native surface; không tự động import toàn bộ command tree của binary `jira-cli` host.
- Một số flow Epic có thể vẫn phụ thuộc Jira screen config của project (ví dụ Epic Name / Epic Link field).

## License
MIT
