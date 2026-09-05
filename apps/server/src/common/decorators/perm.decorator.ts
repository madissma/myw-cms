import { SetMetadata } from '@nestjs/common';

export const PERM_KEY = 'requiredPerm';

/** 声明接口所需的权限点，形如 content:product:edit */
export const Perm = (key: string) => SetMetadata(PERM_KEY, key);
