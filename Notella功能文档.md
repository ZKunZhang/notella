# Notella 项目功能文档

## 一、项目概述

### 1.1 应用定位
Notella 是一个现代化的全栈笔记应用，专注于提供简洁高效的笔记管理体验。应用支持 Markdown 语法，面向需要快速记录和组织想法的个人用户。

### 1.2 核心价值
- **安全性**：基于 JWT 的用户认证系统，确保笔记数据私密性
- **便捷性**：支持实时自动保存，无需手动操作
- **灵活性**：Markdown 编辑与预览模式自由切换
- **美观性**：响应式设计，支持明暗双主题，适配移动端和桌面端

### 1.3 技术栈说明

**前端技术：**
- Next.js 12.2.3 - React 框架，提供 SSR 和路由功能
- React 18.2.0 - UI 组件库
- TailwindCSS 3.1.7 - 原子化 CSS 框架
- react-markdown 8.0.3 - Markdown 渲染引擎
- remark-gfm 3.0.1 - GitHub 风格 Markdown 扩展支持
- react-hook-form 7.34.0 - 表单状态管理
- react-hot-toast 2.3.0 - 消息提示组件

**后端技术：**
- MongoDB + Mongoose 6.5.0 - NoSQL 数据库及 ODM
- JWT (jsonwebtoken 8.5.1) - 无状态身份认证
- bcrypt 5.0.1 - 密码加密

**工具库：**
- nanoid 4.0.0 - 唯一 ID 生成器
- axios 0.27.2 - HTTP 客户端
- adm-zip 0.5.9 - ZIP 文件处理（可能用于导出功能）

---

## 二、核心功能模块

### 2.1 用户认证模块

#### 2.1.1 用户注册
**功能描述：**
新用户通过邮箱和密码创建账户。

**操作流程：**
1. 访问 `/register` 页面
2. 填写邮箱和密码（密码需至少 8 位）
3. 提交表单后进行验证
4. 验证通过后创建账户，自动生成包含使用说明的欢迎笔记

**技术实现：**
- 前端：`components/forms/RegisterForm.js` 使用 react-hook-form 处理表单
- 后端：`database/middleware/register/index.js`
  - 邮箱格式验证（正则表达式：`/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/`）
  - 密码长度验证（≥8 字符）
  - 邮箱唯一性检查
  - 密码使用 bcrypt 进行 hash（salt rounds: 10）
  - 创建账户时自动添加 README 笔记到 notes 数组

**数据流：**
```
RegisterForm → POST /api/register → registerAccount中间件 →
MongoDB Account.create() → 返回成功消息
```

#### 2.1.2 用户登录
**功能描述：**
已注册用户通过邮箱和密码登录系统。

**操作流程：**
1. 访问 `/login` 页面
2. 输入邮箱和密码
3. 提交后验证凭据
4. 成功后跳转到主页（`/`）

**技术实现：**
- 前端：`components/forms/LoginForm.js`
- 后端：`database/middleware/authentication/login/index.js`
  - 验证邮箱格式和密码长度
  - 通过 bcrypt.compare() 比对加密密码
  - 生成 JWT token（有效期 24 小时）
    - Claims: `{ sub: "logged", userId: user._id }`
    - 使用环境变量 `ACCESS_TOKEN_SECRET` 签名
  - 设置 HttpOnly Cookie（安全配置）
    - `httpOnly: true` - 防止 XSS 攻击
    - `secure: true` - 仅 HTTPS 传输
    - `sameSite: "strict"` - 防止 CSRF 攻击
    - `maxAge: 86400` - 24 小时过期

**安全特性：**
- 密码不以明文存储或传输
- Token 存储在 HttpOnly Cookie 中，前端 JS 无法访问
- 严格的 Cookie 策略防止跨站攻击

#### 2.1.3 用户登出
**功能描述：**
清除用户会话，退出登录状态。

**操作流程：**
1. 在主操作菜单点击"登出"按钮
2. 清除本地存储（包括主题偏好）
3. 跳转到登录页

**技术实现：**
- 前端：`components/MainActionsMenu.js` 中的 logout 函数
- 后端：`database/middleware/authentication/logout/index.js`
  - 通过设置 Cookie maxAge=0 使 token 失效
  - DELETE /api/auth/logout

#### 2.1.4 身份验证中间件
**技术实现：**
- 文件：`database/middleware/authentication/token/index.js`
- 功能：`verifyToken(req, res, next)`
  - 解析请求中的 Cookie
  - 验证 JWT token 有效性
  - 提取 userId 并传递给后续处理函数
  - 验证失败返回 403 状态码

**应用场景：**
所有需要认证的 API 路由都通过此中间件保护：
- GET/PUT `/api/account/notes` - 笔记数据
- PUT `/api/account/email` - 更新邮箱
- PUT `/api/account/password` - 更新密码

---

### 2.2 笔记管理模块

#### 2.2.1 数据模型
**Account Schema (database/models/account.js):**
```javascript
{
  email: String (required, unique),
  password: String (required, hashed),
  createdAt: String,
  notes: Array,           // 活跃笔记
  trashedNotes: Array    // 回收站笔记
}
```

**Note 对象结构:**
```javascript
{
  id: String (nanoid),
  title: String,
  body: String (支持 Markdown 语法)
}
```

#### 2.2.2 创建笔记
**功能描述：**
快速创建新笔记，自动生成默认标题和内容。

**操作流程：**
1. 点击主操作菜单中的"添加笔记"按钮（日记+图标）
2. 系统自动创建新笔记并置于笔记列表顶部
3. 自动选中新笔记进入编辑模式

