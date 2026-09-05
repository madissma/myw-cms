<template>
  <PageContainer title="网站风格" :subtitle="SUBTITLE" :loading="booting">
    <template #actions>
      <el-button v-if="canCreate" type="primary" @click="openCreate">新建主题</el-button>
      <el-button :icon="Refresh" circle title="重新载入" @click="load" />
    </template>

    <template #toolbar>
      <span class="form-tip">
        同一时刻只有一个启用中的主题：token 由 bootstrap 下发，前台启动时写入 CSS 变量，改完启用即可生效，无需重新构建。
      </span>
      <el-link type="primary" :underline="false" :href="siteUrl" target="_blank">到前台查看</el-link>
    </template>

    <el-row :gutter="12">
      <el-col v-for="theme in list" :key="theme.id" :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="theme" :class="{ 'is-active': theme.active }">
          <template #header>
            <div class="theme__head">
              <div class="theme__heading">
                <span class="theme__name">{{ theme.name }}</span>
                <span class="theme__code cell-mono">{{ theme.code }}</span>
              </div>
              <div class="page-toolbar__actions">
                <el-tag v-if="theme.active" type="success" size="small">启用中</el-tag>
                <el-tag v-if="theme.isDefault" size="small" effect="plain">默认</el-tag>
              </div>
            </div>
          </template>

          <div class="theme__swatches">
            <div
              v-for="row in colorRowsOf(theme)"
              :key="row.key"
              class="theme__swatch"
              :title="`${row.key}: ${row.value}`"
            >
              <span class="theme__chip" :style="{ background: row.value }" />
              <span class="theme__label">{{ COLOR_LABELS[row.key] ?? row.key }}</span>
            </div>
            <p v-if="!colorRowsOf(theme).length" class="muted">该主题没有配色 token</p>
          </div>

          <ul class="theme__meta">
            <li>
              <span class="muted">正文字体</span>
              <span class="theme__font" :title="fontOf(theme)">{{ fontOf(theme) || '-' }}</span>
            </li>
            <li>
              <span class="muted">圆角</span>
              <span>{{ radiusOf(theme) || '-' }}</span>
            </li>
          </ul>

          <p v-if="theme.remark" class="form-tip">{{ theme.remark }}</p>

          <div class="theme__foot">
            <el-button v-if="canActivate && !theme.active" size="small" @click="activate(theme)">启用</el-button>
            <el-button v-if="canEdit" size="small" @click="openEdit(theme)">编辑</el-button>
            <el-button v-if="canEdit && !theme.isDefault" size="small" @click="makeDefault(theme)">设为默认</el-button>
            <el-button v-if="canCreate" size="small" @click="openCopy(theme)">复制</el-button>
            <el-popconfirm
              v-if="canDelete && !theme.isDefault && !theme.active"
              :title="`删除主题「${theme.name}」？`"
              width="240"
              @confirm="remove(theme)"
            >
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!booting && !list.length" description="暂无主题，可新建或执行 seed 生成基线配色" />
  </PageContainer>

  <el-dialog
    v-model="editVisible"
    :title="dialogTitle"
    width="760px"
    top="6vh"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item label="名称" prop="name">
            <el-input v-model="form.name" placeholder="林金（默认）" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="编码" prop="code">
            <el-input v-model="form.code" :disabled="!!form.id" placeholder="forest-gold" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="这套配色用在哪里、什么时候该切回去" />
      </el-form-item>

      <el-form-item label="预览图">
        <ImageUploader v-model="form.preview" tip="留空则卡片只显示色块" />
      </el-form-item>

      <div class="tokens">
        <div class="tokens__section">
          <div class="tokens__head">
            <h4>配色 token</h4>
            <el-button size="small" @click="addColor">添加色值</el-button>
          </div>
          <p class="form-tip">键名需与前台 tailwind 的色族对应（camelCase），值用十六进制。</p>
          <div v-for="(row, index) in colorDraft" :key="index" class="tokens__row">
            <el-input v-model="row.key" placeholder="creamDeep" class="tokens__key" />
            <el-color-picker v-model="row.value" />
            <el-input v-model="row.value" placeholder="#ECE7D6" class="tokens__hex" />
            <el-button link type="danger" @click="colorDraft.splice(index, 1)">删除</el-button>
          </div>
        </div>

        <div class="tokens__section">
          <div class="tokens__head">
            <h4>字体</h4>
            <el-button size="small" @click="addFont">添加字体族</el-button>
          </div>
          <div v-for="(row, index) in fontDraft" :key="index" class="tokens__row">
            <el-input v-model="row.key" placeholder="serif / sans / latin" class="tokens__key" />
            <el-input v-model="row.value" placeholder='"Noto Serif SC", serif' />
            <el-button link type="danger" @click="fontDraft.splice(index, 1)">删除</el-button>
          </div>
        </div>

        <div class="tokens__section">
          <h4>圆角</h4>
          <el-input v-model="radiusDraft" placeholder="0rem" class="tokens__radius" />
          <span class="form-tip tokens__radius-tip">现网站内直角，改成 0.5rem 之类会整体变圆（含按钮、卡片、图片）。</span>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-foot">
        <span class="form-tip">保存只改 token，要立刻让前台用上请回列表点「启用」。</span>
        <div class="page-toolbar__actions">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  activateTheme,
  createTheme,
  deleteTheme,
  setThemeDefault,
  themes,
  updateTheme,
  type ThemeItem,
} from '@/api/modules/site'
import { useUserStore } from '@/stores/user'
import ImageUploader from '@/components/ImageUploader.vue'
import PageContainer from '@/components/PageContainer.vue'

