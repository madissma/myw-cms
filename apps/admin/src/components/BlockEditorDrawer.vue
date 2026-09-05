<template>
  <el-drawer
    v-model="visible"
    :title="drawerTitle"
    size="760px"
    append-to-body
    :close-on-click-modal="false"
    class="block-editor"
  >
    <el-form label-position="top" :model="form">
      <section class="block-editor__group">
        <h4 class="block-editor__title">基本信息</h4>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <FormField :spec="specCode" v-model="form.code" :disabled="isEdit" />
          </el-col>
          <el-col :xs="24" :sm="12">
            <FormField :spec="specType" v-model="form.type" />
          </el-col>
          <el-col :span="24">
            <FormField :spec="specTitle" v-model="form.title" />
          </el-col>
          <el-col v-if="currentDef?.hasColumns" :xs="24" :sm="12">
            <FormField :spec="specColumns" v-model="form.columns" />
          </el-col>
          <el-col :xs="24" :sm="12">
            <FormField :spec="specStatus" v-model="form.status" />
          </el-col>
        </el-row>
        <p class="form-tip">当前类型「{{ currentDef?.label ?? form.type }}」的字段由后端区块登记表提供，切换类型不会清空已填内容。</p>
      </section>

      <!-- 引用型区块：只存数据源与查询，实体内容不在这里维护 -->
      <section v-if="currentDef?.entityDriven" class="block-editor__group">
        <h4 class="block-editor__title">数据来源</h4>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <FormField :spec="specSource" v-model="form.source" />
          </el-col>
          <el-col v-if="form.source === 'term'" :xs="24" :sm="12">
            <FormField :spec="specTaxonomy" v-model="queryDraft.taxonomy" />
          </el-col>
          <el-col :xs="24" :sm="12">
            <FormField :spec="specLimit" v-model="queryDraft.limit" />
          </el-col>
          <el-col :span="24">
            <FormField :spec="specWhere" v-model="queryDraft.where" />
          </el-col>
          <el-col :span="24">
            <FormField :spec="specOrderBy" v-model="queryDraft.orderBy" />
          </el-col>
        </el-row>
      </section>

      <!-- 内联数据型区块：按 kind 动态渲染，items 会递归展开 -->
      <section v-else class="block-editor__group">
        <h4 class="block-editor__title">
          区块内容
          <el-radio-group v-model="contentMode" size="small" class="block-editor__mode">
            <el-radio-button value="form">表单</el-radio-button>
            <el-radio-button value="json">JSON</el-radio-button>
          </el-radio-group>
        </h4>

        <div v-if="contentMode === 'form'">
          <template v-if="currentDef">
            <BlockFieldControl
              v-for="field in currentDef.fields"
              :key="field.name"
              :field="field"
              :model-value="propsDraft[field.name]"
              @update:model-value="propsDraft[field.name] = $event"
            />
          </template>
          <el-alert v-else type="warning" :closable="false" show-icon title="未找到该区块类型的字段定义，请切到 JSON 模式或先保存类型" />
        </div>

        <FormField v-else :spec="specPropsJson" v-model="propsDraft" />
      </section>
    </el-form>

    <template #footer>
      <div class="block-editor__foot">
        <span class="form-tip">区块按「编码」在整页保存时匹配，改编码等于新建一个区块。</span>
        <div class="page-toolbar__actions">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="save">{{ isEdit ? '应用修改' : '加入区块' }}</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { taxonomies, type TaxonomyItem } from '@/api/modules/taxonomy'
import type { BlockNode, BlockSchemas, BlockTypeDef } from '@/api/modules/page'
import type { FieldSpec } from '@/utils/field'
import BlockFieldControl from './BlockFieldControl.vue'
import FormField from './FormField.vue'

const props = withDefaults(
  defineProps<{
    schemas: BlockSchemas
    /** null 表示新增 */
    block?: BlockNode | null
    sectionLabel?: string
  }>(),
  { block: null, sectionLabel: '' },
)

const emit = defineEmits<{ (e: 'save', value: Partial<BlockNode>): void }>()

const visible = defineModel<boolean>({ type: Boolean, default: false })

const contentMode = ref<'form' | 'json'>('form')

const form = reactive({
  id: '',
  code: '',
  type: 'card_grid',
  title: '',
  columns: null as number | null,
  status: 1,
  source: '',
  sortOrder: 0,
})

/** props 与 query 是自由结构，单独放两个可写对象，保存时再序列化 */
const propsDraft = reactive<Record<string, any>>({})
const queryDraft = reactive<Record<string, any>>({ where: {}, orderBy: [{ sortOrder: 'asc' }], limit: 6, taxonomy: '' })

const isEdit = computed(() => !!form.id)

const taxonomyOptions = ref<TaxonomyItem[]>([])

const drawerTitle = computed(() => `${isEdit.value ? '编辑区块' : '新增区块'}${props.sectionLabel ? ` · ${props.sectionLabel}` : ''}`)

const currentDef = computed<BlockTypeDef | undefined>(() =>
  props.schemas?.schemas?.find((item) => item.type === form.type),
)

