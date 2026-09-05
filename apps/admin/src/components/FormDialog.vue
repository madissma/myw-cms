<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="size"
    top="6vh"
    append-to-body
    :close-on-click-modal="false"
    class="form-dialog"
  >
    <div class="form-dialog__body">
      <DynamicForm ref="formRef" :specs="specs" :values="values" :disabled="saving" />
      <!-- 权限树、术语关联等特殊区块由调用方补在动态表单之后 -->
      <slot name="body" :values="values" />
    </div>

    <template #footer>
      <div class="dialog-foot">
        <span v-if="hint" class="form-tip">{{ hint }}</span>
        <div class="page-toolbar__actions">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="emit('save')">{{ saveText }}</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FieldSpec } from '@/utils/field'
import DynamicForm from './DynamicForm.vue'

withDefaults(
  defineProps<{
    title: string
    specs: FieldSpec[]
    values: Record<string, any>
    saving?: boolean
    size?: string
    saveText?: string
    hint?: string
  }>(),
  { saving: false, size: '680px', saveText: '保存', hint: '' },
)

const emit = defineEmits<{ (e: 'save'): void }>()

const visible = defineModel<boolean>({ type: Boolean, default: false })

const formRef = ref<InstanceType<typeof DynamicForm>>()

async function validate(): Promise<boolean> {
  return (await formRef.value?.validate()) ?? true
}

defineExpose({ validate, formRef })
</script>

<style scoped>
/* 弹窗内容区自己限高滚动，不依赖 el-dialog 内部 DOM 结构 */
.form-dialog__body {
  max-height: 66vh;
  padding-right: 6px;
  overflow-y: auto;
}
</style>
