<template>
  <PageContainer :title="pageTitle" :subtitle="subtitle" :loading="booting">
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openCreate">
        新增{{ schema?.label ?? '内容' }}
      </el-button>
    </template>

    <template #toolbar>
      <el-input
        v-model="query.keyword"
        :placeholder="keywordHint"
        clearable
        style="width: 220px"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      />
      <el-select v-model="query.status" placeholder="全部状态" clearable :value-on-clear="null" style="width: 120px" @change="reload(1)">
        <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select
        v-if="categoryTaxonomy"
        v-model="query.category"
        placeholder="全部分类"
        clearable
        :value-on-clear="null"
        style="width: 150px"
        @change="reload(1)"
      >
        <el-option v-for="item in dict.cached(categoryTaxonomy)" :key="item.slug" :label="item.name" :value="item.slug" />
      </el-select>
      <el-select v-model="query.sort" placeholder="默认排序" clearable :value-on-clear="null" style="width: 150px" @change="reload(1)">
        <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <div class="page-toolbar__actions">
        <el-button :disabled="!selection.length" @click="bulkStatus(1)">批量发布</el-button>
        <el-button :disabled="!selection.length" @click="bulkStatus(2)">批量下架</el-button>
        <el-button v-if="canDelete" :disabled="!selection.length" type="danger" plain @click="bulkRemove">
          批量删除
        </el-button>
        <el-button v-if="canEdit" :disabled="!rows.length" @click="openSort">排序</el-button>
        <el-button :icon="Refresh" circle @click="reload()" />
      </div>
    </template>

    <el-table
      v-if="schema"
      v-loading="loading"
      :data="rows"
      row-key="id"
      size="small"
      border
      :empty-text="`暂无${schema.label}，点击右上角新增`"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="42" />
      <el-table-column v-for="col in schema.columns" :key="col.name" :label="col.label" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="isWideColumn(col)" class="cell-strong">{{ cellText(row, col) }}</span>
          <span v-else-if="isEmptyCell(row, col)" class="muted">-</span>
          <el-tag v-else-if="kindOf(col) === 'status'" size="small" :type="statusTagType(row[col.name])" effect="plain">
            {{ statusMeta(row[col.name]).label }}
          </el-tag>
          <img v-else-if="kindOf(col) === 'image'" :src="String(row[col.name])" class="thumb" :alt="col.label" />
          <el-tag v-else-if="kindOf(col) === 'bool'" size="small" :type="row[col.name] ? 'success' : 'info'" effect="plain">
            {{ row[col.name] ? '是' : '否' }}
          </el-tag>
          <span v-else>{{ cellText(row, col) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEdit" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canEdit && row.status !== 1" link type="success" @click="quickStatus(row, 1)">
            {{ row.status === 0 ? '发布' : '重新上架' }}
          </el-button>
          <el-button v-if="canEdit && row.status === 1" link type="warning" @click="quickStatus(row, 2)">下架</el-button>
          <el-popconfirm v-if="canDelete" title="删除后无法恢复，确认？" width="220" @confirm="removeRow(row)">
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
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="reload()"
        @size-change="reload(1)"
      />
    </template>
  </PageContainer>

  <FormDialog
    v-if="schema"
    ref="dialogRef"
    v-model="dialogVisible"
    :title="dialogTitle"
    :specs="specs"
    :values="form"
    :saving="saving"
    size="880px"
    :hint="dialogHint"
    @save="submit"
  />

  <SortOrderDialog
    v-model="sortVisible"
    :title="`调整${schema?.label ?? ''}顺序`"
    hint="排序模式取当前筛选条件下的全部记录（最多 200 条），保存后按新顺序重写排序值。"
    :items="sortItems"
    :loading="sortLoading"
    :saving="sortSaving"
    @save="submitSort"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  bulkDeleteContent,
  contentSchemas,
  createContent,
  deleteContent,
  getContent,
  listContent,
  setContentStatus,
  sortContent,
  updateContent,
  type ContentField,
  type ContentRow,
  type ContentSchema,
} from '@/api/modules/content'
import { useDictStore } from '@/stores/dict'
import { useUserStore } from '@/stores/user'
import { formatDate, formatDateTime, toDateInput, toDateTimeInput, truncate } from '@/utils/format'
import { contentFieldSpec, type FieldSpec } from '@/utils/field'
import { STATUS_OPTIONS, statusMeta, type ListQuery } from '@/types/api'
import PageContainer from '@/components/PageContainer.vue'
import FormDialog from '@/components/FormDialog.vue'
import SortOrderDialog from '@/components/SortOrderDialog.vue'

const props = withDefaults(
  defineProps<{
    /** 后端资源 key：products / news / videos / reviews / honors / timeline-events */
    resourceKey: string
    title?: string
    subtitle?: string
  }>(),
  { title: '', subtitle: '' },
)

const dict = useDictStore()
const user = useUserStore()

const schema = ref<ContentSchema | null>(null)
const booting = ref(false)
const loading = ref(false)
const rows = ref<ContentRow[]>([])
const total = ref(0)
const selection = ref<ContentRow[]>([])

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: null as number | null,
  category: null as string | null,
  sort: null as string | null,
})

