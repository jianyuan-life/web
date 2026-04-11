# PDF 引擎升級技術方案：ReportLab → Typst

> 撰寫日期：2026-04-09
> 版本：v1.0
> 目標：將鑑源命理報告 PDF 品質提升至出版級水準

---

## 一、現況分析

### 目前架構
```
Stripe 付款 → Webhook → Supabase(pending)
→ generate-report → Python 排盤 API (Fly.io) → AI 分析
→ Supabase(completed) → Resend Email → /report/[token]
```

### 目前 PDF 痛點（ReportLab v4）
| # | 問題 | 嚴重度 |
|:---:|:---|:---:|
| 1 | 繁體中文字體支援差，常出現 ◆◆ 亂碼 | 嚴重 |
| 2 | 排版能力有限，無法做到出版級版面 | 嚴重 |
| 3 | 圖表只能用內建基礎圖表，視覺品質差 | 高 |
| 4 | 粗體/斜體 CJK 映射困難 | 高 |
| 5 | KeepTogether 空白頁問題頻發 | 中 |
| 6 | 頁面佈局手動計算座標，維護困難 | 中 |
| 7 | 模板修改需改 Python 程式碼，無法分離設計與邏輯 | 中 |

---

## 二、PDF 引擎對比

### 五大候選引擎

| 維度 | Typst | ReportLab | WeasyPrint | Puppeteer/Playwright | Prince XML |
|:---|:---:|:---:|:---:|:---:|:---:|
| **CJK 繁中支援** | 優秀（原生 Unicode） | 差（需手動映射） | 良好（CSS 字體） | 優秀（瀏覽器渲染） | 優秀 |
| **排版品質** | 出版級（接近 LaTeX） | 一般 | 良好 | 良好 | 出版級 |
| **編譯速度** | 極快（毫秒級） | 快 | 中等 | 慢（需啟動瀏覽器） | 快 |
| **模板系統** | 強大（程式化模板語言） | 無（純 Python 程式碼） | CSS/HTML | HTML/CSS/JS | CSS/HTML |
| **設計與邏輯分離** | 完全分離（.typ 模板） | 不分離 | 部分分離 | 部分分離 | 部分分離 |
| **Python 綁定** | typst-py v0.14.8 穩定 | 原生 Python | 原生 Python | 需 Node.js 或 Pyppeteer | 命令列工具 |
| **授權費用** | 免費開源（Apache 2.0） | 開源/商業雙授權 | 免費開源（BSD） | 免費開源 | 付費（$3,800 起） |
| **Docker 大小影響** | 極小（~15MB 二進制） | 小 | 中等（需 cairo 等） | 大（需 Chromium ~400MB） | 中等 |
| **圖表能力** | 需外部 SVG 嵌入 | 內建基礎圖表 | 需外部圖表 | 完整 Web 圖表 | 需外部圖表 |
| **社群/生態** | 快速成長（1200+ 套件） | 成熟但老化 | 活躍 | 龐大 | 小（商業） |

### 推薦方案：Typst

**選擇理由：**
1. **出版級排版品質**：Typst 源自學術排版需求，文字排版品質接近 LaTeX，遠超 ReportLab
2. **極速編譯**：毫秒級編譯（比 LaTeX 快 27 倍），適合即時生成報告
3. **原生 CJK 支援**：完整 Unicode 支援，搭配 Noto CJK 字體可完美顯示繁體中文
4. **設計與邏輯完全分離**：`.typ` 模板檔案獨立於 Python 程式碼，設計師可獨立調整版面
5. **Python 綁定穩定**：typst-py v0.14.8，API 成熟，支援 bytes 輸入輸出
6. **免費開源**：Apache 2.0 授權，零授權費用
7. **Docker 友善**：二進制極小，不會顯著增加 Fly.io image 大小

**排除理由：**
- **Prince XML**：品質頂尖但授權費 $3,800+，不適合初創期
- **Puppeteer/Playwright**：需要完整 Chromium 環境，Docker image 增加 400MB+，啟動慢
- **WeasyPrint**：排版品質不如 Typst，CJK 粗體支援有限
- **ReportLab（維持現狀）**：已知痛點無法根本解決

---

## 三、字體方案

### 推薦字體組合