**技术实现：**
- 前端：`context/NotesContext.js` 的 `addNewNote()` 函数
  - 使用 nanoid 生成唯一 ID
  - 默认标题："Untitled note"
  - 默认内容："Content goes here"
  - 新笔记插入数组头部（最新笔记在最上方）
  - 如果当前在回收站视图，自动切换回普通视图

**数据流：**
```
用户点击 → addNewNote() → setUserNotes([newNote, ...userNotes]) →
useEffect 监听变化 → 1秒防抖后 → PUT /api/account/notes → 更新数据库
```

#### 2.2.3 编辑笔记
**功能描述：**
实时编辑笔记标题和内容，支持 Markdown 和纯文本两种模式。

**操作流程：**
1. 在笔记列表中点击目标笔记
2. 右侧预览区域显示笔记详情
3. 点击"编辑"按钮（铅笔图标）切换到编辑模式
4. 修改标题或内容
5. 更改会自动保存（1 秒防抖）

**界面元素：**
- **标题输入框**：顶部横向输入框，单行文本
- **内容编辑区**：多行 textarea，支持任意长度文本
- **模式切换按钮**：
  - Markdown 预览模式：显示铅笔图标，点击切换为编辑模式
  - 编辑模式：显示 Markdown 图标，点击切换为预览模式

**技术实现：**
- 前端：`components/NotePreviewer.js`
  - 标题和内容通过受控组件绑定状态
  - `handleOnChangeCurrentEditingNote(e, id)` 处理输入变化
  - 使用 ReactMarkdown 组件渲染 Markdown
    - 插件：remarkGfm（支持 GFM 扩展语法）
    - 样式：@tailwindcss/typography 的 prose 类
- 自动保存机制：`context/NotesContext.js`
  - useEffect 监听 userNotes 变化
  - setTimeout 1 秒防抖
  - axios PUT 请求到 `/api/account/notes`

**响应式行为：**
- 移动端（< 1024px）：点击笔记后隐藏侧边栏，全屏编辑
- 桌面端（≥ 1024px）：侧边栏和编辑区并排显示

#### 2.2.4 删除笔记（移至回收站）
**功能描述：**
将笔记移至回收站，支持后续恢复。

**操作流程：**
1. 选中要删除的笔记
2. 点击编辑区顶部的垃圾桶图标
3. 笔记立即从普通列表移除，转移到 trashedNotes 数组
4. 编辑区自动关闭（currentEditingNote 设为 null）

**技术实现：**
- 前端：`context/NotesContext.js` 的 `handleDeleteCurrentEditingNote()`
  - 从 userNotes 中移除目标笔记
  - 将笔记追加到 userTrashedNotes
  - 自动触发服务器同步

**数据持久化：**
- 后端：PUT `/api/account/notes` 同时更新 notes 和 trashedNotes 字段

#### 2.2.5 查看回收站
**功能描述：**
浏览已删除的笔记，支持恢复或永久删除。

**操作流程：**
1. 点击主操作菜单的垃圾桶图标
2. 笔记列表切换为回收站视图（标题显示 "Trashed Notes"）
3. 垃圾桶图标高亮显示（填充样式）
4. 点击回收站中的笔记查看内容

**界面特点：**
- 回收站笔记为只读状态，无法编辑
- 可切换 Markdown 预览和纯文本查看
- 提供两个操作按钮：
  - **恢复按钮**（逆时针箭头）：移回普通笔记列表
  - **永久删除按钮**（带 X 的圆圈）：彻底删除笔记

**技术实现：**
- 状态切换：`setViewTrashedNotes(true/false)`
- 笔记显示逻辑根据 viewTrashedNotes 状态动态渲染

#### 2.2.6 恢复笔记
**功能描述：**
将回收站中的笔记恢复到正常列表。

**操作流程：**
1. 在回收站视图中选中笔记
2. 点击恢复按钮
3. 笔记从 trashedNotes 移回 notes 数组

**技术实现：**
- 函数：`handleRemoveNoteFromTrash(id)`
  - 从 userTrashedNotes 中移除笔记
  - 追加到 userNotes 末尾
  - 清空当前编辑状态

#### 2.2.7 永久删除笔记
**功能描述：**
从数据库中彻底删除笔记，不可恢复。

**操作流程：**
1. 在回收站视图中选中笔记
2. 点击永久删除按钮
3. 笔记从 trashedNotes 数组中移除

**技术实现：**
- 函数：`handleDeleteNoteFromTrash()`
  - 根据 ID 定位笔记
  - 使用 splice 从数组中移除
  - 同步更新到数据库

**不可逆性：**
删除后无法通过应用界面恢复，数据完全从 MongoDB 中移除。

#### 2.2.8 搜索笔记
**功能描述：**
根据标题关键词筛选笔记。

**操作流程：**
1. 在笔记列表顶部输入框中输入关键词
2. 列表实时过滤显示匹配结果
3. 清空输入框显示全部笔记

**技术实现：**
- 组件：`components/Recipient.js`
- 搜索逻辑：`context/NotesContext.js`
  - useEffect 监听 searchValue 变化
  - 匹配算法：完全匹配或部分包含（`title === searchValue || title.includes(searchValue)`）
  - 分别支持普通笔记和回收站笔记搜索
  - 结果存储在 filteredNotes 状态

**搜索范围：**
- 仅搜索笔记标题，不包含正文内容
- 区分大小写

#### 2.2.9 获取笔记数据
**API 端点：** GET `/api/account/notes`

**技术实现：**
- 中间件：`database/middleware/account/notes/index.js` 的 `getAccountNotes()`
- 需通过 verifyToken 中间件验证身份
- 返回数据：`{ notes: [], trashedNotes: [] }`

