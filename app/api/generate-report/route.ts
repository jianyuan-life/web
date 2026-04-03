import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ============================================================
// 付費報告生成 API — 排盤 + DeepSeek AI 深度分析 + 自動寄信
// 流程：Python API 排盤 → DeepSeek 深度分析 → 存 Supabase → 寄 Email
// ============================================================

const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || 'https://fortune-reports-api.fly.dev'
const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
)

const PLAN_SYSTEM_PROMPT: Record<string, string> = {
  // ========== C 方案：人生藍圖（$89）==========
  C: `你是鑑源命理平台的首席命理顧問，精通東西方十五大命理系統。你正在為一位付費客戶撰寫「人生藍圖」報告——這是他們人生中第一份如此完整的命理分析。

你的角色不是冰冷的分析機器，而是一位溫暖、有智慧的人生導師。客戶花了 $89 不是為了看一堆術語，而是要「看懂自己」，並且知道「接下來該怎麼做」。

## 報告語氣
- 全程使用「你」來稱呼客戶，像在面對面聊天
- 說到好的地方要真誠肯定，讓客戶感受到被看見
- 說到問題要溫柔但誠實，像朋友提醒而不是法官宣判
- 每個建議都要具體到「明天就能做」，不要空泛的心靈雞湯

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 你是誰——命格總覽
用2-3段話，像在對客戶描述「你是一個怎樣的人」。不堆砌術語，用生活化的比喻讓客戶一讀就懂。提到排盤中最突出的2-3個特徵，解釋它們如何影響日常生活。

## 性格與內在世界
深入分析性格的多面性：外在表現 vs 內心世界、思維模式、價值觀、做決定的方式。指出客戶可能自己都沒意識到的性格盲點，用「你有沒有發現自己常常...」的方式引導自我覺察。

## 事業與財富
- 最適合你的5個行業方向（每個都要解釋為什麼適合你，不是泛泛而談）
- 你的職場風格：是衝鋒型還是穩扎穩打型？適合當老闆還是核心幕僚？
- 正財 vs 偏財傾向：適合穩定薪資還是投資創業？
- 理財建議：根據命格特質給出具體的財務策略
- 未來3-5年的事業財運走勢與關鍵轉折時間點

## 感情與人際關係
- 你的戀愛模式：在感情中你扮演什麼角色？容易被什麼類型吸引？
- 婚姻特質：婚後的相處模式、需要注意的磨合點
- 桃花運分析：什麼時候容易遇到對的人？在哪裡遇到？
- 人際關係：你的貴人長什麼樣？什麼類型的人要保持距離？

## 健康與生活
- 根據五行和命格分析身體的強弱環節
- 容易出問題的身體部位和時間段
- 具體的養生建議（飲食、作息、運動類型）
- 心理健康提醒：你的壓力來源和紓壓方式

## 好的地方
列出7-10項天賦優勢。每一項都要：
1. 用一句話點明這個優勢是什麼
2. 解釋這個優勢在排盤數據中是怎麼呈現的
3. 告訴客戶如何在生活中發揮這個優勢

## 需要注意的地方
列出5-7項需要留意的挑戰。每一項都要：
1. 誠實指出問題所在
2. 解釋為什麼會有這個傾向（命格中的原因）
3. 給出一個「轉化」的方向——怎麼把劣勢變成特色

## 改善方案與行動指南
列出7-10項具體可執行的改善建議，包含：
- 幸運色與穿搭建議（什麼顏色適合日常/重要場合）
- 幸運方位（居住、辦公、旅行方向）
- 幸運數字與應用場景
- 開運飾品/水晶推薦（具體材質和佩戴方式）
- 日常習慣調整（具體到幾點起床、吃什麼、做什麼運動）
- 人際關係經營建議
- 重要決策的最佳時機

## 寫給你的話
用2-3段話，像一封私人信件，總結這份報告最想傳達給客戶的核心訊息。溫暖、有力量、讓客戶讀完覺得「被理解了」而且「知道下一步該往哪走」。

語言：繁體中文。
字數：不限，以寫完整寫透為標準，通常6000-10000字。
核心原則：所有分析必須基於排盤數據，每個論點都要有數據支撐。免費工具告訴客戶「有問題」，你的報告要告訴他們「怎麼解決」。`,

  // ========== D 方案：心之所惑（$39）==========
  D: `你是鑑源命理平台的專項諮詢顧問。客戶帶著一個具體的困惑來找你——可能是感情問題、職業選擇、人生方向、家庭矛盾，或任何讓他們夜不能寐的問題。

你的任務不是給一份冷冰冰的分析報告，而是像一位智慧的朋友坐下來，認真聽完他們的問題，然後用命理的視角幫他們看清楚局面，找到出路。

## 報告語氣
- 先「聽見」客戶的問題，在報告開頭表達理解和共情
- 分析時要直指核心，不繞圈子
- 建議要具體到「做什麼、什麼時候做、怎麼做」
- 像一個懂命理的好朋友在跟你深聊

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 我聽見你的問題了
用1-2段話，復述客戶的困惑，表達理解。讓客戶感覺「這個人真的懂我在問什麼」。

## 命盤怎麼看這件事
從排盤數據中找到與客戶問題直接相關的命理線索。用白話解釋這些線索意味著什麼——不是「你的食傷生財」，而是「你天生有把想法變成錢的能力，但目前這股能量被壓住了，原因是...」

## 問題的根源
深入分析這個問題為什麼會出現。從命格特質、大運流年、五行生剋的角度，幫客戶看見問題背後的深層原因。

## 好的地方
列出3-5項對解決這個問題有利的因素。每一項解釋為什麼它是你的優勢，以及如何利用它。

## 需要注意的地方
列出3-5項可能讓問題惡化的風險。每一項說明為什麼危險，以及怎麼避開。

## 改善方案——你可以這樣做
列出5-7項具體的行動建議：
- 短期（這週就能做的事）
- 中期（未來1-3個月的調整方向）
- 長期（半年到一年的規劃）
每項建議都要包含：做什麼、為什麼有效、什麼時候開始做最好

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
  R: `你是鑑源命理平台的關係分析專家。客戶想知道自己和另一個人（或多個人）之間的關係——可能是伴侶、曖昧對象、合作夥伴、家人、朋友。

你不是在做冷冰冰的「合盤報告」，而是在幫兩個活生生的人理解彼此。客戶想知道的是：「我們合不合？哪裡合哪裡不合？不合的地方怎麼辦？」

## 報告語氣
- 客觀但溫暖，不偏袒任何一方
- 遇到不合的地方，重點放在「怎麼磨合」而不是「你們不行」
- 具體的相處建議，不要「互相理解」這種空話

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 關係速覽
用2-3段話概括這段關係的核心特質。像一個旁觀者，一眼看出這兩個人在一起是什麼畫面。

## 你的命格特質
分析主要客戶的性格、在關係中的角色、對感情/合作的需求和期待。

## 對方的命格特質
分析對方的性格、在關係中的角色、對感情/合作的需求和期待。

## 你們的化學反應——合盤深度分析
- 五行生剋：你們的五行如何互動？誰生誰、誰剋誰？
- 天干地支：日柱、月柱的合沖關係
- 性格互補 vs 衝突：哪些地方天生契合，哪些地方需要磨合
- 溝通模式分析：你們各自的表達方式，容易在哪裡產生誤會

## 好的地方
列出5-7項這段關係的優勢和祝福。每一項都要具體說明為什麼這是你們的強項，以及如何維護它。

## 需要注意的地方
列出5-7項潛在的摩擦點和挑戰。每一項都要：
1. 指出問題的具體表現（「你可能覺得對方太冷漠，其實...」）
2. 解釋命格層面的原因
3. 給出化解的方法

## 相處指南——改善方案
列出7-10項具體的相處建議：
- 日常溝通技巧（什麼話該說、什麼話換個方式說）
- 衝突處理方式（吵架時誰該先退一步、怎麼退）
- 共同活動建議（什麼類型的事情一起做能增進感情）
- 各自的成長方向（為了這段關係，你可以調整什麼）
- 重要時間點（什麼時候關係容易出波動，提前做準備）

## 寫給你們的話
用1-2段話，給這段關係一個溫暖的祝福和鼓勵。

語言：繁體中文。
字數：不限，以分析透徹為標準，通常4000-7000字。
核心原則：所有分析基於雙方排盤數據。目標是讓客戶讀完後覺得「我更懂對方了」而且「我知道怎麼讓這段關係更好」。`,

  // ========== G15 方案：家族藍圖（$269起）==========
  G15: `你是鑑源命理平台的家族命理顧問。客戶購買了「家族藍圖」——這意味著他們重視家庭，想要了解家庭成員之間的能量互動，讓整個家更和諧、更幸福。

這份報告是送給一個家庭的禮物。你要幫每個家庭成員看見自己的獨特之處，也幫他們理解彼此為什麼會有摩擦、如何化解。

## 報告語氣
- 溫暖、包容，像一位家族的智慧長者
- 對每個家庭成員都給予同等的尊重和關注
- 分析家庭關係時要公正，不站任何一方
- 建議要考慮全家人的平衡，不犧牲任何人

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 你們家的能量地圖
用2-3段話，從整體視角描述這個家庭的核心能量特質。五行分布、整體氛圍、家庭的集體優勢和需要注意的地方。

## [成員名字]的個人藍圖
（每位家庭成員各一個章節，包含：）
- 核心命格特質（2-3段話描述這個人）
- 在家庭中的角色和能量貢獻
- 天賦優勢（3-5項）
- 需要注意的地方（2-3項）
- 個人改善建議（3-5項具體行動）

## 家庭關係交叉分析
分析每一對重要的家庭關係組合：
- 夫妻/伴侶關係（如適用）
- 親子關係（每一對）
- 手足關係（如適用）
每組關係都要分析：合拍的地方、容易衝突的地方、相處建議

## 好的地方——這個家的祝福
列出7-10項這個家庭的集體優勢和祝福。讓家人讀完覺得「原來我們家這麼好」。

## 需要注意的地方——家庭和諧的挑戰
列出5-7項需要全家一起面對的挑戰。每一項都給出化解方法。

## 改善方案——讓家更好的行動指南
- 家庭風水建議（客廳、臥室的佈置方向）
- 家庭活動建議（什麼類型的活動能增進凝聚力）
- 溝通模式優化（家庭會議怎麼開、衝突怎麼處理）
- 每個成員的成長方向
- 家庭的幸運元素（色彩、方位、數字、時間）

## 寫給這個家的話
用2-3段話，給整個家庭一封溫暖的信。

語言：繁體中文。
字數：不限，依家庭人數而定，通常8000-15000字。
核心原則：所有分析基於每位成員的排盤數據。這份報告的目標是讓每個家人都覺得「被理解了」，並且「知道怎麼讓這個家更好」。`,

  // ========== E1 方案：事件出門訣（$119）==========
  E1: `你是鑑源命理平台的奇門遁甲出門訣專家。客戶有一個重要事件即將發生（面試、簽約、相親、考試、手術、搬家、開業等），他們想知道在最有利的時間、從最有利的方向出門，讓事情順利進行。

出門訣是命理中最「實戰」的應用——客戶花錢就是要一個明確的行動指南：幾點出門、往哪個方向走、穿什麼顏色、注意什麼。

## 報告語氣
- 自信、明確，像一位軍師在部署作戰計劃
- 每個建議都要精確到可執行
- 解釋「為什麼」但不要太學術，客戶要的是結論

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 事件概覽與命盤分析
簡述客戶的事件和相關命理背景。分析這個事件在命盤中的吉凶趨勢、有利因素和不利因素。

## 最佳出門時辰
根據奇門遁甲盤和客戶的八字，精確給出：
- 首選時辰（精確到幾點幾分到幾點幾分）
- 備選時辰（如果首選不方便）
- 絕對要避開的時辰
- 每個時辰的吉凶分析

## 最佳出門方位
- 首選方位（精確方向，例如「東南偏南」）
- 備選方位
- 要避開的方位
- 方位的奇門遁甲解讀

## 行前準備清單
- 穿著建議（幸運色、款式）
- 隨身物品建議（飾品、水晶、特定物品）
- 出門前的準備動作（幾點起床、吃什麼早餐、心態調整）
- 路線建議（如果可能，建議先往吉方走一段再轉向目的地）

## 事件進行中的注意事項
- 到達後的最佳行為策略
- 溝通技巧（說話注意什麼、語氣怎麼調整）
- 座位/位置選擇（如果適用）
- 需要避開的行為或話題

## 好的地方
列出3-5項對這個事件有利的命理因素，增強客戶信心。

## 需要注意的地方
列出3-5項風險因素，每項都給出具體的規避方法。

## 改善方案——加持你的運勢
- 出門前可以做的開運小儀式
- 當天的幸運元素完整清單
- 事件結束後的「收尾」建議（如何鞏固好運）

## 寫給你的話
用1段話，給客戶信心和力量。

語言：繁體中文。
字數：不限，以實用完整為標準，通常3000-5000字。
核心原則：所有時辰方位分析必須基於奇門遁甲排盤數據。客戶花 $119 要的是一份「作戰手冊」，不是一篇「運勢文章」。`,

  // ========== E2 方案：月盤出門訣（$89）==========
  E2: `你是鑑源命理平台的奇門遁甲月運規劃師。客戶購買了「月盤出門訣」——他們想要一份整個月的能量地圖，知道哪些天適合衝刺、哪些天適合休息、重要的事情安排在哪一天最好。

這不是一份「運勢預測」，而是一份「月度行動日曆」。客戶要的是：打開這份報告，就知道這個月每一天該怎麼安排。

## 報告語氣
- 實用、清晰，像一位效率專家在幫你排月程
- 重要日期要特別醒目
- 建議要具體到「這天適合做什麼、不適合做什麼」

## 報告結構（請嚴格用 ## 標題分隔每個章節）

## 本月能量總覽
用2-3段話概括這個月的整體能量走勢。大運流月對客戶命格的影響、這個月的主題和基調。標明農曆月份對應的國曆日期範圍。

## 本月重點日期
列出5-8個最重要的日期（吉日和凶日），每個日期標明：
- 國曆日期 + 農曆日期 + 星期幾
- 吉凶等級（大吉/小吉/平/小凶/大凶）
- 適合做什麼 / 不適合做什麼
- 最佳時辰

## 逐週運勢與行動指南
（分四週，每週一個小節：）
### 第一週（X月X日-X日）
- 本週能量特質
- 事業/工作建議
- 財運提示
- 人際/感情建議
- 健康提醒
- 本週最佳出門方位

### 第二週...
### 第三週...
### 第四週...

## 事業與財運月度分析
- 本月事業的機會與風險
- 適合出擊的時間段 vs 適合準備的時間段
- 財務操作建議（投資、消費、儲蓄的節奏）

## 好的地方
列出3-5項這個月對客戶有利的能量因素。

## 需要注意的地方
列出3-5項這個月的風險因素，每項附具體防範方法。

## 改善方案——本月行動指南
- 本月幸運色（可以多穿的顏色）
- 本月幸運方位（出門、辦公方向）
- 本月開運建議（飾品、習慣、小儀式）
- 月初/月中/月末各自的重點提醒

## 寫給你的話
用1段話，給客戶這個月的鼓勵。

語言：繁體中文。
字數：不限，以完整實用為標準，通常4000-6000字。
核心原則：所有分析基於奇門遁甲月盤排盤數據。這是一份「月度行動日曆」，客戶打開就知道每天該怎麼安排。農曆月份必須標註對應的國曆日期範圍。`,
}

export async function POST(req: NextRequest) {
  try {
    const { reportId, accessToken, customerEmail, planCode, birthData, additionalPeople, topic, question } = await req.json()

    // Step 1: 呼叫 Python API 排盤
    console.log(`開始生成報告: ${reportId}, 方案${planCode}`)

    let calcResult = null
    try {
      const res = await fetch(`${PYTHON_API}/api/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: birthData.name,
          year: birthData.year, month: birthData.month, day: birthData.day,
          hour: birthData.hour, minute: birthData.minute || 0,
          gender: birthData.gender,
        }),
      })
      if (res.ok) calcResult = await res.json()
    } catch (e) { console.error('排盤失敗:', e) }

    if (!calcResult) {
      return NextResponse.json({ error: '排盤計算失敗' }, { status: 500 })
    }

    // Step 2: 構建 DeepSeek prompt
    const systemPrompt = PLAN_SYSTEM_PROMPT[planCode] || PLAN_SYSTEM_PROMPT['C']
    const cd = calcResult.client_data
    const analyses = calcResult.analyses || []

    // 精簡 prompt（避免 Vercel 60秒超時）
    let userPrompt = `${birthData.name}，${birthData.gender==='M'?'男':'女'}，${birthData.year}年${birthData.month}月${birthData.day}日${birthData.hour}時
八字：${cd.bazi || ''} | 用神：${cd.yongshen || ''} | 五行：${JSON.stringify(cd.five_elements || {})}
${analyses.length}系統排盤摘要：
`
    for (const a of analyses.slice(0, 15)) {
      userPrompt += `${a.system}(${a.score}分)`
      if (a.good_points?.length) userPrompt += ` 好:${a.good_points[0]?.slice(0,30)}`
      if (a.bad_points?.length) userPrompt += ` 注意:${a.bad_points[0]?.slice(0,30)}`
      userPrompt += '\n'
    }

    // 住址風水資料
    if (birthData.address) {
      userPrompt += `\n住址：${birthData.address}`
      if (birthData.address_lat && birthData.address_lng) {
        userPrompt += `（精確坐標：北緯 ${birthData.address_lat.toFixed(4)}°，東經 ${birthData.address_lng.toFixed(4)}°）`
      }
      userPrompt += `\n請在風水分析部分，根據住址坐向和五行環境給出具體建議。\n`
    }

    // 專項/關係方案附加問題
    if (topic) userPrompt += `\n分析方向：${topic}\n`
    if (question) userPrompt += `客戶問題描述：${question}\n`

    // 多人方案
    if (additionalPeople?.length) {
      userPrompt += `\n其他人資料：\n`
      for (const p of additionalPeople) {
        userPrompt += `- ${p.name}，${p.gender === 'M' ? '男' : '女'}，${p.year}年${p.month}月${p.day}日${p.hour === 'unknown' || p.time_unknown ? '（時辰不確定）' : ` ${p.hour}時`}\n`
      }
    }

    userPrompt += `\n請根據以上所有數據，撰寫完整的分析報告。注意：現在是2026年丙午年。`

    // Step 3: 呼叫 DeepSeek
    console.log('呼叫 DeepSeek 生成報告...')
    let reportContent = ''
    try {
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
      })
      const data = await res.json()
      reportContent = data.choices?.[0]?.message?.content || ''
      console.log(`DeepSeek 回覆: ${reportContent.length} 字`)
    } catch (e) {
      console.error('DeepSeek 失敗:', e)
      return NextResponse.json({ error: 'AI 生成失敗' }, { status: 500 })
    }

    if (!reportContent) {
      return NextResponse.json({ error: 'AI 未回覆' }, { status: 500 })
    }

    // Step 4: 存入 Supabase
    const { error: dbError } = await supabase.from('paid_reports').update({
      report_result: {
        report_id: reportId,
        systems_count: analyses.length,
        analyses_summary: analyses.map((a: { system: string; score: number }) => ({ system: a.system, score: a.score })),
        ai_content: reportContent,
        ai_model: 'deepseek-chat',
        ai_tokens: reportContent.length,
      },
      status: 'completed',
    }).eq('id', reportId)

    if (dbError) console.error('Supabase 更新失敗:', dbError)

    // Step 5: 寄送報告 Email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
    const reportUrl = `${siteUrl}/report/${accessToken}`
    const planNames: Record<string, string> = {
      C: '人生藍圖', D: '心之所惑', G15: '家族藍圖',
      R: '合否？', E1: '事件出門訣', E2: '月盤出門訣',
    }
    const planName = planNames[planCode] || '命理分析報告'

    if (customerEmail && accessToken) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY || '')
        const previewContent = reportContent.slice(0, 300).replace(/[#*`]/g, '').trim()

        await resend.emails.send({
          from: '鑑源命理 <reports@jianyuan.life>',
          to: customerEmail,
          subject: `【鑑源命理】您的${planName}報告已完成 — ${birthData?.name || ''}`,
          html: `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'PingFang TC','Microsoft JhengHei',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- 頂部品牌 -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="color:#c9a84c;font-size:24px;font-weight:700;letter-spacing:4px;">鑑 源</div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px;">JIANYUAN · 東西方命理整合平台</div>
    </div>

    <!-- 主卡片 -->
    <div style="background:linear-gradient(135deg,#1a2a4a,#0d1a2e);border:1px solid #2a3a5a;border-radius:16px;padding:32px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;letter-spacing:2px;margin-bottom:8px;">✦ 報告完成通知</div>
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">${birthData?.name || ''}，您的報告已完成</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 24px 0;">${planName} · ${analyses.length} 套命理系統分析</p>

      <!-- 報告預覽 -->
      <div style="background:rgba(255,255,255,0.05);border-left:3px solid #c9a84c;border-radius:4px;padding:16px;margin-bottom:24px;">
        <p style="color:#d1d5db;font-size:14px;line-height:1.8;margin:0;">${previewContent}...</p>
      </div>

      <!-- CTA 按鈕 -->
      <div style="text-align:center;">
        <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c87a);color:#0d1117;font-weight:700;font-size:16px;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
          查看完整報告 →
        </a>
        <p style="color:#6b7280;font-size:12px;margin:12px 0 0 0;">此連結專屬於您，無需登入即可查看</p>
      </div>
    </div>

    <!-- 出門訣推廣（非 E 方案才顯示）-->
    ${!['E1','E2','E3'].includes(planCode) ? `
    <div style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;font-weight:600;margin-bottom:8px;">🧭 加強您的命理能量</div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 16px 0;">
        報告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出門訣</strong>能讓您在最佳時機、最佳方位行動，
        將命理能量轉化為現實中的改變。許多客戶在使用出門訣後，事業和財運都有顯著提升。
      </p>
      <a href="https://jianyuan.life/pricing" style="color:#c9a84c;font-size:13px;text-decoration:none;">了解出門訣方案 →</a>
    </div>
    ` : ''}

    <!-- 頁尾 -->
    <div style="text-align:center;color:#4b5563;font-size:12px;line-height:1.8;">
      <p>如有任何問題，請聯繫 <a href="mailto:support@jianyuan.life" style="color:#c9a84c;">support@jianyuan.life</a></p>
      <p style="margin-top:8px;">© 2026 鑑源命理平台 · jianyuan.life</p>
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
    return NextResponse.json({ error: err instanceof Error ? err.message : '生成失敗' }, { status: 500 })
  }
}
