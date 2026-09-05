<template>
  <el-dialog
    v-model="visible"
    title="从素材库选择"
    width="860px"
    top="6vh"
    append-to-body
    @open="reload"
  >
    <div class="page-toolbar picker-filter">
      <el-input
        v-model="query.keyword"
        placeholder="按名称 / alt 搜索"
        clearable
        class="picker-filter__kw"
        :prefix-icon="Search"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-select v-model="query.folder" placeholder="全部分组" clearable class="picker-filter__folder" @change="reload">
        <el-option v-for="item in folders" :key="item" :label="item || '未分组'" :value="item" />
      </el-select>
      <el-select v-model="query.type" placeholder="全部类型" clearable class="picker-filter__type" @change="reload">
        <el-option label="图片" value="image" />
        <el-option label="视频" value="video" />
      </el-select>
      <el-button type="primary" @click="reload">查询</el-button>
      <span class="form-tip">已选 {{ selected.size }} 项</span>
    </div>

    <div v-loading="loading" class="picker-grid">
      <button
        v-for="item in list"
        :key="item.id"
        type="button"
        class="picker-cell"
        :class="{ 'is-active': selected.has(item.url) }"
        :title="item.url"
        @click="toggle(item.url)"
      >
        <img class="picker-cell__img" :src="item.url" :alt="item.alt || item.name" loading="lazy" />
        <span class="picker-cell__name">{{ item.name }}</span>
        <span v-if="item.width && item.height" class="picker-cell__size">{{ item.width }}×{{ item.height }}</span>
      </button>
      <p v-if="!loading && !list.length" class="muted picker-empty">没有匹配的素材，可先上传</p>
    </div>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[12, 24, 48]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="load"
        @size-change="reload"
      />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!selected.size" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { listMedia, mediaFolders, type MediaItem } from '@/api/modules/media'

const props = withDefaults(defineProps<{ multiple?: boolean }>(), { multiple: false })

const emit = defineEmits<{ (e: 'select', value: string | string[]): void }>()

/** 双向绑定弹窗开关；defineModel 已自带 update:modelValue，不再在 emits 里重复声明 */
const visible = defineModel<boolean>({ type: Boolean, default: false })

const query = reactive({ page: 1, pageSize: 24, keyword: '', folder: '', type: '' })
const list = ref<MediaItem[]>([])
const folders = ref<string[]>([])
const total = ref(0)
const loading = ref(false)
const selected = ref<Set<string>>(new Set())

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await listMedia({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      folder: query.folder || undefined,
      type: query.type || undefined,
      sort: 'createdAt:desc',
    })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function reload(): Promise<void> {
  query.page = 1
  await load()
}

function toggle(url: string): void {
  const next = new Set(selected.value)
  if (next.has(url)) {
    next.delete(url)
  } else {
    // 单选模式下只保留最后一次点击，省去先取消再选的步骤
    if (!props.multiple) next.clear()
    next.add(url)
  }
  selected.value = next
}

function confirm(): void {
  const urls = [...selected.value]
  emit('select', props.multiple ? urls : (urls[0] ?? ''))
  selected.value = new Set()
  visible.value = false
}

void mediaFolders()
  .then((res) => {
    folders.value = res
  })
  .catch(() => {
    folders.value = []
  })
</script>

<style scoped>
.picker-filter {
  justify-content: flex-start;
  padding-bottom: 10px;
}

.picker-filter__kw {
  width: 240px;
}

.picker-filter__folder,
.picker-filter__type {
  width: 150px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  min-height: 220px;
  max-height: 46vh;
  padding: 2px;
  overflow-y: auto;
}

.picker-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--admin-radius);
}

.picker-cell:hover {
  border-color: var(--el-color-primary);
}

.picker-cell.is-active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.picker-cell__img {
  width: 100%;
  height: 92px;
  object-fit: cover;
  background: var(--el-fill-color-lighter);
}

.picker-cell__name {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-cell__size {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.picker-empty {
  grid-column: 1 / -1;
  padding: 40px 0;
  text-align: center;
}
</style>
