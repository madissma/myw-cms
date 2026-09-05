<template>
  <PageContainer title="导航栏目" :subtitle="subtitle" :loading="loading">
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openCreate(null)">新增顶级菜单</el-button>
    </template>

    <template #toolbar>
      <el-radio-group v-model="position" @change="load">
        <el-radio-button v-for="item in NAV_POSITIONS" :key="item.value" :value="item.value">
          {{ item.label }}
        </el-radio-button>
      </el-radio-group>
      <div class="page-toolbar__actions">
        <span class="muted">共 {{ flatCount }} 项</span>
        <el-button :icon="Refresh" circle @click="load" />
      </div>
    </template>

    <el-table
      :key="position"
      :data="tree"
      row-key="id"
      size="small"
      border
      default-expand-all
      :tree-props="{ children: 'children' }"
      empty-text="该位置还没有菜单，前台对应区域会留空"
    >
      <el-table-column prop="label" label="菜单名称" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="nav-label">{{ row.label }}</span>
          <span v-if="row.labelEn" class="muted nav-label__en">{{ row.labelEn }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="path" label="链接地址" min-width="190" show-overflow-tooltip />
      <el-table-column prop="navKey" label="编码" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.navKey" class="nav-code">{{ row.navKey }}</span>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="target" label="打开方式" width="96">
        <template #default="{ row }">{{ targetLabel(row.target) }}</template>
      </el-table-column>
      <el-table-column label="排序" width="128">
        <template #default="{ row }">
          <div class="nav-sort">
            <span class="nav-sort__no">{{ row.sortOrder }}</span>
            <el-button-group>
              <el-button size="small" :icon="Top" :disabled="!canEdit || isFirst(row)" @click="move(row, -1)" />
              <el-button size="small" :icon="Bottom" :disabled="!canEdit || isLast(row)" @click="move(row, 1)" />
            </el-button-group>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="86">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status"
            :active-value="1"
            :inactive-value="0"
            :disabled="!canEdit"
            @change="toggle(row, Number($event))"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEdit" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canCreate" link @click="openCreate(row)">加子项</el-button>
          <el-popconfirm
            v-if="canDelete"
            :title="row.children?.length ? `将连同 ${row.children.length} 个子项一起删除，确认？` : '删除后不可恢复，确认？'"
            width="240"
            @confirm="remove(row)"
          >
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <FormDialog
      ref="dialogRef"
      v-model="dialogVisible"
      :title="dialogTitle"
      :specs="specs"
      :values="form"
      :saving="saving"
      size="700px"
      :hint="dialogHint"
      @save="submit"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Bottom, Refresh, Top } from '@element-plus/icons-vue'
import {
  NAV_POSITIONS,
  NAV_TARGETS,
  createNav,
  deleteNav,
  navTree,
  setNavStatus,
  sortNav,
  updateNav,
  type NavItem,
} from '@/api/modules/nav'
import { useUserStore } from '@/stores/user'
import type { FieldSpec } from '@/utils/field'
import PageContainer from '@/components/PageContainer.vue'
import FormDialog from '@/components/FormDialog.vue'

const user = useUserStore()

const canCreate = computed(() => user.has('nav:create'))
const canEdit = computed(() => user.has('nav:edit'))
const canDelete = computed(() => user.has('nav:delete'))

const position = ref('header')
const tree = ref<NavItem[]>([])
const loading = ref(false)

const dialogRef = ref<InstanceType<typeof FormDialog>>()
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const saving = ref(false)
const editingId = ref('')
const form = reactive<Record<string, any>>({})

const POSITION_LABELS: Record<string, string> = Object.fromEntries(NAV_POSITIONS.map((item) => [item.value, item.label]))

const subtitle = computed(
  () => `${POSITION_LABELS[position.value] ?? position.value}：顶级对应 Navbar 的一级栏目，子项对应下拉里的锚点`,
)

const flatCount = computed(() => {
  let count = 0
  const walk = (nodes: NavItem[]): void => {
    nodes.forEach((node) => {
      count += 1
      if (node.children?.length) walk(node.children)
    })
  }
  walk(tree.value)
  return count
})

/** 上级候选：只允许挂在顶级下，编辑时把自己排除，避免父子互指 */
const parentOptions = computed(() => {
  const options = [{ label: '无（顶级菜单）', value: '' }]
  tree.value
    .filter((node) => node.id !== editingId.value)
    .forEach((node) => options.push({ label: node.label, value: node.id }))
  return options
})

