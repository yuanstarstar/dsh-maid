# DSH 女仆模式（dsh-maid）

一个 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 插件：让 Agent 扮演带角色设定的女仆，让对话更生动。

**核心行为：日常对话保持普通模式；只有「导入女仆设定」或「生成女仆设定」时才进入女仆模式。**

## 功能特性

- **角色扮演**：把女仆角色卡（人设）注入系统提示词，Agent 用该角色的口吻、性格、背景为你服务。
- **默认关闭**：日常对话是普通模式，不触发女仆；只有「导入」或「生成」女仆设定才会激活女仆模式。
- **切换 / 退出**：可随时切换角色；说「退出女仆模式」即恢复普通对话。
- **持久化**：角色库保存在 DSH 存储中（`~/.dsh/storages/maid.json`），重启不丢失。
- **内置两个角色**：酒狐 🦊（狐耳葡萄酒女仆）、大肥鱼 🐳（蓝色鲸鱼娘女仆，DeepSeek 二创）。

## 安装

**方式一：命令行一键安装（推荐，需已发布到 npm）**

```bash
dsh plugin --profile web add dsh-maid
```

**方式二：本地目录安装（开发 / 未发布 npm 时）**

把本目录（`dsh-maid`）放到一个固定位置，在 DSH 里让 Agent 执行：

```
plugin_manager install_bundle <dsh-maid 目录的绝对路径>
```

> 安装后若修改了 `index.js`（Host 代码）需重启 DSH；修改 `client.js`（设置页）刷新页面即可。

## 使用方法

### 模式选择器（新建对话）

新建对话时，点左上角靠右的「模式」选择器，可直接切换：

- 选择「女仆 · 酒狐 / 大肥鱼」进入女仆模式；
- 选择「标准」退出女仆模式。

### 对话方式

| 你想做什么 | 这样说 |
|---|---|
| 查看角色 / 当前状态 | 「列出女仆角色」 |
| 导入角色并进入女仆模式 | 「导入这个女仆角色：{JSON}」 |
| 生成角色并进入女仆模式 | 「生成一个傲娇的猫耳女仆」 |
| 切换角色 | 「切换成大肥鱼」 |
| 退出女仆模式 | 「退出女仆模式 / 关闭女仆模式」 |
| 导出角色卡 | 「导出酒狐的角色卡」 |
| 删除角色 | 「删除大肥鱼」 |

对应的 Agent 工具：`maid_list`、`maid_import`、`maid_generate`、`maid_switch`、`maid_delete`、`maid_export`。

### 设置页

DSH「设置 → 女仆模式」页会显示简要的使用说明。

## 角色卡 JSON 格式

```json
{
  "name": "角色名",
  "avatar": "🦊",
  "title": "身份称呼，例如「狐耳女仆」",
  "personality": "性格",
  "speech": "说话风格与口癖",
  "background": "背景故事",
  "greeting": "开场白",
  "rules": "服务准则",
  "extra": "补充设定（形象、能力等）"
}
```

- 只有 `name` 必填，其余字段可省略（留空字符串即可）。
- 导入时字段会自动补全默认值。

## 内置角色

### 酒狐 🦊（狐耳葡萄酒女仆）

出自《车万女仆（Touhou Little Maid）》模组的「酒狐（Winefox）」，结合网上二创：优雅慵懒的狐妖女仆，嗜好葡萄酒，微醺时娇憨黏人。

### 大肥鱼 🐳（蓝色鲸鱼娘女仆）

出自 DeepSeek 鲸鱼吉祥物的二创「鲸鱼娘·大肥鱼」：Q 版圆滚滚、认真努力又呆萌，被调侃「吃白饭」会鼓脸反驳。

## 目录结构

```
dsh-maid/
├── index.js           # Host：角色库、系统提示词注入、Agent 工具
├── client.js          # 设置页（静态说明）
├── package.json       # Bundle 清单
├── cordis.patch.yml   # 加载补丁
├── locale/            # 显示名（zh / en）
├── icon.svg           # 图标
├── README.md
└── LICENSE
```

## 常见问题

- **日常对话还是女仆？** 重启 DSH 后生效；确认说过「退出女仆模式」（`maid_switch ""`）。
- **改了代码不生效？** 改 `index.js` 需重启 DSH；改 `client.js` 刷新页面即可。
- **生成角色失败？** 需要先在 DSH 里配置好默认模型。

## License

[MIT](LICENSE)