| 用途 | 字體 | 格式 | 單檔大小 | 授權 |
|:---|:---|:---:|:---:|:---:|
| **正文（襯線）** | Noto Serif CJK TC | OTF | ~9MB | SIL OFL（免費商用） |
| **標題/強調（無襯線）** | Noto Sans CJK TC | OTF | ~9MB | SIL OFL（免費商用） |
| **數字/英文** | Inter | OTF | ~300KB | SIL OFL |
| **裝飾/特殊** | 可選：花明朝體 | TTF | ~5MB | 免費商用 |

### 字體檔案大小估算

| 項目 | 大小 |
|:---|:---:|
| Noto Serif CJK TC（Regular + Bold） | ~18MB |
| Noto Sans CJK TC（Regular + Bold） | ~18MB |
| Inter（Regular + Bold + Italic） | ~1MB |
| **合計** | **~37MB** |

### 對 Docker Image 的影響
- 目前 Fly.io Python API image 預估 ~200-300MB
- 加入字體後增加 ~37MB（約 12-18% 增量）
- **可接受範圍**，且只需在 Dockerfile 中 COPY 字體檔案即可

### 字體下載方式
```bash
# 從 GitHub notofonts/noto-cjk 官方倉庫下載
# Traditional Chinese (TC) 版本 — 只包含繁中需要的字符，比全語言版小很多
wget https://github.com/notofonts/noto-cjk/releases/download/Serif2.003/09_NotoSerifCJKtc.zip
wget https://github.com/notofonts/noto-cjk/releases/download/Sans2.004/09_NotoSansCJKtc.zip
```

### 備選字體方案
如果想要更獨特的品牌感，可考慮：
- **源石黑體（Genseki Gothic）**：基於思源黑體改良，字形更圓潤溫暖
- **霞鶩文楷（LXGW WenKai TC）**：手寫風楷書，適合命理報告的文化氛圍
- **LINE Seed TW**：現代無襯線，4 種字重，免費商用

---

## 四、圖表方案

### 架構：matplotlib/seaborn → SVG → Typst 嵌入

```
Python 排盤數據 (raw_data)
       ↓
matplotlib/seaborn 生成圖表
       ↓
輸出 SVG 檔案（向量圖，無限解析度）
       ↓
Typst 模板中 #image("chart.svg") 嵌入
       ↓
編譯輸出 PDF
```

### 五大圖表實現方案

| # | 圖表類型 | 技術方案 | 數據來源 |
|:---:|:---|:---|:---|
| 1 | **五行雷達圖** | matplotlib radar chart + 自訂色彩 | raw_data 中五行分數 |
| 2 | **環形評分圖** | matplotlib donut chart / gauge | AI 分析各系統評分 |
| 3 | **運勢折線圖** | seaborn lineplot + 標註點 | 大運/流年數據 |
| 4 | **吉凶圓餅圖** | matplotlib pie chart（甜甜圈式） | 好/注意/改善統計 |
| 5 | **系統橫條圖** | seaborn barplot horizontal | 15 系統各項評分 |

### matplotlib 專業樣式設定
```python
import matplotlib
matplotlib.use('Agg')  # 無頭模式，Docker 友善
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# 載入 Noto Sans CJK TC 用於圖表中文標籤
font_path = '/app/fonts/NotoSansCJKtc-Regular.otf'
fm.fontManager.addfont(font_path)
plt.rcParams['font.family'] = 'Noto Sans CJK TC'

# 鑑源品牌色彩方案
BRAND_COLORS = {
    'primary': '#1a365d',    # 深藍
    'secondary': '#c4a35a',  # 金色
    'accent': '#e8d5b7',     # 米色
    'success': '#38a169',    # 綠色
    'warning': '#d69e2e',    # 黃色
    'danger': '#e53e3e',     # 紅色
    'bg': '#fafaf8',         # 暖白背景
}

# SVG 輸出
fig.savefig('/tmp/chart.svg', format='svg', bbox_inches='tight', transparent=True)
```

### SVG 嵌入 Typst 的方式
```typst
// 直接嵌入 SVG 檔案
#image("charts/radar.svg", width: 80%)

// 或從 Python 傳入 bytes 後用 image.decode
#image.decode(radar_svg_bytes, format: "svg")
```

