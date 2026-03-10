# 支持 Telegram Markdown 格式化消息

## 背景

当前 code-agent-connect 发送到 Telegram 的所有消息均为纯文本。Agent（Claude、Codex 等）的响应通常包含 markdown 格式（代码块、加粗、链接等），在 Telegram 中会显示为原始标记符号，可读性差。需要将 markdown 转换为 Telegram 支持的 HTML 格式后发送。

## 方案

使用 Telegram 的 `parse_mode: "HTML"` 模式，在发送前将 markdown 转换为 Telegram 安全的 HTML。选择 HTML 而非 MarkdownV2 的原因：HTML 转义更简单可靠，不需要处理 MarkdownV2 复杂的特殊字符转义。

## 具体改动

### 1. 新建 `src/markdown.mjs` — Markdown 转 HTML 转换器

核心函数 `markdownToTelegramHtml(text)`，处理步骤：

1. 提取三反引号代码块，用占位符保护（避免内部内容被后续处理）
2. 提取单反引号行内代码，用占位符保护
3. 提取 Markdown 表格，用占位符保护（Telegram 不支持 HTML 表格标签）
4. 去除 `#` 标题标记（保留文本）
5. 去除 `>` 引用标记（保留文本）
6. 转义 HTML 实体（`&` → `&amp;`、`<` → `&lt;`、`>` → `&gt;`）
7. 转换链接 `[文本](url)` → `<a href="url">文本</a>`
8. 转换加粗 `**文本**` / `__文本__` → `<b>文本</b>`
9. 转换斜体 `_文本_` → `<i>文本</i>`（排除变量名中的下划线）
10. 转换删除线 `~~文本~~` → `<s>文本</s>`
11. 转换列表 `- 项目` / `* 项目` → `• 项目`
12. 还原行内代码 → `<code>转义后的内容</code>`
13. 还原代码块 → `<pre><code>转义后的内容</code></pre>`
14. 还原表格 → `<pre>列对齐的纯文本</pre>`（去除 `|` 边框和 `---` 分隔行，列宽自动对齐）

### 2. 修改 `src/telegram-client.mjs` — 支持 parse_mode 参数

`sendMessage()` 增加可选的 `parseMode` 参数，传递给 Telegram API：

```js
async sendMessage(chatId, text, { parseMode } = {}) {
  // ... 现有校验逻辑 ...
  return this.call('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(parseMode && { parse_mode: parseMode }),
  });
}
```

### 3. 修改 `src/bridge-service.mjs` — 发送前格式化，失败时回退纯文本

```js
async sendText(chatId, text) {
  for (const chunk of chunkText(text, 3500)) {
    const html = markdownToTelegramHtml(chunk);
    try {
      await this.telegram.sendMessage(chatId, html, { parseMode: 'HTML' });
    } catch {
      await this.telegram.sendMessage(chatId, chunk);
    }
  }
}
```

### 4. 新增测试 `test/markdown.test.mjs`

覆盖场景：代码块、行内代码、加粗、斜体、删除线、链接、标题、引用、列表、表格、HTML 转义、混合格式、空输入、嵌套格式等。

## 涉及文件

| 操作 | 文件 |
|------|------|
| 新建 | `src/markdown.mjs` |
| 新建 | `test/markdown.test.mjs` |
| 修改 | `src/telegram-client.mjs`（添加 parseMode 参数） |
| 修改 | `src/bridge-service.mjs`（引入转换器 + 回退逻辑） |

## 验证方式

1. 运行 `node --test` 确保所有测试通过
2. 启动服务 `node src/cli.mjs serve`，发送会产生 markdown 输出的消息
3. 确认代码块、加粗、链接等在 Telegram 中正确渲染
4. 确认 HTML 解析失败时消息仍以纯文本形式送达
