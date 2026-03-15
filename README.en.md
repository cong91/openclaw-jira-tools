# openclaw-jira-tools

Native OpenClaw plugin that registers Jira tools for agents, helping them use Jira consistently, avoid forgetting configuration, and prefer tool-native workflows instead of shelling out to host-level `jira-cli`.

## Goals
- Standardize Jira tools for OpenClaw agents
- Avoid dependency on `brew install jira-cli` on the host machine
- Read Jira configuration from plugin config (`plugins.entries.jira-tools.config`)
- Support per-agent / per-user defaults to reduce config drift
- Sanitize fields against Jira `createmeta` / create screen constraints
- Support Vietnamese-first operational Jira workflows

## Available tools

### Create / defaults
- `jira_create_task`
- `jira_create_epic`
- `jira_create_subtask`
- `jira_set_defaults`
- `jira_inspect_project`

### Issue management
- `jira_issue_list`
- `jira_issue_view`
- `jira_open`
- `jira_issue_edit`
- `jira_issue_assign`
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

## Repository structure
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
└── dist/
```

## Local install
```bash
cd ~/Work/projects/jira-tools
npm install
npm run build
openclaw plugins install -l ~/Work/projects/jira-tools
```

## Example config
```json5
{
  plugins: {
    load: {
      paths: ["~/Work/projects/jira-tools"]
    },
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

## Notes
- If an agent allowlist includes `jira-tools`, OpenClaw enables all tools registered by this plugin.
- This is a plugin-native Jira surface; it does not automatically import every command from a host-installed `jira-cli` binary.
- Some Epic-related flows may still depend on Jira project screen configuration (for example Epic Name / Epic Link fields).

## License
MIT
