<template>
  <div class="designer" v-loading="loading">
    <div class="designer__bar">
      <div class="designer__bar-left">
        <el-button text :icon="ArrowLeft" @click="back">页面列表</el-button>
        <template v-if="page">
          <h2 class="designer__title">{{ page.name }}</h2>
          <el-tag size="small" type="info" effect="plain">{{ page.key }}</el-tag>
          <el-tag size="small" :type="pageStatusTag" effect="plain">{{ statusMeta(page.status).label }}</el-tag>
          <span class="designer__path cell-mono">{{ page.path }}</span>
        </template>
      </div>
      <div class="page-toolbar__actions">
        <el-tag v-if="dirty" size="small" type="warning" effect="light">有未保存的修改</el-tag>
        <el-tooltip content="重新载入（丢弃未保存改动）" placement="bottom">
          <el-button :icon="Refresh" circle :disabled="saving" @click="load(true)" />
        </el-tooltip>
        <el-button :disabled="!dirty || saving" @click="discard">放弃修改</el-button>
        <el-button v-if="canEdit" type="primary" :loading="saving" :disabled="!dirty" @click="save">保存全部</el-button>
        <el-button :icon="Monitor" @click="previewOpen = !previewOpen">{{ previewOpen ? '收起预览' : '前台预览' }}</el-button>
      </div>
    </div>

    <el-empty v-if="!loading && !page" description="未找到该页面，可能已被删除">
      <el-button type="primary" @click="back">返回页面列表</el-button>
    </el-empty>

    <el-row v-else-if="page" :gutter="12">
      <el-col :xs="24" :lg="previewOpen ? 15 : 24">
        <el-card shadow="never" class="designer__card">
          <template #header>
            <div class="designer__card-head">
              <span>页头与信息</span>
              <el-button text size="small" @click="pageFormOpen = !pageFormOpen">
                {{ pageFormOpen ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
          <DynamicForm v-show="pageFormOpen" ref="pageFormRef" :specs="pageFields" :values="pageForm" :disabled="!canEdit" />
        </el-card>

        <div class="designer__head">
          <div>
            <span class="designer__head-title">区块组</span>
            <span class="muted">共 {{ sections.length }} 组 / {{ blockCount }} 个区块，拖动 ⠿ 调整顺序</span>
          </div>
          <el-button v-if="canEdit" type="primary" plain size="small" :icon="Plus" @click="openSection()">新增区块组</el-button>
        </div>

        <VueDraggable v-if="canEdit" v-model="sections" group="page-sections" :animation="160" handle=".sec-handle" class="sec-list">
          <div v-for="(section, index) in sections" :key="section.key" class="sec-card" :class="{ 'sec-card--off': section.status !== 1 }">
            <div class="sec-card__head">
              <el-icon class="sec-handle" title="拖动排序"><Rank /></el-icon>
              <span class="sec-card__no">{{ index + 1 }}</span>
              <div class="sec-card__text">
                <span class="sec-card__label">{{ section.label || section.anchor || '未命名区块组' }}</span>
                <span class="sec-card__sub cell-mono">#{{ section.anchor }}</span>
              </div>
              <div class="sec-card__tags">
                <el-tag size="small" effect="plain">{{ section.blocks.length }} 区块</el-tag>
                <el-tag v-if="section.showInSubNav" size="small" type="success" effect="plain">子导航</el-tag>
                <el-tag v-if="section.variant" size="small" type="warning" effect="plain">{{ variantLabel(section.variant) }}</el-tag>
                <el-tag v-if="section.status !== 1" size="small" type="info" effect="plain">{{ statusMeta(section.status).label }}</el-tag>
              </div>
              <div class="page-toolbar__actions">
                <el-button text size="small" @click="toggleFold(section.anchor)">
                  {{ folded.has(section.anchor) ? '展开' : '收起' }}
                </el-button>
                <el-button link type="primary" size="small" @click="openSection(section)">编辑</el-button>
                <el-button link size="small" @click="openBlock(section)">加区块</el-button>
                <el-button link type="danger" size="small" @click="removeSection(index)">删除</el-button>
              </div>
            </div>

            <div v-show="!folded.has(section.anchor)" class="sec-card__body">
              <VueDraggable v-model="section.blocks" group="page-blocks" :animation="160" handle=".blk-handle" class="blk-list">
                <div v-for="(block, bIndex) in section.blocks" :key="block.key" class="blk-row" :class="{ 'blk-row--off': block.status !== 1 }">
                  <el-icon class="blk-handle" title="拖动排序"><Rank /></el-icon>
                  <span class="blk-row__no">{{ bIndex + 1 }}</span>
                  <el-tag size="small" :type="block.source ? 'primary' : 'info'" effect="plain">{{ typeLabel(block.type) }}</el-tag>
                  <div class="blk-row__text">
                    <span>{{ block.title || '（无标题）' }}</span>
                    <span class="blk-row__code cell-mono">{{ block.code }}</span>
                  </div>
                  <el-tag v-if="block.status !== 1" size="small" type="info" effect="plain">{{ statusMeta(block.status).label }}</el-tag>
                  <div class="page-toolbar__actions">
                    <el-button link type="primary" size="small" @click="openBlock(section, block)">编辑</el-button>
                    <el-dropdown v-if="sections.length > 1" trigger="click" @command="onMoveCommand(section, block, $event)">
                      <el-button link size="small">移动<el-icon :size="12"><ArrowDown /></el-icon></el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item v-for="other in sections.filter((item) => item.key !== section.key)" :key="other.key" :command="other.key">
                            {{ other.label || other.anchor }}
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                    <el-popconfirm title="删除该区块？保存全部后生效" width="220" @confirm="removeBlock(section, block)">
                      <template #reference>
                        <el-button link type="danger" size="small">删除</el-button>
                      </template>
                    </el-popconfirm>
                  </div>
                </div>
              </VueDraggable>

              <p v-if="!section.blocks.length" class="muted sec-card__empty">该区块组还没有区块，点「加区块」开始装修。</p>
            </div>
          </div>
        </VueDraggable>

        <!-- 只读角色没有编辑权限时给一份不可拖动的同一视图，避免看不到内容 -->
        <div v-else class="sec-list">
          <div v-for="(section, index) in sections" :key="section.key" class="sec-card">
            <div class="sec-card__head">
              <span class="sec-card__no">{{ index + 1 }}</span>
              <div class="sec-card__text">
                <span class="sec-card__label">{{ section.label }}</span>
                <span class="sec-card__sub cell-mono">#{{ section.anchor }}</span>
              </div>
              <div class="sec-card__tags">
                <el-tag size="small" effect="plain">{{ section.blocks.length }} 区块</el-tag>
              </div>
            </div>
            <div class="sec-card__body">
              <div v-for="block in section.blocks" :key="block.key" class="blk-row">
                <el-tag size="small" type="info" effect="plain">{{ typeLabel(block.type) }}</el-tag>
                <div class="blk-row__text">
                  <span>{{ block.title || '（无标题）' }}</span>
                  <span class="blk-row__code cell-mono">{{ block.code }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <el-alert
          v-if="canEdit"
          class="designer__tip"
          type="info"
          :closable="false"
          show-icon
          title="整页保存按「锚点」匹配区块组、按「编码」匹配区块：改标识会被当作新建一条，原记录连同其数据一并删除。"
        />
      </el-col>

      <el-col v-if="previewOpen" :xs="24" :lg="9">
        <el-card shadow="never" class="designer__card designer__preview">
          <template #header>
            <div class="designer__card-head">
              <span>前台预览</span>
              <div class="page-toolbar__actions">
                <el-button text size="small" :icon="Refresh" @click="previewNonce += 1">刷新</el-button>
                <el-button text size="small" :icon="TopRight" @click="openFront">新窗口</el-button>
              </div>
            </div>
          </template>
          <p class="form-tip designer__preview-tip">预览地址 {{ siteUrl }}，改完记得先「保存全部」再看效果。</p>
          <iframe :key="previewNonce" :src="previewUrl" class="designer__frame" title="前台预览" />
        </el-card>
      </el-col>
    </el-row>

    <FormDialog
      ref="sectionDialogRef"
      v-model="sectionVisible"
      :title="sectionMode === 'create' ? '新增区块组' : `编辑区块组 · ${sectionForm.label || sectionForm.anchor}`"
      :specs="sectionFields"
      :values="sectionForm"
      size="680px"
      :hint="sectionMode === 'create' ? '新区块组排在末尾，可在列表里拖动调整位置。' : '改锚点等于新建一个区块组，原区块组及其区块会在保存时被删除。'"
      @save="submitSection"
    />

    <BlockEditorDrawer
      v-if="schemas"
      v-model="blockVisible"
      :schemas="schemas"
      :block="drawerBlock"
      :section-label="drawerSectionLabel"
      @save="onBlockSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, ArrowLeft, Monitor, Plus, Rank, Refresh, TopRight } from '@element-plus/icons-vue'
import { VueDraggable } from 'vue-draggable-plus'
import { blockSchemas, getPage, savePageTree, SECTION_VARIANTS, type BlockNode, type BlockSchemas, type PageDetail } from '@/api/modules/page'
import { useUserStore } from '@/stores/user'
import { statusMeta } from '@/types/api'
import { blankForm, type FieldSpec } from '@/utils/field'
import DynamicForm from '@/components/DynamicForm.vue'
import FormDialog from '@/components/FormDialog.vue'
import BlockEditorDrawer from '@/components/BlockEditorDrawer.vue'
import { pageFormOf, pagePayloadOf, pageSpecs } from './pageFields'
import {
  applyBlockDraft,
  blankBlock,
  blankSection,
  blockNodeOf,
  draftsOf,
  sectionsFromPayload,
  sectionsPayload,
  snapshot,
  validateSections,
  type DraftBlock,
  type DraftSection,
} from './pageDraft'

/** '' 代表默认外观，已由 placeholder 表达，下拉里不重复列出 */
const variantOptions = SECTION_VARIANTS.filter((item) => item.value).map((item) => ({
  label: `${item.label}（${item.value}）`,
  value: item.value,
}))

const VARIANT_LABELS: Record<string, string> = Object.fromEntries(SECTION_VARIANTS.map((item) => [item.value, item.label]))

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const siteUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000'

const pageId = computed(() => String(route.params.id ?? ''))

const loading = ref(false)
const saving = ref(false)
const page = ref<PageDetail | null>(null)
const schemas = ref<BlockSchemas | null>(null)
const sections = ref<DraftSection[]>([])
const baseline = ref('[]')

const pageForm = reactive<Record<string, any>>({})
const pageBaseline = ref('{}')
const pageFormRef = ref<InstanceType<typeof DynamicForm>>()
const pageFormOpen = ref(true)

const dirty = computed(
  () => !!page.value && (snapshot(sections.value) !== baseline.value || JSON.stringify(pageForm) !== pageBaseline.value),
)

const canEdit = computed(() => user.has('page:edit'))
const pageFields = computed<FieldSpec[]>(() => pageSpecs('edit'))
const blockCount = computed(() => sections.value.reduce((sum, item) => sum + item.blocks.length, 0))
const pageStatusTag = computed(() => (page.value?.status === 1 ? 'success' : page.value?.status === 2 ? 'warning' : 'info'))

/** 折叠状态按锚点记，重新载入后仍能对上 */
const folded = ref(new Set<string>())

function toggleFold(anchor: string): void {
  const next = new Set(folded.value)
  if (next.has(anchor)) next.delete(anchor)
  else next.add(anchor)
  folded.value = next
}

function typeLabel(type: string): string {
  return schemas.value?.types?.find((item) => item.type === type)?.label ?? type
}

function variantLabel(variant: string): string {
  return VARIANT_LABELS[variant] ?? variant
}

const sectionFields = computed<FieldSpec[]>(() => [
  {
    name: 'anchor',
    label: '锚点',
    control: 'text',
    required: true,
    tip: '页面内唯一，小写字母数字与短横线，如 intro；前台子导航与 /about#intro 深链都依赖它',
  },
  { name: 'label', label: '名称', control: 'text', required: true, tip: '后台标识文案，勾选子导航时也是前台子导航的文字' },
  { name: 'eyebrow', label: '眉标', control: 'text' },
  { name: 'title', label: '标题', control: 'text' },
  { name: 'subtitle', label: '副标题', control: 'textarea', group: 'detail' },
  {
    name: 'variant',
    label: '外观',
    control: 'select',
    placeholder: '默认（米白底）',
    options: variantOptions,
    group: 'detail',
    tip: '决定整组的背景与文字色，取值与前台区块组件约定一致',
  },
  { name: 'showInSubNav', label: '进入子导航', control: 'switch', group: 'detail' },
  { name: 'status', label: '状态', control: 'status', group: 'sys', tip: '非「已发布」的区块组前台不渲染' },
])

function resetPageForm(): void {
  for (const key of Object.keys(pageForm)) delete pageForm[key]
  Object.assign(pageForm, pageFormOf(page.value ?? {}))
  pageBaseline.value = JSON.stringify(pageForm)
}

async function load(silent = false): Promise<void> {
  if (!pageId.value) {
    ElMessage.error('缺少页面参数')
    return
  }
  loading.value = true
  try {
    const [detail, meta] = await Promise.all([getPage(pageId.value), blockSchemas()])
    page.value = detail
    schemas.value = meta
    sections.value = draftsOf(detail)
    baseline.value = snapshot(sections.value)
    resetPageForm()
    if (!silent) ElMessage.success(`已载入 ${detail.name}`)
  } catch {
    // 拦截器已提示，这里只把页面置空以显示空态
    page.value = null
  } finally {
    loading.value = false
  }
}

function back(): void {
  void router.push('/page')
}

function discard(): void {
  sections.value = sectionsFromPayload(JSON.parse(baseline.value) as Record<string, any>[])
  resetPageForm()
  ElMessage.info('已恢复到上次保存的状态')
}

async function save(): Promise<void> {
  if (!page.value) return
  // validate 只有在表单实例缺失时才会返回 undefined，那种情况按通过处理
  if ((await pageFormRef.value?.validate()) === false) {
    pageFormOpen.value = true
    ElMessage.warning('页头信息有必填项未填')
    return
  }
  const invalid = validateSections(sections.value)
  if (invalid) {
    ElMessage.warning(invalid)
    return
  }
  saving.value = true
  try {
    const detail = await savePageTree(page.value.id, {
      page: pagePayloadOf(pageForm, 'edit'),
      sections: sectionsPayload(sections.value),
    })
    // 后端会裁剪 props、归一化标识，一律以返回值为准重建草稿，避免本地留存脏数据
    page.value = detail
    sections.value = draftsOf(detail)
    baseline.value = snapshot(sections.value)
    resetPageForm()
    ElMessage.success('整页已保存')
  } finally {
    saving.value = false
  }
}

// ---------- 页面对外预览 ----------

const previewOpen = ref(false)
const previewNonce = ref(0)
const previewUrl = computed(() => {
  const path = page.value?.path ?? ''
  if (!path) return ''
  // 前台是 hash 路由：把刷新因子放在 # 之前，才能强制整份文档重新加载取数
  return `${siteUrl}/?v=${previewNonce.value}#${path}`
})

function openFront(): void {
  if (page.value?.path) window.open(`${siteUrl}/#${page.value.path}`, '_blank', 'noopener')
}

// ---------- 区块组弹窗 ----------

const sectionDialogRef = ref<InstanceType<typeof FormDialog>>()
const sectionVisible = ref(false)
const sectionMode = ref<'create' | 'edit'>('create')
const editingSectionKey = ref('')
const sectionForm = reactive<Record<string, any>>({})

function pickSectionForm(): Record<string, any> {
  return {
    anchor: String(sectionForm.anchor ?? '').trim(),
    label: String(sectionForm.label ?? '').trim(),
    eyebrow: String(sectionForm.eyebrow ?? '').trim(),
    title: String(sectionForm.title ?? '').trim(),
    subtitle: String(sectionForm.subtitle ?? '').trim(),
    variant: String(sectionForm.variant ?? ''),
    showInSubNav: sectionForm.showInSubNav !== false,
    status: Number(sectionForm.status ?? 1),
  }
}

function openSection(section?: DraftSection): void {
  sectionMode.value = section ? 'edit' : 'create'
  editingSectionKey.value = section?.key ?? ''
  for (const key of Object.keys(sectionForm)) delete sectionForm[key]
  Object.assign(sectionForm, blankForm(sectionFields.value), section ? pickSectionOf(section) : {})
  sectionVisible.value = true
}

function pickSectionOf(section: DraftSection): Record<string, any> {
  return {
    anchor: section.anchor,
    label: section.label,
    eyebrow: section.eyebrow,
    title: section.title,
    subtitle: section.subtitle,
    variant: section.variant,
    showInSubNav: section.showInSubNav,
    status: section.status,
  }
}

async function submitSection(): Promise<void> {
  if (!(await sectionDialogRef.value?.validate())) return
  const values = pickSectionForm()
  const conflict = sections.value.some((item) => item.key !== editingSectionKey.value && item.anchor.trim() === values.anchor)
  if (conflict) {
    ElMessage.warning(`锚点 ${values.anchor} 已被其他区块组占用`)
    return
  }
  if (sectionMode.value === 'create') {
    const draft = blankSection()
    Object.assign(draft, values)
    sections.value.push(draft)
  } else {
    const target = sections.value.find((item) => item.key === editingSectionKey.value)
    if (target) Object.assign(target, values)
  }
  sectionVisible.value = false
}

async function removeSection(index: number): Promise<void> {
  const section = sections.value[index]
  if (!section) return
  const name = section.label || section.anchor || '未命名区块组'
  try {
    await ElMessageBox.confirm(
      section.blocks.length
        ? `删除「${name}」会连同其 ${section.blocks.length} 个区块一起移除，保存全部后生效。确认删除？`
        : `删除「${name}」，保存全部后生效。确认删除？`,
      '删除区块组',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  sections.value.splice(index, 1)
}

// ---------- 区块抽屉 ----------

const blockVisible = ref(false)
const drawerBlock = ref<BlockNode | null>(null)
const drawerSectionLabel = ref('')
const blockTarget = reactive({ sectionKey: '', blockKey: '' })

function openBlock(section: DraftSection, block?: DraftBlock): void {
  blockTarget.sectionKey = section.key
  blockTarget.blockKey = block?.key ?? ''
  drawerSectionLabel.value = section.label || section.anchor
  drawerBlock.value = block ? blockNodeOf(block, section.id ?? '') : null
  blockVisible.value = true
}

function onBlockSave(payload: Partial<BlockNode>): void {
  const section = sections.value.find((item) => item.key === blockTarget.sectionKey)
  if (!section) return
  let draft = blockTarget.blockKey ? section.blocks.find((item) => item.key === blockTarget.blockKey) : undefined
  if (!draft) {
    draft = blankBlock(String(payload.type ?? 'card_grid'))
    section.blocks.push(draft)
  }
  applyBlockDraft(draft, payload)
  const code = draft.code.trim()
  if (section.blocks.some((item) => item.key !== draft!.key && item.code.trim() === code)) {
    ElMessage.warning(`编码 ${code} 在本区块组内已重复，请改成唯一编码`)
  }
}

function onMoveCommand(from: DraftSection, block: DraftBlock, command: unknown): void {
  const target = sections.value.find((item) => item.key === String(command))
  if (!target || target.key === from.key) return
  const code = block.code.trim()
  if (target.blocks.some((item) => item.code.trim() === code)) {
    ElMessage.warning(`「${target.label || target.anchor}」已有编码 ${code} 的区块，请先改本区块编码`)
    return
  }
  from.blocks.splice(from.blocks.indexOf(block), 1)
  target.blocks.push(block)
}

function removeBlock(section: DraftSection, block: DraftBlock): void {
  const index = section.blocks.indexOf(block)
  if (index >= 0) section.blocks.splice(index, 1)
}

// ---------- 离开保护 ----------

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('当前页面有未保存的装修改动，离开后将丢失。确认离开？', '未保存的改动', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑',
    })
    return true
  } catch {
    return false
  }
})

// 换页（同组件复用实例）时重新取数
watch(pageId, () => {
  void load(true)
})

onMounted(() => {
  void load(true)
})
</script>

<style scoped>
.designer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.designer__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
}

