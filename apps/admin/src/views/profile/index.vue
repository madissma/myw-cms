<template>
  <el-row :gutter="12">
    <el-col :md="24" :lg="12">
      <el-card shadow="never">
        <template #header><span>账号资料</span></template>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="用户名">{{ profile?.username || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ user.roleText || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所属组织">{{ profile?.orgName || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="权限点">
            <el-tag size="small" type="info" effect="plain">{{ permissionText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="上次登录">{{ formatDateTime(profile?.lastLoginAt) }}</el-descriptions-item>
        </el-descriptions>

        <el-form ref="infoRef" :model="info" :rules="infoRules" label-width="72px" class="profile__form">
          <el-form-item label="姓名" prop="name">
            <el-input v-model.trim="info.name" maxlength="64" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model.trim="info.email" maxlength="160" placeholder="可选" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model.trim="info.phone" maxlength="32" placeholder="可选" />
          </el-form-item>
          <el-form-item label="头像" prop="avatar">
            <el-input v-model.trim="info.avatar" maxlength="500" placeholder="/uploads/... 或 /images/..." />
            <div class="form-tip">素材库上传后可直接复制地址回填（M2 交付图片选择器）。</div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingInfo" @click="saveInfo">保存资料</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </el-col>

    <el-col :md="24" :lg="12">
      <el-card shadow="never">
        <template #header><span>修改密码</span></template>
        <el-form ref="pwdRef" :model="pwd" :rules="pwdRules" label-width="88px">
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="pwd.oldPassword" type="password" show-password autocomplete="current-password" />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="pwd.newPassword" type="password" show-password autocomplete="new-password" />
            <div class="form-tip">至少 8 位，且同时包含字母与数字。</div>
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirm">
            <el-input v-model="pwd.confirm" type="password" show-password autocomplete="new-password" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingPwd" @click="savePwd">修改密码</el-button>
            <span class="form-tip muted" style="margin-left: 8px">修改成功后需重新登录</span>
          </el-form-item>
        </el-form>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/format'
import { confirmRules, passwordRules } from '@/utils/validate'
import { resetMenuRoutes } from '@/router'

const user = useUserStore()
const router = useRouter()

const profile = computed(() => user.profile)
const permissionText = computed(() => {
  const perms = profile.value?.permissions ?? []
  if (perms.includes('*')) return '全部权限（超级管理员）'
  return `${perms.length} 项`
})

const infoRef = ref<FormInstance>()
const savingInfo = ref(false)
const info = reactive({
  name: profile.value?.name ?? '',
  email: profile.value?.email ?? '',
  phone: profile.value?.phone ?? '',
  avatar: profile.value?.avatar ?? '',
})

const infoRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

async function saveInfo(): Promise<void> {
  if (!infoRef.value) return
  const ok = await infoRef.value.validate().catch(() => false)
  if (!ok) return

  savingInfo.value = true
  try {
    await user.saveProfile({ name: info.name, email: info.email, phone: info.phone, avatar: info.avatar })
    ElMessage.success('资料已更新')
  } finally {
    savingInfo.value = false
  }
}

const pwdRef = ref<FormInstance>()
const savingPwd = ref(false)
const pwd = reactive({ oldPassword: '', newPassword: '', confirm: '' })

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: passwordRules('新密码'),
  confirm: confirmRules('新密码', () => pwd.newPassword),
}

async function savePwd(): Promise<void> {
  if (!pwdRef.value) return
  const ok = await pwdRef.value.validate().catch(() => false)
  if (!ok) return

  savingPwd.value = true
  try {
    await user.changePwd(pwd.oldPassword, pwd.newPassword)
    ElMessage.success('密码已修改，请重新登录')
    user.logout()
    resetMenuRoutes()
    void router.replace({ name: 'login' })
  } finally {
    savingPwd.value = false
  }
}
</script>

<style scoped>
.profile__form {
  margin-top: 18px;
}
</style>
