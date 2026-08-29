# DSH 学习路线：工程理解与内容表达

这份路线来自一次围绕两个目标的问答整理：

1. 作为工程师，理解 DeepSeek Harness 的插件结构、依赖关系和生命周期。
2. 作为内容创作者，用普通人能理解的方式讲清 Cordis 解决的问题、方法和边界。

核心策略不是逐句读完论文，而是优先吃透与这两个目标直接相关的部分，再用实验和表达检验理解。

论文原文：[A Programming Paradigm for Spatiotemporal Composability](references/papers/A_Programming_Paradigm_for_Spatiotemporal_Composability.md)

> 本文是一份学习计划，不是已经验证完成的技术结论。涉及 DSH 具体实现的判断，需要经过源码、运行结果或官方文档验证后，才能进入 `handbook/`。

## 一、最终掌握目标

### 工程目标

看到一个 Harness 插件时，能够回答：

1. 它依赖哪些能力？
2. 它向系统提供哪些能力？
3. 它加载时产生哪些 effect？
4. 每个 effect 的 inverse 或 disposer 是什么？
5. Provider 出现、消失或被替换时，它的生命周期如何变化？
6. 哪些行为已经越过系统边界，不能真正撤销？

### 内容表达目标

能够用一个连续案例讲清：

- 为什么需要 Cordis。
- Temporal composability 和 spatial composability 分别解决什么问题。
- 插件为什么不能直接粗暴卸载。
- Cordis 能保证什么，以及不能保证什么。

最终应能用自己的话概括：

> Cordis 关注的不只是如何装入组件，而是如何在持续运行的系统里撤销一个组件的贡献，并让依赖它的组件有序退出或重新连接。

## 二、核心心智模型

论文把 Component 表示为 `(d, p, e)`：

```text
Component
= dependencies：从环境读取的依赖
+ provisions：向环境提供的能力
+ effects：激活时产生的效果，以及撤销这些效果的 inverse
```

围绕它理解两个方向：

```text
时间维度：组件移除后，能否只撤销它自己的贡献？
空间维度：依赖出现、消失或更换时，其他组件如何响应？
```

## 三、必须吃透的六个主题

### 1. 插件树

理解 Harness 中哪些能力由插件提供，以及替换能力与修改核心代码的区别。

待验证：模型适配器、工具、Skills、Session、Sandbox、Storage、Agent Loop、调度和 UI 在当前 DSH 中分别如何进入插件树。

### 2. Context

不要把 Context 只理解为全局变量容器。需要判断它是否同时承担：

- 服务发现与依赖访问。
- 组件的生命周期边界。
- effect 的登记与清理。
- Provider 与 Consumer 的关联。

### 3. Revertible effect

理解每个可撤销操作都需要对应的 inverse：

```text
注册工具     ↔ 注销工具
添加监听器   ↔ 删除监听器
启动定时器   ↔ 停止定时器
打开连接     ↔ 关闭连接
```

理解多个 inverse 为什么通常按 LIFO 顺序执行，并牢记运行时负责追踪、组合和调用 cleanup，不代表它能证明开发者写的 inverse 一定正确。

### 4. Reactive coeffect

把 coeffect 理解为组件从运行环境中声明需要的能力：

```text
依赖不满足 → 不激活
依赖出现   → 激活
依赖消失   → 退出
Provider 更换 → 重新解析并重新激活
```

源码阅读时重点对应 `service`、`inject`、Provider 和 Consumer 等概念。

### 5. 生命周期与 withdrawal ordering

Provider 的退出不能只是“先关闭资源，再通知消费者”。需要理解并验证如下顺序：

```text
Provider 停止对新消费者可用
→ Consumer 发现依赖失效
→ Consumer 完成 teardown
→ Provider 等待依赖者退出
→ Provider 最后撤销自己的 effect
```

重点观察 `INACTIVE`、`LOADING`、`ACTIVE`、`UNLOADING` 等状态，以及异步 transition 中依赖变化时的行为。

### 6. 系统边界

区分 acquisition 和 emission：

- 注册监听器、打开连接等内部资源通常可以通过 inverse 清理。
- 邮件、付款、外部写入和已经发送的网络数据通常不能真正倒放。
- 外部行为只能采用延迟提交、幂等设计或业务补偿，不能被描述为数学意义上的自动撤销。

## 四、论文阅读范围

### 精读

