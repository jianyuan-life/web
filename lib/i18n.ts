// ============================================================
// 繁簡體切換系統（使用 opencc-js 完整轉換）
// ============================================================

import * as OpenCC from 'opencc-js'

const t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' })
const s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' })

export function toSimplified(text: string): string {
  return t2sConverter(text)
}

export function toTraditional(text: string): string {
  return s2tConverter(text)
}

export type Locale = 'zh-TW' | 'zh-CN'

// UI 文字翻譯
export const UI_TEXT: Record<Locale, Record<string, string>> = {
  'zh-TW': {
    brand: '鑒源',
    tagline: '融合千年古籍智慧與 AI 精準分析',
    nav_systems: '系統介紹',
    nav_pricing: '方案定價',
    nav_free: '免費速算',
    nav_login: '登入',
    nav_signup: '免費註冊',
    nav_my_reports: '我的報告',
    nav_logout: '登出',
    hero_title_1: '一份報告',
    hero_title_2: '全面洞察人生',
    hero_desc: '整合八字、紫微斗數、奇門遁甲、西洋占星等15套命理系統，為您提供最全面的命格分析與人生指引。',
    cta_free: '免費命理速算',
    cta_pricing: '查看方案定價',
    cta_no_card: '不需信用卡 · 即時出結果 · 完全免費',
    free_title: 'AI 命理速算',
    free_subtitle: '精確排盤 + AI 深度分析 + 個人化命格解讀',
    free_no_register: '不需註冊 · 即時出結果 · 完全免費',
    name_label: '姓名',
    name_required: '請輸入您的全名',
    year_label: '出生年',
    month_label: '月',
    day_label: '日',
    hour_label: '出生時辰',
    gender_label: '性別',
    gender_male: '男',
    gender_female: '女',
    btn_analyze: '開始 AI 命理分析',
    btn_analyzing: 'AI 分析中，請稍候（約10秒）...',
    pricing_title: '方案與定價',
    pricing_subtitle: '從入門到全面，滿足不同需求',
    login_title: '歡迎回來',
    signup_title: '建立帳號',
    footer_disclaimer: '本服務融合傳統命理學與人工智能技術，分析結果僅供參考，不構成任何醫療、投資或法律建議。',
  },
  'zh-CN': {
    brand: '鑒源',
    tagline: '融合千年古籍智慧与 AI 精准分析',
    nav_systems: '系统介绍',
    nav_pricing: '方案定价',
    nav_free: '免费速算',
    nav_login: '登录',
    nav_signup: '免费注册',
    nav_my_reports: '我的报告',
    nav_logout: '退出',
    hero_title_1: '一份报告',
    hero_title_2: '全面洞察人生',
    hero_desc: '整合八字、紫微斗数、奇门遁甲、西洋占星等15套命理系统，为您提供最全面的命格分析与人生指引。',
    cta_free: '免费命理速算',
    cta_pricing: '查看方案定价',
    cta_no_card: '不需信用卡 · 即时出结果 · 完全免费',
    free_title: 'AI 命理速算',
    free_subtitle: '精确排盘 + AI 深度分析 + 个人化命格解读',
    free_no_register: '不需注册 · 即时出结果 · 完全免费',
    name_label: '姓名',
    name_required: '请输入您的全名',
    year_label: '出生年',
    month_label: '月',
    day_label: '日',
    hour_label: '出生时辰',
    gender_label: '性别',
    gender_male: '男',
    gender_female: '女',
    btn_analyze: '开始 AI 命理分析',
    btn_analyzing: 'AI 分析中，请稍候（约10秒）...',
    pricing_title: '方案与定价',
    pricing_subtitle: '从入门到全面，满足不同需求',
    login_title: '欢迎回来',
    signup_title: '创建账号',
    footer_disclaimer: '本服务融合传统命理学与人工智能技术，分析结果仅供参考，不构成任何医疗、投资或法律建议。',
  },
}

// 取得當前語言
export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-TW'
  return (localStorage.getItem('locale') as Locale) || 'zh-TW'
}

export function setLocale(locale: Locale) {
  localStorage.setItem('locale', locale)
  // 發送自訂事件，不 reload 頁面
  window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }))
}

export function t(key: string): string {
  const locale = getLocale()
  return UI_TEXT[locale]?.[key] || UI_TEXT['zh-TW'][key] || key
}
