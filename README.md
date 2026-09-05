# 森芝宝官网内容管理系统

三个工程组成一个 pnpm workspace，均集中在 `apps/` 下；包管理收敛为根目录一条 `pnpm install`，技术栈与端口不变。

| 工程 | 技术栈 | 端口 | 职责 |
| --- | --- | --- | --- |
| `apps/server/` | NestJS 12 + Prisma 6 + SQLite | 3001 | REST API（`public` 只读 / `admin` 读写）、上传、JWT + RBAC |
| `apps/admin/` | Vue 3 + Vite + Element Plus + pinia | 3002 | 后台数据维护（栏目、内容、页面装修、站点配置、用户组织） |
| `apps/app/` | React 19 + Vite + Tailwind | 3000 | 官网前台，运行时取数 + 主题注入，保留静态兜底 |

## 环境要求

- Node.js `>= 22.12`（开发验证于 v22.22.3）
- pnpm `11.7.0`：由根 `package.json` 的 `packageManager` 锁定，`corepack enable` 后自动取用该版本
- Windows PowerShell 不支持 `&&` 作为语句分隔符，多命令请用 `;`；`package.json` 脚本内的 `&&` 由 pnpm 交给 cmd.exe 执行，不受此限
- SQLite 无需额外服务，库文件落在 `apps/server/data/szb.db`

## Workspace 布局

| 文件 | 作用 |
| --- | --- |
| `pnpm-workspace.yaml` | 成员声明（`apps/*`）+ `catalog` 共用版本区间 + `allowBuilds` / `onlyBuiltDependencies` 安装脚本授权 |
| `package.json` | 根清单：不带依赖，只放聚合脚本（均用 `--filter ./apps/<工程>` 定位成员） |
| `.npmrc` | `node-linker=isolated`（严格布局）、`strict-peer-dependencies=false`、`auto-install-peers=true` |
| `.gitignore` | 根级 `node_modules/` 递归作用于三个子工程；`apps/server/.env`（含 JWT 密钥与管理员口令）、SQLite 数据文件、构建产物与 `.artifacts/` 均不入库，`apps/server/.gitignore` 另管 `data/` 与 `storage/uploads/` 的目录占位 |

registry 不写进仓库，沿用用户级 `~/.npmrc`（本机为内网 Nexus）；换环境只改那一处。

- **catalog 单点定版本**：`@types/node` / `vite` / `typescript` 的区间在 `pnpm-workspace.yaml` 定义一次（`^24.10.1` / `^7.3.6` / `~5.9.3`，沿用各工程原有声明），子工程写 `"catalog:"` 引用。三者在 `pnpm-lock.yaml` 里解析为 `24.13.3` / `7.3.6` / `5.9.3`，与迁移前实际落盘的版本一致，零版本漂移。`server` 的 `typescript` 是 `~6.0.3`（配 Nest 12 已验证），刻意不入 catalog、保持写死。
- **严格 isolated**：依赖不被提升到顶层可任意 `import`，「声明里没有、代码里却 import」会当场暴露。迁移据此抓出并修掉一个真幽灵依赖：`apps/server/src/modules/media/media.storage.ts` 值导入 `diskStorage`，而 `@nestjs/platform-express/multer` 如今只再导出 interceptors / interfaces / multer.module、已不提供 `diskStorage`，所以 `multer` 提为 `apps/server` 的直接依赖。工程内 17 处 `express` 引用全是 `import type`，编译期擦除，无需声明。目录改到 `apps/` 下后重新 install，实测隔离仍成立（`apps/server/node_modules` 里 `express` 不可见、`multer` 可见）。
- **安装脚本授权**：pnpm 10+ 默认不执行依赖的 postinstall。新版机制是 `pnpm-workspace.yaml` 的 `allowBuilds`（包名 → 布尔）：pnpm 对值做严格比对，`true` 入允许集、`false` 入禁止集，**其他值（包括字符串）一律落空不生效**。因此这里写显式布尔而不是注释：放行 `prisma` / `@prisma/client` / `@prisma/engines`（生成 Client、链接查询引擎，不放行则连不上库）与 `esbuild`（vite 与 tsx 依赖其平台二进制）；将 `@scarf/scarf`（装完发遥测请求）与 `es5-ext`（postinstall 只打印赞助信息）置 `false` 主动屏蔽。`onlyBuiltDependencies` 作为旧机制一并保留。白名单改动后若 install 报 `Already up to date`，需再跑一次 `pnpm rebuild` 才会真正补执行脚本。

