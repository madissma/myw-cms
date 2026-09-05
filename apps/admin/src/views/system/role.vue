<template>
  <PageContainer title="角色权限" subtitle="权限点是「模块:资源:动作」三段式，菜单与接口共用同一套 key" :loading="booting">
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openCreate">新增角色</el-button>
    </template>

    <template #toolbar>
      <el-input
        v-model="keyword"
        placeholder="搜索角色名称或标识"
        clearable
        style="width: 220px"
        @keyup.enter="load"
        @clear="load"
      />
      <div class="page-toolbar__actions">
        <el-button :icon="Refresh" circle @click="load" />
      </div>
    </template>

    <el-table v-loading="loading" :data="rows" row-key="id" size="small" border empty-text="暂无角色">
      <el-table-column label="角色" min-width="150">
        <template #default="{ row }">
          <span class="cell-strong">{{ row.name }}</span>
          <el-tag v-if="row.builtin" size="small" type="info" effect="plain" class="role-row__tag">预置</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标识" width="150">
        <template #default="{ row }">
          <span class="cell-mono">{{ row.key }}</span>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.remark">{{ row.remark }}</span>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="用户数" width="80" align="center">
        <template #default="{ row }">{{ row.userCount }}</template>
      </el-table-column>
      <el-table-column label="权限" width="110">
        <template #default="{ row }">
          <el-tag v-if="hasAll(row)" size="small" type="success" effect="plain">全部权限</el-tag>
          <span v-else>{{ row.permissionKeys.length }} 项</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" effect="plain">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEdit" link type="primary" @click="openEdit(row)">编辑授权</el-button>
          <el-button
            v-if="canEdit && !hasAll(row)"
            link
            :type="row.status === 1 ? 'info' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-popconfirm
            v-if="canDelete && !row.builtin"
            :title="`删除角色「${row.name}」？`"
            width="240"
            @confirm="removeRow(row)"
          >
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </PageContainer>

  <el-dialog
    v-model="dialogVisible"
    :title="mode === 'create' ? '新增角色' : `编辑角色 · ${form.name}`"
    width="880px"
    top="6vh"
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item label="角色名称" prop="name">
            <el-input v-model.trim="form.name" clearable placeholder="例如：内容编辑" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="角色标识" prop="key">
            <el-input v-model.trim="form.key" :disabled="mode === 'edit'" clearable placeholder="小写字母、数字与下划线" />
            <div v-if="mode === 'edit'" class="form-tip">标识是代码里引用的稳定键，创建后不可修改。</div>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="排序值" prop="sortOrder">
            <el-input-number v-model="form.sortOrder" :min="0" :max="9999" :step="10" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status" :disabled="isSuperAdmin">
              <el-radio :value="1">启用</el-radio>
              <el-radio :value="0">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="说明" prop="remark">
            <el-input v-model="form.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" maxlength="255" placeholder="选填，写清这个角色负责什么" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <div class="perm-panel">
      <div class="perm-panel__head">
        <span class="perm-panel__title">权限点</span>
        <span class="muted">已选 {{ form.permissionKeys.length }} / {{ catalogCount }}</span>
      </div>

      <div v-if="isSuperAdmin" class="form-tip">
        超级管理员固定持有 <span class="cell-mono">*</span> 通配，即全部权限，这里不提供勾选。
      </div>
      <template v-else>
        <div class="page-toolbar perm-panel__tools">
          <el-input v-model="permKeyword" placeholder="搜索权限点名称或 key" clearable style="width: 200px" />
          <div class="page-toolbar__actions">
            <el-button link type="primary" @click="checkAll(true)">全选</el-button>
            <el-button link type="primary" @click="checkAll(false)">清空</el-button>
          </div>
        </div>
        <p class="form-tip">
          带「（全部操作）」的是一项通配权限，勾它就够，不必再逐个勾；前端菜单只是隐藏入口，真正的边界在后端逐接口校验。
        </p>

        <div class="perm-groups">
          <section v-for="group in visibleCatalog" :key="group.group" class="perm-group">
            <div class="perm-group__head">
              <el-checkbox
                :model-value="groupChecked(group).all"
                :indeterminate="groupChecked(group).some && !groupChecked(group).all"
                :disabled="saving"
                @change="toggleGroup(group, $event as boolean)"
              >
                {{ groupLabel(group.group) }}
                <span class="muted">{{ groupChecked(group).count }}/{{ group.items.length }}</span>
              </el-checkbox>
            </div>
            <el-checkbox-group v-model="form.permissionKeys" :disabled="saving" class="perm-group__items">
              <el-checkbox v-for="item in group.items" :key="item.key" :value="item.key" class="perm-item">
                {{ item.name }}
                <span class="perm-item__key">{{ item.key }}</span>
              </el-checkbox>
            </el-checkbox-group>
          </section>
          <el-empty v-if="!visibleCatalog.length" description="没有匹配的权限点" :image-size="60" />
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-foot">
        <span class="form-tip">调整授权后，该角色下的用户需重新登录才会刷新菜单。</span>
        <div class="page-toolbar__actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  createRole,
  deleteRole,
  permissionCatalog,
  roles,
  setRoleStatus,
  updateRole,
  type PermissionCatalog,
  type RoleItem,
} from '@/api/modules/system'
import { useUserStore } from '@/stores/user'
import PageContainer from '@/components/PageContainer.vue'

