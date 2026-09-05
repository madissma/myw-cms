import type { FormItemRule } from 'element-plus'

/**
 * 与 server 的 checkPasswordStrength 同构（见 server/src/common/utils/password.util.ts）：
 * 前端先拦一道是为了少一次往返，真正的校验仍在后端。
 */
export function passwordRules(label = '密码'): FormItemRule[] {
  return [
    { required: true, message: `请输入${label}`, trigger: 'blur' },
    { min: 8, max: 64, message: '长度 8 - 64 位', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (!/[A-Za-z]/.test(String(value ?? '')) || !/[0-9]/.test(String(value ?? ''))) {
          callback(new Error(`${label}需同时包含字母与数字`))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ]
}

/** 确认密码：get 取当前填写的原值，避免规则闭包到已失效的引用 */
export function confirmRules(label = '密码', get: () => string): FormItemRule[] {
  return [
    { required: true, message: `请再次输入${label}`, trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        callback(value === get() ? undefined : new Error(`两次输入的${label}不一致`))
      },
      trigger: 'blur',
    },
  ]
}

/** 登录账号：与 CreateUserDto 的 @MaxLength(64) 及 service 的 3 位下限对齐 */
export const USERNAME_RULES: FormItemRule[] = [
  { required: true, message: '请输入登录账号', trigger: 'blur' },
  { min: 3, max: 64, message: '长度 3 - 64 位', trigger: 'blur' },
  { pattern: /^[a-zA-Z0-9_.@-]+$/, message: '仅支持字母、数字与 . _ @ -', trigger: 'blur' },
]
