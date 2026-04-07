// 星盤 SVG 裝飾（外環慢轉 + 內環反轉）
export default function Astrolabe() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] pointer-events-none max-md:w-[min(360px,90vw)] max-md:h-[min(360px,90vw)]">
      {/* 外環 — 天干地支 */}
      <svg
        className="absolute inset-0 w-full h-full animate-spin-slow"
        viewBox="0 0 580 580"
        style={{ animationDuration: '120s' }}
      >
        <circle cx="290" cy="290" r="270" fill="none" stroke="rgba(201,168,76,0.18)" strokeWidth="1.5" />
        <circle cx="290" cy="290" r="260" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="0.8" strokeDasharray="4 8" />
        {/* 12 宮位分割線 */}
        <g stroke="rgba(201,168,76,0.15)" strokeWidth="0.8">
          <line x1="290" y1="20" x2="290" y2="60" />
          <line x1="425" y1="55" x2="405" y2="85" />
          <line x1="525" y1="155" x2="495" y2="175" />
          <line x1="560" y1="290" x2="520" y2="290" />
          <line x1="525" y1="425" x2="495" y2="405" />
          <line x1="425" y1="525" x2="405" y2="495" />
          <line x1="290" y1="560" x2="290" y2="520" />
          <line x1="155" y1="525" x2="175" y2="495" />
          <line x1="55" y1="425" x2="85" y2="405" />
          <line x1="20" y1="290" x2="60" y2="290" />
          <line x1="55" y1="155" x2="85" y2="175" />
          <line x1="155" y1="55" x2="175" y2="85" />
        </g>
        {/* 天干符號 */}
        <g fill="rgba(201,168,76,0.25)" fontFamily="Noto Serif TC, serif" fontSize="14">
          <text x="290" y="48" textAnchor="middle">甲</text>
          <text x="430" y="78" textAnchor="middle">乙</text>
          <text x="530" y="178" textAnchor="middle">丙</text>
          <text x="550" y="296" textAnchor="middle">丁</text>
          <text x="518" y="430" textAnchor="middle">戊</text>
          <text x="418" y="535" textAnchor="middle">己</text>
          <text x="290" y="558" textAnchor="middle">庚</text>
          <text x="162" y="535" textAnchor="middle">辛</text>
          <text x="50" y="430" textAnchor="middle">壬</text>
          <text x="30" y="296" textAnchor="middle">癸</text>
          <text x="62" y="178" textAnchor="middle">子</text>
          <text x="160" y="78" textAnchor="middle">丑</text>
        </g>
      </svg>

      {/* 內環 — 八卦 + 太極 */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65.5%] h-[65.5%] animate-spin-reverse"
        viewBox="0 0 380 380"
        style={{ animationDuration: '90s' }}
      >
        <circle cx="190" cy="190" r="170" fill="none" stroke="rgba(201,168,76,0.2)" strokeWidth="1.5" />
        <circle cx="190" cy="190" r="120" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="0.8" />
        {/* 八卦 */}
        <g fill="rgba(201,168,76,0.3)" fontFamily="Noto Serif TC, serif" fontSize="18">
          <text x="190" y="38" textAnchor="middle">&#9776;</text>
          <text x="320" y="100" textAnchor="middle">&#9777;</text>
          <text x="355" y="196" textAnchor="middle">&#9778;</text>
          <text x="315" y="300" textAnchor="middle">&#9779;</text>
          <text x="190" y="355" textAnchor="middle">&#9780;</text>
          <text x="65" y="300" textAnchor="middle">&#9781;</text>
          <text x="25" y="196" textAnchor="middle">&#9782;</text>
          <text x="60" y="100" textAnchor="middle">&#9783;</text>
        </g>
        {/* 太極 */}
        <circle cx="190" cy="190" r="30" fill="none" stroke="rgba(201,168,76,0.2)" strokeWidth="1.5" />
        <path d="M190,160 A30,30 0 0 1 190,220 A15,15 0 0 0 190,190 A15,15 0 0 1 190,160Z" fill="rgba(201,168,76,0.15)" />
        <circle cx="190" cy="175" r="4" fill="rgba(201,168,76,0.2)" />
        <circle cx="190" cy="205" r="4" fill="rgba(10,14,26,0.5)" stroke="rgba(201,168,76,0.15)" strokeWidth="0.8" />
      </svg>
    </div>
  )
}
