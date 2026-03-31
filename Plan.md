# SaaS Kit 开发计划 — Claude Code 执行手册

> 原则：每个 Plan 足够小、边界足够清晰，让 Claude Code 能一次性 100% 完成。
> 每个 Plan 包含：目标、产出文件清单、验收标准、完整 Prompt。
> Plan 之间有严格的依赖顺序，后面的 Plan 依赖前面的产出。

---

## Phase 0: Monorepo 脚手架

### Plan 0.1 — 初始化 Monorepo 根目录

**目标**：创建基于 pnpm workspace + Turborepo 的 monorepo 骨架

**产出文件**：

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `.npmrc`
- `.gitignore`
- `.nvmrc`

**Prompt**:

```
你是一个资深全栈工程师。请帮我初始化一个 pnpm + Turborepo monorepo 项目。

要求：
1. 根目录 package.json：
   - name: "@flash-kit/root"
   - private: true
   - packageManager: "pnpm@9.15.4"
   - scripts: dev, build, lint, format, clean, db:migrate, db:seed, db:studio, typecheck
   - devDependencies: turbo@latest, typescript@^5.7

2. pnpm-workspace.yaml：
   - packages: ["apps/*", "packages/*", "plugins/*", "tooling/*"]

3. turbo.json：
   - pipeline 定义：
     - build: dependsOn ["^build"], outputs [".next/**", "dist/**"]
     - dev: cache false, persistent true
     - lint: dependsOn ["^build"]
     - typecheck: dependsOn ["^build"]
     - clean: cache false
   - globalDependencies: [".env.local"]

4. .npmrc：
   - auto-install-peers=true
   - strict-peer-dependencies=false

5. .nvmrc: 22

6. .gitignore: node_modules, .next, dist, .turbo, .env*.local, *.tsbuildinfo

不要安装任何依赖，只创建配置文件。不要创建任何子目录。
验收标准：运行 pnpm install 不报错（虽然还没有 workspace 包）。
```

---

### Plan 0.2 — 共享 TypeScript 配置包

**目标**：创建 `packages/config/typescript/` 下的共享 tsconfig preset

**产出文件**：

- `packages/config/typescript/package.json`
- `packages/config/typescript/base.json`
- `packages/config/typescript/nextjs.json`
- `packages/config/typescript/library.json`

**Prompt**:

```
你是一个资深全栈工程师。在当前 monorepo 项目中，创建共享 TypeScript 配置包。

路径：packages/config/typescript/

1. package.json：
   - name: "@flash-kit/tsconfig"
   - private: true
   - 无依赖

2. base.json — 所有包继承的基础配置：
   - strict: true
   - esModuleInterop: true
   - skipLibCheck: true
   - forceConsistentCasingInFileNames: true
   - resolveJsonModule: true
   - isolatedModules: true
   - incremental: true
   - declaration: true
   - declarationMap: true
   - sourceMap: true
   - target: "ES2022"
   - moduleDetection: "force"

3. nextjs.json — apps/web 用的：
   - extends: "./base.json"
   - 追加: jsx "preserve", module "esnext", moduleResolution "bundler"
   - lib: ["dom", "dom.iterable", "esnext"]
   - allowJs: true, noEmit: true
   - plugins: [{ name: "next" }]

4. library.json — packages/* 用的：
   - extends: "./base.json"
   - 追加: module "esnext", moduleResolution "bundler"
   - outDir: "./dist"

不要创建其他文件。不要运行任何命令。
验收标准：JSON 语法正确，extends 路径正确。
```

---

### Plan 0.3 — Biome 配置包

**目标**：创建共享 Biome lint + format 配置

**产出文件**：

- `packages/config/biome/package.json`
- `packages/config/biome/biome.json`
- 根目录 `biome.json`

**Prompt**:

```
你是一个资深全栈工程师。在当前 monorepo 项目中，配置 Biome 作为 lint 和 format 工具。

1. packages/config/biome/package.json：
   - name: "@flash-kit/biome-config"
   - private: true
   - devDependencies: "@biomejs/biome": "^1.9"

2. packages/config/biome/biome.json：
   - $schema: "https://biomejs.dev/schemas/1.9.0/schema.json"
   - organizeImports: enabled true
   - formatter:
     - indentStyle: "space"
     - indentWidth: 2
     - lineWidth: 100
   - linter:
     - enabled: true
     - rules:
       - recommended: true
       - correctness: noUnusedVariables "warn", noUnusedImports "warn"
       - style: noNonNullAssertion "off"（因为会和 Drizzle schema 冲突）
       - suspicious: noExplicitAny "warn"
   - javascript:
     - formatter: quoteStyle "single", trailingCommas "all", semicolons "always"
   - files:
     - ignore: ["node_modules", ".next", "dist", ".turbo", "*.config.ts", "*.config.js"]

3. 根目录 biome.json：
   - extends: ["./packages/config/biome/biome.json"]

4. 更新根目录 package.json 的 scripts：
   - lint: "biome check ."
   - format: "biome format --write ."
   - "lint:fix": "biome check --fix ."

不要运行任何命令。
验收标准：biome.json 语法正确，根目录正确 extends。
```

---

### Plan 0.4 — Tailwind 共享 Preset

**目标**：创建 `packages/config/tailwind/` 下的共享 Tailwind preset（含 shadcn/ui CSS 变量系统）

**产出文件**：

- `packages/config/tailwind/package.json`
- `packages/config/tailwind/preset.ts`

**Prompt**:

```
你是一个资深全栈工程师。在当前 monorepo 中创建共享 Tailwind CSS preset。

路径：packages/config/tailwind/

1. package.json：
   - name: "@flash-kit/tailwind-config"
   - private: true
   - exports: { "./preset": "./preset.ts" }
   - devDependencies: tailwindcss "^4", tailwindcss-animate "latest"

2. preset.ts：
   - 导出 flashKitPreset，类型为 Partial<Config>
   - theme.extend.colors 使用 shadcn/ui 的 CSS 变量模式：
     - background, foreground, card, card-foreground
     - popover, popover-foreground
     - primary, primary-foreground
     - secondary, secondary-foreground
     - muted, muted-foreground
     - accent, accent-foreground
     - destructive, destructive-foreground
     - border, input, ring
     - chart-1 到 chart-5（用于数据可视化）
     - sidebar 系列（sidebar-background, sidebar-foreground 等）
     - 所有颜色值格式: "hsl(var(--变量名))"
   - theme.extend.borderRadius: lg/md/sm 使用 var(--radius)
   - theme.extend.fontFamily: sans 使用 var(--font-sans), mono 使用 var(--font-mono)
   - theme.extend.keyframes: accordion-down, accordion-up
   - theme.extend.animation: accordion-down, accordion-up
   - plugins: [require("tailwindcss-animate")]

只创建这两个文件，不创建其他文件。
验收标准：TypeScript 类型正确，import Config from "tailwindcss" 可用。
```

---

### Plan 0.5 — 创建 Next.js 16 Web App 骨架

**目标**：创建 `apps/web/` 下的 Next.js 16 应用，包含基础配置

**产出文件**：

- `apps/web/package.json`
- `apps/web/next.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`
- `apps/web/app/layout.tsx`（Root Layout）
- `apps/web/app/global.css`（含 shadcn CSS 变量）
- `apps/web/app/page.tsx`（临时首页）

**Prompt**:

```
你是一个资深全栈工程师。在当前 monorepo 中创建 Next.js 16 web 应用骨架。

路径：apps/web/

1. package.json：
   - name: "@flash-kit/web"
   - private: true
   - scripts: dev "next dev --turbopack", build "next build", start "next start"
   - dependencies: next "^16.2", react "^19.2", react-dom "^19.2"
   - devDependencies:
     - "@flash-kit/tsconfig" (workspace:*)
     - "@flash-kit/tailwind-config" (workspace:*)
     - typescript, @types/react, @types/react-dom, @types/node
     - tailwindcss, postcss, autoprefixer

2. next.config.ts：
   - 启用 Turbopack
   - transpilePackages: ["@flash-kit/ui", "@flash-kit/auth", "@flash-kit/database", "@flash-kit/billing", "@flash-kit/email", "@flash-kit/i18n", "@flash-kit/analytics"]
   - 启用 experimental.ppr (Partial Prerendering)

3. tsconfig.json：
   - extends: "@flash-kit/tsconfig/nextjs"
   - compilerOptions.paths: { "@/*": ["./src/*"] } — 不对，Next.js 16 app dir 不需要 src，改成 { "@/*": ["./*"] }
   - include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
   - exclude: ["node_modules"]

4. tailwind.config.ts：
   - import { flashKitPreset } from "@flash-kit/tailwind-config/preset"
   - content 数组：
     - "./app/**/*.{ts,tsx}"
     - "./components/**/*.{ts,tsx}"
     - "../../packages/ui/src/**/*.{ts,tsx}"
     - "../../packages/billing/src/**/*.{ts,tsx}"
   - presets: [flashKitPreset]

5. postcss.config.js：tailwindcss + autoprefixer

6. app/global.css：
   - @tailwind base, components, utilities
   - @layer base 中定义 :root 和 .dark 的 CSS 变量（shadcn/ui neutral 主题）
   - 包含所有 shadcn 需要的变量：background, foreground, card, primary, secondary, muted, accent, destructive, border, input, ring, radius, sidebar 系列, chart 系列

7. app/layout.tsx：
   - 导入 global.css
   - 使用 Inter 字体（from next/font/google）
   - html lang="en", 添加 suppressHydrationWarning
   - metadata: title "Flash Kit", description "..."

8. app/page.tsx：
   - 简单的 "Flash Kit is running" 文本

不要运行任何命令。不要安装依赖。
验收标准：文件结构正确，所有 import 路径正确，TypeScript 类型正确。
```

---

### Plan 0.6 — UI 包骨架 + cn() 工具函数

**目标**：创建 `packages/ui/` 包，包含 cn() 工具函数和 components.json

**产出文件**：

- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/components.json`
- `packages/ui/src/lib/utils.ts`
- `packages/ui/src/index.ts`
- `packages/ui/scripts/fix-imports.ts`

**Prompt**:

```
你是一个资深全栈工程师。在当前 monorepo 中创建共享 UI 包骨架。

路径：packages/ui/

1. package.json：
   - name: "@flash-kit/ui"
   - private: true
   - exports:
     - "./components/*": "./src/components/*.tsx"
     - "./lib/*": "./src/lib/*.ts"
     - "./hooks/*": "./src/hooks/*.ts"
   - dependencies: tailwind-merge "^3", clsx "^2", class-variance-authority "^0.7", lucide-react "^0.400"
   - peerDependencies: react "^19.2", react-dom "^19.2"

2. tsconfig.json：
   - extends: "@flash-kit/tsconfig/library"
   - include: ["src/**/*.ts", "src/**/*.tsx"]
   - exclude: ["node_modules", "dist"]

3. components.json（shadcn CLI 配置）：
   - $schema: "https://ui.shadcn.com/schema.json"
   - style: "new-york"
   - rsc: true
   - tsx: true
   - tailwind.config: "" (留空)
   - tailwind.css: "" (留空)
   - tailwind.baseColor: "neutral"
   - tailwind.cssVariables: true
   - aliases:
     - components: "./src/components"
     - utils: "./src/lib/utils"
     - hooks: "./src/hooks"
     - lib: "./src/lib"

4. src/lib/utils.ts：
   - 导出 cn 函数：接收 ClassValue[]，返回 twMerge(clsx(...inputs))

5. src/index.ts：
   - 暂时为空，注释 "// Re-exports will be added as components are installed"

6. scripts/fix-imports.ts：
   - 读取 src/components/ 下所有 .tsx 文件
   - 正则替换：
     - from "@/lib/utils" → from "../lib/utils"
     - from "@/components/(.+)" → from "./$1"
     - from "@/hooks/(.+)" → from "../hooks/$1"
   - 打印修复了多少文件
   - 使用 Node.js fs/promises，不需要额外依赖

不要运行任何命令。不要安装 shadcn 组件。
创建空目录：src/components/, src/hooks/
验收标准：package.json exports 路径和实际文件结构一致。
```

---

### Plan 0.7 — 安装 shadcn/ui 核心组件

**目标**：在 packages/ui 中安装常用 shadcn 组件

**Prompt**:

```
你是一个资深全栈工程师。在 packages/ui 目录下，使用 shadcn CLI 安装以下核心组件：

cd packages/ui

安装组件列表：
button, input, label, textarea, select, checkbox, radio-group,
switch, slider, separator, badge, avatar, card,
dialog, alert-dialog, dropdown-menu, popover, tooltip, sheet,
tabs, accordion, command, form, toast, sonner,
table, skeleton, progress, alert

安装完成后：
1. 运行 scripts/fix-imports.ts 修正所有组件内的 import 路径
2. 检查 package.json 是否自动添加了 @radix-ui 依赖
3. 确认所有组件文件在 src/components/ 下
4. 确认 src/hooks/ 下有 use-toast.ts（如果 toast 组件需要的话）

验收标准：
- 所有组件文件中不包含 "@/" import 路径
- 所有组件文件只使用相对路径 import
- pnpm typecheck 不报错
```

---

### Plan 0.8 — 环境变量验证包

**目标**：创建类型安全的环境变量验证

**产出文件**：

- `packages/env/package.json`
- `packages/env/src/index.ts`
- `packages/env/tsconfig.json`

**Prompt**:

```
你是一个资深全栈工程师。创建环境变量验证包。

路径：packages/env/

1. package.json：
   - name: "@flash-kit/env"
   - private: true
   - exports: { ".": "./src/index.ts" }
   - dependencies: "@t3-oss/env-nextjs" "^0.11", zod "^3.23"

2. src/index.ts：
   - 使用 createEnv from @t3-oss/env-nextjs
   - server 变量（z.string().min(1)）：
     - DATABASE_URL
     - BETTER_AUTH_SECRET
     - STRIPE_SECRET_KEY
     - STRIPE_WEBHOOK_SECRET
     - RESEND_API_KEY
     - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
     - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
   - client 变量（以 NEXT_PUBLIC_ 开头）：
     - NEXT_PUBLIC_APP_URL (z.string().url())
     - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - runtimeEnv 映射到 process.env
   - skipValidation: !!process.env.SKIP_ENV_VALIDATION（CI 构建时跳过）
   - 导出 env 对象

3. 根目录创建 .env.example：
   - 列出所有环境变量，值为占位符注释

验收标准：TypeScript 类型正确，导出的 env 对象有完整的类型提示。
```

---

### Plan 0.9 — Docker Compose 本地开发环境

**目标**：PostgreSQL + Redis 本地开发环境

**产出文件**：

- `docker-compose.yml`
- `.env.local`（模板）

**Prompt**:

```
你是一个资深全栈工程师。创建本地开发环境的 Docker Compose 配置。

1. docker-compose.yml：
   - services:
     - postgres:
       - image: postgres:17-alpine
       - ports: 5432:5432
       - environment: POSTGRES_USER=postgres, POSTGRES_PASSWORD=postgres, POSTGRES_DB=flashkit
       - volumes: postgres_data:/var/lib/postgresql/data
       - healthcheck: pg_isready
     - redis:
       - image: redis:7-alpine
       - ports: 6379:6379
       - healthcheck: redis-cli ping
   - volumes: postgres_data

2. .env.local（本地开发用，.gitignore 已排除）：
   - DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flashkit
   - BETTER_AUTH_SECRET=dev-secret-change-in-production
   - STRIPE_SECRET_KEY=sk_test_xxx
   - STRIPE_WEBHOOK_SECRET=whsec_xxx
   - RESEND_API_KEY=re_xxx
   - GOOGLE_CLIENT_ID=xxx
   - GOOGLE_CLIENT_SECRET=xxx
   - GITHUB_CLIENT_ID=xxx
   - GITHUB_CLIENT_SECRET=xxx
   - NEXT_PUBLIC_APP_URL=http://localhost:3000
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

验收标准：docker-compose up -d 可启动 PostgreSQL 和 Redis。
```

---

## Phase 1: 数据库层

### Plan 1.1 — Database 包 + Drizzle 配置

**目标**：创建 `packages/database/`，配置 Drizzle ORM + PostgreSQL

**产出文件**：

- `packages/database/package.json`
- `packages/database/tsconfig.json`
- `packages/database/drizzle.config.ts`
- `packages/database/src/client.ts`
- `packages/database/src/index.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 database 包，配置 Drizzle ORM。

路径：packages/database/

1. package.json：
   - name: "@flash-kit/database"
   - private: true
   - exports:
     - ".": "./src/index.ts"
     - "./client": "./src/client.ts"
     - "./schema": "./src/schema/index.ts"
   - scripts:
     - "db:generate": "drizzle-kit generate"
     - "db:migrate": "drizzle-kit migrate"
     - "db:push": "drizzle-kit push"
     - "db:studio": "drizzle-kit studio"
     - "db:seed": "tsx src/seed.ts"
   - dependencies:
     - drizzle-orm "^0.38"
     - postgres "^3.4" (node-postgres 的现代替代)
     - @flash-kit/env (workspace:*)
   - devDependencies:
     - drizzle-kit "^0.30"
     - tsx "^4"
     - @flash-kit/tsconfig (workspace:*)

2. tsconfig.json：
   - extends: "@flash-kit/tsconfig/library"

3. drizzle.config.ts：
   - schema: "./src/schema/index.ts"
   - out: "./src/migrations"
   - dialect: "postgresql"
   - dbCredentials: { url: process.env.DATABASE_URL! }
   - verbose: true
   - strict: true

4. src/client.ts：
   - 使用 postgres 包（import postgres from 'postgres'）创建连接
   - 使用 drizzle(client, { schema }) 创建 db 实例
   - 导出 db
   - 连接字符串从 @flash-kit/env 获取

5. src/index.ts：
   - 导出 db from "./client"
   - 导出所有 schema from "./schema"

不要创建 schema 文件，那是下一个 Plan 的任务。
创建空目录：src/schema/, src/migrations/
验收标准：TypeScript 编译不报错，drizzle.config.ts 路径正确。
```

---

### Plan 1.2 — 用户和认证相关 Schema

**目标**：创建 users, sessions, accounts, verifications, passkeys, two_factors 表

**产出文件**：

- `packages/database/src/schema/users.ts`
- `packages/database/src/schema/auth.ts`
- `packages/database/src/schema/index.ts`（部分）

**Prompt**:

```
你是一个资深全栈工程师。创建用户和认证相关的 Drizzle schema。

路径：packages/database/src/schema/

1. users.ts：
   - 表名 "users"
   - id: uuid, defaultRandom, primaryKey
   - email: text, notNull, unique
   - name: text, nullable
   - avatarUrl: text("avatar_url"), nullable
   - emailVerified: boolean("email_verified"), default(false)
   - globalRole: pgEnum('global_role', ['user', 'admin', 'super_admin']), default 'user'
   - createdAt: timestamp("created_at"), defaultNow
   - updatedAt: timestamp("updated_at"), defaultNow
   - 导出 users 表和 globalRoleEnum

2. auth.ts：
   - sessions 表：
     - id: uuid primaryKey
     - userId: uuid, references users.id, onDelete cascade
     - token: text, notNull, unique
     - ipAddress: text nullable
     - userAgent: text("user_agent") nullable
     - expiresAt: timestamp notNull
     - createdAt, updatedAt: timestamp defaultNow
   - accounts 表：
     - id: uuid primaryKey
     - userId: uuid, references users.id, onDelete cascade
     - provider: text notNull (如 'google', 'github', 'credential')
     - providerAccountId: text("provider_account_id") notNull
     - accessToken: text("access_token") nullable
     - refreshToken: text("refresh_token") nullable
     - expiresAt: timestamp nullable
     - createdAt: timestamp defaultNow
   - verifications 表：
     - id: uuid primaryKey
     - identifier: text notNull
     - token: text notNull
     - value: text notNull
     - expiresAt: timestamp notNull
     - createdAt: timestamp defaultNow
   - passkeys 表：
     - id: uuid primaryKey
     - userId: uuid, references users.id, onDelete cascade
     - credentialId: text("credential_id") notNull unique
     - publicKey: text("public_key") notNull
     - counter: text notNull
     - deviceType: text("device_type") nullable
     - name: text nullable
     - createdAt: timestamp defaultNow
   - twoFactors 表：
     - id: uuid primaryKey
     - userId: uuid, references users.id, onDelete cascade
     - secret: text notNull
     - backupCodes: text("backup_codes") notNull
     - enabled: boolean default(false)
     - createdAt: timestamp defaultNow

