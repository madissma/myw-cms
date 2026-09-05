<template>
  <el-form
    ref="formRef"
    :model="values"
    :rules="rules"
    label-position="top"
    :label-width="labelWidth"
    :disabled="disabled"
    class="dynamic-form"
  >
    <section v-for="block in blocks" :key="block.group" v-show="blockVisible(block)" class="dynamic-form__group">
      <h4 v-if="block.title" class="dynamic-form__title">{{ block.title }}</h4>
      <el-row :gutter="16">
        <el-col v-for="spec in block.specs" v-show="specShown(spec)" :key="spec.name" :xs="24" :sm="spanOf(spec)">
          <FormField :spec="spec" :model-value="values[spec.name]" :disabled="disabled" @update:model-value="setValue(spec.name, $event)" />
        </el-col>
      </el-row>
    </section>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { GROUP_TITLES, isCompactControl, type FieldSpec } from '@/utils/field'
import FormField from './FormField.vue'

const props = withDefaults(
  defineProps<{
    /** 字段描述，顺序即渲染顺序，分组读 spec.group */
    specs: FieldSpec[]
    values: Record<string, any>
    disabled?: boolean
    labelWidth?: string
    /** 只控制显示，不剔除字段：避免筛选时丢掉未保存的编辑值 */
    keyword?: string
  }>(),
  { disabled: false, labelWidth: undefined, keyword: '' },
)

const formRef = ref<FormInstance>()
const keyword = computed(() => props.keyword.trim().toLowerCase())

function specShown(spec: FieldSpec): boolean {
  if (!keyword.value) return true
  return spec.label.toLowerCase().includes(keyword.value) || spec.name.toLowerCase().includes(keyword.value)
}

function blockVisible(block: { specs: FieldSpec[] }): boolean {
  return !keyword.value || block.specs.some(specShown)
}

function spanOf(spec: FieldSpec): number {
  return isCompactControl(spec.control) ? 12 : 24
}

function setValue(name: string, value: unknown): void {
  // 直接写回调用方的 reactive 对象，避免每个字段都跑一遍 emit + 合并
  props.values[name] = value
}

const blocks = computed(() => {
  const buckets = new Map<string, FieldSpec[]>()
  for (const spec of props.specs) {
    const group = spec.group ?? 'base'
    if (!buckets.has(group)) buckets.set(group, [])
    buckets.get(group)!.push(spec)
  }
  // 只渲染真正有字段的分组，顺序沿用 GROUP_TITLES，未知分组追加在后
  const ordered = [
    ...Object.keys(GROUP_TITLES).filter((key) => buckets.has(key)),
    ...[...buckets.keys()].filter((key) => !(key in GROUP_TITLES)),
  ]
  return ordered.map((group) => ({
    group,
    title: buckets.size > 1 ? (GROUP_TITLES[group] ?? group) : '',
    specs: buckets.get(group) ?? [],
  }))
})

const rules = computed<FormRules>(() => {
  const out: FormRules = {}
  for (const spec of props.specs) {
    if (!spec.required || ['switch', 'number', 'rating'].includes(spec.control)) continue
    out[spec.name] = ['tags', 'lines', 'pairs', 'images'].includes(spec.control)
      ? [{ required: true, type: 'array', message: `请至少填写一项「${spec.label}」`, trigger: 'change' }]
      : [{ required: true, message: `请填写${spec.label}`, trigger: ['blur', 'change'] }]
  }
  return out
})

async function validate(): Promise<boolean> {
  if (!formRef.value) return true
  try {
    return await formRef.value.validate()
  } catch {
    return false
  }
}

function resetValidate(): void {
  formRef.value?.clearValidate()
}

defineExpose({ validate, resetValidate, formRef })
</script>

<style scoped>
.dynamic-form__group + .dynamic-form__group {
  margin-top: 6px;
}

.dynamic-form__title {
  margin: 0 0 10px;
  padding-left: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  border-left: 3px solid var(--el-color-primary);
}
</style>
