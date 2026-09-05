/**
 * C 类内容：直接写在 JSX 里、无法机器抽取的散文字案。
 *
 * 每条带 `src`（app 源码 file:line 或 file:line-line），`scripts/verify-seed.mts`
 * 会把库里的文本与这些行做归一化（去空白、去 JSX 标签、统一引号）后逐字比对，
 * 用于兜住人工誊写的漏项与错改。
 *
 * `derived: true` 表示该行含运行期变量（年份、计数、插值），只做局部包含比对。
 */

export interface CopyItem {
  /** app 源码位置，形如 apps/app/src/pages/About.tsx:139 或 apps/app/src/pages/About.tsx:167-169 */
  src: string
  text: string
  /** 含插值 / 计数 / 年份，比对时只校验固定片段 */
  derived?: boolean
}

export const COPY = {
  // ==================== apps/app/src/components/Navbar.tsx ====================
  'brand.logoChar': { src: 'apps/app/src/components/Navbar.tsx:79', text: '芝' },
  'brand.name': { src: 'apps/app/src/components/Navbar.tsx:82', text: '森芝宝' },
  'brand.nameEn': { src: 'apps/app/src/components/Navbar.tsx:83', text: 'SENZHIBAO' },
  'brand.headerEyebrow': { src: 'apps/app/src/components/PageHeader.tsx:25', text: '森芝宝 SENZHIBAO' },

  // ==================== apps/app/src/components/Footer.tsx ====================
  'footer.summary': {
    src: 'apps/app/src/components/Footer.tsx:31',
    text: '集灵芝种植、科研创新、精深加工与全球销售于一体的国家高新技术企业。让生命远离亚健康。',
  },
  'footer.socialLine': {
    src: 'apps/app/src/components/Footer.tsx:34',
    text: '微信公众号：关注「森芝宝」 · 微博 @森芝宝 · 抖音 森芝宝',
  },
  'footer.navTitle': { src: 'apps/app/src/components/Footer.tsx:41', text: '快速导航' },
  'footer.contactTitle': { src: 'apps/app/src/components/Footer.tsx:60', text: '联系我们' },
  'footer.slogan': { src: 'apps/app/src/components/Footer.tsx:89', text: '芝者匠心 · 自然之礼' },
  'footer.sloganDesc': { src: 'apps/app/src/components/Footer.tsx:91', text: '三十年深耕一味灵芝，让生命远离亚健康。' },
  'footer.copyright': {
    src: 'apps/app/src/components/Footer.tsx:96',
    text: '浙江森芝宝生物科技有限公司 版权所有',
    derived: true,
  },
  'footer.record': {
    src: 'apps/app/src/components/Footer.tsx:97',
    text: '浙ICP备00000000号-1 · 浙公网安备33118100000000号 · SENZHIBAO BIO-TECH',
    derived: true,
  },
  'footer.hotlineSuffix': { src: 'apps/app/src/components/Footer.tsx:70', text: '（商务合作）' },
  'footer.consumerSuffix': { src: 'apps/app/src/components/Footer.tsx:72', text: '（消费者服务）' },

  // ==================== apps/app/index.html ====================
  'seo.title': { src: 'apps/app/index.html:13', text: '森芝宝 — 浙江森芝宝生物科技有限公司' },
  'seo.description': {
    src: 'apps/app/index.html:6',
    text: '浙江森芝宝生物科技有限公司——集灵芝种植、科研创新、精深加工与全球销售于一体的国家高新技术企业',
  },

  // ==================== apps/app/src/pages/Home.tsx ====================
  'home.hero.btnBase': { src: 'apps/app/src/pages/Home.tsx:103', text: '走进绿色基地' },
  'home.hero.btnMall': { src: 'apps/app/src/pages/Home.tsx:110', text: '前往官方商城 →' },
  'home.about.eyebrow': { src: 'apps/app/src/pages/Home.tsx:164', text: 'ABOUT SENZHIBAO' },
  'home.about.title': { src: 'apps/app/src/pages/Home.tsx:167-169', text: '提高人类生活质量\n让生命远离亚健康' },
  'home.about.p1': {
    src: 'apps/app/src/pages/Home.tsx:176',
    text: '浙江森芝宝生物科技有限公司成立于2004年，集灵芝种植、科研创新、精深加工与全球销售于一体的国家高新技术企业，丽水市重点农业龙头企业、浙江省科技型中小企业、中国中药协会灵芝专业委员会常务委员单位。',
  },
  'home.about.p2': {
    src: 'apps/app/src/pages/Home.tsx:179',
    text: '公司坐落于浙江绿谷、瓯江之源——龙泉市，GACP认证原木赤芝基地600余亩，12000㎡研发加工基地，11条全自动生产线，具备保健食品全剂型生产能力。',
  },
  'home.about.founderTag': { src: 'apps/app/src/pages/Home.tsx:188', text: '创始人 · 曹隆枢' },
  'home.about.founderDesc': {
    src: 'apps/app/src/pages/Home.tsx:190-192',
    text: '杭州大学生物系，1992年投身灵芝研究，\n三十年深耕一味灵芝。',
  },
  'home.about.videoBtn': { src: 'apps/app/src/pages/Home.tsx:198', text: '观看企业宣传片《芝者匠心》05:32' },
  'home.products.eyebrow': { src: 'apps/app/src/pages/Home.tsx:226', text: 'GANODERMA PRODUCTS' },
  'home.products.title': { src: 'apps/app/src/pages/Home.tsx:229', text: '源自龙泉深山的灵芝臻品' },
  'home.products.desc': {
    src: 'apps/app/src/pages/Home.tsx:232',
    text: '从孢子粉到孢子油，从灵芝茶到切片，每一款产品都可溯源至600余亩GACP认证基地。',
  },
  'home.products.link': { src: 'apps/app/src/pages/Home.tsx:238', text: '查看全部产品 →' },
  'home.base.eyebrow': { src: 'apps/app/src/pages/Home.tsx:290', text: 'GREEN BASE' },
  'home.base.title': { src: 'apps/app/src/pages/Home.tsx:293-295', text: '600余亩云雾深处的\n原木赤芝家园' },
  'home.base.desc': {
    src: 'apps/app/src/pages/Home.tsx:298',
    text: '龙泉，地处瓯江之源，森林覆盖率84%以上，是灵芝生长的黄金地带。森芝宝的GACP认证基地便隐于这片云雾深处——段木栽培、山泉灌溉、自然生长365天以上，不使用化学农药与激素。',
  },
  'home.base.btn': { src: 'apps/app/src/pages/Home.tsx:319', text: '探访基地' },
  'home.base.point1Title': { src: 'apps/app/src/pages/Home.tsx:302', text: '原木段木栽培' },
  'home.base.point1Desc': {
    src: 'apps/app/src/pages/Home.tsx:302',
    text: '拒绝袋料速成，还原《神农本草经》上品灵芝本真品质',
  },
  'home.base.point2Title': { src: 'apps/app/src/pages/Home.tsx:303', text: 'GAP全程溯源' },
  'home.base.point2Desc': { src: 'apps/app/src/pages/Home.tsx:303', text: '从菌种到成品，每一环节都有据可查' },
  'home.base.point3Title': { src: 'apps/app/src/pages/Home.tsx:304', text: '人工除草物理除虫' },
  'home.base.point3Desc': { src: 'apps/app/src/pages/Home.tsx:304', text: '坚持有机标准，与山林共生' },
  'home.base.imgAlt': { src: 'apps/app/src/pages/Home.tsx:277', text: 'GACP认证基地航拍' },
  'home.base.imgAlt2': { src: 'apps/app/src/pages/Home.tsx:282', text: '原木段木栽培' },
  'home.news.eyebrow': { src: 'apps/app/src/pages/Home.tsx:333', text: 'NEWS' },
  'home.news.title': { src: 'apps/app/src/pages/Home.tsx:336', text: '森芝宝动态' },
  'home.news.desc': { src: 'apps/app/src/pages/Home.tsx:338', text: '记录每一次成长，见证每一程远行。' },
  'home.news.link': { src: 'apps/app/src/pages/Home.tsx:343', text: '更多资讯 →' },
  'home.mall.eyebrow': { src: 'apps/app/src/pages/Home.tsx:376', text: 'OFFICIAL MALL' },
  'home.mall.title': { src: 'apps/app/src/pages/Home.tsx:379', text: '官方商城 · 正品直达' },
  'home.mall.desc': {
    src: 'apps/app/src/pages/Home.tsx:382',
    text: '森芝宝全线产品已入驻主流电商平台，认准官方旗舰店，品质与售后更有保障。',
  },
  'home.mall.btn': { src: 'apps/app/src/pages/Home.tsx:407', text: '前往官方商城' },

  // ==================== apps/app/src/pages/About.tsx ====================
  'about.intro.eyebrow': { src: 'apps/app/src/pages/About.tsx:120', text: '企业简介' },
  'about.intro.title': { src: 'apps/app/src/pages/About.tsx:123-125', text: '三十年深耕\n一味灵芝' },
  'about.founderQuote.label': { src: 'apps/app/src/pages/About.tsx:128', text: '创始人语录' },
  'about.founderQuote.text': {
    src: 'apps/app/src/pages/About.tsx:130',
    text: '「做灵芝和做人一样，要耐得住寂寞。一朵好灵芝，需要三百多个日夜的等待。」',
  },
  'about.founderQuote.author': { src: 'apps/app/src/pages/About.tsx:132', text: '—— 曹隆枢' },
  'about.intro.p1': {
    src: 'apps/app/src/pages/About.tsx:139',
    text: '浙江森芝宝生物科技有限公司成立于2004年，是一家集灵芝种植、科研创新、精深加工与全球销售于一体的国家高新技术企业。作为丽水市重点农业龙头企业及浙江省科技型中小企业，公司不仅是浙江省中药材产业协会会员、中国中药协会灵芝专业委员会常务委员单位，更是国内外多家知名药企破壁灵芝孢子粉原料的长期战略供应商。',
  },
  'about.intro.p2': {
    src: 'apps/app/src/pages/About.tsx:142',
    text: '公司坐落于浙江绿谷、瓯江之源——龙泉市，自有GACP认证原木赤芝有机栽培基地600余亩，建有灵芝研发和精深加工基地，占地12000平方米。基地内设先进的研发中心与实验室，配置11条全自动生产线，涵盖超临界二氧化碳萃取、过热蒸汽瞬时灭菌、超低温破壁、数字化中药材自控提取纯化及全自动胶囊填充等核心工艺，具备保健食品片剂、粉剂、颗粒剂、硬胶囊剂、软胶囊剂、丸剂等全剂型生产能力。',
  },
  'about.intro.p3': {
    src: 'apps/app/src/pages/About.tsx:145',
    text: '创始人曹隆枢1992年杭州大学生物系毕业后任职龙泉市真菌研究所，三十年如一日深耕灵芝研究，秉持"提高人类生活质量，让生命远离亚健康"的企业愿景。',
  },
  'about.history.eyebrow': { src: 'apps/app/src/pages/About.tsx:171', text: '发展历程' },
  'about.history.title': { src: 'apps/app/src/pages/About.tsx:174', text: '每一步，都算数' },
  'about.culture.eyebrow': { src: 'apps/app/src/pages/About.tsx:202', text: '企业文化' },
  'about.culture.title': { src: 'apps/app/src/pages/About.tsx:205', text: '提高人类生活质量，让生命远离亚健康' },
  'about.honors.eyebrow': { src: 'apps/app/src/pages/About.tsx:229', text: '企业荣誉' },
  'about.honors.title': { src: 'apps/app/src/pages/About.tsx:232', text: '值得信赖的伙伴' },
  'about.base.eyebrow': { src: 'apps/app/src/pages/About.tsx:270', text: 'GREEN BASE' },
  'about.base.title': { src: 'apps/app/src/pages/About.tsx:273', text: '绿色基地' },
  'about.base.desc': {
    src: 'apps/app/src/pages/About.tsx:276',
    text: '浙江绿谷、瓯江之源——龙泉，是灵芝生长的黄金纬度带。',
  },
  'about.base.stat1': { src: 'apps/app/src/pages/About.tsx:280', text: '600+亩' },
  'about.base.stat1Label': { src: 'apps/app/src/pages/About.tsx:280', text: 'GACP基地' },
  'about.base.stat2': { src: 'apps/app/src/pages/About.tsx:281', text: '84%' },
  'about.base.stat2Label': { src: 'apps/app/src/pages/About.tsx:281', text: '森林覆盖率' },
  'about.base.stat3': { src: 'apps/app/src/pages/About.tsx:282', text: '365天+' },
  'about.base.stat3Label': { src: 'apps/app/src/pages/About.tsx:282', text: '自然生长' },
  'about.base.stat4': { src: 'apps/app/src/pages/About.tsx:283', text: '0' },
  'about.base.stat4Label': { src: 'apps/app/src/pages/About.tsx:283', text: '化学农药与激素' },
  'about.base.point1Title': { src: 'apps/app/src/pages/About.tsx:293', text: '原木段木栽培 · 道法自然' },
  'about.base.point1Desc': {
    src: 'apps/app/src/pages/About.tsx:293',
    text: '拒绝袋料速成，还原《神农本草经》上品灵芝本真品质。',
  },
  'about.base.point2Title': { src: 'apps/app/src/pages/About.tsx:294', text: '云雾山泉 · 生态屏障' },
  'about.base.point2Desc': {
    src: 'apps/app/src/pages/About.tsx:294',
    text: '海拔600米以上山林腹地，山泉水灌溉、人工除草、物理除虫，GACP规范全程溯源。',
  },
  'about.base.btn': { src: 'apps/app/src/pages/About.tsx:306', text: '商务合作洽谈' },
  'about.side.bizTitle': { src: 'apps/app/src/pages/About.tsx:100', text: '商务合作' },
  'about.side.bizDesc': { src: 'apps/app/src/pages/About.tsx:101', text: '原料供应 · OEM/ODM · 经销代理' },
  'about.side.bizBtn': { src: 'apps/app/src/pages/About.tsx:106', text: '联系我们' },
  'about.base.imgAlt': { src: 'apps/app/src/pages/About.tsx:256', text: 'GACP认证基地航拍' },
  'about.base.imgAlt2': { src: 'apps/app/src/pages/About.tsx:261', text: '原木段木栽培' },
  'about.base.imgAlt3': { src: 'apps/app/src/pages/About.tsx:264', text: '云雾山林' },

  // ==================== apps/app/src/pages/Tech.tsx ====================
  'tech.rd.eyebrow': { src: 'apps/app/src/pages/Tech.tsx:57', text: '研发中心' },
  'tech.rd.title': { src: 'apps/app/src/pages/Tech.tsx:60', text: '四大研发平台' },
  'tech.lines.eyebrow': { src: 'apps/app/src/pages/Tech.tsx:91', text: 'PRODUCTION' },
  'tech.lines.title': { src: 'apps/app/src/pages/Tech.tsx:94-96', text: '11条全自动生产线\n五大核心工艺' },
  'tech.lines.imgAlt': { src: 'apps/app/src/pages/Tech.tsx:84', text: '研发实验室' },
  'tech.dosage.eyebrow': { src: 'apps/app/src/pages/Tech.tsx:123', text: 'FULL DOSAGE FORMS' },
  'tech.dosage.title': { src: 'apps/app/src/pages/Tech.tsx:126', text: '全剂型生产能力' },
  'tech.dosage.desc': {
    src: 'apps/app/src/pages/Tech.tsx:129',
    text: '12000㎡精深加工基地，配置11条全自动生产线，具备保健食品片剂、粉剂、颗粒剂、硬胶囊剂、软胶囊剂、丸剂等全剂型生产能力，满足多元产品形态需求。',
  },
  'tech.dosage.imgAlt': { src: 'apps/app/src/pages/Tech.tsx:146', text: '全自动生产线' },
  'tech.coop.eyebrow': { src: 'apps/app/src/pages/Tech.tsx:159', text: '校企合作' },
  'tech.coop.title': { src: 'apps/app/src/pages/Tech.tsx:162', text: '产学研协同创新' },
  'tech.coop.note': { src: 'apps/app/src/pages/Tech.tsx:186', text: '合作模式：联合研发 · 成果转化 · 人才培养' },
  'tech.coop.imgAlt': { src: 'apps/app/src/pages/Tech.tsx:170', text: '校企合作' },
  'tech.team.eyebrow': { src: 'apps/app/src/pages/Tech.tsx:207', text: 'TEAM' },
  'tech.team.title': { src: 'apps/app/src/pages/Tech.tsx:210-212', text: '三十年深耕\n一支懂灵芝的团队' },
  'tech.team.p1': {
    src: 'apps/app/src/pages/Tech.tsx:215',
    text: '从创始人曹隆枢1992年进入龙泉市真菌研究所算起，森芝宝团队围绕灵芝研究已走过三十余年。研发、种植、生产、质检……每一个环节都有深耕多年的专业人员把关。',
  },
  'tech.team.p2': {
    src: 'apps/app/src/pages/Tech.tsx:218',
    text: '「做灵芝和做人一样，要耐得住寂寞。」这是森芝宝人的共同信条。',
  },
  'tech.team.imgAlt': { src: 'apps/app/src/pages/Tech.tsx:200', text: '森芝宝团队' },
  'tech.dosageForms': {
    src: 'apps/app/src/pages/Tech.tsx:132',
    text: '片剂、粉剂、颗粒剂、硬胶囊剂、软胶囊剂、丸剂',
    // 源码为字符串数组字面量，落库为 tag_cloud.items 与 Term(dosage_form)，按顿号拆片段比对
    derived: true,
  },

  // ==================== apps/app/src/pages/Media.tsx ====================
  'media.videos.eyebrow': { src: 'apps/app/src/pages/Media.tsx:31', text: 'VIDEOS' },
  'media.videos.title': { src: 'apps/app/src/pages/Media.tsx:34', text: '企业视频' },
  'media.news.eyebrow': { src: 'apps/app/src/pages/Media.tsx:73', text: 'NEWS' },
  'media.news.title': { src: 'apps/app/src/pages/Media.tsx:76', text: '企业动态' },
  // 注：Media.tsx:82 的「5 CATEGORIES · N ARTICLES」为前台运行时按 Term / 新闻条数派生，
  // 不属入库内容（规划 §2 缺陷项），故不在此登记。

  // ==================== apps/app/src/pages/Voice.tsx ====================
  'voice.reviews.eyebrow': { src: 'apps/app/src/pages/Voice.tsx:42', text: 'ALL REVIEWS' },
  'voice.reviews.title': { src: 'apps/app/src/pages/Voice.tsx:45', text: '真实顾客反馈' },
  'voice.foot.text': {
    src: 'apps/app/src/pages/Voice.tsx:78',
    text: '以上反馈均来自真实顾客，已获本人授权展示。您的心声，同样珍贵——',
  },
  'voice.foot.link': { src: 'apps/app/src/pages/Voice.tsx:79', text: '欢迎联系客服分享您的使用故事' },

  // ==================== apps/app/src/pages/Mall.tsx ====================
  'mall.platforms.enter': { src: 'apps/app/src/pages/Mall.tsx:42', text: '进入店铺' },
  'mall.hot.eyebrow': { src: 'apps/app/src/pages/Mall.tsx:73', text: 'HOT ITEMS' },
  'mall.hot.title': { src: 'apps/app/src/pages/Mall.tsx:76', text: '热销臻品' },
  'mall.hot.official': { src: 'apps/app/src/pages/Mall.tsx:98', text: '官方直营' },
  'mall.foot.title': { src: 'apps/app/src/pages/Mall.tsx:107', text: '更多产品与优惠，请认准官方旗舰店' },
  'mall.foot.desc': {
    src: 'apps/app/src/pages/Mall.tsx:110',
    text: '天猫旗舰店 · 京东旗舰店 · 淘宝企业店 · 官方微信小程序',
  },
  'mall.platformUrl': { src: 'apps/app/src/pages/Mall.tsx:31', text: 'https://www.tmall.com' },

  // ==================== apps/app/src/pages/Contact.tsx ====================
  'contact.channel.address': { src: 'apps/app/src/pages/Contact.tsx:30', text: '公司地址' },
  'contact.channel.hotline': { src: 'apps/app/src/pages/Contact.tsx:31', text: '商务合作' },
  'contact.channel.consumer': { src: 'apps/app/src/pages/Contact.tsx:32', text: '消费者服务' },
  'contact.channel.email': { src: 'apps/app/src/pages/Contact.tsx:33', text: '电子邮箱' },
  'contact.channel.hours': { src: 'apps/app/src/pages/Contact.tsx:34', text: '工作时间' },
  'contact.wechat.label': { src: 'apps/app/src/pages/Contact.tsx:45', text: '微信公众号' },
  'contact.wechat.title': { src: 'apps/app/src/pages/Contact.tsx:46', text: '关注「森芝宝」公众号' },
  'contact.wechat.desc': { src: 'apps/app/src/pages/Contact.tsx:48', text: '获取最新产品资讯、基地动态与优惠活动' },
  'contact.form.title': { src: 'apps/app/src/pages/Contact.tsx:58', text: '在线留言' },
  'contact.form.desc': { src: 'apps/app/src/pages/Contact.tsx:60', text: '请填写以下信息，我们将在1个工作日内回复您。' },
  'contact.form.nameLabel': { src: 'apps/app/src/pages/Contact.tsx:82', text: '您的姓名' },
  'contact.form.namePlaceholder': { src: 'apps/app/src/pages/Contact.tsx:86', text: '请输入姓名' },
  'contact.form.phoneLabel': { src: 'apps/app/src/pages/Contact.tsx:92', text: '联系电话' },
  'contact.form.phonePlaceholder': { src: 'apps/app/src/pages/Contact.tsx:97', text: '请输入手机号码' },
  'contact.form.emailLabel': { src: 'apps/app/src/pages/Contact.tsx:103', text: '电子邮箱' },
  'contact.form.emailPlaceholder': { src: 'apps/app/src/pages/Contact.tsx:106', text: '请输入邮箱地址' },
  'contact.form.contentLabel': { src: 'apps/app/src/pages/Contact.tsx:112', text: '留言内容' },
  'contact.form.contentPlaceholder': {
    src: 'apps/app/src/pages/Contact.tsx:117',
    text: '请描述您的需求，如：产品咨询 / 经销合作 / 原料采购 / OEM代工……',
  },
  'contact.form.submit': { src: 'apps/app/src/pages/Contact.tsx:126', text: '提交留言' },
  'contact.form.successTitle': { src: 'apps/app/src/pages/Contact.tsx:64', text: '留言已提交' },
  'contact.form.successTip': { src: 'apps/app/src/pages/Contact.tsx:66', text: '感谢您的信任，森芝宝团队将尽快与您联系。' },
  'contact.form.successHotline': { src: 'apps/app/src/pages/Contact.tsx:68', text: '如遇紧急事宜，请直接拨打服务热线' },
  'contact.form.again': { src: 'apps/app/src/pages/Contact.tsx:74', text: '再写一条' },
  'contact.map.eyebrow': { src: 'apps/app/src/pages/Contact.tsx:141', text: 'LOCATION' },
  'contact.map.title': { src: 'apps/app/src/pages/Contact.tsx:144', text: '区位示意图' },
  'contact.map.desc': {
    src: 'apps/app/src/pages/Contact.tsx:147',
    text: '公司位于浙江绿谷、瓯江之源——龙泉市灵芝产业园，毗邻G25长深高速，交通便利，欢迎实地考察。',
  },
  'contact.map.marker': { src: 'apps/app/src/pages/Contact.tsx:162', text: '森芝宝 · 龙泉市灵芝产业园' },
  'contact.map.label1': { src: 'apps/app/src/pages/Contact.tsx:165', text: '凤阳山' },
  'contact.map.label2': { src: 'apps/app/src/pages/Contact.tsx:166', text: '披云山' },
  'contact.map.label3': { src: 'apps/app/src/pages/Contact.tsx:167', text: '瓯江之源' },
  'contact.map.label4': { src: 'apps/app/src/pages/Contact.tsx:168', text: '龙泉市区' },
  'contact.map.label5': { src: 'apps/app/src/pages/Contact.tsx:169', text: 'G25 长深高速' },
  'contact.map.label6': { src: 'apps/app/src/pages/Contact.tsx:170', text: '环城南路' },

  // ==================== apps/app/src/pages/Products.tsx ====================
  'products.all': { src: 'apps/app/src/pages/Products.tsx:9', text: '全部' },
  'products.searchPlaceholder': { src: 'apps/app/src/pages/Products.tsx:76', text: '搜索产品名称 / 关键词' },
  'products.emptyTitle': { src: 'apps/app/src/pages/Products.tsx:86', text: '未找到相关产品' },
  'products.emptyDesc': { src: 'apps/app/src/pages/Products.tsx:87', text: '换个关键词试试吧' },
  'products.detail': { src: 'apps/app/src/pages/Products.tsx:113', text: '查看详情' },
  'products.b2bTitle': { src: 'apps/app/src/pages/Products.tsx:127', text: '寻找灵芝原料与代工合作伙伴？' },
  'products.b2bDesc': {
    src: 'apps/app/src/pages/Products.tsx:130',
    text: '我们是国内外多家知名药企的长期战略供应商，提供吨级原料供应与全剂型OEM/ODM服务。',
  },
  'products.b2bBtn': { src: 'apps/app/src/pages/Products.tsx:137', text: '洽谈合作' },

  // ==================== apps/app/src/pages/ProductDetail.tsx ====================
  'product.back': { src: 'apps/app/src/pages/ProductDetail.tsx:38', text: '产品中心' },
  'product.buyBtn': { src: 'apps/app/src/pages/ProductDetail.tsx:83', text: '前往官方商城购买' },
  'product.consult': { src: 'apps/app/src/pages/ProductDetail.tsx:90', text: '咨询客服' },
  'product.params': { src: 'apps/app/src/pages/ProductDetail.tsx:106', text: '产品参数' },
  'product.specLabel': { src: 'apps/app/src/pages/ProductDetail.tsx:117', text: '规格：' },
  'product.usage': { src: 'apps/app/src/pages/ProductDetail.tsx:125', text: '食用方法' },
  'product.features': { src: 'apps/app/src/pages/ProductDetail.tsx:133', text: '特点与适用' },
  'product.audiences': { src: 'apps/app/src/pages/ProductDetail.tsx:146', text: '适用人群' },
  'product.related': { src: 'apps/app/src/pages/ProductDetail.tsx:166', text: '相关推荐' },
  'product.notfound': { src: 'apps/app/src/pages/ProductDetail.tsx:14', text: '未找到该产品' },
  'product.notfoundDesc': { src: 'apps/app/src/pages/ProductDetail.tsx:15', text: '您访问的产品不存在或已下架' },
  'product.backList': { src: 'apps/app/src/pages/ProductDetail.tsx:21', text: '返回产品中心' },

  // ==================== apps/app/src/pages/NewsDetail.tsx ====================
  'news.back': { src: 'apps/app/src/pages/NewsDetail.tsx:37', text: '媒体中心' },
  'news.related': { src: 'apps/app/src/pages/NewsDetail.tsx:70', text: '相关资讯' },
  'news.notfound': { src: 'apps/app/src/pages/NewsDetail.tsx:13', text: '未找到该新闻' },
  'news.notfoundDesc': { src: 'apps/app/src/pages/NewsDetail.tsx:14', text: '您访问的资讯不存在或已下线' },
  'news.backList': { src: 'apps/app/src/pages/NewsDetail.tsx:20', text: '返回媒体中心' },
} satisfies Record<string, CopyItem>

export type CopyCode = keyof typeof COPY

/** 取某条文案的纯文本 */
export function copyText(code: CopyCode): string {
  return COPY[code].text
}
