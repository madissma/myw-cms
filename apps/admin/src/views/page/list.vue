<template>
  <PageContainer title="页面装修" :subtitle="SUBTITLE" :loading="booting">
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openCreate">新增页面</el-button>
    </template>

    <template #toolbar>
      <el-input
        v-model="query.keyword"
        placeholder="搜索页面名称 / 标识 / 路径"
        clearable
        style="width: 240px"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      />
      <el-select v-model="query.status" placeholder="全部状态" clearable :value-on-clear="null" style="width: 120px" @change="reload(1)">
        <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <div class="page-toolbar__actions">
        <el-button :icon="Refresh" circle @click="reload()" />
      </div>
    </template>

    <el-table
      v-loading="loading"
      :data="rows"
      row-key="id"
      size="small"
      border
      :empty-text="`暂无页面，${canCreate ? '点击右上角新增' : '请先初始化数据'}`"
    >
      <el-table-column label="页面" min-width="200">
        <template #default="{ row }">
          <div class="cell-strong">{{ row.name }}</div>
          <div class="cell-sub muted">{{ row.key }}</div>
        </template>
      </el-table-column>
      <el-table-column label="前台路径" width="140">
        <template #default="{ row }">
          <span class="cell-mono">{{ row.path }}</span>
        </template>
      </el-table-column>
      <el-table-column label="页头标题" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.heroTitle">{{ row.heroTitle }}</span>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="区块组" width="88" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.sectionCount ? 'success' : 'info'" effect="plain">{{ row.sectionCount ?? 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="88">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)" effect="plain">{{ statusMeta(row.status).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="132">
        <template #default="{ row }">
          <span class="muted">{{ formatDateTime(row.updatedAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEdit" link type="primary" @click="goDesigner(row)">装修</el-button>
          <el-button v-if="canEdit" link @click="openEdit(row)">编辑</el-button>
          <el-button link @click="openFront(row)">预览</el-button>
          <el-button v-if="canPublish && row.status === 1" link type="warning" @click="quickStatus(row, 2)">下架</el-button>
          <el-button v-if="canPublish && row.status !== 1" link type="success" @click="quickStatus(row, 1)">
            {{ row.status === 0 ? '发布' : '重新上架' }}
          </el-button>
          <el-popconfirm v-if="canDelete" title="删除页面会连带删除其全部区块组与区块，确认？" width="260" @confirm="removeRow(row)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="reload()"
        @size-change="reload(1)"
      />
    </template>
  </PageContainer>

  <FormDialog
    ref="dialogRef"
    v-model="dialogVisible"
    :title="dialogTitle"
    :specs="specs"
    :values="form"
    :saving="saving"
    size="820px"
    :hint="dialogHint"
    @save="submit"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { createPage, deletePage, getPage, listPages, setPageStatus, updatePage, type PageItem } from '@/api/modules/page'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/format'
import type { FieldSpec } from '@/utils/field'
import { STATUS_OPTIONS, statusMeta, type ListQuery } from '@/types/api'
import PageContainer from '@/components/PageContainer.vue'
import FormDialog from '@/components/FormDialog.vue'
import { blankPageForm, pageFormOf, pagePayloadOf, pageSpecs } from './pageFields'

const SUBTITLE = '页面 = 页头信息 + 若干区块组（Section），每个区块组内含可拖拽的区块（Block）。结构的增删改在「装修」页完成。'

const router = useRouter()
const user = useUserStore()
const siteUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000'

const booting = ref(false)
const loading = ref(false)
const rows = ref<PageItem[]>([])
const total = ref(0)

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: null as number | null,
})

const dialogRef = ref<InstanceType<typeof FormDialog>>()
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const saving = ref(false)
const form = reactive<Record<string, any>>({})

const canCreate = computed(() => user.has('page:create'))
const canEdit = computed(() => user.has('page:edit'))
const canDelete = computed(() => user.has('page:delete'))
const canPublish = computed(() => user.has('page:publish'))

const specs = computed<FieldSpec[]>(() => pageSpecs(dialogMode.value))
const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增页面' : `编辑页面 · ${form.name || editingId.value}`))
const dialogHint = computed(() =>
  dialogMode.value === 'create' ? '新页面默认为草稿，装修完成后再发布。' : '页面标识创建后不可修改；前台路由与区块引用都依赖它。',
)

function statusTagType(status: number): 'success' | 'info' | 'warning' {
  return status === 1 ? 'success' : status === 2 ? 'warning' : 'info'
}

function toListQuery(): ListQuery {
  const out: ListQuery = { page: query.page, pageSize: query.pageSize }
  if (query.keyword.trim()) out.keyword = query.keyword.trim()
  if (query.status !== null) out.status = query.status
  return out
}

async function reload(page?: number): Promise<void> {
  if (page) query.page = page
  loading.value = true
  try {
    const res = await listPages(toListQuery())
    rows.value = res.list ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

function resetForm(source: Record<string, any>): void {
  for (const key of Object.keys(form)) delete form[key]
  Object.assign(form, source)
}

function openCreate(): void {
  dialogMode.value = 'create'
  editingId.value = ''
  // 新页面挂在 /<key> 上，先把路径填成同样前缀，省一次输入
  resetForm({ ...blankPageForm(), path: '/' })
  dialogVisible.value = true
}

async function openEdit(row: PageItem): Promise<void> {
  // 列表接口只返回少量字段，直接用它回填会把 heroSubtitle / seo* 等字段清空
  const detail = await getPage(row.id)
  dialogMode.value = 'edit'
  editingId.value = detail.id
  resetForm(pageFormOf(detail))
  dialogVisible.value = true
}

function goDesigner(row: PageItem): void {
  void router.push({ name: 'page-designer', params: { id: row.id } })
}

function openFront(row: PageItem): void {
  // 前台是 HashRouter，直接开 /about 会落到 404，必须带 #
  window.open(`${siteUrl}/#${row.path}`, '_blank', 'noopener')
}

async function submit(): Promise<void> {
  if (!(await dialogRef.value?.validate())) return
  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      const created = await createPage(pagePayloadOf(form, 'create'))
      ElMessage.success(`页面 ${created.key} 已创建`)
      dialogVisible.value = false
      await reload(1)
      if (canEdit.value) void router.push({ name: 'page-designer', params: { id: created.id } })
      return
    }
    await updatePage(editingId.value, pagePayloadOf(form, 'edit'))
    ElMessage.success('页面信息已保存')
    dialogVisible.value = false
    await reload()
  } finally {
    saving.value = false
  }
}

async function quickStatus(row: PageItem, status: number): Promise<void> {
  await setPageStatus(row.id, status)
  ElMessage.success(status === 1 ? '页面已发布' : '页面已下架')
  await reload()
}

async function removeRow(row: PageItem): Promise<void> {
  await deletePage(row.id)
  ElMessage.success(`页面 ${row.name} 已删除`)
  await reload()
}

onMounted(async () => {
  booting.value = true
  try {
    await reload()
  } finally {
    booting.value = false
  }
})
</script>

<style scoped>
.cell-strong {
  font-weight: 500;
}

.cell-sub {
  font-size: 12px;
}

.cell-mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}
</style>
