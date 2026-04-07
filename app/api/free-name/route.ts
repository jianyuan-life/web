import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OpenCC from 'opencc-js'

// ============================================================
// 免費姓名學速算 — 五格剖象法 + DeepSeek AI 解讀
// ============================================================

// 簡體→繁體轉換器（查康熙筆畫前用）
const s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' })

const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6b1936d5aef34413b4742b3269332c33'
const KIMI_API = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_KEY = process.env.KIMI_API_KEY || 'sk-gOORAMUexDoitHPlMnVP2obKAsKztgMcZc0LerOGpPL2TfXA'

// ── 康熙筆畫對照表（常用字，簡化版）──
// 完整版應查詢資料庫，這裡用 Unicode CJK 筆畫近似
const SPECIAL_STROKES: Record<string, number> = {
  // 常見姓氏
  '王':4,'李':7,'張':11,'劉':15,'陳':16,'楊':13,'黃':12,'趙':14,'周':8,'吳':7,
  '徐':10,'孫':10,'朱':6,'馬':10,'胡':11,'郭':15,'林':8,'何':7,'高':10,'梁':11,
  '鄭':19,'羅':20,'宋':7,'謝':17,'唐':10,'韓':17,'曹':11,'許':11,'鄧':19,'蕭':18,
  '馮':12,'曾':12,'程':12,'蔡':17,'彭':12,'潘':16,'袁':10,'於':3,'董':15,'余':7,
  '蘇':22,'葉':15,'呂':7,'魏':18,'蔣':17,'田':5,'杜':7,'丁':2,'沈':8,'姜':9,
  '范':15,'江':7,'傅':12,'鍾':17,'盧':16,'汪':8,'戴':18,'崔':11,'任':6,'陸':16,
  '廖':14,'姚':9,'方':4,'金':8,'邱':12,'夏':10,'譚':19,'石':5,'賈':13,'鄒':17,
  '熊':14,'孟':8,'秦':10,'閻':16,'薛':19,'侯':9,'雷':13,'白':5,'龍':16,'段':9,
  '郝':14,'孔':4,'邵':12,'史':5,'毛':4,'常':11,'萬':15,'顧':21,'賴':16,'武':8,
  '康':11,'賀':12,'嚴':20,'尹':4,'錢':16,'施':9,'牛':4,'洪':10,'龔':22,
  // 常用字（排除已在姓氏中列出的字）
  '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,
  '大':3,'小':3,'中':4,'上':3,'下':3,'天':4,'地':6,'人':2,'日':4,'月':4,
  '水':4,'火':4,'木':4,'土':3,'山':3,'雨':8,'風':9,
  '花':10,'草':12,'樹':16,'雲':12,'雪':11,'星':9,'海':11,'河':9,'湖':13,
  '明':8,'光':6,'亮':9,'美':9,'好':6,'愛':13,'心':4,'思':9,'志':7,'德':15,
  '才':4,'學':16,'智':12,'慧':15,'仁':4,'義':13,'禮':18,'信':9,
  '忠':8,'孝':7,'勇':9,'強':12,'安':6,'和':8,'平':5,'福':14,'祿':13,'壽':14,
  '富':12,'貴':12,'吉':6,'祥':11,'瑞':14,'豐':18,'盛':12,'昌':8,'榮':14,'華':14,
  '國':11,'家':10,'成':7,'功':5,'建':9,'立':5,'新':13,'生':5,'長':8,'永':5,
  '東':8,'南':9,'西':6,'北':5,
  '子':3,'女':3,'男':7,'兒':8,'嬰':17,
  '詩':13,'書':10,'禪':17,'道':16,'玄':5,'靈':24,'聖':13,'賢':15,
  '雅':12,'麗':19,'婷':12,'芳':10,'潔':16,'瑩':15,'琳':13,'珊':10,'佳':8,'怡':9,
  '俊':9,'傑':12,'偉':11,'豪':14,'軒':10,'宇':6,'浩':11,'博':12,'翔':12,'鑫':24,
  '嘉':14,'欣':8,'凱':12,'晨':11,'昊':8,'睿':14,'哲':10,'彥':9,'澤':17,'銘':14,
  '雯':12,'涵':12,'萱':15,'琪':13,'妍':7,'薇':19,'晴':12,'夢':14,'穎':16,'蕊':18,
  // 補充常用名字字（命理研究部門康熙筆畫表）
  '宣':9,'逸':15,'紀':9,'宥':9,'諄':16,'尊':12,'玲':10,'芸':10,'柔':9,'蓉':16,
  '宸':10,'恆':10,'毅':15,'傲':13,'廷':7,'辰':7,'恩':10,'霖':16,
  '鈞':12,'峻':10,'禹':9,'霆':15,'琦':13,'璇':16,'瑾':16,'璟':17,'瑜':14,'琬':13,
  '綺':14,'蕙':18,'嫻':15,'瑤':15,'筠':13,'韻':19,'璐':18,'萍':14,'蘭':23,'鈺':13,
}

