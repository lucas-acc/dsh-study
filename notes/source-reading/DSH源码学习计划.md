# DSH 源码学习计划：以会用、会排错、能简单扩展为目标

本计划是根目录 [DSH 学习路线：工程理解与内容表达](../../ROADMAP.md) 的源码学习支线。根路线负责论文概念、工程理解和内容表达；本计划只解决一个更具体的问题：如何通过有限范围的源码阅读，达到能够正确使用、排查和简单扩展 DeepSeek Harness（DSH）的程度。

## 一、源码事实基线

- 源码路径：`/Users/lucas/Desktop/my-projects/deepseek-harness`
- 本次分析基于提交：`0a53fb55be`
- 分析日期：2026-08-30
- 当前版本：`0.1.2-alpha.2`

DSH 当前包含约 251 个 workspace package，不适合按目录逐个阅读。对“用好 DSH”最重要的源码可以收敛为三条主线：

```text
dsh CLI → profile / bundle / patch → Cordis 插件树

用户输入 → agent loop → LLM → tool → session log

插件加载 → inject 依赖 → effect → disposer → 卸载或热替换
```

以下内容属于已经通过当前源码确认的事实：

- `dsh` 通过具名 profile 启动应用，profile 再按顺序叠加 bundle patch、profile patch、home patch 和命令行 `--patch`。
- Agent Loop、工具注册表、模型适配器、Session、Web UI 等能力都以 Cordis 插件进入配置树。
- Cordis Fiber 负责插件状态、依赖变化和 effect cleanup。
- Session Event Log 是模型历史、恢复、回放、持久化和 UI 投影的共同事实源。
- 扩展 DSH 时，通常应注册插件、工具、Provider 或事件监听器，而不是直接修改 Agent Loop。

## 二、最终掌握标准

完成本计划后，应能做到：

1. 使用 `--dump-config` 找到某项能力由哪个 profile、bundle 和插件提供。
2. 看到一个插件时，能说清它的 dependency、provision、effect 和 disposer。
3. 能解释 Provider 出现、消失或被替换时，Consumer 为什么会加载、卸载或重新加载。
4. 能从用户消息追踪到模型请求、工具执行、结果回填和下一步骤。
5. 能判断一项 Session Event 是否进入模型历史，还是只用于回放、UI 或生命周期记录。
6. 能编写并加载一个带配置、可卸载、可热替换的工具插件。
7. 遇到插件不工作时，能优先排查 patch、依赖、Fiber 状态、Provider 和凭据，而不是盲目修改 Core。

## 三、学习边界

### 必须掌握

- profile、bundle、patch 和插件树的关系。
- `Context`、`Service`、`inject`、`Fiber`、`effect`、disposer。
- Provider / Consumer 生命周期和 withdrawal ordering。
- Agent Turn、Step、LLM Request、Tool Call、Tool Result。
- Session Event Log 与 `deriveMessages()`。
- 工具注册、参数 schema、输出 schema、结果渲染。
- Service Definition / Service Provider / Consumer 三种角色。

### 暂时只知道用途

- Session persistence 与 projection cache。
- Sandbox、subprocess、terminal、LSP 的能力分层。
- Agent preset、subagent、workflow 和 SDK profile。
- Host / Client / Web UI 的 RPC 和模块系统。

### 暂时跳过

- Cordis 的完整形式化证明。
- Agent Loop 内部的复杂取消竞态和并行工具调度细节。
- Typert 生成器与完整类型图实现。
- Web UI 的组件、样式和国际化内部结构。
- SQLite packing、遥测、缓存和跨进程协议细节。
- 251 个 package 的逐包阅读。

只有在实际需求涉及这些部分时，再进入相应子系统。

## 四、推荐阅读方法

阅读一个 package 时统一采用以下顺序：

```text
README.zh.md
→ package.json 中的职责和依赖
→ src/index.ts 的公开入口
→ 一个最接近正常使用路径的测试
→ 只追踪当前问题涉及的实现函数
```

不要一开始就从大型 `index.ts` 第一行读到最后一行。每次阅读都先提出一个问题，例如：“工具是如何进入模型 schema 的？”只追踪能够回答该问题的代码。

每次源码阅读记录至少包含：

- 问题。
- 入口文件。
- 关键调用链。
- 源码事实。
- 尚未验证的推断。
- 是否需要实验。

## 五、八次学习安排

建议每次 1～2 小时，总计约 12～15 小时。每次必须产生一个可检查的结果，而不是只完成阅读。

### 第 1 次：建立应用组合地图

**目标：** 理解运行中的 DSH 是如何被组装出来的。

阅读：

