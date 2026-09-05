<template>
  <PageContainer title="组织管理" subtitle="部门与组织架构树，用于用户的归属划分" :loading="booting">
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openCreate('')">新增一级部门</el-button>
    </template>

    <template #toolbar>
      <el-input v-model="keyword" placeholder="按名称或编码过滤" clearable style="width: 220px" />
      <div class="page-toolbar__actions">
        <el-button :icon="Refresh" circle @click="load" />
      </div>
    </template>

    <el-alert
      v-if="canEdit"
      type="info"
      :closable="false"
      show-icon
      title="按住节点拖动可调整同级顺序，或拖到别的部门里改上级；保存后以服务端结果为准。"
      class="org-alert"
    />

    <el-tree
      v-if="visibleTree.length || loading"
      v-loading="loading"
      class="org-tree"
      :data="visibleTree"
      node-key="id"
      :props="treeProps"
      :draggable="canEdit"
      default-expand-all
      :expand-on-click-node="false"
      @node-drop="onNodeDrop"
    >
      <template #default="{ data }">
        <div class="org-node">
          <span class="org-node__name">{{ data.name }}</span>
          <span v-if="data.code" class="org-node__code cell-mono">{{ data.code }}</span>
          <el-tag v-if="data.status !== 1" size="small" type="info" effect="plain">停用</el-tag>
          <span class="org-node__meta">{{ data.userCount ?? 0 }} 人</span>
          <span class="org-node__ops">
            <el-button v-if="canCreate" link type="primary" @click.stop="openCreate(data.id)">加子部门</el-button>
            <el-button v-if="canEdit" link type="primary" @click.stop="openEdit(data)">编辑</el-button>
            <el-button v-if="canEdit" link :type="data.status === 1 ? 'info' : 'success'" @click.stop="toggleStatus(data)">
              {{ data.status === 1 ? '停用' : '启用' }}
            </el-button>
            <el-popconfirm v-if="canDelete" title="删除后无法恢复，确认？" width="220" @confirm="removeRow(data)">
              <template #reference>
                <el-button link type="danger" @click.stop>删除</el-button>
              </template>
            </el-popconfirm>
          </span>
        </div>
      </template>
      <template #empty>
        <span class="muted">没有匹配的部门</span>
      </template>
    </el-tree>

    <el-empty v-else :description="keyword.trim() ? '没有匹配的部门' : '还没有组织，点击右上角新增一级部门'" :image-size="80" />
  </PageContainer>

  <el-dialog
    v-model="dialogVisible"
    :title="mode === 'create' ? '新增部门' : `编辑部门 · ${form.name}`"
    width="560px"
    top="10vh"
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="上级部门" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="parentOptions"
          :props="treeProps"
          node-key="id"
          check-strictly
          clearable
          :value-on-clear="''"
          default-expand-all
          placeholder="不选即为一级部门"
          class="field-full"
        />
        <div class="form-tip">换上级时子部门会跟着一起移动，已挂在本部门的用户不受影响。</div>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item label="部门名称" prop="name">
            <el-input v-model.trim="form.name" clearable placeholder="例如：生产部" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="组织编码" prop="code">
            <el-input v-model.trim="form.code" clearable placeholder="选填，全局唯一，如 PROD" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="负责人" prop="leader">
            <el-input v-model.trim="form.leader" clearable placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model.trim="form.phone" clearable placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="排序值" prop="sortOrder">
            <el-input-number v-model="form.sortOrder" :min="0" :max="99999" :step="10" controls-position="right" />
            <div class="form-tip">新增时留空即排到同级末尾。</div>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio :value="1">启用</el-radio>
              <el-radio :value="0">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <div class="dialog-foot">
        <span class="form-tip">有子部门或已挂用户的部门不能删除，请先迁移或清理。</span>
        <div class="page-toolbar__actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  createOrg,
  deleteOrg,
  orgTree as fetchOrgTree,
  setOrgStatus,
  sortOrgs,
  updateOrg,
  type OrgItem,
} from '@/api/modules/system'
import { useUserStore } from '@/stores/user'
import PageContainer from '@/components/PageContainer.vue'

/** 弹窗里要按编辑对象屏蔽自身与子孙，避免把节点挂到自己的子树下面 */
type OrgOption = OrgItem & { disabled?: boolean; children?: OrgOption[] }

/** 拖拽回调里 EP 传的是内部 Node，这里只声明用到的部分 */
type DragNodeLike = {
  data: { id?: string; parentId?: string | null; name?: string }
  parent?: { data?: unknown; childNodes?: { data?: { id?: string } }[] } | null
}

const treeProps = { label: 'name', children: 'children', disabled: 'disabled' }

const user = useUserStore()

const booting = ref(false)
const loading = ref(false)
const orgTree = ref<OrgItem[]>([])
const keyword = ref('')

const canCreate = computed(() => user.has('system:org:create'))
const canEdit = computed(() => user.has('system:org:edit'))
const canDelete = computed(() => user.has('system:org:delete'))

const dialogVisible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  parentId: '',
  name: '',
  code: '',
  leader: '',
  phone: '',
  sortOrder: null as number | null,
  status: 1,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  code: [{ max: 64, message: '编码不超过 64 位', trigger: 'blur' }],
}

