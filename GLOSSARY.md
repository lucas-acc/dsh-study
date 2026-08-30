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

## Effect / Coeffect

> 注意：论文中的术语是 **effect** 和 **coeffect**，不是 effort 和 coeffort。

**论文事实：** Effect 和 coeffect 从两个互补方向描述计算与环境的关系：

- **Effect（效应）**描述计算会如何修改环境，例如改变共享状态、注册服务或添加事件监听器。
- **Coeffect（共效应）**描述计算需要环境提供什么，例如需要访问的资源、需要持有的权限或依赖的服务。

可以简记为：

```text
Effect：组件对环境做了什么。
Coeffect：组件需要环境提供什么。
```

论文把经典的静态 effect / coeffect 概念提升为两种运行时机制：

- **Revertible Effect（可逆效应）**：组件修改环境时提供相应的逆操作，由运行时跟踪并组合这些逆操作；组件卸载时，运行时据此恢复环境。这支撑 **temporal composability（时间可组合性）**。
- **Reactive Coeffect（响应式共效应）**：组件声明自己的依赖；环境变化时，运行时重新判断依赖是否满足，并据此激活、停用组件或保持不变。这支撑 **spatial composability（空间可组合性）**。

**本文理解：** 假设插件 A 提供 `database` 服务，插件 B 依赖该服务：

```text
插件 A 加载：
- 向共享 Context 注册 database
- 这是 A 对环境产生的 effect
- 对应的逆操作是注销 database

插件 B：
- 声明自己需要 database
- 这是 B 的 coeffect

database 出现：
- B 的依赖得到满足，B 可以激活

插件 A 卸载：
- 运行时执行逆操作，注销 database
- B 的依赖不再满足，B 随之停用
```

因此，effect 和 coeffect 不是两个彼此孤立的机制：前者管理组件造成的环境变化及其撤销，后者管理组件对环境的依赖及其响应。论文还指出，对 coeffect context 进行依赖注册或撤销，本身也是一种 effect，因此可以复用同一套跟踪和恢复机制。