1. `docs/architecture.zh.md`
2. `apps/cli/src/bin.ts`
3. `apps/cli/src/profile-boot.ts`
4. `packages/boot/app-boot/src/profile.ts`
5. `packages/bundle/base/cordis.patch.yml`
6. `packages/bundle/web-app/cordis.patch.yml`

运行：

```bash
pnpm dsh --help
pnpm dsh web --dump-default-config
pnpm dsh web --dump-config
```

只在配置树中定位以下条目：

- `tools`
- `system-prompt`
- `agent-loop`
- `llm-deepseek`
- 任意一个具体工具

**产出：** 一张简单关系图：

```text
dsh
→ web profile
→ dsh-base + dsh-web-app
→ patch 后的 Cordis entries
→ 实际插件树
```

**通过标准：** 能解释修改 `--patch` 与直接修改 Core 的区别。

### 第 2 次：理解 Cordis 插件、Context 和 Service

**目标：** 建立最小插件心智模型。

阅读：

1. `docs/cordis-tutorial/01-first-plugin.zh.md`
2. `docs/cordis-tutorial/03-services.zh.md`
3. `vendor/cordis/src/context.ts`
4. `vendor/cordis/src/service.ts`
5. `vendor/cordis/src/registry.ts`

实践：

- 编写一个最小函数插件。
- 编写一个提供 `greeter` service 的插件。
- 编写一个通过 `inject = ['greeter']` 使用它的 Consumer。
- 调换配置顺序，验证依赖而不是 YAML 顺序决定激活时机。

**产出：** `Context / Service / Provider / Consumer / inject` 的关系说明。

**通过标准：** 能解释为什么 `ctx` 不是普通的全局变量对象。

### 第 3 次：理解 effect、disposer 和响应式依赖

**目标：** 理解 Cordis 怎样完成插件卸载和依赖重连。

阅读：

1. `docs/cordis-tutorial/02-lifecycle-and-effects.zh.md`
2. `docs/cordis-tutorial/06-composition-and-hmr.zh.md`
3. `vendor/cordis/src/fiber.ts` 中的 `effect()`、`_refresh()`、`_setEpoch()`、`_unload()`
4. `vendor/cordis/src/reflect.ts` 中的 `provide()` 和 `notify()`

实践：

- 复用 `labs/001-effect-cleanup/`。
- 复用 `labs/002-provider-consumer-lifecycle/`。
- 记录 Provider、Consumer 的加载与 cleanup 顺序。
- 替换 Provider，观察 Consumer 是否重新加载。

**重点判断：**

```text
Provider 从服务注册表撤出
→ Consumer 依赖失效
→ Consumer 卸载并清理 effect
→ Provider 等待相关生命周期稳定
→ Provider 完成自己的后续 cleanup
```

**通过标准：** 能区分“Cordis 负责追踪 disposer”和“Cordis 能保证业务 disposer 一定正确”。

### 第 4 次：追踪一次 Agent Turn

**目标：** 看懂 DSH 最重要的正常执行路径。

阅读：

1. `docs/architecture.zh.md` 的“轮次流程”
2. `packages/core/agent-loop/src/agent.ts`
3. 重点函数：`kick()`、`preStep()`、`turn()`、`step()`、`buildRequest()`

只追踪正常成功路径：

```text
user message
→ inbox
→ turn/start
→ preStep
→ system prompt + tool schemas
→ agent/request
→ llm.stream
→ assistant/message
→ tool calls
→ 下一步或 turn/end
```

**产出：** 一张 Turn / Step 时序图，并标出哪些位置是插件扩展点。

**通过标准：** 能解释一个 Turn 为什么可能包含多个 Step。

### 第 5 次：理解 Session Event Log

**目标：** 理解“模型可见即已记录”。

阅读：

1. `packages/core/session/README.zh.md`
2. `packages/core/session/src/index.ts`
3. 重点函数：`Session.append()`、`requestHeader()`、`deriveMessages()`
4. `packages/core/session/src/surface.ts`

对照以下事件：

```text
turn/start
step/start
user/message
request/header
assistant/chunk
assistant/message
tool/call
tool/result
step/end
turn/end
```

分别判断：

- 是否进入模型历史。
- 是否只用于生命周期或 UI 回放。
- 是否属于可持久化事实。

**产出：** 一份“Session Event → 模型历史 / UI / 生命周期”对照表。

**通过标准：** 能解释为什么 `assistant/chunk` 会记录，但不会直接作为一条历史消息发送给下一次模型请求。

### 第 6 次：编写第一个模型工具

**目标：** 完成最常见的 DSH 扩展方式。

阅读：

1. `docs/user/develop/basic/index.zh.md`
2. `docs/user/develop/basic/tool.zh.md`
3. `docs/user/develop/basic/config.zh.md`
4. `packages/core/tools/src/index.ts` 中的 `register()` 与 `execute()`

