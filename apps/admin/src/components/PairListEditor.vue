<template>
  <div class="pair-list">
    <div v-for="(row, index) in rows" :key="index" class="pair-list__row">
      <el-input v-model="row.label" :placeholder="labelPlaceholder" class="pair-list__label" @input="commit" />
      <el-input v-model="row.value" :placeholder="valuePlaceholder" class="pair-list__value" @input="commit" />
      <div class="pair-list__ops">
        <el-button link :icon="Top" :disabled="index === 0" title="上移" @click="move(index, -1)" />
        <el-button link :icon="Bottom" :disabled="index === rows.length - 1" title="下移" @click="move(index, 1)" />
        <el-button link type="danger" :icon="Delete" title="删除本行" @click="remove(index)" />
      </div>
    </div>

    <p v-if="!rows.length" class="muted pair-list__empty">暂无内容</p>

    <div class="pair-list__foot">
      <el-button link type="primary" :icon="Plus" @click="append">添加一项</el-button>
      <span class="form-tip">{{ tip }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Bottom, Delete, Plus, Top } from '@element-plus/icons-vue'
import type { PairRow } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    modelValue?: PairRow[] | null
    labelPlaceholder?: string
    valuePlaceholder?: string
    tip?: string
  }>(),
  {
    modelValue: () => [],
    labelPlaceholder: '名称',
    valuePlaceholder: '内容',
    tip: '服务端会去掉整行为空的记录',
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: PairRow[]): void }>()

/** 本地副本允许出现空行（运营边填边看），提交时原样带上，由服务端 normalizePairs 收尾 */
const rows = ref<PairRow[]>([])

function hydrate(value?: PairRow[] | null): PairRow[] {
  return (value ?? []).map((row) => ({ label: row?.label ?? '', value: row?.value ?? '' }))
}

rows.value = hydrate(props.modelValue)

watch(
  () => props.modelValue,
  (next) => {
    // 只有外部整体替换（切换编辑记录）时才重新水合，避免打字过程中被自己的 emit 打断
    if (JSON.stringify(next ?? []) !== JSON.stringify(rows.value)) {
      rows.value = hydrate(next)
    }
  },
)

function commit(): void {
  emit(
    'update:modelValue',
    rows.value.map((row) => ({ label: row.label, value: row.value })),
  )
}

function append(): void {
  rows.value.push({ label: '', value: '' })
  commit()
}

function remove(index: number): void {
  rows.value.splice(index, 1)
  commit()
}

function move(index: number, offset: number): void {
  const target = index + offset
  if (target < 0 || target >= rows.value.length) return
  const [row] = rows.value.splice(index, 1)
  rows.value.splice(target, 0, row)
  commit()
}
</script>

<style scoped>
.pair-list {
  width: 100%;
}

.pair-list__row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}

.pair-list__label {
  flex: 0 0 40%;
}

.pair-list__value {
  flex: 1 1 auto;
}

.pair-list__ops {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}

.pair-list__empty {
  margin: 0 0 6px;
  font-size: 12px;
}

.pair-list__foot {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