// 根據字取得康熙筆畫（簡化版：查表 → fallback 用 Unicode 近似）
function getStrokes(char: string): number {
  if (SPECIAL_STROKES[char] !== undefined) return SPECIAL_STROKES[char]
  // fallback: 用字符碼近似（不精確，但比隨機好）
  const code = char.charCodeAt(0)
  if (code >= 0x4E00 && code <= 0x9FFF) {
    return ((code - 0x4E00) % 20) + 2  // 2-21 畫近似
  }
  return 1
}

// 五格剖象法計算
function calcWuge(surname: string, givenName: string) {
  const surnameStrokes = [...surname].map(getStrokes)
  const givenStrokes = [...givenName].map(getStrokes)

  const surnameTotal = surnameStrokes.reduce((a, b) => a + b, 0)
  const givenTotal = givenStrokes.reduce((a, b) => a + b, 0)

  // 天格：單姓+1，複姓相加
  const tiange = surname.length === 1 ? surnameTotal + 1 : surnameTotal

  // 人格：姓末字+名首字
  const renge = surnameStrokes[surnameStrokes.length - 1] + givenStrokes[0]

  // 地格：名字各字相加（單名+1）
  const dige = givenName.length === 1 ? givenTotal + 1 : givenTotal

  // 外格：總格-人格+1
  const zongge = surnameTotal + givenTotal
  const waige = Math.max(zongge - renge + 1, 2)

  return { tiange, renge, dige, waige, zongge, surnameStrokes, givenStrokes }
}

// 數理吉凶判定（81 數理循環）
const JIXIONG: Record<number, { level: string; desc: string }> = {
  1: { level: '大吉', desc: '萬物開泰，天地開端之數。大展鴻圖，信用得固。' },
  2: { level: '凶', desc: '混沌未開，一身孤節。動搖不安，根基未固。' },
  3: { level: '大吉', desc: '進退如意，天賦吉運。智勇兼備，名利雙收。' },
  4: { level: '凶', desc: '萬事休止，凶數破敗。進退不自由，獨立缺乏。' },
  5: { level: '大吉', desc: '福祿長壽，種竹成林。陰陽和合，一成大業。' },
  6: { level: '大吉', desc: '天德地祥，安穩吉慶。萬寶朝宗，財源廣進。' },
  7: { level: '吉', desc: '剛毅果斷，精力充沛。排除萬難，一舉成功。' },
  8: { level: '吉', desc: '意志堅固，努力發展。富於進取，志氣不凡。' },
  9: { level: '凶', desc: '利去功空，窮迫逆境。如無智謀，難望成功。' },
  10: { level: '凶', desc: '烏雲遮月，暗淡無光。空費心力，做事無功。' },
  11: { level: '大吉', desc: '旱苗逢雨，枯木逢春。萬事順意，興隆昌盛。' },
  12: { level: '凶', desc: '薄弱無力，孤立無援。外祥內苦，困難重重。' },
  13: { level: '大吉', desc: '才藝多能，天賦奇才。學問充足，智略超群。' },
  14: { level: '凶', desc: '破兆家庭，孤獨遭難。離祖別親，沈滯逆境。' },
  15: { level: '大吉', desc: '福壽圓滿，富貴榮譽。慈祥有德，繁榮興家。' },
  16: { level: '大吉', desc: '貴人得助，財帛豐盈。興家聚財，名利雙收。' },
  17: { level: '吉', desc: '排除困難，突破萬難。剛柔兼備，權威顯達。' },
  18: { level: '大吉', desc: '權威顯達，博得名利。經商做官，大展鴻圖。' },
  19: { level: '凶', desc: '成功雖早，慎防虧空。內外不和，障礙重重。' },
  20: { level: '凶', desc: '非業破運，災難重重。進退維谷，萬事難成。' },
  21: { level: '大吉', desc: '光風霽月，萬物豐成。獨立權威，大展才華。' },
  22: { level: '凶', desc: '秋草逢霜，懷才不遇。百事不如意，志向半途。' },
  23: { level: '大吉', desc: '旭日東昇，質實剛堅。博學多才，事業有成。' },
  24: { level: '大吉', desc: '錦繡前程，須靠自力。多用智謀，能奏大功。' },
  25: { level: '吉', desc: '天時地利，資性英敏。才略智謀，奏功洋洋。' },
  26: { level: '凶帶吉', desc: '波瀾起伏，變幻莫測。凌駕萬難，必可成功。' },
  27: { level: '凶帶吉', desc: '欲望太強，自我矛盾。多受誹謗，尚可成功。' },
  28: { level: '凶', desc: '如水浮萍，離祖漂泊。遭難不安，骨肉分離。' },
  29: { level: '吉', desc: '財力歸身，享天之福。事事如意，大獲成功。' },
  30: { level: '凶帶吉', desc: '吉凶參半，投機取巧。如能守正，可保平安。' },
  31: { level: '大吉', desc: '智勇得志，博得名利。統領眾人，繁榮富貴。' },
  32: { level: '大吉', desc: '僥倖多望，貴人得助。財帛裕如，繁榮興旺。' },
  33: { level: '大吉', desc: '旭日昇天，鸞鳳相會。名聞天下，隆昌至極。' },
  35: { level: '吉', desc: '溫良和順，智達通暢。文昌技藝，奏功洋洋。' },
  37: { level: '大吉', desc: '猛虎出林，權威顯達。忠誠仁慈，德望成就。' },
  39: { level: '大吉', desc: '富貴榮華，財帛豐盈。暗藏險象，德澤大眾。' },
  41: { level: '大吉', desc: '純陽獨秀，天賦吉運。和順暢達，大展鴻圖。' },
  45: { level: '大吉', desc: '新生泰和，順風揚帆。智謀經緯，萬事如意。' },
  47: { level: '大吉', desc: '有貴人助，點石成金。開花之象，得人仰望。' },
  48: { level: '大吉', desc: '美化豐實，鶴立雞群。名利俱全，繁榮富貴。' },
  52: { level: '吉', desc: '卓識達眼，先見之明。計劃周到，有望成功。' },
  57: { level: '吉', desc: '日照春松，寒雪青松。努力發展，必獲成功。' },
  61: { level: '吉', desc: '名利雙收，繁榮昌盛。無奈傲慢，藏有暗凶。' },
  63: { level: '大吉', desc: '萬物化育，繁榮之象。專心一意，必能成功。' },
  65: { level: '大吉', desc: '富貴長壽，事事如意。自如自在，步步高升。' },
  67: { level: '吉', desc: '獨營商業，利路亨通。經緯四方，財帛裕如。' },
  68: { level: '大吉', desc: '思慮周密，興家立業。發明智慧，大獲成功。' },
  73: { level: '吉', desc: '高志卓識，德望成就。安富尊榮，享天之福。' },
  75: { level: '吉', desc: '守退為吉，急進不利。計劃周密，安富尊榮。' },
  81: { level: '大吉', desc: '萬物回春，天地開泰。繁榮昌盛，再興大業。' },
}