const SUBTITLE = '前台品牌色、字体与圆角都从这里取，可新建配色并一键启用'

/** 与 app/tailwind.config.js 的色族一一对应，仅用于后台显示中文名 */
const COLOR_LABELS: Record<string, string> = {
  cream: '米白',
  creamDeep: '米白加深',
  creamDark: '米色描边',
  forest: '主绿',
  forestDeep: '深绿',
  forestLight: '亮绿',
  forestMist: '雾绿',
  gold: '鎏金',
  goldLight: '浅金',
  goldPale: '淡金',
  ink: '墨黑',
  inkSoft: '墨灰',
}

interface TokenRow {
  key: string
  value: string
}

const siteUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000'
const user = useUserStore()

const canCreate = computed(() => user.has('site:theme:create'))
const canEdit = computed(() => user.has('site:theme:edit'))
const canDelete = computed(() => user.has('site:theme:delete'))
const canActivate = computed(() => user.has('site:theme:activate'))

const list = ref<ThemeItem[]>([])
const booting = ref(false)

async function load(): Promise<void> {
  booting.value = true
  try {
    list.value = await themes()
  } finally {
    booting.value = false
  }
}

function tokenGroups(theme: ThemeItem | null) {
  const tokens = (theme?.tokens ?? {}) as Record<string, any>
  return {
    color: (tokens.color ?? {}) as Record<string, string>,
    font: (tokens.font ?? {}) as Record<string, string>,
    radius: typeof tokens.radius === 'string' ? tokens.radius : '',
  }
}

function colorRowsOf(theme: ThemeItem): TokenRow[] {
  return Object.entries(tokenGroups(theme).color).map(([key, value]) => ({ key, value: String(value ?? '') }))
}

function fontOf(theme: ThemeItem): string {
  return tokenGroups(theme).font.sans ?? ''
}

function radiusOf(theme: ThemeItem): string {
  return tokenGroups(theme).radius
}

// ---------- 编辑 ----------

const editVisible = ref(false)
const formRef = ref<FormInstance>()
const saving = ref(false)
const sourceTokens = ref<Record<string, any>>({})
const colorDraft = ref<TokenRow[]>([])
const fontDraft = ref<TokenRow[]>([])
const radiusDraft = ref('0rem')
const form = reactive<{ id: string; code: string; name: string; remark: string; preview: string }>({
  id: '',
  code: '',
  name: '',
  remark: '',
  preview: '',
})

const dialogTitle = computed(() => (form.id ? `编辑主题「${form.name || form.id}」` : '新建主题'))

const rules: FormRules = {
  name: [{ required: true, message: '请填写主题名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请填写主题编码', trigger: 'blur' },
    { pattern: /^[a-z0-9-]+$/, message: '编码仅支持小写字母、数字与短横线', trigger: 'blur' },
  ],
}

