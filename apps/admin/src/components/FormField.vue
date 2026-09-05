<template>
  <el-form-item :label="spec.label" :prop="spec.name" :required="spec.required">
    <div class="field">
      <!-- 分类下拉：术语组由后端 schema 指定，选项走 dict store 缓存 -->
      <el-select
        v-if="spec.control === 'category'"
        :model-value="stringValue"
        clearable
        filterable
        :disabled="disabled"
        :placeholder="placeholder || '请选择分类'"
        @update:model-value="emitValue"
      >
        <el-option v-for="opt in termOptions" :key="opt.slug" :label="opt.name" :value="opt.slug" />
      </el-select>

      <el-select
        v-else-if="spec.control === 'status'"
        :model-value="numberValue"
        :disabled="disabled"
        :placeholder="placeholder || '请选择状态'"
        @update:model-value="emitValue"
      >
        <el-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>

      <el-select
        v-else-if="spec.control === 'select'"
        :model-value="stringValue"
        clearable
        :disabled="disabled"
        :placeholder="placeholder || '请选择'"
        @update:model-value="emitValue"
      >
        <el-option v-for="opt in spec.options ?? []" :key="String(opt.value)" :label="opt.label" :value="opt.value" />
      </el-select>

      <el-switch
        v-else-if="spec.control === 'switch'"
        :model-value="boolValue"
        :disabled="disabled"
        @update:model-value="emitValue"
      />

      <el-input-number
        v-else-if="spec.control === 'number'"
        :model-value="numberValue"
        :controls-position="'right'"
        :value-on-clear="null"
        :step="1"
        :disabled="disabled"
        class="field__number"
        @update:model-value="emitValue"
      />

      <el-rate
        v-else-if="spec.control === 'rating'"
        :model-value="numberValue ?? 0"
        show-score
        :max="5"
        :disabled="disabled"
        @update:model-value="emitValue"
      />

      <el-date-picker
        v-else-if="spec.control === 'date'"
        :model-value="stringValue"
        type="date"
        value-format="YYYY-MM-DD"
        :disabled="disabled"
        :placeholder="placeholder || '选择日期'"
        class="field__date"
        @update:model-value="emitValue"
      />

      <el-date-picker
        v-else-if="spec.control === 'datetime'"
        :model-value="stringValue"
        type="datetime"
        value-format="YYYY-MM-DDTHH:mm:ss"
        :disabled="disabled"
        :placeholder="placeholder || '选择时间'"
        class="field__date"
        @update:model-value="emitValue"
      />

      <el-color-picker
        v-else-if="spec.control === 'color'"
        :model-value="stringValue"
        :disabled="disabled"
        @update:model-value="emitValue"
      />

      <RichEditor
        v-else-if="spec.control === 'richtext'"
        :model-value="stringValue"
        :disabled="disabled"
        :placeholder="placeholder"
        @update:model-value="emitValue"
      />

      <ImageUploader
        v-else-if="spec.control === 'image'"
        :model-value="stringValue"
        :disabled="disabled"
        @update:model-value="emitValue"
      />

      <ImageUploader
        v-else-if="spec.control === 'images'"
        :model-value="arrayValue"
        multiple
        :disabled="disabled"
        @update:model-value="emitValue"
      />

      <PairListEditor
        v-else-if="spec.control === 'pairs'"
        :model-value="pairValue"
        @update:model-value="emitValue"
      />

      <TagListEditor
        v-else-if="spec.control === 'tags' || spec.control === 'lines'"
        :model-value="arrayValue"
        :presentation="spec.control === 'lines' ? 'lines' : 'chips'"
        :placeholder="placeholder"
        @update:model-value="emitValue"
      />

      <el-input
        v-else-if="spec.control === 'json'"
        :model-value="jsonText"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 10 }"
        :disabled="disabled"
        placeholder="JSON 结构，失焦时校验"
        @update:model-value="onJsonInput"
        @blur="onJsonBlur"
      />

      <el-input
        v-else-if="isTextarea"
        :model-value="stringValue"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 8 }"
        :disabled="disabled"
        :placeholder="placeholder"
        @update:model-value="emitValue"
      />

      <!-- control 是宽松字符串：后端新增取值时落到单行输入框，不白屏 -->
      <el-input
        v-else
        :model-value="stringValue"
        :disabled="disabled"
        :placeholder="placeholder"
        :type="spec.control === 'url' ? 'url' : 'text'"
        clearable
        @update:model-value="emitValue"
      />

      <p v-if="spec.tip" class="form-tip">{{ spec.tip }}</p>
    </div>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { STATUS_OPTIONS } from '@/types/api'
import { useDictStore } from '@/stores/dict'
import { isLongText, type FieldSpec, type PairRow } from '@/utils/field'
import type { TermOption } from '@/types/api'
import ImageUploader from './ImageUploader.vue'
import PairListEditor from './PairListEditor.vue'
import RichEditor from './RichEditor.vue'
import TagListEditor from './TagListEditor.vue'

const props = defineProps<{
  spec: FieldSpec
  modelValue?: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: any): void }>()

const dict = useDictStore()
const termOptions = ref<TermOption[]>([])
/** 非 null 表示用户正在编辑 JSON 原文，尚未校验通过 */
const jsonBuffer = ref<string | null>(null)

const placeholder = computed(() => props.spec.placeholder ?? '')

const stringValue = computed(() => {
  const value = props.modelValue
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value : String(value)
})

const numberValue = computed(() => {
  const value = props.modelValue
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
})

const boolValue = computed(() => {
  const value = props.modelValue
  return value === true || value === 1 || value === '1' || value === 'true'
})

const arrayValue = computed<string[]>(() => {
  const value = props.modelValue
  if (Array.isArray(value)) return value.map((row) => (typeof row === 'string' ? row : String(row ?? '')))
  if (typeof value === 'string' && value.trim()) return value.split(/[\n,]/).map((row) => row.trim()).filter(Boolean)
  return []
})

const pairValue = computed<PairRow[]>(() => {
  const value = props.modelValue
  if (!Array.isArray(value)) return []
  return value.map((row) => ({ label: String(row?.label ?? ''), value: String(row?.value ?? '') }))
})

const isTextarea = computed(() => props.spec.control === 'textarea' || (props.spec.control === 'text' && isLongText(props.spec)))

const jsonText = computed(() => jsonBuffer.value ?? safeStringify(props.modelValue))

function safeStringify(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    try {
      return safeStringify(JSON.parse(value))
    } catch {
      return value
    }
  }
  return JSON.stringify(value, null, 2)
}

function emitValue(value: unknown): void {
  emit('update:modelValue', value)
}

function onJsonInput(value: string): void {
  jsonBuffer.value = value
}

function onJsonBlur(): void {
  const raw = (jsonBuffer.value ?? '').trim()
  jsonBuffer.value = null
  if (!raw) {
    emitValue(null)
    return
  }
  try {
    emitValue(JSON.parse(raw))
  } catch {
    jsonBuffer.value = raw
    ElMessage.warning('JSON 解析失败，已保留你的输入，修正格式后再保存')
  }
}

watch(
  () => props.modelValue,
  () => {
    // 外部换记录时丢弃未校验的草稿，避免把上一条的 JSON 写进新记录
    jsonBuffer.value = null
  },
)

onMounted(async () => {
  if (props.spec.control !== 'category' || !props.spec.taxonomy) return
  try {
    termOptions.value = await dict.load(props.spec.taxonomy)
  } catch {
    termOptions.value = []
  }
})
</script>

<style scoped>
.field {
  width: 100%;
}

.field__number {
  width: 140px;
}

.field__date {
  width: 100%;
}
</style>
