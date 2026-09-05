<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="560px"
    top="8vh"
    append-to-body
    :close-on-click-modal="false"
    class="sort-dialog"
  >
    <p class="form-tip sort-dialog__tip">{{ hint }}</p>

    <div v-loading="loading" class="sort-dialog__body">
      <VueDraggable v-model="rows" :animation="160" handle=".sort-row__handle" class="sort-list">
        <div v-for="(row, index) in rows" :key="row.id" class="sort-row">
          <el-icon class="sort-row__handle"><Rank /></el-icon>
          <span class="sort-row__no">{{ index + 1 }}</span>
          <span class="sort-row__label" :title="row.label">{{ row.label || row.id }}</span>
          <el-tag v-if="row.status !== undefined && row.status !== 1" size="small" type="info" effect="plain">
            {{ statusMeta(row.status).label }}
          </el-tag>
        </div>
      </VueDraggable>
      <el-empty v-if="!loading && !rows.length" description="没有可排序的数据" :image-size="60" />
    </div>

    <template #footer>
      <div class="dialog-foot">
        <span class="form-tip">拖动行改变顺序，保存后前台同步。</span>
        <div class="page-toolbar__actions">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" :disabled="!rows.length" @click="emit('save', rows.map((row) => row.id))">
            保存顺序
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { statusMeta } from '@/types/api'

// script setup 内不能有 ES 导出，调用方按结构传对象即可
interface SortEntry {
  id: string
  label: string
  status?: number
}

const props = withDefaults(
  defineProps<{
    title?: string
    hint?: string
    items: SortEntry[]
    loading?: boolean
    saving?: boolean
  }>(),
  { title: '调整顺序', hint: '按住左侧手柄拖动排序', loading: false, saving: false },
)

const emit = defineEmits<{ (e: 'save', ids: string[]): void }>()

const visible = defineModel<boolean>({ type: Boolean, default: false })

/** 内部副本：拖动过程不污染源数组，取消时自然丢弃 */
const rows = ref<SortEntry[]>([])

watch(visible, (open) => {
  if (open) rows.value = props.items.map((item) => ({ ...item }))
})
</script>

<style scoped>
.sort-dialog__tip {
  margin-bottom: 0;
}

.sort-dialog__body {
  max-height: 56vh;
  margin-top: 10px;
  overflow-y: auto;
}

.sort-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sort-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  font-size: 13px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.sort-row__handle {
  color: var(--el-text-color-secondary);
  cursor: grab;
}

.sort-row__no {
  min-width: 20px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.sort-row__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
