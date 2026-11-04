# dsh-voice-hotkey

为 DeepSeek Harness (DSH) 内置的语音输入插件补充可自定义的键盘快捷键。

Adds a rebindable keyboard shortcut for DSH's built-in voice input: press once to start recording, press again to stop and transcribe. Recording, transcription, and draft insertion stay inside the official voice-input plugin; this bundle only owns the key.

## 键位

| 平台 | 默认键 |
| --- | --- |
| Web · Windows | `Ctrl+Alt+V` |
| Web · macOS | `Cmd+Shift+V` |
| Web · Linux | `Ctrl+Shift+Comma`（协议仅放行三种组合） |

改键走 DSH 自带入口：**设置 → 快捷键**，搜索"语音输入"。

## 原理

注册一条 DSH 可编辑快捷键命令 `voice.input.record`，触发时在 DOM 中定位官方语音输入控件并点击：

1. 录音行 `data-voice-activity="recording"` → 点"停止并识别"；
2. 反馈行 → 点"重新录音"；
3. 空闲态 → 点麦克风按钮（`triggerAnchor` 包裹类 → `voice-input` 命名空间 aria-label 兜底）。

不 fork 官方插件、无第三方依赖、无网络请求；官方插件升级若改动控件钩子，只需更新 `client.js` 中的查找函数。

## 安装

在 DSH 会话中让 Agent 执行（或在插件管理器使用对应 spec）：

```
plugin_manager install_bundle
target: git+https://github.com/eddiedon/dsh-voice-hotkey.git
```

## 约束与教训（移植自 2026-11-03 排障实录）

- `ctx.shortcuts.register` 会校验全部 6 个 `runtime:platform` 档位的 `defaults`，与当前设备无关。web:linux 仅放行 Ctrl+Slash / Ctrl+Shift+Comma / Ctrl+Shift+Period，且 Space 属保留键——非法档位会让插件在所有平台激活失败（浏览器启动卡报 entry failed）。
- 校验方法：node 直接 import `@deepseek-ai/dsh-client-shortcuts/lib/protocol.js` 跑 `bindingIssue` / `isWebBindingAllowed`（纯 JS 无 DOM 依赖）。
- 网页端单修饰键（两键组合）仅放行 Ctrl+反引号 / Ctrl+逗号 / Ctrl+反斜杠 / Ctrl+Slash；Shift 或 Alt 单独作修饰键被拒（打字保护）。
- 本机（Windows）实测：含 Space 的修饰键组合被系统/输入法层整类截走，页面收不到 keydown；换键前先按一次验证"系统肯放行"。

## 更新流程

修改代码 → push 到本仓库 → DSH 会话中重新 `install_bundle` → 重启 `dsh web`（已安装包的替换需要重启才能加载新模块代；首次安装无需重启）。

## 卸载

插件页禁用 bundle，或让 Agent 执行 `remove_bundle`。宿主 profile 的依赖与 bundles 列表由 plugin_manager 维护，不手工编辑。
