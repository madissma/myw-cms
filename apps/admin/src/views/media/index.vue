<template>
  <PageContainer title="素材库" :subtitle="SUBTITLE" :loading="booting">
    <template #actions>
      <el-button v-if="canUpload" type="primary" :icon="UploadFilled" :loading="uploading" @click="pickFiles">
        上传素材
      </el-button>
    </template>

    <template #toolbar>
      <el-input
        v-model="query.keyword"
        placeholder="按文件名 / 地址 / alt 搜索"
        clearable
        style="width: 220px"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      />
      <el-select v-model="query.folder" placeholder="全部分组" clearable :value-on-clear="null" style="width: 160px" @change="reload(1)">
        <el-option v-for="item in folders" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="query.type" placeholder="全部类型" clearable :value-on-clear="null" style="width: 120px" @change="reload(1)">
        <el-option label="图片" value="image" />
        <el-option label="视频" value="video" />
      </el-select>
      <el-button :icon="Refresh" circle title="重新载入" @click="reload()" />
      <span class="form-tip">共 {{ total }} 个素材</span>
    </template>

    <div v-loading="loading" class="media-grid">
      <article v-for="item in rows" :key="item.id" class="media-cell">
        <div class="media-cell__thumb">
          <el-image
            v-if="!isVideo(item)"
            :src="item.url"
            :alt="item.alt || item.name"
            fit="cover"
            lazy
            :preview-src-list="previewList"
            :initial-index="indexOfImage(item)"
            preview-teleported
          >
            <template #error>
              <div class="media-cell__broken"><el-icon><Picture /></el-icon><span>图片读取失败</span></div>
            </template>
          </el-image>
          <div v-else class="media-cell__video">
            <el-icon :size="26"><VideoCamera /></el-icon>
            <span class="cell-mono">{{ item.name }}</span>
          </div>
        </div>

        <div class="media-cell__body">
          <p class="media-cell__name" :title="item.name">{{ item.name }}</p>
          <p class="media-cell__url cell-mono" :title="item.url">{{ item.url }}</p>
          <p class="media-cell__meta">
            <span class="muted">{{ sizeText(item.size) }}</span>
            <span v-if="item.width && item.height" class="muted">{{ item.width }}×{{ item.height }}</span>
            <el-tag size="small" :type="item.usedBy ? 'success' : 'info'" effect="plain">
              {{ item.usedBy }} 处引用
            </el-tag>
          </p>
        </div>

        <div class="media-cell__actions">
          <el-button link size="small" @click="copyUrl(item)">复制地址</el-button>
          <el-button v-if="canEdit" link size="small" type="primary" @click="openEdit(item)">编辑</el-button>
          <el-button v-if="canDelete" link size="small" type="danger" @click="remove(item)">删除</el-button>
        </div>
      </article>

      <p v-if="!loading && !rows.length" class="media-empty muted">
        {{ canUpload ? '没有匹配的素材，可点击右上角上传' : '没有匹配的素材' }}
      </p>
    </div>

    <template #footer>
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[12, 24, 48, 96]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="load"
        @size-change="reload(1)"
      />
    </template>
  </PageContainer>

  <input ref="fileInput" type="file" class="media__input" :accept="ACCEPT" multiple @change="onFileChange" />

  <FormDialog
    ref="dialogRef"
    v-model="dialogVisible"
    title="编辑素材信息"
    :specs="specs"
    :values="form"
    :saving="saving"
    hint="地址是内容的取值依据，不提供修改；改名只影响后台显示。"
    @save="submit"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture, Refresh, UploadFilled, VideoCamera } from '@element-plus/icons-vue'
import {
  deleteMedia,
  listMedia,
  mediaFolders,
  mediaReferences,
  updateMedia,
  uploadMediaBatch,
  type MediaItem,
} from '@/api/modules/media'
import { useUserStore } from '@/stores/user'
import type { FieldSpec } from '@/utils/field'
import FormDialog from '@/components/FormDialog.vue'
import PageContainer from '@/components/PageContainer.vue'

const SUBTITLE = '内容与页面装修里用到的图片、视频统一在此登记；存量图片仍由前台静态目录提供，新上传的落在 /uploads'

/** 与 server 上传白名单一致 */
const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,.gif,.mp4'
const MAX_MB = 10
const MAX_BATCH = 10

const specs: FieldSpec[] = [
  { name: 'name', label: '显示名称', control: 'text', required: true, tip: '仅后台列表展示用' },
  { name: 'alt', label: '替代文本 alt', control: 'textarea', tip: '前台 img 的 alt，留空会影响可访问性与图片搜索' },
  { name: 'folder', label: '分组', control: 'text', tip: '用于素材库筛选，如 产品图 / 基地图集' },
]

const user = useUserStore()
const canUpload = computed(() => user.has('media:upload'))
const canEdit = computed(() => user.has('media:edit'))
const canDelete = computed(() => user.has('media:delete'))

const rows = ref<MediaItem[]>([])
const folders = ref<string[]>([])
const total = ref(0)
const loading = ref(false)
const booting = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

