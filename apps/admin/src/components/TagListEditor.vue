<template>
  <div class="tag-list">
    <!-- 长段落形态：新闻 paragraphs 这类每行一项的内容用 chips 会挤成一行，改成竖排输入 -->
    <div v-if="presentation === 'lines'" class="tag-list__lines">
      <div v-for="(line, index) in items" :key="index" class="tag-list__line">
        <el-input
          :model-value="line"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 8 }"
          :placeholder="`${index + 1}. ${placeholder}`"
          @update:model-value="setLine(index, String($event))"
        />
        <el-button link type="danger" :icon="Delete" title="删除本段" @click="removeAt(index)" />
      </div>
      <div class="tag-list__foot">
        <el-button link type="primary" :icon="Plus" @click="appendLine">添加一段</el-button>
        <span class="form-tip">{{ tip }}</span>
      </div>
    </div>

    <div v-else class="tag-list__chips">
      <el-tag
        v-for="(item, index) in items"
        :key="`${item}-${index}`"
        class="tag-list__tag"
        closable
        :disable-transitions="true"
        @close="removeAt(index)"
      >
        {{ item }}
      </el-tag>

      <el-input
        v-if="inputVisible"
        ref="inputRef"
        v-model="inputValue"
        size="small"
        class="tag-list__input"
        :placeholder="placeholder"
        @keyup.enter="confirmAdd"
        @blur="confirmAdd"
      />
      <el-button v-else size="small" :icon="Plus" @click="openInput">添加</el-button>

      <div class="tag-list__foot">
        <el-button link type="primary" size="small" @click="batchVisible = !batchVisible">
          {{ batchVisible ? '收起批量输入' : '批量输入' }}
        </el-button>
        <span class="form-tip">{{ tip }}</span>
      </div>

      <el-input
        v-if="batchVisible"
        v-model="batchText"
        type="textarea"
        :rows="batchRows"
        placeholder="每行一项，也可用逗号分隔"
        @blur="applyBatch"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { InputInstance } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string[] | null
    presentation?: 'chips' | 'lines'
    placeholder?: string
    tip?: string
    batchRows?: number
  }>(),
  {
    modelValue: () => [],
    presentation: 'chips',
    placeholder: '输入后回车',
    tip: '重复项与空项会自动清理',
    batchRows: 6,
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>()

const items = ref<string[]>([...(props.modelValue ?? [])])
const inputVisible = ref(false)
const inputValue = ref('')
const inputRef = ref<InputInstance>()
const batchVisible = ref(false)
const batchText = ref('')

watch(
  () => props.modelValue,
  (next) => {
    const list = [...(next ?? [])]
    if (JSON.stringify(list) !== JSON.stringify(items.value)) items.value = list
  },
)

/** 与 server 的 normalizeStrings 同构：去空、去重，保证界面所见即落库所得 */
function dedupe(list: string[]): string[] {
  const out: string[] = []
  for (const raw of list) {
    const value = String(raw ?? '').trim()
    if (value && !out.includes(value)) out.push(value)
  }
  return out
}

function commit(): void {
  items.value = items.value.map((row) => String(row ?? ''))
  emit('update:modelValue', [...items.value])
}

function openInput(): void {
  inputVisible.value = true
  void nextTick(() => inputRef.value?.focus())
}

function confirmAdd(): void {
  const value = inputValue.value.trim()
  if (value && !items.value.includes(value)) items.value.push(value)
  inputValue.value = ''
  inputVisible.value = false
  commit()
}

function removeAt(index: number): void {
  items.value.splice(index, 1)
  commit()
}

function appendLine(): void {
  items.value.push('')
  commit()
}

function setLine(index: number, value: string): void {
  items.value[index] = value
  commit()
}

function applyBatch(): void {
  const parsed = dedupe(batchText.value.split(/[\n,]/))
  if (parsed.length) items.value = parsed
  commit()
}

watch(batchVisible, (visible) => {
  if (visible) batchText.value = items.value.join('\n')
})
</script>

<style scoped>
.tag-list {
  width: 100%;
}

.tag-list__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-list__tag {
  max-width: 100%;
  white-space: normal;
}

.tag-list__input {
  width: 160px;
}

.tag-list__lines {
  width: 100%;
}

.tag-list__line {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  margin-bottom: 6px;
}

.tag-list__foot {
  display: flex;
  width: 100%;
  gap: 10px;
  align-items: center;
}
</style>