.designer__bar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.designer__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.designer__path {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.designer__card {
  margin-bottom: 12px;
}

.designer__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.designer__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.designer__head-title {
  margin-right: 8px;
  font-size: 15px;
  font-weight: 600;
}

.sec-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sec-card {
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-left: 3px solid var(--el-color-primary);
}

.sec-card--off {
  border-left-color: var(--el-border-color);
  opacity: 0.72;
}

.sec-card__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
}

.sec-card__no,
.blk-row__no {
  min-width: 18px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.sec-card__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.sec-card__label {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sec-card__sub,
.blk-row__code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sec-card__tags {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.sec-card__body {
  padding: 8px 10px 10px 14px;
  background: var(--el-fill-color-lighter);
  border-top: 1px dashed var(--el-border-color-lighter);
}

.sec-card__empty {
  margin: 4px 0 0;
  font-size: 12px;
}

.blk-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.blk-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  font-size: 13px;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
}

.blk-row--off {
  color: var(--el-text-color-secondary);
  opacity: 0.7;
}

.blk-row__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.blk-row__text span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blk-handle,
.sec-handle {
  color: var(--el-text-color-secondary);
  cursor: grab;
}

.designer__tip {
  margin-top: 4px;
}

.designer__preview {
  position: sticky;
  top: 8px;
}

.designer__preview-tip {
  margin-bottom: 6px;
}

.designer__frame {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.cell-mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}
</style>