#### 2.2.10 更新笔记数据
**API 端点：** PUT `/api/account/notes`

**请求体：**
```javascript
{
  notes: Array,
  trashedNotes: Array
}
```

**技术实现：**
- 中间件：`updateAccountNotes(req, res, userId)`
- 使用 `findOneAndUpdate` 原子性更新两个字段
- 返回更新后的最新数据

**自动保存机制：**
- 前端监听 userNotes 和 userTrashedNotes 变化
- 1 秒防抖延迟
- 自动发送 PUT 请求
- 保存成功后显示提示（通过 updatedNotes 状态控制）

---

### 2.3 Markdown 支持模块

#### 2.3.1 Markdown 渲染
**技术实现：**
- 核心库：react-markdown 8.0.3
- 插件：remark-gfm 3.0.1
- 样式：@tailwindcss/typography

**支持的 Markdown 语法：**

**基础语法：**
- 标题：# H1 ~ ###### H6
- 粗体：**text** 或 __text__
- 斜体：*text* 或 _text_
- 删除线：~~text~~
- 引用：> quote
- 代码块：```language ... ```
- 行内代码：`code`
- 链接：[text](url)
- 图片：![alt](url)
- 无序列表：- / * / +
- 有序列表：1. 2. 3.
- 分隔线：--- / *** / ___

**GFM 扩展语法（通过 remark-gfm）：**
- 表格：| 列1 | 列2 |
- 任务列表：- [ ] / - [x]
- 自动链接：http://example.com
- 删除线：~~deleted~~

**代码高亮：**
- 支持语言标识，但未集成语法高亮库（基础样式由 Tailwind Typography 提供）

#### 2.3.2 编辑与预览模式切换
**视图模式：**
1. **Markdown 预览模式（默认）：**
   - 渲染后的富文本显示
   - 标题和内容均为只读
   - 按钮图标：铅笔（表示可切换为编辑）

2. **编辑模式：**
   - 纯文本 textarea
   - 可编辑标题和内容
   - 实时保存修改
   - 按钮图标：Markdown 标志（表示可切换为预览）

**技术实现：**
- 状态：`viewAsMarkdown` (boolean)
- 切换函数：`setViewAsMarkdown(!viewAsMarkdown)`
- 条件渲染：
  - true：`<ReactMarkdown>` 组件
  - false：`<textarea>` 元素

**特殊限制：**
- 回收站笔记：默认预览模式，可切换查看纯文本，但无法编辑

#### 2.3.3 样式主题
**明亮模式：**
- Tailwind Typography 类：`prose prose-stone`
- 适合白天阅读

**暗黑模式：**
- Tailwind Typography 类：`prose prose-invert`
- 自动反转颜色，保持可读性

---

### 2.4 账户设置模块

#### 2.4.1 修改邮箱
**功能描述：**
用户可更新账户邮箱地址。

**操作流程：**
1. 访问设置页面（`/settings`）
2. 选择 Email 标签
3. 填写新邮箱和确认邮箱
4. 提交表单

**验证规则：**
- 新邮箱必填
- 确认邮箱必填
- 两次输入必须一致
- 邮箱格式必须合法
- 新邮箱不能与其他账户重复

**技术实现：**
- 前端表单：`components/forms/UpdateAccountEmailForm.js`
- 后端中间件：`database/middleware/account/email/index.js`
  - API：PUT `/api/account/email`
  - 需通过 verifyToken 验证
  - 使用 `findOneAndUpdate` 更新邮箱字段

**错误处理：**
- 邮箱已存在：400 "Already exists an account with that email."
- 格式错误：400 "Invalid email."
- 不匹配：400 "Confirm email dont match with new email."

#### 2.4.2 修改密码
**功能描述：**
用户可更新账户密码。

**操作流程：**
1. 访问设置页面
2. 选择 Password 标签
3. 填写旧密码、新密码和确认新密码
4. 提交表单

**验证规则：**
- 旧密码必填且必须正确
- 新密码必填
- 确认新密码必填
- 新密码和确认密码必须一致

**技术实现：**
- 前端表单：`components/forms/UpdateAccountPasswordForm.js`
- 后端中间件：`database/middleware/account/password/index.js`
  - API：PUT `/api/account/password`
  - 验证流程：
    1. bcrypt.compare() 验证旧密码
    2. bcrypt.hash() 加密新密码（salt rounds: 10）
    3. findOneAndUpdate() 更新密码字段

**安全性：**
- 旧密码验证防止未授权修改
- 新密码同样使用 bcrypt 加密存储

#### 2.4.3 设置页面结构
**页面路由：** `/settings`

**访问控制：**
- 需登录状态（通过 getServerSideProps 验证 JWT）
- 未登录自动重定向到 `/login`

**界面布局：**
- 顶部标签切换器（Email / Password）
- 中部表单区域（根据选中标签动态显示）
- 底部"返回笔记"链接

**状态反馈：**
- 使用 ResponseContext 和 ResponseStatusBox 组件
- 显示成功或错误消息
- 表单使用 react-hook-form 进行验证和状态管理

---

### 2.5 界面交互模块

#### 2.5.1 主操作菜单
**位置：** 应用顶部横向工具栏

**功能按钮（从左到右）：**
1. **登出** - 退出当前账户
2. **添加笔记** - 创建新笔记
3. **回收站** - 切换回收站视图（选中时图标填充）
4. **主题切换** - 切换明暗模式（月亮/太阳图标）
5. **设置** - 进入账户设置页面
6. **菜单切换**（仅移动端）- 显示/隐藏侧边栏

**技术实现：**
- 组件：`components/MainActionsMenu.js`
- 使用 useContext 获取 NotesContext 和 LayoutContext 的状态和方法
- 按钮样式根据 darkMode 状态动态调整