const specs = computed<FieldSpec[]>(() => {
  const create = dialogMode.value === 'create'
  const out: FieldSpec[] = [
    {
      name: 'parentId',
      label: '上级菜单',
      control: 'select',
      options: parentOptions.value,
      tip: '选上级则位置随上级，前台显示为其下拉项',
    },
    { name: 'label', label: '菜单名称', control: 'text', required: true },
    { name: 'labelEn', label: '英文名称', control: 'text' },
    {
      name: 'path',
      label: '链接地址',
      control: 'text',
      required: true,
      tip: '站内写 /about 或 /about#intro，外链需带 https://',
    },
    { name: 'target', label: '打开方式', control: 'select', options: NAV_TARGETS.map((item) => ({ ...item })) },
    { name: 'icon', label: '图标名', control: 'text', tip: '前台按需使用，可留空' },
    { name: 'sortOrder', label: '排序', control: 'number', group: 'sys', tip: '同级内越小越靠前，留空排到最后' },
    { name: 'status', label: '状态', control: 'status', group: 'sys' },
  ]
  if (create) {
    out.splice(3, 0, {
      name: 'navKey',
      label: '菜单编码',
      control: 'text',
      tip: '小写字母、数字与 . - _，如 products；有上级时会自动加前缀',
    })
  }
  return out
})

const dialogTitle = computed(() =>
  dialogMode.value === 'create' ? '新增菜单项' : `编辑菜单：${form.label ?? ''}`,
)

const dialogHint = computed(() =>
  dialogMode.value === 'create'
    ? '编码用于初始化脚本定位，保存后不可修改，可留空。'
    : '编码创建后不可修改；改「上级」会把菜单移动到另一个父级下。',
)

function targetLabel(target?: string | null): string {
  return NAV_TARGETS.find((item) => item.value === target)?.label ?? '当前窗口'
}

async function load(): Promise<void> {
  loading.value = true
  try {
    tree.value = await navTree(position.value)
  } finally {
    loading.value = false
  }
}

function siblingsOf(node: NavItem): NavItem[] {
  if (!node.parentId) return tree.value
  const walk = (nodes: NavItem[]): NavItem[] => {
    for (const item of nodes) {
      if (item.id === node.parentId) return item.children ?? []
      const found = item.children?.length ? walk(item.children) : []
      if (found.length) return found
    }
    return []
  }
  return walk(tree.value)
}

function isFirst(node: NavItem): boolean {
  return siblingsOf(node)[0]?.id === node.id
}

function isLast(node: NavItem): boolean {
  const list = siblingsOf(node)
  return list.at(-1)?.id === node.id
}

async function move(node: NavItem, delta: number): Promise<void> {
  const list = siblingsOf(node)
  const index = list.findIndex((item) => item.id === node.id)
  const target = index + delta
  if (index < 0 || target < 0 || target >= list.length) return
  const next = [...list]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  await sortNav(next.map((item) => item.id))
  await load()
}

async function toggle(node: NavItem, status: number): Promise<void> {
  await setNavStatus(node.id, status)
  ElMessage.success(status === 1 ? '已启用' : '已停用')
  await load()
}

function openCreate(parent: NavItem | null): void {
  dialogMode.value = 'create'
  editingId.value = ''
  Object.assign(form, {
    parentId: parent?.id ?? '',
    label: '',
    labelEn: '',
    path: parent?.path?.split('#')[0] ?? '',
    navKey: '',
    icon: '',
    target: '_self',
    sortOrder: null,
    status: 1,
  })
  dialogVisible.value = true
}

function openEdit(node: NavItem): void {
  dialogMode.value = 'edit'
  editingId.value = node.id
  Object.assign(form, {
    parentId: node.parentId ?? '',
    label: node.label,
    labelEn: node.labelEn ?? '',
    path: node.path,
    icon: node.icon ?? '',
    target: node.target || '_self',
    sortOrder: node.sortOrder,
    status: node.status,
  })
  dialogVisible.value = true
}

async function submit(): Promise<void> {
  if (saving.value) return
  if (!(await dialogRef.value?.validate())) return

  const text = (name: string): string => String(form[name] ?? '').trim()
  const sortOrder = form.sortOrder === null || form.sortOrder === '' ? undefined : Number(form.sortOrder)
  const payload: Partial<NavItem> = {
    parentId: text('parentId'),
    label: text('label'),
    labelEn: text('labelEn'),
    path: text('path'),
    icon: text('icon'),
    target: text('target') || '_self',
    sortOrder,
    status: Number(form.status),
  }
  if (dialogMode.value === 'create') {
    const navKey = text('navKey')
    // 更新接口不接收 navKey，传了会被白名单丢掉，这里只在新增时带上
    if (navKey) payload.navKey = navKey
  }

  saving.value = true
  try {
    if (dialogMode.value === 'create') await createNav(payload)
    else await updateNav(editingId.value, payload)
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(node: NavItem): Promise<void> {
  await deleteNav(node.id, !!node.children?.length)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.nav-label {
  font-weight: 500;
}

.nav-label__en {
  margin-left: 6px;
  font-size: 12px;
}

.nav-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.nav-sort {
  display: flex;
  gap: 6px;
  align-items: center;
}

.nav-sort__no {
  min-width: 22px;
  font-variant-numeric: tabular-nums;
}
</style>
