<template>
  <div class="login">
    <div class="login__panel">
      <section class="login__intro">
        <div class="login__mark">芝</div>
        <h1>森芝宝<span>内容管理后台</span></h1>
        <p>栏目、内容、页面装修与站点配置的统一维护入口。</p>
        <ul>
          <li>产品 / 新闻 / 视频 / 口碑 / 荣誉 / 大事记</li>
          <li>导航栏目与首页、关于页的区块化装修</li>
          <li>品牌、联系方式、备案、主题与语言配置</li>
        </ul>
      </section>

      <section class="login__form">
        <h2>登录</h2>
        <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
          <el-form-item prop="username">
            <el-input v-model.trim="form.username" placeholder="用户名" clearable autocomplete="username">
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              show-password
              autocomplete="current-password"
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-button type="primary" class="login__submit" :loading="loading" @click="submit">登 录</el-button>
        </el-form>
        <p class="form-tip">初始管理员账号由 server 的 seed 写入，密码取 <code>SEED_ADMIN_PASSWORD</code>。</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { resetMenuRoutes } from '@/router'

const user = useUserStore()
const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function submit(): Promise<void> {
  if (!formRef.value) return
  const ok = await formRef.value.validate().catch(() => false)
  if (!ok) return

  loading.value = true
  try {
    // 上一次会话残留的菜单路由与当前账号权限无关，先卸载再跳首页
    resetMenuRoutes()
    await user.login(form.username, form.password)
    ElMessage.success(`欢迎回来，${user.displayName}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch {
    // 失败原因已由 axios 拦截器统一提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: radial-gradient(circle at 20% 20%, #14522d 0%, #0b3d20 45%, #062313 100%);
}

.login__panel {
  display: grid;
  grid-template-columns: 360px 340px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 60px rgba(6, 35, 19, 0.35);
}

.login__intro {
  padding: 40px 32px;
  color: #f5f2e7;
  background: #0b3d20;
}

.login__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 18px;
  font-size: 20px;
  color: #0b3d20;
  background: #d8b25a;
}

.login__intro h1 {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1px;
}

.login__intro h1 span {
  display: block;
  margin-top: 4px;
  font-size: 14px;
  font-weight: 400;
  color: rgba(245, 242, 231, 0.72);
}

.login__intro p {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(245, 242, 231, 0.66);
}

.login__intro ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 2;
  color: rgba(245, 242, 231, 0.55);
}

.login__form {
  padding: 44px 36px;
}

.login__form h2 {
  margin: 0 0 24px;
  font-size: 18px;
  font-weight: 600;
}

.login__submit {
  width: 100%;
  margin-top: 4px;
  letter-spacing: 4px;
}

@media (max-width: 760px) {
  .login__panel {
    grid-template-columns: 1fr;
  }

  .login__intro {
    display: none;
  }
}
</style>
