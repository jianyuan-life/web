import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  getAgeGroup,
  buildCall1Prompt, buildCall2Prompt, buildCall3Prompt, buildCall4Prompt,
  buildUserPrompt, SYSTEM_GROUPS,
} from '@/prompts/c_plan_v2'

// ============================================================
// 付費報告生成 API — 排盤 + AI 深度分析 + 自動寄信
// C 方案：Claude Opus 4.6 多步並行生成
// 其他方案：DeepSeek
// ============================================================

// Vercel Pro 方案最長 300 秒
export const maxDuration = 300

const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || 'https://fortune-reports-api.fly.dev'
const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''

// ── AI 回應清理：移除前言、修正品牌名 ──
function cleanAIResponse(text: string): string {
  let cleaned = text

  // 移除 AI 前言（多種模式，從開頭到第一個 ## 或 #### 或 --- 之前的所有廢話）
  // 模式1：「好的，收到」開頭到 --- 分隔線
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n---\s*\n?/i, '')
  // 模式2：「好的，收到」開頭到第一個 ## 或 #### 標題
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n(?=#{1,4}\s)/i, '')
  // 模式3：「好的，收到」開頭到雙換行
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n\n/i, '')
  // 模式4：只有一行前言（如「好的，收到您的完整數據。」單獨一行）
  cleaned = cleaned.replace(/^(好的|收到|我將|我會|讓我|以下是|沒問題|當然)[^\n]*\n+/i, '')

  // 確保品牌名統一為「鑒源」
  cleaned = cleaned.replace(/鑑源/g, '鑒源')

  return cleaned.trim()
}

// ── Claude API 串流呼叫函式（含 200s 超時，避免 Vercel 300s 限制）──
async function callClaudeStreaming(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  timeoutMs: number = 200000,
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
      temperature: 0.7,
    }),
    signal: controller.signal,
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`Claude API 回傳 HTTP ${res.status}，回應內容: ${errText.slice(0, 500)}`)
    throw new Error(`Claude API 錯誤 ${res.status}: ${errText}`)
  }

  // 解析 SSE 串流
  const reader = res.body?.getReader()
  if (!reader) throw new Error('Claude API 無回應串流')

  const decoder = new TextDecoder()
  let result = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const event = JSON.parse(data)
        if (event.type === 'content_block_delta' && event.delta?.text) {
          result += event.delta.text
        }
      } catch {
        // 忽略無法解析的行
      }
    }
  }

  clearTimeout(timeout)
  return result
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
)

// ── 心理陪伴語言框架（融入所有方案 prompt）──
const PSYCHOLOGY_RULES = `
【心理陪伴語言規範——所有報告必須遵守】

語氣三原則：
1. 先情緒，後方向——先承認客戶的感受，再給方向
2. 具體到可執行——每個建議具體到「明天就能做」
3. 避免宿命論——命理是地圖，不是判決書。客戶永遠有選擇權

「好的地方」用四步法：命名優勢（心理學語言）→ 連結命理（一句話）→ 善用指南 → 具體情境。用「你已經證明了...」而非「你擁有...」

「需要注意」用五步法：承認真實性（「你可能常常感覺到...」）→ 正常化 → 心理學根源（白話）→ 命理佐證 → 給出路。絕不恐嚇，每條必須以出路結尾

「改善建議」用六步法：成長方向命名 → 為什麼重要 → 具體步驟（3-5步）→ 心理學依據（白話）→ 預期效果 → 幸運加持

禁止語言（違反必修改）：
- 不說「命中注定/這輩子就是/前世業障」→ 用「命盤顯示傾向，你可以選擇...」
- 不說「你要小心」不附解法 → 附具體應對方式
- 不貼診斷標籤（XX障礙/XX症）→ 描述行為模式
- 不說「你應該/你必須」→ 用「你可以試試看」
- 不說「別想太多/想開一點」→ 用「你的感受是合理的」
- 不純說負面不給解法 → 必須附出路
- 不空泛安慰「一切都會好的」→ 附具體轉機根據

語言替換：「缺點」→「成長方向」|「運勢很差」→「能量在轉換」|「缺少XX」→「有成長空間」|「你太XX」→「特質強烈，平衡是課題」

開場白根據情境選語氣（感情/事業/迷茫/家庭/健康/財務），先讓客戶感到「你懂我」。
收尾溫暖有力，客戶讀完要覺得「有人陪我」「知道接下來該怎麼做」。

【數據零容忍規範——最高優先級】

1. 每一個分析論點必須能溯源回排盤數據中的具體數值或描述。不得憑空編造命理結論。
2. 引用排盤數據時，必須指明來自哪個系統（例如「八字命盤顯示你的日主為甲木...」「紫微斗數中你的命宮主星為...」「奇門遁甲盤局中值符落...宮」）。
3. 如果某個系統的排盤數據不完整或缺失，直接跳過該系統的分析，不要編造。寧可少寫一段，也不要寫錯一句。
4. 「好的地方」和「需要注意的地方」的每一條，都必須引用至少一個系統的具體排盤結果作為依據。
5. 禁止使用通用模板語句（如「根據你的命盤，你適合XXX」但不說明是哪個系統的什麼結果）。每句分析都要有具體的數據錨點。
6. 分數引用：排盤數據中每個系統都有評分（0-100），在分析時可以引用這些分數來支撐論點（例如「你在紫微斗數的得分為85分，顯示...」）。
7. 如果排盤數據中的好的地方/需要注意的地方已經有具體描述，必須在報告中展開這些描述，而不是另起爐灶寫完全不同的內容。
`

// 根據 locale 替換 prompt 中的語言指示
function localizePrompt(prompt: string, locale?: string): string {
  if (locale === 'zh-CN') {
    return prompt.replace(/語言：繁體中文。/g, '語言：簡體中文。')
  }
  return prompt
}