实践：

- 编写函数式插件。
- 声明 `inject = ['tools']`。
- 使用 `defineTool()` 定义参数。
- 定义 `output.schema` 和 `output.render()`。
- 使用独立 patch 加载到 Web profile。
- 修改配置并观察 HMR。
- 禁用插件并确认工具消失。

**产出：** 一个可以在 Web UI 中被模型实际调用的最小工具。

**通过标准：** 能说明工具的规范返回值与最终呈现给模型的 Content Block 有什么区别。

### 第 7 次：理解一个完整 Capability Seam

**目标：** 理解 DSH 如何替换能力而不修改 Consumer。

选择 Web 能力作为案例：

```text
@deepseek-ai/dsh-web
  Service Definition 与 Provider registry

@deepseek-ai/dsh-web-fetch-http
  Service Provider

@deepseek-ai/dsh-tool-web
  Consumer 与面向模型的工具
```

阅读：

1. `packages/web/web/README.zh.md`
2. `packages/web/web/src/index.ts`
3. `packages/web/web-fetch-http/src/index.ts`
4. `packages/web/tool-web/src/index.ts`

实践：

- 在 base patch 中定位这三个角色。
- 通过 patch 禁用一个 Provider 或 Consumer。
- 观察“工具可见”“Provider 可用”和“工具执行成功”是三件不同的事。

**产出：** Web seam 的 Definition / Provider / Consumer 对照图。

**通过标准：** 能解释替换 Provider 时为什么通常不需要修改 `tool-web`。

### 第 8 次：综合小项目

**目标：** 用一个插件串起前七次学习内容。

建议实现一个简单的“DSH 学习助手”插件：

- 通过 Config 配置术语与解释。
- 注册一个 `dsh_concept` 工具。
- 注册一个事件监听器。
- 使用 `ctx.effect()` 管理一个需要手动清理的资源。
- 通过独立 patch 加载。
- 修改配置验证 HMR。
- 禁用插件，验证工具、监听器和资源全部消失。

实现后逐项回答：

```text
它依赖什么？
它提供什么？
它产生什么 effect？
每项 effect 的 disposer 是什么？
依赖消失时会发生什么？
哪些行为已经越过系统边界，不能真正撤销？
```

**通过标准：** 不修改 Agent Loop 或其他 Core package，即可完成插件的加载、使用、配置、替换和卸载。

## 六、常见问题的排查顺序

### 插件没有任何输出

1. patch 是否真正进入当前 profile。
2. 插件路径或包名是否能被 Loader 解析。
3. `inject` 声明的服务是否存在。
4. Fiber 是否因为缺少依赖而停在 `PENDING`。
5. 插件加载或 Config 校验是否失败。

### 工具没有出现在模型请求中

1. `tools` 服务是否存在。
2. 插件是否调用了 `ctx.tools.register()`。
3. 工具是否被 agent scope 或 restriction 屏蔽。
4. 当前 profile 是否禁用了该工具条目。
5. system prompt assembly 是否拿到了当前 agent 的工具视图。

### Web UI 能启动，但模型不能对话

分别确认：

- Web profile 已成功启动。
- 工作区已选择。
- 模型 Provider 已配置。
- 凭据存在且有效。
- agent/request 最终获得了 provider 和 model。

不能把“Web UI 已启动”等同于“模型调用已经可用”。

## 七、学习完成后的阅读策略

完成八次学习后，不再继续横向扫包。后续根据任务选择一条能力链：

```text
模型相关问题 → llm Service → Provider → agent/request
工具问题     → tools registry → policy events → concrete tool
文件问题     → fs Service → Provider → tool-fs
Shell 问题   → shell → subprocess / sandbox → tool-bash
会话问题     → session log → persistence / projection → UI consumer
子 Agent     → subagent seam → Provider → delegation tools
```

每次只读完整 seam 中与问题有关的 Definition、Provider 和 Consumer，不扩散到整个代码库。

## 八、完成检查表

- [ ] 我能画出 profile、bundle、patch 与插件树的关系。
- [ ] 我完成了 effect cleanup 实验。
- [ ] 我完成了 Provider / Consumer 生命周期实验。
- [ ] 我能画出一次 Agent Turn 的主执行链。
- [ ] 我完成了 Session Event 分类表。
- [ ] 我实现并运行了一个工具插件。
- [ ] 我能解释一个完整 capability seam。
- [ ] 我完成了综合插件，并验证其 HMR 与卸载行为。

全部完成后，即达到本计划定义的“足够用好 DSH”的源码理解程度。除非下一项实际需求要求，否则无需继续深入 Cordis 内核、Agent Loop 并发控制或全部 package 实现。