## 快速开始

依赖只在根装一次，不必逐工程 install。

```powershell
cd d:\workspace\szb
pnpm install                         # 三个工程一次装齐（自动识别 apps/*）
cd apps\server
Copy-Item .env.example .env          # 首次需要，之后按需修改
pnpm prisma:generate                 # 生成 Prisma Client
pnpm db:init                         # 迁移 + 内容基线 seed + 保真校验
```

回根目录，一条命令并发起三端（日志带 `server dev:` / `admin dev:` / `app dev:` 前缀）：

```powershell
cd d:\workspace\szb
pnpm dev                             # 3001 接口 / 3002 后台 / 3000 前台
```

只起单个工程用 `pnpm dev:server` / `pnpm dev:admin` / `pnpm dev:app`；`cd` 进 `apps/` 下的子目录后也可以直接跑该工程自己的脚本。

接口文档：<http://localhost:3001/api/docs>（`NODE_ENV=production` 时默认关闭）。

> Windows 注意：`prisma generate` 要覆写 `query_engine-windows.dll.node`，pnpm 布局下它位于
> `node_modules/.pnpm/@prisma+client@…/node_modules/.prisma/client`，被运行中的服务进程锁定时会报
> `EPERM: operation not permitted, rename`。先停 3001 再生成。

`admin` 的 `vite.config.ts` 已把 `/api` 与 `/uploads` 代理到 `http://localhost:3001`，改端口只需在 `.env.development` 里调 `VITE_API_TARGET`。初始管理员账号由 seed 写入：用户名 `admin`，密码取 `.env` 的 `SEED_ADMIN_PASSWORD`（缺省 `Admin@123456`）。

`app` 同为 vite dev server（3000），经自身 `/api` 代理取数；后端不可用时退回 `apps/app/src/data/fallback.ts` 的静态快照渲染。

## 常用命令

### 根聚合（在 `d:\workspace\szb` 执行）

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 并发起 server + admin + app |
| `pnpm dev:server` / `dev:admin` / `dev:app` | 只起此中的一个（分别是 `nest start --watch` / `vite` / `vite`） |
| `pnpm build` | 依次 `server` → `admin` → `app` 编译（顺序即依赖顺序） |
| `pnpm typecheck` | server `tsc --noEmit` + admin `vue-tsc -b`；`app` 无独立 typecheck 脚本，类型检查含在其 `build` 的 `tsc -b` 里 |
| `pnpm start:prod` | `node dist/main` |
| `pnpm prisma:generate` | 生成 Client（改 schema 后必跑；Windows 下需先停掉运行中的服务，见快速开始提示） |
| `pnpm db:init` | `migrate deploy` + `db seed` + `db:verify` |
| `pnpm db:reset` | 清库重建（含后台手工新增的数据都会被冲掉） |
| `pnpm db:seed` | 只跑内容基线 seed（幂等 upsert，可反复执行） |
| `pnpm db:verify` | 保真校验：五道闸门（条数 / A 类逐字 / B 类基线含 props 深比对 / C 类文案落库 / 引用完整性），产出 `prisma/seed-report.md`；任一 FAIL 以非 0 退出 |
| `pnpm db:fallback` | 由当前库导出前台静态兜底快照 `apps/app/src/data/fallback.ts`（后端故障时前台据此渲染） |
| `pnpm extract:site` | 【仅建站期】从 `apps/app/src/data/site.ts` 抽 A 类纯数据到 `prisma/fixtures/site.json`；该源文件已随前台改造删除，现在执行会以「源文件不存在」退出且不写盘（实测） |
| `pnpm extract:pages` | 【仅建站期】AST 抽取 B 类页面常量到 `prisma/fixtures/pages.ts`；前台已改区块驱动、常量已入库，抓不到时脚本主动中止且不写盘（实测） |
| `pnpm dump:fixtures` | 反向导出：把库内现有内容固化为新基线（`-- --with-runtime` 连带留言与日志）；只写 `prisma/fixtures/dump/`，不覆盖那四份基线 |