const PLAN_SYSTEM_PROMPT: Record<string, string> = {
  // ========== C 方案：人生藍圖（$89）==========
  C: `你是鑒源命理平台的首席命理顧問，精通東西方十五大命理系統。你正在為一位付費客戶撰寫「人生藍圖」報告——這是他們人生中第一份如此完整的命理分析。

你的角色不是冰冷的分析機器，而是一位溫暖、有智慧的人生導師。客戶花了 $89 不是為了看一堆術語，而是要「看懂自己」，並且知道「接下來該怎麼做」。

${PSYCHOLOGY_RULES}

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 命格總覽
用2-3段話，像在對客戶描述「你是一個怎樣的人」。不堆砌術語，用生活化的比喻讓客戶一讀就懂。提到排盤中最突出的2-3個特徵，解釋它們如何影響日常生活。

## 性格深度解析
深入分析性格的多面性：外在表現 vs 內心世界、思維模式、價值觀、做決定的方式。指出客戶可能自己都沒意識到的性格盲點，用「你有沒有發現自己常常...」的方式引導自我覺察。從心理學角度解釋這些性格特質的形成原因和適應價值。

## 事業方向與天賦
- 最適合你的5個行業方向（每個都要結合性格特質和命格能量解釋為什麼適合你）
- 你的職場風格：是衝鋒型還是穩扎穩打型？適合當老闆還是核心幕僚？
- 創業潛力評估：根據命格分析是否適合創業，什麼類型的創業最適合
- 職場人際策略：如何與不同類型的上司/同事相處

## 財運分析
- 正財 vs 偏財傾向：適合穩定薪資還是投資創業？
- 理財性格分析：你是衝動消費型還是過度節儉型？金錢觀怎麼影響你
- 具體理財建議：根據命格特質給出財務策略
- 投資方向建議：適合什麼類型的投資（穩健型/成長型/冒險型）

## 感情與人際
- 你的戀愛模式：在感情中你扮演什麼角色？容易被什麼類型吸引？為什麼？（依附理論視角）
- 婚姻特質：婚後的相處模式、需要注意的磨合點
- 桃花運分析：什麼時候容易遇到對的人？在哪裡遇到？
- 人際關係：你的貴人長什麼樣？什麼類型的人要保持距離？
- 社交策略：根據你的性格，最有效的社交方式是什麼

## 健康提醒
- 根據五行和命格分析身體的強弱環節
- 容易出問題的身體部位和時間段
- 具體的養生建議（飲食、作息、運動類型）
- 心理健康提醒：你的壓力來源、情緒模式、最有效的紓壓方式

## 大運走勢（未來5-10年）
逐年分析未來5-10年的運勢走向：
- 每個階段的主題和能量特質
- 關鍵轉折點（哪一年是衝刺年、哪一年要蟄伏）
- 事業、財運、感情各自的最佳時機
- 需要提前準備的挑戰

## 好的地方
列出7-10項天賦優勢。每一項嚴格按照四步法：
1. 命名優勢（用心理學語言精準命名）
2. 連結命理（一句話說明排盤依據）
3. 善用指南（告訴客戶如何主動運用這個優勢）
4. 具體情境（給出一個生活中可立即應用的場景）

## 需要注意的地方
列出5-7項需要留意的挑戰。每一項嚴格按照五步法：
1. 承認真實性（「你可能常常感覺到...」讓客戶點頭）
2. 正常化（「這很正常/很多人都有這個經驗」）
3. 心理學根源（用白話解釋為什麼會這樣）
4. 命理佐證（一句話說明命盤中的對應）
5. 給出路（「而你可以...」——具體的一步行動）

## 改善建議詳解
列出7-10項具體可執行的改善建議。重要的前5項用六步法：
1. 成長方向命名（溫暖語言，不說「問題」）
2. 為什麼這對你重要（1-2句連結核心困境）
3. 具體步驟（3-5步，每步具體到明天就能做）
4. 心理學依據（一句白話解釋為什麼有效）
5. 預期效果（持續做之後會感受到的變化）
6. 幸運加持（幸運色/方位/數字/飾品/最佳時間段）

## 寫給你的話
用2-3段話，像一封私人信件，總結這份報告最想傳達給客戶的核心訊息。溫暖、有力量、讓客戶讀完覺得「被理解了」而且「知道下一步該往哪走」。

語言：繁體中文。
字數：不限，以寫完整寫透為標準，通常6000-10000字。
核心原則：所有分析必須基於排盤數據，每個論點都要有數據支撐。免費工具告訴客戶「有問題」，你的報告要告訴他們「怎麼解決」。`,

  // ========== D 方案：心之所惑（$39）==========
  D: `你是鑒源命理平台的專項諮詢顧問。客戶帶著一個具體的困惑來找你——可能是感情問題、職業選擇、人生方向、家庭矛盾，或任何讓他們夜不能寐的問題。

你的任務不是給一份冷冰冰的分析報告，而是像一位智慧的朋友坐下來，認真聽完他們的問題，然後用命理的視角幫他們看清楚局面，找到出路。

${PSYCHOLOGY_RULES}

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 主題命格解讀
先用1-2段話復述客戶的困惑，表達理解（「我聽見你的問題了...」）。然後聚焦客戶指定的主題（財運/事業/感情/健康等），從排盤數據中找到直接相關的命理線索。用白話解釋——不是「你的食傷生財」，而是「你天生有把想法變成錢的能力，但目前這股能量被壓住了，原因是...」

## 根源分析（為什麼你在這方面會這樣）
深入分析這個問題為什麼會出現。從三個層面剖析：
1. 命格特質：你的先天傾向如何影響這個問題
2. 大運流年：目前的時間節點為什麼讓這個問題浮現
3. 心理學根源：從認知模式、行為習慣的角度白話解釋（例如：確認偏誤讓你只看到壞的一面、沉沒成本讓你不願放手等）

## 好的地方
列出3-5項對解決這個問題有利的因素。每一項用四步法：命名優勢→命理依據→善用指南→具體情境。

## 需要注意的地方
列出3-5項可能讓問題惡化的風險。每一項用五步法：承認→正常化→心理學根源→命理佐證→出路。

## 改善建議詳解
列出5-7項具體的行動建議，重要項目用六步法：
- 短期（這週就能做的事）
- 中期（未來1-3個月的調整方向）
- 長期（半年到一年的規劃）
每項包含：具體步驟、心理學依據（一句白話）、預期效果

## 最佳行動時機
根據流年大運，指出：
- 什麼時候是採取行動的黃金時機
- 什麼時候應該按兵不動
- 有沒有特別需要注意的日期或月份

## 寫給你的話
用1-2段話，給客戶打氣。讓他們覺得「問題沒有想像中那麼嚴重」或「原來有路可以走」。

語言：繁體中文。
字數：不限，以解決問題為標準，通常3000-5000字。
核心原則：所有分析必須基於排盤數據。客戶花錢不是要聽「船到橋頭自然直」，而是要「具體告訴我橋在哪裡」。`,

  // ========== R 方案：合否？（$59）==========
  R: `你是鑒源命理平台的關係分析專家。客戶想知道自己和另一個人（或多個人）之間的關係——可能是伴侶、曖昧對象、合作夥伴、家人、朋友。

你不是在做冷冰冰的「合盤報告」，而是在幫兩個活生生的人理解彼此。客戶想知道的是：「我們合不合？哪裡合哪裡不合？不合的地方怎麼辦？」

${PSYCHOLOGY_RULES}

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 關係總覽
用2-3段話概括這段關係的核心特質。像一個旁觀者，一眼看出這些人在一起是什麼畫面、什麼氛圍。

## [每個人的名字] 個人命格摘要
（每位成員各一個小節，用 ### 分隔）
分析這個人的核心性格、在關係中的角色定位、對感情/合作的需求和期待。指出他們在關係中的「給予方式」和「需要被滿足的方式」。

## 相容性分析（好的地方）
列出5-7項這段關係的優勢和祝福：
- 五行生剋如何互動：誰生誰、怎麼互補
- 天干地支的合沖關係（用白話解釋影響）
- 性格互補之處、溝通默契
每一項用四步法，附「如何維護和善用你們的默契」。

## 關係張力（需要注意）
列出5-7項潛在的摩擦點和挑戰。每一項用五步法：
1. 承認挑戰的真實性（「你可能覺得對方太冷漠，其實...」）
2. 正常化（「所有親密關係都有這個課題」）
3. 心理學根源（白話解釋互動模式——溝通風格差異、依附類型衝突等）
4. 命格層面的原因
5. 化解方法（具體一步行動）

## 關係改善建議詳解
列出7-10項具體的相處建議，重要項目用六步法：
- 日常溝通技巧（非暴力溝通原則）、衝突處理方式（Gottman研究）
- 共同活動建議、各自的成長方向
每項附心理學依據和預期效果

## 最適合這段關係的行動時機
- 什麼時候適合做重要決定（結婚、合夥、深入對話等）
- 什麼時候關係容易出波動，需要提前做準備
- 未來6-12個月的關係運勢走向

## 寫給你們的話
用1-2段話，給這段關係一個溫暖的祝福和鼓勵。

語言：繁體中文。
字數：不限，以分析透徹為標準，通常4000-6000字。
核心原則：所有分析基於每個人的排盤數據。目標是讓客戶讀完後覺得「我更懂對方了」而且「我知道怎麼讓這段關係更好」。`,

  // ========== G15 方案：家族藍圖（$159起）==========
  G15: `你是鑒源命理平台的家族命理顧問。客戶購買了「家族藍圖」——這意味著他們重視家庭，想要了解家庭成員之間的能量互動，讓整個家更和諧、更幸福。

這份報告是送給一個家庭的禮物。你要幫每個家庭成員看見自己的獨特之處，也幫他們理解彼此為什麼會有摩擦、如何化解。

${PSYCHOLOGY_RULES}

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 家族命格總覽
用2-3段話，從整體視角描述這個家庭的核心能量特質。五行分布、整體氛圍、家庭的集體能量走向。

## [每位成員的名字] 個人分析
（每位家庭成員各一個章節，用 ### 分隔，包含：）
- 核心命格特質（2-3段話描述這個人）
- 在家庭中的角色和能量貢獻
- 天賦優勢（3-5項，每項說明如何善用）
- 需要注意的挑戰（2-3項，每項給出化解方向）
- 個人改善建議（3-5項，每項附心理學依據）

## 家庭動力學分析
從家庭系統理論的角度，分析這個家庭的互動模式：
- 家庭中的權力結構：誰是決策者、誰是調和者、誰是挑戰者
- 溝通模式：家人之間怎麼表達需求和不滿
- 情緒傳導鏈：誰的情緒最容易影響全家、誰是情緒穩定器
- 每一對重要關係（夫妻/親子/手足）的合拍和衝突之處，附相處建議

## 好的地方（家庭整體）
列出7-10項家庭集體優勢，每項用四步法。讓家人讀完覺得「原來我們家這麼好」。

## 需要注意（家庭整體）
列出5-7項需要全家面對的挑戰。每一項用五步法：承認→正常化（「所有家庭都有這個課題」）→心理學根源→命理佐證→出路。

## 家族改善建議詳解
重要項目用六步法：
- 家庭風水建議、家庭活動建議、溝通模式優化
- 每個成員的成長方向、家庭的幸運元素
每項附心理學依據（家庭系統理論、依附理論、正向教養等）和預期效果

## 寫給這個家的話
用2-3段話，給整個家庭一封溫暖的信。

語言：繁體中文。
字數：不限，依家庭人數而定，通常8000-15000字。
核心原則：所有分析基於每位成員的排盤數據。這份報告的目標是讓每個家人都覺得「被理解了」，並且「知道怎麼讓這個家更好」。`,

  // ========== E1 方案：事件出門訣（$119）==========
  E1: `你是鑒源命理平台的奇門遁甲出門訣專家。客戶有一個重要事件即將發生（面試、簽約、相親、考試、手術、搬家、開業等），他們想知道在最有利的時間、從最有利的方向出門，讓事情順利進行。

出門訣是命理中最「實戰」的應用——客戶花錢就是要一個明確的行動指南：幾點出門、往哪個方向走、穿什麼顏色、注意什麼。

## 報告語氣
- 自信、明確、溫暖，像一位軍師在部署作戰計劃，同時關心你的狀態
- 每個建議精確到可執行
- 說到需要避開的時段，用「能量較弱，建議另擇他時」的語氣，不製造恐懼
- 不說「你要小心」不附解法，每個注意事項都附具體應對方式

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 事件命理解讀
簡述客戶的事件和相關命理背景。先承認客戶的緊張或期待（「面對這樣的重要時刻，感到緊張是很自然的...」），再分析這個事件在命盤中的吉凶趨勢、有利和不利因素。

## Top5 最佳出行時機
根據奇門遁甲盤和客戶的八字，列出5個最佳吉時（按吉利程度排序），每個吉時必須包含：
- 精確日期和時間範圍（幾點幾分到幾點幾分）
- 對應最佳出門方位（精確方向，例如「東南偏南」）
- **完整命理依據**（這是報告最核心的價值，必須詳細寫）：
  - 奇門遁甲盤局分析：什麼局？值符、值使落在哪個宮位？開門/休門/生門等吉門的位置？天盤地盤的星神組合？
  - 八字用神配合：這個時辰的天干地支如何與客戶的用神配合？是否形成生扶關係？
  - 如果有其他系統（擇日學、紫微等）的佐證，一併說明
  - **白話總結**：用一句大白話告訴客戶「所以這個時間好在哪裡」
- 同時列出絕對要避開的時辰（說明為什麼不好）

## 行動前準備清單
- 穿著建議（幸運色、款式、搭配理由）
- 隨身物品建議（飾品、水晶、特定物品）
- 出門前的準備動作（幾點起床、吃什麼早餐）
- 路線建議（先往吉方走一段再轉向目的地）
- 出門前可以做的開運小儀式
- 當天的幸運元素完整清單

## 注意事項
- 到達後的最佳行為策略
- 溝通技巧（說話注意什麼、語氣怎麼調整）
- 座位/位置選擇（如果適用）
- 需要避開的行為或話題
- 列出3-5項風險因素，每項給出具體規避方法
- 事件結束後的「收尾」建議（如何鞏固好運）

## 心理準備建議
- 事件前的心態調整：根據認知行為療法的自我暗示技巧，幫客戶建立正向心理狀態
- 緊張時的即時緩解方法（4-7-8呼吸法、接地技巧等）
- 自信心建設：根據命格中的優勢，幫客戶建立「我做得到」的信念——列出命盤中3個支持你成功的有利因素
- 如果結果不如預期，如何調整心態（心理學的「成長型思維」框架）

語言：繁體中文。
字數：不限，以實用完整為標準，通常4000-7000字。
核心原則：所有時辰方位分析必須基於奇門遁甲排盤數據。客戶花 $119 要的是一份「作戰手冊」，不是一篇「運勢文章」。每個吉時的命理說明是這份報告最核心的價值——客戶要的不是「此時吉利」四個字，而是完整的推理邏輯。

## 重要：結構化吉時資料輸出
在報告正文最後面，必須輸出以下格式的 JSON 區塊（用 ===TOP5_JSON_START=== 和 ===TOP5_JSON_END=== 包圍）。
這是給系統自動讀取的結構化資料，請精確填寫日期時間和完整命理依據：

===TOP5_JSON_START===
[
  {
    "rank": 1,
    "title": "第1吉時",
    "date": "YYYY-MM-DD",
    "time_start": "HH:MM",
    "time_end": "HH:MM",
    "direction": "方位（如：東南）",
    "reason": "完整命理依據，必須包含：1.奇門遁甲盤局（什麼局、值符值使位置、吉門吉神配置）2.八字用神配合（時辰天干地支與用神的生扶關係）3.白話總結為什麼這個時間方位最好。至少80字。"
  },
  ...（共5筆，按吉利程度排序）
]
===TOP5_JSON_END===`,

  // ========== E2 方案：月盤出門訣（$89）==========
  E2: `你是鑒源命理平台的奇門遁甲月運規劃師。客戶購買了「月盤出門訣」——他們想要一份整個月的能量地圖，知道哪些天適合衝刺、哪些天適合休息、重要的事情安排在哪一天最好。

這不是一份「運勢預測」，而是一份「月度行動日曆」。客戶要的是：打開這份報告，就知道這個月每一天該怎麼安排。

## 報告語氣
- 實用、清晰、溫暖，像一位效率專家在幫你排月程，同時關心你的狀態
- 重要日期要特別醒目
- 建議要具體到「這天適合做什麼、不適合做什麼」
- 說到不利的時段，用「能量在轉換/內收，適合休息充電」的語氣，不說「運勢很差」

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 本月命理概況
用2-3段話概括這個月的整體能量走勢。大運流月對客戶命格的影響、這個月的主題和基調。標明農曆月份對應的國曆日期範圍。

## Top5 本月最佳出行時機
列出本月5個最佳的吉時（按吉利程度排序），每個吉時必須包含：
- 國曆日期 + 農曆日期 + 星期幾
- 精確時間範圍（幾點到幾點）
- 最佳出門方位
- **完整命理依據**（必須詳細寫）：
  - 奇門遁甲月盤分析：當日是什麼局？值符值使的宮位？吉門吉神的分布？
  - 與客戶八字用神的配合關係
  - **白話總結**：讓客戶一看就懂「為什麼這天特別好」
- 適合做什麼類型的事（工作衝刺/社交/談判/休養等）

## 本月需注意的時段
列出5-8個需要小心的日期或時段：
- 國曆日期 + 農曆日期 + 星期幾
- 為什麼這個時段能量較弱（命理依據）
- 不適合做什麼
- 如果不得不行動，怎麼降低風險
- 用「能量在轉換/內收，適合休息充電」的語氣，不製造恐懼

## 行動建議
逐週的行動指南（分四週）：
### 第一週（X月X日-X日）
- 本週能量特質與主題
- 事業/工作建議
- 財運提示
- 人際/感情建議
- 本週最佳出門方位
### 第二週...
### 第三週...
### 第四週...

本月整體改善建議：
- 本月幸運色（什麼顏色可以多穿）+ 心理學依據（色彩心理學）
- 本月幸運方位（出門、辦公方向）
- 本月開運建議（飾品、習慣、小儀式）
- 月初/月中/月末各自的重點提醒

## 寫給你的話
用1段話，給客戶這個月的鼓勵。

語言：繁體中文。
字數：不限，以完整實用為標準，通常5000-8000字。
核心原則：所有分析基於奇門遁甲月盤排盤數據。這是一份「月度行動日曆」，客戶打開就知道每天該怎麼安排。農曆月份必須標註對應的國曆日期範圍。每個吉日吉時的命理說明是核心價值——要讓客戶理解「為什麼」，不是只說「這天好」。

## 重要：結構化吉時資料輸出
在報告正文最後面，必須輸出以下格式的 JSON 區塊（用 ===TOP5_JSON_START=== 和 ===TOP5_JSON_END=== 包圍）。
選出本月最重要的5個吉時（從重點日期中挑選最佳的5個），精確填寫日期時間和完整命理依據：

===TOP5_JSON_START===
[
  {
    "rank": 1,
    "title": "第1吉時",
    "date": "YYYY-MM-DD",
    "time_start": "HH:MM",
    "time_end": "HH:MM",
    "direction": "方位（如：東南）",
    "reason": "完整命理依據，必須包含：1.奇門遁甲月盤分析（什麼局、值符值使位置、吉門吉神配置）2.八字用神配合（當日天干地支與用神的生扶關係）3.白話總結為什麼這個日期時間方位最好。至少80字。"
  },
  ...（共5筆，按吉利程度排序）
]
===TOP5_JSON_END===`,
}

