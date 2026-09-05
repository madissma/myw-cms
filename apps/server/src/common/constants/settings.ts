/**
 * Setting key 的单一真源：seed（规划 10.4 第 6 步）与前台 bootstrap 都取这里的常量，
 * 避免「后台字段名」与「前台读取名」两处手写产生分叉。
 * label / type / 默认值同表维护，seed 直接据此落库。
 */
export interface SettingDef {
  key: string;
  group: string;
  type: string;
  label: string;
  remark?: string;
  value: unknown;
}

export const SETTING_GROUPS = ['brand', 'site', 'contact', 'footer', 'seo', 'social', 'analytics', 'form', 'ui'] as const;

export const SETTINGS: SettingDef[] = [
  // ---------- 品牌 ----------
  { key: 'brand.name', group: 'brand', type: 'text', label: '品牌名称', value: '森芝宝' },
  { key: 'brand.nameEn', group: 'brand', type: 'text', label: '品牌英文名', value: 'SENZHIBAO' },
  { key: 'brand.logo', group: 'brand', type: 'text', label: 'Logo 文字', remark: '无图片时显示的色块文字', value: '芝' },
  { key: 'brand.logoImage', group: 'brand', type: 'image', label: 'Logo 图片', remark: '留空则用 Logo 文字色块', value: '' },
  { key: 'brand.favicon', group: 'brand', type: 'image', label: '站点图标', remark: '现 index.html 未声明，留空待运营上传', value: '' },
  { key: 'brand.companyName', group: 'brand', type: 'text', label: '公司全称', value: '浙江森芝宝生物科技有限公司' },
  { key: 'brand.headerEyebrow', group: 'brand', type: 'text', label: '页头眉标', remark: '内页页头顶部固定小字', value: '森芝宝 SENZHIBAO' },

  // ---------- 站点 ----------
  { key: 'site.slogan', group: 'site', type: 'text', label: '站点标语', value: '让生命远离亚健康' },
  { key: 'site.name', group: 'site', type: 'text', label: '站点名称', remark: '浏览器标签显示，取自 index.html <title>', value: '森芝宝 — 浙江森芝宝生物科技有限公司' },
  { key: 'site.desc', group: 'site', type: 'textarea', label: '站点简介', value: '集灵芝种植、科研创新、精深加工与全球销售于一体的国家高新技术企业。' },

  // ---------- 联系方式 ----------
  { key: 'contact.address', group: 'contact', type: 'text', label: '公司地址', value: '浙江省丽水市龙泉市灵芝产业园森芝宝路1号' },
  { key: 'contact.hotline', group: 'contact', type: 'text', label: '商务合作热线', value: '0578-7116 688' },
  { key: 'contact.consumerHotline', group: 'contact', type: 'text', label: '消费者服务热线', value: '400-826-1668' },
  { key: 'contact.email', group: 'contact', type: 'text', label: '电子邮箱', value: 'service@senzhibao.com' },
  { key: 'contact.hours', group: 'contact', type: 'text', label: '服务时间', value: '周一至周日 8:30 - 17:30' },

  // ---------- 页脚 ----------
  { key: 'footer.about', group: 'footer', type: 'textarea', label: '页脚品牌简介', value: '集灵芝种植、科研创新、精深加工与全球销售于一体的国家高新技术企业。让生命远离亚健康。' },
  { key: 'footer.social', group: 'footer', type: 'text', label: '页脚社交行', value: '微信公众号：关注「森芝宝」 · 微博 @森芝宝 · 抖音 森芝宝' },
  { key: 'footer.sloganVertical', group: 'footer', type: 'text', label: '页脚竖排标语', value: '芝者匠心 · 自然之礼' },
  { key: 'footer.tagline', group: 'footer', type: 'text', label: '页脚标语', value: '三十年深耕一味灵芝，让生命远离亚健康。' },
  { key: 'footer.copyright', group: 'footer', type: 'text', label: '版权行', remark: '{year} 会被替换为当前年份', value: '© 2004 - {year} 浙江森芝宝生物科技有限公司 版权所有' },
  { key: 'icp.number', group: 'footer', type: 'text', label: 'ICP 备案号', value: '浙ICP备00000000号-1' },
  { key: 'police.number', group: 'footer', type: 'text', label: '公安备案号', value: '浙公网安备33118100000000号' },
  { key: 'footer.nameEn', group: 'footer', type: 'text', label: '页脚英文名', value: 'SENZHIBAO BIO-TECH' },

  // ---------- SEO ----------
  { key: 'seo.title', group: 'seo', type: 'text', label: '默认 SEO 标题', value: '森芝宝 — 浙江森芝宝生物科技有限公司' },
  { key: 'seo.keywords', group: 'seo', type: 'text', label: '默认 SEO 关键词', remark: 'index.html 未声明，待运营录入', value: '' },
  { key: 'seo.description', group: 'seo', type: 'textarea', label: '默认 SEO 描述', value: '浙江森芝宝生物科技有限公司——集灵芝种植、科研创新、精深加工与全球销售于一体的国家高新技术企业' },

  // ---------- 社交 ----------
  { key: 'social.wechat', group: 'social', type: 'text', label: '微信公众号', value: '森芝宝' },
  { key: 'social.weibo', group: 'social', type: 'text', label: '微博', value: '@森芝宝' },
  { key: 'social.douyin', group: 'social', type: 'text', label: '抖音', value: '森芝宝' },

  // ---------- 统计 ----------
  { key: 'analytics.gaId', group: 'analytics', type: 'text', label: '统计代码 ID', remark: '留空则不注入统计脚本', value: '' },

  // ---------- 表单 ----------
  { key: 'form.successTip', group: 'form', type: 'textarea', label: '留言提交成功提示', value: '感谢您的信任，森芝宝团队将尽快与您联系。' },
];

/** 便捷常量，前台 bootstrap 的 site 节点按此取值 */
export const SETTING_KEYS = {
  brandName: 'brand.name',
  brandNameEn: 'brand.nameEn',
  brandLogo: 'brand.logo',
  brandLogoImage: 'brand.logoImage',
  brandFavicon: 'brand.favicon',
  brandCompanyName: 'brand.companyName',
  brandHeaderEyebrow: 'brand.headerEyebrow',
  siteSlogan: 'site.slogan',
  siteName: 'site.name',
  siteDesc: 'site.desc',
  contactAddress: 'contact.address',
  contactHotline: 'contact.hotline',
  contactConsumerHotline: 'contact.consumerHotline',
  contactEmail: 'contact.email',
  contactHours: 'contact.hours',
  footerAbout: 'footer.about',
  footerSocial: 'footer.social',
  footerSloganVertical: 'footer.sloganVertical',
  footerTagline: 'footer.tagline',
  footerCopyright: 'footer.copyright',
  icpNumber: 'icp.number',
  policeNumber: 'police.number',
  footerNameEn: 'footer.nameEn',
  seoTitle: 'seo.title',
  seoKeywords: 'seo.keywords',
  seoDescription: 'seo.description',
  socialWechat: 'social.wechat',
  socialWeibo: 'social.weibo',
  socialDouyin: 'social.douyin',
  analyticsGaId: 'analytics.gaId',
  formSuccessTip: 'form.successTip',
} as const;