function getJixiong(num: number): { level: string; desc: string } {
  const n = num > 81 ? ((num - 1) % 80) + 1 : num
  if (JIXIONG[n]) return JIXIONG[n]
  // 未列出的數理，簡化判定
  if ([34,36,38,40,42,43,44,46,49,50,53,54,55,56,58,59,60,62,64,66,69,70,71,72,74,76,77,78,79,80].includes(n)) {
    return { level: '凶', desc: '此數理較為波折，宜以德行化解，注意人際和事業方向。' }
  }
  return { level: '吉', desc: '此數理較為平穩，勤勉努力可有所成就。' }
}

// 五行對應
function numToWuxing(n: number): string {
  const last = n % 10
  if (last === 1 || last === 2) return '木'
  if (last === 3 || last === 4) return '火'
  if (last === 5 || last === 6) return '土'
  if (last === 7 || last === 8) return '金'
  return '水' // 9, 0
}

// 三才配置
function getSancai(tiange: number, renge: number, dige: number) {
  const t = numToWuxing(tiange)
  const r = numToWuxing(renge)
  const d = numToWuxing(dige)
  return { tian: t, ren: r, di: d, config: `${t}${r}${d}` }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { surname, givenName, gender = 'M', year, month, day } = body

    if (!surname || !givenName) {
      return NextResponse.json({ detail: '請提供姓和名' }, { status: 400 })
    }

    // 保留用戶原始輸入（可能是簡體），用於前端顯示
    const originalSurname = surname
    const originalGivenName = givenName
    const originalFullName = originalSurname + originalGivenName

    // 轉繁體查康熙筆畫（康熙字典用繁體字）
    const tcSurname = s2tConverter(surname)
    const tcGivenName = s2tConverter(givenName)

    // 五格計算（用繁體字查筆畫）
    const wuge = calcWuge(tcSurname, tcGivenName)
    const fullName = originalFullName

    // 各格吉凶
    const tiangeJx = getJixiong(wuge.tiange)
    const rengeJx = getJixiong(wuge.renge)
    const digeJx = getJixiong(wuge.dige)
    const waigeJx = getJixiong(wuge.waige)
    const zonggeJx = getJixiong(wuge.zongge)

    // 三才配置
    const sancai = getSancai(wuge.tiange, wuge.renge, wuge.dige)

    // 五行
    const tiangeWx = numToWuxing(wuge.tiange)
    const rengeWx = numToWuxing(wuge.renge)
    const digeWx = numToWuxing(wuge.dige)
    const waigeWx = numToWuxing(wuge.waige)
    const zonggeWx = numToWuxing(wuge.zongge)

    // 綜合評分（基於五格吉凶）
    const scoreMap: Record<string, number> = { '大吉': 95, '吉': 82, '凶帶吉': 65, '凶': 40 }
    const scores = [tiangeJx, rengeJx, digeJx, waigeJx, zonggeJx].map(jx => scoreMap[jx.level] || 60)
    // 人格和總格權重最高
    const totalScore = Math.round(scores[0] * 0.1 + scores[1] * 0.3 + scores[2] * 0.2 + scores[3] * 0.1 + scores[4] * 0.3)

    // DeepSeek AI 深度解讀
    let aiAnalysis = ''
    try {
      const prompt = `你是一位姓名學大師。請根據以下姓名分析結果，用溫暖親切的口吻為「${fullName}」做一段深度解讀（約600字）。

姓名：${fullName}（${gender === 'M' ? '男' : '女'}）
天格 ${wuge.tiange}（${tiangeWx}）— ${tiangeJx.level}
人格 ${wuge.renge}（${rengeWx}）— ${rengeJx.level}：${rengeJx.desc}
地格 ${wuge.dige}（${digeWx}）— ${digeJx.level}：${digeJx.desc}
外格 ${wuge.waige}（${waigeWx}）— ${waigeJx.level}
總格 ${wuge.zongge}（${zonggeWx}）— ${zonggeJx.level}：${zonggeJx.desc}
三才配置：${sancai.config}（${sancai.tian}-${sancai.ren}-${sancai.di}）
綜合評分：${totalScore}/100

請包含：
1. 姓名整體評價（從五格數理綜合分析）
2. 人格解讀（性格、天賦、人際）
3. 事業和財運暗示
4. 感情和家庭運
5. 改善建議（如果有凶格）

語氣要溫暖親切。不要用「您好」開頭，直接進入分析。`

      const aiRes = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({
          model: 'deepseek-chat', temperature: 0.8, max_tokens: 2000,
          messages: [
            { role: 'system', content: '你是專業的姓名學命理師，善於用溫暖的語言解讀姓名五格。回答必須使用繁體中文。' },
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
      try {
        const kimiRes = await fetch(KIMI_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
          body: JSON.stringify({
            model: 'moonshot-v1-auto', temperature: 0.8, max_tokens: 2000,
            messages: [
              { role: 'system', content: '你是專業的姓名學命理師。回答必須使用繁體中文。' },
              { role: 'user', content: `請為「${fullName}」（人格${wuge.renge}${rengeJx.level}、總格${wuge.zongge}${zonggeJx.level}）做600字姓名學解讀。` },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (kimiRes.ok) {
          const kimiJson = await kimiRes.json()
          aiAnalysis = kimiJson.choices?.[0]?.message?.content || ''
        }
      } catch { /* AI 全部失敗 */ }
    }

    // 記錄用戶分析（去重）
    if (fullName && year && month && day) {
      const analyticsSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      )
      analyticsSupabase.from('user_analytics').upsert({
        name: fullName, birth_year: year, birth_month: month, birth_day: day, source: 'free-name',
      }, { onConflict: 'name,birth_year,birth_month,birth_day' }).then(() => {}, () => {})
    }

    return NextResponse.json({
      fullName: originalFullName,
      surname: originalSurname,
      givenName: originalGivenName,
      surnameStrokes: wuge.surnameStrokes,
      givenStrokes: wuge.givenStrokes,
      tiange: { value: wuge.tiange, wuxing: tiangeWx, ...tiangeJx },
      renge: { value: wuge.renge, wuxing: rengeWx, ...rengeJx },
      dige: { value: wuge.dige, wuxing: digeWx, ...digeJx },
      waige: { value: wuge.waige, wuxing: waigeWx, ...waigeJx },
      zongge: { value: wuge.zongge, wuxing: zonggeWx, ...zonggeJx },
      sancai,
      totalScore,
      aiAnalysis,
      hasAi: !!aiAnalysis,
    })
  } catch (err) {
    console.error('姓名學速算錯誤:', err)
    return NextResponse.json({ detail: '分析失敗，請稍後再試' }, { status: 500 })
  }
}
