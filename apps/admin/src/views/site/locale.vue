<template>
  <PageContainer title="语言与翻译" :subtitle="SUBTITLE" :loading="booting">
    <el-tabs v-model="tab" class="locale__tabs">
      <el-tab-pane label="语言" name="locale">
        <div class="page-toolbar locale__bar">
          <span class="form-tip">默认语言是译文缺失时的回落语言，也是前台语言切换器的初始选中项。</span>
          <div class="page-toolbar__actions">
            <el-button v-if="canCreateLocale" type="primary" size="small" @click="openLocaleCreate">新增语言</el-button>
            <el-button :icon="Refresh" size="small" circle @click="loadLocales" />
          </div>
        </div>

        <el-table v-loading="localeLoading" :data="localeRows" size="small" border empty-text="尚未配置语言">
          <el-table-column label="语言代码" width="130">
            <template #default="{ row }">
              <span class="cell-mono">{{ row.code }}</span>
            </template>
          </el-table-column>
          <el-table-column label="名称" prop="name" min-width="120" />
          <el-table-column label="本地名称" prop="nativeName" min-width="120" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="row.active ? 'success' : 'info'" effect="plain">
                {{ row.active ? '已启用' : '未启用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="默认" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.isDefault" size="small" type="warning">默认</el-tag>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="排序" prop="sortOrder" width="70" />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button v-if="canEditLocale" link type="primary" @click="openLocaleEdit(row)">编辑</el-button>
              <el-button v-if="canEditLocale" link @click="toggleActive(row)">
                {{ row.active ? '停用' : '启用' }}
              </el-button>
              <el-button v-if="canEditLocale && !row.isDefault" link type="warning" @click="makeDefault(row)">
                设为默认
              </el-button>
              <el-popconfirm
                v-if="canDeleteLocale && !row.isDefault"
                :title="`删除 ${row.code} 会一并清掉它的译文，确认？`"
                width="260"
                @confirm="removeLocale(row)"
              >
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="译文覆盖" name="translation">
        <div class="page-toolbar locale__bar">
          <el-select v-model="query.locale" placeholder="全部语言" clearable :value-on-clear="null" style="width: 150px" @change="reloadTranslations">
            <el-option v-for="item in localeRows" :key="item.code" :label="`${item.name}（${item.code}）`" :value="item.code" />
          </el-select>
          <el-select v-model="query.entity" placeholder="全部实体" clearable :value-on-clear="null" style="width: 150px" @change="reloadTranslations">
            <el-option v-for="item in ENTITY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input
            v-model="query.keyword"
            placeholder="按字段 / 译文 / 记录 ID 搜索"
            clearable
            style="width: 220px"
            @keyup.enter="reloadTranslations"
            @clear="reloadTranslations"
          />
          <el-button @click="reloadTranslations">查询</el-button>
          <div class="page-toolbar__actions">
            <el-button v-if="canEditTranslation" type="primary" size="small" @click="openTranslationCreate">
              新增译文
            </el-button>
          </div>
        </div>

        <el-table v-loading="translationLoading" :data="translationRows" size="small" border empty-text="暂无译文，本期只搭框架，可按需录入">
          <el-table-column label="语言" width="100">
            <template #default="{ row }">
              <span class="cell-mono">{{ row.locale }}</span>
            </template>
          </el-table-column>
          <el-table-column label="实体" width="100">
            <template #default="{ row }">{{ entityLabel(row.entity) }}</template>
          </el-table-column>
          <el-table-column label="记录 ID" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="cell-mono">{{ row.entityId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="字段" prop="field" width="140" show-overflow-tooltip />
          <el-table-column label="译文" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ truncate(row.value, 80) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button v-if="canEditTranslation" link type="primary" @click="openTranslationEdit(row)">编辑</el-button>
              <el-popconfirm v-if="canDeleteTranslation" title="删除后该字段回落默认语言，确认？" width="240" @confirm="removeTranslation(row)">
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <el-pagination
            v-model:current-page="query.page"
            v-model:page-size="query.pageSize"
            :total="translationTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            background
            @current-change="loadTranslations"
            @size-change="reloadTranslations"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <FormDialog
      ref="dialogRef"
      v-model="dialogVisible"
      :title="dialogTitle"
      :specs="dialogSpecs"
      :values="dialogForm"
      :saving="saving"
      :hint="dialogHint"
      @save="submitDialog"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  createLocale,
  deleteLocale,
  deleteTranslation,
  locales,
  setLocaleDefault,
  translations,
  updateLocale,
  upsertTranslations,
  type LocaleItem,
  type TranslationItem,
} from '@/api/modules/site'
import { useUserStore } from '@/stores/user'
import { truncate } from '@/utils/format'
import type { FieldSpec } from '@/utils/field'
import FormDialog from '@/components/FormDialog.vue'
import PageContainer from '@/components/PageContainer.vue'

const SUBTITLE = '语言开关决定前台可切换的语种，译文按字段覆盖基础记录，缺失自动回落默认语言'

/** 与 server 的 TRANSLATABLE_ENTITIES 一致，多出的取值后端会拒 */
const ENTITY_OPTIONS = [
  { value: 'product', label: '产品' },
  { value: 'news', label: '新闻' },
  { value: 'page', label: '页面' },
  { value: 'section', label: '区块组' },
  { value: 'block', label: '区块' },
  { value: 'term', label: '分类术语' },
  { value: 'setting', label: '站点配置' },
  { value: 'nav', label: '导航栏目' },
]

const user = useUserStore()
const canCreateLocale = computed(() => user.has('site:locale:create'))
const canEditLocale = computed(() => user.has('site:locale:edit'))
const canDeleteLocale = computed(() => user.has('site:locale:delete'))
const canEditTranslation = computed(() => user.has('site:translation:edit'))
const canDeleteTranslation = computed(() => user.has('site:translation:delete'))

const tab = ref('locale')
const booting = ref(false)

// ---------- 语言 ----------

const localeRows = ref<LocaleItem[]>([])
const localeLoading = ref(false)

async function loadLocales(): Promise<void> {
  localeLoading.value = true
  try {
    localeRows.value = await locales()
  } finally {
    localeLoading.value = false
  }
}

async function toggleActive(row: LocaleItem): Promise<void> {
  await updateLocale(row.id, { active: !row.active })
  ElMessage.success(row.active ? `已停用 ${row.code}` : `已启用 ${row.code}`)
  await loadLocales()
}

async function makeDefault(row: LocaleItem): Promise<void> {
  await setLocaleDefault(row.id)
  ElMessage.success(`已将 ${row.code} 设为默认语言`)
  await loadLocales()
}

async function removeLocale(row: LocaleItem): Promise<void> {
  await deleteLocale(row.id)
  ElMessage.success(`已删除 ${row.code}`)
  await Promise.all([loadLocales(), loadTranslations()])
}

// ---------- 译文 ----------

const translationRows = ref<TranslationItem[]>([])
const translationTotal = ref(0)
const translationLoading = ref(false)
const query = reactive<{ page: number; pageSize: number; locale: string | null; entity: string | null; keyword: string }>({
  page: 1,
  pageSize: 20,
  locale: null,
  entity: null,
  keyword: '',
})

async function loadTranslations(): Promise<void> {
  translationLoading.value = true
  try {
    const res = await translations({
      page: query.page,
      pageSize: query.pageSize,
      locale: query.locale ?? undefined,
      entity: query.entity ?? undefined,
      keyword: query.keyword || undefined,
    })
    translationRows.value = res.list
    translationTotal.value = res.total
  } finally {
    translationLoading.value = false
  }
}

async function reloadTranslations(): Promise<void> {
  query.page = 1
  await loadTranslations()
}

function entityLabel(entity: string): string {
  return ENTITY_OPTIONS.find((item) => item.value === entity)?.label ?? entity
}

// ---------- 共用弹窗 ----------

type DialogMode = 'locale-create' | 'locale-edit' | 'translation-create' | 'translation-edit'

const dialogRef = ref<InstanceType<typeof FormDialog>>()
const dialogVisible = ref(false)
const saving = ref(false)
const mode = ref<DialogMode>('locale-create')
const dialogForm = reactive<Record<string, any>>({})

const dialogTitle = computed(() => {
  if (mode.value.startsWith('locale')) return mode.value.endsWith('create') ? '新增语言' : '编辑语言'
  return mode.value === 'translation-create' ? '新增译文' : '编辑译文'
})

const dialogHint = computed(() => {
  if (mode.value === 'translation-create') return '记录 ID 取列表接口返回的 id，写错不会报错但前台匹配不上'
  if (mode.value === 'translation-edit') return '语言 / 实体 / 记录 / 字段构成唯一标识，只能改译文；清空即为删除该条'
  return ''
})

const localeSpecs: FieldSpec[] = [
  { name: 'name', label: '名称', control: 'text', required: true, tip: '后台与提示用的中文名' },
  { name: 'nativeName', label: '本地名称', control: 'text', required: true, tip: '前台切换器上显示的文字，如 English' },
  { name: 'sortOrder', label: '排序', control: 'number', group: 'sys' },
  { name: 'active', label: '启用', control: 'switch', group: 'sys', tip: '未启用的语言不出现在前台切换器里' },
]

const translationSpecs = computed<FieldSpec[]>(() => [
  {
    name: 'locale',
    label: '语言',
    control: 'select',
    required: true,
    // 语言列表是异步拉回来的，写成常量会拿到一份空选项
    options: localeRows.value.map((item) => ({ label: `${item.name}（${item.code}）`, value: item.code })),
    tip: '默认语言本身不需要译文记录',
  },
  { name: 'entity', label: '实体', control: 'select', required: true, options: ENTITY_OPTIONS },
  {
    name: 'entityId',
    label: '记录 ID',
    control: 'text',
    required: true,
    tip: '填该条内容的主键 id（cuid），前台按 id 合并译文',
  },
  { name: 'field', label: '字段名', control: 'text', required: true, tip: '须与实体列名一致，如 name / title / summary' },
  { name: 'value', label: '译文', control: 'textarea', required: true },
])

const dialogSpecs = computed<FieldSpec[]>(() => {
  if (mode.value === 'locale-create') {
    return [
      {
        name: 'code',
        label: '语言代码',
        control: 'text',
        required: true,
        tip: '形如 zh-CN / en-US，保存后不可修改',
      },
      ...localeSpecs,
    ]
  }
  if (mode.value === 'locale-edit') return localeSpecs
  if (mode.value === 'translation-create') return translationSpecs.value
  // 编辑译文只放开 value：身份四元组是 upsert 的匹配键，改了等于新建一条
  return translationSpecs.value.filter((spec) => spec.name === 'value')
})

function resetDialogForm(patch: Record<string, any> = {}): void {
  for (const key of Object.keys(dialogForm)) delete dialogForm[key]
  dialogForm.active = true
  dialogForm.sortOrder = null
  Object.assign(dialogForm, patch)
}

function openLocaleCreate(): void {
  mode.value = 'locale-create'
  resetDialogForm({ sortOrder: (localeRows.value.length + 1) * 10 })
  dialogVisible.value = true
}

function openLocaleEdit(row: LocaleItem): void {
  mode.value = 'locale-edit'
  resetDialogForm({ id: row.id, name: row.name, nativeName: row.nativeName, sortOrder: row.sortOrder, active: row.active })
  dialogVisible.value = true
}

function openTranslationCreate(): void {
  mode.value = 'translation-create'
  resetDialogForm({ locale: localeRows.value.find((item) => !item.isDefault)?.code ?? '' })
  dialogVisible.value = true
}

function openTranslationEdit(row: TranslationItem): void {
  mode.value = 'translation-edit'
  resetDialogForm({ id: row.id, locale: row.locale, entity: row.entity, entityId: row.entityId, field: row.field, value: row.value })
  dialogVisible.value = true
}

async function submitDialog(): Promise<void> {
  if ((await dialogRef.value?.validate()) === false) return

  saving.value = true
  try {
    if (mode.value === 'locale-create') {
      await createLocale({
        code: String(dialogForm.code).trim(),
        name: dialogForm.name,
        nativeName: dialogForm.nativeName,
        sortOrder: dialogForm.sortOrder == null ? undefined : Number(dialogForm.sortOrder),
        active: !!dialogForm.active,
      })
      ElMessage.success(`已新增语言 ${String(dialogForm.code).trim()}`)
      await loadLocales()
    } else if (mode.value === 'locale-edit') {
      await updateLocale(dialogForm.id, {
        name: dialogForm.name,
        nativeName: dialogForm.nativeName,
        sortOrder: dialogForm.sortOrder == null ? undefined : Number(dialogForm.sortOrder),
        active: !!dialogForm.active,
      })
      ElMessage.success('已更新语言')
      await loadLocales()
    } else {
      await upsertTranslations([
        {
          locale: dialogForm.locale,
          entity: dialogForm.entity,
          entityId: String(dialogForm.entityId).trim(),
          field: String(dialogForm.field).trim(),
          value: String(dialogForm.value ?? ''),
        },
      ])
      ElMessage.success('已保存译文')
      await loadTranslations()
    }
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}

async function removeTranslation(row: TranslationItem): Promise<void> {
  await deleteTranslation(row.id)
  ElMessage.success('已删除译文')
  await loadTranslations()
}

onMounted(async () => {
  booting.value = true
  try {
    await Promise.all([loadLocales(), loadTranslations()])
  } finally {
    booting.value = false
  }
})
</script>

<style scoped>
.locale__tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.locale__bar {
  justify-content: space-between;
  padding-bottom: 12px;
}

.cell-mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}
</style>