// 輔助函式：將報告標記為失敗
async function markReportFailed(reportId: string, errorMessage: string) {
  try {
    // 取得當前重試次數
    const { data } = await supabase
      .from('paid_reports')
      .select('retry_count')
      .eq('id', reportId)
      .single()
    const currentRetry = data?.retry_count ?? 0

    await supabase.from('paid_reports').update({
      status: 'failed',
      error_message: errorMessage,
      retry_count: currentRetry,
    }).eq('id', reportId)

    console.error(`報告 ${reportId} 標記為失敗: ${errorMessage}`)
  } catch (e) {
    console.error('標記失敗狀態時出錯:', e)
  }
}

export async function POST(req: NextRequest) {
  let reportId = ''
  try {
    const { reportId: rid, accessToken, customerEmail, planCode, birthData, additionalPeople, topic, question } = await req.json()
    reportId = rid

    // Step 0: 檢查重試次數（最多 3 次）
    const { data: existingReport } = await supabase
      .from('paid_reports')
      .select('retry_count, status')
      .eq('id', reportId)
      .single()

    const retryCount = existingReport?.retry_count ?? 0
    if (retryCount >= 3) {
      await supabase.from('paid_reports').update({
        status: 'failed',
        error_message: '已達最大重試次數（3次），請聯繫客服 support@jianyuan.life',
      }).eq('id', reportId)
      return NextResponse.json({ error: '已達最大重試次數' }, { status: 429 })
    }

    // 更新狀態為 pending（重試時需要）+ 累加重試次數
    if (existingReport?.status === 'failed') {
      await supabase.from('paid_reports').update({
        status: 'pending',
        error_message: null,
        retry_count: retryCount + 1,
      }).eq('id', reportId)
    }

    // Step 1: 呼叫 Python API 排盤
    console.log(`開始生成報告: ${reportId}, 方案${planCode}, 第 ${retryCount + 1} 次嘗試`)

    let calcResult = null
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000) // 60 秒超時
      const res = await fetch(`${PYTHON_API}/api/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: birthData.name,
          year: birthData.year, month: birthData.month, day: birthData.day,
          hour: birthData.hour, minute: birthData.minute || 0,
          gender: birthData.gender,
          // 真太陽時校正：傳送出生城市座標
          ...(birthData.cityLat && birthData.cityLng ? { lat: birthData.cityLat, lng: birthData.cityLng } : {}),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) calcResult = await res.json()
      else console.error('排盤 API 回傳錯誤:', res.status, await res.text())
    } catch (e) { console.error('排盤失敗:', e) }

    if (!calcResult) {
      await markReportFailed(reportId, '排盤計算失敗：Python API 無回應或超時')
      return NextResponse.json({ error: '排盤計算失敗' }, { status: 500 })
    }

    // Step 2: 構建 prompt 並呼叫 AI
    const cd = calcResult.client_data
    const analyses = calcResult.analyses || []

    let reportContent = ''
    let aiModelUsed = 'unknown'

    // ── 構建非 C 方案的通用 user prompt ──
    function buildGenericUserPrompt(): string {
      let userPrompt = `${birthData.name}，${birthData.gender==='M'?'男':'女'}，${birthData.year}年${birthData.month}月${birthData.day}日${birthData.hour}時
八字：${cd.bazi || ''} | 用神：${cd.yongshen || ''} | 五行：${JSON.stringify(cd.five_elements || {})}
農曆：${cd.lunar_date || ''} | 納音：${cd.nayin || ''} | 命宮：${cd.ming_gong || ''}
${analyses.length}套系統排盤完整數據：
`
      for (const a of analyses.slice(0, 15)) {
        userPrompt += `\n【${a.system}】評分：${a.score}分`
        if (a.summary) userPrompt += `\n摘要：${a.summary}`
        if (a.good_points?.length) {
          userPrompt += `\n好的地方：`
          for (const g of a.good_points) userPrompt += `\n- ${g}`
        }
        if (a.bad_points?.length) {
          userPrompt += `\n需要注意：`
          for (const b of a.bad_points) userPrompt += `\n- ${b}`
        }
        if (a.warnings?.length) {
          userPrompt += `\n注意事項：`
          for (const w of a.warnings) userPrompt += `\n- ${w}`
        }
        if (a.improvements?.length) {
          userPrompt += `\n改善建議：`
          for (const imp of a.improvements) userPrompt += `\n- ${imp}`
        }
        if (a.tables?.length) {
          for (const t of a.tables) {
            userPrompt += `\n表格「${t.title}」：\n`
            if (t.headers) userPrompt += `| ${t.headers.join(' | ')} |\n`
            if (t.rows) {
              for (const row of t.rows) userPrompt += `| ${row.join(' | ')} |\n`
            }
          }
        }
        if (a.details) {
          const detail = typeof a.details === 'string' ? a.details : JSON.stringify(a.details)
          userPrompt += `\n詳細排盤：\n${detail}\n`
        }
        if (a.info_boxes?.length) {
          for (const box of a.info_boxes) {
            userPrompt += `\n${box.title || '補充'}：\n`
            if (box.items) {
              for (const item of box.items) userPrompt += `- ${item}\n`
            }
          }
        }
        userPrompt += '\n'
      }

      if (topic) userPrompt += `\n分析方向：${topic}\n`
      if (question) userPrompt += `客戶問題描述：${question}\n`

      if (additionalPeople?.length) {
        userPrompt += `\n其他人資料：\n`
        for (const p of additionalPeople) {
          userPrompt += `- ${p.name}，${p.gender === 'M' ? '男' : '女'}，${p.year}年${p.month}月${p.day}日${p.hour === 'unknown' || p.time_unknown ? '（時辰不確定）' : ` ${p.hour}時`}\n`
        }
      }

      userPrompt += `\n請根據以上所有排盤數據，撰寫完整的分析報告。
重要提醒：
1. 現在是2026年丙午年。
2. 你的每一個分析論點都必須引用上方排盤數據中的具體結果，不得編造。
3. 排盤數據中「好的地方」和「需要注意」的每一條都必須在報告中被展開分析，不可遺漏。
4. 如果某個系統數據不完整，跳過該系統，不要瞎編。`

      return userPrompt
    }

    // ── DeepSeek fallback 呼叫函式 ──
    async function callDeepSeekFallback(systemPrompt: string, userPrompt: string): Promise<string> {
      console.log('Fallback: 呼叫 DeepSeek 生成報告...')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 180000)
      const res = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 8000,
          temperature: 0.7,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      console.log(`DeepSeek 回覆: ${content.length} 字`)
      return content
    }

    console.log(`方案 ${planCode}：開始 AI 生成...`)
    console.log(`CLAUDE_API_KEY 狀態: ${CLAUDE_API_KEY ? `已設定（長度 ${CLAUDE_API_KEY.length}，前綴 ${CLAUDE_API_KEY.slice(0, 8)}...）` : '❌ 未設定！'}`)

    if (planCode === 'C') {
      // ============================================================
      // C 方案：Claude Opus 4.6 多步並行生成（4 call）
      // 失敗時 fallback 到 DeepSeek 單次呼叫
      // ============================================================
      console.log('C 方案：使用 Claude Opus 4.6 多步並行生成...')

      const ageGroup = getAgeGroup(birthData.year)
      console.log(`年齡分層：${ageGroup}（出生年：${birthData.year}）`)

      const userPrompt1 = buildUserPrompt(cd, analyses, SYSTEM_GROUPS.call1, birthData)
      const userPrompt2 = buildUserPrompt(cd, analyses, SYSTEM_GROUPS.call2, birthData)
      const userPrompt3 = buildUserPrompt(cd, analyses, SYSTEM_GROUPS.call3, birthData)
      const allSystems = [...SYSTEM_GROUPS.call1, ...SYSTEM_GROUPS.call2, ...SYSTEM_GROUPS.call3]
      const userPrompt4 = buildUserPrompt(cd, analyses, allSystems, birthData)
      const clientNeed = question || topic || undefined

      if (CLAUDE_API_KEY) {
        try {
          const [raw1, raw2, raw3, raw4] = await Promise.all([
            callClaudeStreaming(buildCall1Prompt(ageGroup, clientNeed, birthData.locale), userPrompt1, 16384),
            callClaudeStreaming(buildCall2Prompt(ageGroup, birthData.locale), userPrompt2, 12288),
            callClaudeStreaming(buildCall3Prompt(ageGroup, birthData.locale), userPrompt3, 8192),
            callClaudeStreaming(buildCall4Prompt(ageGroup, birthData.name, birthData.locale), userPrompt4, 16384),
          ])

          // 清理 AI 前言 + 品牌名修正
          const result1 = cleanAIResponse(raw1)
          const result2 = cleanAIResponse(raw2)
          const result3 = cleanAIResponse(raw3)
          let result4 = cleanAIResponse(raw4)

          console.log(`Claude Call 1: ${result1.length} 字`)
          console.log(`Claude Call 2: ${result2.length} 字`)
          console.log(`Claude Call 3: ${result3.length} 字`)
          console.log(`Claude Call 4: ${result4.length} 字`)

          // Call D 完整性檢查：必須包含「刻意練習」「寫給你的話」「幸運元素」「交叉驗證」
          const hasDeliberatePractice = result4.includes('刻意練習')
          const hasClosingLetter = result4.includes('寫給') && (result4.includes('的話') || result4.includes('們的話'))
          const hasLuckyElements = result4.includes('幸運元素') || result4.includes('幸運色')
          const hasCrossValidation = result4.includes('交叉驗證') || result4.includes('共識')

          const missingParts: string[] = []
          if (!hasDeliberatePractice) missingParts.push('刻意練習（投資/感情/事業/健康/人際五大面向，每項至少200字）')
          if (!hasClosingLetter) missingParts.push('寫給客戶的話（至少3段，帶命理依據的回顧過去+看見現在+展望未來）')
          if (!hasLuckyElements) missingParts.push('幸運元素總表（幸運色/方位/數字/飾品/食物）')
          if (!hasCrossValidation) missingParts.push('十五系統交叉驗證（六大領域共識分析）')

          if (missingParts.length > 0) {
            console.warn(`Call D 缺少關鍵章節：${missingParts.join('、')}，重新生成...`)
            try {
              const retryRaw4 = await callClaudeStreaming(
                buildCall4Prompt(ageGroup, birthData.name, birthData.locale),
                userPrompt4 + `\n\n【重要提醒——你上次漏掉了以下章節，這次必須全部補上】\n${missingParts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n不要寫任何前言，直接從章節標題開始。`,
                32768,
              )
              result4 = cleanAIResponse(retryRaw4)
              console.log(`Call D 重新生成完成：${result4.length} 字`)
            } catch (retryErr) {
              console.error('Call D 重新生成失敗，使用原始結果:', retryErr)
            }
          }

          reportContent = [result1, result2, result3, result4].join('\n\n')
          aiModelUsed = 'claude-opus-4-6'
          console.log(`C 方案 Claude 報告總長：${reportContent.length} 字`)
        } catch (e) {
          console.error('C 方案 Claude 多步生成失敗，嘗試 DeepSeek fallback:', e)
        }
      } else {
        console.warn('CLAUDE_API_KEY 未設定，C 方案直接使用 DeepSeek fallback')
      }

      // Claude 失敗或 key 未設定 → fallback DeepSeek
      if (!reportContent) {
        try {
          const systemPrompt = localizePrompt(PLAN_SYSTEM_PROMPT[planCode] || PLAN_SYSTEM_PROMPT['C'], birthData.locale)
          reportContent = cleanAIResponse(await callDeepSeekFallback(systemPrompt, buildGenericUserPrompt()))
          aiModelUsed = 'deepseek-chat'
          console.log(`C 方案 DeepSeek fallback 完成：${reportContent.length} 字`)
        } catch (e) {
          console.error('C 方案 DeepSeek fallback 也失敗:', e)
          await markReportFailed(reportId, `AI 生成失敗：Claude + DeepSeek 均失敗 — ${e instanceof Error ? e.message : '未知錯誤'}`)
          return NextResponse.json({ error: 'AI 生成失敗' }, { status: 500 })
        }
      }
    } else {
      // ============================================================
      // 其他方案（D/R/G15/E1/E2/Y）：Claude 單次呼叫，失敗 fallback DeepSeek
      // ============================================================
      const systemPrompt = localizePrompt(PLAN_SYSTEM_PROMPT[planCode] || PLAN_SYSTEM_PROMPT['C'], birthData.locale)
      const userPrompt = buildGenericUserPrompt()

      // 先嘗試 Claude
      if (CLAUDE_API_KEY) {
        try {
          console.log(`方案 ${planCode}：嘗試 Claude Opus 4.6 單次呼叫...`)
          reportContent = cleanAIResponse(await callClaudeStreaming(systemPrompt, userPrompt, 32768))
          aiModelUsed = 'claude-opus-4-6'
          console.log(`方案 ${planCode} Claude 回覆：${reportContent.length} 字`)
        } catch (e) {
          console.error(`方案 ${planCode} Claude 呼叫失敗，嘗試 DeepSeek fallback:`, e)
        }
      } else {
        console.warn(`CLAUDE_API_KEY 未設定，方案 ${planCode} 直接使用 DeepSeek`)
      }

      // Claude 失敗或 key 未設定 → fallback DeepSeek
      if (!reportContent) {
        try {
          reportContent = cleanAIResponse(await callDeepSeekFallback(systemPrompt, userPrompt))
          aiModelUsed = 'deepseek-chat'
          console.log(`方案 ${planCode} DeepSeek fallback 完成：${reportContent.length} 字`)
        } catch (e) {
          console.error(`方案 ${planCode} DeepSeek fallback 也失敗:`, e)
          await markReportFailed(reportId, `AI 生成失敗：Claude + DeepSeek 均失敗 — ${e instanceof Error ? e.message : '未知錯誤'}`)
          return NextResponse.json({ error: 'AI 生成失敗' }, { status: 500 })
        }
      }
    }

    if (!reportContent) {
      await markReportFailed(reportId, 'AI 未回覆：AI 回傳空內容')
      return NextResponse.json({ error: 'AI 未回覆' }, { status: 500 })
    }

    // Step 3.5: 解析出門訣 Top5 吉時 JSON（E1/E2 方案）
    let top5Timings = null
    const top5Match = reportContent.match(/===TOP5_JSON_START===\s*([\s\S]*?)\s*===TOP5_JSON_END===/)
    if (top5Match) {
      try {
        top5Timings = JSON.parse(top5Match[1])
        // 從正文中移除 JSON 區塊，保持乾淨
        reportContent = reportContent.replace(/===TOP5_JSON_START===[\s\S]*?===TOP5_JSON_END===/g, '').trim()
        console.log(`✅ 解析到 ${top5Timings.length} 筆吉時資料`)
      } catch (e) {
        console.error('Top5 JSON 解析失敗:', e)
      }
    }

    // Step 4: 存入 Supabase
    const reportResult: Record<string, unknown> = {
      report_id: reportId,
      systems_count: analyses.length,
      analyses_summary: analyses.map((a: { system: string; score: number }) => ({ system: a.system, score: a.score })),
      ai_content: reportContent,
      ai_model: aiModelUsed,
      ai_tokens: reportContent.length,
    }
    if (top5Timings) {
      reportResult.top5_timings = top5Timings
    }

    const planNames: Record<string, string> = {
      C: '人生藍圖', D: '心之所惑', G15: '家族藍圖',
      R: '合否？', E1: '事件出門訣', E2: '月盤出門訣', Y: '年度運勢',
    }
    const planName = planNames[planCode] || '命理分析報告'

    // Step 4.5: 生成 PDF（非出門訣方案）
    let pdfUrl: string | null = null
    if (!['E1', 'E2'].includes(planCode)) {
      try {
        console.log('呼叫 Python API 生成 PDF...')
        const pdfRes = await fetch(`${PYTHON_API}/api/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: reportId,
            plan_code: planCode,
            client_name: birthData.name,
            plan_name: planName,
            ai_content: reportContent,
            locale: birthData.locale || 'zh-TW',
            analyses_summary: analyses.map((a: { system: string; score: number }) => ({
              system: a.system,
              score: a.score,
            })),
          }),
        })
        if (pdfRes.ok) {
          const pdfData = await pdfRes.json()
          // Python API 回傳 base64，由 Next.js 上傳到 Supabase Storage
          if (pdfData.pdf_base64) {
            const pdfBytes = Buffer.from(pdfData.pdf_base64, 'base64')
            const storagePath = `${reportId}/report.pdf`
            const { error: uploadErr } = await supabase.storage
              .from('reports')
              .upload(storagePath, pdfBytes, {
                contentType: 'application/pdf',
                upsert: true,
              })
            if (uploadErr) {
              console.error('Supabase Storage 上傳失敗:', uploadErr)
            } else {
              const { data: urlData } = supabase.storage
                .from('reports')
                .getPublicUrl(storagePath)
              pdfUrl = urlData.publicUrl
              console.log(`✅ PDF 上傳完成: ${pdfUrl} (${pdfData.file_size_kb}KB)`)
            }
          }
        } else {
          console.error('PDF 生成失敗:', await pdfRes.text())
        }
      } catch (pdfErr) {
        console.error('PDF 生成錯誤:', pdfErr)
      }
    }

    const { error: dbError } = await supabase.from('paid_reports').update({
      report_result: reportResult,
      pdf_url: pdfUrl,
      status: 'completed',
    }).eq('id', reportId)

    if (dbError) console.error('Supabase 更新失敗:', dbError)

    // Step 5: 寄送報告 Email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
    const reportUrl = `${siteUrl}/report/${accessToken}`

    // 根據 locale 決定郵件語言
    const isCN = birthData.locale === 'zh-CN'
    const emailLang = isCN ? 'zh-CN' : 'zh-TW'
    const emailFont = isCN
      ? "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif"
      : "'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif"
    const emailText = {
      brand: isCN ? '鉴 源' : '鑑 源',
      subtitle: isCN ? 'JIANYUAN · 东西方命理整合平台' : 'JIANYUAN · 東西方命理整合平台',
      notice: isCN ? '✦ 报告完成通知' : '✦ 報告完成通知',
      title: isCN
        ? `${birthData?.name || ''}，您的报告已完成`
        : `${birthData?.name || ''}，您的報告已完成`,
      systemCount: isCN
        ? `${planName} · ${analyses.length} 套命理系统分析`
        : `${planName} · ${analyses.length} 套命理系統分析`,
      cta: isCN ? '查看完整报告 →' : '查看完整報告 →',
      linkNote: isCN ? '此链接专属于您，无需登录即可查看' : '此連結專屬於您，無需登入即可查看',
      promoTitle: isCN ? '🧭 加强您的命理能量' : '🧭 加強您的命理能量',
      promoBody: isCN
        ? '报告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出门诀</strong>能让您在最佳时机、最佳方位行动，将命理能量转化为现实中的改变。许多客户在使用出门诀后，事业和财运都有显著提升。'
        : '報告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出門訣</strong>能讓您在最佳時機、最佳方位行動，將命理能量轉化為現實中的改變。許多客戶在使用出門訣後，事業和財運都有顯著提升。',
      promoLink: isCN ? '了解出门诀方案 →' : '了解出門訣方案 →',
      footer: isCN ? '如有任何问题，请联系' : '如有任何問題，請聯繫',
      copyright: isCN ? '© 2026 鉴源命理平台 · jianyuan.life' : '© 2026 鑒源命理平台 · jianyuan.life',
      subject: isCN
        ? `【鉴源命理】您的${planName}报告已完成 — ${birthData?.name || ''}`
        : `【鑒源命理】您的${planName}報告已完成 — ${birthData?.name || ''}`,
      from: isCN ? '鉴源命理 <reports@jianyuan.life>' : '鑒源命理 <reports@jianyuan.life>',
    }

    if (customerEmail && accessToken) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY || '')
        const previewContent = reportContent.slice(0, 300).replace(/[#*`]/g, '').trim()

        await resend.emails.send({
          from: emailText.from,
          to: customerEmail,
          subject: emailText.subject,
          html: `
<!DOCTYPE html>
<html lang="${emailLang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:${emailFont};">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- 頂部品牌 -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="color:#c9a84c;font-size:24px;font-weight:700;letter-spacing:4px;">${emailText.brand}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px;">${emailText.subtitle}</div>
    </div>

    <!-- 主卡片 -->
    <div style="background:linear-gradient(135deg,#1a2a4a,#0d1a2e);border:1px solid #2a3a5a;border-radius:16px;padding:32px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;letter-spacing:2px;margin-bottom:8px;">${emailText.notice}</div>
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">${emailText.title}</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 24px 0;">${emailText.systemCount}</p>

      <!-- 報告預覽 -->
      <div style="background:rgba(255,255,255,0.05);border-left:3px solid #c9a84c;border-radius:4px;padding:16px;margin-bottom:24px;">
        <p style="color:#d1d5db;font-size:14px;line-height:1.8;margin:0;">${previewContent}...</p>
      </div>

      <!-- CTA 按鈕 -->
      <div style="text-align:center;">
        <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c87a);color:#0d1117;font-weight:700;font-size:16px;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
          ${emailText.cta}
        </a>
        <p style="color:#6b7280;font-size:12px;margin:12px 0 0 0;">${emailText.linkNote}</p>
      </div>
    </div>

    <!-- 出門訣推廣（非 E 方案才顯示）-->
    ${!['E1','E2','E3'].includes(planCode) ? `
    <div style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;font-weight:600;margin-bottom:8px;">${emailText.promoTitle}</div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 16px 0;">
        ${emailText.promoBody}
      </p>
      <a href="https://jianyuan.life/pricing" style="color:#c9a84c;font-size:13px;text-decoration:none;">${emailText.promoLink}</a>
    </div>
    ` : ''}

    <!-- 頁尾 -->
    <div style="text-align:center;color:#4b5563;font-size:12px;line-height:1.8;">
      <p>${emailText.footer} <a href="mailto:support@jianyuan.life" style="color:#c9a84c;">support@jianyuan.life</a></p>
      <p style="margin-top:8px;">${emailText.copyright}</p>
    </div>
  </div>
</body>
</html>`,
        })

        // 更新 email_sent_at
        await supabase.from('paid_reports')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', reportId)

        console.log(`✅ Email 已寄送至 ${customerEmail}`)
      } catch (emailErr) {
        console.error('Email 寄送失敗:', emailErr)
        // 不讓 email 失敗影響整體回傳
      }
    }

    return NextResponse.json({
      success: true,
      report_id: reportId,
      report_url: reportUrl,
      content_length: reportContent.length,
      systems_count: analyses.length,
    })
  } catch (err) {
    console.error('報告生成錯誤:', err)
    const errorMsg = err instanceof Error ? err.message : '未知錯誤'
    if (reportId) {
      await markReportFailed(reportId, `報告生成未預期錯誤: ${errorMsg}`)
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
