# CLAUDE.md

## 项目概述

Next.js 16 SaaS Starter Kit。Monorepo 架构，基于 Turborepo + pnpm workspace。目标：让开发者在几天内搭建生产级 SaaS 应用。

技术栈：Next.js 16.2 / React 19.2 / TypeScript 5.7 / Tailwind CSS v4 / shadcn/ui / Drizzle ORM / PostgreSQL 16 / Better Auth / Stripe / React Email + Resend / Vitest + Playwright / Biome / Turborepo / pnpm 9

---

## 目录结构

```
saas-kit/
├── apps/
│   └── web/                          # Next.js 16 主应用
│       ├── app/
│       │   ├── (marketing)/          # 公开页面：Landing, Pricing, Blog, Docs, Changelog
│       │   ├── (auth)/               # 认证页面：Sign In/Up, Forgot Password, Verify, 2FA, Invite
│       │   ├── (dashboard)/          # 需认证区域
│       │   │   ├── dashboard/        # 组织选择器 / 概览
│       │   │   ├── [orgSlug]/        # 组织级路由（所有业务功能在此下）
│       │   │   │   ├── settings/     # General, Members, Billing, API Keys
│       │   │   │   └── [feature]/    # 业务功能占位
│       │   │   └── account/          # 个人设置（跨组织）：Profile, Security
│       │   ├── (admin)/              # Super Admin 面板
│       │   │   └── admin/            # Users, Organizations, Subscriptions, Analytics
│       │   ├── api/
│       │   │   ├── auth/[...all]/    # Better Auth handler
│       │   │   ├── webhooks/stripe/  # Stripe webhook
│       │   │   └── v1/              # 公开 REST API
│       │   ├── proxy.ts             # Next.js 16 请求代理（替代 middleware.ts）
│       │   └── layout.tsx
│       ├── components/              # App 级组件（marketing/, dashboard/, admin/）
│       ├── content/blog/            # MDX 博客文章
│       └── lib/                     # App 级工具函数
│
├── packages/
│   ├── auth/                        # Better Auth 配置 + session 工具 + 权限守卫
│   ├── database/                    # Drizzle ORM + Schema + 迁移
│   ├── billing/                     # Stripe 集成 + 计划配置 + 计费 UI 组件
│   ├── email/                       # React Email 模板 + Resend 发送
│   ├── ui/                          # shadcn/ui 组件库（唯一存放 UI 组件的地方）
│   ├── i18n/                        # next-intl 封装 + 翻译文件
│   ├── analytics/                   # Sentry + PostHog 封装
│   ├── env/                         # 环境变量验证（@t3-oss/env-nextjs + Zod）
│   └── config/
│       ├── typescript/              # 共享 tsconfig preset（base, nextjs, library）
│       ├── biome/                   # 共享 Biome lint + format 规则
│       └── tailwind/               # 共享 Tailwind preset（shadcn CSS 变量系统）
│
├── plugins/                         # 可插拔功能模块（feedback, waitlist, ai-chatbot, file-upload）
└── tooling/
    └── cli/                         # 项目 CLI（init, generate, plugin add/remove）
```

---

## 核心架构决策

### 多租户模型

个人账户 = `isPersonal: true` 的 organization。所有数据、计费、权限统一走 organization 维度，不存在两套模型。

三种模式通过 `appConfig.accountMode` 切换：

- `personal`：注册自动建 personal org，无团队概念
- `organization`：注册后必须创建或加入组织
- `hybrid`：两者兼有（默认）

### 认证

Better Auth + 数据库 Session（不用 JWT）。Session 存 PostgreSQL，HttpOnly Cookie 传递。

支持：Email/Password、OAuth (Google/GitHub)、Passkeys (WebAuthn)、Magic Link、2FA (TOTP)。

### 计费

Stripe 为主，通过 Provider Gateway 抽象层支持 Paddle / Lemon Squeezy。计划配置声明式定义在 `packages/billing/src/plans.ts`，支持 flat-rate、per-seat、metered、tiered、hybrid 计费模式。

订阅挂在 organization 上，不在 user 上。席位变更通过 organization lifecycle hooks 自动同步 Stripe quantity。

### Tailwind CSS

