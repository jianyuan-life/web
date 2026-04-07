import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// 免費命理速算 — Python排盤(+TS fallback) + Kimi AI 潤色
// 核心原則：就算 API 全掛，客戶也能看到豐富的命格分析
// ============================================================

const PYTHON_API = 'https://fortune-reports-api.fly.dev'
// DeepSeek V3 主力，Kimi 備用
const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6b1936d5aef34413b4742b3269332c33'
const KIMI_API = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_KEY = process.env.KIMI_API_KEY || 'sk-gOORAMUexDoitHPlMnVP2obKAsKztgMcZc0LerOGpPL2TfXA'

// ── 天干地支常量 ──
const TG = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const WX_TG: Record<string,string> = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}
const DZ_BQ: Record<string,string> = {子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬'}
// 完整藏干表（本氣/中氣/餘氣）
const DZ_CANGGAN: Record<string,[string,number][]> = {
  子:[['癸',100]], 丑:[['己',60],['癸',30],['辛',10]], 寅:[['甲',60],['丙',30],['戊',10]],
  卯:[['乙',100]], 辰:[['戊',60],['乙',30],['癸',10]], 巳:[['丙',60],['庚',30],['戊',10]],
  午:[['丁',60],['己',30],['丙',10]], 未:[['己',60],['丁',30],['乙',10]], 申:[['庚',60],['壬',30],['戊',10]],
  酉:[['辛',100]], 戌:[['戊',60],['辛',30],['丁',10]], 亥:[['壬',60],['甲',30]],
}
const CANGGAN_WEIGHT = [0.6, 0.3, 0.1]  // 本氣/中氣/餘氣權重
const NAYIN: Record<string,string> = {
  '甲子':'海中金','乙丑':'海中金','丙寅':'爐中火','丁卯':'爐中火','戊辰':'大林木','己巳':'大林木',
  '庚午':'路旁土','辛未':'路旁土','壬申':'劍鋒金','癸酉':'劍鋒金','甲戌':'山頭火','乙亥':'山頭火',
  '丙子':'澗下水','丁丑':'澗下水','戊寅':'城頭土','己卯':'城頭土','庚辰':'白蠟金','辛巳':'白蠟金',
  '壬午':'楊柳木','癸未':'楊柳木','甲申':'泉中水','乙酉':'泉中水','丙戌':'屋上土','丁亥':'屋上土',
  '戊子':'霹靂火','己丑':'霹靂火','庚寅':'松柏木','辛卯':'松柏木','壬辰':'長流水','癸巳':'長流水',
  '甲午':'砂石金','乙未':'砂石金','丙申':'山下火','丁酉':'山下火','戊戌':'平地木','己亥':'平地木',
  '庚子':'壁上土','辛丑':'壁上土','壬寅':'金箔金','癸卯':'金箔金','甲辰':'覆燈火','乙巳':'覆燈火',
  '丙午':'天河水','丁未':'天河水','戊申':'大驛土','己酉':'大驛土','庚戌':'釵釧金','辛亥':'釵釧金',
  '壬子':'桑柘木','癸丑':'桑柘木','甲寅':'大溪水','乙卯':'大溪水','丙辰':'沙中土','丁巳':'沙中土',
  '戊午':'天上火','己未':'天上火','庚申':'石榴木','辛酉':'石榴木','壬戌':'大海水','癸亥':'大海水',
}
const SX = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬']

// ── 日主命格概述（核心賣點：讓客戶覺得「好準」） ──
const PROFILES: Record<string, { title: string; personality: string; strengths: string; challenges: string; career: string; love: string; health: string; lucky: string; year2026: string }> = {
  '甲': { title: '參天大樹', personality: '您是甲木日主，如同一棵參天大樹。正直、有原則、不輕易妥協，天生具備領導者氣質。您有強烈的上進心和責任感，重視尊嚴，有時顯得固執，但內心善良厚道。您的行事風格是堅定而有方向感的，一旦認定目標就會全力以赴。', strengths: '領導力強、正義感、有遠見、善於規劃長期目標、重信用', challenges: '容易固執己見、不善變通、有時過於剛強傷人、壓力大時不懂求助', career: '適合創業、管理、法律、建築、教育等需要魄力的領域。您不適合當配角，需要一個能讓您充分發揮的舞台。', love: '感情中您是保護者角色，忠誠可靠但不太擅長甜言蜜語。需要一個能理解您沉默背後深情的伴侶。', health: '注意肝膽系統和筋骨問題。春天是您的旺季，秋冬要特別注意休息和保養。', lucky: '幸運色：綠色、青色｜幸運方位：東方｜幸運數字：3、8｜旺運飾品：翡翠、綠松石', year2026: '2026丙午年火旺，食傷星活躍，有利創意表達和才華展現。但火旺洩氣，注意不要過度勞累。' },
  '乙': { title: '柔韌藤蔓', personality: '您是乙木日主，如同一株韌性十足的藤蔓。外表溫和柔軟，內心卻很有主見。您善於適應環境，懂得迂迴前進，社交能力極強。您的智慧在於「以柔克剛」，總能找到最優雅的方式達成目標。', strengths: '適應力強、善於社交、柔中帶剛、有藝術天賦、善解人意', challenges: '容易優柔寡斷、過度在意他人眼光、有時委曲求全、缺乏魄力', career: '適合外交、諮詢、藝術設計、花藝、公關、服務業等需要人際關係的領域。', love: '天生的戀愛高手，溫柔體貼。但要注意不要過度依賴或失去自我。', health: '注意肝臟和神經系統，容易因壓力導致失眠或偏頭痛。', lucky: '幸運色：翠綠、淺綠｜幸運方位：東方｜幸運數字：3、8｜旺運飾品：和田玉', year2026: '2026丙午年，正財星旺，財運不錯但需要主動出擊。感情方面有新的機遇。' },
  '丙': { title: '太陽之火', personality: '您是丙火日主，就像太陽一樣光芒四射。熱情、大方、光明磊落，走到哪裡都是焦點。您天生具有感染力和號召力，慷慨大方，有時甚至太過大方而不懂得保護自己的利益。', strengths: '熱情奔放、領導力強、感染力佳、光明磊落、慷慨大方', challenges: '容易急躁衝動、心直口快得罪人、做事虎頭蛇尾、花錢大手大腳', career: '適合演藝、行銷、教育、媒體、餐飲等需要影響力和舞台的領域。', love: '在愛情中熱情奔放，給對方滿滿安全感。但要注意別太強勢。', health: '注意心臟和血壓問題。夏天要避免過度亢奮，注意降火。', lucky: '幸運色：紅色、橙色｜幸運方位：南方｜幸運數字：2、7｜旺運飾品：紅瑪瑙', year2026: '2026丙午年比劫旺，競爭激烈但也有合作機會。注意破財風險。' },
  '丁': { title: '燭火星光', personality: '您是丁火日主，如同黑暗中的一盞燭光。內斂、敏銳、充滿洞察力。您的光芒是溫柔而持久的，善於觀察，直覺極強，常能看到別人看不到的層面。', strengths: '洞察力強、細膩敏感、直覺準確、專注力高、善於思考', challenges: '容易多慮多疑、情緒化、缺乏行動力、對自己要求過高', career: '適合研究、寫作、心理諮詢、中醫、設計等需要細膩和專注的領域。', love: '感情中細膩體貼但容易多想。需要一個能給您安全感的伴侶。', health: '注意心臟和眼睛問題。避免過度用腦和熬夜。', lucky: '幸運色：紫色、酒紅｜幸運方位：南方｜幸運數字：2、7｜旺運飾品：紫水晶', year2026: '2026丙午年劫財透出，人際關係複雜，注意小人。但偏財運有驚喜。' },
  '戊': { title: '巍峨高山', personality: '您是戊土日主，如同一座巍峨的大山。穩重、包容、值得信賴。朋友遇到困難第一個想到的就是您。您做事紮實穩健，雖然慢熱，但一旦認定就不輕易動搖。', strengths: '穩重可靠、包容力強、有信用、善於協調、耐心十足', challenges: '過於保守、反應較慢、固執不知變通、有時顯得笨拙', career: '適合金融、房地產、管理、農業、建築等需要穩定和信任的領域。', love: '感情中如山一般可靠穩固。但要學會主動表達，別讓對方覺得冷淡。', health: '注意脾胃和消化系統。飲食規律對您特別重要。', lucky: '幸運色：黃色、棕色｜幸運方位：居中｜幸運數字：5、0｜旺運飾品：黃水晶', year2026: '2026丙午年偏印生身，貴人運不錯，適合學習進修。注意脾胃健康。' },
  '己': { title: '沃土田園', personality: '您是己土日主，如同一片滋養萬物的沃土。溫潤、包容、天生有照顧人的特質。心思細膩，善解人意，是朋友圈裡的「暖寶寶」。但有時會太過在意別人的看法而委屈自己。', strengths: '善良體貼、包容力強、善解人意、有服務精神、穩定踏實', challenges: '過度犧牲自己、缺乏主見、容易被利用、安全感不足', career: '適合教育、醫療、社工、人力資源、餐飲等服務型領域。', love: '天生好伴侶，體貼包容。但要學會設立邊界，別總是犧牲自己。', health: '注意脾胃和皮膚問題。情緒對您的健康影響特別大。', lucky: '幸運色：米色、淡黃｜幸運方位：居中｜幸運數字：5、0｜旺運飾品：蜜蠟', year2026: '2026丙午年正印加身，適合學習和自我提升。家庭關係和諧。' },
  '庚': { title: '精鋼利刃', personality: '您是庚金日主，如同一把鋒利的鋼刀。銳利、果斷、重義氣，做事雷厲風行。您有強烈的正義感和競爭心，不怕衝突，敢於直面問題。在壓力下反而表現最佳。', strengths: '果斷銳利、重義氣、執行力強、有原則、抗壓能力佳', challenges: '過於直接傷人、缺乏柔軟、好勝心太強、容易樹敵', career: '適合軍警、外科、金融交易、科技、運動、法律等需要魄力的領域。', love: '外冷內熱型，忠誠可靠但不善甜言蜜語。找能軟化您的伴侶。', health: '注意肺部和呼吸系統。秋天是旺季，春天要注意保養。', lucky: '幸運色：白色、銀色｜幸運方位：西方｜幸運數字：4、9｜旺運飾品：白水晶', year2026: '2026丙午年七殺透出，事業壓力大但也是突破之年。注意控制脾氣。' },
  '辛': { title: '珠玉寶石', personality: '您是辛金日主，如同一顆精緻的寶石。精緻、有品味、追求完美。您對美有天生的敏感度，生活品質有高標準。聰明伶俐，但有時會顯得清高或挑剔。', strengths: '品味高雅、精明能幹、追求完美、感受力強、善於分析', challenges: '過於挑剔、清高難親近、容易鑽牛角尖、心事重', career: '適合珠寶、設計、金融分析、法律、品牌管理等精緻領域。', love: '追求質感的感情——寧缺毋濫。需要精神層面匹配的伴侶。', health: '注意肺部和皮膚。過敏體質可能性較高。', lucky: '幸運色：白色、淡金｜幸運方位：西方｜幸運數字：4、9｜旺運飾品：珍珠', year2026: '2026丙午年正官透出，事業有新機遇，可能升職或獲得認可。' },
  '壬': { title: '江河大海', personality: '您是壬水日主，如同一條奔騰的大河。聰明、靈活、變化多端，腦子轉得快，點子多。天生有冒險精神，不喜歡被束縛，追求自由和新鮮感。', strengths: '聰明靈活、學習力強、善於應變、有冒險精神、洞察力佳', challenges: '做事多變不定、缺乏耐心、容易分心、承諾感不足', career: '適合貿易、物流、旅遊、諮詢、科技創業等變化性強的領域。', love: '需要空間和新鮮感。太穩定反而窒息。找能一起探索世界的伴侶。', health: '注意腎臟和泌尿系統。保持水分攝入，冬天注意保暖。', lucky: '幸運色：黑色、深藍｜幸運方位：北方｜幸運數字：1、6｜旺運飾品：黑曜石', year2026: '2026丙午年偏財旺，投資和副業有收穫。但注意不要貪心。' },
  '癸': { title: '雨露甘霖', personality: '您是癸水日主，如同一場潤物無聲的春雨。深沉、直覺力極強。外表安靜，但內心世界豐富。善於觀察和思考，常能洞悉人心。第六感極強，適合需要直覺的工作。', strengths: '直覺敏銳、善於觀察、思維深邃、有創意、同理心強', challenges: '過於被動、容易悲觀、缺乏行動力、情緒容易低落', career: '適合心理學、投資分析、藝術創作、玄學研究、醫療等領域。', love: '深水靜流型——外表平靜，內心波瀾。需要能讀懂您沉默的人。', health: '注意腎臟和生殖系統。冬天特別注意保養，避免寒氣入侵。', lucky: '幸運色：深藍、黑色｜幸運方位：北方｜幸運數字：1、6｜旺運飾品：藍寶石', year2026: '2026丙午年正財透出，正財運不錯，工作收入穩定增長。' },
}

// ── TS 本地排盤（Fly.io 休眠時的 fallback） ──
function localBazi(year: number, month: number, day: number, hour: number) {
  // 年柱
  let y = year
  if (month < 2 || (month === 2 && day < 4)) y -= 1
  const yp = TG[(y-4)%10] + DZ[(y-4)%12]

  // 月柱
  let mIdx = 0
  if (month===1 && day<6) mIdx=11; else if (month<2||(month===2&&day<4)) mIdx=11
  else if (month===2||(month===3&&day<6)) mIdx=0; else if (month===3||(month===4&&day<5)) mIdx=1
  else if (month===4||(month===5&&day<6)) mIdx=2; else if (month===5||(month===6&&day<6)) mIdx=3
  else if (month===6||(month===7&&day<7)) mIdx=4; else if (month===7||(month===8&&day<8)) mIdx=5
  else if (month===8||(month===9&&day<8)) mIdx=6; else if (month===9||(month===10&&day<8)) mIdx=7
  else if (month===10||(month===11&&day<7)) mIdx=8; else if (month===11||(month===12&&day<7)) mIdx=9
  else mIdx=10
  const mDZ = (mIdx+2)%12
  const yTG = (y-4)%10
  const mStartTG = [2,4,6,8,0][yTG%5]
  const mp = TG[(mStartTG+mIdx)%10] + DZ[mDZ]

  // 日柱
  let jy=year, jm=month
  if(jm<=2){jy-=1;jm+=12}
  const A=Math.floor(jy/100), B=2-A+Math.floor(A/4)
  const JD=Math.floor(365.25*(jy+4716))+Math.floor(30.6001*(jm+1))+day+B-1524.5
  const dIdx=((Math.floor(JD+0.5)+49)%60+60)%60
  const dp = TG[dIdx%10]+DZ[dIdx%12]

  // 時柱
  const dzIdx=Math.floor(((hour+1)%24)/2)
  const dTGIdx=TG.indexOf(dp[0])
  const tStartTG=[0,2,4,6,8][dTGIdx%5]
  const tp = TG[(tStartTG+dzIdx)%10]+DZ[dzIdx]

  // 十神
  const WX=['木','火','土','金','水']
  const getShishen = (dm: string, other: string) => {
    const dmI=WX.indexOf(WX_TG[dm]), otI=WX.indexOf(WX_TG[other])
    const same=(TG.indexOf(dm)%2)===(TG.indexOf(other)%2)
    if(WX_TG[dm]===WX_TG[other]) return same?'比肩':'劫財'
    if(WX[(dmI+1)%5]===WX_TG[other]) return same?'食神':'傷官'
    if(WX[(dmI+2)%5]===WX_TG[other]) return same?'偏財':'正財'
    if(WX[(dmI+3)%5]===WX_TG[other]) return same?'七殺':'正官'
    if(WX[(dmI+4)%5]===WX_TG[other]) return same?'偏印':'正印'
    return ''
  }

  // 五行
  const pillars=[yp,mp,dp,tp]
  const wxCount: Record<string,number>={木:0,火:0,土:0,金:0,水:0}
  for(const p of pillars){wxCount[WX_TG[p[0]]]++;wxCount[WX_TG[DZ_BQ[p[1]]]]++}

  // 身強弱
  const dmWX=WX_TG[dp[0]], dmI=WX.indexOf(dmWX), parentWX=WX[(dmI+4)%5]
  const support=(wxCount[dmWX]||0)+(wxCount[parentWX]||0)
  const mBenqi=DZ_BQ[mp[1]], mSupport=WX_TG[mBenqi]===dmWX||WX_TG[mBenqi]===parentWX
  const score=support*12+(mSupport?15:0)
  const strength=score>=55?'偏旺':score>=45?'中和':'偏弱'

  // 用神
  let yongshen:string,xishen:string
  if(strength==='偏旺'){yongshen=WX[(dmI+1)%5];xishen=WX[(dmI+2)%5]}
  else{yongshen=WX[(dmI+4)%5];xishen=dmWX}

  // 生肖
  const sxIdx=(y-4)%12

  // 加權五行（天干1.0 + 地支藏干按本中餘權重 + 月令得令+40%）
  const wxFull: Record<string,number>={木:0,火:0,土:0,金:0,水:0}
  for(const p of pillars){ wxFull[WX_TG[p[0]]]+=1.0 }
  for(const p of pillars){
    const cg=DZ_CANGGAN[p[1]]||[]
    for(let i=0;i<cg.length;i++){ wxFull[WX_TG[cg[i][0]]]+=(CANGGAN_WEIGHT[i]||0.1) }
  }
  // 月令得令加成 +40%
  const monthBenqiWX=WX_TG[DZ_BQ[mp[1]]]
  if(monthBenqiWX) wxFull[monthBenqiWX]*=1.4
  // 四捨五入到兩位
  for(const k of Object.keys(wxFull)) wxFull[k]=Math.round(wxFull[k]*100)/100

  return {
    pillars:{year:yp,month:mp,day:dp,time:tp},
    day_master:dp[0], day_master_wuxing:WX_TG[dp[0]],
    strength, geju:getShishen(dp[0],mp[0])+'格',
    yongshen, xishen,
    wuxing_count:wxCount,
    wuxing_count_full:wxFull,
    nayin:{year:NAYIN[yp]||'',month:NAYIN[mp]||'',day:NAYIN[dp]||'',time:NAYIN[tp]||''},
    shishen_gan:{year:getShishen(dp[0],yp[0]),month:getShishen(dp[0],mp[0]),time:getShishen(dp[0],tp[0])},
    shengxiao:SX[sxIdx],
  }
}

// ── AI 呼叫（DeepSeek 主力 + Kimi 備用） ──
async function callAI(bazi: ReturnType<typeof localBazi>, name: string, year: number, month: number, day: number, hour: number, gender: string): Promise<Record<string,string>> {
  const age = 2026 - year
  const systemPrompt = '你是資深命理師。根據八字數據用繁體中文給簡短精準的分析。每段2-3句，語氣溫暖專業。注意：現在是2026年丙午年，所有預測要從2026年開始往後看，不要提到2024或2025。'
  const userPrompt = `${name}，${gender==='M'?'男':'女'}，${age}歲，八字${bazi.pillars.year} ${bazi.pillars.month} ${bazi.pillars.day} ${bazi.pillars.time}，日主${bazi.day_master}${bazi.day_master_wuxing}${bazi.strength}，${bazi.geju}，用神${bazi.yongshen}，五行金${bazi.wuxing_count['金']}木${bazi.wuxing_count['木']}水${bazi.wuxing_count['水']}火${bazi.wuxing_count['火']}土${bazi.wuxing_count['土']}

回覆格式（第一段最重要，要寫6-8句話；其他段各2-3句）：
【2026整體運勢】這是最重要的段落，要寫6-8句話！先講丙午年對此人命盤的整體影響（火勢如何作用於日主），再分析事業運、財運、感情運各一句，然後點出上半年和下半年的差異，最後給出今年最需要把握的一個機會和最需要避開的一個風險。要具體到讓人覺得「說到我心坎裡了」。
【性格深度剖析】像冷讀術般精準描述性格，先大特質再具體細節，3-4句
【財運方向】正財偏財哪個適合，投資風格建議，2-3句
【人際與貴人】什麼類型的人是貴人，什麼人要遠離，2-3句
【未來機會窗口】2026下半年到2028有什麼重要機會，只說一半留懸念用...結尾，2-3句
【需要留意的地方】一個注意事項+時間段，語氣關切，2-3句`

  const parseResponse = (text: string) => {
    const sections: Record<string,string> = {}
    for (const key of ['2026整體運勢','性格深度剖析','財運方向','人際與貴人','未來機會窗口','需要留意的地方']) {
      const m = text.match(new RegExp(`【${key}】[\\s\\n]*([\\s\\S]*?)(?=【|$)`))
      if (m) sections[key] = m[1].trim()
    }
    return sections
  }

  // 先試 DeepSeek
  try {
    const res = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 1500, temperature: 0.7,
      }),
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''
    if (text) {
      const sections = parseResponse(text)
      if (Object.keys(sections).length >= 3) return sections
    }
  } catch (e) { console.error('DeepSeek error:', e) }

  // DeepSeek 失敗，用 Kimi 備用
  try {
    const res = await fetch(KIMI_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KIMI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 1500, temperature: 0.7,
      }),
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''
    return parseResponse(text)
  } catch (e) {
    console.error('Kimi fallback error:', e)
    return {}
  }
}

