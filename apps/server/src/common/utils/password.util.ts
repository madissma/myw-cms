import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

/** 弱口令底线：长度 >= 8 且至少含字母与数字 */
export function checkPasswordStrength(plain: string): string | null {
  if (!plain || plain.length < 8) return '密码长度至少 8 位';
  if (!/[A-Za-z]/.test(plain)) return '密码需包含字母';
  if (!/[0-9]/.test(plain)) return '密码需包含数字';
  return null;
}
