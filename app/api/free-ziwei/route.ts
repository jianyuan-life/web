import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// 免費紫微斗數速算 — Python 排盤 + DeepSeek AI 解讀
// ============================================================

const PYTHON_API = 'https://fortune-reports-api.fly.dev'
const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const KIMI_API = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_KEY = process.env.KIMI_API_KEY || ''

// ── 紫微十四主星特質 ──
const STAR_PROFILES: Record<string, { nature: string; personality: string; strengths: string; challenges: string; career: string; love: string }> = {
  '紫微': { nature: '帝星', personality: '天生具有領袖氣質，尊貴大方，有王者風範。自信且具權威感，不喜歡被人指揮。', strengths: '領導力強、決策力佳、格局高、有遠見', challenges: '容易孤傲、主觀性強、不善委屈求全', career: '適合管理層、企業主、政治、高端服務業', love: '對伴侶要求高，需要被尊重和仰慕的感覺' },
  '天機': { nature: '智慧星', personality: '聰明機智，思維敏捷，善於分析和策劃。好奇心強，學習能力優秀。', strengths: '智商高、分析力強、反應快、多才多藝', challenges: '容易想太多、猶豫不決、缺乏行動力', career: '適合研究、策劃、顧問、科技、教育', love: '喜歡聰明有趣的對象，精神交流很重要' },
  '太陽': { nature: '光明星', personality: '光明磊落，熱情大方，有強烈的正義感和責任心。樂於助人，不計較得失。', strengths: '正直善良、樂觀積極、有影響力、樂善好施', challenges: '容易過度付出、不懂拒絕、忽略自己需求', career: '適合公職、教育、媒體、公益、外交', love: '在感情中是付出型，但要學會接受對方的愛' },
  '武曲': { nature: '財星', personality: '剛毅果決，做事利落，天生有財運。個性直爽，不喜歡繞彎子。', strengths: '執行力強、有財運、果斷、專注目標', challenges: '過於剛硬、不善人際、容易得罪人', career: '適合金融、軍警、運動、工程、創業', love: '不太會浪漫，但對伴侶忠誠可靠' },
  '天同': { nature: '福星', personality: '溫和善良，知足常樂，有藝術天賦。不喜歡競爭和衝突，追求和諧。', strengths: '親和力強、有福氣、善解人意、藝術天賦', challenges: '容易懶散、缺乏企圖心、依賴心重', career: '適合藝術、設計、社工、餐飲、休閒產業', love: '重視感情中的溫馨和安全感' },
  '廉貞': { nature: '次桃花星', personality: '聰明伶俐，多才多藝，外表出眾。有很強的企圖心但不輕易顯露。', strengths: '能力強、有魅力、善於交際、適應力佳', challenges: '心思複雜、情緒起伏大、愛恨分明', career: '適合法律、政治、演藝、公關、品牌管理', love: '感情豐富但容易糾結，需要學會放下' },
  '天府': { nature: '令星', personality: '穩重大方，有領導力和包容心。像一個大家長，善於照顧和管理。', strengths: '穩健可靠、有領導力、財運好、人緣佳', challenges: '過於保守、不愛冒險、有時顯得功利', career: '適合金融、行政管理、企業經營、房地產', love: '是可靠的伴侶，重視家庭穩定' },
  '太陰': { nature: '富星', personality: '溫柔細膩，感受力強，有藝術天賦。內心豐富，善於觀察人心。', strengths: '細膩敏感、有文藝氣質、善解人意、有耐心', challenges: '容易多愁善感、猶豫不決、缺乏魄力', career: '適合文學、藝術、設計、心理諮詢、投資', love: '重視精神層面的交流，需要被理解和珍惜' },
  '貪狼': { nature: '桃花星', personality: '多才多藝，魅力十足，好奇心強。興趣廣泛，有很強的學習能力。', strengths: '魅力出眾、多才多藝、社交力強、創意豐富', challenges: '容易三心二意、不夠專注、貪多嚼不爛', career: '適合演藝、銷售、創意產業、美容、旅遊', love: '異性緣很好但要注意專一' },
  '巨門': { nature: '暗星', personality: '口才佳，分析力強，善於辯論和研究。直覺敏銳，能看穿事物本質。', strengths: '口才好、分析力強、善於研究、直覺準', challenges: '容易多疑、口舌是非、負面思考', career: '適合律師、教師、記者、評論家、心理醫師', love: '需要學會信任，不要過度猜疑對方' },
  '天相': { nature: '印星', personality: '正直善良，有服務精神，善於協調人際關係。注重儀表和禮節。', strengths: '人緣好、善於協調、正直可靠、注重細節', challenges: '容易被影響、缺乏主見、過度在意形象', career: '適合人力資源、行政、外交、秘書、品管', love: '在感情中扮演調和者角色，重視和諧' },
  '天梁': { nature: '蔭星', personality: '有長者風範，善於化解危機。正義感強，常常扮演保護者角色。', strengths: '有智慧、善於化險為夷、有貴人運、長壽', challenges: '容易太操心、管太多、杞人憂天', career: '適合醫療、保險、社工、宗教、教育', love: '在感情中是保護者，但要注意不要太像長輩' },
  '七殺': { nature: '將星', personality: '勇猛果敢，有開拓精神。不怕困難和挑戰，有很強的行動力。', strengths: '勇敢果斷、有魄力、不畏艱難、開創力強', challenges: '脾氣急躁、容易衝動、人際關係緊張', career: '適合軍警、創業、外科醫生、運動員、冒險家', love: '需要一個能包容您急性子的伴侶' },
  '破軍': { nature: '耗星', personality: '不按常理出牌，喜歡打破舊有框架。有很強的變革精神和創造力。', strengths: '創新力強、不拘泥傳統、勇於改變、有爆發力', challenges: '不夠穩定、容易推倒重來、人際關係波動', career: '適合創業、改革、科技研發、藝術創作', love: '感情起伏較大，需要學會穩定和經營' },
}

