/* 미니루트 전체모드 추가 기능 — 오늘 날씨 · 오늘의 운세
 * ROOT 세일즈허브 대시보드와 같은 API 사용:
 *   날씨  GET /v1/fc/weather?lat=&lon=   (위치 기본값: 서울 중구 명동 — ROOT 기본값과 같음)
 *   운세  GET /v1/fc/fortune/today
 * ROOT 로그인 정보(token)가 있어야 받아옴 → 미니루트 실행(localhost:5173)에서 ROOT 에 한 번 로그인하면 표시됨.
 * 색: 키 #EAF0CC · 서브 #769636 · 테두리 #B5D334 (+ 원래 글씨·바탕)
 */
(function () {
  'use strict';
  var API = 'https://api-fc-root.sbt-root.com/api';
  var LAT = 37.5636, LON = 126.9826;
  var cache = { weather: null, fortune: null, loading: false, error: '', tab: 'sales' };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var token = function () { try { return localStorage.getItem('token') || ''; } catch (e) { return ''; } };
  var round = function (v) { return v == null || isNaN(v) ? '-' : Math.round(v); };

  // 날씨 아이콘 (OpenWeather iconCode → 이모지)
  var ICON = { '01': ['☀️', '🌙'], '02': ['🌤️', '🌙'], '03': ['⛅', '☁️'], '04': ['☁️', '☁️'], '09': ['🌧️', '🌧️'], '10': ['🌦️', '🌧️'], '11': ['⛈️', '⛈️'], '13': ['❄️', '❄️'], '50': ['🌫️', '🌫️'] };
  var weatherIcon = function (code) { var k = String(code || '').slice(0, 2), n = /n$/.test(code || '') ? 1 : 0; return (ICON[k] || ['🌤️'])[n]; };
  // 미세먼지 등급 점 색 (정보 표시용)
  var GRADE = { '좋음': '#4A90E2', '보통': '#7BB342', '나쁨': '#F0A030', '매우나쁨': '#E05A47' };
  var gradeDot = function (g) { return '<i class="mr-gd" style="background:' + (GRADE[String(g || '').replace(/\s/g, '')] || '#C9CDBF') + '"></i>'; };

  // 외근 한마디: 날씨에 맞춘 짧은 안내
  function fieldTip(w) {
    var tips = [];
    var code = String(w.iconCode || '').slice(0, 2);
    if ((w.rainProbability || 0) >= 50 || code === '09' || code === '10' || code === '11') tips.push('☂️ 비 소식이 있어요. 상담 자료는 방수 파일에 챙기세요.');
    if (code === '13') tips.push('❄️ 눈길 미끄럼 주의! 방문 일정에 여유를 두세요.');
    var pm = String(w.pm25Grade || w.pm10Grade || '');
    if (/나쁨/.test(pm)) tips.push('😷 미세먼지가 나빠요. 외근 시 마스크를 챙기세요.');
    var t = w.temperature;
    if (t != null && t <= 3) tips.push('🧣 많이 추워요. 따뜻하게 입고 나가세요.');
    else if (t != null && t >= 30) tips.push('🥤 무더워요. 물을 자주 드세요.');
    if (!tips.length) tips.push('🚶 외근하기 좋은 날씨예요. 고객 방문 일정을 잡아보세요.');
    return tips[0];
  }

  var CSS =
    '.mr-today{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:16px;margin:0 0 22px}' +
    '.mr-card{position:relative;background:#fff;border:1px solid var(--line,#DFE3D6);border-radius:22px;padding:20px 22px;box-shadow:0 4px 16px rgba(21,25,14,.05);min-width:0;overflow:hidden}' +
    '.mr-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 14px}' +
    '.mr-card-head h3{margin:0;font-size:15px;font-weight:800;color:#1F2A12}' +
    '.mr-card-head small{font-size:12.5px;font-weight:600;color:#7a8270;white-space:nowrap}' +
    /* 날씨 */
    '.mr-wx-main{display:flex;align-items:center;gap:14px}' +
    '.mr-wx-ico{width:72px;height:72px;flex:0 0 72px;border-radius:20px;display:grid;place-items:center;font-size:42px;background:#EAF0CC}' +
    '.mr-wx-temp{font-size:44px;font-weight:800;color:#1F2A12;line-height:1;letter-spacing:-1px}' +
    '.mr-wx-temp sup{font-size:22px;font-weight:700;vertical-align:top;margin-left:2px}' +
    '.mr-wx-desc{font-size:14px;font-weight:700;color:#1F2A12;margin-top:6px}' +
    '.mr-wx-range{font-size:12.5px;color:#7a8270;margin-top:2px}' +
    '.mr-wx-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:16px}' +
    '.mr-wx-cell{background:#F7F8F3;border-radius:12px;padding:8px 6px;text-align:center}' +
    '.mr-wx-cell span{display:block;font-size:11.5px;color:#7a8270}' +
    '.mr-wx-cell b{display:block;font-size:14px;color:#1F2A12;margin-top:2px}' +
    '.mr-wx-air{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
    '.mr-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;background:#F7F8F3;color:#1F2A12;font-size:12.5px;font-weight:700}' +
    '.mr-gd{width:8px;height:8px;border-radius:50%;display:inline-block}' +
    '.mr-tip{margin-top:12px;padding:10px 12px;border-radius:12px;background:#EAF0CC;color:#1F2A12;font-size:13px;font-weight:700;line-height:1.45}' +
    /* 운세 */
    '.mr-ft-top{display:flex;align-items:center;gap:16px}' +
    '.mr-ring{position:relative;width:84px;height:84px;flex:0 0 84px}' +
    '.mr-ring svg{width:84px;height:84px;transform:rotate(-90deg)}' +
    '.mr-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:1px;font-size:25px;font-weight:800;color:#1F2A12;line-height:1;letter-spacing:-.02em}' +
    '.mr-ring b span{display:inline-block;white-space:nowrap;padding-left:2px}.mr-ring b small{font-size:12px;font-weight:700;color:#769636;margin-left:1px}' +
    '.mr-ft-label{font-size:12px;font-weight:800;color:#769636;letter-spacing:.02em}' +
    '.mr-ft-advice{font-size:18px;font-weight:800;color:#1F2A12;line-height:1.4;margin-top:4px}' +
    '.mr-ft-tabs{display:flex;gap:4px;margin-top:16px;padding:4px;background:#F7F8F3;border-radius:12px}' +
    '.mr-ft-tabs button{flex:1;height:32px;border:0;border-radius:9px;background:transparent;color:#5b6152;font:inherit;font-size:13px;font-weight:700;cursor:pointer}' +
    '.mr-ft-tabs button[aria-selected="true"]{background:#fff;color:#1F2A12;box-shadow:0 0 0 1.5px #B5D334}' +
    '.mr-ft-text{margin:10px 2px 0;font-size:13.5px;color:#3d4334;line-height:1.6;min-height:3.2em}' +
    '.mr-ft-lucky{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}' +
    '.mr-ft-lucky .mr-pill b{color:#769636}' +
    '.mr-sw{width:12px;height:12px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.12)}' +
    '.mr-empty{color:#7a8270;font-size:13.5px;line-height:1.6;padding:10px 0}' +
    '.mr-skel{height:14px;border-radius:7px;background:linear-gradient(90deg,#F2F4EC,#E9EDDF,#F2F4EC);background-size:200% 100%;animation:mrsk 1.2s infinite;margin:8px 0}' +
    '@keyframes mrsk{to{background-position:-200% 0}}' +
    '@media (max-width:1100px){.mr-wx-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '@media (max-width:760px){.mr-today{grid-template-columns:1fr;gap:12px;margin-bottom:16px}.mr-card{padding:16px}.mr-wx-temp{font-size:36px}.mr-wx-ico{width:60px;height:60px;flex-basis:60px;font-size:34px}}';

  var skeleton = '<div class="mr-skel" style="width:60%"></div><div class="mr-skel"></div><div class="mr-skel" style="width:80%"></div>';

  function weatherHtml() {
    var w = cache.weather;
    if (!w) return cache.loading ? skeleton : '<div class="mr-empty">' + esc(cache.error || 'ROOT에 로그인하면 오늘 날씨가 보여요.') + '</div>';
    return '<div class="mr-wx-main"><div class="mr-wx-ico" aria-hidden="true">' + weatherIcon(w.iconCode) + '</div>' +
        '<div><div class="mr-wx-temp">' + round(w.temperature) + '<sup>°C</sup></div>' +
        '<div class="mr-wx-desc">' + esc(w.description || '') + '</div>' +
        '<div class="mr-wx-range">최저 ' + round(w.minTemp) + '° · 최고 ' + round(w.maxTemp) + '°</div></div></div>' +
      '<div class="mr-wx-grid">' +
        '<div class="mr-wx-cell"><span>체감</span><b>' + round(w.feelsLike) + '°</b></div>' +
        '<div class="mr-wx-cell"><span>습도</span><b>' + round(w.humidity) + '%</b></div>' +
        '<div class="mr-wx-cell"><span>바람</span><b>' + (w.windSpeed != null ? (Math.round(w.windSpeed * 10) / 10) + 'm/s' : '-') + '</b></div>' +
        '<div class="mr-wx-cell"><span>강수</span><b>' + round(w.rainProbability) + '%</b></div>' +
      '</div>' +
      '<div class="mr-wx-air">' +
        '<span class="mr-pill">' + gradeDot(w.pm10Grade) + '미세먼지 ' + esc(w.pm10Grade || '-') + '</span>' +
        '<span class="mr-pill">' + gradeDot(w.pm25Grade) + '초미세먼지 ' + esc(w.pm25Grade || '-') + '</span>' +
        (w.sunriseAt ? '<span class="mr-pill">🌅 ' + esc(w.sunriseAt) + ' · 🌇 ' + esc(w.sunsetAt || '') + '</span>' : '') +
      '</div>' +
      '<div class="mr-tip">' + esc(fieldTip(w)) + '</div>';
  }

  var TABS = [['sales', '영업운'], ['relationship', '대인운'], ['wealth', '재물운'], ['health', '건강운']];
  function ring(score) {
    var s = Math.max(0, Math.min(100, +score || 0)), r = 36, c = 2 * Math.PI * r;
    return '<div class="mr-ring" aria-label="오늘의 운세 ' + s + '점"><svg viewBox="0 0 84 84" aria-hidden="true">' +
      '<circle cx="42" cy="42" r="' + r + '" fill="none" stroke="#EAF0CC" stroke-width="9"/>' +
      '<circle cx="42" cy="42" r="' + r + '" fill="none" stroke="#B5D334" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (c * s / 100).toFixed(1) + ' ' + c.toFixed(1) + '"/>' +
      '</svg><b><span>' + s + '<small>점</small></span></b></div>';
  }
  function fortuneHtml() {
    var f = cache.fortune;
    if (!f) return cache.loading ? skeleton : '<div class="mr-empty">' + esc(cache.error || 'ROOT에 로그인하면 오늘의 운세가 보여요.') + '</div>';
    if (f.status && f.status !== 'ready') return '<div class="mr-empty">오늘의 운세를 만들고 있어요. 곧 자동으로 보여드릴게요 ✨</div>';
    var c = f.luckyColor || {};
    return '<div class="mr-ft-top">' + ring(f.overallScore) +
        '<div><div class="mr-ft-label">오늘의 한마디</div><div class="mr-ft-advice">' + esc(f.advice || '') + '</div></div></div>' +
      '<div class="mr-ft-tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" data-ft="' + t[0] + '" aria-selected="' + (cache.tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<p class="mr-ft-text">' + esc(f[cache.tab] || f.overall || '') + '</p>' +
      '<div class="mr-ft-lucky">' +
        (c.name ? '<span class="mr-pill"><i class="mr-sw" style="background:' + esc(c.hex || '#ccc') + '"></i>행운의 색 <b>' + esc(c.name) + '</b></span>' : '') +
        (f.luckyNumber != null ? '<span class="mr-pill">🍀 숫자 <b>' + esc(f.luckyNumber) + '</b></span>' : '') +
        (f.luckyDirection ? '<span class="mr-pill">🧭 방향 <b>' + esc(f.luckyDirection) + '</b></span>' : '') +
        (f.luckyTime ? '<span class="mr-pill">⏰ 시간 <b>' + esc(f.luckyTime) + '</b></span>' : '') +
      '</div>';
  }


  // ── 루티 인사말: 시간대·날씨에 따라 들어올 때마다 바뀜 (루티 그림도 문구에 맞춰 바뀜) ──
  var RUTI = { calendar: 'assets/ruti/calendar.webp', work: 'assets/ruti/work.webp', review: 'assets/ruti/review.webp', saving: 'assets/ruti/saving.webp', health: 'assets/ruti/health.webp', wave: 'assets/ruti/wave.png' };
  // 대체 문구도 「근거 + 건넴」: 앞에 시간대·요일·날씨 수치·이달의 이슈 같은 근거, 뒤에 이어지는 안부·응원·가벼운 제안 (명세: docs/루티한마디_AI연동명세.md)
  var GREET_TIME = {
    dawn: [['출근길이 붐빌 시간이에요. 여유 있게 출발하세요', 'calendar'], ['하루를 여는 아침이에요. 오늘 일정 한 번 훑고 시작해요', 'calendar'], ['아침 첫 연락은 짧은 안부가 부담 없어요. 한 분께 어때요?', 'work']],
    morning: [['오전엔 머리가 맑을 때죠. 까다로운 상담 준비를 먼저 해 둬요', 'review'], ['점심 약속 전 오전이에요. 오늘 만날 고객님 자료 미리 볼까요?', 'review'], ['오전 커피 한 잔 할 때죠. 오늘 상담 순서 같이 정리해요', 'calendar']],
    lunch: [['점심시간이 다가와요. 식사 상담이 있으면 장소 한 번 더 확인해요', 'work'], ['점심 무렵엔 고객님들도 잠깐 여유가 있을 때예요. 문자 안부 어때요?', 'work']],
    afternoon: [['점심 직후라 나른할 때죠. 짧게 걷고 오후를 시작해요', 'health'], ['오후 3시쯤 집중이 떨어지죠. 물 한 잔 마시고 쉬어 가요', 'health'], ['오후 방문 일정 있으세요? 이동 동선을 묶어 보면 편해요', 'calendar'], ['퇴근 전 한두 시간, 내일 상담 준비해 두면 아침이 가벼워요', 'review']],
    evening: [['퇴근 시간이에요. 오늘 만난 고객님 메모만 남기고 쉬어요', 'saving'], ['저녁 시간이라 고객님 연락은 내일로 미뤄도 괜찮아요. 푹 쉬세요', 'wave'], ['하루를 마무리할 때예요. 오늘 한 일, 차곡차곡 잘 쌓였어요', 'saving']],
    night: [['밤이 늦었어요. 내일 일정만 확인하고 푹 쉬세요', 'calendar'], ['늦은 시간까지 수고 많으세요. 잘 쉬어야 내일 상담도 잘 돼요', 'wave']]
  };
  var slot = function (h) { return h < 5 ? 'night' : h < 9 ? 'dawn' : h < 11 ? 'morning' : h < 13 ? 'lunch' : h < 18 ? 'afternoon' : h < 22 ? 'evening' : 'night'; };
  // 요일이 근거가 되는 문구 (시간대 문구와 함께 섞음)
  function dayGreets(d, h) {
    var w = d.getDay(), out = [];
    if (w === 1 && h < 13) out.push(['월요일 아침이에요. 이번 주 상담 일정 한눈에 정리해 봐요', 'calendar']);
    if (w === 5 && h >= 13) out.push(['금요일 오후네요. 이번 주 상담 정리하고 가볍게 마무리해요', 'saving']);
    if (w === 0 || w === 6) out.push(['주말에도 들르셨네요. 오늘은 가볍게 둘러보고 쉬어요', 'wave']);
    return out;
  }
  // 날씨 문구: 기온·강수확률·일교차·미세먼지 수치를 근거로
  function weatherGreets(w, h) {
    if (!w) return [];
    var out = [], code = String(w.iconCode || '').slice(0, 2), t = Math.round(+w.temperature), pm = String(w.pm10Grade || '') + String(w.pm25Grade || '');
    var pop = Math.round(+w.rainProbability), gap = Math.round(+w.maxTemp - +w.minTemp);
    var rain = /^(09|10|11)$/.test(code) || pop >= 60, snow = code === '13';
    if (snow) out.push(['지금 눈이 와요. 외근길 미끄러지지 않게 천천히 다니세요', 'health']);
    else if (rain) out.push([(pop && pop < 100 ? '강수 확률 ' + pop + '%예요. ' : '비 소식이 있어요. ') + '외근 가실 때 우산 챙기세요', 'health'], ['비 오는 날엔 방문보다 전화 안부가 반가울 수 있어요', 'work']);
    if (!isNaN(t) && t <= 5) out.push(h < 13 ? ['아침 기온 ' + t + '도래요. 외근길 목도리 꼭 챙기세요', 'health'] : ['지금 ' + t + '도로 쌀쌀해요. 따뜻한 차 한 잔 하면서 해요', 'health']);
    if (!isNaN(t) && t >= 28) out.push(h < 13 ? ['오늘 ' + t + '도까지 더워요. 외근은 오전에 몰아 두면 덜 지쳐요', 'health'] : ['지금 ' + t + '도예요. 오후 외근 땐 물 자주 드세요', 'health']);
    if (!isNaN(t) && t > 5 && t < 28 && !rain && !snow) out.push(['지금 ' + t + '도, 걷기 좋은 날씨예요. 고객 방문 다니기 좋겠어요', 'work']);
    if (!isNaN(gap) && gap >= 10) out.push(['오늘 일교차가 ' + gap + '도나 돼요. 겉옷 하나 챙겨 다니세요', 'health']);
    if (/나쁨/.test(pm)) out.push(['오늘 미세먼지가 나빠요. 외근길엔 마스크 챙기세요', 'health']);
    return out;
  }
  // 이달의 이슈: 달마다 바뀌는 시즌·트렌드 (뉴스는 홈 아래쪽에 따로 나오므로 인사말에는 쓰지 않음)
  var ISSUE_MONTH = {
    1: [['새해 첫 달이에요. 고객님께 새해 인사 한 줄 보내 보세요', 'work'], ['연말정산 서류 제출 시즌이에요. 고객님들도 궁금해하실 때예요', 'saving'], ['1월은 한파가 잦아요. 외근길 보온 단단히 하세요', 'health']],
    2: [['졸업·입학 시즌이에요. 자녀 둔 고객님께 축하 인사 어때요?', 'wave'], ['연말정산 환급이 들어오는 때예요. 고객님 반응 들어 보세요', 'saving']],
    3: [['새 학기가 시작됐어요. 학부모 고객님께 안부 전하기 좋아요', 'work'], ['환절기라 감기 걸리기 쉬워요. 따뜻하게 챙겨 입으세요', 'health']],
    4: [['벚꽃 나들이 철이에요. 주말 앞두고 고객님께 안전 안부 어때요?', 'wave'], ['4월은 미세먼지가 잦아요. 외근길 마스크 챙기세요', 'health']],
    5: [['가정의 달이에요. 고객님 가족 안부 묻기 좋은 때예요', 'wave'], ['종합소득세 신고 달이에요. 사업자 고객님들 바쁘실 거예요', 'saving']],
    6: [['상반기 마지막 달이에요. 올해 절반, 정말 잘 해 오셨어요', 'saving'], ['장마가 시작되는 때예요. 외근 일정엔 우산 꼭 챙기세요', 'health']],
    7: [['휴가철이 시작됐어요. 여행 가는 고객님께 안부 한 줄 어때요?', 'wave'], ['본격 무더위예요. 외근은 오전에 몰아 두면 덜 지쳐요', 'health']],
    8: [['휴가 다녀온 고객님 많을 때예요. 잘 다녀오셨는지 물어봐요', 'work'], ['폭염이 이어지는 8월이에요. 물 자주 드시면서 다니세요', 'health']],
    9: [['추석이 있는 달이에요. 명절 안부 문자 미리 준비해 둬요', 'calendar'], ['선선해진 9월이에요. 미뤄 둔 고객 방문 다니기 좋아요', 'work']],
    10: [['건강검진 막바지 시즌이에요. 고객님들 검진 소식 물어봐요', 'health'], ['일교차가 큰 10월이에요. 겉옷 하나 챙겨 다니세요', 'health']],
    11: [['수능이 있는 달이에요. 수험생 둔 고객님께 응원 한 줄 어때요?', 'wave'], ['김장철이에요. 고객님 댁 김장 안부 물어보면 반가워하세요', 'work'], ['연말정산 미리보기가 열리는 때예요. 고객님들 관심이 커져요', 'saving'], ['독감 예방접종 시즌이에요. 맞으셨어요? 건강 먼저 챙겨요', 'health']],
    12: [['한 해 마지막 달이에요. 고객님께 감사 인사 전하기 좋은 때예요', 'wave'], ['세액공제 마감이 12월 31일이에요. 고객님들이 많이 물어보실 때예요', 'saving'], ['동지가 있는 12월, 해가 짧아요. 외근은 일찍 마무리해요', 'calendar']]
  };
  function issueGreets() {
    return (ISSUE_MONTH[new Date().getMonth() + 1] || []).slice();
  }
  // AI 한마디: 서버 /api/greeting(Gemini, 지역·구간별 공유 캐시)을 1.5초 안에 받으면 그중 하나를 씀. 실패·키 없음·시간초과면 아래 pickGreet 그대로
  // 명세: docs/루티한마디_AI연동명세.md
  var ai = { started: false, done: false, items: null };
  function loadAiGreet() {
    if (ai.started) return; ai.started = true;
    var w = cache.weather, region = w && w.location ? String(w.location).split(' ')[0] : '서울';
    // 날씨 요약: 설명,현재기온,최저·최고,강수확률 (예: 흐림,12도,최저5도,최고14도,강수30%)
    var wx = w ? [w.description, w.temperature != null ? round(w.temperature) + '도' : '', w.minTemp != null ? '최저' + round(w.minTemp) + '도' : '', w.maxTemp != null ? '최고' + round(w.maxTemp) + '도' : '', w.rainProbability != null ? '강수' + round(w.rainProbability) + '%' : ''].filter(Boolean).join(',') : '';
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 1500);
    Promise.reject(new Error('preview'))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && Array.isArray(d.items) && d.items.length) ai.items = d.items; })
      .catch(function () {})
      .then(function () { clearTimeout(tm); ai.done = true; applyGreet(); });
  }
  function chooseGreet() { return ai.items ? ai.items[Math.floor(Math.random() * ai.items.length)] : pickGreet(); }
  var greetPicked = null, greetFinal = false;
  function pickGreet() {
    var now = new Date(), h = now.getHours(), r = Math.random();
    var tg = GREET_TIME[slot(h)].concat(dayGreets(now, h)), wg = weatherGreets(cache.weather, h), ig = issueGreets();
    // 시간대·요일 35% · 날씨 30% · 이달의 이슈 35% — 들어올 때마다 다른 문구
    var pool = r < 0.35 ? tg : r < 0.65 ? (wg.length ? wg : ig) : (ig.length ? ig : tg);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function greetReady() { return (cache.weather || cache.error || !token()) && ai.done; }
  setTimeout(function () { if (!greetFinal) { greetFinal = true; greetPicked = chooseGreet(); applyGreet(); } }, 3000);
  function applyGreet() {
    var lead = document.querySelector('#workspace .lead'); if (!lead) return;
    if (!ai.started && (cache.weather || cache.error || !token())) loadAiGreet();   // 날씨를 받은 뒤(또는 못 받으면) AI 인사말 요청
    if (!greetFinal && greetReady()) { greetFinal = true; greetPicked = chooseGreet(); }
    var h2 = lead.querySelector('.bubble h2'), img = lead.querySelector('img.ruti');
    if (!greetPicked) { if (h2) h2.style.opacity = '0'; return; }   // 날씨·AI 한마디를 받아 문구를 고를 때까지 잠깐 숨김(문구가 바뀌며 깜빡이지 않게)
    if (h2) { if (h2.textContent !== greetPicked[0]) h2.textContent = greetPicked[0]; var L = greetPicked[0].length; h2.style.fontSize = L > 34 ? '18px' : L > 24 ? '21px' : ''; h2.style.opacity = '1'; h2.style.transition = 'opacity .25s'; }
    var src = RUTI[greetPicked[1]] || RUTI.wave;
    if (img && img.getAttribute('src') !== src) { img.setAttribute('src', src); img.alt = '루티'; }
  }


  function paint() {
    applyGreet();
    var box = document.querySelector('#workspace .mr-today');
    if (!box) return;
    var w = cache.weather, f = cache.fortune;
    var loc = w && w.location ? w.location.replace(/^서울특별시\s*/, '') : '';
    box.innerHTML =
      '<section class="mr-card" aria-label="오늘 날씨"><div class="mr-card-head"><h3>오늘 날씨</h3>' + (loc ? '<small>📍 ' + esc(loc) + '</small>' : '') + '</div>' + weatherHtml() + '</section>' +
      '<section class="mr-card" aria-label="오늘의 운세"><div class="mr-card-head"><h3>오늘의 운세</h3>' + (f && f.fortuneDate ? '<small>' + esc(f.fortuneDate.replace(/-/g, '.')) + '</small>' : '') + '</div>' + fortuneHtml() + '</section>';
    box.querySelectorAll('[data-ft]').forEach(function (b) {
      b.addEventListener('click', function () { cache.tab = b.dataset.ft; paint(); });
    });
  }

  function load() {
    var tk = token();
    if (!tk) { paint(); return; }
    if (cache.loading || (cache.weather && cache.fortune)) { paint(); return; }
    cache.loading = true; paint();
    var H = { headers: { Authorization: 'Bearer ' + tk } };
    var get = function (path) { return fetch(API + path, H).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (j) { return j && (j.content || j.data); }); };
    Promise.allSettled([get('/v1/fc/weather?lat=' + LAT + '&lon=' + LON), get('/v1/fc/fortune/today')]).then(function (rs) {
      cache.loading = false;
      if (rs[0].status === 'fulfilled') cache.weather = rs[0].value;
      if (rs[1].status === 'fulfilled') cache.fortune = rs[1].value;
      // 오늘 운세를 ROOT 가 아직 만드는 중이면 8초 간격으로 최대 8번 다시 불러옴
      if (cache.fortune && cache.fortune.status && cache.fortune.status !== 'ready') pollFortune(get, 0);
      if (!cache.weather && !cache.fortune) cache.error = '정보를 불러오지 못했어요. ROOT 로그인 상태를 확인해 주세요.';
      paint();
    });
  }

  function pollFortune(get, n) {
    if (n >= 8) return;
    setTimeout(function () {
      get('/v1/fc/fortune/today').then(function (f) {
        cache.fortune = f; paint();
        if (!f || f.status !== 'ready') pollFortune(get, n + 1);
      }).catch(function () { pollFortune(get, n + 1); });
    }, 8000);
  }

  function mount() {
    var lead = document.querySelector('#workspace .lead');
    if (!lead) return;
    applyGreet();
    if (document.querySelector('#workspace .mr-today')) { mountNews(); return; }
    var box = document.createElement('div'); box.className = 'mr-today';
    lead.after(box);
    load();
    mountNews();
  }


  // ── 최근 보험 뉴스 (날씨·운세 아래) — 로컬 서버 /api/news (보험 전문지 RSS + 대표 사진) ──
  var NEWS_CSS =
    '#workspace .lead .bubble{flex:0 1 auto;min-width:0;max-width:470px}#workspace .lead .bubble h2{white-space:normal!important}@media (max-width:760px){#workspace .lead .bubble{max-width:none}}' +
    '.mr-news{margin:0 0 22px}' +
    '.mr-news-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px}' +
    '.mr-nw-top{display:block;text-decoration:none;color:inherit;border-radius:16px;overflow:hidden;border:1px solid #E6E9DE;cursor:pointer;transition:box-shadow .15s}' +
    '.mr-nw-top:hover,.mr-nw-item:hover{box-shadow:inset 0 0 0 2px #B5D334}' +
    '.mr-nw-top .mr-nw-img{aspect-ratio:16/9;width:100%;background:#EAF0CC center/cover no-repeat}' +
    '.mr-nw-top .mr-nw-body{padding:14px 16px 16px}' +
    '.mr-nw-top h4{margin:6px 0 6px;font-size:18px;line-height:1.4;font-weight:800;color:#1F2A12}' +
    '.mr-nw-top p{margin:0;font-size:13px;line-height:1.55;color:#5d6553;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.mr-nw-list{display:flex;flex-direction:column;gap:8px;min-width:0}' +
    '.mr-nw-item{display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;padding:8px;border-radius:14px;border:1px solid #EEF0E8;cursor:pointer;min-width:0}' +
    '.mr-nw-item .mr-nw-img{flex:0 0 92px;height:62px;border-radius:10px;background:#EAF0CC center/cover no-repeat}' +
    '.mr-nw-item h4{margin:3px 0 0;font-size:14px;line-height:1.4;font-weight:700;color:#1F2A12;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.mr-nw-meta{font-size:11.5px;font-weight:600;color:#7a8270}' +
    '.mr-nw-meta b{color:#769636;font-weight:800;margin-right:6px}' +
    '.mr-nw-hot{display:inline-block;background:#769636;color:#fff;font-size:11px;font-weight:800;border-radius:999px;padding:2px 8px;margin-right:6px}' +
    '.mr-nw-empty{font-size:13px;color:#7a8270;padding:10px 2px}' +
    '@media (max-width:760px){.mr-news-grid{grid-template-columns:1fr}.mr-nw-top h4{font-size:16px}}';
  var news = { items: null, loading: false };
  var ago = function (d) {
    var t = new Date(String(d).replace(' ', 'T') + '+09:00').getTime(); if (isNaN(t)) return '';
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    return m < 60 ? m + '분 전' : m < 1440 ? Math.round(m / 60) + '시간 전' : Math.round(m / 1440) + '일 전';
  };
  var bg = function (i) { return i.image ? ' style="background-image:url(\'' + esc(i.image).replace(/'/g, '%27') + '\')"' : ''; };
  function paintNews() {
    var box = document.querySelector('#workspace .mr-news'); if (!box) return;
    var it = news.items, body;
    if (!it) body = '<div class="mr-nw-empty">기사를 불러오는 중…</div>';
    else if (!it.length) body = '<div class="mr-nw-empty">화면 미리보기에서는 기사가 보이지 않아요. 실제 서비스에서는 보험 전문지 최신 기사가 여기에 떠요.</div>';
    else {
      var a = it[0];
      body = '<div class="mr-news-grid">' +
        '<a class="mr-nw-top" href="' + esc(a.link) + '" target="_blank" rel="noopener"><div class="mr-nw-img"' + bg(a) + '></div><div class="mr-nw-body">' +
        '<div class="mr-nw-meta"><span class="mr-nw-hot">NEW</span><b>' + esc(a.source) + '</b>' + ago(a.date) + '</div><h4>' + esc(a.title) + '</h4><p>' + esc(a.desc) + '</p></div></a>' +
        '<div class="mr-nw-list">' + it.slice(1, 6).map(function (i) {
          return '<a class="mr-nw-item" href="' + esc(i.link) + '" target="_blank" rel="noopener"><div class="mr-nw-img"' + bg(i) + '></div><div style="min-width:0">' +
            '<div class="mr-nw-meta"><b>' + esc(i.source) + '</b>' + ago(i.date) + '</div><h4>' + esc(i.title) + '</h4></div></a>';
        }).join('') + '</div></div>';
    }
    box.innerHTML = '<section class="mr-card" aria-label="최근 보험 뉴스"><div class="mr-card-head"><h3>최근 보험 뉴스</h3><small>보험 전문지 실시간</small></div>' + body + '</section>';
  }
  function loadNews() {
    if (news.items || news.loading) { paintNews(); return; }
    news.loading = true; paintNews();
    Promise.reject(new Error('preview')).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
      .then(function (d) { news.loading = false; news.items = Array.isArray(d) ? d : []; paintNews(); applyGreet(); });
  }
  function mountNews() {
    mountRank();
    var t = document.querySelector('#workspace .mr-today');
    if (!t || document.querySelector('#workspace .mr-news')) return;
    var b = document.createElement('div'); b.className = 'mr-news'; var ft = t.parentNode.querySelector(':scope > footer'); if (ft) t.parentNode.insertBefore(b, ft); else t.parentNode.appendChild(b); loadNews();
  }

  // ── 지금 많이 찾는 상품 순위 (주요 영업자료·공지사항 자리) ──
  // 지금은 시안용 예시 데이터(가상 보험사·상품명). 실제로는 ROOT 보험료 비교·상품 비교서 이용 기록으로 집계.
  var RANK_CSS =
    '#workspace .original-grid{display:none!important}' +
    '.mr-rank{margin:0 0 22px}' +
    '.mr-rk-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px}' +
    '.mr-rk-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}' +
    '.mr-rk-tabs button{border:1px solid #E1E5D8;background:#fff;color:#1F2A12;font:inherit;font-size:13px;font-weight:700;padding:6px 13px;border-radius:999px;cursor:pointer}' +
    '.mr-rk-tabs button:hover{border-color:#B5D334}' +
    '.mr-rk-tabs button[aria-selected=true]{background:#EAF0CC;border-color:#B5D334}' +
    '.mr-rk-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
    '.mr-rk-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px;border:1px solid #EEF0E8;border-radius:14px;cursor:pointer;background:#fff}' +
    '.mr-rk-row:hover{box-shadow:inset 0 0 0 2px #B5D334}' +
    '.mr-rk-no{font-size:20px;font-weight:900;color:#1F2A12;text-align:center;line-height:1}' +
    '.mr-rk-row:nth-child(-n+3) .mr-rk-no{color:#769636}' +
    '.mr-rk-mv{display:block;font-size:10.5px;font-weight:800;color:#7a8270;margin-top:3px}' +
    '.mr-rk-mv.up{color:#769636}' +
    '.mr-rk-name{min-width:0}' +
    '.mr-rk-name b{display:block;font-size:14.5px;color:#1F2A12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.mr-rk-name small{font-size:12px;color:#7a8270;font-weight:600}' +
    '.mr-rk-tag{font-size:11.5px;font-weight:800;color:#769636;background:#EAF0CC;border-radius:999px;padding:3px 9px;white-space:nowrap}' +
    '.mr-rk-side{display:flex;flex-direction:column;gap:12px;min-width:0}' +
    '.mr-rk-ad{border:1px solid #E6E9DE;border-radius:16px;padding:16px;background:#fff;position:relative;cursor:pointer}' +
    '.mr-rk-ad:hover{box-shadow:inset 0 0 0 2px #B5D334}' +
    '.mr-rk-ad .ad{position:absolute;top:12px;right:12px;font-size:10.5px;font-weight:800;color:#7a8270;border:1px solid #DADFCF;border-radius:6px;padding:1px 6px}' +
    '.mr-rk-ad em{font-style:normal;font-size:12px;font-weight:800;color:#769636}' +
    '.mr-rk-ad h4{margin:6px 0 6px;font-size:16px;line-height:1.4;color:#1F2A12}' +
    '.mr-rk-ad p{margin:0 0 12px;font-size:12.5px;line-height:1.55;color:#5d6553}' +
    '.mr-rk-btn{display:inline-block;background:#769636;color:#fff;font-size:12.5px;font-weight:800;border-radius:999px;padding:7px 14px}' +
    '.mr-rk-note{font-size:11.5px;color:#7a8270;line-height:1.5;margin:10px 2px 0}' +
    '.mr-rk-why{border-radius:16px;background:#EAF0CC;padding:14px 16px;font-size:12.5px;line-height:1.6;color:#1F2A12}' +
    '.mr-rk-why b{display:block;font-size:13.5px;margin-bottom:4px}' +
    '.mr-rk-row.on{box-shadow:inset 0 0 0 2px #B5D334;background:#FBFCF5}' +
    '.mr-rk-dt{border:1px solid #E6E9DE;border-radius:16px;padding:16px 18px;background:#fff;position:sticky;top:12px}' +
    '.mr-rk-dt-hd{display:flex;align-items:center;gap:8px}.mr-rk-dt-no{font-size:12px;font-weight:800;color:#769636}' +
    '.mr-rk-dt h4{margin:8px 0 2px;font-size:17px;line-height:1.4;color:#1F2A12}.mr-rk-dt>small{font-size:12.5px;color:#7a8270;font-weight:600}' +
    '.mr-rk-dt-sec{margin-top:12px}.mr-rk-dt-sec b{display:block;font-size:13px;color:#1F2A12;margin-bottom:4px}' +
    '.mr-rk-dt-sec p{margin:0;font-size:13px;line-height:1.6;color:#3d4535}.mr-rk-dt-sec ul{margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#3d4535}' +
    '.mr-rk-easy{background:#EAF0CC;border-radius:12px;padding:10px 12px}' +
    '.mr-rk-talk p{border-left:3px solid #B5D334;padding-left:10px}' +
    '.mr-rk-chk p{font-size:12.5px;color:#5d6553}' +
    '.mr-rk-dt-btns{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.mr-rk-dt-btns button{border:0;font:inherit;cursor:pointer}' +
    '.mr-rk-btn2{display:inline-block;background:#fff;color:#769636;font-size:12.5px;font-weight:800;border-radius:999px;padding:6px 13px;border:1.5px solid #769636!important}' +
    '.mr-rk-ad{margin-top:12px}' +
    '.mr-rk-emo{font-size:24px}.mr-rk-trend{display:block;font-size:11.5px;font-weight:800;color:#769636;margin-bottom:2px}' +
    '.mr-rk-muted{font-size:12px!important;color:#7a8270!important;margin-top:6px!important}' +
    '@media (max-width:760px){.mr-rk-grid{grid-template-columns:1fr}.mr-rk-dt{position:static}}';
  // ── 오늘의 황금상품 = 요즘 뜨는 트렌드 + 딱 짚은 원수사 상품 5개 ──
  // 상품명·보장·보험료는 ROOT 대시보드 「이 달의 추천 보험 상품」(ROOT 운영팀 선정) 자료 기준.
  // 판매 순위 공개 자료가 없어서 「요즘 왜 뜨는지 + 누가 좋아하는지 + 어떻게 팔면 되는지」로 정리.
  var PICKS = [
    { emoji: '💸', trend: '비급여 치료비 통째로 보장', insurer: '삼성화재', name: '비급여 통합치료비(비통치)', cat: '건강보험',
      easy: '병원에서 건강보험이 안 되는 비싼 치료(비급여)를 받으면, 치료비를 1년에 정해진 한도까지 묶어서 보장하는 건강보험이에요.',
      points: ['종합병원 이상 비급여 치료 연 1억 한도', '암 수술·약물·방사선 각 1천, 다빈치 로봇수술 1천/5백', '표적항암·면역항암·양성자 각 3천', '순환계(뇌·심장) 통합치료비 선지급'],
      boom: '4세대 실손은 비급여 자기부담이 커서, 실손이 못 채우는 비급여 치료비를 따로 준비하려는 수요가 크게 늘었어요. 요즘 손보사 건강보험 경쟁의 핵심이 바로 이 「통합치료비」예요.',
      who: ['4세대 실손으로 갈아탔거나 실손이 없는 고객', '로봇수술·신약 같은 최신 치료를 걱정하는 40~50대', '진단비 위주 옛날 보험만 있는 고객'],
      tips: ['「실손이 몇 세대세요?」로 시작하면 비급여 공백 이야기가 자연스럽게 나와요', '로봇수술·표적항암 실제 치료비 예시를 보여주면 바로 이해해요', '기존 진단비 보험은 유지하고 치료비만 더하는 「추가형」으로 제안하면 부담이 적어요'],
      check: '연간 한도·지급 횟수, 종합병원 이상 조건, 갱신 여부를 꼭 설명하세요.' },
    { emoji: '🎗️', trend: '암은 이제 진단비보다 치료비', insurer: '메리츠화재', name: '암치료비 3억 플랜', cat: '암보험', premium: '40세 남 암치료비 3억 월 11,600원 · 원투쓰리 표적항암 2억 월 5,850원 · 비통치 연 1억 월 5,324원',
      easy: '암에 걸리면 진단금 한 번이 아니라, 표적항암·비급여 치료를 받을 때마다 치료비를 크게(최대 3억) 받는 암보험이에요.',
      points: ['표적항암 2억 + 비급여 통합치료비 1억 = 최대 3억', '비급여 암 통합치료비 11종', '암 통원비 매월 지급 (산정특례 등록 50 · 항암약물 30 · 항암방사선 30)', '순환계 통합치료비 · 간병인 지원(365일)'],
      boom: '표적항암·면역항암처럼 한 번에 수천만 원이 드는 치료가 늘면서, 「진단비 3천」보다 「치료비 수억」을 찾는 고객이 많아졌어요. 만 원대 보험료로 큰 치료비를 준비한다는 점이 화제예요.',
      who: ['가족 중 암 환자가 있는 고객', '오래전에 진단비만 있는 암보험에 든 고객', '보험료는 아끼고 보장은 크게 원하는 30~40대'],
      tips: ['「요즘 암 치료비 얼마인지 아세요?」 표적항암 치료비 예시로 시작하세요', '월 1만 원대 보험료를 먼저 보여주면 거절이 줄어요', '기존 암보험 증권을 받아 「치료비 담보 있음/없음」만 체크해 주세요'],
      check: '갱신형 여부, 감액기간, 유사암 지급 비율을 꼭 확인하세요.' },
    { emoji: '🧩', trend: '실손이 못 채우는 구멍 메우기', insurer: '한화생명', name: '선녀플랜', cat: '건강보험', premium: '40세 남 28,220원 · 여 22,870원 (기본형 기준)',
      easy: '실손보험이 다 못 주는 선별급여·비급여 치료비와, 실손 보장 공백까지 채워 주는 생명보험사 건강보험이에요.',
      points: ['선별급여 연 최대 1천만 원 + 비급여 연 최대 1억6천만 원', '실손보장 공백까지 연간 최대 5천만 원', '비급여 암 주요치료비 최고 8천 (상급종합병원 3천 포함)', '항암약물치료 반복 지급 (입원·통원 각 1백, 표적항암 3백)'],
      boom: '실손 보험료는 오르고 보장은 줄면서 「실손만으론 불안하다」는 고객이 늘었어요. 실손 공백을 정면으로 채우는 상품이라 상담 포인트가 분명해요.',
      who: ['실손 보험료 인상으로 고민하는 고객', '실손 청구가 거절되거나 한도에 걸려 본 고객', '큰 병원(상급종합병원) 치료를 걱정하는 고객'],
      tips: ['「실손에서 덜 나온 적 있으세요?」라고 물어 실제 경험을 끌어내세요', '선별급여·비급여를 「실손이 반만 주는 치료」라고 쉽게 설명하세요', '남녀 보험료 차이를 보여주고 부부 동시 가입을 제안해 보세요'],
      check: '선별급여·비급여 정의와 연간 한도, 기본형/확장형 차이를 설명하세요.' },
    { emoji: '✅', trend: '유병자·암 경험자도 가입', insurer: 'KB손해보험', name: '3.N.암 심플러스', cat: '암보험(간편)',
      easy: '암 관련 질문만 하는 간편심사로 가입할 수 있고, 예전에 암 치료를 받았어도 조건을 채우면 전이·재발암까지 보장하는 암보험이에요.',
      points: ['암만 물어보는 간편심사', '진단비부터 암 주요치료비까지', '치료 종결 기준 충족 시 기존 암의 전이·재발도 보상', '생활비까지 담은 암 보장'],
      boom: '고령화로 지병이 있거나 암을 겪은 고객이 늘면서, 「가입 문턱이 낮은 보험」이 가장 빠르게 커지는 분야예요. 다른 데서 거절당한 고객에게 바로 제안할 수 있어요.',
      who: ['고혈압·당뇨 등 지병이 있는 50~60대', '암 치료를 마친 뒤 보험 가입을 포기했던 고객', '다른 보험사에서 가입을 거절당한 고객'],
      tips: ['「예전에 거절당하신 적 있으세요?」가 가장 강력한 첫 질문이에요', '치료 종결 시점과 현재 상태를 먼저 확인하고 제안하세요', '일반 상품보다 보험료가 높을 수 있다는 점을 먼저 말하면 신뢰가 쌓여요'],
      check: '간편심사 고지 항목에 정확히 답하도록 꼭 안내하세요(고지의무). 전이·재발 보장 조건을 정확히 설명하세요.' },
    { emoji: '🏦', trend: '원금 걱정 없는 노후 연금', insurer: 'KB라이프', name: 'KB 트리플 레벨업 연금보험', cat: '연금보험',
      easy: '일정 기간(7년·10년)마다 쌓인 적립금을 높여 주고, 최저 연금액을 보증해 주는 노후 준비용 연금보험이에요.',
      points: ['7년·10년, 연금 개시 시점에 적립금 UP', '두 번의 적립액 최저보증 + 20년 확정 연금형', '함께 보면 좋은 상품: KB 7년의약속플러스(체증형 사망 + 장기유지보너스)'],
      boom: '100세 시대에 국민연금만으론 부족하다는 인식이 커졌고, 투자 손실이 걱정되는 고객은 「최저보증」이 있는 연금을 찾아요. 연말 성과급·목돈이 생기는 시기와도 잘 맞아요.',
      who: ['40~50대 노후 준비를 시작하는 고객', '주식·펀드 손실이 걱정되는 안정형 고객', '연말 성과급이나 목돈을 굴릴 곳을 찾는 고객'],
      tips: ['「은퇴 후 매달 얼마가 필요하세요?」로 목표 연금액부터 정하세요', '최저보증을 「손해 볼 걱정 없는 바닥」이라고 쉽게 설명하세요', '보험·금융 계산기로 예상 연금액을 같이 계산해 보여주세요'],
      check: '중도 해지 시 환급금이 원금보다 적을 수 있다는 점, 최저보증 조건을 꼭 설명하세요.' }
  ];
  var rk = { sel: 0 };
  function goSide(re) {
    var s = [].slice.call(document.querySelectorAll('.sidebar .side-button')).filter(function (b) { return re.test(b.textContent); })[0];
    if (s) s.click();
  }
  function detailHtml(p, i) {
    var li = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    return '<div class="mr-rk-dt"><div class="mr-rk-dt-hd"><span class="mr-rk-tag">' + esc(p.cat) + '</span><span class="mr-rk-dt-no">황금상품 ' + (i + 1) + '</span></div>' +
      '<h4>' + esc(p.name) + '</h4><small>' + esc(p.insurer) + '</small>' +
      '<div class="mr-rk-dt-sec mr-rk-easy"><b>💡 어떤 상품이냐면</b><p>' + esc(p.easy) + '</p></div>' +
      '<div class="mr-rk-dt-sec"><b>📌 핵심 보장</b>' + li(p.points) + (p.premium ? '<p class="mr-rk-muted">보험료 예시 · ' + esc(p.premium) + '</p>' : '') + '</div>' +
      '<div class="mr-rk-dt-sec"><b>🔥 요즘 왜 뜰까?</b><p>' + esc(p.boom) + '</p></div>' +
      '<div class="mr-rk-dt-sec"><b>🙂 이런 고객이 좋아해요</b>' + li(p.who) + '</div>' +
      '<div class="mr-rk-dt-sec mr-rk-talk"><b>🍯 영업 꿀팁</b>' + li(p.tips) + '</div>' +
      '<div class="mr-rk-dt-sec mr-rk-chk"><b>✔ 상담 전 꼭 확인</b><p>' + esc(p.check) + '</p></div>' +
      '<div class="mr-rk-dt-btns"><button type="button" class="mr-rk-btn" data-go="compare">보험료 비교하기</button><button type="button" class="mr-rk-btn2" data-go="product">상품 비교서 만들기</button></div></div>';
  }
  function paintRank() {
    var box = document.querySelector('#workspace .mr-rank'); if (!box) return;
    if (rk.sel >= PICKS.length) rk.sel = 0;
    box.innerHTML = '<section class="mr-card" aria-label="오늘의 황금상품"><div class="mr-card-head"><h3>🏆 오늘의 황금상품은?</h3><small>요즘 뜨는 트렌드 · 딱 5개</small></div>' +
      '<div class="mr-rk-grid"><div style="min-width:0"><ol class="mr-rk-list">' + PICKS.map(function (p, i) {
        return '<li class="mr-rk-row' + (i === rk.sel ? ' on' : '') + '" data-sel="' + i + '" title="자세히 보기"><div class="mr-rk-no mr-rk-emo">' + p.emoji + '</div><div class="mr-rk-name"><span class="mr-rk-trend">' + esc(p.trend) + '</span><b>' + esc(p.name) + '</b><small>' + esc(p.insurer) + '</small></div><span class="mr-rk-tag">' + esc(p.cat) + '</span></li>';
      }).join('') + '</ol><p class="mr-rk-note">※ ROOT 운영팀이 요즘 트렌드에 맞춰 고른 상품이에요(판매 순위 아님). 보험료·보장은 나이·조건에 따라 달라요.</p>' +
      '<div class="mr-rk-ad" data-go="compare"><span class="ad">광고</span><em>보험사 추천 상품</em><h4>이번 달 보험사 신상품 소개</h4><p>보험사가 직접 소개하는 신상품 자리예요.</p><span class="mr-rk-btn">상품 자세히 보기</span></div></div>' +
      '<div class="mr-rk-side">' + detailHtml(PICKS[rk.sel], rk.sel) + '</div></div></section>';
    box.querySelectorAll('[data-sel]').forEach(function (b) { b.addEventListener('click', function () { rk.sel = +b.dataset.sel; paintRank(); if (window.innerWidth < 760) { var d = box.querySelector('.mr-rk-dt'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }); });
    box.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); goSide(b.dataset.go === 'product' ? /상품 비교서/ : /보험료 비교/); }); });
  }
  function mountRank() {
    var t = document.querySelector('#workspace .mr-today');
    if (!t || document.querySelector('#workspace .mr-rank')) return;
    var b = document.createElement('div'); b.className = 'mr-rank'; t.after(b); paintRank();
  }

  var st = document.createElement('style'); st.textContent = CSS + NEWS_CSS + RANK_CSS; document.head.appendChild(st);
  // 화면을 다시 그릴 때마다(render) 카드 다시 붙임
  var _r = window.render;
  if (typeof _r === 'function') { window.render = function () { _r.apply(this, arguments); mount(); }; }
  mount();
})();
