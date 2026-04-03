'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getLocale, toSimplified, toTraditional } from '@/lib/i18n'

export default function LocaleContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const originalTexts = useRef(new Map<Node, string>())

  // 儲存原始繁體文字，轉換時用
  const saveOriginal = useCallback((node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      if (!originalTexts.current.has(node)) {
        originalTexts.current.set(node, node.textContent)
      }
    } else {
      const tag = (node as Element).tagName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      node.childNodes.forEach(child => saveOriginal(child))
    }
  }, [])

  const convertAll = useCallback((locale: string) => {
    if (!ref.current) return

    // 先保存所有原始文字（只做一次）
    if (originalTexts.current.size === 0) {
      saveOriginal(ref.current)
    }

    function convertNode(node: Node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        // 用原始繁體文字做轉換基礎
        const original = originalTexts.current.get(node) || node.textContent
        if (locale === 'zh-CN') {
          node.textContent = toSimplified(original)
        } else {
          node.textContent = original // 恢復繁體
        }
      } else {
        const tag = (node as Element).tagName
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        node.childNodes.forEach(child => convertNode(child))
      }
    }

    convertNode(ref.current)
  }, [saveOriginal])

  useEffect(() => {
    // 初次載入時轉換
    const locale = getLocale()
    if (locale === 'zh-CN') {
      // 等 DOM 渲染完再轉換
      setTimeout(() => convertAll('zh-CN'), 100)
    }

    // 監聽語言切換事件（不 reload）
    const handler = (e: Event) => {
      const locale = (e as CustomEvent).detail
      convertAll(locale)
    }
    window.addEventListener('locale-change', handler)

    // 監聽動態內容（AI 生成等）
    const observer = new MutationObserver(() => {
      const locale = getLocale()
      if (locale === 'zh-CN') {
        // 新加入的節點也要存原始文字並轉換
        setTimeout(() => {
          saveOriginal(ref.current!)
          convertAll('zh-CN')
        }, 50)
      }
    })
    if (ref.current) {
      observer.observe(ref.current, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('locale-change', handler)
      observer.disconnect()
    }
  }, [convertAll, saveOriginal])

  return <div ref={ref}>{children}</div>
}
