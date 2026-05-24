---
description: Deep review with security audit + Staff+ engineering review. Usage: /deep-review [uncommitted|branch|commit|PR]
agent: build
---
You are performing a **deep code review** merging the standard /review workflow with two specialized skills.

The user passed the following arguments to this command: "$ARGUMENTS"

## Step 1: Load Skills
First, use the `skill` tool to load both of these skills into your context:
- `code-security-auditor` — security audit of the codebase
- `staff-engineer-review` — deep Staff+ level code review

## Step 2: Gather Review Context (Standard /review Workflow)

### Determine Scope
Based on the argument "$1" (or "$ARGUMENTS" if no clear delimiter):
- **No argument or "uncommitted"**: Review all uncommitted changes — run `git diff`, `git diff --cached`, `git status --short`
- **Commit hash** (40-char SHA or short hash): Run `git show <hash>`
- **Branch name**: Run `git diff <branch>...HEAD`
- **PR URL or number** (contains "github.com" or "pull" or looks like a PR number): Run `gh pr view <pr>` and `gh pr diff <pr>`

### Read Full Context
- Read the full content of every modified/added file
- Check for conventions files (CONVENTIONS.md, AGENTS.md, .editorconfig, etc.)
- Diffs alone are not enough — understand surrounding logic before flagging issues

## Step 3: Delegate to Skill Subagents

Create **two subagents** using the `task` tool, passing each the gathered context and the respective skill's full content.

### Subagent A — Security Audit
Prompt the subagent with the full `code-security-auditor` skill content and the changes to review. Instruct it to follow the skill's workflow (dependencies audit, script inspection, file system, network, obfuscation checks, risk assessment) and return findings in the skill's output format (🔴 Critical, 🟠 Suspicious, 🟡 Observations, 🔍 Manual review checklist, 🚨 Indicators, 🧾 Final verdict).

### Subagent B — Staff+ Engineering Review
Prompt the subagent with the full `staff-engineer-review` skill content and the changes to review. Instruct it to follow the skill's workflow (plan vs implementation, architecture, code quality, correctness, performance, test coverage) and return findings in the skill's output format (summary, plan vs reality, critical issues, improvement opportunities by category, test recommendations).

## Step 4: Summarize Findings

After both subagents return their results, produce a final consolidated report for the user:

1. **Summary** — scope reviewed, overall quality, risk level
2. **Security Audit** — paste the findings from Subagent A
3. **Engineering Review** — paste the findings from Subagent B
4. **Final Verdict** — safe to run? Risk level? Key takeaways?
