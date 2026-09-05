import {
  Clock,
  Factory,
  FlaskConical,
  Mail,
  MapPin,
  Microscope,
  Phone,
  QrCode,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react'

/**
 * 区块里的图标以名字存储（fixtures 抽取时把组件引用降级为字符串），
 * 前台在此维护唯一一份映射；未知名返回 null，由调用方省略图标而不是裂图。
 */
const ICONS: Record<string, LucideIcon> = {
  Clock,
  Factory,
  FlaskConical,
  Mail,
  MapPin,
  Microscope,
  Phone,
  QrCode,
  ShieldCheck,
  Truck,
}

export function resolveIcon(name: unknown): LucideIcon | null {
  if (typeof name !== 'string' || !name) return null
  return ICONS[name] ?? null
}
