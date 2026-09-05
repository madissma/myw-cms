/**
 * 权限点全集：seed 落库与 @Perm() 声明共用这一份，避免两边漂移。
 * 命名规范 group:resource:action，支持 RolesGuard 的前缀通配（如 content:product:*）。
 */
export interface PermissionDef {
  key: string;
  name: string;
  group: string;
}

const ACTIONS_FULL = [
  ['view', '查看'],
  ['create', '新增'],
  ['edit', '编辑'],
  ['delete', '删除'],
] as const;

const RESOURCES: { prefix: string; label: string; extra?: [string, string][] }[] = [
  { prefix: 'dashboard', label: '工作台', extra: [['view', '查看']] },

  { prefix: 'content:product', label: '产品' },
  { prefix: 'content:news', label: '新闻', extra: [['publish', '发布/下架']] },
  { prefix: 'content:video', label: '视频' },
  { prefix: 'content:review', label: '顾客口碑' },
  { prefix: 'content:honor', label: '企业荣誉' },
  { prefix: 'content:timeline', label: '企业大事记' },

  { prefix: 'page', label: '页面装修', extra: [['publish', '发布/下架']] },
  { prefix: 'nav', label: '导航栏目' },
  { prefix: 'taxonomy', label: '分类与术语' },

  { prefix: 'media', label: '素材库', extra: [['upload', '上传']] },
  {
    prefix: 'message',
    label: '留言箱',
    extra: [['reply', '回复'], ['export', '导出']],
  },

  { prefix: 'site:setting', label: '站点配置' },
  { prefix: 'site:theme', label: '网站风格', extra: [['activate', '启用主题']] },
  { prefix: 'site:locale', label: '语言配置' },
  { prefix: 'site:translation', label: '多语言翻译', extra: [['delete', '删除译文']] },

  { prefix: 'system:user', label: '用户管理', extra: [['reset', '重置密码']] },
  { prefix: 'system:org', label: '组织管理' },
  { prefix: 'system:role', label: '角色权限' },
  { prefix: 'system:log', label: '操作日志', extra: [['purge', '清理日志']] },
];

function build(): PermissionDef[] {
  const out: PermissionDef[] = [];
  const seen = new Set<string>();
  const add = (def: PermissionDef) => {
    // 同一 key 只登记一次：extra 里可能重复 ACTIONS_FULL 已有的动作（如 dashboard:view）
    if (seen.has(def.key)) return;
    seen.add(def.key);
    out.push(def);
  };
  for (const res of RESOURCES) {
    const actions = [...ACTIONS_FULL, ...(res.extra ?? [])];
    for (const [action, actionLabel] of actions) {
      add({
        key: `${res.prefix}:${action}`,
        name: `${res.label}${actionLabel}`,
        group: res.prefix.split(':')[0],
      });
    }
    // 资源级通配，便于按模块整体授权
    add({ key: `${res.prefix}:*`, name: `${res.label}（全部操作）`, group: res.prefix.split(':')[0] });
  }
  return out;
}