#### 2.5.2 笔记列表（Recipient）
**布局：** 左侧边栏（移动端可隐藏）

**功能元素：**
1. **顶部标题**：
   - 普通模式："All Notes"
   - 回收站模式："Trashed Notes"

2. **搜索框**：
   - 占位符："Search by title..."
   - 实时过滤笔记列表

3. **笔记项列表**：
   - 显示笔记标题
   - 点击选中并在右侧显示详情
   - 空状态提示："No notes found." 或 "No trashed notes found."

**技术实现：**
- 组件：`components/Recipient.js`
- 笔记项组件：`components/NoteInRecipient.js`
- 列表内容来自 filteredNotes 状态

#### 2.5.3 笔记预览/编辑区
**布局：** 右侧主区域

**空状态：**
- 未选中笔记时显示 Notella Logo（`components/NotellaEmblem.js`）

**编辑状态：**
- **顶栏**：
  - 左侧：菜单按钮（移动端）+ 标题输入框
  - 右侧：删除/恢复按钮 + 永久删除按钮（回收站） + 模式切换按钮

- **内容区**：
  - Markdown 预览：渲染后的富文本
  - 编辑模式：全屏 textarea

**技术实现：**
- 组件：`components/NotePreviewer.js`
- 使用 ReactMarkdown 渲染 Markdown
- 条件渲染根据 viewAsMarkdown 和 viewTrashedNotes 状态

#### 2.5.4 主题系统
**主题模式：**
1. **明亮模式（Light Mode）：**
   - 背景：白色
   - 文本：深色
   - 边框：灰色（border-gray-300）

2. **暗黑模式（Dark Mode）：**
   - 背景：深灰（bg-gray-800）
   - 文本：白色
   - 边框：深灰（border-gray-700）

**持久化存储：**
- 使用 localStorage 保存主题偏好
- 键名：`darkMode`
- 值：`"true"` 或 `"false"`

**技术实现：**
- 上下文：`context/LayoutContext.js`
- 状态：`darkMode` (boolean)
- 切换函数：`handleClickChangeDarkMode()`
- 初始化时从 localStorage 读取
- 登出时清除（避免影响下一个用户）

**应用范围：**
- 全局背景色
- 所有组件的文本和边框颜色
- Markdown 渲染样式（prose/prose-invert）

#### 2.5.5 响应式布局
**断点：** 1024px (Tailwind 的 `lg` 断点)

**桌面端（≥ 1024px）：**
- 笔记列表和编辑区并排显示
- 主操作菜单无菜单切换按钮
- 编辑区顶栏无菜单按钮

**移动端（< 1024px）：**
- 侧边栏可通过菜单按钮切换显示/隐藏
- 点击笔记后自动隐藏侧边栏，全屏编辑
- 主操作菜单显示菜单切换按钮
- 编辑区顶栏显示菜单按钮

**技术实现：**
- 上下文：`context/LayoutContext.js`
- 状态：
  - `windowWidth` - 通过 window.innerWidth 实时获取
  - `panelIsActive` - 控制侧边栏显示状态
- useEffect 监听窗口大小变化
- 条件渲染根据 windowWidth 判断

#### 2.5.6 消息通知
**通知库：** react-hot-toast 2.3.0

**使用场景：**
- 笔记自动保存成功提示
- 账户设置更新成功/失败提示
- 登录/登出状态反馈

**技术实现：**
- 自动保存提示：通过 updatedNotes 状态控制，2.5 秒后自动消失
- 设置页面反馈：通过 ResponseContext 管理状态码和消息
- ResponseStatusBox 组件统一显示消息

---

## 三、功能交互逻辑

### 3.1 用户注册到首次使用流程

1. **访问注册页面** (`/register`)
   - 用户输入邮箱和密码

2. **提交注册表单**
   - 前端验证：react-hook-form 检查必填项
   - 后端验证：邮箱格式、密码长度、邮箱唯一性
   - 密码加密：bcrypt hash（10 rounds）

3. **账户创建成功**
   - MongoDB 创建 Account 文档
   - 自动添加欢迎笔记（README）到 notes 数组
   - 返回成功消息

4. **跳转登录页面** (`/login`)
   - 用户输入刚注册的凭据

5. **登录成功**
   - 生成 JWT token（24 小时有效）
   - 设置 HttpOnly Cookie
   - 重定向到主页 (`/`)

6. **首页加载**
   - getServerSideProps 验证 JWT token
   - 从 MongoDB 获取用户的 notes 和 trashedNotes
   - 初始化 NotesProvider 和 LayoutProvider

7. **界面渲染**
   - 显示主操作菜单
   - 左侧笔记列表显示欢迎笔记
   - 右侧显示 Notella Logo（未选中状态）

8. **查看欢迎笔记**
   - 点击"Readme"笔记
   - 右侧以 Markdown 预览模式显示使用说明
   - 用户可通过说明了解应用功能

### 3.2 创建和编辑笔记流程

1. **创建新笔记**
   - 点击主操作菜单的"添加笔记"按钮
   - 前端立即生成新笔记对象（nanoid ID）
   - 笔记插入到 userNotes 数组头部
   - 列表顶部显示"Untitled note"

2. **自动选中新笔记**
   - setCurrentEditingNote(newNote)
   - 右侧编辑区显示新笔记
   - 默认为 Markdown 预览模式

3. **切换到编辑模式**
   - 点击铅笔图标
   - setViewAsMarkdown(false)
   - 显示标题和内容输入框

4. **编辑标题**
   - 在顶部输入框输入新标题
   - onChange 触发 handleOnChangeCurrentEditingNote
   - 更新 currentEditingNote 和 userNotes 数组中的对应项

