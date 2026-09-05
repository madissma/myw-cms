/**
 * 跨库迁移与反向导出共用的表清单（规划第 9 节、10.9）。
 *
 * 顺序即写入顺序，与 seed 的依赖拓扑一致（父级先于子级），因此导入侧可以顺序写入、
 * `--truncate` 时按同序反向清空。
 *
 * 定位键一律用主键 id：Section.pageId / Block.sectionId 引用的是父行的 id，
 * 只有保 id 搬运才不会让父子关系断裂。代价是目标库不能已经 seed 过一份内容
 * （那样会并存两份同 slug 不同 id 的记录），所以跨库搬运要求先 --truncate。
 * 两张关联表没有 id，只能用 Prisma 的复合唯一键。
 */
export interface MigrationTable {
  /** Prisma 模型名 */
  model: string;
  /** client 上的属性名（delegate） */
  delegate: string;
  /** 复合唯一键在 Prisma where 里的字段名；留空表示按 id 定位 */
  compound?: string;
  /** 面向人的稳定业务键，仅用于日志与导出物 diff 定位 */
  key?: string | string[];
  /** 运行期数据：seed 复原不了，跨库迁移必须搬，反向导出默认也跳过 */
  runtime?: boolean;
  /**
   * 含凭据列（口令散列），因此反向导出物里该表是不完整的。
   * 走 `--from-dump` 时跳过此表，由 `prisma db seed` 重建（seed 会按 username upsert admin）。
   */
  secret?: boolean;
}

export const MIGRATION_TABLES: MigrationTable[] = [
  { model: 'Permission', delegate: 'permission', key: 'key' },
  { model: 'Role', delegate: 'role', key: 'key' },
  { model: 'Org', delegate: 'org', key: 'code' },
  { model: 'User', delegate: 'user', key: 'username', secret: true },
  { model: 'UserRole', delegate: 'userRole', compound: 'userId_roleId' },
  { model: 'RolePermission', delegate: 'rolePermission', compound: 'roleId_permissionId' },
  { model: 'Taxonomy', delegate: 'taxonomy', key: 'key' },
  { model: 'Term', delegate: 'term', key: ['taxonomyId', 'slug'] },
  { model: 'Setting', delegate: 'setting', key: 'key' },
  { model: 'Theme', delegate: 'theme', key: 'code' },
  { model: 'Locale', delegate: 'locale', key: 'code' },
  { model: 'Translation', delegate: 'translation', key: ['locale', 'entity', 'entityId', 'field'] },
  { model: 'NavMenu', delegate: 'navMenu', key: 'navKey' },
  { model: 'Product', delegate: 'product', key: 'slug' },
  { model: 'News', delegate: 'news', key: 'slug' },
  { model: 'Video', delegate: 'video', key: 'code' },
  { model: 'Review', delegate: 'review', key: 'code' },
  { model: 'Honor', delegate: 'honor', key: 'code' },
  { model: 'TimelineEvent', delegate: 'timelineEvent', key: 'code' },
  { model: 'Page', delegate: 'page', key: 'key' },
  { model: 'Section', delegate: 'section', key: ['pageId', 'anchor'] },
  { model: 'Block', delegate: 'block', key: ['sectionId', 'code'] },
  { model: 'MediaAsset', delegate: 'mediaAsset', key: 'url' },
  { model: 'Message', delegate: 'message', runtime: true },
  { model: 'OperationLog', delegate: 'operationLog', runtime: true },
];

/** 永不导出的列：口令散列不能进导出物，时间戳与计数每次都会变，diff 噪音大 */
export const DUMP_DROP_FIELDS = ['passwordHash', 'createdAt', 'updatedAt', 'lastLoginAt'];
/** 未加 `--with-runtime` 时额外不导出的列 */
export const DUMP_DROP_CONTENT_FIELDS = ['views'];

/** upsert / delete 的定位条件 */
export function whereFor(table: MigrationTable, row: Record<string, any>): Record<string, any> {
  if (!table.compound) return { id: row.id };
  return { [table.compound]: Object.fromEntries(keysOf(table).map((field) => [field, row[field]])) };
}

/** 表参与定位的字段名 */
export function keysOf(table: MigrationTable): string[] {
  if (!table.compound) return ['id'];
  // userId_roleId -> ['userId', 'roleId']
  return table.compound.split('_');
}

/** 导出物里用于日志展示的业务键取值 */
export function labelOf(table: MigrationTable, row: Record<string, any>): string {
  const fields = Array.isArray(table.key) ? table.key : table.key ? [table.key] : keysOf(table);
  return fields.map((field) => String(row[field] ?? '-')).join('/');
}
