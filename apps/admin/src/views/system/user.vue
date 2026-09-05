<template>
  <PageContainer title="用户管理" subtitle="后台账号、组织归属与角色授权" :loading="booting">
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openCreate">新增用户</el-button>
    </template>

    <template #toolbar>
      <el-input
        v-model="query.keyword"
        placeholder="搜索账号、姓名、邮箱或手机"
        clearable
        style="width: 220px"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      />
      <el-tree-select
        v-if="canSeeOrgs"
        v-model="query.orgId"
        :data="orgTree"
        :props="orgTreeProps"
        node-key="id"
        check-strictly
        clearable
        :value-on-clear="null"
        default-expand-all
        placeholder="全部组织"
        style="width: 180px"
        @change="reload(1)"
      />
      <el-select
        v-if="canSeeRoles"
        v-model="query.roleId"
        placeholder="全部角色"
        clearable
        :value-on-clear="null"
        style="width: 150px"
        @change="reload(1)"
      >
        <el-option v-for="item in roleOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select v-model="query.status" placeholder="全部状态" clearable :value-on-clear="null" style="width: 120px" @change="reload(1)">
        <el-option v-for="item in USER_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <div class="page-toolbar__actions">
        <el-button :icon="Refresh" circle @click="reload()" />
      </div>
    </template>

    <el-table v-loading="loading" :data="rows" row-key="id" size="small" border empty-text="暂无用户">
      <el-table-column label="登录账号" width="150">
        <template #default="{ row }">
          <span class="cell-mono cell-strong">{{ row.username }}</span>
          <el-tag v-if="row.id === myId" size="small" type="info" effect="plain" class="user-row__me">我</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="姓名" width="120">
        <template #default="{ row }">{{ row.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="组织" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.org?.name">{{ row.org.name }}</span>
          <span v-else class="muted">未分配</span>
        </template>
      </el-table-column>
      <el-table-column label="角色" min-width="190">
        <template #default="{ row }">
          <el-tag v-for="item in row.roles" :key="item.id" size="small" effect="plain" class="user-row__tag">
            {{ item.name }}
          </el-tag>
          <span v-if="!row.roles?.length" class="muted">未授权</span>
        </template>
      </el-table-column>
      <el-table-column label="手机" width="130">
        <template #default="{ row }">
          <span v-if="row.phone" class="cell-mono">{{ row.phone }}</span>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="邮箱" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.email" class="cell-mono">{{ row.email }}</span>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" effect="plain">
            {{ userStatusMeta(row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近登录" width="140">
        <template #default="{ row }">
          <span v-if="row.lastLoginAt">{{ formatDateTime(row.lastLoginAt) }}</span>
          <span v-else class="muted">从未登录</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEdit" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canReset" link type="warning" @click="openReset(row)">重置密码</el-button>
          <el-button v-if="canEdit" link :type="row.status === 1 ? 'info' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-popconfirm v-if="canDelete" title="删除后该账号立即失效，确认？" width="240" @confirm="removeRow(row)">
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

  <el-dialog
    v-model="dialogVisible"
    :title="mode === 'create' ? '新增用户' : `编辑用户 · ${form.username}`"
    width="680px"
    top="8vh"
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item label="登录账号" prop="username">
            <el-input v-model.trim="form.username" :disabled="mode === 'edit'" clearable placeholder="用于登录的账号" />
            <div v-if="mode === 'edit'" class="form-tip">登录账号创建后不可修改。</div>
          </el-form-item>
        </el-col>
        <el-col v-if="mode === 'create'" :xs="24" :sm="12">
          <el-form-item label="初始密码" prop="password">
            <el-input v-model="form.password" type="password" show-password autocomplete="new-password" placeholder="8 位以上，含字母与数字" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model.trim="form.name" clearable placeholder="真实姓名，用于列表与日志展示" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model.trim="form.phone" clearable placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model.trim="form.email" clearable type="email" placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="所属组织" prop="orgId">
            <el-tree-select
              v-if="canSeeOrgs"
              v-model="form.orgId"
              :data="orgTree"
              :props="orgTreeProps"
              node-key="id"
              check-strictly
              clearable
              :value-on-clear="null"
              default-expand-all
              placeholder="未分配"
              class="field-full"
            />
            <span v-else class="form-tip">无组织读取权限，不能调整归属。</span>
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
        <el-col :span="24">
          <el-form-item label="角色" prop="roleIds">
            <el-select v-if="canSeeRoles" v-model="form.roleIds" multiple filterable placeholder="可多选" class="field-full">
              <el-option v-for="item in roleOptions" :key="item.id" :label="item.name" :value="item.id">
                <span>{{ item.name }}</span>
                <span class="user-row__option-key">{{ item.key }}</span>
              </el-option>
            </el-select>
            <span v-else class="form-tip">无角色读取权限，不能调整授权。</span>
            <div class="form-tip">决定该账号能看到哪些菜单、能做哪些操作；保存后需重新登录才会生效。</div>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" maxlength="255" placeholder="选填，例如岗位与交接说明" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <div class="dialog-foot">
        <span class="form-tip">系统必须保留至少一个启用状态的超级管理员，否则相关操作会被拒绝。</span>
        <div class="page-toolbar__actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="pwdVisible" :title="`重置密码 · ${pwdTarget?.name || pwdTarget?.username || ''}`" width="420px">
    <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-position="top">
      <el-form-item label="新密码" prop="password">
        <el-input v-model="pwdForm.password" type="password" show-password autocomplete="new-password" placeholder="8 位以上，含字母与数字" />
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirm">
        <el-input v-model="pwdForm.confirm" type="password" show-password autocomplete="new-password" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-foot">
        <span class="form-tip">重置后该账号的旧密码立即失效，需线下告知本人。</span>
        <div class="page-toolbar__actions">
          <el-button @click="pwdVisible = false">取消</el-button>
          <el-button type="primary" :loading="pwdSaving" @click="submitReset">重置</el-button>
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
  createUser,
  deleteUser,
  orgTree as fetchOrgTree,
  resetUserPassword,
  roles as fetchRoles,
  setUserStatus,
  updateUser,
  users,
  type OrgItem,
  type RoleItem,
  type UserItem,
  type UserPayload,
} from '@/api/modules/system'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/format'
import { confirmRules, passwordRules, USERNAME_RULES } from '@/utils/validate'
import PageContainer from '@/components/PageContainer.vue'

const USER_STATUS_OPTIONS = [
  { value: 1, label: '启用', tag: 'success' },
  { value: 0, label: '停用', tag: 'info' },
] as const

function userStatusMeta(status: number) {
  return USER_STATUS_OPTIONS.find((item) => item.value === status) ?? { value: status, label: '未知', tag: 'info' }
}

const user = useUserStore()

const booting = ref(false)
const loading = ref(false)
const rows = ref<UserItem[]>([])
const total = ref(0)
const orgTree = ref<OrgItem[]>([])
const roleOptions = ref<RoleItem[]>([])

const orgTreeProps = { label: 'name', children: 'children' }

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  orgId: null as string | null,
  roleId: null as string | null,
  status: null as number | null,
})

