<template>
  <PageContainer :title="config.title" :subtitle="config.subtitle" :loading="booting">
    <template #actions>
      <el-button v-if="canManageDefs" @click="defVisible = true">配置项管理</el-button>
      <el-button :icon="Refresh" circle title="重新载入" @click="load" />
    </template>

    <template #toolbar>
      <el-input v-model="keyword" placeholder="按名称 / 键名筛选" clearable style="width: 220px" />
      <span class="form-tip">本页维护「{{ groupText }}」分组，改完点右下角「保存变更」才会落库。</span>
    </template>

    <SettingForm :items="items" :loading="booting" :keyword="keyword" />

    <el-alert type="info" :closable="false" show-icon title="配置项以「键名」唯一标识，前台按键名取值">
      <p class="form-tip">
        需要新增一项站点属性时点右上角「配置项管理」；已有配置项的标签、分组、排序也在同一处调整，配置值本身在上方表单里改。
      </p>
    </el-alert>
  </PageContainer>

  <el-drawer v-model="defVisible" title="配置项管理" size="860px">
    <div class="page-toolbar defs__bar">
      <span class="form-tip">这里维护的是「定义」（键名、标签、类型、分组、排序），新增或删除后本页表单会重新载入。</span>
      <div class="page-toolbar__actions">
        <el-button v-if="canCreateDef" type="primary" size="small" @click="openCreate">新增配置项</el-button>
      </div>
    </div>

    <el-table :data="items" size="small" border max-height="64vh" empty-text="该页暂无配置项">
      <el-table-column label="名称" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.label }}</template>
      </el-table-column>
      <el-table-column label="键名" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="cell-mono">{{ row.key }}</span>
        </template>
      </el-table-column>
      <el-table-column label="分组" width="110">
        <template #default="{ row }">{{ groupLabel(row.group) }}</template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="排序" width="70" prop="sortOrder" />
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canEditDef" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm v-if="canDeleteDef" title="删除后前台取不到该配置，确认？" width="240" @confirm="removeDef(row)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </el-drawer>

  <FormDialog
    ref="defDialogRef"
    v-model="defDialogVisible"
    :title="editingId ? '编辑配置项' : '新增配置项'"
    :specs="defSpecs"
    :values="defForm"
    :saving="defSaving"
    :hint="editingId ? '类型与配置值不在此处修改：类型固定不可变，值请回表单编辑' : ''"
    @save="submitDef"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  SETTING_GROUPS,
  createSetting,
  deleteSetting,
  settings,
  updateSetting,
  type SettingItem,
  type SettingType,
} from '@/api/modules/site'
import { useUserStore } from '@/stores/user'
import { settingControl, type FieldSpec } from '@/utils/field'
import FormDialog from '@/components/FormDialog.vue'
import PageContainer from '@/components/PageContainer.vue'
import SettingForm from '@/components/SettingForm.vue'

interface SettingPageConfig {
  title: string
  subtitle: string
  /** 空数组表示不限分组，把库里的配置项全部列出 */
  groups: string[]
}

/** 四个菜单入口共用本视图，按路径尾段决定展示哪些 Setting 分组 */
const PAGE_BY_PATH: Record<string, SettingPageConfig> = {
  brand: {
    title: '品牌与联系方式',
    subtitle: 'Logo、公司全称、热线与地址等站点级属性，导航、页脚、联系页共用',
    groups: ['brand', 'site', 'contact'],
  },
  footer: {
    title: '页脚与备案',
    subtitle: '页脚简介、竖排标语、版权与备案号、社交账号',
    groups: ['footer', 'social'],
  },
  seo: {
    title: 'SEO 与统计',
    subtitle: '浏览器标题、默认搜索描述、统计代码与留言表单提示语',
    groups: ['seo', 'analytics', 'form'],
  },
  ui: {
    title: '前台文案',
    subtitle: '组件内部的固定文案（按钮、空状态、栏目标题），与页面区块文案分开维护',
    groups: ['ui'],
  },
}

const OTHER_GROUP: SettingPageConfig = {
  title: '站点配置',
  subtitle: '全部站点属性',
  groups: [],
}

/** Setting.type 的中文名，与 server 的 SETTING_TYPES 一一对应 */
const TYPE_OPTIONS: { value: SettingType; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '开关' },
  { value: 'color', label: '颜色' },
  { value: 'image', label: '图片' },
  { value: 'url', label: '链接' },
  { value: 'email', label: '邮箱' },
  { value: 'select', label: '下拉选择' },
  { value: 'tags', label: '标签列表' },
  { value: 'pairs', label: '键值对列表' },
  { value: 'json', label: 'JSON' },
  { value: 'richtext', label: '富文本' },
  { value: 'date', label: '日期' },
]

const route = useRoute()
const user = useUserStore()

const canCreateDef = computed(() => user.has('site:setting:create'))
const canEditDef = computed(() => user.has('site:setting:edit'))
const canDeleteDef = computed(() => user.has('site:setting:delete'))
const canManageDefs = computed(() => canCreateDef.value || canEditDef.value || canDeleteDef.value)