3. 更新 index.ts：导出 users.ts 和 auth.ts 中的所有表和枚举

使用 drizzle-orm/pg-core 中的类型。所有 timestamp 使用 { withTimezone: true, mode: 'date' }。
验收标准：所有外键引用正确，枚举定义正确，TypeScript 编译通过。
```

---

### Plan 1.3 — 组织和多租户相关 Schema

**目标**：创建 organizations, memberships, invitations 表

**产出文件**：

- `packages/database/src/schema/organizations.ts`
- 更新 `packages/database/src/schema/index.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建多租户相关的 Drizzle schema。

路径：packages/database/src/schema/organizations.ts

1. organizations 表：
   - id: uuid, defaultRandom, primaryKey
   - name: text, notNull
   - slug: text, notNull, unique（URL 标识，如 /my-team）
   - logoUrl: text("logo_url"), nullable
   - isPersonal: boolean("is_personal"), default(false), notNull
   - ownerId: uuid("owner_id"), references users.id, notNull
   - createdAt, updatedAt: timestamp defaultNow

2. orgRoleEnum: pgEnum('org_role', ['owner', 'admin', 'member', 'viewer'])

3. memberships 表：
   - id: uuid, defaultRandom, primaryKey
   - userId: uuid("user_id"), references users.id, onDelete cascade, notNull
   - orgId: uuid("org_id"), references organizations.id, onDelete cascade, notNull
   - role: orgRoleEnum, default 'member', notNull
   - joinedAt: timestamp("joined_at"), defaultNow
   - 添加 unique 约束: (userId, orgId) 组合唯一

4. invitationStatusEnum: pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'revoked'])

5. invitations 表：
   - id: uuid, defaultRandom, primaryKey
   - orgId: uuid("org_id"), references organizations.id, onDelete cascade, notNull
   - email: text, notNull
   - role: orgRoleEnum, default 'member', notNull
   - token: text, notNull, unique
   - status: invitationStatusEnum, default 'pending', notNull
   - invitedById: uuid("invited_by_id"), references users.id, notNull
   - expiresAt: timestamp("expires_at"), notNull
   - createdAt: timestamp, defaultNow

6. 添加 Drizzle relations 定义：
   - users: 有多个 memberships
   - organizations: 有多个 memberships, 有多个 invitations, 属于一个 owner(user)
   - memberships: 属于一个 user, 属于一个 organization

7. 更新 index.ts：导出所有新表、枚举和 relations

验收标准：relations 定义正确，unique 约束正确，外键 onDelete 行为正确。
```

---

### Plan 1.4 — 订阅和计费相关 Schema

**目标**：创建 subscriptions, api_keys 表

**产出文件**：

- `packages/database/src/schema/subscriptions.ts`
- `packages/database/src/schema/api-keys.ts`
- 更新 `packages/database/src/schema/index.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建计费和 API Key 相关的 Drizzle schema。

路径：packages/database/src/schema/