const dialogVisible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  username: '',
  password: '',
  name: '',
  email: '',
  phone: '',
  orgId: null as string | null,
  roleIds: [] as string[],
  status: 1,
  remark: '',
})

const pwdVisible = ref(false)
const pwdSaving = ref(false)
const pwdTarget = ref<UserItem | null>(null)
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ password: '', confirm: '' })

const myId = computed(() => user.profile?.id ?? '')
const canCreate = computed(() => user.has('system:user:create'))
const canEdit = computed(() => user.has('system:user:edit'))
const canDelete = computed(() => user.has('system:user:delete'))
const canReset = computed(() => user.has('system:user:reset'))
const canSeeOrgs = computed(() => user.has('system:org:view'))
const canSeeRoles = computed(() => user.has('system:role:view'))

const rules = computed<FormRules>(() => ({
  username: USERNAME_RULES,
  password: mode.value === 'create' ? passwordRules('初始密码') : [],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  roleIds: [{ required: true, type: 'array', min: 1, message: '至少选择一个角色', trigger: 'change' }],
  phone: [{ max: 32, message: '长度不超过 32 位', trigger: 'blur' }],
}))

const pwdRules: FormRules = {
  password: passwordRules('新密码'),
  confirm: confirmRules('新密码', () => pwdForm.password),
}

