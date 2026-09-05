<template>
  <div class="page">
    <div class="page-head">
      <div class="page-head__text">
        <h2 class="page-head__title">{{ title }}</h2>
        <p v-if="subtitle" class="page-head__sub">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-toolbar__actions">
        <slot name="actions" />
      </div>
    </div>

    <el-card shadow="never" :class="['page-card', { 'page-card--plain': plain }]" v-loading="loading">
      <div v-if="$slots.toolbar" class="page-toolbar page-toolbar--top">
        <slot name="toolbar" />
      </div>
      <slot />
      <div v-if="$slots.footer" class="pager">
        <slot name="footer" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    loading?: boolean
    /** 内部自带卡片或左右分栏的页面用，去掉外层卡片边框 */
    plain?: boolean
  }>(),
  { subtitle: '', loading: false, plain: false },
)
</script>

<style scoped>
.page-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
  justify-content: space-between;
}

.page-head__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.page-head__sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.page-toolbar--top {
  justify-content: flex-start;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.page-card--plain {
  background: transparent;
  border: none;
}

.page-card--plain :deep(.el-card__body) {
  padding: 0;
}
</style>