### 圖表品質標準
- 所有圖表輸出 SVG 向量格式（非 PNG），確保任何縮放下清晰
- 中文標籤使用 Noto Sans CJK TC，與報告正文字體一致
- 色彩方案統一使用鑑源品牌色
- 圖表前後保留 4mm 間距（與現有規範一致）

---

## 五、Typst 模板設計方案

### 模板結構
```
templates/
├── report.typ           # 主模板（版面設定、頁首頁尾）
├── cover.typ            # 封面模板
├── chapter.typ          # 章節模板
├── components/
│   ├── info-box.typ     # 資訊框元件
│   ├── summary-box.typ  # 總結框元件
│   ├── score-card.typ   # 評分卡片
│   └── table-style.typ  # 表格樣式
├── fonts/               # 字體檔案
│   ├── NotoSerifCJKtc-Regular.otf
│   ├── NotoSerifCJKtc-Bold.otf
│   ├── NotoSansCJKtc-Regular.otf
│   └── NotoSansCJKtc-Bold.otf
└── assets/
    ├── logo.svg         # 鑑源 Logo
    └── decorations/     # 裝飾元素
```

### 模板範例（report.typ）
```typst
// ── 頁面設定 ──
#set page(
  paper: "a4",
  margin: (top: 18mm, bottom: 15mm, left: 15mm, right: 15mm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(8pt, fill: luma(150))
      鑑源命理 · jianyuan.life
      #h(1fr)
      #counter(page).display()
    ]
  },
  footer: context {
    if counter(page).get().first() > 1 [
      #set text(7pt, fill: luma(180))
      #h(1fr)
      本報告僅供參考，命理分析為東西方傳統智慧之整合
      #h(1fr)
    ]
  },
)

// ── 字體設定 ──
#set text(
  font: ("Noto Serif CJK TC", "Inter"),
  size: 9.5pt,
  lang: "zh",
  region: "TW",
)

// ── 標題樣式 ──
#show heading.where(level: 1): it => {
  set text(16pt, font: "Noto Sans CJK TC", weight: "bold")
  v(8mm)
  it.body
  v(4mm)
  line(length: 100%, stroke: 0.5pt + luma(200))
  v(4mm)
}

#show heading.where(level: 2): it => {
  set text(13pt, font: "Noto Sans CJK TC", weight: "bold")
  v(6mm)
  it.body
  v(3mm)
}

// ── 內容區 ──
#include "cover.typ"
#pagebreak()
// ... 動態注入章節內容
```

### Python 呼叫方式
```python
import typst
import json
import os

def generate_pdf(report_data: dict, output_path: str) -> bytes:
    """
    從報告數據生成 PDF
    
    Args:
        report_data: AI 分析結果 + 排盤原始數據
        output_path: 輸出 PDF 路徑
    
    Returns:
        PDF bytes
    """
    # 1. 生成所有圖表 SVG
    charts = generate_all_charts(report_data)
    
    # 2. 將數據寫成 JSON 供 Typst 讀取
    data_path = '/tmp/report_data.json'
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False)
    
    # 3. 將圖表 SVG 寫入暫存目錄
    for name, svg_bytes in charts.items():
        with open(f'/tmp/charts/{name}.svg', 'wb') as f:
            f.write(svg_bytes)
    
    # 4. 編譯 Typst 模板
    compiler = typst.Compiler(
        root='/app/templates',
        font_paths=['/app/fonts']
    )
    pdf_bytes = compiler.compile(
        input='/app/templates/report.typ',
        format='pdf'
    )
    
    return pdf_bytes
```

---

## 六、設計參考與風格定位

### 頂尖報告設計趨勢（2025-2026）

| 趨勢 | 鑑源應用方式 |
|:---|:---|
| 白底 + 高對比品牌色 | 暖白背景 #fafaf8 + 深藍 #1a365d + 金色 #c4a35a |
| 大量留白，呼吸感 | 章節間 12mm 間距，段落間 6mm |
| 數據視覺化優先 | 五行雷達圖、環形評分圖取代純文字列表 |
| 專業且溫暖的字體組合 | 襯線正文（Noto Serif）+ 無襯線標題（Noto Sans） |
| 細線裝飾元素 | 0.3pt 細線分隔，金色點綴 |
| 封面簡潔有力 | Logo + 主標題 + 客戶姓名 + 日期，無多餘元素 |