const dialogRef = ref<InstanceType<typeof FormDialog>>()
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const saving = ref(false)
const form = reactive<Record<string, any>>({})

const sortVisible = ref(false)
const sortLoading = ref(false)
const sortSaving = ref(false)
const sortItems = ref<{ id: string; label: string; status?: number }[]>([])

const pageTitle = computed(() => props.title || `${schema.value?.label ?? '内容'}管理`)

const specs = computed<FieldSpec[]>(() => (schema.value ? schema.value.fields.map(contentFieldSpec) : []))

const perm = computed(() => schema.value?.perm ?? '')
const canCreate = computed(() => !!perm.value && user.has(`${perm.value}:create`))
const canEdit = computed(() => !!perm.value && user.has(`${perm.value}:edit`))
const canDelete = computed(() => !!perm.value && user.has(`${perm.value}:delete`))

const categoryField = computed<ContentField | undefined>(() =>
  schema.value?.fields.find((item) => item.control === 'category'),
)
const categoryTaxonomy = computed(() => categoryField.value?.taxonomy ?? '')

const keywordHint = computed(() => {
  const fields = schema.value?.searchable ?? []
  if (!fields.length) return '关键字'
  const labels = fields.map((name) => schema.value?.fields.find((f) => f.name === name)?.label ?? name)
  return `搜索${labels.slice(0, 3).join('、')}`
})

/** 排序下拉的文案：字段名 -> 中文，未登记时直接展示字段名 */
const SORT_LABELS: Record<string, string> = {
  sortOrder: '手动排序',
  createdAt: '最近创建',
  updatedAt: '最近更新',
  publishedAt: '最新发布',
  views: '浏览量',
  name: '名称',
  title: '标题',
  year: '年份',
  rating: '评分',
}

const sortOptions = computed(() =>
  (schema.value?.sortable ?? []).map((field) => {
    const dir = ['createdAt', 'updatedAt', 'publishedAt', 'views'].includes(field) ? 'desc' : 'asc'
    return { value: `${field}:${dir}`, label: SORT_LABELS[field] ? `${SORT_LABELS[field]}` : field }
  }),
)

const TITLE_NAMES = ['name', 'title', 'customerName']

function isWideColumn(col: ContentField): boolean {
  return TITLE_NAMES.includes(col.name)
}

type CellKind = 'image' | 'status' | 'bool' | 'category' | 'date' | 'datetime' | 'list' | 'text'

function kindOf(col: ContentField): CellKind {
  if (col.control === 'image') return 'image'
  if (col.control === 'status') return 'status'
  if (col.control === 'switch') return 'bool'
  if (col.control === 'category') return 'category'
  if (col.control === 'date') return 'date'
  if (col.control === 'datetime') return 'datetime'
  if (col.control === 'tags' || col.control === 'pairs' || col.control === 'images') return 'list'
  return 'text'
}

function cellText(row: ContentRow, col: ContentField): string {
  const value = row[col.name]
  if (kindOf(col) === 'category') return dict.nameOf(col.taxonomy ?? '', value) || '-'
  if (kindOf(col) === 'date') return formatDate(value)
  if (kindOf(col) === 'datetime') return formatDateTime(value)
  if (col.control === 'tags' || col.control === 'images') {
    return Array.isArray(value) ? truncate(value.join('、'), 48) || '-' : '-'
  }
  if (col.control === 'pairs') {
    return Array.isArray(value) ? truncate(value.map((item) => `${item.label}：${item.value}`).join('；'), 48) || '-' : '-'
  }
  return truncate(value, 80) || '-'
}

function statusTagType(status: number): 'success' | 'warning' | 'info' {
  const tag = statusMeta(Number(status)).tag
  return tag === 'success' || tag === 'warning' ? tag : 'info'
}

/** 行标题：排序弹窗与删除确认都要一个能认出来的名字 */
function labelOf(row: ContentRow): string {
  const key =
    TITLE_NAMES.find((name) => row[name]) ?? ['slug', 'code', 'id'].find((name) => row[name]) ?? 'id'
  return String(row[key] ?? row.id)
}

function isEmptyCell(row: ContentRow, col: ContentField): boolean {
  const value = row[col.name]
  if (value === null || value === undefined || value === '') return true
  return Array.isArray(value) && value.length === 0
}

function onSelectionChange(val: ContentRow[]): void {
  selection.value = val
}

function fieldDefault(field: ContentField): unknown {
  switch (field.control) {
    case 'status':
      return 1
    case 'number':
      return field.name === 'sortOrder' ? 0 : null
    case 'switch':
      return false
    case 'tags':
    case 'pairs':
    case 'images':
      return []
    case 'date':
    case 'datetime':
      return ''
    default:
      return ''
  }
}

function blankForm(): Record<string, any> {
  const out: Record<string, any> = {}
  for (const field of schema.value?.fields ?? []) out[field.name] = fieldDefault(field)
  return out
}