/** catalog 只回分组 key，中文标题在前端补，未知分组回落原名 */
const GROUP_LABELS: Record<string, string> = {
  dashboard: '工作台',
  content: '内容管理',
  page: '页面装修',
  nav: '导航栏目',
  taxonomy: '分类术语',
  site: '站点配置',
  media: '素材库',
  message: '留言箱',
  system: '系统管理',
}

const SUPER_ADMIN_KEY = 'super_admin'

const user = useUserStore()

const booting = ref(false)
const loading = ref(false)
const rows = ref<RoleItem[]>([])
const keyword = ref('')
const catalog = ref<PermissionCatalog[]>([])
const permKeyword = ref('')

const canCreate = computed(() => user.has('system:role:create'))
const canEdit = computed(() => user.has('system:role:edit'))
const canDelete = computed(() => user.has('system:role:delete'))

const dialogVisible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const editingKey = ref('')
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  key: '',
  name: '',
  remark: '',
  sortOrder: 0,
  status: 1,
  permissionKeys: [] as string[],
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  key: [
    { required: true, message: '请输入角色标识', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: '仅支持小写字母开头的字母、数字与下划线', trigger: 'blur' },
  ],
}

const isSuperAdmin = computed(() => mode.value === 'edit' && editingKey.value === SUPER_ADMIN_KEY)

const catalogCount = computed(() => catalog.value.reduce((sum, group) => sum + group.items.length, 0))

const visibleCatalog = computed<PermissionCatalog[]>(() => {
  const kw = permKeyword.value.trim().toLowerCase()
  if (!kw) return catalog.value
  return catalog.value
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.name.toLowerCase().includes(kw) || item.key.toLowerCase().includes(kw),
      ),
    }))
    .filter((group) => group.items.length)
})

function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group
}

function hasAll(row: RoleItem): boolean {
  return row.key === SUPER_ADMIN_KEY || row.permissionKeys.includes('*')
}

function groupChecked(group: PermissionCatalog): { count: number; all: boolean; some: boolean } {
  const count = group.items.filter((item) => form.permissionKeys.includes(item.key)).length
  return { count, all: count === group.items.length && count > 0, some: count > 0 }
}

function toggleGroup(group: PermissionCatalog, checked: boolean): void {
  const keys = group.items.map((item) => item.key)
  const rest = form.permissionKeys.filter((key) => !keys.includes(key))
  form.permissionKeys = checked ? [...rest, ...keys] : rest
}

function checkAll(checked: boolean): void {
  form.permissionKeys = checked ? visibleCatalog.value.flatMap((group) => group.items.map((item) => item.key)) : []
}

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await roles({ keyword: keyword.value.trim() || undefined })
  } finally {
    loading.value = false
  }
}

function resetForm(over: Partial<typeof form> = {}): void {
  form.key = ''
  form.name = ''
  form.remark = ''
  form.sortOrder = 0
  form.status = 1
  form.permissionKeys = []
  Object.assign(form, over)
  formRef.value?.clearValidate()
}

function openCreate(): void {
  mode.value = 'create'
  editingId.value = ''
  editingKey.value = ''
  permKeyword.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: RoleItem): void {
  mode.value = 'edit'
  editingId.value = row.id
  editingKey.value = row.key
  permKeyword.value = ''
  resetForm({
    key: row.key,
    name: row.name,
    remark: row.remark ?? '',
    sortOrder: row.sortOrder,
    status: row.status,
    permissionKeys: [...row.permissionKeys],
  })
  dialogVisible.value = true
}

async function submit(): Promise<void> {
  if (saving.value) return
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return

  saving.value = true
  try {
    if (mode.value === 'create') {
      await createRole({
        key: form.key,
        name: form.name,
        remark: form.remark.trim() || undefined,
        sortOrder: form.sortOrder,
        permissionKeys: form.permissionKeys,
      })
    } else {
      await updateRole(editingId.value, {
        name: form.name,
        remark: form.remark.trim() || undefined,
        sortOrder: form.sortOrder,
        // 超级管理员的 * 通配由后端兜底，这里不回传勾选结果，避免误删
        permissionKeys: isSuperAdmin.value ? undefined : form.permissionKeys,
      })
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: RoleItem): Promise<void> {
  const next = row.status === 1 ? 0 : 1
  await setRoleStatus(row.id, next)
  ElMessage.success(next === 1 ? '已启用' : '已停用')
  await load()
}

async function removeRow(row: RoleItem): Promise<void> {
  await deleteRole(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  booting.value = true
  try {
    const [list, groups] = await Promise.all([roles(), permissionCatalog()])
    rows.value = list ?? []
    catalog.value = groups ?? []
  } finally {
    booting.value = false
  }
})
</script>

<style scoped>
.cell-strong {
  font-weight: 500;
}

.cell-mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}

.role-row__tag {
  margin-left: 6px;
}

.perm-panel {
  padding: 12px 14px 14px;
  margin-top: 4px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.perm-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.perm-panel__title {
  font-weight: 600;
}

.perm-panel__tools {
  justify-content: space-between;
  margin-top: 8px;
}

.perm-groups {
  max-height: 40vh;
  padding-right: 6px;
  margin-top: 6px;
  overflow-y: auto;
  background: var(--el-bg-color);
}

.perm-group {
  padding: 8px 10px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.perm-group__head {
  margin-bottom: 2px;
}

.perm-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0 18px;
  padding-left: 22px;
}

.perm-item {
  min-width: 200px;
  margin-right: 0;
}

.perm-item__key {
  margin-left: 6px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
