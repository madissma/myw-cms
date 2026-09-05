import { BadRequestException } from '@nestjs/common';
import { normalizePairs, normalizeStrings, readJsonArray, readJsonObject } from '../../common/utils/index.util';
import { sanitizeRichHtml, textOrNull } from '../../common/utils/html.util';
import { toBool, toOptInt } from '../../common/utils/pagination.util';
import { BlockFieldDef, BlockTypeDef, assertBlockType, entityDelegate } from './block.schema';

/**
 * 按区块类型定义裁剪 props：未声明的字段一律丢弃，
 * 避免后台表单或 seed 把无关键写进 Json 造成前台取值歧义。
 * 保留 `_` 前缀的键作为备注性元数据（如 _source 记录来源行号）。
 */
export function normalizeBlockProps(type: string, rawProps: unknown): Record<string, any> {
  const def = assertBlockType(type);
  const input = readJsonObject<Record<string, any>>(rawProps, {});
  const out: Record<string, any> = {};

  for (const field of def.fields) {
    if (!(field.name in input)) continue;
    out[field.name] = coerceField(field, input[field.name], def.label);
  }

  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('_')) out[key] = value;
  }

  for (const field of def.fields) {
    if (field.required && field.kind !== 'items' && out[field.name] === undefined) {
      throw new BadRequestException(`${def.label}：字段「${field.label}」不能为空`);
    }
    if (field.required && field.kind === 'items' && !out[field.name]?.length) {
      throw new BadRequestException(`${def.label}：至少需要一个「${field.itemLabel ?? field.label}」`);
    }
  }
  return out;
}

function coerceField(field: BlockFieldDef, value: unknown, owner: string): any {
  switch (field.kind) {
    case 'textarea':
    case 'text':
    case 'url':
    case 'image':
    case 'color':
    case 'select':
      return textOrNull(value) ?? '';
    case 'richtext':
      return sanitizeRichHtml(value as string) ?? '';
    case 'number': {
      const n = toOptInt(value);
      if (n === undefined) throw new BadRequestException(`${owner}：「${field.label}」必须是数字`);
      return n;
    }
    case 'boolean':
      return toBool(value, false);
    case 'tags':
      return normalizeStrings(value);
    case 'pairs':
      return normalizePairs(value);
    case 'items':
      return normalizeItems(field, value, owner);
    default:
      return value;
  }
}

function normalizeItems(field: BlockFieldDef, value: unknown, owner: string) {
  const list = readJsonArray<Record<string, any>>(value);
  if (field.max && list.length > field.max) {
    throw new BadRequestException(`${owner}：「${field.label}」最多 ${field.max} 项`);
  }
  const defs = field.itemFields ?? [];
  return list.map((row, i) => {
    const item: Record<string, any> = {};
    for (const sub of defs) {
      if (sub.name in (row ?? {})) item[sub.name] = coerceField(sub, row[sub.name], `${owner}#${i + 1}`);
    }
    for (const [k, v] of Object.entries(row ?? {})) if (k.startsWith('_')) item[k] = v;
    for (const sub of defs) {
      if (sub.required && !String(item[sub.name] ?? '').trim()) {
        throw new BadRequestException(`${owner}：第 ${i + 1} 项缺少「${sub.label}」`);
      }
    }
    return item;
  });
}

/** entity_list 的 query 规整：{ where, orderBy, limit } */
export function normalizeEntityQuery(source: unknown, query: unknown) {
  const src = textOrNull(source);
  if (!src) throw new BadRequestException('实体集合：请选择数据源');
  if (!entityDelegate(src)) throw new BadRequestException(`实体集合：不支持的数据源 ${src}`);

  const input = readJsonObject<Record<string, any>>(query, {});
  const where = readJsonObject<Record<string, any>>(input.where, {});
  const limit = Math.min(60, Math.max(1, toOptInt(input.limit) ?? 6));
  const orderByRaw = readJsonArray<any>(input.orderBy);
  const orderBy = orderByRaw.length ? orderByRaw : [{ sortOrder: 'asc' }];
  return { where, orderBy, limit };
}

export function blockTypeDef(type: string): BlockTypeDef {
  return assertBlockType(type);
}