### 命理/占星報告設計趨勢
- **個人化封面**：包含客戶姓名、出生資訊、報告日期
- **視覺化命盤**：不只是文字描述，用圖表呈現命盤結構
- **色彩與五行對應**：木=綠、火=紅、土=黃、金=白、水=藍
- **東方美學元素**：水墨風裝飾、雲紋邊框（輕量使用，避免俗氣）
- **章節導航清晰**：目錄 + 章節頁碼 + 色彩標籤

### 設計範例參考
1. **Typst 官方模板庫**：basic-report、silky-report-insa 等提供專業報告骨架
2. **Quarto + Typst**：學術報告品質，支援 Tufte 風格側邊欄
3. **awesome-typst 社群**：400+ 模板可作為設計靈感

---

## 七、遷移路徑

### 階段一：基礎建設（預估 3 天）

| 步驟 | 內容 | 風險 |
|:---|:---|:---:|
| 1-1 | 在 Fly.io Dockerfile 安裝 typst-py + 字體 | 低 |
| 1-2 | 建立 `/app/templates/` 目錄結構 | 低 |
| 1-3 | 建立基礎 Typst 模板（頁面設定、字體、頁首頁尾） | 低 |
| 1-4 | Python 端寫 `typst_renderer.py` 呼叫 typst-py | 低 |
| 1-5 | 測試基礎 PDF 輸出（純文字、中文、粗體） | 低 |

### 階段二：圖表系統（預估 4 天）

| 步驟 | 內容 | 風險 |
|:---|:---|:---:|
| 2-1 | 建立 `chart_generator.py`（五大圖表） | 中 |
| 2-2 | matplotlib 品牌色彩方案 + 中文字體設定 | 低 |
| 2-3 | SVG 輸出 + Typst 嵌入測試 | 中 |
| 2-4 | 圖表與排盤 raw_data 對接 | 中 |
| 2-5 | 各方案（C/D/E1/E2/G15/R）圖表差異化 | 中 |

### 階段三：完整模板（預估 5 天）

| 步驟 | 內容 | 風險 |
|:---|:---|:---:|
| 3-1 | 封面模板（主標題自動縮放、品牌元素） | 低 |
| 3-2 | 目錄頁自動生成 | 低 |
| 3-3 | 章節模板（15 系統各章節版面） | 中 |
| 3-4 | 元件模板（info-box、summary-box、score-card） | 中 |
| 3-5 | 出門訣專屬模板（E1/E2 三色卡片版面） | 中 |
| 3-6 | 家族藍圖專屬模板（G15 多人對比版面） | 中 |

### 階段四：整合與切換（預估 3 天）

| 步驟 | 內容 | 風險 |
|:---|:---|:---:|
| 4-1 | 修改 `generate-report` workflow 呼叫新 PDF 引擎 | 高 |
| 4-2 | A/B 切換機制（環境變數控制新舊引擎） | 中 |
| 4-3 | 全方案端對端測試（C/D/E1/E2/G15/R） | 高 |
| 4-4 | PDF 品質閘門自動化（5 項版面檢查） | 中 |
| 4-5 | 移除舊 ReportLab 程式碼 | 低 |

### 總預估工時：15 個工作天

---

## 八、Fly.io Dockerfile 修改

### 新增內容
```dockerfile
# ── Typst 引擎 ──
RUN pip install typst==0.14.8

# ── 圖表引擎 ──
RUN pip install matplotlib seaborn

# ── 字體安裝 ──
COPY fonts/ /app/fonts/
# Noto Serif CJK TC (Regular + Bold) ~18MB
# Noto Sans CJK TC (Regular + Bold) ~18MB
# Inter (Regular + Bold) ~1MB

# ── Typst 模板 ──
COPY templates/ /app/templates/

# ── 環境變數：告訴 Typst 字體路徑 ──
ENV TYPST_FONT_PATHS=/app/fonts
```

### Docker Image 大小影響
| 項目 | 增量 |
|:---|:---:|
| typst-py wheel | ~15MB |
| matplotlib + seaborn | ~50MB |
| 字體檔案 | ~37MB |
| 模板檔案 | ~1MB |
| **合計增量** | **~103MB** |

---

## 九、風險評估