5. **编辑内容**
   - 在 textarea 中输入 Markdown 文本
   - 同样触发 handleOnChangeCurrentEditingNote
   - 实时更新状态

6. **自动保存机制**
   - useEffect 监听到 userNotes 变化
   - setTimeout 1000ms 防抖
   - 发送 PUT /api/account/notes 请求
   - 后端 updateAccountNotes 更新 MongoDB
   - 成功后 setUpdatedNotes(true)，显示保存提示

7. **切换到预览模式**
   - 点击 Markdown 图标
   - setViewAsMarkdown(true)
   - ReactMarkdown 渲染内容
   - 查看格式化后的效果

8. **继续编辑**
   - 可随时在预览和编辑模式间切换
   - 每次修改都会触发自动保存

### 3.3 删除与恢复笔记流程

**删除笔记：**

1. **选中要删除的笔记**
   - 点击列表中的笔记
   - 右侧显示笔记内容

2. **点击删除按钮**
   - 点击顶栏的垃圾桶图标
   - 触发 handleDeleteCurrentEditingNote

3. **移至回收站**
   - 从 userNotes 数组中移除笔记
   - 追加到 userTrashedNotes 数组
   - setCurrentEditingNote(null)
   - 右侧恢复显示 Logo

4. **数据同步**
   - useEffect 监听到变化
   - 1 秒后发送 PUT 请求
   - 同时更新 notes 和 trashedNotes 字段

**恢复笔记：**

1. **进入回收站**
   - 点击主操作菜单的垃圾桶图标
   - setViewTrashedNotes(true)
   - 列表标题变为 "Trashed Notes"
   - 显示回收站笔记

2. **选中要恢复的笔记**
   - 点击列表中的笔记
   - 右侧以只读模式显示

3. **点击恢复按钮**
   - 点击逆时针箭头图标
   - 触发 handleRemoveNoteFromTrash

4. **移回普通列表**
   - 从 userTrashedNotes 中移除
   - 追加到 userNotes 末尾
   - setCurrentEditingNote(null)

5. **自动同步**
   - 1 秒后更新数据库
   - 可切换回普通视图查看恢复的笔记

**永久删除：**

1. **在回收站选中笔记**
   - 右侧显示内容

2. **点击永久删除按钮**
   - 点击带 X 的圆圈图标
   - 触发 handleDeleteNoteFromTrash

3. **彻底删除**
   - 从 userTrashedNotes 数组中移除
   - setCurrentEditingNote(null)
   - 同步到数据库

4. **不可恢复**
   - 数据从 MongoDB 彻底删除
   - 无任何恢复机制

### 3.4 搜索笔记流程

1. **输入搜索关键词**
   - 在笔记列表顶部搜索框输入
   - onChange 触发 setSearchValue

2. **实时过滤**
   - useEffect 监听 searchValue 变化
   - 执行 filterNotesBySearchTerm 函数

3. **匹配逻辑**
   - 如果 searchValue 为空，显示全部笔记
   - 否则筛选标题完全匹配或包含关键词的笔记
   - 根据 viewTrashedNotes 决定搜索范围

4. **显示结果**
   - setFilteredNotes(results)
   - 列表动态更新显示匹配项
   - 空结果显示"No notes found."

5. **清空搜索**
   - 删除搜索框内容
   - 自动恢复显示全部笔记

### 3.5 主题切换流程

1. **点击主题按钮**
   - 主操作菜单中的月亮/太阳图标
   - 触发 handleClickChangeDarkMode

2. **更新 localStorage**
   - 读取当前 darkMode 状态
   - 写入新值到 localStorage.darkMode

3. **切换状态**
   - setDarkMode(!darkMode)
   - 触发组件重新渲染

4. **全局样式更新**
   - 所有组件通过 LayoutContext 获取新状态
   - 条件类名自动切换
   - 背景、文本、边框颜色同步变化

5. **持久化**
   - 刷新页面后从 localStorage 恢复主题
   - useEffect 初始化时读取

6. **登出清理**
   - 登出时调用 localStorage.clear()
   - 下一个用户获得默认主题（明亮模式）

### 3.6 账户设置更新流程

**修改邮箱：**

1. **访问设置页面**
   - 点击主操作菜单的设置图标
   - router.push('/settings')
   - getServerSideProps 验证登录状态

2. **选择 Email 标签**
   - 默认选中状态
   - 显示 UpdateAccountEmailForm

3. **填写表单**
   - 输入新邮箱
   - 输入确认邮箱

4. **提交表单**
   - react-hook-form 前端验证
   - axios PUT /api/account/email

5. **后端处理**
   - verifyToken 验证身份
   - changeAccountEmail 中间件
   - 验证邮箱格式和一致性
   - 检查邮箱是否已被使用
   - findOneAndUpdate 更新 email 字段

6. **反馈结果**
   - 成功：200 "Email updated successfully."
   - 失败：400/404 错误消息
   - ResponseStatusBox 显示消息

**修改密码：**

1. **选择 Password 标签**
   - 点击切换到密码表单
   - 显示 UpdateAccountPasswordForm

2. **填写表单**
   - 输入旧密码
   - 输入新密码
   - 输入确认新密码

3. **提交表单**
   - axios PUT /api/account/password

4. **后端验证**
   - verifyToken 获取 userId
   - 查询用户账户
   - bcrypt.compare 验证旧密码
   - 检查新密码一致性
   - bcrypt.hash 加密新密码
   - findOneAndUpdate 更新 password 字段

5. **反馈结果**
   - 成功：200 "Password updated successfully."
   - 失败：400/500 错误消息
   - 显示在 ResponseStatusBox

