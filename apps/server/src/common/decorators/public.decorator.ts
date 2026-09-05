import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记接口为前台只读，跳过 JWT 鉴权 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
