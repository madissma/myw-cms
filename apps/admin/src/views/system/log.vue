<template>
  <PageContainer title="操作日志" subtitle="后台写操作与登录审计，仅超级管理员可见" :loading="booting">
    <template #actions>
      <el-button v-if="canPurge" type="danger" plain @click="openPurge">清理历史日志</el-button>
    </template>

    <template #toolbar>
      <el-input
        v-model="query.keyword"
        placeholder="搜索操作对象、账号或动作"
        clearable
        style="width: 220px"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      />
      <el-select v-model="query.action" placeholder="全部动作" clearable :value-on-clear="null" style="width: 130px" @change="reload(1)">
        <el-option v-for="item in LOG_ACTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select
        v-if="canSeeUsers"
        v-model="query.userId"
        placeholder="全部操作人"
        clearable
        filterable
        :value-on-clear="null"
        style="width: 160px"
        @change="reload(1)"
      >
        <el-option v-for="item in userOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <div class="page-toolbar__actions">
        <el-button :icon="Refresh" circle @click="reload()" />
      </div>
    </template>

    <el-table v-loading="loading" :data="rows" row-key="id" size="small" border empty-text="暂无操作日志">
      <el-table-column label="时间" width="150">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作人" width="150">
        <template #default="{ row }">
          <span v-if="row.username" class="cell-mono">{{ row.username }}</span>
          <span v-else class="muted">{{ row.userId ? '账号已删除' : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="动作" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="actionTagType(row.action)" effect="plain">{{ actionLabel(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="对象" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="cell-mono">{{ row.target }}</span>
        </template>
      </el-table-column>
      <el-table-column label="IP" width="140">
        <template #default="{ row }">
          <span v-if="row.ip" class="cell-mono">{{ row.ip }}</span>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="详情" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="row.payload === null || row.payload === undefined" @click="openDetail(row)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="reload()"
        @size-change="reload(1)"
      />
    </template>
  </PageContainer>

  <el-dialog v-model="detailVisible" title="日志详情" width="640px" top="8vh">
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="时间">{{ formatDateTime(current?.createdAt) }}</el-descriptions-item>
      <el-descriptions-item label="操作人">{{ current?.username || current?.userId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="动作">{{ actionLabel(current?.action ?? '') }}</el-descriptions-item>
      <el-descriptions-item label="对象">
        <span class="cell-mono">{{ current?.target }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="IP">
        <span class="cell-mono">{{ current?.ip || '-' }}</span>
      </el-descriptions-item>
    </el-descriptions>
    <h4 class="log-detail__title">请求内容</h4>
    <pre class="log-detail__payload">{{ payloadText }}</pre>
    <p class="form-tip">密码、令牌等敏感字段在写入前已被脱敏为 ***；过长的正文与数组会被截断。</p>
  </el-dialog>

  <el-dialog v-model="purgeVisible" title="清理历史日志" width="440px">
    <el-form label-position="top">
      <el-form-item label="保留最近">
        <div class="page-toolbar__actions">
          <el-input-number v-model="purgeDays" :min="1" :max="3650" :step="30" controls-position="right" />
          <span class="muted">天</span>
        </div>
      </el-form-item>
    </el-form>
    <p class="form-tip">
      将删除 {{ purgeDays }} 天之前的全部日志，删除后不可恢复。建议至少保留 90 天以便回溯内容变更。
    </p>
    <template #footer>
      <div class="dialog-foot">
        <span class="form-tip">本次清理动作本身也会写一条日志。</span>
        <div class="page-toolbar__actions">
          <el-button @click="purgeVisible = false">取消</el-button>
          <el-button type="danger" :loading="purging" @click="submitPurge">确认清理</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { operationLogs, purgeLogs, users, type OperationLogItem } from '@/api/modules/system'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/format'
import PageContainer from '@/components/PageContainer.vue'

/** 与 server 里 audit.log 的 action 取值对齐，未知动作直接展示原值 */
const LOG_ACTIONS = [
  { value: 'create', label: '新增', tag: 'success' },
  { value: 'update', label: '修改', tag: 'warning' },
  { value: 'delete', label: '删除', tag: 'danger' },
  { value: 'publish', label: '发布', tag: 'primary' },
  { value: 'sort', label: '排序', tag: 'info' },
  { value: 'login', label: '登录', tag: 'info' },
] as const

function actionMeta(action: string) {
  return LOG_ACTIONS.find((item) => item.value === action) ?? { value: action, label: action, tag: 'info' }
}

function actionLabel(action: string): string {
  return actionMeta(action).label
}

function actionTagType(action: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const tag = actionMeta(action).tag
  return tag === 'primary' || tag === 'success' || tag === 'warning' || tag === 'danger' ? tag : 'info'
}

const user = useUserStore()

const booting = ref(false)
const loading = ref(false)
const rows = ref<OperationLogItem[]>([])
const total = ref(0)
const userOptions = ref<{ id: string; name: string }[]>([])

const query = reactive({
  page: 1,
  pageSize: 50,
  keyword: '',
  action: null as string | null,
  userId: null as string | null,
})

const detailVisible = ref(false)
const current = ref<OperationLogItem | null>(null)

const purgeVisible = ref(false)
const purging = ref(false)
const purgeDays = ref(90)

const canPurge = computed(() => user.has('system:log:purge'))
const canSeeUsers = computed(() => user.has('system:user:view'))

const payloadText = computed(() => {
  const payload = current.value?.payload
  if (payload === null || payload === undefined) return '（无）'
  return JSON.stringify(payload, null, 2)
})

async function reload(page?: number): Promise<void> {
  if (page) query.page = page
  loading.value = true
  try {
    const res = await operationLogs({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword.trim() || undefined,
      action: query.action ?? undefined,
      userId: query.userId ?? undefined,
    })
    rows.value = res.list ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

async function loadUsers(): Promise<void> {
  if (!canSeeUsers.value) return
  try {
    const res = await users({ page: 1, pageSize: 200 })
    userOptions.value = (res.list ?? []).map((item) => ({ id: item.id, name: item.name || item.username }))
  } catch {
    userOptions.value = []
  }
}

function openDetail(row: OperationLogItem): void {
  current.value = row
  detailVisible.value = true
}

function openPurge(): void {
  purgeDays.value = 90
  purgeVisible.value = true
}

async function submitPurge(): Promise<void> {
  if (purging.value) return
  purging.value = true
  try {
    const res = await purgeLogs(purgeDays.value)
    ElMessage.success(res.count ? `已清理 ${res.count} 条日志` : '没有需要清理的日志')
    purgeVisible.value = false
    await reload(1)
  } finally {
    purging.value = false
  }
}

onMounted(async () => {
  booting.value = true
  try {
    await Promise.all([loadUsers(), reload()])
  } finally {
    booting.value = false
  }
})
</script>

<style scoped>
.cell-mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}

.log-detail__title {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.log-detail__payload {
  max-height: 40vh;
  padding: 10px 12px;
  margin: 0;
  overflow: auto;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}
</style>