// 十二宮位名稱
const PALACES = ['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮', '遷移宮', '交友宮', '事業宮', '田宅宮', '福德宮', '父母宮']

// ── 四化星表（根據年干） ──
const SIHUA: Record<string, string[]> = {
  '甲': ['廉貞化祿', '破軍化權', '武曲化科', '太陽化忌'],
  '乙': ['天機化祿', '天梁化權', '紫微化科', '太陰化忌'],
  '丙': ['天同化祿', '天機化權', '文昌化科', '廉貞化忌'],
  '丁': ['太陰化祿', '天同化權', '天機化科', '巨門化忌'],
  '戊': ['貪狼化祿', '太陰化權', '右弼化科', '天機化忌'],
  '己': ['武曲化祿', '貪狼化權', '天梁化科', '文曲化忌'],
  '庚': ['太陽化祿', '武曲化權', '太陰化科', '天同化忌'],
  '辛': ['巨門化祿', '太陽化權', '文曲化科', '文昌化忌'],
  '壬': ['天梁化祿', '紫微化權', '左輔化科', '武曲化忌'],
  '癸': ['破軍化祿', '巨門化權', '太陰化科', '貪狼化忌'],
}

const TG_LIST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { year, month, day, hour = 12, gender = 'M', name = '', calendar_type = 'solar' } = body

    if (!year || !month || !day) {
      return NextResponse.json({ detail: '請提供完整出生資料' }, { status: 400 })
    }

    // 紫微斗數必須走 Python API — TS 無法正確排盤
    let pythonData: Record<string, unknown> | null = null
    let mainStar = ''
    let yearTG = TG_LIST[((year - 4) % 10 + 10) % 10]
    let sihua = SIHUA[yearTG] || SIHUA['甲']

    try {
      const pyRes = await fetch(`${PYTHON_API}/api/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '用戶', year, month, day, hour, minute: 0, gender }),
        signal: AbortSignal.timeout(60000),
      })
      if (pyRes.ok) {
        const pyJson = await pyRes.json()
        // Python API 返回 analyses 陣列，找到紫微斗數的項目
        const analyses = pyJson?.analyses || []
        const ziweiAnalysis = analyses.find((a: { system: string }) => a.system === '紫微斗數')
        if (ziweiAnalysis) {
          pythonData = ziweiAnalysis
          // 從 tables 中找命宮主星
          // 表格格式：['命宮', '宮位地支', '主星（頓號分隔）', '輔星']
          const tables = ziweiAnalysis.tables || []
          for (const table of tables) {
            if (table.title?.includes('十二宮') || table.title?.includes('命盤') || table.title?.includes('主星')) {
              const rows = table.rows || []
              for (const row of rows) {
                if (row[0] === '命宮' && row.length > 2) {
                  // 主星在第三欄（index 2），格式如 '廉貞、天府'
                  const starCell = row[2] || row[1] || ''
                  mainStar = starCell.split('、')[0].split('/')[0].split('（')[0].trim()
                  if (mainStar === '—' || mainStar === '-') mainStar = ''
                  break
                }
              }
            }
            if (mainStar) break
          }
          // 備用：從 details 或 summary 中提取
          if (!mainStar && ziweiAnalysis.summary) {
            const match = String(ziweiAnalysis.summary).match(/命宮主星[：:]\s*(\S+)/)
            if (match) mainStar = match[1]
          }
          // 再備用：從 good_points 中找
          if (!mainStar) {
            const allText = JSON.stringify(ziweiAnalysis)
            const starNames = Object.keys(STAR_PROFILES)
            for (const star of starNames) {
              if (allText.includes(`命宮`) && allText.includes(star)) {
                mainStar = star
                break
              }
            }
          }
        }
      }
    } catch {
      // Python API 不可用
    }

    // 如果 Python API 失敗且無法取得命宮主星，返回錯誤
    if (!mainStar) {
      return NextResponse.json({
        detail: '服務暫時忙碌，請稍後再試。紫微斗數排盤需要精確計算，目前系統負載較高。',
        retry: true,
      }, { status: 503 })
    }

    const profile = STAR_PROFILES[mainStar] || STAR_PROFILES['紫微']

    // DeepSeek AI 深度解讀
    let aiAnalysis = ''
    try {
      const prompt = `你是一位紫微斗數大師。請根據以下命盤資料，用溫暖親切的口吻為${name || '此人'}做一段深度解讀（約800字）。

命宮主星：${mainStar}（${profile.nature}）
年干：${yearTG}
四化：${sihua.join('、')}
性別：${gender === 'M' ? '男' : '女'}
出生年：${year}

請包含：
1. 命宮主星的性格特質深度剖析
2. 四化星對命運的影響
3. 事業和財運方向
4. 感情和人際關係建議
5. 2026丙午年運勢提點

語氣要像一位關心晚輩的長者，溫暖但有見地。不要用「您好」開頭，直接進入分析。`

      const aiRes = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({
          model: 'deepseek-chat', temperature: 0.8, max_tokens: 2000,
          messages: [
            { role: 'system', content: '你是專業的紫微斗數命理師，善於用溫暖的語言解讀命盤。回答必須使用繁體中文。' },
            { role: 'user', content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (aiRes.ok) {
        const aiJson = await aiRes.json()
        aiAnalysis = aiJson.choices?.[0]?.message?.content || ''
      }
    } catch {
      // DeepSeek 失敗，嘗試 Kimi
      try {
        const kimiRes = await fetch(KIMI_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
          body: JSON.stringify({
            model: 'moonshot-v1-auto', temperature: 0.8, max_tokens: 2000,
            messages: [
              { role: 'system', content: '你是專業的紫微斗數命理師。回答必須使用繁體中文。' },
              { role: 'user', content: `請為命宮${mainStar}（${profile.nature}）、${yearTG}年生的${gender === 'M' ? '男' : '女'}性做800字紫微斗數解讀。` },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (kimiRes.ok) {
          const kimiJson = await kimiRes.json()
          aiAnalysis = kimiJson.choices?.[0]?.message?.content || ''
        }
      } catch { /* AI 全部失敗，使用靜態內容 */ }
    }

    // 記錄用戶分析（去重）
    if (name && year && month && day) {
      const analyticsSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      )
      analyticsSupabase.from('user_analytics').upsert({
        name, birth_year: year, birth_month: month, birth_day: day, source: 'free-ziwei',
      }, { onConflict: 'name,birth_year,birth_month,birth_day' }).then(() => {}, () => {})
    }

    return NextResponse.json({
      mainStar,
      starNature: profile.nature,
      personality: profile.personality,
      strengths: profile.strengths,
      challenges: profile.challenges,
      career: profile.career,
      love: profile.love,
      palaceStars: (pythonData as Record<string, unknown>)?.palaces || {},
      sihua,
      yearTG,
      wuxingju: (pythonData as Record<string, unknown>)?.wuxing_ju || '',
      aiAnalysis,
      hasAi: !!aiAnalysis,
      pythonData,
    })
  } catch (err) {
    console.error('紫微速算錯誤:', err)
    return NextResponse.json({ detail: '分析失敗，請稍後再試' }, { status: 500 })
  }
}
