<template>
  <el-card shadow="never">
    <el-result icon="error" title="403" :sub-title="hint">
      <template #extra>
        <el-space>
          <el-button @click="router.back()">返回上一页</el-button>
          <el-button type="primary" @click="router.push('/dashboard')">去工作台</el-button>
        </el-space>
      </template>
    </el-result>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const hint = computed(() =>
  route.meta.perm ? `当前账号缺少权限点：${String(route.meta.perm)}` : '当前账号无权访问该页面',
)
</script>
