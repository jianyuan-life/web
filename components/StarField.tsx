'use client'

// 星空粒子背景 + 極光漸層動畫
export default function StarField() {
  const stars = [
    { top: '8%', left: '12%', dur: '2.5s', delay: '0s' },
    { top: '15%', left: '68%', dur: '3.2s', delay: '0.5s' },
    { top: '25%', left: '35%', dur: '4s', delay: '1s', size: 3 },
    { top: '40%', left: '82%', dur: '2.8s', delay: '0.3s' },
    { top: '55%', left: '20%', dur: '3.5s', delay: '0.8s' },
    { top: '70%', left: '55%', dur: '2.2s', delay: '1.2s' },
    { top: '35%', left: '90%', dur: '3s', delay: '0.6s', size: 3 },
    { top: '80%', left: '40%', dur: '4.5s', delay: '0.2s' },
    { top: '10%', left: '50%', dur: '3.8s', delay: '1.5s' },
    { top: '60%', left: '8%', dur: '2.6s', delay: '0.9s' },
    { top: '45%', left: '45%', dur: '3.3s', delay: '1.1s', size: 3 },
    { top: '20%', left: '78%', dur: '4.2s', delay: '0.4s' },
    { top: '75%', left: '72%', dur: '2.9s', delay: '1.3s' },
    { top: '88%', left: '25%', dur: '3.6s', delay: '0.7s' },
    { top: '5%', left: '92%', dur: '3.1s', delay: '1.4s', size: 3 },
    { top: '50%', left: '60%', dur: '2.4s', delay: '0.1s' },
    { top: '92%', left: '85%', dur: '4.8s', delay: '0.5s' },
    { top: '30%', left: '5%', dur: '3.4s', delay: '1.6s' },
  ]

  return (
    <>
      {/* 星空粒子 */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size || 2}px`,
              height: `${s.size || 2}px`,
              animationDuration: s.dur,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      {/* 極光漸層 */}
      <div
        className="absolute inset-0 pointer-events-none animate-aurora"
        style={{
          background: `
            radial-gradient(ellipse at 30% 30%, rgba(139, 92, 246, 0.18) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(45, 212, 191, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 90%, rgba(201, 168, 76, 0.06) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 20%, rgba(74, 122, 255, 0.12) 0%, transparent 45%)
          `,
        }}
      />

      {/* 底部漸層遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-[#0a0e1a] to-transparent pointer-events-none" />
    </>
  )
}
