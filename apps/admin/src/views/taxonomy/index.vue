<template>
  <PageContainer title="分类术语" subtitle="产品与新闻的分类、剂型、商城渠道、标签都在这张表里维护" plain>
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openGroupCreate">新增分类组</el-button>
    </template>

    <el-row :gutter="12">
      <el-col :xs="24" :md="8" :lg="6">
        <el-card shadow="never" class="tax-card" v-loading="groupLoading">
          <template #header>
            <div class="page-toolbar">
              <span class="tax-card__head">分类组</span>
              <div v-if="activeGroup" class="page-toolbar__actions">
                <el-button v-if="canEdit" link type="primary" @click="openGroupEdit">编辑</el-button>
                <el-button v-if="canDelete" link type="danger" @click="removeGroup">删除</el-button>
              </div>
            </div>
          </template>
          <ul class="tax-list">
            <li
              v-for="item in groups"
              :key="item.id"
              :class="['tax-list__item', { 'is-active': item.key === activeKey }]"
              @click="selectGroup(item)"
            >
              <span class="tax-list__name">{{ item.name }}</span>
              <span class="tax-list__key">{{ item.key }}</span>
              <span class="tax-list__count">{{ item.termCount ?? 0 }}</span>
            </li>
            <li v-if="!groups.length && !groupLoading" class="muted">还没有分类组</li>
          </ul>
          <p v-if="activeHint" class="form-tip tax-hint">{{ activeHint }}</p>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="16" :lg="18">
        <el-card shadow="never" class="tax-card">
          <template #header>
            <div class="page-toolbar">
              <div class="page-toolbar__actions">
                <el-input
                  v-model="keyword"
                  placeholder="搜索名称或标识"
                  clearable
                  style="width: 180px"
                  @keyup.enter="loadTerms"
                  @clear="loadTerms"
                />
                <el-button :disabled="!activeGroup" @click="loadTerms">查询</el-button>
              </div>
              <div class="page-toolbar__actions">
                <el-button v-if="canCreate && activeGroup" type="primary" @click="openTermCreate">新增术语</el-button>
                <el-button v-if="canEdit" :disabled="!terms.length" @click="openSort">排序</el-button>
              </div>
            </div>
          </template>

          <el-table
            v-loading="termLoading"
            :data="terms"
            row-key="id"
            size="small"
            border
            :empty-text="activeGroup ? `「${activeGroup.name}」下还没有术语` : '先选择一个分类组'"
          >
            <el-table-column label="配图" width="80">
              <template #default="{ row }">
                <img v-if="row.image" :src="row.image" class="thumb" :alt="row.name" />
                <span v-else class="muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="slug" label="标识" width="150" show-overflow-tooltip />
            <el-table-column prop="nameEn" label="英文名称" width="140" show-overflow-tooltip />
            <el-table-column prop="anchor" label="锚点" width="110" show-overflow-tooltip />
            <el-table-column prop="url" label="跳转地址" min-width="170" show-overflow-tooltip />
            <el-table-column prop="sortOrder" label="排序" width="72" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" effect="plain">
                  {{ statusMeta(row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button v-if="canEdit" link type="primary" @click="openTermEdit(row)">编辑</el-button>
                <el-button v-if="canEdit" link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleTerm(row)">
                  {{ row.status === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-popconfirm v-if="canDelete" title="删除后不可恢复，确认？" width="220" @confirm="removeTerm(row)">
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <FormDialog
      ref="groupDialogRef"
      v-model="groupVisible"
      :title="groupTitle"
      :specs="groupSpecs"
      :values="groupForm"
      :saving="groupSaving"
      size="560px"
      hint="分类组标识被内容与区块引用，建好后不再提供修改入口。"
      @save="submitGroup"
    />

    <FormDialog
      ref="termDialogRef"
      v-model="termVisible"
      :title="termTitle"
      :specs="termSpecs"
      :values="termForm"
      :saving="termSaving"
      size="700px"
      hint="禁用只是从前台下拉里隐藏，已发布内容的分类值不受影响。"
      @save="submitTerm"
    />

    <SortOrderDialog
      v-model="sortVisible"
      :title="`调整「${activeGroup?.name ?? ''}」顺序`"
      hint="术语按 sortOrder 升序输出给前台下拉与区块。"
      :items="sortItems"
      :saving="sortSaving"
      @save="submitSort"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TAXONOMY_HINTS,
  createTaxonomy,
  createTerm,
  deleteTaxonomy,
  deleteTerm,
  setTermStatus,
  sortTerms,
  taxonomies,
  terms as fetchTerms,
  updateTaxonomy,
  updateTerm,
  type TaxonomyItem,
  type TermItem,
  type TermPayload,
} from '@/api/modules/taxonomy'
import { useDictStore } from '@/stores/dict'
import { useUserStore } from '@/stores/user'
import type { FieldSpec } from '@/utils/field'
import { statusMeta } from '@/types/api'
import PageContainer from '@/components/PageContainer.vue'
import FormDialog from '@/components/FormDialog.vue'
import SortOrderDialog from '@/components/SortOrderDialog.vue'

const dict = useDictStore()
const user = useUserStore()

const canCreate = computed(() => user.has('taxonomy:create'))
const canEdit = computed(() => user.has('taxonomy:edit'))
const canDelete = computed(() => user.has('taxonomy:delete'))

const groups = ref<TaxonomyItem[]>([])
const groupLoading = ref(false)
const activeKey = ref('')

const terms = ref<TermItem[]>([])
const termLoading = ref(false)
const keyword = ref('')

const groupDialogRef = ref<InstanceType<typeof FormDialog>>()
const groupVisible = ref(false)
const groupMode = ref<'create' | 'edit'>('create')
const groupSaving = ref(false)
const groupForm = reactive<Record<string, any>>({})

const termDialogRef = ref<InstanceType<typeof FormDialog>>()
const termVisible = ref(false)
const termMode = ref<'create' | 'edit'>('create')
const termSaving = ref(false)
const termForm = reactive<Record<string, any>>({})
const editingTermId = ref('')

const sortVisible = ref(false)
const sortSaving = ref(false)
const sortItems = ref<{ id: string; label: string; status?: number }[]>([])

const activeGroup = computed(() => groups.value.find((item) => item.key === activeKey.value) ?? null)
const activeHint = computed(() => (activeKey.value ? TAXONOMY_HINTS[activeKey.value] ?? '' : ''))

const groupTitle = computed(() =>
  groupMode.value === 'create' ? '新增分类组' : `编辑分类组：${activeGroup.value?.name ?? ''}`,
)

/** 分类组标识创建后不可改，所以编辑态不给这个字段 */
const groupSpecs = computed<FieldSpec[]>(() => {
  const specs: FieldSpec[] = []
  if (groupMode.value === 'create') {
    specs.push({
      name: 'key',
      label: '分类组标识',
      control: 'text',
      required: true,
      tip: '小写英文加下划线，如 product_category',
    })
  }
  specs.push({ name: 'name', label: '名称', control: 'text', required: true })
  specs.push({ name: 'remark', label: '说明', control: 'textarea' })
  return specs
})

const termTitle = computed(() =>
  termMode.value === 'create' ? `新增术语 · ${activeGroup.value?.name ?? ''}` : `编辑术语 · ${termForm.name ?? ''}`,
)

const termSpecs = computed<FieldSpec[]>(() => {
  const create = termMode.value === 'create'
  return [
    { name: 'name', label: '名称', control: 'text', required: true },
    {
      name: 'slug',
      label: '标识',
      control: 'text',
      required: create,
      tip: create
        ? '前台地址与内容表都存这个值，建议小写英文，如 baojian'
        : '改标识会自动同步已关联内容的分类值，但已分享出去的链接会失效',
    },
    { name: 'nameEn', label: '英文名称', control: 'text' },
    { name: 'anchor', label: '锚点', control: 'text', tip: '如 /products#baojian 里的 baojian' },
    { name: 'url', label: '跳转地址', control: 'url', tip: '商城渠道等需要外链的术语填这里' },
    { name: 'image', label: '配图', control: 'image', group: 'media' },
    { name: 'remark', label: '备注', control: 'textarea' },
    { name: 'sortOrder', label: '排序', control: 'number', group: 'sys', tip: '数字越小越靠前' },
    { name: 'status', label: '状态', control: 'status', group: 'sys' },
  ]
})

async function loadGroups(keepActive = true): Promise<void> {
  groupLoading.value = true
  try {
    groups.value = await taxonomies()
    if (!keepActive || !groups.value.some((item) => item.key === activeKey.value)) {
      activeKey.value = groups.value[0]?.key ?? ''
    }
  } finally {
    groupLoading.value = false
  }
}

async function loadTerms(): Promise<void> {
  if (!activeKey.value) {
    terms.value = []
    return
  }
  termLoading.value = true
  try {
    const res = await fetchTerms({
      taxonomyKey: activeKey.value,
      keyword: keyword.value.trim() || undefined,
      page: 1,
      pageSize: 200,
    })
    terms.value = res.list ?? []
  } finally {
    termLoading.value = false
  }
}

function selectGroup(item: TaxonomyItem): void {
  if (activeKey.value === item.key) return
  activeKey.value = item.key
  keyword.value = ''
  void loadTerms()
}

/** 术语变动会让前台下拉与内容列表的分类列失效，顺手清缓存 */
function refreshDict(): void {
  dict.invalidate(activeKey.value || undefined)
}

async function afterTermChange(): Promise<void> {
  refreshDict()
  await Promise.all([loadGroups(), loadTerms()])
}

function openGroupCreate(): void {
  groupMode.value = 'create'
  Object.assign(groupForm, { key: '', name: '', remark: '' })
  groupVisible.value = true
}

function openGroupEdit(): void {
  if (!activeGroup.value) return
  groupMode.value = 'edit'
  Object.assign(groupForm, {
    name: activeGroup.value.name,
    remark: activeGroup.value.remark ?? '',
  })
  groupVisible.value = true
}

async function submitGroup(): Promise<void> {
  if (groupSaving.value) return
  if (!(await groupDialogRef.value?.validate())) return
  groupSaving.value = true
  try {
    if (groupMode.value === 'create') {
      const row = await createTaxonomy({
        key: String(groupForm.key).trim(),
        name: String(groupForm.name).trim(),
        remark: String(groupForm.remark ?? '').trim() || undefined,
      })
      activeKey.value = row.key
      ElMessage.success('分类组已创建')
    } else if (activeGroup.value) {
      await updateTaxonomy(activeGroup.value.id, {
        name: String(groupForm.name).trim(),
        remark: String(groupForm.remark ?? '').trim(),
      })
      ElMessage.success('已保存')
    }
    groupVisible.value = false
    refreshDict()
    await loadGroups()
    await loadTerms()
  } finally {
    groupSaving.value = false
  }
}

async function removeGroup(): Promise<void> {
  const group = activeGroup.value
  if (!group) return
  try {
    await ElMessageBox.confirm(
      `删除「${group.name}」会连同其下 ${group.termCount ?? 0} 个术语一起移除，确认？`,
      '删除分类组',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
  } catch {
    return
  }
  await deleteTaxonomy(group.id)
  ElMessage.success('已删除')
  activeKey.value = ''
  await loadGroups(false)
  await loadTerms()
}

function openTermCreate(): void {
  termMode.value = 'create'
  editingTermId.value = ''
  Object.assign(termForm, {
    name: '',
    slug: '',
    nameEn: '',
    anchor: '',
    url: '',
    image: '',
    remark: '',
    sortOrder: (terms.value.at(-1)?.sortOrder ?? 0) + 1,
    status: 1,
  })
  termVisible.value = true
}

function openTermEdit(row: TermItem): void {
  termMode.value = 'edit'
  editingTermId.value = row.id
  Object.assign(termForm, {
    name: row.name,
    slug: row.slug,
    nameEn: row.nameEn ?? '',
    anchor: row.anchor ?? '',
    url: row.url ?? '',
    image: row.image ?? '',
    remark: row.remark ?? '',
    sortOrder: row.sortOrder,
    status: row.status,
  })
  termVisible.value = true
}

function buildTermPayload(): TermPayload {
  const text = (name: string): string => String(termForm[name] ?? '').trim()
  const out: TermPayload = {
    taxonomyKey: activeKey.value,
    name: text('name'),
    nameEn: text('nameEn'),
    anchor: text('anchor'),
    url: text('url'),
    image: text('image'),
    remark: text('remark'),
    sortOrder: Number(termForm.sortOrder) || 0,
    status: Number(termForm.status),
  }
  const slug = text('slug')
  // 更新时空标识等于「不改」，传空串会让服务端把 slug 写坏，所以只在有值时带上
  if (slug) out.slug = slug
  else if (termMode.value === 'create') out.slug = ''
  return out
}

async function submitTerm(): Promise<void> {
  if (termSaving.value || !activeKey.value) return
  if (!(await termDialogRef.value?.validate())) return
  termSaving.value = true
  try {
    const payload = buildTermPayload()
    if (termMode.value === 'create') await createTerm(payload)
    else await updateTerm(editingTermId.value, { ...payload, taxonomyKey: undefined })
    ElMessage.success('已保存')
    termVisible.value = false
    await afterTermChange()
  } finally {
    termSaving.value = false
  }
}

async function toggleTerm(row: TermItem): Promise<void> {
  const next = row.status === 1 ? 0 : 1
  await setTermStatus(row.id, next)
  ElMessage.success(next === 1 ? '已启用' : '已禁用')
  await afterTermChange()
}

async function removeTerm(row: TermItem): Promise<void> {
  await deleteTerm(row.id)
  ElMessage.success('已删除')
  await afterTermChange()
}

function openSort(): void {
  sortItems.value = terms.value.map((item) => ({ id: item.id, label: item.name, status: item.status }))
  sortVisible.value = true
}

async function submitSort(ids: string[]): Promise<void> {
  sortSaving.value = true
  try {
    await sortTerms(ids)
    ElMessage.success('顺序已保存')
    sortVisible.value = false
    await afterTermChange()
  } finally {
    sortSaving.value = false
  }
}

onMounted(async () => {
  await loadGroups()
  await loadTerms()
})
</script>

<style scoped>
.tax-card {
  height: 100%;
}

.tax-card__head {
  font-size: 13px;
  font-weight: 600;
}

.tax-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tax-list__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
  border-left: 3px solid transparent;
}

.tax-list__item:hover {
  background: var(--el-fill-color-light);
}

.tax-list__item.is-active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-left-color: var(--el-color-primary);
}

.tax-list__name {
  flex: 0 0 auto;
  font-weight: 500;
}

.tax-list__key {
  flex: 1 1 auto;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tax-list__count {
  flex: 0 0 auto;
  min-width: 20px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-align: center;
  background: var(--el-fill-color);
  border-radius: 9px;
}

.tax-hint {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