| # | 風險 | 機率 | 影響 | 緩解措施 |
|:---:|:---|:---:|:---:|:---|
| 1 | typst-py CJK 渲染異常 | 低 | 高 | 階段一先做 CJK 渲染測試，不通過則切換方案 |
| 2 | SVG 圖表嵌入品質問題 | 中 | 中 | 備選方案：matplotlib 直出 PDF 再合併 |
| 3 | Typst 模板語法學習曲線 | 中 | 低 | Typst 語法比 LaTeX 簡單 10 倍，文件完善 |
| 4 | Fly.io Docker image 太大 | 低 | 低 | 字體用 TC 版本非全語言版，已最小化 |
| 5 | 遷移期間報告生成中斷 | 高 | 高 | A/B 切換機制，新引擎有問題立即回退舊版 |
| 6 | 各方案模板差異化工作量大 | 中 | 中 | 先做 C 方案（人生藍圖），驗證後再擴展 |
| 7 | Typst 版本更新可能破壞 API | 低 | 中 | 鎖定 typst-py==0.14.8，測試通過後再升級 |

### 回退方案
- 環境變數 `PDF_ENGINE=typst|reportlab` 控制使用哪個引擎
- 階段四之前，舊 ReportLab 程式碼完全保留
- 任何方案的新 PDF 品質不如舊版，該方案繼續用 ReportLab

---

## 十、成本分析

| 項目 | 費用 |
|:---|:---:|
| Typst 授權 | $0（Apache 2.0 開源） |
| Noto CJK 字體授權 | $0（SIL OFL 開源） |
| matplotlib/seaborn 授權 | $0（BSD 開源） |
| Fly.io image 增大的額外儲存 | 可忽略（~100MB） |
| 開發人力（15 天） | 內部開發成本 |
| **總額外費用** | **$0** |

---

## 十一、時間表

```
第 1 週（階段一）：基礎建設
├── Day 1: Dockerfile 修改 + typst-py 安裝測試
├── Day 2: 字體安裝 + CJK 渲染測試（關鍵驗證點）
└── Day 3: 基礎模板 + Python 呼叫層

第 2 週（階段二）：圖表系統
├── Day 4-5: 五大圖表 matplotlib 實作
├── Day 6: SVG 嵌入 Typst 整合測試
└── Day 7: 各方案圖表差異化

第 3 週（階段三 + 四）：完整模板 + 整合
├── Day 8-9: 封面 + 目錄 + 章節模板
├── Day 10-11: 元件模板 + 特殊方案模板
├── Day 12: Workflow 整合 + A/B 切換
├── Day 13-14: 全方案端對端測試
└── Day 15: 品質閘門 + 上線切換
```

### 關鍵里程碑
| 里程碑 | 時間點 | 成功標準 |
|:---|:---:|:---|
| CJK 渲染驗證 | Day 2 | 繁中正文、粗體、標題全部正確顯示 |
| 圖表整合驗證 | Day 6 | 五大圖表 SVG 嵌入 PDF 品質達標 |
| C 方案完整 PDF | Day 11 | 人生藍圖報告完整 PDF 品質達出版級 |
| 全方案上線 | Day 15 | 6 個方案全部通過品質閘門 |

---

## 十二、結論與建議

### 推薦方案
**Typst + Noto CJK + matplotlib SVG 圖表**

### 核心優勢
1. **零授權費用**：所有組件免費開源
2. **出版級排版**：Typst 排版品質接近 LaTeX，遠超 ReportLab
3. **毫秒級編譯**：報告生成速度不受影響
4. **設計分離**：`.typ` 模板可獨立修改，不需改 Python 程式碼
5. **向量圖表**：SVG 格式確保任何縮放下圖表清晰
6. **Docker 友善**：僅增加 ~100MB，遠小於 Puppeteer 方案

### 建議執行順序
1. **立即開始**：階段一基礎建設（重點：Day 2 的 CJK 渲染驗證）
2. **驗證通過後**：繼續階段二圖表系統
3. **C 方案先行**：先完成人生藍圖，驗證品質後再擴展到其他方案
4. **平行保留舊版**：A/B 切換機制確保零風險上線

### 終極目標
讓每位客戶收到鑑源的 PDF 報告時，感受到的是：
- 專業的出版級排版品質
- 精美的數據視覺化圖表
- 溫暖的東方美學設計
- 值得珍藏的命理報告

**這就是「全球最好的命理報告」應該有的樣子。**