1. subscriptions.ts：
   - subStatusEnum: pgEnum('subscription_status', ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused', 'incomplete'])
   - subscriptions 表：
     - id: uuid primaryKey
     - orgId: uuid("org_id"), references organizations.id, onDelete cascade, notNull
     - status: subStatusEnum, notNull
     - planId: text("plan_id"), notNull（对应 billing config 中的 plan 标识）
     - provider: text, notNull（'stripe' | 'paddle' | 'lemonsqueezy'）
     - providerSubscriptionId: text("provider_subscription_id"), nullable, unique
     - providerCustomerId: text("provider_customer_id"), nullable
     - providerItemId: text("provider_item_id"), nullable（用于更新 quantity）
     - seatsQuantity: integer("seats_qty"), nullable
     - currentPeriodStart: timestamp("current_period_start"), nullable
     - currentPeriodEnd: timestamp("current_period_end"), nullable
     - cancelAtPeriodEnd: boolean("cancel_at_period_end"), default(false)
     - trialEnd: timestamp("trial_end"), nullable
     - metadata: jsonb, nullable（存储自定义计费数据）
     - createdAt, updatedAt: timestamp defaultNow
   - 添加 relation: 属于一个 organization

2. api-keys.ts：
   - apiKeys 表：
     - id: uuid primaryKey
     - orgId: uuid("org_id"), references organizations.id, onDelete cascade, notNull
     - name: text, notNull（用户给 key 起的名字）
     - keyHash: text("key_hash"), notNull, unique（存 hash，不存明文）
     - keyPrefix: text("key_prefix"), notNull（如 "sk_live_abc..."，用于显示）
     - permissions: jsonb, default([])（权限范围数组）
     - lastUsedAt: timestamp("last_used_at"), nullable
     - expiresAt: timestamp("expires_at"), nullable
     - createdAt: timestamp defaultNow
   - 添加 relation: 属于一个 organization

3. 更新 index.ts：导出所有新内容

验收标准：jsonb 字段类型正确，所有 relation 引用正确。
```

---

### Plan 1.5 — 数据库迁移生成 + Seed 脚本

**目标**：生成初始迁移文件，创建种子数据脚本

**产出文件**：

- `packages/database/src/migrations/`（自动生成）
- `packages/database/src/seed.ts`

**Prompt**:

```
你是一个资深全栈工程师。为 database 包创建 seed 脚本，并生成数据库迁移。

1. 先运行迁移生成：
   cd packages/database && pnpm db:generate
   这会根据 schema 自动生成 SQL 迁移文件到 src/migrations/

2. 创建 src/seed.ts：
   - 导入 db 和所有 schema
   - 创建以下种子数据：
     a. Super Admin 用户：
        - email: "admin@flashkit.dev"
        - name: "Super Admin"
        - globalRole: "super_admin"
        - emailVerified: true
     b. 测试用户：
        - email: "user@flashkit.dev"
        - name: "Test User"
        - globalRole: "user"
        - emailVerified: true
     c. 为 Super Admin 创建 personal org：
        - name: "Personal"
        - slug: "admin-personal"
        - isPersonal: true
     d. 为 Test User 创建 personal org：
        - name: "Personal"
        - slug: "user-personal"
        - isPersonal: true
     e. 创建一个团队组织：
        - name: "Acme Inc"
        - slug: "acme"
        - isPersonal: false
        - owner: Super Admin
     f. 为两个用户创建 Acme 的 membership：
        - Admin: role "owner"
        - Test User: role "member"
   - 使用 upsert 逻辑（onConflictDoNothing），可重复运行
   - 脚本末尾 process.exit(0)

3. 确保 seed.ts 可以通过 pnpm db:seed 运行（package.json 中已配置 tsx）

验收标准：
- pnpm db:generate 成功生成迁移文件
- docker-compose up -d 后，pnpm db:migrate 成功
- pnpm db:seed 成功插入数据
- pnpm db:studio 可以在浏览器中看到数据
```

---

## Phase 2: 认证系统

### Plan 2.1 — Auth 包核心配置

**目标**：创建 `packages/auth/`，配置 Better Auth 服务端

**产出文件**：

- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/auth/src/server.ts`
- `packages/auth/src/client.ts`
- `packages/auth/src/index.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 auth 包，配置 Better Auth。

路径：packages/auth/

1. package.json：
   - name: "@flash-kit/auth"
   - private: true
   - exports:
     - ".": "./src/index.ts"
     - "./server": "./src/server.ts"
     - "./client": "./src/client.ts"
     - "./session": "./src/session.ts"
     - "./guards": "./src/guards.ts"
   - dependencies:
     - better-auth "^1"
     - @flash-kit/database (workspace:*)
     - @flash-kit/env (workspace:*)

2. src/server.ts：
   - 使用 betterAuth() 创建 auth 实例
   - database: drizzleAdapter(db, { provider: 'pg', schema 映射到我们的表 })
   - session: strategy 'database', maxAge 30天, cookieOptions httpOnly+secure+sameSite
   - emailAndPassword: enabled, requireEmailVerification true
     - sendResetPassword: async 占位函数（console.log 替代，后续 Plan 接入邮件）
     - sendVerificationEmail: async 占位函数
   - socialProviders: google 和 github（从 env 读取 clientId/clientSecret）
   - plugins: 暂时为空数组（后续 Plan 逐步添加 organization, passkey, twoFactor, magicLink）
   - 导出 auth 和 Auth 类型

3. src/client.ts：
   - 使用 createAuthClient() 创建客户端实例
   - baseURL 从 NEXT_PUBLIC_APP_URL 读取
   - plugins: 暂时为空数组
   - 导出 authClient, signIn, signUp, signOut, useSession

4. src/index.ts：
   - 导出 server 和 client 的关键内容

注意：这个 Plan 先不加插件（organization, passkey, 2FA, magic-link），保持最小可运行状态。后续 Plan 逐步添加。
验收标准：TypeScript 编译通过，auth 实例类型正确。
```

---

### Plan 2.2 — Auth Session 工具函数

**目标**：创建服务端获取 session 的工具函数

**产出文件**：

- `packages/auth/src/session.ts`
- `packages/auth/src/guards.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 auth 包的 session 工具函数。

路径：packages/auth/src/

1. session.ts：
   - getCurrentUser(): 使用 React cache 包裹
     - 调用 auth.api.getSession({ headers: await headers() })
     - 返回 session.user 或 null
   - getCurrentSession(): 使用 React cache 包裹
     - 返回完整 session 或 null
   - requireAuth(): 调用 getCurrentUser()
     - 如果 null，调用 redirect('/sign-in')
     - 返回 user（非 null）
   - getOrgContext(orgSlug: string):
     - 获取 currentUser
     - 查询 organization by slug
     - 查询 membership by user+org
     - 查询 subscription by org
     - 如果任何一步失败返回 null
     - 返回 { user, org, membership, subscription }

2. guards.ts：
   - requireOrgRole(orgId: string, allowedRoles: OrgRole[]):
     - 获取 currentUser，无则 throw Unauthorized
     - 查询 membership，无则 throw Forbidden
     - 角色不在 allowedRoles 中，throw Forbidden
     - 返回 { user, membership }
   - requireSuperAdmin():
     - 获取 currentUser，检查 globalRole === 'super_admin'
     - 否则 throw Forbidden
   - OrgRole 类型: 'owner' | 'admin' | 'member' | 'viewer'

所有数据库查询使用 @flash-kit/database 导出的 db 和 schema。
使用 next/headers 的 headers() 和 next/navigation 的 redirect()。
验收标准：类型推断正确，cache 包裹正确，错误处理完整。
```

---

### Plan 2.3 — 挂载 Auth API 路由到 Next.js

**目标**：在 apps/web 中创建 auth API 路由

**产出文件**：

- `apps/web/app/api/auth/[...all]/route.ts`
- `apps/web/proxy.ts`

**Prompt**:

```
你是一个资深全栈工程师。将 Better Auth 挂载到 Next.js 16 应用中。

1. apps/web/app/api/auth/[...all]/route.ts：
   - 从 @flash-kit/auth/server 导入 auth
   - 从 better-auth/next-js 导入 toNextJsHandler
   - 导出 GET 和 POST handler

2. apps/web/proxy.ts：
   - 使用 Next.js 16 的 createProxy API
   - beforeRequest 钩子中实现路由保护：

   公开路由（直接放行）：
   - / (首页)
   - /pricing, /blog, /blog/*, /docs, /docs/*
   - /changelog, /changelog/*
   - /sign-in, /sign-up, /forgot-password, /verify-email, /invite/*
   - /api/auth/* (Better Auth 自己的端点)
   - /api/webhooks/* (Stripe 等 webhook)

   需要认证的路由（检查 session）：
   - /dashboard, /dashboard/*
   - /[orgSlug]/* (动态组织路由)
   - /account, /account/*

   如果无 session：重定向到 /sign-in?callbackUrl=当前路径

   Super Admin 路由：
   - /admin, /admin/*
   - 需要 session 且 user.globalRole === 'super_admin'
   - 否则返回 404（不暴露 admin 路由存在）

注意：proxy.ts 是 Next.js 16 的新特性，替代旧的 middleware.ts。
如果 Next.js 16.2 的 proxy API 还未稳定，fallback 使用 middleware.ts。
验收标准：公开页面可直接访问，Dashboard 路由未登录时重定向到 sign-in。
```

---

### Plan 2.4 — 认证页面 UI

**目标**：创建 sign-in、sign-up、forgot-password 页面

**产出文件**：

- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(auth)/sign-in/page.tsx`
- `apps/web/app/(auth)/sign-in/sign-in-form.tsx`
- `apps/web/app/(auth)/sign-up/page.tsx`
- `apps/web/app/(auth)/sign-up/sign-up-form.tsx`
- `apps/web/app/(auth)/forgot-password/page.tsx`
- `apps/web/app/(auth)/forgot-password/forgot-password-form.tsx`
- `apps/web/app/(auth)/verify-email/page.tsx`

**Prompt**:

```
你是一个资深全栈工程师。创建认证相关的 UI 页面。

所有页面使用 @flash-kit/ui 的 shadcn 组件：Button, Input, Label, Card, Separator。
使用 @flash-kit/auth/client 的 signIn, signUp 方法。

1. (auth)/layout.tsx：
   - 居中布局，max-w-md
   - 顶部显示 Logo/品牌名
   - 不显示 Dashboard 导航

2. sign-in/page.tsx (Server Component)：
   - 标题 "Welcome back"
   - 渲染 SignInForm

3. sign-in/sign-in-form.tsx (Client Component 'use client')：
   - OAuth 按钮区：Google, GitHub（调用 signIn.social）
   - Separator "or continue with"
   - Email + Password 表单（调用 signIn.email）
   - 错误提示（红色 text-destructive）
   - Loading 状态（button disabled + spinner）
   - 底部链接：Forgot password? / Create account
   - 登录成功后 router.push(callbackUrl || '/dashboard')

4. sign-up/page.tsx + sign-up-form.tsx：
   - 类似 sign-in，但使用 signUp.email
   - 额外字段：name
   - 注册成功后跳转到 /verify-email
   - 底部链接：Already have an account? Sign in

5. forgot-password/page.tsx + form：
   - 只有 email 输入框
   - 调用 authClient.forgetPassword
   - 提交后显示 "Check your email" 提示

6. verify-email/page.tsx：
   - 静态提示页："We sent a verification link to your email"
   - "Resend email" 按钮
   - "Back to sign in" 链接

所有表单使用 React Hook Form + Zod 验证：
- email: z.string().email()
- password: z.string().min(8)
- name: z.string().min(2)

样式要求：简洁、专业，使用 Card 包裹表单，适当的 spacing。
验收标准：所有页面可渲染，表单验证工作，类型正确。
```

---

### Plan 2.5 — Better Auth Organization 插件集成

**目标**：在 auth 包中添加 Organization 插件，与多租户系统对齐

**产出文件**：

- 更新 `packages/auth/src/server.ts`
- 更新 `packages/auth/src/client.ts`
- `packages/auth/src/hooks/on-user-created.ts`

**Prompt**:

```
你是一个资深全栈工程师。为 auth 包添加 Better Auth Organization 插件。

1. 安装依赖：@better-auth/organization

2. 更新 src/server.ts 的 plugins 数组，添加：
   organization({
     schema: {
       organization: schema.organizations,
       member: schema.memberships,
       invitation: schema.invitations,
     },
     roles: ['owner', 'admin', 'member', 'viewer'],
     defaultRole: 'member',
     maxOrganizations: 5,
     sendInvitationEmail: async ({ invitation, organization, inviter }) => {
       // 占位：console.log，后续接入邮件系统
       console.log(`Invite ${invitation.email} to ${organization.name} by ${inviter.name}`);
     },
   })

3. 更新 src/client.ts 的 plugins 数组，添加：
   organizationClient()
   并导出 organization 命名空间

4. 创建 src/hooks/on-user-created.ts：
   - 接收 user 参数 { id, email, name }
   - 读取 appConfig.accountMode
   - 如果是 'personal' 或 'hybrid'：
     - 生成 slug：取 email 的 @ 前部分 + 4位随机字符，转 kebab-case
     - 插入 organizations 表：name="Personal", isPersonal=true, ownerId=user.id
     - 插入 memberships 表：userId=user.id, orgId=新org.id, role='owner'
   - 如果是 'organization'：不做任何事

5. 在 server.ts 的 hooks.after.signUp 中调用 onUserCreated

6. 创建 packages/config/src/app.config.ts（如果还没有）：
   export const appConfig = {
     accountMode: 'hybrid' as 'personal' | 'organization' | 'hybrid',
     org: {
       maxOrgsPerUser: 5,
       defaultRole: 'member' as const,
       roles: ['owner', 'admin', 'member', 'viewer'] as const,
     },
   };

验收标准：注册新用户后，数据库中自动创建 personal organization 和对应 membership。
```

---

### Plan 2.6 — Better Auth Passkey + 2FA + Magic Link 插件

**目标**：添加高级认证方式

**产出文件**：

- 更新 `packages/auth/src/server.ts`
- 更新 `packages/auth/src/client.ts`
- `apps/web/app/(auth)/two-factor/page.tsx`
- `apps/web/app/(auth)/two-factor/two-factor-form.tsx`

**Prompt**:

```
你是一个资深全栈工程师。为 auth 包添加 Passkey、2FA、Magic Link 插件。

1. 安装依赖：@better-auth/passkey, @better-auth/two-factor, @better-auth/magic-link

2. 更新 src/server.ts plugins 数组，追加：
   - passkey({
       rpName: 'Flash Kit',
       rpId: process.env.NODE_ENV === 'production' ? new URL(env.NEXT_PUBLIC_APP_URL).hostname : 'localhost',
       origin: env.NEXT_PUBLIC_APP_URL,
     })
   - twoFactor({
       issuer: 'Flash Kit',
       backupCodeCount: 10,
     })
   - magicLink({
       sendMagicLink: async ({ email, url }) => {
         console.log(`Magic link for ${email}: ${url}`);
       },
       expiresIn: 600,
     })

3. 更新 src/client.ts plugins 数组，追加：
   - passkeyClient()
   - twoFactorClient()
   - magicLinkClient()
   导出 passkey, twoFactor 命名空间

4. 更新 sign-in-form.tsx：
   - 最顶部添加 "Sign in with Passkey" 按钮（调用 passkey.signIn()）
   - 表单底部添加 "Sign in with Magic Link" 链接
   - 登录成功后如果返回 twoFactorRequired，重定向到 /two-factor

5. 创建 (auth)/two-factor/page.tsx：
   - 标题 "Two-Factor Authentication"
   - 渲染 TwoFactorForm

6. 创建 (auth)/two-factor/two-factor-form.tsx (Client Component)：
   - 6 位数字输入框（OTP 风格，可以用 Input 简单实现）
   - 调用 twoFactor.verify({ code })
   - "Use backup code" 切换链接
   - 错误提示
   - 成功后 router.push(callbackUrl || '/dashboard')

验收标准：Passkey 按钮渲染，2FA 页面可访问，Magic Link 占位函数被调用。
```

---

## Phase 3: Dashboard Shell

### Plan 3.1 — Dashboard Layout + 侧边栏

**目标**：创建 Dashboard 壳层，包含侧边栏导航和组织切换器

**产出文件**：

- `apps/web/app/(dashboard)/layout.tsx`
- `apps/web/app/(dashboard)/dashboard/page.tsx`
- `apps/web/components/dashboard/sidebar.tsx`
- `apps/web/components/dashboard/org-switcher.tsx`
- `apps/web/components/dashboard/user-menu.tsx`
- `apps/web/components/dashboard/nav-items.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 Dashboard 壳层布局。

1. (dashboard)/layout.tsx (Server Component)：
   - 调用 requireAuth() 获取用户
   - 查询用户所有 memberships + 关联的 organizations
   - 渲染 Sidebar + main content 区域
   - 使用 shadcn Sheet 实现移动端侧边栏
   - 布局：左侧 sidebar 固定 256px，右侧 main 区域自适应

2. components/dashboard/sidebar.tsx (Client Component)：
   - 顶部：OrgSwitcher 组件
   - 中间：导航链接列表（从 nav-items.ts 读取）
     - Dashboard (LayoutDashboard icon)
     - Settings (Settings icon)
     - Members (Users icon)
     - Billing (CreditCard icon)
   - 底部：UserMenu 组件
   - 样式：使用 shadcn sidebar 的 CSS 变量（sidebar-background, sidebar-foreground 等）

3. components/dashboard/org-switcher.tsx (Client Component)：
   - 接收 orgs 数组和 currentOrgSlug
   - 使用 shadcn DropdownMenu
   - 显示当前组织名称 + logo
   - Personal org 显示 "Personal" 标签
   - 下拉列表所有组织
   - 点击切换：router.push(/[orgSlug])
   - 底部 "+ Create Organization" 选项

4. components/dashboard/user-menu.tsx (Client Component)：
   - 显示用户 avatar + name
   - 下拉菜单：Profile, Account Settings, Sign Out
   - Sign Out 调用 signOut() from @flash-kit/auth/client

5. components/dashboard/nav-items.ts：
   - 导出导航项配置数组
   - 每项：{ label, href (相对于 orgSlug), icon (lucide-react) }

6. (dashboard)/dashboard/page.tsx (Server Component)：
   - 获取当前用户
   - 查询用户的所有组织
   - 如果只有一个组织（且是 personal），redirect 到 /[personalOrgSlug]
   - 否则显示组织选择网格

使用 @flash-kit/ui 组件：Button, Avatar, DropdownMenu, Sheet, Separator。
使用 lucide-react 图标。
验收标准：登录后可以看到 sidebar，组织切换器显示用户的组织列表。
```

---

### Plan 3.2 — 组织级 Layout + Context Provider

**目标**：创建 [orgSlug] 动态路由的 layout，注入组织上下文

**产出文件**：

- `apps/web/app/(dashboard)/[orgSlug]/layout.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/org-provider.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/page.tsx`

**Prompt**:

```
你是一个资深全栈工程师。创建组织级别的 layout 和 context provider。

1. [orgSlug]/layout.tsx (Server Component)：
   - 从 params 获取 orgSlug
   - 调用 getOrgContext(orgSlug) from @flash-kit/auth/session
   - 如果返回 null（组织不存在或用户不是成员），调用 notFound()
   - 用 OrgProvider 包裹 children，传入：
     - org: { id, name, slug, isPersonal }
     - membership: { role }
     - subscription: { status, planId, seatsQuantity } | null

2. [orgSlug]/org-provider.tsx (Client Component 'use client')：
   - 定义 OrgContext 类型接口
   - 创建 React Context
   - 导出 OrgProvider 组件
   - 导出 useOrg() hook：获取完整上下文，不存在时 throw Error
   - 导出 useOrgRole() hook：返回权限 helper：
     - role: OrgRole
     - isOwner: boolean
     - isAdmin: boolean (owner 或 admin)
     - canManageMembers: boolean (owner 或 admin)
     - canManageBilling: boolean (只有 owner)
     - canEdit: boolean (非 viewer)
     - isViewer: boolean

3. [orgSlug]/page.tsx (Server Component)：
   - 组织首页 / Dashboard 概览
   - 显示欢迎信息 "Welcome to {org.name}"
   - 如果没有 subscription，显示升级提示 CTA
   - 临时内容，后续 Plan 会替换为真实数据

验收标准：
- 访问 /acme 时正确加载 Acme 组织上下文
- 非成员访问时返回 404
- useOrg() 在 Client Component 中正确返回数据
```

---

## Phase 4: 组织管理功能

### Plan 4.1 — 创建组织 + 组织设置页面

**产出文件**：

- `apps/web/app/(dashboard)/dashboard/new-org/page.tsx`
- `apps/web/app/(dashboard)/dashboard/new-org/create-org-form.tsx`
- `apps/web/app/(dashboard)/dashboard/new-org/actions.ts`
- `apps/web/app/(dashboard)/[orgSlug]/settings/layout.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/general/page.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/general/org-settings-form.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/general/actions.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建组织创建和设置页面。

1. dashboard/new-org/page.tsx：标题 "Create Organization"
2. dashboard/new-org/create-org-form.tsx (Client Component)：
   - 字段：Organization Name (text), Slug (text, 自动从 name 生成 kebab-case)
   - Slug 支持手动编辑，用 debounce 检查唯一性
   - 使用 Server Action 创建组织
   - 创建成功后 router.push(/[newSlug])

3. dashboard/new-org/actions.ts ('use server')：
   - createOrganization(name, slug):
     - requireAuth()
     - 验证 slug 格式（只允许 a-z, 0-9, -）
     - 检查 slug 唯一性
     - 检查用户组织数量是否超限
     - 插入 organizations + memberships (role: 'owner')
     - 返回 { success: true, slug }
   - checkSlugAvailability(slug):
     - 查询 slug 是否已存在
     - 返回 { available: boolean }

4. [orgSlug]/settings/layout.tsx：
   - 设置页面的子导航（tabs 或 sidebar）
   - 导航项：General, Members, Billing, API Keys
   - 根据 useOrgRole() 控制哪些 tab 可见

5. [orgSlug]/settings/general/page.tsx：
   - 检查权限：只有 owner 和 admin 可编辑
   - 显示 OrgSettingsForm

6. [orgSlug]/settings/general/org-settings-form.tsx：
   - 编辑：Organization Name, Slug, Logo（暂用文本输入）
   - Danger Zone: Delete Organization（只有 owner）
   - 删除确认对话框（输入组织名确认）

7. [orgSlug]/settings/general/actions.ts ('use server')：
   - updateOrganization(orgId, data):
     - requireOrgRole(orgId, ['owner', 'admin'])
     - 如果改 slug，检查唯一性
     - 更新 organizations 表
   - deleteOrganization(orgId):
     - requireOrgRole(orgId, ['owner'])
     - 不允许删除 isPersonal=true 的组织
     - 删除组织（cascade 会删除 memberships, invitations, subscriptions）
     - redirect('/dashboard')

使用 React Hook Form + Zod 验证。使用 shadcn: Card, Input, Button, AlertDialog, Tabs。
验收标准：可创建新组织，可编辑组织设置，删除需要确认。
```

---

### Plan 4.2 — 成员管理页面

**产出文件**：

- `apps/web/app/(dashboard)/[orgSlug]/settings/members/page.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/members/members-list.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/members/invite-member-dialog.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/members/actions.ts`
- `apps/web/app/(auth)/invite/[token]/page.tsx`
- `apps/web/app/(auth)/invite/[token]/actions.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建成员管理功能。

1. settings/members/page.tsx (Server Component)：
   - 权限检查：requireOrgRole(orgId, ['owner', 'admin'])
   - 查询所有 memberships + 关联 users
   - 查询所有 pending invitations
   - 渲染 MembersList

2. settings/members/members-list.tsx (Client Component)：
   - 显示成员列表 Table：Avatar, Name, Email, Role, Joined At, Actions
   - 每行的 Actions 下拉菜单：
     - Change Role（owner 可改所有人，admin 不能改 owner）
     - Remove Member（owner 可移除所有人，admin 不能移除 owner/admin）
     - 不能操作自己
   - 底部 Pending Invitations 区域：
     - 显示未接受的邀请：Email, Role, Sent At, Expires At
     - Revoke 按钮
   - 顶部 "Invite Member" 按钮

3. settings/members/invite-member-dialog.tsx (Client Component)：
   - shadcn Dialog
   - 字段：Email, Role (Select: member/admin/viewer)
   - owner 才能邀请 admin
   - 使用 Server Action 发送邀请

4. settings/members/actions.ts ('use server')：
   - inviteMember(orgId, email, role):
     - requireOrgRole(orgId, ['owner', 'admin'])
     - admin 不能邀请 owner/admin 角色
     - 检查用户是否已是成员
     - 检查是否有未过期的 pending 邀请
     - 生成 crypto.randomUUID() 作为 token
     - 插入 invitations 表，expiresAt = 7 天后
     - console.log 邀请链接（后续接入邮件）
     - revalidatePath
   - changeMemberRole(orgId, memberId, newRole):
     - 权限检查 + 角色层级验证
     - 更新 memberships 表
   - removeMember(orgId, memberId):
     - 权限检查
     - 不能移除自己（必须先转让 owner）
     - 删除 membership
     - 触发 onMembershipChange（占位函数，后续接入计费）
   - revokeInvitation(orgId, invitationId):
     - 更新 invitation status = 'revoked'

5. (auth)/invite/[token]/page.tsx：
   - 接受邀请页面
   - 查询 invitation by token
   - 如果过期或已用，显示错误信息
   - 如果用户已登录，显示 "Join {org.name} as {role}" 按钮
   - 如果用户未登录，显示 sign-in/sign-up 链接（带 redirect 回来）

6. (auth)/invite/[token]/actions.ts：
   - acceptInvitation(token):
     - requireAuth()
     - 查询 invitation，验证 status='pending' 且未过期
     - 创建 membership
     - 更新 invitation status='accepted'
     - redirect 到 /[orgSlug]

使用 shadcn: Table, Dialog, Select, Badge, DropdownMenu, Avatar。
角色显示用 Badge，不同颜色区分。
验收标准：可邀请成员，可更改角色，可移除成员，邀请链接可接受。
```

---

## Phase 5: 邮件系统

### Plan 5.1 — Email 包 + React Email 模板

**产出文件**：

- `packages/email/package.json`
- `packages/email/tsconfig.json`
- `packages/email/src/provider.ts`
- `packages/email/src/send.ts`
- `packages/email/src/templates/welcome.tsx`
- `packages/email/src/templates/invite.tsx`
- `packages/email/src/templates/reset-password.tsx`
- `packages/email/src/templates/magic-link.tsx`
- `packages/email/src/templates/verify-email.tsx`
- `packages/email/src/index.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建邮件包，使用 React Email + Resend。

路径：packages/email/

1. package.json：
   - name: "@flash-kit/email"
   - dependencies: resend "^4", @react-email/components "^0.0.30", react

2. src/provider.ts：
   - 创建 Resend 客户端实例
   - 从 @flash-kit/env 读取 RESEND_API_KEY

3. src/send.ts：
   - 导出 sendEmail 函数
   - 参数：{ to, subject, template, props }
   - 使用 Resend 的 send 方法
   - from 地址从 env 或配置读取
   - 开发环境下 console.log 邮件内容（不实际发送，除非配置了真实 key）

4. 邮件模板（使用 @react-email/components）：
   每个模板都是 React 组件，接收 props，返回 Email 布局。
   统一风格：白底，品牌色 header，清晰的 CTA 按钮。

   a. welcome.tsx：
      - props: { name: string }
      - 欢迎标题 + 简短介绍 + "Get Started" 按钮

   b. invite.tsx：
      - props: { orgName, inviterName, role, acceptUrl }
      - "{inviterName} invited you to join {orgName}"
      - 显示角色
      - "Accept Invitation" CTA 按钮

   c. reset-password.tsx：
      - props: { name, resetUrl }
      - "Reset your password" + 链接（10 分钟过期提示）

   d. magic-link.tsx：
      - props: { loginUrl }
      - "Sign in to SaaS Kit" + "Click to sign in" 按钮

   e. verify-email.tsx：
      - props: { name, verifyUrl }
      - "Verify your email address" + 按钮

5. 更新 @flash-kit/auth/server.ts 中所有占位的 console.log，替换为调用 sendEmail：
   - sendResetPassword → 使用 reset-password 模板
   - sendVerificationEmail → 使用 verify-email 模板
   - magicLink.sendMagicLink → 使用 magic-link 模板
   - organization.sendInvitationEmail → 使用 invite 模板

验收标准：每个模板可独立渲染，sendEmail 在开发环境下 console.log 邮件内容。
```

---

## Phase 6: 计费系统

### Plan 6.1 — Billing 包 + 计划配置 Schema

**产出文件**：

- `packages/billing/package.json`
- `packages/billing/tsconfig.json`
- `packages/billing/src/plans.ts`
- `packages/billing/src/types.ts`
- `packages/billing/src/index.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 billing 包的计划定义系统。

路径：packages/billing/

1. package.json：
   - name: "@flash-kit/billing"
   - exports: ".", "./plans", "./stripe", "./ui/*"
   - dependencies: stripe "^17", @flash-kit/database, @flash-kit/env

2. src/types.ts：定义计费相关类型
   - BillingProvider: 'stripe' | 'paddle' | 'lemonsqueezy'
   - PlanInterval: 'month' | 'year'
   - LineItemType: 'flat' | 'per_seat' | 'metered' | 'tiered'
   - LineItem: { id, type, name, priceId (env variable name), amount?, tiers?, optional?, freeQuantity? }
   - Plan: { id, interval, lineItems }
   - Product: { id, name, description, features (string[]), plans, badge?, recommended? }
   - BillingConfig: { provider, products }

3. src/plans.ts：
   - 导出 billingConfig: BillingConfig
   - 定义三个产品示例：
     a. Free:
        - features: ["1 project", "100 AI credits/month", "Community support"]
        - 一个 plan: monthly, 无 lineItems（free plan 没有价格）
     b. Pro ($29/month, $290/year):
        - features: ["Unlimited projects", "10,000 AI credits/month", "Priority support", "Team collaboration"]
        - monthly plan: flat $29
        - yearly plan: flat $290 (badge: "Save 17%")
        - recommended: true
     c. Enterprise ($99/month, $990/year):
        - features: ["Everything in Pro", "Unlimited AI credits", "SSO / SAML", "Dedicated support", "Custom contracts"]
        - monthly plan: flat base $99 + per_seat $15 (freeQuantity: 1)
        - yearly plan: flat base $990 + per_seat $150 (freeQuantity: 1)
   - 所有 priceId 使用环境变量名（如 process.env.STRIPE_PRICE_PRO_MONTHLY），不硬编码

4. 导出 helper 函数：
   - getProductById(productId): 查找产品
   - getPlanById(productId, planId): 查找计划
   - getActiveProducts(): 返回非 free 的产品列表
   - isFreePlan(planId): 判断是否免费计划

验收标准：类型系统完整，计划配置可读性好，priceId 通过环境变量注入。
```

---

### Plan 6.2 — Stripe 集成（Checkout + Webhooks）

**产出文件**：

- `packages/billing/src/stripe/client.ts`
- `packages/billing/src/stripe/checkout.ts`
- `packages/billing/src/stripe/webhooks.ts`
- `packages/billing/src/stripe/portal.ts`
- `apps/web/app/api/webhooks/stripe/route.ts`

**Prompt**:

```
你是一个资深全栈工程师。实现 Stripe 支付集成。

1. stripe/client.ts：
   - 创建 Stripe 实例（从 env 读取 STRIPE_SECRET_KEY）

2. stripe/checkout.ts：
   - createCheckoutSession(params):
     - 参数：orgId, productId, planId, successUrl, cancelUrl
     - 查找对应的 Plan 配置
     - 查找或创建 Stripe Customer（关联到 org）
     - 创建 Checkout Session：
       - mode: 'subscription'
       - line_items: 从 plan.lineItems 映射
       - customer: stripeCustomerId
       - metadata: { orgId, productId, planId }
       - subscription_data.metadata: { orgId, productId, planId }
       - allow_promotion_codes: true
     - 返回 session.url

3. stripe/portal.ts：
   - createBillingPortalSession(orgId):
     - 查找 org 的 Stripe Customer ID
     - 创建 billing portal session
     - 返回 portal.url

4. stripe/webhooks.ts：
   - handleStripeWebhook(body, signature):
     - 验证 webhook 签名
     - 处理事件类型：
       a. checkout.session.completed:
          - 从 metadata 提取 orgId, productId, planId
          - 在 subscriptions 表创建记录
       b. customer.subscription.updated:
          - 更新 subscriptions 表（status, currentPeriod, seatsQuantity 等）
       c. customer.subscription.deleted:
          - 更新 subscription status = 'canceled'
       d. invoice.payment_failed:
          - 更新 subscription status = 'past_due'
     - 每个事件处理函数单独定义，便于测试

5. apps/web/app/api/webhooks/stripe/route.ts：
   - POST handler
   - 读取 raw body（不解析 JSON）
   - 获取 stripe-signature header
   - 调用 handleStripeWebhook
   - 返回 200

注意：webhook route 不能有 body parser，使用 request.text() 获取原始 body。
验收标准：Checkout 可创建 session URL，webhook 可处理基本事件。
```

---

### Plan 6.3 — 计费 UI 组件 + 设置页面

**产出文件**：

- `packages/billing/src/ui/pricing-table.tsx`
- `packages/billing/src/ui/plan-picker.tsx`
- `packages/billing/src/ui/current-plan-card.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/billing/page.tsx`
- `apps/web/app/(dashboard)/[orgSlug]/settings/billing/actions.ts`
- `apps/web/app/(marketing)/pricing/page.tsx`

**Prompt**:

```
你是一个资深全栈工程师。创建计费相关的 UI 组件和页面。

1. packages/billing/src/ui/pricing-table.tsx (Client Component)：
   - 从 billingConfig 读取产品列表
   - 显示 Monthly / Yearly 切换器
   - 每个产品一个 Card：
     - 产品名 + 描述
     - 价格显示（月/年切换）
     - features 列表（✓ 图标）
     - recommended 产品高亮显示 + badge
     - CTA 按钮：
       - Free: "Get Started" → 注册链接
       - 付费: "Subscribe" → 触发 checkout
       - 当前计划: "Current Plan" disabled

2. packages/billing/src/ui/current-plan-card.tsx (Client Component)：
   - 显示当前订阅信息：
     - Plan name + status badge
     - 下次续费日期
     - 席位数量（如适用）
   - 操作按钮：
     - "Manage Subscription" → 打开 Stripe Portal
     - "Change Plan" → 显示 PlanPicker

3. apps/web/(dashboard)/[orgSlug]/settings/billing/page.tsx：
   - 权限检查：只有 owner 可管理计费
   - 显示 CurrentPlanCard（如果有订阅）
   - 显示 "No active plan" + PricingTable（如果没有订阅）

4. apps/web/(dashboard)/[orgSlug]/settings/billing/actions.ts：
   - createCheckout(orgId, productId, planId): Server Action
     - requireOrgRole(orgId, ['owner'])
     - 调用 createCheckoutSession
     - redirect 到 checkout URL
   - openBillingPortal(orgId): Server Action
     - requireOrgRole(orgId, ['owner'])
     - 调用 createBillingPortalSession
     - redirect 到 portal URL

5. apps/web/(marketing)/pricing/page.tsx：
   - 公开定价页面（不需要登录）
   - 渲染 PricingTable
   - CTA 按钮对于未登录用户导向 /sign-up

验收标准：Pricing 表格正确显示所有计划，月/年切换工作，按钮链接正确。
```

---

## Phase 7: 国际化

### Plan 7.1 — i18n 包 + 基础翻译

**产出文件**：

- `packages/i18n/package.json`
- `packages/i18n/tsconfig.json`
- `packages/i18n/src/config.ts`
- `packages/i18n/src/server.ts`
- `packages/i18n/src/client.ts`
- `packages/i18n/locales/en/common.json`
- `packages/i18n/locales/en/auth.json`
- `packages/i18n/locales/en/billing.json`
- `packages/i18n/locales/en/dashboard.json`
- `packages/i18n/locales/zh/common.json`
- `packages/i18n/locales/zh/auth.json`
- `packages/i18n/locales/ja/common.json`
- `packages/i18n/locales/ja/auth.json`

**Prompt**:

```
你是一个资深全栈工程师。创建 i18n 国际化包。

路径：packages/i18n/

使用 next-intl 作为底层库。

1. package.json：
   - name: "@flash-kit/i18n"
   - exports: ".", "./server", "./client", "./config"
   - dependencies: next-intl "^4"

2. src/config.ts：
   - 导出 locales: ['en', 'zh', 'ja'] as const
   - 导出 defaultLocale: 'en'
   - 导出 LocaleType 类型

3. src/server.ts：
   - getTranslations(namespace): 封装 next-intl 的 getTranslations
   - getLocale(): 获取当前 locale
   - getMessages(): 加载对应 locale 的所有消息

4. src/client.ts：
   - useTranslation(namespace): 封装 next-intl 的 useTranslations
   - LocaleSwitcher 组件：切换语言的下拉菜单

5. 翻译文件（JSON 格式）：
   - en/common.json: 通用文案（Save, Cancel, Delete, Confirm, Loading, Error, Success, Back, Next, Submit...）
   - en/auth.json: 认证相关（Sign In, Sign Up, Email, Password, Forgot Password...）
   - en/billing.json: 计费相关（Subscribe, Current Plan, Upgrade, Cancel, Free, Pro, Enterprise...）
   - en/dashboard.json: Dashboard 相关（Dashboard, Settings, Members, Billing, Profile...）
   - zh/ 和 ja/: 至少翻译 common.json 和 auth.json

验收标准：Server Component 和 Client Component 都能正确获取翻译文本。
```

---

## Phase 8: 营销页面

### Plan 8.1 — Landing Page

**产出文件**：

- `apps/web/app/(marketing)/layout.tsx`
- `apps/web/app/(marketing)/page.tsx`（替换临时首页）
- `apps/web/components/marketing/header.tsx`
- `apps/web/components/marketing/footer.tsx`
- `apps/web/components/marketing/hero.tsx`
- `apps/web/components/marketing/features.tsx`
- `apps/web/components/marketing/testimonials.tsx`
- `apps/web/components/marketing/cta.tsx`

**Prompt**:

```
你是一个资深全栈工程师 + UI设计专家。创建高转化率的 SaaS Landing Page。

1. (marketing)/layout.tsx：
   - 顶部 Header + 底部 Footer
   - 不包含 Dashboard sidebar

2. components/marketing/header.tsx：
   - Logo（左侧）
   - 导航链接：Features, Pricing, Blog, Docs
   - 右侧：Sign In / Get Started 按钮
   - Sticky header，滚动时加毛玻璃背景
   - 移动端汉堡菜单

3. components/marketing/hero.tsx：
   - 大标题（渐变色文字）："Ship your SaaS in days, not months"
   - 副标题：简短描述产品价值
   - 两个 CTA 按钮：Get Started (primary), View Demo (outline)
   - 下方展示产品截图/mockup（用 placeholder）
   - 可选：badge "New: AI-powered features"

4. components/marketing/features.tsx：
   - 网格布局（2-3 列）
   - 每个 feature card：icon + title + description
   - 至少 6 个 features：
     - Authentication (Shield icon)
     - Multi-tenancy (Building icon)
     - Billing (CreditCard icon)
     - AI-Ready (Bot icon)
     - i18n (Globe icon)
     - Admin Panel (Settings icon)

5. components/marketing/testimonials.tsx：
   - 3-4 个 testimonial cards
   - Avatar + Name + Title + Quote
   - 使用占位数据

6. components/marketing/cta.tsx：
   - 底部 CTA 区域
   - 大标题 + "Start Building Today" 按钮
   - 简短 reassurance（"No credit card required"）

7. components/marketing/footer.tsx：
   - 多列 footer：Product, Company, Legal, Social
   - 底部版权信息

样式要求：
- 现代、专业、高端感
- 使用 Tailwind CSS + shadcn 组件
- 支持 dark mode
- 响应式（mobile-first）
- 适当使用动画（但不过度）

验收标准：页面在桌面和移动端都美观，所有链接指向正确路由。
```

---

### Plan 8.2 — Blog 系统 (MDX)

**产出文件**：

- `apps/web/app/(marketing)/blog/page.tsx`
- `apps/web/app/(marketing)/blog/[slug]/page.tsx`
- `apps/web/content/blog/` 目录 + 2 篇示例文章
- `apps/web/lib/blog.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 MDX 驱动的博客系统。

使用 @next/mdx 或 next-mdx-remote（推荐 next-mdx-remote/rsc 用于 Server Components）。

1. lib/blog.ts：
   - 从 content/blog/ 目录读取 .mdx 文件
   - 解析 frontmatter（title, description, date, author, image, tags）
   - 导出函数：
     - getAllPosts(): 返回所有文章列表（按日期降序）
     - getPostBySlug(slug): 返回单篇文章 + MDX 内容
   - 使用 gray-matter 解析 frontmatter

2. blog/page.tsx (Server Component)：
   - 博客列表页
   - 显示所有文章的 card（image, title, description, date, author）
   - 网格布局

3. blog/[slug]/page.tsx (Server Component)：
   - generateStaticParams: 预生成所有文章路由
   - generateMetadata: SEO meta tags
   - 渲染 MDX 内容（使用自定义组件映射 shadcn 样式）
   - 文章顶部：标题, 日期, 作者, 标签
   - 底部：返回博客列表链接

4. content/blog/：
   - getting-started.mdx: "Getting Started with SaaS Kit"（教程风格）
   - why-nextjs-16.mdx: "Why We Chose Next.js 16"（技术博客风格）
   - 每篇包含完整 frontmatter

5. 安装依赖：next-mdx-remote, gray-matter, reading-time

验收标准：博客列表页显示文章，点击进入文章详情，MDX 渲染正确。
```

---

## Phase 9: Admin 面板

### Plan 9.1 — Super Admin Dashboard

**产出文件**：

- `apps/web/app/(admin)/layout.tsx`
- `apps/web/app/(admin)/admin/page.tsx`
- `apps/web/app/(admin)/admin/users/page.tsx`
- `apps/web/app/(admin)/admin/organizations/page.tsx`
- `apps/web/app/(admin)/admin/subscriptions/page.tsx`
- `apps/web/app/(admin)/admin/actions.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 Super Admin 管理面板。

1. (admin)/layout.tsx：
   - requireSuperAdmin() 权限检查
   - 独立的 Admin sidebar 导航：
     - Overview (stats dashboard)
     - Users
     - Organizations
     - Subscriptions
   - 不同于普通 Dashboard 的布局/配色（可以用不同的 accent color）

2. admin/page.tsx — Overview Dashboard：
   - 统计卡片：Total Users, Total Orgs, Active Subscriptions, MRR
   - 使用 SQL count/sum 查询
   - 最近注册用户列表（最近 10 个）
   - 最近订阅变更列表（最近 10 个）

3. admin/users/page.tsx：
   - 用户列表 Table（分页）：Name, Email, Role, Created At, Status
   - 搜索框（按 email 搜索）
   - 每行 Actions：
     - View Details
     - Impersonate（以该用户身份登录，用于调试）
     - Ban / Unban
     - Change Global Role
   - 点击用户显示详情：关联的组织、订阅信息

4. admin/organizations/page.tsx：
   - 组织列表 Table：Name, Slug, Owner, Members Count, Plan, Created At
   - 搜索框
   - 每行 Actions：View Details, Delete

5. admin/subscriptions/page.tsx：
   - 订阅列表：Org Name, Plan, Status, Provider, Current Period, Seats
   - 按 status 筛选

6. admin/actions.ts ('use server')：
   - impersonateUser(userId): 创建该用户的 session（Super Admin 专用）
   - banUser(userId): 禁用用户（revoke 所有 session）
   - unbanUser(userId)
   - changeUserRole(userId, newRole)
   - deleteOrganization(orgId)
   所有 action 都调用 requireSuperAdmin()

使用 shadcn: Table, Badge, Input (搜索), Card (统计), Pagination。
验收标准：Admin 面板只有 super_admin 可访问，所有 CRUD 操作工作正常。
```

---

## Phase 10: 个人账户设置

### Plan 10.1 — Account Settings 页面

**产出文件**：

- `apps/web/app/(dashboard)/account/layout.tsx`
- `apps/web/app/(dashboard)/account/profile/page.tsx`
- `apps/web/app/(dashboard)/account/profile/profile-form.tsx`
- `apps/web/app/(dashboard)/account/profile/actions.ts`
- `apps/web/app/(dashboard)/account/security/page.tsx`
- `apps/web/app/(dashboard)/account/security/change-password-form.tsx`
- `apps/web/app/(dashboard)/account/security/two-factor-setup.tsx`
- `apps/web/app/(dashboard)/account/security/passkey-manager.tsx`
- `apps/web/app/(dashboard)/account/security/active-sessions.tsx`
- `apps/web/app/(dashboard)/account/security/actions.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建个人账户设置页面。

1. account/layout.tsx：
   - 子导航 tabs: Profile, Security
   - requireAuth()

2. account/profile/page.tsx + profile-form.tsx：
   - 编辑个人信息：Name, Avatar URL（文本输入，后续改为上传）
   - 显示邮箱（不可编辑）
   - "Delete Account" danger zone（确认对话框）

3. account/security/page.tsx：
   - 分为多个 section card：

   a. Change Password:
      - 当前密码 + 新密码 + 确认新密码
      - 调用 authClient.changePassword

   b. Two-Factor Authentication:
      - 未启用：显示 "Enable 2FA" 按钮
        - 点击后调用 twoFactor.enable()，显示 QR code
        - 输入 TOTP code 确认
        - 显示 backup codes（提醒用户保存）
      - 已启用：显示 "Disable 2FA" 按钮（需要输入当前 TOTP 确认）

   c. Passkeys:
      - 列出已注册的 passkeys（name, deviceType, createdAt）
      - "Add Passkey" 按钮（调用 passkey.register()）
      - 每个 passkey 有 "Remove" 按钮（需要其他验证方式确认）

   d. Active Sessions:
      - 列出所有活跃 session（IP, User Agent, Last Active, Created At）
      - 当前 session 标记 "This device"
      - "Revoke" 按钮（不能 revoke 当前 session）
      - "Revoke All Other Sessions" 按钮

4. actions.ts ('use server')：
   - updateProfile(name, avatarUrl): 更新 users 表
   - deleteAccount(): 删除用户（cascade 删除所有关联数据），但不能删除 super_admin
   - revokeSession(sessionId): 删除指定 session
   - revokeAllOtherSessions(): 删除除当前 session 外的所有 session

验收标准：所有安全功能（密码修改、2FA、Passkeys、Session 管理）可操作。
```

---

## Phase 11: 可观测性 + 测试

### Plan 11.1 — Analytics 包 (Sentry + PostHog)

**产出文件**：

- `packages/analytics/package.json`
- `packages/analytics/src/sentry.ts`
- `packages/analytics/src/posthog.ts`
- `packages/analytics/src/events.ts`
- `packages/analytics/src/index.ts`
- 更新 `apps/web/app/layout.tsx` 注入 Provider

**Prompt**:

```
你是一个资深全栈工程师。创建可观测性包。

路径：packages/analytics/

1. sentry.ts：
   - 初始化 Sentry（@sentry/nextjs）
   - 配置 dsn, tracesSampleRate, environment
   - 导出 captureException, setUser

2. posthog.ts：
   - PostHog 客户端初始化（posthog-js）
   - 导出 PostHogProvider React 组件
   - 导出 identify, capture, reset 函数

3. events.ts：
   - 定义类型安全的事件常量：
     - USER_SIGNED_UP, USER_SIGNED_IN
     - ORG_CREATED, MEMBER_INVITED
     - SUBSCRIPTION_CREATED, SUBSCRIPTION_CANCELED
   - 导出 trackEvent(eventName, properties) 函数
     - 内部调用 posthog.capture

4. 更新 apps/web/app/layout.tsx：
   - 包裹 PostHogProvider
   - 初始化 Sentry

5. 创建 apps/web/instrumentation.ts（Next.js instrumentation hook）：
   - 服务端 Sentry 初始化

验收标准：页面浏览自动追踪，错误自动上报到 Sentry。
```

---

### Plan 11.2 — E2E 测试 (Playwright)

**产出文件**：

- `apps/web/playwright.config.ts`
- `apps/web/tests/e2e/auth.spec.ts`
- `apps/web/tests/e2e/organization.spec.ts`
- `apps/web/tests/e2e/billing.spec.ts`

**Prompt**:

```
你是一个资深全栈工程师。创建 Playwright E2E 测试。

1. playwright.config.ts：
   - baseURL: http://localhost:3000
   - webServer: pnpm dev
   - projects: chromium, firefox（可选 webkit）
   - retries: CI 环境 2 次

2. tests/e2e/auth.spec.ts：
   - 测试注册流程：填写表单 → 跳转验证页
   - 测试登录流程：正确密码 → 跳转 dashboard
   - 测试登录失败：错误密码 → 显示错误信息
   - 测试未登录访问 dashboard → 重定向 sign-in

3. tests/e2e/organization.spec.ts：
   - 测试创建组织：填写 name → 自动生成 slug → 创建成功
   - 测试组织切换：点击不同组织 → URL 变化
   - 测试成员邀请：填写 email + role → 发送邀请

4. tests/e2e/billing.spec.ts：
   - 测试 pricing 页面：月/年切换 → 价格变化
   - 测试 checkout 流程（使用 Stripe test mode）

使用 test fixtures 预置测试用户和组织。
验收标准：pnpm test:e2e 在本地通过所有测试。
```

---

## Phase 12: AI Agent 支持

### Plan 12.1 — AI Agent Rules + MCP 配置

**产出文件**：

- `AGENTS.md`
- `.cursorrules`
- `.claude/settings.json`（如有）

**Prompt**:

```
你是一个资深全栈工程师。创建 AI Agent 支持文件，帮助 Claude Code、Cursor 等 AI 工具理解项目结构。

1. AGENTS.md（Claude Code 专用）：
   - 项目概述：这是一个 Next.js 16 SaaS Starter Kit
   - 技术栈概要
   - Monorepo 结构说明
   - 关键约定：
     - Server Components 优先，只在需要交互时用 'use client'
     - 数据库查询只在 Server Component/Server Action/API Route 中
     - 权限检查使用 requireOrgRole / requireSuperAdmin
     - 所有表单使用 React Hook Form + Zod
     - UI 组件从 @flash-kit/ui 导入
     - 样式使用 Tailwind CSS，不写自定义 CSS
     - 新功能放在 [orgSlug]/[feature]/ 目录下
   - 常用命令
   - 文件命名约定
   - import 路径约定

2. .cursorrules（Cursor 专用）：
   - 类似内容，但格式适配 Cursor 的 rules 格式
   - 强调不要使用 Pages Router
   - 强调不要使用 getServerSideProps / getStaticProps
   - 强调使用 Server Actions 而不是 API Routes（表单提交场景）

验收标准：AI Agent 按照规则生成的代码符合项目架构约定。
```

---

## Phase 13: 最终集成 + 收尾

### Plan 13.1 — SEO + Metadata + Sitemap

**产出文件**：

- `apps/web/app/sitemap.ts`
- `apps/web/app/robots.ts`
- `apps/web/app/manifest.ts`
- 更新各页面的 generateMetadata

**Prompt**:

```
你是一个资深全栈工程师。配置 SEO 相关文件。

1. app/sitemap.ts：
   - 动态生成 sitemap
   - 包含所有公开页面：/, /pricing, /blog/*, /docs/*
   - 从 content/blog/ 读取所有博客 slug

2. app/robots.ts：
   - 允许所有爬虫
   - Disallow: /dashboard, /admin, /api
   - Sitemap 指向正确 URL

3. app/manifest.ts：
   - PWA manifest
   - name, short_name, icons, theme_color, background_color

4. 更新 app/layout.tsx 的 metadata：
   - title template: "%s | SaaS Kit"
   - description
   - openGraph 配置
   - twitter card 配置

5. 为每个公开页面添加 generateMetadata：
   - /pricing: "Pricing | SaaS Kit"
   - /blog: "Blog | SaaS Kit"
   - /blog/[slug]: 从 frontmatter 读取 title 和 description

验收标准：Lighthouse SEO 评分 > 90。
```

---

### Plan 13.2 — README + 文档

**产出文件**：

- `README.md`
- `CONTRIBUTING.md`
- `LICENSE`

**Prompt**:

```
你是一个资深技术文档编写者。为 SaaS Kit 项目创建文档。

1. README.md：
   - 项目标题 + Badge（TypeScript, Next.js 16, License）
   - 一句话描述
   - Features 列表
   - Quick Start（5 步上手）
   - 项目结构概览
   - Tech Stack 表格
   - 截图占位
   - Environment Variables 说明
   - 部署指南（Vercel 一键部署）
   - 链接：Documentation, Contributing, License

2. CONTRIBUTING.md：
   - 开发环境设置
   - 分支策略
   - Commit 规范（Conventional Commits）
   - PR 流程
   - 代码风格（Biome 自动格式化）

3. LICENSE：MIT License

验收标准：README 信息完整，新开发者能照着 Quick Start 跑起来。
```

---

## 依赖关系图

```
Phase 0 (脚手架)
  0.1 Monorepo 根目录
  0.2 TypeScript 配置 ← 0.1
  0.3 Biome 配置 ← 0.1
  0.4 Tailwind Preset ← 0.1
  0.5 Next.js App ← 0.2, 0.4
  0.6 UI 包骨架 ← 0.2
  0.7 shadcn 组件 ← 0.6
  0.8 环境变量 ← 0.2
  0.9 Docker Compose ← 0.1

Phase 1 (数据库) ← Phase 0
  1.1 Database 包 ← 0.8, 0.9
  1.2 Auth Schema ← 1.1
  1.3 Org Schema ← 1.2
  1.4 Billing Schema ← 1.3
  1.5 迁移 + Seed ← 1.4

Phase 2 (认证) ← Phase 1
  2.1 Auth 核心 ← 1.5
  2.2 Session 工具 ← 2.1
  2.3 API 路由 ← 2.2, 0.5
  2.4 Auth UI ← 2.3, 0.7
  2.5 Organization 插件 ← 2.4
  2.6 Passkey/2FA/Magic Link ← 2.5

Phase 3 (Dashboard Shell) ← Phase 2
  3.1 Layout + Sidebar ← 2.5
  3.2 Org Context ← 3.1

Phase 4 (组织管理) ← Phase 3
  4.1 创建/设置组织 ← 3.2
  4.2 成员管理 ← 4.1

Phase 5 (邮件) ← Phase 2
  5.1 Email 包 ← 2.1（回填占位函数）

Phase 6 (计费) ← Phase 3
  6.1 Billing 配置 ← 1.4
  6.2 Stripe 集成 ← 6.1
  6.3 Billing UI ← 6.2, 3.2

Phase 7 (i18n) ← Phase 0
  7.1 i18n 包 ← 0.5

Phase 8 (营销页面) ← Phase 0, 6.3
  8.1 Landing Page ← 0.7
  8.2 Blog ← 8.1

Phase 9 (Admin) ← Phase 3
  9.1 Admin Dashboard ← 3.1

Phase 10 (个人设置) ← Phase 2, 3
  10.1 Account Settings ← 2.6, 3.1

Phase 11 (测试 + 监控) ← Phase 4, 6
  11.1 Analytics ← 0.5
  11.2 E2E 测试 ← All

Phase 12 (AI Agent) ← All
  12.1 Agent Rules ← All

Phase 13 (收尾) ← All
  13.1 SEO ← 8.1, 8.2
  13.2 README ← All
```

---

_共计 13 个 Phase，30 个 Plan，每个 Plan 可由 Claude Code 在单次会话中完成。_
_建议严格按照依赖顺序执行，每完成一个 Plan 后验证再继续下一个。_
