<template>
  <div class="setting-form" v-loading="loading">
    <DynamicForm ref="formRef" :specs="specs" :values="values" :disabled="!canEdit" :keyword="keyword" />

    <div class="setting-form__foot">
      <span class="form-tip">
        {{ canEdit ? (dirtyCount ? `有 ${dirtyCount} 项未保存` : '全部已保存') : '当前账号无修改权限，仅可查看' }}
        <template v-if="hiddenCount">，另有 {{ hiddenCount }} 项被筛选隐藏</template>
      </span>
      <div class="page-toolbar__actions">
        <el-button :disabled="!dirtyCount" @click="revert">还原修改</el-button>
        <el-button type="primary" :disabled="!dirtyCount" :loading="saving" @click="save">保存变更</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { saveSettingsBulk, type SettingItem } from '@/api/modules/site'
import { useUserStore } from '@/stores/user'
import { settingFieldSpec, type FieldSpec } from '@/utils/field'
import DynamicForm from './DynamicForm.vue'

const props = withDefaults(
  defineProps<{
    items: SettingItem[]
    loading?: boolean
    /** 筛选关键字：只影响显示，保存仍提交全部改动项 */
    keyword?: string
  }>(),
  { loading: false, keyword: '' },
)

const emit = defineEmits<{ (e: 'saved', count: number): void }>()

const user = useUserStore()
const canEdit = computed(() => user.has('site:setting:edit'))
const formRef = ref<InstanceType<typeof DynamicForm>>()
const saving = ref(false)
const values = reactive<Record<string, any>>({})
/** key -> 水合时的序列化值，用于脏检查 */
const baseline = reactive<Record<string, string>>({})

const specs = computed<FieldSpec[]>(() => props.items.map(settingFieldSpec))

function dirtyItems(): SettingItem[] {
  return props.items.filter((item) => JSON.stringify(values[item.key]) !== baseline[item.key])
}

const dirtyCount = computed(() => dirtyItems().length)

/** 供页面提示“还有多少项没在屏幕上”，不参与保存判定 */
const hiddenCount = computed(() => {
  const kw = props.keyword.trim().toLowerCase()
  if (!kw) return 0
  return props.items.filter((item) => !`${item.label} ${item.key}`.toLowerCase().includes(kw)).length
})

function hydrate(): void {
  for (const key of Object.keys(values)) delete values[key]
  for (const item of props.items) {
    values[item.key] = item.value
    baseline[item.key] = JSON.stringify(item.value)
  }
}

watch(() => props.items, hydrate, { immediate: true })

function revert(): void {
  hydrate()
  formRef.value?.resetValidate()
  ElMessage.info('已还原为库中的值')
}

async function save(): Promise<void> {
  const changed = dirtyItems()
  if (!changed.length) return

  const ok = await formRef.value?.validate()
  if (ok === false) return

  saving.value = true
  try {
    const res = await saveSettingsBulk(changed.map((item) => ({ key: item.key, value: values[item.key] })))
    hydrate()
    if (res.skipped) ElMessage.warning(`已保存 ${res.updated} 项，${res.skipped} 项未登记被跳过`)
    else ElMessage.success(`已保存 ${res.updated} 项`)
    emit('saved', res.updated)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.setting-form__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
