export default function DashboardLoading() {
  return (
    <div className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* 標題骨架 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-7 w-32 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-white/5 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-white/5 rounded-lg animate-pulse" />
        </div>
        {/* 報告卡片骨架 */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-56 bg-white/5 rounded mt-2 animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
