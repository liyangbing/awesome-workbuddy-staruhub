# Prompt 运行回放与证据说明

## 覆盖范围

`prompts/100-work-efficiency-prompts.json` 是唯一 canonical 数据源。`prompts/runs/` 现有 100 个运行目录，与 Prompt 1–100 一一对应；每个目录包含一份 `run.json` 和一份 UTF-8 Markdown 输出。Prompt 1 沿用原文件名 `client_report.md`，其余记录使用 `output.md`。

这里的“真实运行”表示 ChatGPT GPT-5.6 Sol 已针对每条 canonical Prompt 生成结果并将原始正文保存到仓库；它不表示 WorkBuddy 客户端、Agent 或生产环境验收。本次环境没有 WorkBuddy CLI、桌面进程、API Key、Agent ID 或 Runtime，所有运行者都如实记录为 ChatGPT GPT-5.6 Sol。

Prompt 1 保留既有联网研究正文、方法限制和引用，移除了用户可见正文中的模型与运行元数据；这些证据只保留在 `run.json`。Prompt 2–100 是本次新增结果：无需外部输入即可完成的任务使用 `prompt_only`；依赖文件、客户材料、系统数据、邮件、日历、代码库等不可用输入的任务使用 `synthetic_demo`，正文首行明确声明：

> 演示输入：合成数据，不代表真实客户/生产结果

100 条记录均已由 Codex 独立审核并标记为 `approved`。审核覆盖全量结构、哈希、唯一性、披露、路径安全和自动化内容检查，并按 10 类分层人工抽样 20 条；批准仅表示适合作为效果预览，不代表真实业务输入、外部事实或预期附件格式已经完成。

## Schema v2

每个 `run.json` 至少包含：

- `schema_version`、`run_id`、`prompt_id`
- `prompt_sha256`、`prompt_record_sha256`
- `runner`、`executed_at`、`conversation_url`
- `input_mode`、`input_summary`、`network_research`
- `outcome`、`output_file`、`output_sha256`
- `review`、`limitations`

`prompt_sha256` 锁定完整 Prompt 文本，`prompt_record_sha256` 锁定 canonical JSON 中该条 Prompt 的完整记录，`output_sha256` 锁定原始 Markdown 字节。哈希用于检测漂移，不用于证明运行者或审核者身份。

Prompt 1 的既有证据为：

- Canonical Prompt SHA-256：`65184f042697f4d6adbf00bb5501f4117a5490f69b904a00870df2c243e31958`
- 完整 Prompt 记录 SHA-256：`9545b123ae4d62acec312e21f8cb283f2beab9e3a084e6231092b2c628efff7a`
- 输出 SHA-256：`97f0dbd4b0954b4096c23bfab7cc567051c4883c5f093216a239afa42dd454cc`
- 输出文件：`prompts/runs/prompt-001-chatgpt-5-6-sol-20260731/client_report.md`
- 运行元数据：`prompts/runs/prompt-001-chatgpt-5-6-sol-20260731/run.json`
- 原始联网运行记录：https://chatgpt.com/c/WEB:e375e2f2-79bb-4746-b8e8-8bf2d65b023c

## 双层门禁

维护者可先做不改变状态的结构审核：

```bash
npm run review:runs
```

该命令接受 `pending`，但仍严格检查 100 条一一对应关系、Prompt 与记录哈希、输出哈希、目录和文件集合、路径穿越、符号链接、日期、运行者身份、输入模式、合成数据声明、限制说明及审核字段。

生产校验和生产构建只接受 `approved`：

```bash
npm --prefix website run check:data
npm --prefix website run build
```

当前源码已有 100 条 `approved`，生产校验和生产构建会生成 100 个可用按钮与 100 个结果模板。测试仍在临时副本中执行生产构建，不修改源码记录，也不放宽生产策略。

验证器严格拒绝：

- 少于或多于 100 个运行目录、重复或缺失 Prompt；
- Prompt 文本、完整记录或输出的 SHA-256 漂移；
- 额外文件、路径穿越、绝对路径和符号链接；
- 冒充 WorkBuddy 的运行者或不精确的运行者标识；
- 非法或未来执行时间、空白限制说明；
- 缺少首行声明的 `synthetic_demo`，或其 outcome 不是 `partial`；
- `pending` 记录进入生产发布，或生成执行者冒充审核者。

## 静态页面行为

页面只把已经提交的 Markdown 原始字节装入 `<template>`，点击“试运行”后通过 `textContent` 流式回放。回放不调用模型、API、后端或本地文件，保留末尾换行并与 `output_sha256` 对应。

弹窗只显示最终结果正文以及必要的回放、复制和关闭控件，不显示 runner、模型、输入模式、outcome、执行时间、SHA-256、limitations 或其他技术元数据。这些信息只保留在 `run.json` 和校验流程中。Escape、焦点恢复、focus trap、reduced motion 和复制能力继续保留。

## 限制

- Prompt 2–100 没有使用实时网络研究，`network_research` 均为 `false`；涉及市场、政策或事实研究的内容只作为演示预览，不声称外部事实已核验。
- 合成演示不代表真实客户、生产系统或真实个人数据。
- Prompt 2–100 由同一 ChatGPT 工作模式会话批量执行并归档，`conversation_url` 统一记录该批次的真实对话深链；Prompt 1 保留其独立联网研究对话。
- WorkBuddy 真机或企业 Agent 结果若以后取得，应新增独立记录并保存产品版本、权限模式、输入清单、运行地址和复核信息，不得把本批 ChatGPT 记录改名。
