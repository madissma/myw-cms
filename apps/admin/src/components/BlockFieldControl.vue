<template>
  <!-- items：卡片式增删排序，子字段交给自身递归 -->
  <el-form-item v-if="isItems" :label="field.label" :required="field.required">
    <div class="bfc">
      <div v-for="(item, index) in rows" :key="index" class="bfc__item">
        <div class="bfc__item-head">
          <span class="bfc__item-title">{{ titleOf(item, index) }}</span>
          <div class="bfc__item-ops">
            <el-button link :icon="Top" :disabled="index === 0" title="上移" @click="move(index, -1)" />
            <el-button link :icon="Bottom" :disabled="index === rows.length - 1" title="下移" @click="move(index, 1)" />
            <el-button link type="danger" :icon="Delete" title="删除" @click="remove(index)" />
          </div>
        </div>
        <el-row :gutter="12">
          <el-col v-for="sub in subFields" :key="sub.name" :xs="24" :sm="spanOf(sub)">
            <BlockFieldControl
              :field="sub"
              :model-value="item[sub.name]"
              :disabled="disabled"
              @update:model-value="setSub(index, sub.name, $event)"
            />
          </el-col>
        </el-row>
      </div>

      <div class="bfc__foot">
        <el-button :icon="Plus" :disabled="reachedMax || disabled" @click="append">
          添加{{ field.itemLabel || '一项' }}
        </el-button>
        <span v-if="field.max" class="form-tip">最多 {{ field.max }} 项</span>
      </div>
      <p v-if="field.hint" class="form-tip">{{ field.hint }}</p>
    </div>
  </el-form-item>

  <!-- 其余 kind 全部归一到 FieldSpec，复用 FormField 的控件分支 -->
  <FormField
    v-else
    :spec="spec"
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="emitValue"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bottom, Delete, Plus, Top } from '@element-plus/icons-vue'
import { blockFieldSpec, isCompactControl, type FieldSpec } from '@/utils/field'
import type { BlockFieldDef } from '@/api/modules/page'
import FormField from './FormField.vue'

/** 组件靠文件名自引用完成 items 递归，无需额外注册 */
defineOptions({ name: 'BlockFieldControl' })

const props = defineProps<{
  field: BlockFieldDef
  modelValue?: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: unknown): void }>()

const subFields = computed<BlockFieldDef[]>(() => props.field.itemFields ?? [])
const isItems = computed(() => props.field.kind === 'items' && subFields.value.length > 0)

const rows = computed<Record<string, any>[]>(() =>
  Array.isArray(props.modelValue) ? (props.modelValue as Record<string, any>[]) : [],
)

const reachedMax = computed(() => !!props.field.max && rows.value.length >= props.field.max)

/** items 但没声明子字段属于配置缺失，退化成一整块 JSON 编辑器，至少不让运营无法保存 */
const spec = computed<FieldSpec>(() =>
  props.field.kind === 'items'
    ? { name: props.field.name, label: props.field.label, control: 'json', required: props.field.required, tip: props.field.hint }
    : blockFieldSpec(props.field),
)

function spanOf(sub: BlockFieldDef): number {
  const control = blockFieldSpec(sub).control
  return isCompactControl(control) && control !== 'select' ? 12 : 24
}

function emitValue(value: unknown): void {
  emit('update:modelValue', value)
}

function commit(next: Record<string, any>[]): void {
  emit('update:modelValue', next)
}

/** 卡片标题取第一个有值的文案字段，运营扫一眼就知道改的是哪一条 */
function titleOf(item: Record<string, any>, index: number): string {
  const names = ['title', 'name', 'label', 'text', 'char', 'value', 'step']
  for (const name of names) {
    const value = item?.[name]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return `${props.field.itemLabel || '项'} ${index + 1}`
}

function blankItem(): Record<string, any> {
  const out: Record<string, any> = {}
  for (const sub of subFields.value) {
    out[sub.name] = ['tags', 'pairs', 'items'].includes(sub.kind) ? [] : sub.kind === 'boolean' ? false : sub.kind === 'number' ? null : ''
  }
  return out
}

function append(): void {
  commit([...rows.value, blankItem()])
}

function remove(index: number): void {
  const next = [...rows.value]
  next.splice(index, 1)
  commit(next)
}

function move(index: number, offset: number): void {
  const target = index + offset
  if (target < 0 || target >= rows.value.length) return
  const next = [...rows.value]
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row)
  commit(next)
}

function setSub(index: number, name: string, value: unknown): void {
  // 写时复制，避免直接改父级对象导致 el-form 的脏检查看不到变化
  const next = rows.value.map((row) => ({ ...row }))
  next[index] = { ...next[index], [name]: value }
  commit(next)
}
</script>

<style scoped>
.bfc {
  width: 100%;
}

.bfc__item {
  padding: 10px 12px 0;
  margin-bottom: 10px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--admin-radius);
}

.bfc__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  margin-bottom: 4px;
  border-bottom: 1px dashed var(--el-border-color);
}

.bfc__item-title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bfc__item-ops {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}

.bfc__foot {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
