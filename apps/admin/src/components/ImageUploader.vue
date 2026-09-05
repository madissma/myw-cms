<template>
  <div class="img-uploader">
    <!-- 单图 -->
    <div v-if="!multiple" class="img-uploader__single">
      <div v-if="first" class="img-uploader__preview">
        <img :src="first" :alt="first" loading="lazy" />
        <div class="img-uploader__mask">
          <el-button link size="small" @click="pickFromLibrary">从素材库换</el-button>
          <el-button v-if="canUpload" link size="small" @click="openPicker">重新上传</el-button>
          <el-button link size="small" @click="clear">移除</el-button>
        </div>
      </div>
      <el-button v-else :icon="Picture" :disabled="disabled" @click="openSource">选择图片</el-button>
    </div>

    <!-- 多图 -->
    <div v-else class="img-uploader__multi">
      <div v-for="(url, index) in list" :key="`${url}-${index}`" class="img-uploader__cell">
        <img :src="url" :alt="url" loading="lazy" />
        <button type="button" class="img-uploader__remove" title="移除" @click="removeAt(index)">
          <el-icon><Close /></el-icon>
        </button>
      </div>
      <el-button class="img-uploader__add" :icon="Plus" :disabled="disabled" @click="openSource">添加</el-button>
    </div>

    <div class="img-uploader__foot">
      <el-input
        v-model="draft"
        :placeholder="placeholder"
        clearable
        :disabled="disabled"
        @keyup.enter="applyDraft"
        @blur="applyDraft"
      />
      <el-button :icon="FolderOpened" @click="pickFromLibrary">素材库</el-button>
      <el-button v-if="canUpload" :icon="UploadFilled" :loading="uploading" @click="openPicker">上传</el-button>
    </div>

    <p v-if="tip || hint" class="form-tip">{{ tip || hint }}</p>

    <!-- 不用 el-upload：直传要自己拼 header 且拿不到刷新后的 token，这里复用 axios 实例上传 -->
    <input
      ref="fileInput"
      type="file"
      class="img-uploader__input"
      :accept="accept"
      :multiple="multiple"
      @change="onFileChange"
    />

    <MediaPickerDialog v-model="pickerVisible" :multiple="multiple" @select="onPicked" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, FolderOpened, Picture, Plus, UploadFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { uploadMedia } from '@/api/modules/media'
import MediaPickerDialog from './MediaPickerDialog.vue'

/** 与 server 的上传白名单保持一致，写成超集只会在后端被拒 */
const DEFAULT_ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,.gif,.mp4'

const props = withDefaults(
  defineProps<{
    modelValue?: string | string[] | null
    multiple?: boolean
    disabled?: boolean
    accept?: string
    maxMB?: number
    placeholder?: string
    tip?: string
  }>(),
  {
    modelValue: () => '',
    multiple: false,
    disabled: false,
    accept: DEFAULT_ACCEPT,
    maxMB: 10,
    placeholder: '图片地址，可留空或直接粘贴 /images、/uploads 的已有地址',
    tip: '',
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string | string[]): void }>()

const fileInput = ref<HTMLInputElement>()
const draft = ref('')
const uploading = ref(false)
const pickerVisible = ref(false)
const user = useUserStore()

const canUpload = computed(() => user.has('media:upload'))
const hint = computed(() => `支持 ${props.accept.replaceAll('.', '')} ，单个不超过 ${props.maxMB}MB`)

/** 内外统一按数组处理，出口按 multiple 决定给字符串还是数组 */
const list = computed<string[]>(() => {
  const value = props.modelValue
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [String(value)] : []
})

const first = computed(() => list.value[0] ?? '')

function commit(next: string[]): void {
  const cleaned = next.filter(Boolean)
  emit('update:modelValue', props.multiple ? cleaned : (cleaned[0] ?? ''))
}

function clear(): void {
  commit([])
}

function removeAt(index: number): void {
  const next = [...list.value]
  next.splice(index, 1)
  commit(next)
}

function appendUrl(url: string): void {
  const value = url.trim()
  if (!value) return
  if (props.multiple) {
    if (list.value.includes(value)) return
    commit([...list.value, value])
    return
  }
  commit([value])
}

function onPicked(value: string | string[]): void {
  if (Array.isArray(value)) value.forEach(appendUrl)
  else appendUrl(value)
}

function pickFromLibrary(): void {
  pickerVisible.value = true
}

/** 没有上传权限时按钮直接落到素材库选择，避免出现点了没反应的死按钮 */
function openSource(): void {
  if (canUpload.value) openPicker()
  else pickFromLibrary()
}

function openPicker(): void {
  fileInput.value?.click()
}

/** 手工粘贴地址：回车或失焦即生效，方便直接填 seed 里已有的 /images 路径 */
function applyDraft(): void {
  const value = draft.value.trim()
  if (!value) return
  appendUrl(value)
  draft.value = ''
}

function accepted(file: File): boolean {
  const ext = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`
  return props.accept.split(',').map((item) => item.trim().toLowerCase()).includes(ext)
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  // 先清空，否则连续选同一个文件不会再触发 change
  input.value = ''
  if (!files.length) return

  const allowed = files.filter((file) => {
    if (!accepted(file)) {
      ElMessage.warning(`「${file.name}」格式不支持`)
      return false
    }
    if (file.size > props.maxMB * 1024 * 1024) {
      ElMessage.warning(`「${file.name}」超过 ${props.maxMB}MB 限制`)
      return false
    }
    return true
  })
  if (!allowed.length) return

  uploading.value = true
  try {
    // 逐个上传：后端一次只落一个文件，失败的那张不阻塞其余
    for (const file of allowed) {
      const row = await uploadMedia(file)
      appendUrl(row.url)
    }
    ElMessage.success(`已上传 ${allowed.length} 个文件`)
  } catch {
    // 拦截器已经弹过错误，这里不再重复提示
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.img-uploader {
  width: 100%;
}

.img-uploader__preview {
  position: relative;
  width: 160px;
  height: 108px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--admin-radius);
}

.img-uploader__preview img,
.img-uploader__cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--el-fill-color-lighter);
}

.img-uploader__mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  background: rgba(11, 61, 32, 0.78);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.img-uploader__preview:hover .img-uploader__mask {
  opacity: 1;
}

.img-uploader__mask :deep(.el-button),
.img-uploader__mask :deep(.el-button:hover) {
  color: #fff;
}

.img-uploader__multi {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.img-uploader__cell {
  position: relative;
  width: 104px;
  height: 78px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--admin-radius);
}

.img-uploader__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  color: #fff;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.45);
  border: 0;
  border-radius: 50%;
}

.img-uploader__foot {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.img-uploader__input {
  display: none;
}
</style>
