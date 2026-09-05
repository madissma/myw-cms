<template>
  <div class="rich-editor">
    <div ref="barEl" class="rich-editor__toolbar"></div>
    <div ref="bodyEl" class="rich-editor__body" :style="{ height: `${height}px` }"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { createEditor, createToolbar } from '@wangeditor/editor'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { uploadMedia } from '@/api/modules/media'

/** @wangeditor/editor 没导出 Mode 类型，这里按 create.d.ts 的入参对齐一份 */
type EditorMode = 'default' | 'simple'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    height?: number
    placeholder?: string
    mode?: EditorMode
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    height: 320,
    placeholder: '在此输入正文，可直接粘贴或上传图片',
    mode: 'simple',
    disabled: false,
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const barEl = shallowRef<HTMLDivElement>()
const bodyEl = shallowRef<HTMLDivElement>()
const editor = shallowRef<IDomEditor>()

/** wangEditor 的空内容是一个空段落，落库前归零，避免列表里出现「有正文」的误判 */
const EMPTY_HTML = '<p><br></p>'

function normalize(html: string): string {
  return html === EMPTY_HTML ? '' : html
}

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  readOnly: props.disabled,
  onChange(instance: IDomEditor) {
    emit('update:modelValue', normalize(instance.getHtml()))
  },
  /**
   * 图片上传交给 customUpload 而不是配 server 地址：
   * 后端接口要求 Bearer，编辑器内置的 XHR 带不上我们刷新后的 token。
   */
  MENU_CONF: {
    uploadImage: {
      maxFileSize: 10 * 1024 * 1024,
      allowedFileTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      customUpload: async (file: File, insertFn: (url: string, alt: string, href: string) => void) => {
        const row = await uploadMedia(file)
        insertFn(row.url, row.alt ?? row.name, row.url)
      },
    },
  },
}

const toolbarConfig: Partial<IToolbarConfig> = {
  // 后台正文不需要视频与代码块，其余保持 wangEditor 默认
  excludeKeys: ['insertVideo', 'uploadVideo', 'codeBlock'],
}

onMounted(() => {
  if (!barEl.value || !bodyEl.value) return
  const instance = createEditor({
    selector: bodyEl.value,
    html: props.modelValue || EMPTY_HTML,
    config: editorConfig,
    mode: props.mode,
  })
  createToolbar({
    editor: instance,
    selector: barEl.value,
    config: toolbarConfig,
    mode: props.mode,
  })
  editor.value = instance
  if (props.disabled) instance.disable()
})

watch(
  () => props.modelValue,
  (next) => {
    const instance = editor.value
    if (!instance) return
    // 只有外部整体替换（切换记录 / 重置表单）才回写，否则打字时光标会被打断
    if (normalize(next ?? '') !== normalize(instance.getHtml())) instance.setHtml(next || EMPTY_HTML)
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    const instance = editor.value
    if (!instance) return
    if (disabled) instance.disable()
    else instance.enable()
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
  editor.value = undefined
})
</script>

<style scoped>
.rich-editor {
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--admin-radius);
}

.rich-editor__toolbar {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rich-editor__body {
  overflow-y: auto;
}

:deep(.w-e-text-container) {
  background: var(--el-bg-color);
}
</style>