6. **返回笔记**
   - 点击"Back to notes"链接
   - 返回主页

---

## 四、关键技术与功能的关联

### 4.1 JWT 认证与安全保障

**JWT 如何保障认证安全：**

1. **无状态认证：**
   - 服务器不存储会话信息
   - Token 包含所有必要的用户信息（userId）
   - 通过签名验证 token 完整性

2. **签名机制：**
   - 使用环境变量 `ACCESS_TOKEN_SECRET` 作为密钥
   - HMAC 算法确保 token 不可伪造
   - 任何篡改都会导致验证失败

3. **Claims 结构：**
   ```javascript
   {
     sub: "logged",        // 主题：已登录
     userId: ObjectId,     // 用户唯一标识
     iat: timestamp,       // 签发时间（自动生成）
     exp: timestamp        // 过期时间（24 小时后）
   }
   ```

4. **Cookie 安全配置：**
   - `httpOnly: true` - JavaScript 无法读取，防止 XSS 窃取 token
   - `secure: true` - 仅通过 HTTPS 传输
   - `sameSite: "strict"` - 严格同站策略，防止 CSRF 攻击
   - `maxAge: 86400` - 24 小时后自动过期

5. **验证流程：**
   - 每个受保护的 API 路由通过 verifyToken 中间件
   - 解析 Cookie 中的 authToken
   - 使用相同密钥验证签名
   - 提取 userId 传递给业务逻辑
   - 验证失败返回 403，阻止访问

6. **安全边界：**
   - Token 仅在服务器端验证，前端无法绕过
   - 登出通过设置 Cookie maxAge=0 立即失效
   - 24 小时强制过期，限制 token 滥用窗口

### 4.2 bcrypt 密码加密

**加密机制：**

1. **单向哈希：**
   - 使用 bcrypt.hash(password, saltRounds)
   - 密码转换为不可逆的哈希值
   - 无法从哈希值反推原密码

2. **盐值（Salt）：**
   - saltRounds: 10（2^10 次迭代）
   - 每个密码自动生成唯一盐值
   - 即使相同密码也产生不同哈希

3. **注册时加密：**
   ```javascript
   hash(password, 10, async (err, hashedPassword) => {
     await Account.create({ password: hashedPassword })
   })
   ```

4. **登录时验证：**
   ```javascript
   compare(inputPassword, storedHash, (err, result) => {
     if (result) { /* 密码正确 */ }
   })
   ```

5. **安全优势：**
   - 数据库泄露不会暴露明文密码
   - 慢哈希算法（10 rounds）增加暴力破解成本
   - 彩虹表攻击失效（每个密码唯一盐值）

### 4.3 Markdown 解析与渲染

**技术栈：**
- react-markdown 8.0.3 - 核心渲染引擎
- remark-gfm 3.0.1 - GitHub 风格扩展
- @tailwindcss/typography - 排版样式

**工作原理：**

1. **解析流程：**
   ```
   Markdown 文本 → remark 解析器 →
   AST（抽象语法树）→ React 组件树 → DOM
   ```

2. **ReactMarkdown 组件：**
   ```jsx
   <ReactMarkdown
     remarkPlugins={[remarkGfm]}  // 启用 GFM
     className="prose prose-invert"  // Tailwind 样式
   >
     {noteBody}
   </ReactMarkdown>
   ```

3. **remark-gfm 扩展：**
   - 表格解析：支持对齐语法（:---, :---:, ---:）
   - 任务列表：识别 `- [ ]` 和 `- [x]` 语法
   - 删除线：解析 `~~text~~`
   - 自动链接：将裸 URL 转换为链接

4. **Tailwind Typography 样式：**
   - `prose` 类应用专业排版样式
   - `prose-stone` - 明亮模式配色
   - `prose-invert` - 暗黑模式配色
   - 自动处理标题、段落、列表、代码块间距
   - 响应式字体大小

5. **性能优化：**
   - ReactMarkdown 使用虚拟 DOM diffing
   - 仅在笔记内容变化时重新渲染
   - Markdown 解析在客户端进行，减轻服务器负担

### 4.4 MongoDB 数据持久化

**数据库架构：**

1. **Collection：** `accounts`

2. **Document 结构：**
   ```javascript
   {
     _id: ObjectId("..."),
     email: "user@example.com",
     password: "$2b$10$...",  // bcrypt hash
     createdAt: "1/15/2024",
     notes: [
       { id: "abc123", title: "Note 1", body: "# Content" },
       { id: "def456", title: "Note 2", body: "More text" }
     ],
     trashedNotes: [
       { id: "ghi789", title: "Old note", body: "Deleted" }
     ]
   }
   ```

3. **Mongoose Schema：**
   - email: String, required, unique（唯一索引）
   - notes 和 trashedNotes: Array（灵活存储任意数量笔记）
   - 无需单独的 Notes collection，简化架构

4. **连接管理：**
   - 文件：`database/connection.js`
   - 使用 `mongoose.connect(MONGODB_URI)`
   - 连接池自动管理
   - 每次 API 调用前确保连接建立

5. **CRUD 操作：**
   - **Create：** `Account.create()` - 注册新用户
   - **Read：** `Account.findOne({ _id })` - 获取用户数据
   - **Update：** `Account.findOneAndUpdate(filter, update)` - 更新笔记/邮箱/密码
   - **Delete：** 无直接删除账户功能（可扩展）

6. **原子性更新：**
   - 使用 findOneAndUpdate 确保原子操作
   - `{ new: true }` 选项返回更新后的文档
   - 避免并发更新导致的数据丢失

### 4.5 Next.js SSR 与路由

**服务端渲染（SSR）：**

