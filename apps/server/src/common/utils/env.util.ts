import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * 供独立脚本（verify-seed / dump-to-fixtures / migrate-data）加载 .env 使用。
 *
 * 走 Nest 的进程由 @nestjs/config 负责读环境，`prisma` CLI 自带 .env 加载，
 * 但 `tsx scripts/xxx.mts` 两者都不经过，PrismaClient 会因缺 DATABASE_URL 直接抛错。
 * 已存在的环境变量不覆盖，便于 CI 用真实环境变量覆盖本地文件。
 */
export function loadEnvFile(startDir: string = process.cwd()): string | null {
  const file = existsSync(path.join(startDir, '.env')) ? path.join(startDir, '.env') : null;
  if (!file) return null;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return file;
}

/** 把 `file:../data/szb.db` 这类相对路径解析为绝对文件路径（仅用于日志与提示） */
export function resolveSqliteFile(databaseUrl: string | undefined, baseUrl: string): string | null {
  if (!databaseUrl || !databaseUrl.startsWith('file:')) return null;
  const target = databaseUrl.slice('file:'.length).split('?')[0];
  if (target.startsWith('/') || /^[A-Za-z]:[\\/]/.test(target)) return target;
  return path.resolve(baseUrl, target);
}