export const PERMISSIONS: PermissionDef[] = build();

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/** 预置角色 -> 权限点集合（super_admin 用 * 通配） */
export const PRESET_ROLES: { key: string; name: string; remark: string; permissions: string[] }[] = [
  { key: 'super_admin', name: '超级管理员', remark: '拥有全部权限', permissions: ['*'] },
  {
    key: 'content_admin',
    name: '内容管理员',
    remark: '内容与页面装修全量，站点配置只读',
    permissions: [
      'dashboard:view',
      'content:product:*',
      'content:news:*',
      'content:video:*',
      'content:review:*',
      'content:honor:*',
      'content:timeline:*',
      'page:*',
      'nav:*',
      'taxonomy:*',
      'media:*',
      'message:view',
      'message:reply',
      'site:setting:view',
      'site:theme:view',
    ],
  },
  {
    key: 'editor',
    name: '编辑',
    remark: '可维护产品与新闻，不可删除、不可发布页面',
    permissions: [
      'dashboard:view',
      'content:product:view',
      'content:product:create',
      'content:product:edit',
      'content:news:view',
      'content:news:create',
      'content:news:edit',
      'content:news:publish',
      'content:video:view',
      'content:review:view',
      'page:view',
      'nav:view',
      'taxonomy:view',
      'media:view',
      'media:upload',
    ],
  },
  {
    key: 'seo_admin',
    name: '站点与SEO',
    remark: '站点配置、主题、语言与翻译',
    permissions: [
      'dashboard:view',
      'site:setting:*',
      'site:theme:*',
      'site:locale:*',
      'site:translation:*',
      'page:view',
      'page:edit',
      'nav:view',
      'nav:edit',
      'media:view',
      'media:upload',
    ],
  },
  {
    key: 'viewer',
    name: '只读访客',
    remark: '仅查看，用于外包与新人培训',
    permissions: [
      'dashboard:view',
      'content:product:view',
      'content:news:view',
      'content:video:view',
      'content:review:view',
      'content:honor:view',
      'content:timeline:view',
      'page:view',
      'nav:view',
      'taxonomy:view',
      'media:view',
      'message:view',
      'site:setting:view',
      'site:theme:view',
    ],
  },
];

/** 后台菜单树：meta.perm 对应权限点，admin 前端按此过滤 */
export const ADMIN_MENUS = [
  { key: 'dashboard', label: '工作台', icon: 'Odometer', path: '/dashboard', perm: 'dashboard:view' },
  {
    key: 'content',
    label: '内容管理',
    icon: 'Document',
    perm: 'content:product:view',
    children: [
      { key: 'product', label: '产品管理', path: '/content/product', perm: 'content:product:view' },
      { key: 'news', label: '新闻管理', path: '/content/news', perm: 'content:news:view' },
      { key: 'video', label: '视频管理', path: '/content/video', perm: 'content:video:view' },
      { key: 'review', label: '顾客口碑', path: '/content/review', perm: 'content:review:view' },
      { key: 'honor', label: '企业荣誉', path: '/content/honor', perm: 'content:honor:view' },
      { key: 'timeline', label: '大事记', path: '/content/timeline', perm: 'content:timeline:view' },
    ],
  },
  {
    key: 'structure',
    label: '栏目与页面',
    icon: 'Grid',
    perm: 'page:view',
    children: [
      { key: 'nav', label: '导航栏目', path: '/nav', perm: 'nav:view' },
      { key: 'page', label: '页面装修', path: '/page', perm: 'page:view' },
      { key: 'taxonomy', label: '分类术语', path: '/taxonomy', perm: 'taxonomy:view' },
    ],
  },
  {
    key: 'site',
    label: '站点配置',
    icon: 'Setting',
    perm: 'site:setting:view',
    children: [
      { key: 'setting-brand', label: '品牌与联系方式', path: '/site/setting/brand', perm: 'site:setting:view' },
      { key: 'setting-footer', label: '页脚与备案', path: '/site/setting/footer', perm: 'site:setting:view' },
      { key: 'setting-seo', label: 'SEO 与统计', path: '/site/setting/seo', perm: 'site:setting:view' },
      { key: 'setting-ui', label: '前台文案', path: '/site/setting/ui', perm: 'site:setting:view' },
      { key: 'theme', label: '网站风格', path: '/site/theme', perm: 'site:theme:view' },
      { key: 'locale', label: '语言与翻译', path: '/site/locale', perm: 'site:locale:view' },
    ],
  },
  { key: 'media', label: '素材库', icon: 'Picture', path: '/media', perm: 'media:view' },
  { key: 'message', label: '留言箱', icon: 'ChatDotRound', path: '/message', perm: 'message:view' },
  {
    key: 'system',
    label: '系统管理',
    icon: 'Tools',
    perm: 'system:user:view',
    children: [
      { key: 'user', label: '用户管理', path: '/system/user', perm: 'system:user:view' },
      { key: 'org', label: '组织管理', path: '/system/org', perm: 'system:org:view' },
      { key: 'role', label: '角色权限', path: '/system/role', perm: 'system:role:view' },
      { key: 'log', label: '操作日志', path: '/system/log', perm: 'system:log:view' },
    ],
  },
];