1. **getServerSideProps：**
   - 在每次请求时服务器端执行
   - 用于验证 JWT 和获取用户数据
   - 支持重定向未登录用户

2. **主页 SSR 流程（`pages/index.js`）：**
   ```javascript
   export async function getServerSideProps(ctx) {
     // 1. 解析 Cookie 获取 authToken
     const { authToken } = parse(ctx.req.headers.cookie)

     // 2. 验证 JWT
     const payload = verify(authToken, SECRET)

     // 3. 从数据库获取用户笔记
     const user = await Account.findOne({ _id: payload.userId })

     // 4. 传递给组件
     return { props: { notes: user.notes, trashedNotes: user.trashedNotes } }
   }
   ```

3. **安全优势：**
   - 敏感操作（JWT 验证、数据库查询）在服务器执行
   - 未登录用户无法访问笔记数据
   - 自动重定向到 /login

4. **API 路由：**
   - `pages/api/*` 目录下的文件自动成为 API 端点
   - 示例：`pages/api/auth/login/index.js` → `/api/auth/login`
   - 支持 HTTP 方法区分（GET, POST, PUT, DELETE）

5. **客户端路由：**
   - 使用 Next.js `<Link>` 和 `useRouter()`
   - SPA 式导航，无整页刷新
   - router.push() 编程式导航

### 4.6 React Context 状态管理

**三大 Context：**

1. **LayoutContext：**
   - **职责：** 管理全局 UI 状态
   - **状态：**
     - `darkMode` - 主题模式
     - `panelIsActive` - 侧边栏显示状态
     - `windowWidth` - 窗口宽度
   - **方法：** `handleClickChangeDarkMode()`

2. **NotesContext：**
   - **职责：** 管理笔记业务逻辑
   - **状态：**
     - `userNotes` - 活跃笔记数组
     - `userTrashedNotes` - 回收站笔记
     - `currentEditingNote` - 当前编辑的笔记
     - `viewTrashedNotes` - 是否查看回收站
     - `searchValue` - 搜索关键词
     - `filteredNotes` - 过滤后的笔记
     - `updatedNotes` - 保存状态标志
   - **方法：**
     - `addNewNote()` - 创建笔记
     - `handleClickNoteInRecipient()` - 选中笔记
     - `handleOnChangeCurrentEditingNote()` - 编辑笔记
     - `handleDeleteCurrentEditingNote()` - 删除到回收站
     - `handleRemoveNoteFromTrash()` - 恢复笔记
     - `handleDeleteNoteFromTrash()` - 永久删除

3. **ResponseContext：**
   - **职责：** 管理表单响应状态
   - **状态：**
     - `code` - HTTP 状态码
     - `message` - 响应消息
   - **用途：** 设置页面的错误和成功提示

**优势：**
- 避免 prop drilling（多层传递 props）
- 全局状态统一管理
- 组件解耦，易于维护
- 符合 React Hooks 最佳实践

### 4.7 自动保存机制

**实现原理：**

1. **监听状态变化：**
   ```javascript
   useEffect(() => {
     const updateNotes = async () => {
       await axios.put('/api/account/notes', {
         notes: userNotes,
         trashedNotes: userTrashedNotes
       })
     }

     const timer = setTimeout(updateNotes, 1000)
     return () => clearInterval(timer)
   }, [userNotes, userTrashedNotes])
   ```

2. **防抖机制：**
   - setTimeout 1000ms 延迟
   - 连续修改时清除上一个定时器
   - 停止编辑 1 秒后才发送请求
   - 减少不必要的网络请求和数据库写入

3. **保存流程：**
   - 用户编辑触发 handleOnChangeCurrentEditingNote
   - 更新 userNotes 状态
   - useEffect 检测到变化
   - 1 秒后发送 PUT 请求
   - 后端更新 MongoDB
   - 成功后设置 updatedNotes 为 true
   - 显示保存提示（2.5 秒后消失）

4. **容错处理：**
   - 网络错误时在 catch 块中 console.log
   - 未实现重试机制（可扩展）
   - 用户可通过刷新页面查看是否保存成功

---

## 五、现有功能的边界与限制

### 5.1 功能限制

**笔记管理：**
1. **笔记数量：**
   - 无硬性上限（受 MongoDB 文档 16MB 大小限制）
   - 实际限制：单个文档最多约 1000-2000 条笔记（取决于内容长度）
   - 无分页功能，大量笔记可能影响加载性能

2. **笔记内容：**
   - 无单条笔记大小限制
   - 文本存储在 MongoDB 字符串字段，理论上可存储大文件
   - 前端 textarea 处理大文本（>10000 行）可能卡顿

3. **搜索功能：**
   - 仅支持标题搜索，不支持正文搜索
   - 简单包含匹配，无模糊搜索或正则支持
   - 区分大小写
   - 无高级过滤（按日期、标签等）

**Markdown 支持：**
1. **语法范围：**
   - 支持基础 Markdown 和 GFM 扩展
   - 不支持：
     - 脚注
     - 数学公式（LaTeX）
     - 图表（Mermaid, PlantUML）
     - 高级表格（合并单元格）
     - 目录生成

2. **代码高亮：**
   - 无语法高亮库集成
   - 代码块仅有基础样式
   - 不支持行号显示

3. **图片处理：**
   - 仅支持外部链接图片（`![](https://...)`）
   - 无图片上传功能
   - 无本地图片存储

**用户认证：**
1. **密码策略：**
   - 仅要求最少 8 位字符
   - 无复杂度要求（大小写、数字、特殊字符）
   - 无密码强度提示