const query = reactive({ page: 1, pageSize: 24, keyword: '', folder: null as string | null, type: null as string | null })

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await listMedia({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      folder: query.folder ?? undefined,
      type: query.type ?? undefined,
      sort: 'createdAt:desc',
    })
    rows.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function reload(page = query.page): Promise<void> {
  query.page = page
  await load()
}

async function loadFolders(): Promise<void> {
  folders.value = await mediaFolders()
}

async function boot(): Promise<void> {
  booting.value = true
  try {
    await Promise.all([load(), loadFolders()])
  } finally {
    booting.value = false
  }
}

function isVideo(item: MediaItem): boolean {
  return (item.mime ?? '').startsWith('video/')
}

/** 灯箱沿用的图片序列，跳过视频，避免预览时翻到空白页 */
const previewList = computed(() => rows.value.filter((item) => !isVideo(item)).map((item) => item.url))

function indexOfImage(item: MediaItem): number {
  return previewList.value.indexOf(item.url)
}

function sizeText(size?: number | null): string {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

// ---------- 上传 ----------

function pickFiles(): void {
  fileInput.value?.click()
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  // 先清空，否则连续选同一批文件不会再触发 change
  input.value = ''
  if (!files.length) return

  if (files.length > MAX_BATCH) {
    ElMessage.warning(`一次最多上传 ${MAX_BATCH} 个，已取前 ${MAX_BATCH} 个`)
  }
  const picked = files.slice(0, MAX_BATCH).filter((file) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      ElMessage.warning(`「${file.name}」超过 ${MAX_MB}MB`)
      return false
    }
    return true
  })
  if (!picked.length) return

  uploading.value = true
  try {
    const saved = await uploadMediaBatch(picked)
    ElMessage.success(`已上传 ${saved.length} 个素材`)
    await Promise.all([load(), loadFolders()])
  } catch {
    // 拦截器已弹错，这里只负责恢复按钮状态
  } finally {
    uploading.value = false
  }
}

// ---------- 复制地址 ----------

async function copyUrl(item: MediaItem): Promise<void> {
  try {
    await navigator.clipboard.writeText(item.url)
    ElMessage.success('地址已复制到剪贴板')
    return
  } catch {
    // http 访问局域网地址时 clipboard 不可用，退回临时 textarea 选中复制
    const area = document.createElement('textarea')
    area.value = item.url
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    if (ok) ElMessage.success('地址已复制到剪贴板')
    else ElMessage.warning('浏览器不允许自动复制，请手动选中地址栏的链接')
  }
}

// ---------- 编辑 ----------

const dialogRef = ref<InstanceType<typeof FormDialog>>()
const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive<Record<string, any>>({})

function openEdit(item: MediaItem): void {
  form.id = item.id
  form.name = item.name
  form.alt = item.alt ?? ''
  form.folder = item.folder ?? ''
  dialogVisible.value = true
}

async function submit(): Promise<void> {
  if ((await dialogRef.value?.validate()) === false) return

  saving.value = true
  try {
    await updateMedia(form.id, { name: form.name, alt: form.alt || null, folder: form.folder || null })
    ElMessage.success('已更新素材信息')
    dialogVisible.value = false
    await Promise.all([load(), loadFolders()])
  } finally {
    saving.value = false
  }
}

// ---------- 删除（先查引用） ----------

async function remove(item: MediaItem): Promise<void> {
  const { count } = await mediaReferences(item.url)
  try {
    if (count) {
      await ElMessageBox.confirm(
        `该素材正被 ${count} 处内容引用，删除后这些位置会变成破图。确认强制删除？`,
        '存在引用',
        { type: 'warning', confirmButtonText: '强制删除', cancelButtonText: '先去改引用' },
      )
      await deleteMedia(item.id, true)
    } else {
      await ElMessageBox.confirm(`删除「${item.name}」？${uploadOf(item) ? '同时会删掉服务器上的物理文件。' : ''}`, '确认删除', {
        type: 'warning',
      })
      await deleteMedia(item.id)
    }
  } catch {
    // 用户取消，或后端仍然拒绝删除（拦截器已弹错）
    return
  }
  ElMessage.success('已删除素材')
  await Promise.all([load(), loadFolders()])
}

/** 只有 /uploads 前缀的才是后端自己存的文件，存量 /images 只解除登记 */
function uploadOf(item: MediaItem): boolean {
  return item.url.startsWith('/uploads/')
}

onMounted(() => void boot())
</script>

<style scoped>
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  min-height: 200px;
}

.media-cell {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--admin-radius);
  background: var(--el-fill-color-blank);
}

.media-cell__thumb {
  height: 132px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
}

.media-cell__thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.media-cell__video {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
}

.media-cell__broken {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.media-cell__body {
  flex: 1;
  padding: 8px 10px 0;
}

.media-cell__name,
.media-cell__url {
  overflow: hidden;
  margin: 0;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-cell__url {
  margin-top: 2px;
  color: var(--el-text-color-secondary);
}

.media-cell__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin: 6px 0 0;
  font-size: 12px;
}

.media-cell__actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  padding: 6px 10px;
  margin-top: 6px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.media-empty {
  grid-column: 1 / -1;
  padding: 48px 0;
  text-align: center;
}

.media__input {
  display: none;
}

.cell-mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
</style>
