# DSH / Cordis 术语表

## Plugin / Component

**论文事实：** Koishi 平时使用 **plugin** 这个术语；论文在形式化模型中把同一概念统一称为 **component**。论文第 5.3 节脚注 5 明确说明：Koishi 所说的 plugin，就是本文形式化为 component 的概念。

**本文理解：** 在这篇论文里，可以把 plugin 理解成 component（组件）的一种工程实例：

> **plugin ≈ 可动态插拔的功能组件**

这里的“插件”不特指 VS Code 扩展或第三方扩展商店里的插件，而是更泛化的功能单元：它可以被系统动态加载、卸载或替换；会对共享环境产生影响，也可能依赖其他组件。

例如，一个插件可能具有以下生命周期行为：

```text
加载时：
- 注册一个 HTTP 路由
- 注册事件监听器
- 打开数据库连接
- 提供一个 database service
- 依赖另一个 auth service

卸载时：
- 路由要撤掉
- listener 要撤掉
- 连接要关闭
- 提供的 service 要消失
- 依赖它的其他插件要跟着调整
```

这对应论文关心的两个维度：

```text
plugin 自己留下的副作用
→ temporal composability

plugin 和其他 plugin 的依赖关系
→ spatial composability
```

论文开头使用 VS Code 扩展，是为了帮助读者理解 plugin system 的问题场景；后面的 Cordis 模型则把这个场景抽象为更一般的 component。