2. **会话管理：**
   - Token 固定 24 小时有效期
   - 无"记住我"选项
   - 无刷新 token 机制（到期需重新登录）
   - 无多设备会话管理

3. **账户安全：**
   - 无双因素认证（2FA）
   - 无邮箱验证流程
   - 无密码找回功能
   - 无登录历史记录

**数据管理：**
1. **导出功能：**
   - 无笔记导出功能（虽然依赖中有 adm-zip）
   - 无批量下载
   - 无格式转换（PDF, Word）

2. **备份与恢复：**
   - 无自动备份
   - 删除笔记只能从回收站恢复
   - 回收站无时间限制（永久保留）

3. **协作功能：**
   - 无多人协作
   - 无笔记分享
   - 无权限管理

**界面与体验：**
1. **组织功能：**
   - 无文件夹/分类
   - 无标签系统
   - 无笔记排序（固定按创建时间倒序）
   - 无置顶功能

2. **编辑器：**
   - 基础 textarea，无富文本工具栏
   - 无快捷键支持
   - 无撤销/重做历史（依赖浏览器原生）
   - 无编辑器插件（表格辅助、链接预览等）

3. **通知系统：**
   - 仅有简单的保存成功提示
   - 无错误详情展示
   - 无操作确认对话框（删除时无二次确认）

### 5.2 技术债务与潜在问题

1. **性能问题：**
   - 笔记数据存储在单个 MongoDB 文档的数组中，大量笔记时更新效率低
   - 无虚拟滚动，列表过长时渲染性能差
   - 每次保存都上传全部笔记数组，无增量更新

2. **安全隐患：**
   - 无 CSRF token（依赖 SameSite Cookie）
   - 无请求频率限制（可能被滥用）
   - 环境变量硬编码在代码中（需通过 .env 管理）

3. **错误处理：**
   - 大量 console.log(error)，无结构化日志
   - 前端错误处理不完善，网络失败时用户无感知
   - 无全局错误边界

4. **代码质量：**
   - 部分文件中的拼写错误（如 "dont" 应为 "don't"）
   - 注册中间件中的密码长度验证错误（检查 email.length 而非 password.length）
   - 无单元测试或集成测试

5. **扩展性限制：**
   - 数据模型绑定单个用户，难以扩展到团队功能
   - 无 API 版本控制
   - 前后端耦合（Next.js 全栈架构），难以独立部署

### 5.3 浏览器兼容性

**支持范围：**
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）
- 依赖现代 JavaScript 特性（ES6+）
- 无 IE 11 支持

**已知限制：**
- localStorage 依赖（隐私模式可能失效）
- Cookie 策略要求 HTTPS（本地开发需特殊配置）

### 5.4 移动端体验

**已实现：**
- 响应式布局
- 触摸友好的按钮大小
- 移动端侧边栏可隐藏

**未优化：**
- 无原生应用体验（PWA）
- 虚拟键盘可能遮挡内容
- 无手势操作（滑动删除等）
- 移动端 Markdown 编辑体验一般（无工具栏）

---

## 六、总结

### 6.1 项目优势
- 技术栈现代化，采用主流框架
- 架构清晰，模块化设计
- JWT + bcrypt 保障基础安全
- Markdown 支持满足技术用户需求
- 响应式设计适配多端
- 自动保存提升用户体验

### 6.2 适用场景
- 个人知识管理
- 技术文档编写
- 学习笔记整理
- 轻量级待办事项

### 6.3 二次开发建议方向

**1. 功能增强：**
- 添加文件夹/标签组织系统
- 实现笔记导出（Markdown, PDF）
- 增加图片上传和附件支持
- 支持代码语法高亮
- 实现笔记分享和协作

**2. 性能优化：**
- 重构数据模型，将笔记独立为 collection
- 实现分页加载
- 添加虚拟滚动
- 优化自动保存为增量更新

**3. 安全加固：**
- 添加邮箱验证
- 实现密码找回
- 增加双因素认证
- 添加请求频率限制
- 完善错误处理和日志记录

**4. 用户体验：**
- 开发富文本编辑器工具栏
- 添加快捷键支持
- 实现拖拽排序
- 增加批量操作
- 支持 PWA 离线使用

**5. 代码质量：**
- 修复现有 bug（注册中间件密码验证逻辑）
- 添加单元测试和集成测试
- 统一错误消息格式
- 实现结构化日志系统
- 代码重构和优化

---

**文档版本：** 1.0
**生成日期：** 2025年
**项目仓库：** https://github.com/jacksonpf1/notella
**在线演示：** https://notella.vercel.app/

## 附录：关键文件索引

### 认证相关
- `database/middleware/authentication/login/index.js` - 登录逻辑
- `database/middleware/authentication/token/index.js` - JWT 验证
- `database/middleware/authentication/logout/index.js` - 登出逻辑
- `database/middleware/register/index.js` - 注册逻辑

### 笔记管理
- `context/NotesContext.js` - 笔记状态管理
- `database/middleware/account/notes/index.js` - 笔记 API 中间件
- `components/NotePreviewer.js` - 笔记编辑器组件
- `components/Recipient.js` - 笔记列表组件

### 账户设置
- `database/middleware/account/email/index.js` - 邮箱更新
- `database/middleware/account/password/index.js` - 密码更新
- `pages/settings.js` - 设置页面

### 数据模型
- `database/models/account.js` - Account Schema
- `database/connection.js` - MongoDB 连接

### 界面组件
- `context/LayoutContext.js` - 布局状态管理
- `components/MainActionsMenu.js` - 主操作菜单
- `components/LoggedLayout.js` - 主布局组件

### 工具函数
- `utils/initialAccountNote.js` - 欢迎笔记内容
- `utils/regex.js` - 正则表达式工具