function hydrateForm(row: ContentRow): Record<string, any> {
  const out = blankForm()
  for (const field of schema.value?.fields ?? []) {
    const value = row[field.name]
    if (field.control === 'date') out[field.name] = toDateInput(value)
    else if (field.control === 'datetime') out[field.name] = toDateTimeInput(value)
    else out[field.name] = value ?? fieldDefault(field)
  }
  return out
}

const dialogTitle = computed(() => `${dialogMode.value === 'create' ? '新增' : '编辑'}${schema.value?.label ?? '内容'}`)

const dialogHint = computed(() =>
  schema.value?.hasSlug
    ? 'URL 标识建议填拼音或英文，留空会生成随机标识；已分享出去的地址不要改。'
    : '业务编码供初始化脚本定位，可留空。',
)

function toListQuery(over: Partial<ListQuery> = {}): ListQuery {
  const out: ListQuery = { ...over }
  if (query.keyword.trim()) out.keyword = query.keyword.trim()
  if (query.status !== null) out.status = query.status
  if (query.category) out.category = query.category
  if (query.sort) out.sort = query.sort
  return out
}

async function reload(page?: number): Promise<void> {
  if (!schema.value) return
  if (page) query.page = page
  loading.value = true
  try {
    const res = await listContent(props.resourceKey, { ...toListQuery(), page: query.page, pageSize: query.pageSize })
    rows.value = res.list ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  dialogMode.value = 'create'
  editingId.value = ''
  for (const key of Object.keys(form)) delete form[key]
  Object.assign(form, blankForm())
  dialogVisible.value = true
}

async function openEdit(row: ContentRow): Promise<void> {
  dialogMode.value = 'edit'
  editingId.value = String(row.id)
  for (const key of Object.keys(form)) delete form[key]
  Object.assign(form, blankForm())
  dialogVisible.value = true
  // 列表接口已带全部字段，仍拉一次详情：以后列表精简字段时这里不用改
  const detail = await getContent(props.resourceKey, editingId.value)
  Object.assign(form, hydrateForm(detail))
}

async function submit(): Promise<void> {
  if (!schema.value || saving.value) return
  if (!(await dialogRef.value?.validate())) return
  const payload: ContentRow = {}
  for (const field of schema.value.fields) payload[field.name] = form[field.name]

  saving.value = true
  try {
    if (dialogMode.value === 'create') await createContent(props.resourceKey, payload)
    else await updateContent(props.resourceKey, editingId.value, payload)
    ElMessage.success('已保存')
    dialogVisible.value = false
    await reload(dialogMode.value === 'create' ? 1 : undefined)
  } finally {
    saving.value = false
  }
}

async function quickStatus(row: ContentRow, status: number): Promise<void> {
  await setContentStatus(props.resourceKey, String(row.id), status)
  ElMessage.success(status === 1 ? '已发布' : '已下架')
  await reload()
}

async function bulkStatus(status: number): Promise<void> {
  const ids = selection.value.map((row) => String(row.id))
  if (!ids.length) return
  await Promise.all(ids.map((id) => setContentStatus(props.resourceKey, id, status)))
  ElMessage.success(`已更新 ${ids.length} 条`)
  await reload()
}

async function bulkRemove(): Promise<void> {
  const ids = selection.value.map((row) => String(row.id))
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 条记录？删除后无法恢复。`, '批量删除', {
      type: 'warning',
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  const res = await bulkDeleteContent(props.resourceKey, ids)
  ElMessage.success(`已删除 ${res.count} 条`)
  await reload(1)
}

async function removeRow(row: ContentRow): Promise<void> {
  await deleteContent(props.resourceKey, String(row.id))
  ElMessage.success('已删除')
  await reload(rows.value.length === 1 ? Math.max(1, query.page - 1) : undefined)
}

async function openSort(): Promise<void> {
  if (!schema.value) return
  sortVisible.value = true
  sortLoading.value = true
  try {
    const orderField = schema.value.sortable.includes('sortOrder') ? 'sortOrder:asc' : undefined
    const res = await listContent(props.resourceKey, { ...toListQuery(), sort: orderField, page: 1, pageSize: 200 })
    sortItems.value = (res.list ?? []).map((row) => ({ id: String(row.id), label: labelOf(row), status: row.status }))
  } finally {
    sortLoading.value = false
  }
}

async function submitSort(ids: string[]): Promise<void> {
  sortSaving.value = true
  try {
    const res = await sortContent(props.resourceKey, ids)
    ElMessage.success(res.updated ? `已更新 ${res.updated} 条排序` : '顺序未变化')
    sortVisible.value = false
    await reload()
  } finally {
    sortSaving.value = false
  }
}

onMounted(async () => {
  booting.value = true
  try {
    const list = await contentSchemas()
    schema.value = list.find((item) => item.key === props.resourceKey) ?? null
    if (!schema.value) {
      ElMessage.error(`未找到内容资源 ${props.resourceKey} 的元数据`)
      return
    }
    if (categoryTaxonomy.value) await dict.load(categoryTaxonomy.value)
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
</style>