function fill(theme: ThemeItem | null): void {
  const groups = tokenGroups(theme)
  sourceTokens.value = { ...(theme?.tokens ?? {}) }
  colorDraft.value = Object.entries(groups.color).map(([key, value]) => ({ key, value: String(value ?? '') }))
  fontDraft.value = Object.entries(groups.font).map(([key, value]) => ({ key, value: String(value ?? '') }))
  radiusDraft.value = groups.radius || '0rem'
  form.id = theme?.id ?? ''
  form.code = theme?.code ?? ''
  form.name = theme?.name ?? ''
  form.remark = theme?.remark ?? ''
  form.preview = theme?.preview ?? ''
}

function openCreate(): void {
  // 新主题从当前启用主题派生，只改配色就能起步，不必从零填 12 个 token
  fill(list.value.find((item) => item.active) ?? list.value[0] ?? null)
  form.id = ''
  form.code = ''
  form.name = ''
  form.remark = ''
  editVisible.value = true
}

function openEdit(theme: ThemeItem): void {
  fill(theme)
  editVisible.value = true
}

function openCopy(theme: ThemeItem): void {
  fill(theme)
  form.id = ''
  form.code = `${theme.code}-copy`
  form.name = `${theme.name}（副本）`
  form.remark = `复制自 ${theme.name}，尚未启用`
  editVisible.value = true
}

function addColor(): void {
  colorDraft.value.push({ key: '', value: '#000000' })
}

function addFont(): void {
  fontDraft.value.push({ key: '', value: '' })
}

/** 未识别的分组（如 shadow）原样带回，只覆盖可视化编辑的三组 */
function buildTokens(): Record<string, any> {
  return {
    ...sourceTokens.value,
    color: Object.fromEntries(colorDraft.value.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])),
    font: Object.fromEntries(fontDraft.value.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])),
    radius: radiusDraft.value.trim() || '0rem',
  }
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (valid === false) return

  const tokens = buildTokens()
  if (!Object.keys(tokens.color ?? {}).length) {
    ElMessage.warning('至少需要一个配色 token，否则前台拿不到颜色')
    return
  }

  saving.value = true
  try {
    if (form.id) {
      await updateTheme(form.id, {
        name: form.name,
        tokens,
        remark: form.remark || null,
        preview: form.preview || null,
      })
      ElMessage.success('已保存主题')
    } else {
      await createTheme({
        code: form.code.trim(),
        name: form.name,
        tokens,
        remark: form.remark || undefined,
        preview: form.preview || undefined,
      })
      ElMessage.success('已新建主题，未启用前不影响前台')
    }
    editVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function activate(theme: ThemeItem): Promise<void> {
  await activateTheme(theme.id)
  ElMessage.success(`已启用「${theme.name}」，前台刷新后生效`)
  await load()
}

async function makeDefault(theme: ThemeItem): Promise<void> {
  await setThemeDefault(theme.id)
  ElMessage.success(`已将「${theme.name}」设为默认`)
  await load()
}

async function remove(theme: ThemeItem): Promise<void> {
  await deleteTheme(theme.id)
  ElMessage.success('已删除主题')
  await load()
}

onMounted(() => void load())
</script>

<style scoped>
.theme {
  margin-bottom: 12px;
}

.theme.is-active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
}

.theme__head,
.theme__heading {
  display: flex;
  align-items: center;
}

.theme__head {
  justify-content: space-between;
  gap: 8px;
}

.theme__heading {
  gap: 8px;
  min-width: 0;
}

.theme__name {
  font-weight: 600;
}

.theme__code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.theme__swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}

.theme__swatch {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.theme__chip {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.theme__label {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme__meta {
  margin: 10px 0 0;
  padding: 0;
  font-size: 12px;
  list-style: none;
}

.theme__meta li {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 3px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.theme__meta li:last-child {
  border-bottom: 0;
}

.theme__font {
  overflow: hidden;
  max-width: 60%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.cell-mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.tokens__section {
  padding-top: 6px;
  margin-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.tokens__section h4 {
  margin: 0 0 6px;
  font-size: 13px;
}

.tokens__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tokens__row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.tokens__key {
  width: 180px;
}

.tokens__hex {
  flex: 1;
}

.tokens__radius {
  width: 200px;
}

.tokens__radius-tip {
  display: block;
  margin-top: 4px;
}
</style>
