import * as Joi from 'joi';

/** 启动即校验必填环境变量，缺失时立刻失败而不是运行到一半才炸 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:3002'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('2h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  UPLOAD_DIR: Joi.string().default('./storage/uploads'),
  UPLOAD_MAX_SIZE_MB: Joi.number().default(10),
  UPLOAD_PUBLIC_PATH: Joi.string().default('/uploads'),
  /** 前台只读聚合接口的内存缓存秒数，0 关闭（本地联调建议 0） */
  PUBLIC_CACHE_TTL_SEC: Joi.number().default(60),
  /** 接口文档开关，缺省非 production 即开放 */
  SWAGGER_ENABLED: Joi.string().default(''),
  SEED_ADMIN_PASSWORD: Joi.string().default('Admin@123456'),
});

export interface AppEnv {
  NODE_ENV: string;
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGINS: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  UPLOAD_DIR: string;
  UPLOAD_MAX_SIZE_MB: number;
  UPLOAD_PUBLIC_PATH: string;
  PUBLIC_CACHE_TTL_SEC: number;
  SWAGGER_ENABLED: string;
  SEED_ADMIN_PASSWORD: string;
}

export function corsOrigins(): string[] {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
