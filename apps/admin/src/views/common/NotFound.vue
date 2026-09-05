<template>
  <el-card shadow="never">
    <el-result icon="warning" title="404" sub-title="地址不存在，或当前账号没有该模块的权限。">
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
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
