import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import type { Request } from 'express';

/** 允许上传的扩展名 -> mime 白名单（规划第 3 节） */
const ALLOWED: Record<string, string[]> = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
  '.svg': ['image/svg+xml'],
  '.gif': ['image/gif'],
  '.mp4': ['video/mp4'],
};

export function uploadRoot(): string {
  return resolve(process.env.UPLOAD_DIR || './storage/uploads');
}

export function publicBase(): string {
  return (process.env.UPLOAD_PUBLIC_PATH || '/uploads').replace(/\/+$/, '');
}

/** multer 给的 originalname 是 latin1，中文文件名需转回 utf8 */
function decodeOriginalName(name: string): string {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

interface BaseName {
  ext: string;
  stem: string;
}

function sanitizeBase(name: string): BaseName {
  const ext = extname(name).toLowerCase();
  const stem = name.slice(0, name.length - ext.length).replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return { ext, stem: (stem || 'file').slice(0, 60) };
}

export function assertAllowed(file: { originalname: string; mimetype: string }): string {
  const ext = extname(file.originalname).toLowerCase();
  const mimes = ALLOWED[ext];
  if (!mimes) throw new BadRequestException(`不支持的文件类型：${ext || '未知'}`);
  if (!mimes.includes(file.mimetype)) throw new BadRequestException('文件类型与扩展名不一致');
  return ext;
}

/** 落盘到 <UPLOAD_DIR>/YYYY/MM/，返回相对 YYYY/MM 片段与最终文件名 */
export function nextTarget(originalname: string) {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const { ext, stem } = sanitizeBase(decodeOriginalName(originalname));
  const filename = `${stem}-${Date.now().toString(36)}${randomUUID().slice(0, 6)}${ext}`;
  return { relativeDir: join(yyyy, mm), filename, ext };
}

export const uploadStorage = diskStorage({
  destination: (req: Request, file, cb) => {
    try {
      assertAllowed(file);
      const { relativeDir } = nextTarget(file.originalname);
      const target = join(uploadRoot(), relativeDir);
      if (!existsSync(target)) mkdirSync(target, { recursive: true });
      cb(null, target);
    } catch (err) {
      cb(err as Error, undefined as any);
    }
  },
  filename: (req: Request, file, cb) => {
    const { filename } = nextTarget(file.originalname);
    cb(null, filename);
  },
});

export function uploadLimits(): { fileSize: number } {
  const mb = Number(process.env.UPLOAD_MAX_SIZE_MB || 10);
  return { fileSize: Math.max(1, Number.isFinite(mb) ? mb : 10) * 1024 * 1024 };
}

/** 由落盘绝对路径推导对外访问 url */
export function toPublicUrl(absolutePath: string): string {
  const rel = resolve(absolutePath).slice(resolve(uploadRoot()).length).replace(/\\/g, '/');
  return `${publicBase()}${rel.startsWith('/') ? rel : `/${rel}`}`;
}