1. `1.1–1.3`：问题、两个维度与论文贡献。
2. `3.1` 开头：effect 为什么要携带 inverse。
3. `3.2` 开头及 `3.2.2`：依赖声明、满足条件和通知。
4. `3.3.3`：为什么作者将其视作 context paradigm。
5. `4.3.1 Withdrawal`：Provider 与 Consumer 的退出顺序。
6. `5.1.1–5.1.3`：effect tracking、coeffect operations 和 component lifecycle。
7. `6.1 System Boundary`：可撤销范围。
8. `Conclusion`：用自己的话复述整篇论文。

### 只记结论及成立条件

- Theorem 61 — Recovery exactness：只撤销目标组件的贡献，保留其他组件的独立贡献。
- Theorem 63 — Ordering：依赖满足后 Consumer 才能激活，并在 Provider 真正撤销前完成退出。
- Theorem 66 — Progress：在无环、有限等假设下，生命周期过程最终能够推进。
- Theorem 73 — Confluence：在独立性、无失败等假设下，相同最终配置应收敛到等价的稳定状态。

### 暂时跳过

- Monad、comonad 的形式化细节。
- 大部分代数证明和 operational semantics 推导。
- Observational equivalence 的细节。
- `4.4` 的证明过程。
- Related Work 的逐篇比较。

只有在准备修改 Cordis 内核或系统学习编程语言理论时，再回头补这些部分。

## 五、三个关键实验

### 实验 001：effect cleanup

建议目录：`labs/001-effect-cleanup/`

- [ ] 加载时注册一个工具。
- [ ] 添加一个事件监听器。
- [ ] 启动一个定时器。
- [ ] 卸载后验证三者全部消失。
- [ ] 记录 cleanup 的执行顺序。
- [ ] 制造一个错误 inverse，观察运行时能否发现。

### 实验 002：Provider / Consumer 生命周期

建议目录：`labs/002-provider-consumer-lifecycle/`

- [ ] A 提供 `greeter` service。
- [ ] B 声明依赖并使用 `greeter`。
- [ ] A 不存在时，验证 B 不激活。
- [ ] 加载 A，验证 B 自动激活。
- [ ] 卸载 A，验证 B 先退出、A 后清理。
- [ ] 加载 A2，验证 B 针对新 Provider 重新激活。

### 实验 003：替换能力而不修改 Core

建议目录：`labs/003-capability-replacement/`

- [ ] 查看实际插件配置树。
- [ ] 找到一个可替换的 Provider。
- [ ] 通过配置或插件替换它，而不是直接改 Harness Core。
- [ ] 记录替换前后的依赖解析和生命周期变化。

## 六、对外表达框架

统一使用一个案例，避免在多个技术系统之间跳转：

```text
Browser Plugin
    ↓ 提供 browser service
Research Plugin
    ↓ 依赖 browser service
Citation Plugin
```

用这个案例依次讲清加载、依赖满足、Provider 撤出、Consumer teardown 和新 Provider 接入。

### 公众版词典

| 论文概念 | 面向普通观众的说法 |
| --- | --- |
| Plugin / Component | 可以动态插拔的一项 Agent 能力 |
| Effect | 插件加载后给系统留下的痕迹 |
| Inverse / Disposer | 清理这些痕迹的方法 |
| Coeffect | 插件运行前需要别人提供的能力 |
| Context | 服务总线加生命周期账本 |
| Temporal composability | 插件能不能干净拔掉 |
| Spatial composability | 拔掉后依赖它的插件怎么办 |
| Reactive coeffect | 依赖出现就启动，依赖消失就退出 |

### 可拆成三个内容主题

1. 为什么在 Harness 中连 Agent Loop 都可能是可替换能力。
2. 为什么加载插件容易，安全卸载插件更难。
3. Agent 如何在持续运行时替换能力，以及这种机制距离“可靠自我进化”还有什么差距。

## 七、表达边界

避免以下过度表述：

- 不说“Cordis 可以撤销所有副作用”；只讨论系统边界内且存在正确 inverse 的 effect。
- 不说“Cordis 自动生成所有 cleanup”；它主要追踪和组合 cleanup，原子 inverse 仍需正确实现。
- 不说“论文证明 DSH 已经能够安全自我进化”；动态组合模型不等于成熟的自我进化系统。
- 不把生产采用案例说成受控实验或性能、效率上的定量优越性证明。

## 八、内容沉淀路径

```text
新材料
→ 判断属于“工程必读 / 只记结论 / 暂时跳过”
→ 写入 notes
→ 用 labs 验证关键判断
→ 将稳定理解整理到 handbook
→ 将最清晰的心智模型制作成 visuals
```

一项技术判断只有在能够指出论文依据、源码位置或实验结果后，才从学习笔记升级为 handbook 内容。