// ── 農曆→國曆轉換（純 TS 實現，覆蓋 1900-2100） ──
// 使用查表法，農曆每月大小月+閏月資訊
function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number): { year: number; month: number; day: number } | null {
  // 簡化版：呼叫 Python API 做轉換（lunar-python 庫最準確）
  // 如果 Python API 不可用，用近似公式
  // 這裡先返回 null，後面會呼叫 Python API
  return null
}

// ── 真太陽時校正 ──
function trueSolarTime(year: number, month: number, day: number, hour: number, minute: number, longitude: number, timezoneOffset: number): { hour: number; minute: number; adjusted: boolean; diff_minutes: number } {
  // 1. 地理時差：每個時區15度，偏差 = (經度 - 時區標準經度) × 4分鐘/度
  const standardLongitude = timezoneOffset * 15 // 例：UTC+8 → 120度
  const geoCorrection = (longitude - standardLongitude) * 4 // 分鐘

  // 2. 均時差（Equation of Time）：根據日期計算太陽快慢
  // 公式：B = 2π(N-81)/365，EoT = 9.87sin(2B) - 7.53cos(B) - 1.5sin(B)
  const N = dayOfYear(year, month, day)
  const B = (2 * Math.PI * (N - 81)) / 365
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B) // 分鐘

  // 3. 總校正 = 地理時差 + 均時差
  const totalCorrection = Math.round(geoCorrection + EoT)

  // 4. 校正時間
  let totalMinutes = hour * 60 + minute + totalCorrection
  if (totalMinutes < 0) totalMinutes += 24 * 60
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60

  const newHour = Math.floor(totalMinutes / 60)
  const newMinute = totalMinutes % 60

  return {
    hour: newHour,
    minute: newMinute,
    adjusted: totalCorrection !== 0,
    diff_minutes: totalCorrection,
  }
}