const specCode: FieldSpec = {
  name: 'code',
  label: '区块编码',
  control: 'text',
  required: true,
  tip: '同一区块内唯一，英文小写，如 advantages',
}

const specType = computed<FieldSpec>(() => ({
  name: 'type',
  label: '区块类型',
  control: 'select',
  required: true,
  options: (props.schemas?.types ?? []).map((item) => ({ label: `${item.label}（${item.type}）`, value: item.type })),
}))

const specTitle: FieldSpec = { name: 'title', label: '区块标题', control: 'text', tip: '多数类型取此处标题，卡片内部标题在内容里单独填' }

const specColumns: FieldSpec = { name: 'columns', label: '栅格列数', control: 'number', tip: '前台按列数选择 grid class，留空用类型默认值' }

const specStatus: FieldSpec = { name: 'status', label: '状态', control: 'status' }

const specSource = computed<FieldSpec>(() => ({
  name: 'source',
  label: '数据源',
  control: 'select',
  required: true,
  options: (props.schemas?.entities ?? []).map((item) => ({ label: item.label, value: item.value })),
  tip: '前台渲染时按查询条件实时取数，不存副本',
}))

const specTaxonomy = computed<FieldSpec>(() => ({
  name: 'taxonomy',
  label: '术语组',
  control: 'select',
  required: true,
  options: taxonomyOptions.value.map((item) => ({ label: `${item.name}（${item.key}）`, value: item.key })),
  tip: 'term 数据源必须指定分类组，否则解析为空',
}))

const specLimit: FieldSpec = { name: 'limit', label: '取几条', control: 'number', tip: '1 ~ 60，默认 6' }

const specWhere: FieldSpec = {
  name: 'where',
  label: '过滤条件（JSON）',
  control: 'json',
  tip: '例：{"isFeatured":true}；status 由服务端强制为 1',
}

const specOrderBy: FieldSpec = {
  name: 'orderBy',
  label: '排序（JSON 数组）',
  control: 'json',
  tip: '例：[{"sortOrder":"asc"}]，留空按 sortOrder 升序',
}

const specPropsJson: FieldSpec = {
  name: 'props',
  label: 'props（JSON）',
  control: 'json',
  tip: '高级模式下直接改整块数据，字段名需与前台区块组件一致',
}

async function ensureTaxonomies(): Promise<void> {
  if (taxonomyOptions.value.length) return
  try {
    taxonomyOptions.value = await taxonomies()
  } catch {
    taxonomyOptions.value = []
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T
}

function hydrate(block: BlockNode | null | undefined): void {
  contentMode.value = 'form'
  form.id = block?.id ?? ''
  form.code = block?.code ?? ''
  form.type = block?.type ?? 'card_grid'
  form.title = block?.title ?? ''
  form.columns = block?.columns ?? null
  form.status = block?.status ?? 1
  form.source = block?.source ?? ''
  form.sortOrder = block?.sortOrder ?? 0

  for (const key of Object.keys(propsDraft)) delete propsDraft[key]
  Object.assign(propsDraft, clone(block?.props ?? {}) as Record<string, any>)

  for (const key of Object.keys(queryDraft)) delete queryDraft[key]
  Object.assign(queryDraft, {
    where: {},
    orderBy: [{ sortOrder: 'asc' }],
    limit: 6,
    taxonomy: '',
    ...(clone(block?.query ?? {}) as Record<string, any>),
  })
  if (block?.source === 'term') void ensureTaxonomies()
}

watch(visible, (open) => {
  if (open) hydrate(props.block)
})

watch(
  () => form.source,
  (source) => {
    if (source === 'term') void ensureTaxonomies()
  },
)

function save(): void {
  if (!form.code.trim()) {
    ElMessage.warning('请填写区块编码')
    return
  }
  if (!form.type) {
    ElMessage.warning('请选择区块类型')
    return
  }
  const def = currentDef.value
  const payload: Partial<BlockNode> = {
    id: form.id || undefined,
    code: form.code.trim(),
    type: form.type,
    title: form.title.trim(),
    columns: def?.hasColumns ? form.columns : null,
    status: Number(form.status) || 0,
    sortOrder: form.sortOrder,
    source: def?.entityDriven ? form.source : null,
    query: def?.entityDriven
      ? {
          where: queryDraft.where ?? {},
          orderBy: queryDraft.orderBy ?? [{ sortOrder: 'asc' }],
          limit: Number(queryDraft.limit) || 6,
          ...(queryDraft.taxonomy ? { taxonomy: queryDraft.taxonomy } : {}),
        }
      : null,
    props: { ...propsDraft },
  }
  emit('save', payload)
  visible.value = false
}
</script>

<style scoped>
.block-editor__group + .block-editor__group {
  margin-top: 10px;
}

.block-editor__title {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 0 0 10px;
  padding-left: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  border-left: 3px solid var(--el-color-primary);
}

.block-editor__mode {
  margin-left: auto;
}

.block-editor__foot {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
</style>