/** 过滤直接作用在数据上，不依赖 el-tree 的 filter API，展开状态也无需重新计算 */
const visibleTree = computed<OrgItem[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return orgTree.value
  return orgTree.value.map((node) => pickMatched(node, kw)).filter((node): node is OrgItem => !!node)
})

const parentOptions = computed<OrgOption[]>(() => {
  const blocked = mode.value === 'edit' && editingId.value ? descendantIds(editingId.value) : new Set<string>()
  return markDisabled(orgTree.value, blocked)
})

/** 命中节点连同其祖先一起保留，未命中的分支整枝裁掉 */
function pickMatched(node: OrgItem, kw: string): OrgItem | null {
  const children = (node.children ?? []).map((child) => pickMatched(child, kw)).filter((child): child is OrgItem => !!child)
  const selfMatched = `${node.name}`.toLowerCase().includes(kw) || `${node.code ?? ''}`.toLowerCase().includes(kw)
  if (!selfMatched && !children.length) return null
  return { ...node, children }
}

function collectIds(nodes: OrgItem[], out = new Set<string>()): Set<string> {
  for (const node of nodes) {
    out.add(node.id)
    if (node.children?.length) collectIds(node.children, out)
  }
  return out
}

/** 编辑时禁止把自己或自己的子孙设为上级：后端同样会拒，前端先禁选 */
function descendantIds(id: string): Set<string> {
  const found = findNode(orgTree.value, id)
  return found ? collectIds([found]) : new Set([id])
}

function findNode(nodes: OrgItem[], id: string): OrgItem | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const hit = node.children?.length ? findNode(node.children, id) : null
    if (hit) return hit
  }
  return null
}

function markDisabled(nodes: OrgItem[], blocked: Set<string>): OrgOption[] {
  return nodes.map((node) => ({
    ...node,
    disabled: blocked.has(node.id),
    children: markDisabled(node.children ?? [], blocked),
  }))
}

async function load(): Promise<void> {
  loading.value = true
  try {
    orgTree.value = await fetchOrgTree()
  } finally {
    loading.value = false
  }
}

function openCreate(parentId: string): void {
  mode.value = 'create'
  editingId.value = ''
  resetForm({ parentId })
  dialogVisible.value = true
}

function openEdit(data: OrgItem): void {
  mode.value = 'edit'
  editingId.value = data.id
  resetForm({
    parentId: data.parentId ?? '',
    name: data.name,
    code: data.code ?? '',
    leader: data.leader ?? '',
    phone: data.phone ?? '',
    sortOrder: data.sortOrder,
    status: data.status,
  })
  dialogVisible.value = true
}

function resetForm(over: Partial<typeof form> = {}): void {
  form.parentId = ''
  form.name = ''
  form.code = ''
  form.leader = ''
  form.phone = ''
  form.sortOrder = null
  form.status = 1
  Object.assign(form, over)
  void nextTick(() => formRef.value?.clearValidate())
}

function buildPayload() {
  return {
    parentId: form.parentId || undefined,
    name: form.name,
    code: form.code.trim() || undefined,
    leader: form.leader.trim() || undefined,
    phone: form.phone.trim() || undefined,
    sortOrder: form.sortOrder ?? undefined,
    status: form.status,
  }
}

async function submit(): Promise<void> {
  if (saving.value) return
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return

  saving.value = true
  try {
    if (mode.value === 'create') await createOrg(buildPayload())
    else await updateOrg(editingId.value, buildPayload())
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

function parentIdOf(node: unknown): string {
  const data = (node as DragNodeLike | undefined)?.parent?.data
  if (!data || Array.isArray(data)) return ''
  return String((data as { id?: string }).id ?? '')
}

async function onNodeDrop(dragging: unknown, _drop: unknown, _type: unknown): Promise<void> {
  const node = dragging as DragNodeLike
  const id = String(node.data?.id ?? '')
  if (!id) return

  const parentId = parentIdOf(node)
  const moved = parentId !== (node.data.parentId ?? '')
  // 过滤状态下列表是被裁剪过的，只认换上级，不然是把看不见的兄弟节点顺序写坏
  const siblingIds = keyword.value.trim()
    ? []
    : (node.parent?.childNodes ?? []).map((child) => String(child.data?.id ?? '')).filter(Boolean)

  try {
    if (moved) await updateOrg(id, { parentId })
    if (siblingIds.length > 1) await sortOrgs(siblingIds)
    ElMessage.success(moved ? '上级已调整' : '顺序已保存')
  } finally {
    // 无论后端是否接受这次落点，都以服务端结果为准重画一次
    await load()
  }
}

async function toggleStatus(data: OrgItem): Promise<void> {
  const next = data.status === 1 ? 0 : 1
  await setOrgStatus(data.id, next)
  ElMessage.success(next === 1 ? '已启用' : '已停用')
  await load()
}

async function removeRow(data: OrgItem): Promise<void> {
  await deleteOrg(data.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  booting.value = true
  try {
    await load()
  } finally {
    booting.value = false
  }
})
</script>

<style scoped>
.org-alert {
  margin-bottom: 10px;
}

.org-tree {
  --el-tree-node-content-height: 32px;

  padding: 4px 0;
}

.org-node {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding-right: 8px;
  font-size: 13px;
}

.org-node__name {
  font-weight: 500;
}

.org-node__code {
  color: var(--el-text-color-secondary);
}

.org-node__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.org-node__ops {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.cell-mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}

.field-full {
  width: 100%;
}
</style>
