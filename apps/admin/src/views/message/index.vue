<template>
  <PageContainer title="留言箱" subtitle="前台「联系我们」提交的在线留言，按状态流转处理" :loading="booting">
    <template #actions>
      <el-button v-if="canExport" :icon="Download" :loading="exporting" @click="doExport">导出 CSV</el-button>
    </template>

    <template #toolbar>
      <el-input
        v-model="query.keyword"
        placeholder="搜索姓名、电话、邮箱或留言内容"
        clearable
        style="width: 240px"
        @keyup.enter="reload(1)"
        @clear="reload(1)"
      />
      <el-select v-model="query.type" placeholder="全部类型" clearable :value-on-clear="null" style="width: 140px" @change="reload(1)">
        <el-option v-for="item in MESSAGE_TYPES" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select
        v-if="canSeeUsers"
        v-model="query.handlerId"
        placeholder="全部处理人"
        clearable
        filterable
        :value-on-clear="null"
        style="width: 150px"
        @change="reload(1)"
      >
        <el-option v-for="item in userOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <div class="page-toolbar__actions">
        <el-button v-if="canDelete" :disabled="!selection.length" type="danger" plain @click="bulkRemove">批量删除</el-button>
        <el-button :icon="Refresh" circle @click="reload()" />
      </div>
    </template>

    <el-tabs v-model="activeTab" class="msg-tabs" @tab-change="onTabChange">
      <el-tab-pane v-for="tab in tabs" :key="tab.name" :name="tab.name">
        <template #label>
          {{ tab.label }}<span class="msg-tabs__count">{{ tab.count }}</span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <el-table
      v-loading="loading"
      :data="rows"
      row-key="id"
      size="small"
      border
      empty-text="暂无留言，前台提交后会出现在这里"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="42" />
      <el-table-column label="提交时间" width="140">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="姓名" width="110">
        <template #default="{ row }">
          <span class="cell-strong">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="联系电话" width="140">
        <template #default="{ row }">
          <a class="cell-mono" :href="`tel:${row.phone}`">{{ row.phone }}</a>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.type" size="small" effect="plain">{{ row.type }}</el-tag>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="留言内容" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ truncate(row.content, 80) }}</template>
      </el-table-column>
      <el-table-column v-if="canSeeUsers" label="处理人" width="110">
        <template #default="{ row }">{{ handlerName(row.handlerId) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)" effect="plain">
            {{ messageStatusMeta(row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
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

  <el-drawer v-model="drawerVisible" title="留言详情" size="560px">
    <div v-loading="detailLoading" class="msg-detail">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="姓名">{{ detail?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">
          <span class="cell-mono">{{ detail?.phone || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          <span class="cell-mono">{{ detail?.email || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="咨询类型">{{ detail?.type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail?.status ?? 0)" effect="plain">
            {{ messageStatusMeta(detail?.status ?? 0).label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="canSeeUsers" label="处理人">
          {{ handlerName(detail?.handlerId ?? null) }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatDateTime(detail?.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="最近更新">{{ formatDateTime(detail?.updatedAt) }}</el-descriptions-item>
        <el-descriptions-item label="来源 IP">
          <span class="cell-mono">{{ detail?.ip || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="User-Agent">
          <span class="msg-detail__ua">{{ detail?.userAgent || '-' }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <h4 class="msg-detail__title">留言内容</h4>
      <p class="msg-detail__text">{{ detail?.content || '-' }}</p>

      <template v-if="canEdit || canReply">
        <h4 class="msg-detail__title">处理</h4>

        <el-form v-if="canEdit" label-position="top" class="msg-detail__ops">
          <el-form-item label="流转状态">
            <div class="page-toolbar__actions">
              <el-select v-model="opStatus" style="width: 140px">
                <el-option v-for="item in MESSAGE_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button :loading="opSaving" :disabled="opStatus === detail?.status" @click="saveStatus">更新</el-button>
            </div>
          </el-form-item>
          <el-form-item label="处理人">
            <div class="page-toolbar__actions">
              <el-select v-model="opHandler" placeholder="未指派" clearable filterable style="width: 160px">
                <el-option v-for="item in userOptions" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
              <el-button :loading="opSaving" @click="assignToMe">指派给我</el-button>
              <el-button :loading="opSaving" @click="saveAssign(opHandler)">保存</el-button>
            </div>
          </el-form-item>
        </el-form>

        <el-form v-if="canReply" label-position="top" class="msg-detail__ops">
          <el-form-item label="回复内容">
            <el-input
              v-model="replyText"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 10 }"
              maxlength="2000"
              show-word-limit
              placeholder="记录你与访客的沟通结论，便于交接与回溯"
            />
            <p class="form-tip">回复内容只在后台留档，前台访客页不会展示；保存后状态默认置为「已回复」。</p>
          </el-form-item>
          <el-form-item label="回复后置为">
            <div class="page-toolbar__actions">
              <el-select v-model="replyStatus" style="width: 140px">
                <el-option v-for="item in MESSAGE_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button type="primary" :loading="replySaving" :disabled="!replyText.trim()" @click="saveReply">
                保存回复
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </template>
      <p v-else class="form-tip">你只有查看权限，如需处理请联系超级管理员开通「留言箱」的处理权限。</p>

      <div v-if="canDelete" class="msg-detail__foot">
        <el-popconfirm title="删除后无法恢复，确认？" width="220" @confirm="removeRow">
          <template #reference>
            <el-button type="danger" plain>删除这条留言</el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Refresh } from '@element-plus/icons-vue'
import {
  MESSAGE_STATUS_OPTIONS,
  MESSAGE_TYPES,
  assignMessage,
  bulkDeleteMessages,
  deleteMessage,
  exportMessages,
  getMessage,
  listMessages,
  messageCounters,
  messageStatusMeta,
  replyMessage,
  setMessageStatus,
  type MessageItem,
} from '@/api/modules/message'
import { users } from '@/api/modules/system'
import { useUserStore } from '@/stores/user'
import { formatDateTime, truncate } from '@/utils/format'
import type { ListQuery } from '@/types/api'
import PageContainer from '@/components/PageContainer.vue'

const user = useUserStore()

const booting = ref(false)
const loading = ref(false)
const exporting = ref(false)
const rows = ref<MessageItem[]>([])
const total = ref(0)
const selection = ref<MessageItem[]>([])
const counters = ref<Record<string, number>>({})
const activeTab = ref('all')
/** 处理人姓名要有数据源，没有 system:user:view 时整列隐藏 */
const userOptions = ref<{ id: string; name: string }[]>([])

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  type: null as string | null,
  handlerId: null as string | null,
})

const drawerVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<MessageItem | null>(null)
const opSaving = ref(false)
const replySaving = ref(false)
const opStatus = ref(0)
const opHandler = ref<string | null>(null)
const replyText = ref('')
const replyStatus = ref(2)

const canEdit = computed(() => user.has('message:edit'))
const canReply = computed(() => user.has('message:reply'))
const canDelete = computed(() => user.has('message:delete'))
const canExport = computed(() => user.has('message:export'))
const canSeeUsers = computed(() => user.has('system:user:view'))

const tabs = computed(() => [
  { name: 'all', label: '全部', count: counters.value.total ?? 0 },
  ...MESSAGE_STATUS_OPTIONS.map((item) => ({
    name: String(item.value),
    label: item.label,
    count: counters.value[String(item.value)] ?? 0,
  })),
])

function statusTagType(status: number): 'success' | 'warning' | 'danger' | 'info' {
  const tag = messageStatusMeta(status).tag
  return tag === 'success' || tag === 'warning' || tag === 'danger' ? tag : 'info'
}

function handlerName(handlerId?: string | null): string {
  if (!handlerId) return '未指派'
  const hit = userOptions.value.find((item) => item.id === handlerId)
  if (hit) return hit.name
  return handlerId === user.profile?.id ? (user.displayName || '我') : '外部账号'
}

function toListQuery(over: Partial<ListQuery> = {}): ListQuery {
  const out: ListQuery = { ...over }
  if (query.keyword.trim()) out.keyword = query.keyword.trim()
  if (query.type) out.type = query.type
  if (query.handlerId) out.handlerId = query.handlerId
  if (activeTab.value !== 'all') out.status = Number(activeTab.value)
  return out
}

async function reload(page?: number): Promise<void> {
  if (page) query.page = page
  loading.value = true
  try {
    const [res] = await Promise.all([
      listMessages({ ...toListQuery(), page: query.page, pageSize: query.pageSize }),
      loadCounters(),
    ])
    rows.value = res.list ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

async function loadCounters(): Promise<void> {
  try {
    counters.value = await messageCounters()
  } catch {
    // 计数失败不影响列表，保留上一次的值
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

function onSelectionChange(val: MessageItem[]): void {
  selection.value = val
}

function onTabChange(name: string | number): void {
  activeTab.value = String(name)
  void reload(1)
}

async function openDetail(row: MessageItem): Promise<void> {
  drawerVisible.value = true
  detailLoading.value = true
  try {
    const data = await getMessage(String(row.id))
    detail.value = data
    opStatus.value = data.status
    opHandler.value = data.handlerId ?? null
    replyText.value = data.reply ?? ''
    replyStatus.value = data.status === 0 ? 2 : data.status
  } finally {
    detailLoading.value = false
  }
}

async function saveStatus(): Promise<void> {
  if (!detail.value || opSaving.value) return
  opSaving.value = true
  try {
    await setMessageStatus(String(detail.value.id), opStatus.value)
    ElMessage.success('状态已更新')
    await afterChange()
  } finally {
    opSaving.value = false
  }
}

async function saveAssign(handlerId?: string | null): Promise<void> {
  if (!detail.value || opSaving.value) return
  opSaving.value = true
  try {
    // 传空串即为取消指派：后端 AssignMessageDto.handlerId 可选，控制器只在 undefined 时回填当前操作人
    const res = await assignMessage(String(detail.value.id), handlerId === null ? '' : handlerId ?? '')
    ElMessage.success(handlerId ? '已指派' : '已取消指派')
    detail.value = res
    opHandler.value = res.handlerId ?? null
    opStatus.value = res.status
    await reload()
  } finally {
    opSaving.value = false
  }
}

function assignToMe(): Promise<void> {
  const myId = user.profile?.id ?? ''
  if (!myId) {
    ElMessage.warning('未取到当前账号信息，请刷新后重试')
    return Promise.resolve()
  }
  opHandler.value = myId
  return saveAssign(myId)
}

async function saveReply(): Promise<void> {
  if (!detail.value || replySaving.value) return
  replySaving.value = true
  try {
    const res = await replyMessage(String(detail.value.id), replyText.value.trim(), replyStatus.value)
    ElMessage.success('回复已保存')
    detail.value = res
    opStatus.value = res.status
    await reload()
  } finally {
    replySaving.value = false
  }
}

async function removeRow(): Promise<void> {
  if (!detail.value) return
  await deleteMessage(String(detail.value.id))
  ElMessage.success('已删除')
  drawerVisible.value = false
  detail.value = null
  await reload(rows.value.length === 1 ? Math.max(1, query.page - 1) : undefined)
}

async function afterChange(): Promise<void> {
  if (detail.value) {
    try {
      detail.value = await getMessage(String(detail.value.id))
      opStatus.value = detail.value.status
      opHandler.value = detail.value.handlerId ?? null
    } catch {
      // 详情刷新失败时保留当前视图
    }
  }
  await reload()
}

async function bulkRemove(): Promise<void> {
  const ids = selection.value.map((row) => String(row.id))
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 条留言？删除后无法恢复。`, '批量删除', {
      type: 'warning',
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  const res = await bulkDeleteMessages(ids)
  ElMessage.success(`已删除 ${res.deleted} 条`)
  await reload(1)
}

async function doExport(): Promise<void> {
  exporting.value = true
  try {
    await exportMessages(toListQuery())
    ElMessage.success('已开始下载，导出沿用当前筛选条件（最多 5000 条）')
  } finally {
    exporting.value = false
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
.msg-tabs {
  margin-bottom: 4px;
}

.msg-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.msg-tabs__count {
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.cell-strong {
  font-weight: 500;
}

.cell-mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}

.msg-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-detail__title {
  margin: 14px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.msg-detail__text {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.msg-detail__ua {
  font-size: 12px;
  word-break: break-all;
}

.msg-detail__ops {
  margin-top: 4px;
}

.msg-detail__foot {
  padding-top: 18px;
  margin-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