async function reload(page?: number): Promise<void> {
  if (page) query.page = page
  loading.value = true
  try {
    const res = await users({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword.trim() || undefined,
      orgId: query.orgId ?? undefined,
      roleId: query.roleId ?? undefined,
      status: query.status ?? undefined,
    })
    rows.value = res.list ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

async function loadDicts(): Promise<void> {
  const tasks: Promise<void>[] = []
  if (canSeeOrgs.value) {
    tasks.push(
      fetchOrgTree()
        .then((list) => {
          orgTree.value = list ?? []
        })
        .catch(() => {
          orgTree.value = []
        }),
    )
  }
  if (canSeeRoles.value) {
    tasks.push(
      fetchRoles()
        .then((list) => {
          roleOptions.value = list ?? []
        })
        .catch(() => {
          roleOptions.value = []
        }),
    )
  }
  await Promise.all(tasks)
}

function resetForm(): void {
  form.username = ''
  form.password = ''
  form.name = ''
  form.email = ''
  form.phone = ''
  form.orgId = null
  form.roleIds = []
  form.status = 1
  form.remark = ''
  formRef.value?.clearValidate()
}

function openCreate(): void {
  mode.value = 'create'
  editingId.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: UserItem): void {
  mode.value = 'edit'
  editingId.value = row.id
  resetForm()
  form.username = row.username
  form.name = row.name ?? ''
  form.email = row.email ?? ''
  form.phone = row.phone ?? ''
  form.orgId = row.orgId ?? null
  form.roleIds = (row.roles ?? []).map((item) => item.id)
  form.status = row.status
  form.remark = row.remark ?? ''
  dialogVisible.value = true
}

/** 空字符串一律转成 null：后端 @IsOptional() 放行 null，而空邮箱会被邮箱校验拦下 */
function buildPayload(): UserPayload {
  return {
    name: form.name,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    remark: form.remark.trim() || null,
    orgId: form.orgId || null,
    status: form.status,
    roleIds: form.roleIds,
  }
}

async function submit(): Promise<void> {
  if (saving.value) return
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return

  saving.value = true
  try {
    if (mode.value === 'create') {
      await createUser({ ...buildPayload(), username: form.username, password: form.password })
    } else {
      await updateUser(editingId.value, buildPayload())
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    await reload(mode.value === 'create' ? 1 : undefined)
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: UserItem): Promise<void> {
  const next = row.status === 1 ? 0 : 1
  await setUserStatus(row.id, next)
  ElMessage.success(next === 1 ? '已启用' : '已停用')
  await reload()
}

function openReset(row: UserItem): void {
  pwdTarget.value = row
  pwdForm.password = ''
  pwdForm.confirm = ''
  pwdFormRef.value?.clearValidate()
  pwdVisible.value = true
}

async function submitReset(): Promise<void> {
  if (!pwdTarget.value || pwdSaving.value) return
  const ok = await pwdFormRef.value?.validate().catch(() => false)
  if (!ok) return

  pwdSaving.value = true
  try {
    await resetUserPassword(pwdTarget.value.id, pwdForm.password)
    ElMessage.success(`已重置 ${pwdTarget.value.name || pwdTarget.value.username} 的密码`)
    pwdVisible.value = false
  } finally {
    pwdSaving.value = false
  }
}

async function removeRow(row: UserItem): Promise<void> {
  await deleteUser(row.id)
  ElMessage.success('已删除')
  await reload(rows.value.length === 1 ? Math.max(1, query.page - 1) : undefined)
}

onMounted(async () => {
  booting.value = true
  try {
    await Promise.all([loadDicts(), reload()])
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

.user-row__me {
  margin-left: 6px;
}

.user-row__tag {
  margin: 2px 4px 2px 0;
}

.user-row__option-key {
  float: right;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.field-full {
  width: 100%;
}
</style>