const config = computed<SettingPageConfig>(() => PAGE_BY_PATH[route.path.split('/').pop() ?? ''] ?? OTHER_GROUP)
const groupText = computed(() =>
  config.value.groups.length ? config.value.groups.map(groupLabel).join(' / ') : '全部分组',
)

const items = ref<SettingItem[]>([])
const booting = ref(false)
const keyword = ref('')

function groupLabel(group: string): string {
  return SETTING_GROUPS.find((item) => item.value === group)?.label ?? group
}

function typeLabel(type: string): string {
  return TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type
}

async function load(): Promise<void> {
  booting.value = true
  try {
    const groups = config.value.groups
    // 分组逐个取，顺序即页面里的分节顺序（服务端只按 group 字母序返回）
    items.value = groups.length ? (await Promise.all(groups.map((group) => settings({ group })))).flat() : await settings({})
  } finally {
    booting.value = false
  }
}

// ---------- 配置项定义 ----------

const defVisible = ref(false)
const defDialogVisible = ref(false)
const defDialogRef = ref<InstanceType<typeof FormDialog>>()
const defSaving = ref(false)
const editingId = ref('')
const defForm = reactive<Record<string, any>>({})

const defSpecs = computed<FieldSpec[]>(() => {
  const isCreate = !editingId.value
  const specs: FieldSpec[] = []
  if (isCreate) {
    specs.push({
      name: 'key',
      label: '键名',
      control: 'text',
      required: true,
      tip: '前台按键名取值，形如 brand.phone，保存后不可修改',
    })
  }
  specs.push({ name: 'label', label: '显示名称', control: 'text', required: true })
  specs.push({
    name: 'group',
    label: '分组',
    control: 'select',
    required: true,
    options: SETTING_GROUPS.map((item) => ({ label: item.label, value: item.value })),
    tip: '决定这一项出现在哪个配置页',
  })
  if (isCreate) {
    specs.push({
      name: 'type',
      label: '类型',
      control: 'select',
      required: true,
      options: TYPE_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
      tip: '类型决定表单控件，创建后不可修改',
    })
    specs.push({
      name: 'value',
      label: '配置值',
      // 控件跟着已选类型走，切换类型即换控件
      control: settingControl(String(defForm.type ?? 'text')),
      required: true,
      tip: '创建时必须填一个非空值，之后可在表单里清空',
    })
  }
  specs.push({
    name: 'options',
    label: '候选项',
    control: 'pairs',
    group: 'detail',
    tip: '仅「下拉选择」类型需要：label 用于显示，value 用于存储',
  })
  specs.push({
    name: 'remark',
    label: '说明',
    control: 'textarea',
    group: 'detail',
    tip: '会显示在配置字段下方，用来标注这一项被前台哪里用到',
  })
  specs.push({ name: 'sortOrder', label: '排序', control: 'number', group: 'detail' })
  return specs
})

function resetDefForm(row?: SettingItem): void {
  for (const key of Object.keys(defForm)) delete defForm[key]
  defForm.group = config.value.groups[0] ?? 'other'
  defForm.type = 'text'
  defForm.options = []
  if (!row) return
  defForm.group = row.group
  defForm.label = row.label
  defForm.remark = row.remark ?? ''
  defForm.sortOrder = row.sortOrder
  defForm.options = (row.options ?? []).map((o) => ({ label: o.label, value: o.value }))
}

function openCreate(): void {
  editingId.value = ''
  resetDefForm()
  defDialogVisible.value = true
}

function openEdit(row: SettingItem): void {
  editingId.value = row.id
  resetDefForm(row)
  defDialogVisible.value = true
}

/** PairListEditor 的行 -> Setting.options，空 value 的行丢掉 */
function toSettingOptions(rows: unknown): { label: string; value: string }[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => ({ label: String(row?.label ?? '').trim(), value: String(row?.value ?? '').trim() }))
    .filter((row) => row.value)
}

async function submitDef(): Promise<void> {
  if ((await defDialogRef.value?.validate()) === false) return

  const options = toSettingOptions(defForm.options)
  defSaving.value = true
  try {
    if (editingId.value) {
      await updateSetting(editingId.value, {
        group: defForm.group,
        label: defForm.label,
        remark: defForm.remark || null,
        options,
        sortOrder: defForm.sortOrder == null ? undefined : Number(defForm.sortOrder),
      })
      ElMessage.success('已更新配置项')
    } else {
      await createSetting({
        key: String(defForm.key).trim(),
        group: defForm.group,
        type: defForm.type,
        label: defForm.label,
        remark: defForm.remark || undefined,
        value: defForm.value,
        options,
        sortOrder: defForm.sortOrder == null ? undefined : Number(defForm.sortOrder),
      })
      ElMessage.success(`已新增配置项 ${String(defForm.key).trim()}`)
    }
    defDialogVisible.value = false
    await load()
  } finally {
    defSaving.value = false
  }
}

async function removeDef(row: SettingItem): Promise<void> {
  await deleteSetting(row.id)
  ElMessage.success(`已删除 ${row.key}`)
  await load()
}

watch(
  () => route.path,
  () => {
    keyword.value = ''
    void load()
  },
)

onMounted(() => void load())
</script>

<style scoped>
.defs__bar {
  justify-content: space-between;
  padding-bottom: 10px;
}

.cell-mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}
</style>
