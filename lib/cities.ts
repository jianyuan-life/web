// 全球主要城市數據庫（經緯度+時區）
// 優先覆蓋華人地區，再覆蓋全球主要城市

export interface City {
  name: string      // 繁體中文名
  name_s: string    // 簡體中文名
  name_en: string   // 英文名
  country: string   // 國家/地區
  lat: number       // 緯度
  lng: number       // 經度
  tz: number        // UTC 時區偏移（小時）
  tzName: string    // 時區名稱
}

export const CITIES: City[] = [
  // ══════ 台灣 ══════
  { name:'台北', name_s:'台北', name_en:'Taipei', country:'台灣', lat:25.033, lng:121.565, tz:8, tzName:'Asia/Taipei' },
  { name:'台中', name_s:'台中', name_en:'Taichung', country:'台灣', lat:24.148, lng:120.674, tz:8, tzName:'Asia/Taipei' },
  { name:'高雄', name_s:'高雄', name_en:'Kaohsiung', country:'台灣', lat:22.627, lng:120.301, tz:8, tzName:'Asia/Taipei' },
  { name:'台南', name_s:'台南', name_en:'Tainan', country:'台灣', lat:22.999, lng:120.227, tz:8, tzName:'Asia/Taipei' },
  { name:'新北', name_s:'新北', name_en:'New Taipei', country:'台灣', lat:25.012, lng:121.466, tz:8, tzName:'Asia/Taipei' },
  { name:'桃園', name_s:'桃园', name_en:'Taoyuan', country:'台灣', lat:24.994, lng:121.297, tz:8, tzName:'Asia/Taipei' },
  { name:'新竹', name_s:'新竹', name_en:'Hsinchu', country:'台灣', lat:24.804, lng:120.972, tz:8, tzName:'Asia/Taipei' },
  { name:'基隆', name_s:'基隆', name_en:'Keelung', country:'台灣', lat:25.128, lng:121.739, tz:8, tzName:'Asia/Taipei' },
  { name:'嘉義', name_s:'嘉义', name_en:'Chiayi', country:'台灣', lat:23.480, lng:120.449, tz:8, tzName:'Asia/Taipei' },
  { name:'花蓮', name_s:'花莲', name_en:'Hualien', country:'台灣', lat:23.977, lng:121.605, tz:8, tzName:'Asia/Taipei' },
  { name:'屏東', name_s:'屏东', name_en:'Pingtung', country:'台灣', lat:22.682, lng:120.484, tz:8, tzName:'Asia/Taipei' },
  { name:'宜蘭', name_s:'宜兰', name_en:'Yilan', country:'台灣', lat:24.752, lng:121.754, tz:8, tzName:'Asia/Taipei' },

  // ══════ 香港/澳門 ══════
  { name:'香港', name_s:'香港', name_en:'Hong Kong', country:'香港', lat:22.320, lng:114.170, tz:8, tzName:'Asia/Hong_Kong' },
  { name:'九龍', name_s:'九龙', name_en:'Kowloon', country:'香港', lat:22.320, lng:114.177, tz:8, tzName:'Asia/Hong_Kong' },
  { name:'澳門', name_s:'澳门', name_en:'Macau', country:'澳門', lat:22.199, lng:113.544, tz:8, tzName:'Asia/Macau' },

  // ══════ 中國大陸 ══════
  { name:'北京', name_s:'北京', name_en:'Beijing', country:'中國', lat:39.904, lng:116.407, tz:8, tzName:'Asia/Shanghai' },
  { name:'上海', name_s:'上海', name_en:'Shanghai', country:'中國', lat:31.230, lng:121.474, tz:8, tzName:'Asia/Shanghai' },
  { name:'廣州', name_s:'广州', name_en:'Guangzhou', country:'中國', lat:23.129, lng:113.264, tz:8, tzName:'Asia/Shanghai' },
  { name:'深圳', name_s:'深圳', name_en:'Shenzhen', country:'中國', lat:22.543, lng:114.058, tz:8, tzName:'Asia/Shanghai' },
  { name:'杭州', name_s:'杭州', name_en:'Hangzhou', country:'中國', lat:30.275, lng:120.155, tz:8, tzName:'Asia/Shanghai' },
  { name:'成都', name_s:'成都', name_en:'Chengdu', country:'中國', lat:30.573, lng:104.066, tz:8, tzName:'Asia/Shanghai' },
  { name:'重慶', name_s:'重庆', name_en:'Chongqing', country:'中國', lat:29.563, lng:106.551, tz:8, tzName:'Asia/Shanghai' },
  { name:'武漢', name_s:'武汉', name_en:'Wuhan', country:'中國', lat:30.593, lng:114.305, tz:8, tzName:'Asia/Shanghai' },
  { name:'南京', name_s:'南京', name_en:'Nanjing', country:'中國', lat:32.061, lng:118.797, tz:8, tzName:'Asia/Shanghai' },
  { name:'天津', name_s:'天津', name_en:'Tianjin', country:'中國', lat:39.084, lng:117.201, tz:8, tzName:'Asia/Shanghai' },
  { name:'西安', name_s:'西安', name_en:"Xi'an", country:'中國', lat:34.264, lng:108.944, tz:8, tzName:'Asia/Shanghai' },
  { name:'蘇州', name_s:'苏州', name_en:'Suzhou', country:'中國', lat:31.299, lng:120.585, tz:8, tzName:'Asia/Shanghai' },
  { name:'長沙', name_s:'长沙', name_en:'Changsha', country:'中國', lat:28.228, lng:112.939, tz:8, tzName:'Asia/Shanghai' },
  { name:'鄭州', name_s:'郑州', name_en:'Zhengzhou', country:'中國', lat:34.747, lng:113.625, tz:8, tzName:'Asia/Shanghai' },
  { name:'東莞', name_s:'东莞', name_en:'Dongguan', country:'中國', lat:23.021, lng:113.752, tz:8, tzName:'Asia/Shanghai' },
  { name:'廈門', name_s:'厦门', name_en:'Xiamen', country:'中國', lat:24.480, lng:118.089, tz:8, tzName:'Asia/Shanghai' },
  { name:'福州', name_s:'福州', name_en:'Fuzhou', country:'中國', lat:26.075, lng:119.306, tz:8, tzName:'Asia/Shanghai' },
  { name:'昆明', name_s:'昆明', name_en:'Kunming', country:'中國', lat:25.040, lng:102.712, tz:8, tzName:'Asia/Shanghai' },
  { name:'大連', name_s:'大连', name_en:'Dalian', country:'中國', lat:38.914, lng:121.615, tz:8, tzName:'Asia/Shanghai' },
  { name:'青島', name_s:'青岛', name_en:'Qingdao', country:'中國', lat:36.067, lng:120.383, tz:8, tzName:'Asia/Shanghai' },
  { name:'烏魯木齊', name_s:'乌鲁木齐', name_en:'Urumqi', country:'中國', lat:43.826, lng:87.617, tz:8, tzName:'Asia/Shanghai' },
  { name:'哈爾濱', name_s:'哈尔滨', name_en:'Harbin', country:'中國', lat:45.750, lng:126.650, tz:8, tzName:'Asia/Shanghai' },
  { name:'瀋陽', name_s:'沈阳', name_en:'Shenyang', country:'中國', lat:41.805, lng:123.432, tz:8, tzName:'Asia/Shanghai' },
  { name:'拉薩', name_s:'拉萨', name_en:'Lhasa', country:'中國', lat:29.650, lng:91.100, tz:8, tzName:'Asia/Shanghai' },

  // ══════ 日本 ══════
  { name:'東京', name_s:'东京', name_en:'Tokyo', country:'日本', lat:35.682, lng:139.769, tz:9, tzName:'Asia/Tokyo' },
  { name:'大阪', name_s:'大阪', name_en:'Osaka', country:'日本', lat:34.694, lng:135.502, tz:9, tzName:'Asia/Tokyo' },
  { name:'京都', name_s:'京都', name_en:'Kyoto', country:'日本', lat:35.012, lng:135.768, tz:9, tzName:'Asia/Tokyo' },
  { name:'橫濱', name_s:'横滨', name_en:'Yokohama', country:'日本', lat:35.444, lng:139.638, tz:9, tzName:'Asia/Tokyo' },
  { name:'名古屋', name_s:'名古屋', name_en:'Nagoya', country:'日本', lat:35.181, lng:136.906, tz:9, tzName:'Asia/Tokyo' },
  { name:'福岡', name_s:'福冈', name_en:'Fukuoka', country:'日本', lat:33.590, lng:130.402, tz:9, tzName:'Asia/Tokyo' },

  // ══════ 韓國 ══════
  { name:'首爾', name_s:'首尔', name_en:'Seoul', country:'韓國', lat:37.567, lng:126.978, tz:9, tzName:'Asia/Seoul' },
  { name:'釜山', name_s:'釜山', name_en:'Busan', country:'韓國', lat:35.180, lng:129.076, tz:9, tzName:'Asia/Seoul' },

  // ══════ 東南亞 ══════
  { name:'新加坡', name_s:'新加坡', name_en:'Singapore', country:'新加坡', lat:1.352, lng:103.820, tz:8, tzName:'Asia/Singapore' },
  { name:'吉隆坡', name_s:'吉隆坡', name_en:'Kuala Lumpur', country:'馬來西亞', lat:3.139, lng:101.687, tz:8, tzName:'Asia/Kuala_Lumpur' },
  { name:'曼谷', name_s:'曼谷', name_en:'Bangkok', country:'泰國', lat:13.756, lng:100.502, tz:7, tzName:'Asia/Bangkok' },
  { name:'胡志明市', name_s:'胡志明市', name_en:'Ho Chi Minh City', country:'越南', lat:10.823, lng:106.630, tz:7, tzName:'Asia/Ho_Chi_Minh' },
  { name:'河內', name_s:'河内', name_en:'Hanoi', country:'越南', lat:21.029, lng:105.852, tz:7, tzName:'Asia/Ho_Chi_Minh' },
  { name:'雅加達', name_s:'雅加达', name_en:'Jakarta', country:'印尼', lat:-6.208, lng:106.846, tz:7, tzName:'Asia/Jakarta' },
  { name:'馬尼拉', name_s:'马尼拉', name_en:'Manila', country:'菲律賓', lat:14.600, lng:120.984, tz:8, tzName:'Asia/Manila' },

  // ══════ 歐美澳 ══════
  { name:'倫敦', name_s:'伦敦', name_en:'London', country:'英國', lat:51.507, lng:-0.128, tz:0, tzName:'Europe/London' },
  { name:'紐約', name_s:'纽约', name_en:'New York', country:'美國', lat:40.713, lng:-74.006, tz:-5, tzName:'America/New_York' },
  { name:'洛杉磯', name_s:'洛杉矶', name_en:'Los Angeles', country:'美國', lat:34.052, lng:-118.244, tz:-8, tzName:'America/Los_Angeles' },
  { name:'舊金山', name_s:'旧金山', name_en:'San Francisco', country:'美國', lat:37.775, lng:-122.419, tz:-8, tzName:'America/Los_Angeles' },
  { name:'溫哥華', name_s:'温哥华', name_en:'Vancouver', country:'加拿大', lat:49.283, lng:-123.121, tz:-8, tzName:'America/Vancouver' },
  { name:'多倫多', name_s:'多伦多', name_en:'Toronto', country:'加拿大', lat:43.653, lng:-79.383, tz:-5, tzName:'America/Toronto' },
  { name:'巴黎', name_s:'巴黎', name_en:'Paris', country:'法國', lat:48.857, lng:2.352, tz:1, tzName:'Europe/Paris' },
  { name:'柏林', name_s:'柏林', name_en:'Berlin', country:'德國', lat:52.520, lng:13.405, tz:1, tzName:'Europe/Berlin' },
  { name:'雪梨', name_s:'悉尼', name_en:'Sydney', country:'澳洲', lat:-33.869, lng:151.209, tz:10, tzName:'Australia/Sydney' },
  { name:'墨爾本', name_s:'墨尔本', name_en:'Melbourne', country:'澳洲', lat:-37.814, lng:144.963, tz:10, tzName:'Australia/Melbourne' },
  { name:'奧克蘭', name_s:'奥克兰', name_en:'Auckland', country:'紐西蘭', lat:-36.848, lng:174.763, tz:12, tzName:'Pacific/Auckland' },
  { name:'杜拜', name_s:'迪拜', name_en:'Dubai', country:'阿聯酋', lat:25.205, lng:55.271, tz:4, tzName:'Asia/Dubai' },
]

// 搜尋城市（支援繁體、簡體、英文）
export function searchCities(query: string): City[] {
  if (!query || query.length < 1) return []
  const q = query.toLowerCase().trim()
  return CITIES.filter(c =>
    c.name.includes(q) || c.name_s.includes(q) ||
    c.name_en.toLowerCase().includes(q) || c.country.includes(q)
  ).slice(0, 8)
}
