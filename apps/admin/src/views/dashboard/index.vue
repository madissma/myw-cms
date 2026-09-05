<template>
  <div class="page" v-loading="loading">
    <el-row :gutter="12">
      <el-col v-for="item in contentCards" :key="item.key" :xs="12" :sm="8" :md="6" :lg="4">
        <el-card shadow="never" class="stat" @click="goModule(item.key)">
          <p class="stat__label">{{ item.label }}</p>
          <p class="stat__value">{{ item.total }}</p>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :md="24" :lg="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>最近更新</span>
              <span class="muted">结构与栏目：{{ structureText }}</span>
            </div>
          </template>
          <el-table :data="latestRows" size="small" empty-text="暂无内容，M10 seed 后会有基线数据">
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="title" label="名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" effect="plain">
                  {{ statusMeta(row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="更新时间" width="150">
              <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :md="24" :lg="10">
        <el-card shadow="never" class="mini">
          <template #header>
            <div class="card-head">
              <span>留言箱</span>
              <el-link type="primary" :underline="false" @click="goMessage">查看</el-link>
            </div>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="留言总数">{{ stats?.message.total ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="待处理">
              <el-tag v-if="stats?.message.pending" type="warning" size="small">{{ stats.message.pending }}</el-tag>
              <span v-else>0</span>
            </el-descriptions-item>
            <el-descriptions-item label="已处理">{{ stats?.message.handled ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="后台账号">{{ stats?.user ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="操作日志">{{ stats?.log ?? 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="never" class="mini">
          <template #header><span>最近登录</span></template>
          <ul class="logins">
            <li v-for="row in stats?.recentLogins ?? []" :key="row.id">
              <span>{{ row.name || row.username }}</span>
              <span class="muted">{{ formatDateTime(row.lastLoginAt) }}</span>
            </li>
            <li v-if="!stats?.recentLogins.length" class="muted">暂无登录记录</li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardStats, type DashboardStats } from '@/api/modules/system'
import { formatDateTime } from '@/utils/format'
import { statusMeta } from '@/types/api'

const router = useRouter()
const loading = ref(false)
const stats = ref<DashboardStats | null>(null)

const contentCards = computed(() => stats.value?.content ?? [])

const structureText = computed(() => {
  const s = stats.value?.structure
  if (!s) return '-'
  return `页面 ${s.page} / 区块 ${s.block} / 导航 ${s.navMenu} / 术语 ${s.term}`
})

const latestRows = computed(() => {
  const latest = stats.value?.latest
  if (!latest) return []
  return [
    ...latest.products.map((p) => ({ type: '产品', title: p.name, status: p.status, updatedAt: p.updatedAt })),
    ...latest.news.map((n) => ({ type: '新闻', title: n.title, status: n.status, updatedAt: n.updatedAt })),
  ]
})

/** 内容统计卡片按 delegate 命名，跳到对应的菜单路径 */
const MODULE_BY_KEY: Record<string, string> = {
  product: '/content/product',
  news: '/content/news',
  video: '/content/video',
  review: '/content/review',
  honor: '/content/honor',
  timelineEvent: '/content/timeline',
  mediaAsset: '/media',
}

function goModule(key: string): void {
  const path = MODULE_BY_KEY[key]
  if (path) void router.push(path)
}

function goMessage(): void {
  void router.push('/message')
}

onMounted(async () => {
  loading.value = true
  try {
    stats.value = await dashboardStats()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stat {
  margin-bottom: 12px;
  cursor: pointer;
}

.stat__label {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat__value {
  margin: 6px 0 0;
  font-size: 22px;
  font-weight: 600;
  color: #0b3d20;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mini {
  margin-bottom: 12px;
}

.logins {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.logins li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.logins li:last-child {
  border-bottom: 0;
}
</style>
