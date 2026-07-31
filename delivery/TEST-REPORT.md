# 测试报告与已知限制

测试日期：2026-07-31（Asia/Shanghai）

运行环境：Node.js v24.14.0，npm 9.4.2

## 最终结果

| 检查 | 命令或方法 | 结果 |
|---|---|---|
| 初始源码包完整性 | SHA-256 | PASS；2,590,351 bytes，`18b8fc0d96e18f1cca56517e9af198d5e032841c8cf10547dd4377ffb59f8518` |
| GPT-5.6 交付补丁完整性 | SHA-256 + `git apply --check --whitespace=error-all` | PASS；477,506 bytes，`22117858d84086b16acae2e704b5456f6b1418f3610f57b0e2c12f2b48e41297` |
| 根依赖安装 | `npm ci` | PASS |
| website 依赖安装 | 在 `website/` 执行 `npm ci` | PASS |
| 根测试 | `npm test` | PASS；awesome-lint 与 100 条结构审核通过 |
| 发布数据门禁 | `npm --prefix website run check:data` | PASS；100 approved，0 pending |
| website 测试 | `npm --prefix website test` | PASS；21 项中 20 通过，1 项因 Windows 不允许创建目录符号链接而跳过 |
| Astro 生产构建 | `npm --prefix website run build` | PASS；静态构建 2 页 |
| website 依赖审计 | `npm --prefix website audit --json` | PASS；0 vulnerabilities |
| 根依赖审计 | `npm audit --json` | 已知风险；`awesome-lint` 开发依赖链共 6 个 high，未新增依赖或修改锁文件 |
| 密钥扫描 | Gitleaks 8.30.1，扫描 14 个源码目标 | PASS；未发现凭据 |
| Git 空白检查 | `git diff --check` | PASS |
| 浏览器验收 | 本地生产构建 + 内置浏览器 | PASS；100 个可用“试运行”、100 个模板；Prompt 1/2 实际点击、流式回放、立即显示与 Escape 关闭通过 |

## 覆盖摘要

- Canonical Prompt：100 条，10 个分类各 10 条。
- 运行结果：100 条、100 个不同 SHA-256、100 条均由 Codex 独立审核为 `approved`。
- 输入：11 条 `prompt_only`、89 条 `synthetic_demo`；后者正文首行均有合成数据声明。
- 结果范围：Prompt 1 为 `complete`；Prompt 2–100 均如实标为 `partial` 效果预览。
- 输出长度：603–3954 个 Unicode 字符；所有输出均以换行结尾。
- 重复检查：移除固定披露行后的 5-gram Jaccard 最大值约 0.034，无明显批量模板复制。
- 网络：只有 Prompt 1 的 `network_research=true`；其余均为 `false`。
- 页面：弹窗只回放结果正文，不显示 runner、模型、input_mode、outcome、时间、SHA-256、review 或 limitations。
- 内容审核：全量自动检查，并按 10 类分层人工抽样 20 条；审核范围已逐条写入 `run.json`。

## 独立验收要求的修正

1. 补丁传输造成 99 份输出从 LF 变为 CRLF，导致 SHA-256 不匹配；已统一恢复 LF 并复验 100/100。
2. Prompt 2–100 的 `conversation_url` 原为 ChatGPT 首页；已改为真实批次对话深链，并要求验证器拒绝首页占位地址。
3. Prompt 1 及 10 份正文混入模型名或 `network_research`、`outcome` 等技术字段；已改为自然语言限制说明，并增加全量回归测试。
4. 10 条短预览被错误标为 `complete`；已将 Prompt 2–100 全部修正为 `partial`。
5. 部分执行时间晚于验收时钟；已统一为真实批次开始时间，并增加未来时间拒绝测试。
6. Prompt 90 在删除技术字段后短于 600 字；已补充与任务相关的群摘要规则并重算哈希。

## 已知限制

1. 本环境没有 WorkBuddy CLI、桌面进程、API Key、Agent ID 或 Runtime；这些记录是 ChatGPT GPT-5.6 Sol 的实际生成结果，不构成 WorkBuddy 真机或生产验收。
2. 依赖外部文件、客户资料或业务系统的任务使用小型合成输入，不能替代真实数据验证。
3. Prompt 2–100 未做实时外部事实查证；涉及市场、政策、法规、竞品或技术现状的内容只是效果预览。
4. 页面回放的是 Markdown 文本预览，没有生成 canonical `expected_output` 中列出的 `.xlsx`、`.docx`、`.pptx` 等完整附件。
5. Prompt 2–100 共用同一批次的 ChatGPT 工作模式对话深链，并非 99 个独立公开会话。
6. 根目录现有 `awesome-lint` 开发依赖链有 6 个 high 告警；本次没有新增依赖，也没有擅自降级该工具。