`site.json` / `pages.ts` 仍是 seed 的输入基线，前台切换后已不可重新生成，不碰它们即可；要把库内演化出的内容当新起点，用 `pnpm dump:fixtures` 导到 `dump/` 下另存。

`--` 之后的参数会透传给子脚本（根 → `--filter ./apps/server` → `tsx` 两跳都实测有效果），如 `pnpm db:verify -- --fixtures-only`。

> `--fixtures-only` 是建站期的 app 源码逐字比对：前台已改为区块驱动、`apps/app` 源码不再持有原文，现在跑它必然得到上百条「源码为空」的假阳性（实测 175 条 FAIL）。C 类文案的落库断言已在常开的五道闸门里，无特殊需要不必再用该模式。

### 仅 server 内（先 `cd apps\server`）

| 命令 | 作用 |
| --- | --- |
| `pnpm prisma:migrate` / `pnpm prisma:deploy` | 开发期建迁移 / 部署期只应用已有迁移 |
| `pnpm migrate:data` | 跨库搬运：`--from-url` 直连源库，或 `--from-dump` 读导出物（详见下节） |
| `npx tsx scripts/switch-provider.mts` | 由真源 `schema.base.prisma` 生成指定 provider 的 `schema.prisma` |
| `powershell -File scripts\smoke.ps1` | 10 个端点的冒烟检查（脚本须保持纯 ASCII） |

`tsx` / `prisma` / `nest` 的可执行文件在 `apps/server/node_modules/.bin` 下，`npx` 能就近解析；根目录不带依赖、也没有这些 bin，所以这类命令必须先进 `apps\server`。

### admin / app

`pnpm dev` 开发、`pnpm build` 构建（admin 走 `vue-tsc -b && vite build`）、`pnpm typecheck` 只查类型（app 无此项）、`pnpm preview` 预览产物；在根目录执行时写成 `pnpm --filter ./apps/admin build` 这样的形式。

## 环境变量（`apps/server/.env`）

| 变量 | 说明 |
| --- | --- |
| `PORT` / `API_PREFIX` | 默认 `3001` / `api/v1` |
| `DATABASE_URL` | `file:../data/szb.db`；切库时同步改 `prisma/schema.prisma` 的 `datasource.provider` |
| `JWT_SECRET` | **生产必须替换**，缺失时 env 校验直接启动失败 |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `2h` / `7d` |
| `CORS_ORIGINS` | 逗号分隔，默认放行 3000 与 3002 |
| `UPLOAD_DIR` / `UPLOAD_MAX_SIZE_MB` / `UPLOAD_PUBLIC_PATH` | 上传落盘与外链前缀，默认 `./storage/uploads` / `10` / `/uploads` |
| `PUBLIC_CACHE_TTL_SEC` | 内存缓存秒数，`0` 关闭（联调建议置 0）。只作用于 `public/bootstrap` 与 `public/pages/:key` 两个聚合接口，内容列表与详情始终实时读库 |
| `SEED_ADMIN_PASSWORD` | seed 写入的初始管理员密码 |

## 接口约定

- 前缀 `/api/v1`；`public/*` 免鉴权并带 `Cache-Control` + ETag，`admin/*` 一律要求 Bearer Token 并逐接口校验权限点。
- 响应统一信封 `{ code, message, data, traceId }`，`code = 0` 为成功；`traceId` 亦通过响应头 `x-trace-id` 返回。
- 列表统一入参 `page/pageSize/keyword/status/sort`，返回 `{ list, total, page, pageSize }`；`pageSize` 上限 100，超出按参数校验失败返回 400。
- 状态字典：`0` 草稿/禁用、`1` 已发布/启用、`2` 下架。
- 拖拽排序统一为 `PUT /admin/<资源>/sort/index`，入参 `{ ids: [...] }`：按下标回写 `sortOrder`，因此**必须传该列表的完整有序 id**，只传子集会导致这部分行与其余行序号冲突。
- 稳定业务键（`slug` / `legacyId` / `code` / `navKey`）在后台表单里作为「编码」暴露、保存后只读，是幂等 seed 与反向导出的对齐依据。