**只在 `apps/web` 编译一次。** `packages/ui` 只输出带 class name 的组件，不编译 CSS。`apps/web/tailwind.config.ts` 的 content 数组扫描 `packages/ui/src/**` 提取 class。

设计系统通过 `packages/config/tailwind/preset.ts` 统一，所有颜色使用 `hsl(var(--xxx))` CSS 变量模式。

### i18n

翻译文件集中在 `packages/i18n/locales/`。Server Component 用 `getTranslations()`，Client Component 用 `useTranslation()`。apps/web 直接引用包内翻译，不重复建目录。

---

## 数据模型

```
users
  ├──< memberships >── organizations ──< subscriptions
  │                        ├──< invitations
  │                        └──< api_keys
  ├──< sessions
  ├──< accounts (OAuth)
  ├──< passkeys
  └──< two_factors

核心关系：
- users ↔ organizations: 多对多，通过 memberships（含 role 字段）
- organizations → subscriptions: 一对一（一个 org 一个活跃订阅）
- organizations.isPersonal: 标记个人空间
- organizations.ownerId → users.id: 创建者
```

角色体系：

- 全局角色（`users.globalRole`）：`user` / `admin` / `super_admin`
- 组织角色（`memberships.role`）：`owner` / `admin` / `member` / `viewer`

---

## 编码规范

### 文件与命名

- 文件名：kebab-case（`org-switcher.tsx`）
- 组件名：PascalCase（`OrgSwitcher`）
- 函数/变量：camelCase
- 数据库列名：snake_case（Drizzle schema 中用 `text("avatar_url")`）
- 路由目录：kebab-case，路由组用括号 `(marketing)`、`(auth)`、`(dashboard)`、`(admin)`

### Server vs Client

**Server Components 优先。** 只在需要以下能力时才加 `'use client'`：

- 事件处理（onClick, onChange, onSubmit）
- React hooks（useState, useEffect, useContext）
- 浏览器 API（window, document, localStorage）

数据获取只在 Server Component / Server Action / API Route 中进行，禁止在 Client Component 中直接查数据库。

### 数据变更

表单提交和数据变更使用 **Server Actions**（`'use server'`），不写 API Route。API Route 只用于：

- Webhook 接收（Stripe）
- Better Auth handler
- 第三方对外 API（`/api/v1/`）

### 权限检查

```typescript
// Server Component 中
const ctx = await getOrgContext(orgSlug);
if (!ctx) notFound();

// Server Action 中
await requireOrgRole(orgId, ["owner", "admin"]);

// Client Component 中
const { canManageMembers, isOwner } = useOrgRole();

// Admin 页面
await requireSuperAdmin();
```

每个 Server Action 必须在第一行做权限检查，不能依赖前端隐藏按钮来保证安全。

### 表单验证

所有表单使用 React Hook Form + Zod schema。Zod schema 定义在 Server Action 文件中或独立的 `schema.ts` 中，前后端共享同一份。

### UI 组件

所有 UI 组件从 `@saas-kit/ui` 导入：

```typescript
import { Button } from "@saas-kit/ui/components/button";
import { cn } from "@saas-kit/ui/lib/utils";
```

不在 `apps/web` 中直接装 shadcn 组件。新增组件在 `packages/ui` 下执行 `npx shadcn@latest add xxx`，然后运行 `pnpm fix-imports`。

### 样式

只用 Tailwind utility class，不写自定义 CSS（`global.css` 中的 CSS 变量定义除外）。不用 CSS Modules、styled-components、emotion。

### 错误处理

- Server Action 失败返回 `{ error: string }` 而非 throw
- API Route 使用标准 HTTP 状态码
- 客户端用 sonner/toast 显示错误信息
- 未预期错误由 Sentry 捕获

### Import 顺序

Biome 自动排序。顺序：React/Next → 第三方库 → @saas-kit/\* 包 → 相对路径 → 类型导入。

---

## 路由保护

`proxy.ts`（Next.js 16）负责请求级保护：