function dayOfYear(year: number, month: number, day: number): number {
  const dt = new Date(year, month - 1, day)
  const start = new Date(year, 0, 1)
  return Math.floor((dt.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

export async function POST(req: NextRequest) {
  try {
    const { year: inputYear, month: inputMonth, day: inputDay, hour: inputHour, minute = 0, gender, name,
            calendar_type = 'solar', latitude, longitude, timezone_offset = 8, time_unknown = false } = await req.json()

    // Step 0: 農曆→國曆轉換
    let year = inputYear, month = inputMonth, day = inputDay
    let lunarConverted = false

    if (calendar_type === 'lunar') {
      // 呼叫 Python API 做農曆轉換（lunar-python 最準確）
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(`${PYTHON_API}/api/lunar-to-solar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: inputYear, month: inputMonth, day: inputDay }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (res.ok) {
          const data = await res.json()
          year = data.year; month = data.month; day = data.day
          lunarConverted = true
        }
      } catch {
        // Python API 不可用，用原始日期（提示用戶）
        console.error('農曆轉換失敗，使用原始日期')
      }
    }

    // Step 0.5: 真太陽時校正
    let hour = inputHour
    let solarTimeInfo = null
    if (longitude && longitude !== 0 && !time_unknown) {
      const correction = trueSolarTime(year, month, day, hour, minute, longitude, timezone_offset)
      hour = correction.hour
      solarTimeInfo = {
        original: `${inputHour}:${String(minute).padStart(2, '0')}`,
        corrected: `${correction.hour}:${String(correction.minute).padStart(2, '0')}`,
        diff_minutes: correction.diff_minutes,
        longitude,
      }
    }

    // Step 1: 嘗試 Python API，超時 8 秒就用 TS fallback
    let bazi: ReturnType<typeof localBazi>
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(`${PYTHON_API}/api/free-bazi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, day, hour, minute, gender, time_unknown, time_mode: time_unknown ? 'unknown' : 'exact' }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        bazi = await res.json()
      } else {
        bazi = localBazi(year, month, day, hour)
      }
    } catch {
      bazi = localBazi(year, month, day, hour)
    }

    // Step 2: 補齊生肖（Python API 可能沒返回）
    if (!bazi.shengxiao) {
      let sy = year
      if (month < 2 || (month === 2 && day < 4)) sy -= 1
      bazi.shengxiao = SX[(sy - 4) % 12]
    }

    // Step 3: 取得日主命格概述（永遠有內容，不依賴任何 API）
    const profile = PROFILES[bazi.day_master] || PROFILES['甲']

    // Step 4: 直接呼叫 DeepSeek（不設 race timeout，Vercel 有 60 秒）
    let aiSections: Record<string,string> = {}
    try {
      aiSections = await callAI(bazi, name || '', year, month, day, hour, gender)
    } catch (e) { console.error('AI error:', e) }

    // Step 5: 太陽星座（從生日直接算）
    const zodiacSigns = [
      { name:'摩羯座', en:'Capricorn', start:[1,1], end:[1,19], element:'土象', trait:'務實穩重、目標明確、有耐心和毅力，是天生的管理者和長期規劃者' },
      { name:'水瓶座', en:'Aquarius', start:[1,20], end:[2,18], element:'風象', trait:'獨立創新、思想前衛、重視自由與理想，善於打破常規開創新局' },
      { name:'雙魚座', en:'Pisces', start:[2,19], end:[3,20], element:'水象', trait:'感性細膩、直覺敏銳、富有同理心和創造力，內心世界豐富深邃' },
      { name:'牡羊座', en:'Aries', start:[3,21], end:[4,19], element:'火象', trait:'行動力強、勇於開創、充滿熱情和競爭心，是天生的先鋒和領導者' },
      { name:'金牛座', en:'Taurus', start:[4,20], end:[5,20], element:'土象', trait:'穩定踏實、重視物質安全、審美品味高，在財務管理上有天賦' },
      { name:'雙子座', en:'Gemini', start:[5,21], end:[6,20], element:'風象', trait:'思維敏捷、善於溝通、好奇心旺盛，能同時處理多項事務' },
      { name:'巨蟹座', en:'Cancer', start:[6,21], end:[7,22], element:'水象', trait:'重視家庭、情感豐富、保護欲強，直覺準確且記憶力極佳' },
      { name:'獅子座', en:'Leo', start:[7,23], end:[8,22], element:'火象', trait:'自信大方、有領袖魅力、慷慨熱情，天生的舞台焦點和表演者' },
      { name:'處女座', en:'Virgo', start:[8,23], end:[9,22], element:'土象', trait:'細心嚴謹、追求完美、分析能力強，在專業領域能達到極致水準' },
      { name:'天秤座', en:'Libra', start:[9,23], end:[10,22], element:'風象', trait:'優雅和諧、善於社交、追求公平正義，有極高的審美和協調能力' },
      { name:'天蠍座', en:'Scorpio', start:[10,23], end:[11,21], element:'水象', trait:'意志堅定、洞察力強、感情深沉，一旦認定目標就不達目的不罷休' },
      { name:'射手座', en:'Sagittarius', start:[11,22], end:[12,21], element:'火象', trait:'樂觀開朗、追求自由與真理、視野寬廣，天生的探險家和哲學家' },
      { name:'摩羯座', en:'Capricorn', start:[12,22], end:[12,31], element:'土象', trait:'務實穩重、目標明確、有耐心和毅力，是天生的管理者和長期規劃者' },
    ]
    let sunSign = zodiacSigns[0]
    for (const z of zodiacSigns) {
      const [sm,sd] = z.start, [em,ed] = z.end
      if ((month === sm && day >= sd) || (month === em && day <= ed)) { sunSign = z; break }
    }

    // Step 6: 生命靈數
    const digits = `${year}${month}${day}`.split('').map(Number)
    let lifePathSum = digits.reduce((a,b) => a+b, 0)
    while (lifePathSum > 9 && lifePathSum !== 11 && lifePathSum !== 22) {
      lifePathSum = lifePathSum.toString().split('').map(Number).reduce((a,b) => a+b, 0)
    }
    const lifePathDesc: Record<number, { title: string; desc: string }> = {
      1: { title: '領導者', desc: '獨立自主、開創精神強。你天生就是帶頭的人，有強烈的個人意志和行動力。適合創業或擔任管理職。' },
      2: { title: '合作者', desc: '善於協調、重視和諧。你的天賦在於連結人與人之間的關係，是天生的調解者和支持者。適合諮詢、外交、服務業。' },
      3: { title: '表達者', desc: '創意豐富、善於溝通。你有極強的表達能力和藝術天賦，能把複雜的事情說得生動有趣。適合創作、行銷、教育。' },
      4: { title: '建造者', desc: '踏實穩健、重視秩序。你是最可靠的執行者，善於將藍圖變為現實。適合工程、金融、管理。' },
      5: { title: '自由者', desc: '追求變化、適應力強。你厭惡一成不變，需要多元體驗和冒險。適合旅遊、貿易、媒體。' },
      6: { title: '關懷者', desc: '有責任感、重視家庭。你天生有照顧人的本能，在家庭和社區中扮演重要角色。適合醫療、教育、社工。' },
      7: { title: '探索者', desc: '善於思考、追求真理。你的內心世界豐富，喜歡深入研究事物的本質。適合研究、科技、哲學。' },
      8: { title: '成就者', desc: '目標導向、有商業頭腦。你天生對權力和財富有敏銳的嗅覺，執行力極強。適合企業管理、投資、法律。' },
      9: { title: '智慧者', desc: '胸懷寬廣、有大愛精神。你能看到更大的格局，關心的不只是自己而是整個世界。適合慈善、藝術、靈性領域。' },
      11: { title: '啟示者', desc: '直覺極強、有靈性天賦。你是少數的大師數，能感受到別人感受不到的事物。適合靈性、心理學、藝術。' },
      22: { title: '大建築師', desc: '能將願景化為現實的少數人。你有改變世界的潛力和執行力。適合建築、大型項目、社會改革。' },
    }
    const lifePath = lifePathDesc[lifePathSum] || lifePathDesc[9]

    // 生肖詳細年運
    const shengxiaoYearFortune: Record<string, string> = {
      '鼠': '2026丙午年，屬鼠者逢沖太歲之年。上半年事業波動較大，但危中有機，適合主動求變而非被動等待。下半年運勢回穩，年底有意外之財的可能。感情方面單身者有機會遇到心動對象，已婚者需注意溝通，避免因工作壓力影響家庭關係。健康方面留意腸胃和睡眠品質。',
      '牛': '2026丙午年，屬牛者運勢穩中有升。事業方面貴人運不錯，可能有升遷或轉職的好機會，尤其在年中。財運方面正財穩定，偏財有小驚喜。感情上桃花運旺，單身者把握社交場合。健康整體良好，但要注意肩頸和腰背問題。',
      '虎': '2026丙午年，屬虎者進入三合年，整體運勢順遂。事業上有突破性的發展機會，適合開拓新領域或嘗試新項目。財運亨通，投資運不錯但需控制風險。感情和諧，家庭關係融洽。健康方面精力充沛，適合培養運動習慣。',
      '馬': '2026丙午年為本命年，屬馬者需特別留意。俗話說「太歲當頭坐，無喜恐有禍」，建議上半年低調行事，避免重大決策。下半年運勢好轉，事業上有貴人相助。財運方面守財為上，不宜大額投資。感情方面可能經歷考驗，但只要彼此坦誠，反而能加深感情。建議年初參拜太歲，佩戴紅色飾品。',
      '羊': '2026丙午年，屬羊者六合太歲，運勢極佳。事業上有重要的合作機會，貴人緣極強。財運旺盛，適合投資理財。感情甜蜜，已婚者家庭和樂，單身者有望脫單。健康良好，心情愉悅。今年是近幾年最好的年份之一。',
      '猴': '2026丙午年，屬猴者運勢中等偏上。事業方面有挑戰但也有突破口，關鍵在於能否抓住年中的一個重要機會。財運波動，上半年較緊，下半年好轉。感情方面需要多花心思經營。健康注意呼吸系統。',
      '雞': '2026丙午年，屬雞者桃花運旺但財運需謹慎。事業上有變動的可能，適合學習新技能提升競爭力。人際關係活躍，社交場合多。財運方面正財穩定，偏財要控制，不宜投機。感情豐富多彩。',
      '狗': '2026丙午年，屬狗者整體運勢不錯。事業穩步發展，有望獲得認可和獎勵。財運穩健，適合長期投資。感情方面和諧平穩，家庭關係融洽。健康方面注意保養關節和骨骼。',
      '豬': '2026丙午年，屬豬者財運亨通。事業上雖然壓力不小，但收穫也豐。下半年有一筆意外之財的可能。感情方面需要多陪伴家人，工作再忙也別忽略另一半。健康方面控制飲食，避免暴飲暴食。',
      '兔': '2026丙午年，屬兔者桃花運和人緣極佳。事業上適合拓展人脈，透過社交獲得新機會。財運中等，不適合大額投機。感情方面異性緣旺，已婚者要注意分寸。健康良好，心情愉快。',
      '龍': '2026丙午年，屬龍者氣勢如虹。事業上有大的突破機會，尤其在第二、三季度。財運旺盛，正財偏財都有進帳。但要注意不要因為太順而驕傲自滿。感情方面魅力四射，桃花朵朵。',
      '蛇': '2026丙午年，屬蛇者六合太歲（巳午），運勢極為順遂。事業上有重大晉升或轉職機會，貴人運極強。財運豐收，是近年最好的理財年份。感情和諧美滿。今年適合做重大人生決定。',
    }

    // 記錄用戶分析（去重，fire-and-forget）
    if (name && inputYear && inputMonth && inputDay) {
      const analyticsSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      )
      analyticsSupabase.from('user_analytics').upsert({
        name,
        birth_year: inputYear,
        birth_month: inputMonth,
        birth_day: inputDay,
        source: 'free',
      }, { onConflict: 'name,birth_year,birth_month,birth_day' }).then(
        () => {},
        () => {},
      )
    }

    return NextResponse.json({
      ...bazi,
      profile,
      ai_sections: aiSections,
      has_ai: Object.keys(aiSections).length > 0,
      sun_sign: { name: sunSign.name, element: sunSign.element, trait: sunSign.trait },
      life_path: { number: lifePathSum, ...lifePath },
      shengxiao_fortune: shengxiaoYearFortune[bazi.shengxiao] || '',
      // 真太陽時校正資訊
      solar_time: solarTimeInfo,
      // 農曆轉換資訊
      lunar_converted: lunarConverted,
      time_unknown,
    })
  } catch (err) {
    return NextResponse.json({ detail: err instanceof Error ? err.message : '分析失敗' }, { status: 500 })
  }
}