## 数据库可迁移性

当前用 SQLite，schema 已按跨库写法约束：不使用 Prisma `enum`、主键统一 `cuid()`、关系显式 `onDelete`、长文本用裸 `String`、`Json` 字段只整取整存不参与过滤。

schema 的真源是 `prisma/schema.base.prisma`（provider 写成占位符 `__PROVIDER__`），`prisma/schema.prisma` 是它的派生产物：改完模型用 `npx tsx scripts/switch-provider.mts --save` 回写真源，换库用 `--provider=mysql|postgresql|sqlite` 重新生成，不要手工改工作文件的 provider。

搬运数据有两条路，都保 `cuid` 主键（`Section.pageId` / `Block.sectionId` 引用父行 id，只有保 id 才不断链），因此**目标库必须先清空**（`--truncate`）。下列命令均在 `apps/server` 目录内执行（`DATABASE_URL` 里的 `../data/` 以 `prisma/` 为基准，不随工程目录位置变化）：

```powershell
# 1) 同 provider（换文件 / 换实例）：直连源库一条命令
npx tsx scripts/migrate-data.ts --from-url="file:../data/szb.db" --to-url="file:../data/new.db" --truncate

# 2) 跨 provider：生成的 Client 与 provider 绑定，一份 client 连不了两种库，走导出 + 导入
npx tsx scripts/switch-provider.mts --provider=mysql
npx prisma format; npx prisma validate
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/mysql/init.sql
#   用客户端执行 init.sql 建库，把 .env 的 DATABASE_URL 指向新库，然后 npx prisma generate
pnpm dump:fixtures -- --with-runtime             # 在旧库上导出（凭据列不入导出物）
npx tsx scripts/migrate-data.ts --from-dump=prisma/fixtures/dump/content.json --truncate --with-runtime
pnpm db:seed                                     # 补回 admin（口令散列不入导出物，User 表由 seed 重建）
pnpm db:verify                                   # 保真校验全绿即算搬成功
```

MySQL 侧 `String` 默认映射 `VARCHAR(191)`，长文本需补 `@db.Text` 或改表为 `LONGTEXT`（`switch-provider.mts` 会列出具体字段）；细节见规划第 9 节与 `apps/server/prisma/schema.prisma` 顶部注释。

两种目标库的建库 SQL 已作为产物提交：`prisma/migrations/mysql/init.sql`（25 表 / 10 外键）与 `prisma/migrations/postgresql/init.sql`（25 表 / 10 外键），两侧表名一致、均无数据库枚举与自增列，`Json` 分别落 `JSON` 与 `jsonb`。

## 当前交付进度

三个工程均已完工并通过验收：

