<template>
  <el-card shadow="never">
    <el-result icon="info" :title="title" sub-title="该模块的界面尚未接入，后端接口已就绪。">
      <template #extra>
        <div class="placeholder__meta">
          <p>对应接口前缀：<code>{{ apiHint }}</code></p>
          <p class="muted">随 M5 里程碑逐个栏目交付，当前可先用接口文档操作。</p>
        </div>
        <el-button type="primary" @click="router.push('/dashboard')">返回工作台</el-button>
      </template>
    </el-result>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const title = computed(() => (route.meta.title as string) || '功能建设中')

/** 由菜单 path 推导接口前缀，方便直接对照后端 */
const apiHint = computed(() => `/api/v1/admin${route.path}`)
</script>

<style scoped>
.placeholder__meta {
  margin-bottom: 12px;
  font-size: 13px;
  text-align: left;
}

.placeholder__meta p {
  margin: 4px 0;
}
</style>