| 路径模式                                                | 保护级别                                |
| ------------------------------------------------------- | --------------------------------------- |
| `/`, `/pricing`, `/blog/*`, `/docs/*`                   | 公开                                    |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/invite/*` | 公开                                    |
| `/api/auth/*`, `/api/webhooks/*`                        | 公开                                    |
| `/dashboard/*`, `/[orgSlug]/*`, `/account/*`            | 需要认证（无 session → 重定向 sign-in） |
| `/admin/*`                                              | 需要 super_admin 角色（否则 404）       |

组织级权限在 `[orgSlug]/layout.tsx` 中二次检查：验证当前用户是否为该组织成员。非成员看到 404。

---

## 组织上下文传递

```
[orgSlug]/layout.tsx (Server Component)
  │  查 org + membership + subscription
  │  注入 OrgProvider
  ▼
[orgSlug]/page.tsx 或子页面
  │  Server Component: 用 getOrgContext(orgSlug)
  │  Client Component: 用 useOrg() / useOrgRole()
  ▼
Server Action
  │  用 requireOrgRole(orgId, ['owner', 'admin'])
```

---

## 计费流程

```
用户点击 Subscribe
  → Server Action: createCheckout(orgId, productId, planId)
  → Stripe Checkout Session 创建
  → 用户在 Stripe 页面完成支付
  → Stripe 发 webhook: checkout.session.completed
  → webhook handler 创建 subscriptions 记录
  → 后续变更通过 customer.subscription.updated webhook 同步
```

管理订阅（升降级、取消、更新支付方式）通过 Stripe Billing Portal，不自建。

---

## 插件系统

插件是独立目录，包含 schema 扩展、路由、导航项、Server Actions：

```typescript
const plugin: SaaSPlugin = {
  name: "feedback",
  schema: feedbackSchema,
  routes: { dashboard: ["/feedback"], api: ["/api/feedback"] },
  navigation: {
    dashboard: { label: "Feedback", icon: MessageSquare, href: "/feedback" },
  },
  actions: { submitFeedback, voteFeedback },
};
```

安装/卸载通过 CLI：`npx saas-kit plugin add feedback`

---

## 常用命令

```bash
pnpm dev                  # 启动所有 app（Turbopack）
pnpm build                # 构建所有包和 app
pnpm lint                 # Biome 检查
pnpm format               # Biome 格式化
pnpm typecheck            # TypeScript 类型检查
pnpm db:generate          # 生成 Drizzle 迁移
pnpm db:migrate           # 执行迁移
pnpm db:seed              # 填充种子数据
pnpm db:studio            # 打开 Drizzle Studio
pnpm test                 # Vitest 单元测试
pnpm test:e2e             # Playwright E2E 测试
docker-compose up -d      # 启动本地 PostgreSQL + Redis
```

---

## 新增业务功能模板

在 `apps/web/app/(dashboard)/[orgSlug]/` 下新建目录：

```
[orgSlug]/projects/
├── page.tsx               # 列表页（Server Component）
├── [projectId]/
│   └── page.tsx           # 详情页
├── new/
│   ├── page.tsx           # 创建页
│   └── create-form.tsx    # 表单（Client Component）
├── actions.ts             # Server Actions（'use server'）
└── schema.ts              # Zod 验证 schema
```

每个 action 第一行调用 `requireOrgRole()`。页面通过 `useOrg()` 获取当前组织上下文。数据表添加 `orgId` 外键实现租户隔离。

---

## 部署

支持三种部署目标：

- **Vercel**（默认）：`vercel deploy`，零配置
- **Cloudflare Workers + Pages**：通过 Build Adapter
- **Docker 自部署**：`docker build` + `docker-compose`，适配 Coolify / Railway

环境变量通过 `@saas-kit/env` 包做 Zod 验证，缺少必要变量时构建失败而非运行时报错。

---

## 禁止事项

- 不要用 Pages Router（`pages/` 目录）
- 不要用 `getServerSideProps` / `getStaticProps` / `getInitialProps`
- 不要在 Client Component 中 import `@saas-kit/database`
- 不要在 `apps/web` 中直接安装 shadcn 组件（统一在 `packages/ui` 中安装）
- 不要用 `WidthType.PERCENTAGE` 创建表格（在某些渲染器中会失效）
- 不要在 `packages/ui` 中编译 Tailwind CSS
- 不要用 `var` 声明变量
- 不要写自定义 CSS 文件（CSS 变量定义除外）
- 不要用 `any` 类型（`unknown` + 类型收窄代替）
- 不要在权限检查前执行数据变更操作
- 不要硬编码 Stripe Price ID（通过环境变量注入）
- 不要在 `.env.local` 中提交真实密钥