- `server`：全量接口（用户组织权限、站点配置与主题、多语言、上传与素材、六类内容 + 分类术语、导航树、页面装修与区块解析、留言、public 聚合）+ Swagger + 统一信封 + 审计日志。
- `admin`：登录、布局与动态菜单、仪表盘、个人设置，以及内容六类、分类术语、导航栏目、页面装修（设计器 + 区块编辑抽屉）、站点配置（设置/主题/语言）、素材库、留言箱、系统管理（用户/组织/角色/日志）全部视图。
- `app`：API 数据层 + `SiteProvider` + 静态兜底、17 个区块渲染器、主题 CSS 变量化与运行时注入、八页与详情页改为数据驱动、留言真实提交、SEO 注入。
- seed：四类 fixtures + 抽取脚本 + 幂等 seed + 五道保真校验，`pnpm db:init` 在空库一次通过、重复执行不产生重复数据。
- workspace：三工程已并入 pnpm workspace（严格 isolated + catalog），并统一收到 `apps/` 下。迁移后 `pnpm build` / `pnpm typecheck` / `pnpm db:verify` 全绿（1312 PASS / 0 FAIL）。
- 目录合并（`app` `admin` `server` → `apps/`）：三处 `node_modules` 先删后重装（pnpm 在 Windows 下用存绝对路径的 junction，跨目录移动必断），因此搬迁后一律以 install 重建链接为准。数据零丢失的判据是 `pnpm db:verify` 1312 全绿（含 177 条 C 类中文逐字，反向证明批量改路径没破坏编码）；另专项验证了上传往返：新图落到 `apps/server/storage/uploads/2026/09/`、三条链路都能直出、删除后物理文件同步消失（`UPLOAD_DIR` 靠 cwd 解析，不假设仓库深度）。

待补素材：`lab.jpg`、`team.jpg` 两处引用在 `apps/app/public/images/` 下不存在，seed 已用现有图占位并在 `seed-report.md` 标为待补，取得素材后在后台素材库替换即可。

## 与规划的偏差

规划第 13 节原本写「不改用 monorepo workspace」，理由是 `app` 下 npm 与 yarn 两份锁文件并存、统一包管理的风险高于收益。交付完成后按用户要求引入了 pnpm workspace，取舍依据随之更新：

- **风险源已消除**：四份旧锁（`app/package-lock.json`、`app/yarn.lock`、`admin/package-lock.json`、`server/package-lock.json`）已先备份到本机 `.artifacts/lock-backup/` 再删除，由单一 `pnpm-lock.yaml` 取代，不再存在双锁漂移（备份里的文件名仍是并入 `apps/` 之前的路径）。`.artifacts/` 属本地产物（截图与旧锁备份），已进 `.gitignore`，**不会随仓库分发**：真要回退到 npm 布局，得从备份目录取回旧锁，而不是指望仓库里有。
- **严格模式的不可见风险改为可见**：动手前用依赖审计脚本对三工程做了 `import` 与声明清单的比对，逐个甄别（type-only / 路径别名误报 / Node 内置），唯一需要改代码的是把 `multer` 提为直接依赖；其余全部保持原样。
- **零版本变化**：共同依赖的实际落盘版本迁移前后相同，catalog 只是把这件事从「各自碰巧一致」变成「单点约定」；在数据未动的前提下 `app` 产物 chunk 名未变，可作交叉证据（后来目录合并到 `apps/` 后首次构建，chunk 名仍与合并前逐字一致；只有 `db:fallback` 刷新快照数据才会改 chunk 名）。
- **本次没做的事**：`app` 的 46 个 dependencies 里有 42 个在源码中一处未引用（shadcn / radix 全家桶及其工具库，实测），按约定只迁 workspace、不顺手瘦身；后续若要清，建议单独一次提交以便回滚。
- **`allowBuilds` 曾是一处未填完的遗留**：本次改动前发现 `pnpm-workspace.yaml` 里已有 `allowBuilds` 段，六个包名的值均为字面量 `set this to true or false`。该占位文本在 pnpm 11.7.0 的 339 个发行文件中零命中，不是 pnpm 生成的模板；而 pnpm 对该表做的是 `switch (value)` 严格比对，字符串既不匹配 `true` 也不匹配 `false`，所以整段**完全惰性**（既未放行也未屏蔽任何包，实际生效的仍是 `onlyBuiltDependencies`）。现已改写成显式布尔映射，`@scarf/scarf` / `es5-ext` 从「靠不在名单里」变成「被指名禁止」；重装的日志已印证：4 个授权包跑了脚本，这两个没跑。
- **度量口径教训**：`Invoke-WebRequest` 的 `RawContentLength` 是**字节**数，`.Content.Length` 是**字符**数，中文 UTF-8 下 9303 字符 = 11334 字节。之前的体积对比一度因此被误读为「内容长大」，实际逐字未变；引用长度数字时请带上口径。
