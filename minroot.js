/* 미니루트 맞춤형 — 동작 스크립트
 * - 자주 쓰는 업무 8개 → 실제 ROOT 세부 페이지 연결
 * - 질문 예시 카테고리 6개 전환
 * - ROOT AI 챗봇 (rag.sbt-root.com 스트리밍) 연동
 * - 헤더·하단 탭 → 실제 ROOT 페이지 연결
 */
(function () {
  'use strict';

  /* ── 설정 ─────────────────────────────────────── */
  const ROOT = 'https://sbt-root.com';
  const CHAT_API = 'https://rag.sbt-root.com/api/root/ask/stream';
  const USER = (() => { try { const u = JSON.parse(localStorage.getItem('user') || 'null'); if (u && u.idUser) return { user_id: u.idUser, user_name: u.name || '' }; } catch (e) {} return { user_id: 'guest', user_name: '' }; })();

  // ROOT 세부 페이지를 이 화면 안에서 연다.
  // 상단 틀(이지루트.html) 안이면 틀의 보기 창으로, 맞춤형.html 을 단독으로 열었으면 이 페이지 안의 보기 창으로.
  const EMBEDDED = window.parent !== window;
  const open = (path, title) => {
    if (EMBEDDED) window.parent.postMessage({ type: 'minroot:open', path, title: title || '' }, '*');
    else openViewer(path, title);
  };

  function openViewer(path, title) {
    let v = document.getElementById('mrViewer');
    if (!v) {
      const st = document.createElement('style');
      st.textContent =
        '#mrViewer{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;background:#fff}' +
        '#mrViewer[hidden]{display:none}' +
        '#mrViewer .mrv-bar{flex:0 0 auto;height:52px;display:flex;align-items:center;gap:8px;padding:0 12px;background:#f4f8f6;border-bottom:1px solid #c6d8ce}' +
        '#mrViewer .mrv-bar button,#mrViewer .mrv-bar a{height:36px;padding:0 14px;display:inline-flex;align-items:center;border:1px solid #c6d8ce;border-radius:10px;background:#fff;color:#3d5249;font:inherit;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap}' +
        '#mrViewer .mrv-bar .mrv-home{gap:6px;background:#769636;border-color:#769636;color:#fff}#mrViewer .mrv-bar .mrv-home:hover{background:#769636}' +
        '#mrViewer .mrv-out{display:none!important}' +
        '#mrViewer .mrv-title{flex:1 1 auto;min-width:0;font-size:15px;font-weight:800;color:#16261f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '#mrViewer .mrv-crop{position:relative;flex:1 1 auto;overflow:hidden}#mrViewer iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}';
      document.head.appendChild(st);
      v = document.createElement('section');
      v.id = 'mrViewer';
      v.hidden = true;
      v.innerHTML = '<div class="mrv-bar"><button type="button" class="mrv-back mrv-home"><svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 10.5 12 3l9 7.5\"/><path d=\"M5 9.5V21h14V9.5\"/><path d=\"M10 21v-6h4v6\"/></svg>홈 화면</button><span class="mrv-title"></span><a class="mrv-out" hidden></a></div><div class="mrv-crop"><iframe title="ROOT 페이지" allow="clipboard-write; microphone; geolocation"></iframe></div>';
      document.body.appendChild(v);
      const close = () => { v.hidden = true; v.querySelector('iframe').src = 'about:blank'; };
      v.querySelector('.mrv-back').addEventListener('click', close);
      v.querySelector('iframe').addEventListener('load', (e) => {
        const f = e.target; if (f.dataset.same !== '1') return;
        const hideUnclaimed = (dd) => dd.querySelectorAll('.fcdh-card').forEach((c) => { const ti = c.querySelector('.fcdh-card-title'); if (ti && ['미청구 보험금 찾기', '응급병원 평가기준표', '실시간 약국 찾기'].includes(ti.textContent.trim())) c.style.display = 'none'; });
        try { hideUnclaimed(f.contentDocument); new MutationObserver(() => hideUnclaimed(f.contentDocument)).observe(f.contentDocument.documentElement, { childList: true, subtree: true }); } catch (err) {}
        try { const dd = f.contentDocument; const css = '.planner-sidebar,.fc-drawer-overlay,.fc-topbar-hamburger{display:none!important}.planner-main{margin-left:0!important;width:100%!important;max-width:none!important}'; new MutationObserver(() => { if (!dd.getElementById('mrHide')) { const s2 = dd.createElement('style'); s2.id = 'mrHide'; s2.textContent = css; (dd.head || dd.documentElement).appendChild(s2); } }).observe(dd.documentElement, { childList: true, subtree: true }); } catch (err) {}
        try { const d = f.contentDocument; if (d && !d.getElementById('mrHide')) { const st = d.createElement('style'); st.id = 'mrHide'; st.textContent = '.planner-sidebar,.fc-drawer-overlay,.fc-topbar-hamburger{display:none!important}.planner-main{margin-left:0!important;width:100%!important;max-width:none!important}'; d.head.appendChild(st); } } catch (err) {}
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !v.hidden) close(); });
    }
    v.querySelector('.mrv-title').textContent = title || path;
    const same = location.protocol === 'http:' && location.host === 'localhost:5173';
    const f = v.querySelector('iframe');
    f.dataset.same = same ? '1' : '';
    v.querySelector('.mrv-out').href = ROOT + path;
    f.src = (same ? '' : ROOT) + path;
    v.hidden = false;
    cropRootSidebar(v);
  }
  // ROOT 좌측 사이드바(270px, 화면 폭 1024px 초과일 때만 표시)는 다른 사이트라 못 숨기므로 프레임을 왼쪽으로 밀어 가림
  function cropRootSidebar(v) {
    const box = v.querySelector('.mrv-crop'), f = v.querySelector('iframe');
    if (f.dataset.same === '1') { f.style.left = '0'; f.style.width = '100%'; return; }
    const w = box.clientWidth;
    if (w + 270 > 1024) { f.style.left = '-270px'; f.style.width = (w + 270) + 'px'; }
    else { f.style.left = '0'; f.style.width = '100%'; }
  }
  window.addEventListener('resize', () => { const v = document.getElementById('mrViewer'); if (v && !v.hidden) cropRootSidebar(v); });
  // 하단 홈 화면 전환 탭(홈 화면·간편·맞춤형·대시보드)과 우측 하단 챗봇 동그라미 버튼 제거
  (function () {
    const st = document.createElement('style');
    st.textContent = '.fcsw, .planner-chatbot-fab, .fcsc-sec--fav, .fcsc-fav, .fc-topbar-breadcrumb { visibility: hidden !important; } .fcsw, .planner-chatbot-fab, .fcsc-sec--fav, .fcsc-fav { display: none !important; }' +
      /* 자주 쓰는 업무 8개가 스크롤 없이 한 화면에 들어오도록 카드를 가로형으로 납작하게 */
      '[data-v2="quick"]{padding:18px 18px 16px !important}' +
      '[data-v2="quick"] h2{margin:0 0 12px !important;font-size:21px !important;font-weight:800 !important}' +
      '[data-v2="quick"] [data-q]{position:relative !important;display:flex !important;flex-direction:row !important;align-items:center !important;gap:12px !important;min-height:0 !important;height:auto !important;padding:18px 14px !important;border-radius:16px !important;text-align:left !important}' +
      '[data-v2="quick"] [data-q] > span:first-child{flex:0 0 52px !important;width:52px !important;height:52px !important;margin:0 !important;border-radius:12px !important;display:grid !important;place-items:center !important;overflow:hidden !important}' +
      '[data-v2="quick"] [data-q] > span:nth-child(2){flex:1 1 auto !important;min-width:0 !important;margin:0 !important}' +
      '[data-v2="quick"] [data-q] b{display:block !important;font-size:19px !important;font-weight:800 !important;line-height:1.3 !important;margin:0 !important;white-space:normal !important;word-break:keep-all !important}' +
      '[data-v2="quick"] [data-q] small{display:block !important;font-size:13.5px !important;line-height:1.4 !important;margin:4px 0 0 !important;white-space:normal !important;word-break:keep-all !important}' +
      '[data-v2="quick"] [data-q] > span:nth-child(3){display:none !important}' +
      '[data-v2="quick"] [data-q] + [data-q]{margin-top:0 !important}' +
      /* 마우스를 올리면 테두리를 키컬러(ROOT 초록)로 강조 */
      /* 선택된 질문 카테고리: 연한 연두 바탕 + 라임 테두리 + 짙은 올리브 글씨 + ✓ */
      '.fcsc-chip.is-on{background:#EAF0CC!important;border:1.5px solid #B5D334!important;color:#769636!important;font-weight:800!important;box-shadow:none!important}.fcsc-chip.is-on .fcsc-chip-ico{display:none!important}.fcsc-chip.is-on::before{content:"✓";margin-right:5px;font-weight:900}' +
      /* ROOT 강조색 변수(테두리·포커스·빛 번짐)를 키컬러로 통일 */
      ':root,body,.fcsc-page,.planner-layout{--accent:#769636 !important;--accent-hover:#769636 !important;--accent-rgb:181, 211, 52 !important;--accent-subtle:#B5D3340f !important;--accent-light:#B5D3341a !important;--glow-accent:#B5D33426 !important;--glow-accent-strong:#B5D3344d !important;--accent-soft-rgb:234, 240, 204 !important;--fc-glow-green:#B5D33438 !important}' +
      /* 챗봇 입력창: 마우스·입력 시 키컬러 테두리 */
      '.fcsc-page .fcsc-ask:hover,.fcsc-page .fcsc-ask:focus-within{border-color:#B5D334 !important;box-shadow:0 0 0 3px rgba(181,211,52,.18) !important}' +
      '.fcsc-page .fcsc-mic:hover,.fcsc-page .fcsc-chip:hover{border-color:#B5D334 !important}' +
      /* 문의하기(루티): 마우스 올리면 키컬러 테두리 */
      '.fcsc-avatar.mr-ruti{border-radius:50%}' +
      '.fcsc-avatar.mr-ruti:hover,.fcsc-avatar.mr-ruti:focus-visible{box-shadow:0 0 0 3px #B5D334 !important;outline:none !important}' +
      '.fcsc-avatar.mr-ruti:hover .mr-ruti-tag,.fcsc-avatar.mr-ruti:focus-visible .mr-ruti-tag{box-shadow:0 0 0 2px #B5D334,0 4px 12px rgba(118,150,54,.28) !important}' +
      /* 자주 쓰는 업무: 메뉴명 밑 작은 설명 문구 삭제 */
      '[data-v2="quick"] [data-q] small{display:none !important}' +
      '[data-v2="quick"] [data-q] b{font-size:21px !important;line-height:1.3 !important}' +
      '@media (max-width:600px){[data-v2="quick"] [data-q] b{font-size:18px !important}}' +
      /* 6개 카드: 큰 아이콘 위 + 큰 메뉴명 아래, 가운데 정렬 */
      '@media (min-width:601px){[data-v2="quick"] [data-q]{flex-direction:column !important;justify-content:center !important;align-items:center !important;gap:12px !important;text-align:center !important;padding:16px 10px !important}' +
      '[data-v2="quick"] [data-q] > span:first-child{flex:0 0 auto !important;width:76px !important;height:76px !important;border-radius:20px !important}' +
      '[data-v2="quick"] [data-q] > span:first-child img{width:68px !important;height:68px !important}' +
      '[data-v2="quick"] [data-q] > span:nth-child(2){flex:0 0 auto !important;width:100% !important}' +
      '[data-v2="quick"] [data-q] b{font-size:23px !important;line-height:1.25 !important;text-align:center !important}}' +
      /* 누를 수 있는 곳은 손가락 커서 */
      '[data-q],[data-q] *,.mr-qedit,.fcsc-chip,.fcsc-q,.fcsc-send,.fcsc-mic,.mr-ruti,.fc-topbar button,.fcsc-reset,.fcsc-ideas-toggle{cursor:pointer !important}' +
      '[data-v2="quick"] [data-q]{transition:border-color .15s,box-shadow .15s,transform .15s !important}' +
      '[data-v2="quick"] [data-q]:hover,[data-v2="quick"] [data-q]:focus-visible{border-color:#B5D334 !important;box-shadow:inset 0 0 0 2px #B5D334,0 6px 16px rgba(118,150,54,.14) !important;transform:translateY(-1px) !important;outline:none !important}' +
      '.fcsc-page .fcsc-split{max-width:none !important;width:100% !important;box-sizing:border-box !important;grid-template-columns:minmax(0,1.5fr) minmax(480px,1fr) !important;margin-left:0 !important;margin-right:0 !important;padding-left:40px !important;padding-right:40px !important}' +  /* 좌우 여백 없이 화면 꽉 차게 (2026-11-13) */
      '.fcsc-page .fcsc-input{min-height:92px !important;height:92px !important}' +  /* 챗봇 입력란 조금 더 높게 (2026-11-13) */
      '@media (min-width:1600px){[data-v2="quick"] [data-q] > span:first-child{width:100px !important;height:100px !important;border-radius:26px !important}' +
        '[data-v2="quick"] [data-q] > span:first-child img{width:90px !important;height:90px !important}' +
        '[data-v2="quick"] [data-q] b{font-size:27px !important}}' +  /* 자주 쓰는 기능: 카드가 커진 만큼 아이콘·글자 키움 (2026-11-13) */
      '.mr-qedit{align-self:center !important}' +
      '[data-v2="quick"] h2{align-self:center !important;margin:0 !important;line-height:38px !important;font-size:23px !important;font-weight:800 !important;color:#769636 !important;-webkit-text-fill-color:#769636 !important}' +
      '[data-v2="quick"] div:has(> .mr-qedit){margin-left:0 !important;margin-right:0 !important}' +  /* 자주 쓰는 기능 제목: 메뉴 수정 버튼과 한 줄·카드 양끝에 맞춤, 서브색 (2026-11-13) */
      '.fcsc-page .fcsc-input::placeholder{font-size:inherit !important}' +
      '@media (min-width:1600px){' +  /* 큰 화면: 루티 제목·아이콘·문의하기·입력란·카테고리·예시 질문 키움 (2026-11-13) */
        '.fcsc-page .fcsc-title{font-size:50px !important;line-height:1.25 !important}.fcsc-page .fcsc-title em{font-size:inherit !important}' +
        '.fcsc-page .fcsc-sub{font-size:24px !important}' +
        '.fcsc-page .fcsc-avatar,.fcsc-page .fcsc-halo{width:190px !important;height:190px !important}' +
        '.fcsc-page .fcsc-avatar img{width:150px !important;height:150px !important}' +
        '.fcsc-page .mr-ruti-tag{font-size:21px !important;padding:8px 18px !important;bottom:-14px !important}.fcsc-page .mr-ruti-tag .material-symbols-rounded{font-size:24px !important}' +
        '.fcsc-page .fcsc-input{font-size:19px !important}' +
        '.fcsc-page .fcsc-chip{font-size:18px !important;padding:11px 22px !important}' +
        '.fcsc-page .fcsc-q,.fcsc-page .fcsc-q *{font-size:19px !important}.fcsc-page .fcsc-q{padding:18px 4px !important}' +
      '}' +
      '[data-v2="expand"], [data-v2="expand"] + div{display:none !important}' +  /* 전체 기능 펼치기 삭제 */
      /* 우측 칸을 좌측 챗봇 영역(문구~질문 예시 끝)과 위아래 길이가 같게: 자주 쓰는 업무 박스가 남는 높이를 채우고 카드 8개가 고르게 나눠 가짐 */
      '@media (min-width:1281px){' +
        '.fcsc-page .fcsc-split{align-items:stretch !important}' +
        '.fcsc-page .fcsc-side{display:flex !important;flex-direction:column !important;padding:0 !important}' +
        '.fcsc-page .fcsc-side [data-v2="quick"]{flex:1 1 auto !important;display:flex !important;flex-direction:column !important;min-height:0 !important}' +
        '.fcsc-page .fcsc-side [data-qgrid]{flex:1 1 auto !important;grid-template-rows:repeat(var(--mr-rows,4),minmax(0,1fr)) !important;align-content:stretch !important}' +
        '.fcsc-page .fcsc-side [data-qgrid] [data-q]{height:100% !important}' +
      '}' +
      /* 모바일(좁은 화면): 카드 폭이 좁아 가로형이면 글자가 세로로 쪼개지므로 아이콘 위·글자 아래 세로형으로 */
      '@media (max-width:600px){' +
        '[data-v2="quick"]{padding:16px 14px 14px !important}' +
        '[data-v2="quick"] [data-qgrid]{gap:10px !important}' +
        '[data-v2="quick"] [data-q]{flex-direction:column !important;align-items:flex-start !important;gap:8px !important;padding:14px 12px !important}' +
        '[data-v2="quick"] [data-q] > span:first-child{flex:0 0 auto !important;width:44px !important;height:44px !important}' +
        '[data-v2="quick"] [data-q] > span:first-child img{width:40px !important;height:40px !important}' +
        '[data-v2="quick"] [data-q] > span:nth-child(2){width:100% !important}' +
        '[data-v2="quick"] [data-q] b{font-size:17px !important}' +
        '[data-v2="quick"] [data-q] small{font-size:13px !important}' +
      '}';
    document.head.appendChild(st);
  })();
  // 챗봇 답변 속 ROOT 링크도 화면 안에서 열기
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="' + ROOT + '"]');
    if (!a) return;
    e.preventDefault();
    open(a.getAttribute('href').slice(ROOT.length), a.textContent.replace(/[↗→]/g, '').trim());
  }, true);

  /* ── 자주 쓰는 업무 (메뉴 수정으로 추가·삭제 가능) ─────────
   * CATALOG: 고를 수 있는 ROOT 기능 전체. 경로는 ROOT 좌측 메뉴에서 직접 눌러 확인한 실제 경로.
   * 고른 목록은 이 브라우저에 저장(minroot:quick). 기본값은 DEFAULT_QUICK 6개. */
  const CATALOG = [
    { id: 'claim',      name: '보험금 청구',      desc: '청구서 작성·청구 이력',     url: '/planner/claim/request',              art: 'assets/v2_claim.webp' },
    { id: 'customer',   name: '고객관리',         desc: '고객 등록·검색·상담 이력',  url: '/planner/customers',                  art: 'assets/v2_staff.webp' },
    { id: 'premium',    name: '보험료 비교',      desc: '보험사별 조건 비교하기',    url: '/planner/claim/premium-compare',      art: 'assets/clay_premium-compare.png' },
    { id: 'unclaimed',  name: '미청구 보험금 찾기', desc: '놓친 보험금 확인하기',     url: '/planner/convenience/treatment-claim', art: 'assets/v2_solo-refund.webp' },
    { id: 'report',     name: '보장분석 보고서',  desc: 'AI 보장분석 보고서 만들기', url: '/planner/claim/report-basic',         art: 'assets/clay_coverage-report.png' },
    { id: 'product',    name: '상품 비교서',      desc: '보장·보험료 정리해 제안',   url: '/planner/claim/product-compare',      art: 'assets/v2_lg-mydocs.webp' },
    { id: 'fincalc',    name: '보험·금융 계산기', desc: '보험·금융 계산을 간편하게', url: '/planner/convenience/fin-calc',       art: 'assets/v2_calc.webp' },
    { id: 'edu',        name: '동영상 강의',        desc: '필요한 교육 찾아보기',      url: '/planner/education',                  art: 'assets/clay_video-lecture.png' },
    { id: 'talk',       name: '단체문자 발송',  desc: 'ROOT Talk로 자료 보내기',   url: '/planner/convenience/root-talk',      art: 'assets/v2_lg-webtoon.webp' },
    { id: 'board',      name: '오늘의 소식',      desc: '주요 소식·공지·영업자료',   url: '/planner/board',                      art: 'assets/v2_lg-mydocs.webp' },
    { id: 'schedule',   name: '일정 관리',        desc: '약속과 후속 업무 확인',     url: '/planner/schedule',                   art: 'assets/v2_alarm.webp' },
    { id: 'prepare',    name: '상담 준비',        desc: '보장분석·상품 비교서 모음', url: '/planner/claim/design',               art: 'assets/v2_coverage.webp' },
    { id: 'convenience', name: '편의 기능',       desc: '명함·계산기·약국 등',       url: '/planner/convenience',                art: 'assets/v2_calc.webp' },
  ];
  const DEFAULT_QUICK = ['claim', 'customer', 'schedule', 'edu', 'report', 'talk'];   // 2026-11-13 지정 기본값 6개
  const QUICK_KEY = 'minroot:quick';
  const QUICK_MAX = 10;
  const byId = (id) => CATALOG.find((c) => c.id === id);
  function loadQuick() {
    try {
      const v = JSON.parse(localStorage.getItem(QUICK_KEY) || 'null');
      if (Array.isArray(v)) {
        let list = v;
        // 한 번만: 새 기본값(2026-11-13)으로 바꿈 (이후 메뉴 수정으로 바꾼 건 그대로 둠)
        if (localStorage.getItem('minroot:quick:v') !== '4') { list = DEFAULT_QUICK.slice(); localStorage.setItem('minroot:quick:v', '4'); localStorage.setItem(QUICK_KEY, JSON.stringify(list)); }
        const ok = list.filter(byId).slice(0, QUICK_MAX); if (ok.length) return ok; }
    } catch (e) {}
    return DEFAULT_QUICK.slice();
  }
  function saveQuick(list) { try { localStorage.setItem(QUICK_KEY, JSON.stringify(list)); } catch (e) {} }

  let quickTpl = null, quickGrid = null;
  function buildQuick() {
    const box = document.querySelector('[data-v2="quick"]');
    if (!box) return;
    const cards = [...box.querySelectorAll('button')].filter((b) => b.querySelector('img'));
    if (!cards.length) return;
    quickGrid = cards[0].parentElement;
    quickGrid.setAttribute('data-qgrid', '');
    quickTpl = cards[0].cloneNode(true);
    // 제목 옆 「메뉴 수정」 버튼
    const h = box.querySelector('h2');
    if (h) h.textContent = '자주 쓰는 기능';
    if (h && !box.querySelector('.mr-qedit')) {
      const head = h.parentElement;
      head.style.cssText += ';display:flex !important;align-items:center !important;justify-content:space-between !important;gap:8px !important';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mr-qedit';
      b.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">tune</span>메뉴 수정';
      b.addEventListener('click', openQuickEditor);
      head.appendChild(b);
    }
    renderQuick();
  }
  function renderQuick() {
    if (!quickGrid) return;
    const list = loadQuick();
    quickGrid.innerHTML = '';
    quickGrid.style.setProperty('--mr-rows', String(Math.max(1, Math.ceil(list.length / 2))));
    list.map(byId).forEach((q) => {
      const c = quickTpl.cloneNode(true);
      const img = c.querySelector('img');
      img.src = q.art; img.alt = '';
      img.style.objectFit = q.photo ? 'cover' : 'contain';
      img.style.borderRadius = q.photo ? '14px' : '';
      img.style.width = '48px'; img.style.height = '48px';
      c.setAttribute('data-q', q.id);
      c.querySelector('b').textContent = q.name;
      c.querySelector('small').textContent = q.desc;
      c.title = q.name + ' 화면 열기';
      c.addEventListener('click', () => open(q.url, q.name));
      quickGrid.appendChild(c);
    });
  }

  const QE_CSS =
    '.mr-qedit{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border:1.5px solid #B5D334;border-radius:12px;background:#EAF0CC;color:#1F2A12;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;white-space:nowrap}' +
    '.mr-qedit:hover{background:#fff;box-shadow:0 0 0 2px #B5D334}.mr-qedit .material-symbols-rounded{font-size:19px}' +
    '.mr-qe-ov{position:fixed;inset:0;z-index:9500;background:rgba(15,30,24,.35);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.mr-qe{width:min(520px,100%);max-height:min(780px,calc(100vh - 32px));display:flex;flex-direction:column;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden;color:#16261f;font-family:inherit}' +
    '.mr-qe-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 6px}.mr-qe-head h2{margin:0;font-size:19px;font-weight:800}' +
    '.mr-qe-x{width:36px;height:36px;border:0;background:none;cursor:pointer;color:#6b7c74;font-size:20px;border-radius:10px}.mr-qe-x:hover{background:#f1f5f3}' +
    '.mr-qe-guide{margin:0;padding:0 22px 12px;font-size:13.5px;color:#5b6d65}' +
    '.mr-qe-body{flex:1 1 auto;overflow:auto;padding:4px 22px 16px}' +
    '.mr-qe-sec{margin:12px 0 8px;font-size:14px;font-weight:800;color:#3d5249}.mr-qe-sec small{font-weight:600;color:#8a9a93;margin-left:4px}' +
    '.mr-qe-list{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.mr-qe-item{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e3ebe7;border-radius:14px;background:#fff}' +
    '.mr-qe-item img{width:36px;height:36px;flex:0 0 36px;border-radius:10px;object-fit:contain}.mr-qe-item img.photo{object-fit:cover}' +
    '.mr-qe-item b{flex:1 1 auto;min-width:0;font-size:14px;line-height:1.3;word-break:keep-all}' +
    '.mr-qe-item button{flex:0 0 30px;width:30px;height:30px;border:0;border-radius:50%;cursor:pointer;font-size:18px;line-height:30px;padding:0}' +
    '.mr-qe-item .rm{background:#fdecec;color:#b42318}.mr-qe-item .add{background:#EAF0CC;color:#769636}.mr-qe-item .add:disabled{opacity:.35;cursor:default}' +
    '.mr-qe-item.on{border-color:#EAF0CC;background:#EAF0CC;cursor:grab;touch-action:none;user-select:none}' +
    '.mr-qe-item.on:hover{border-color:#B5D334}' +
    '.mr-qe-grip{flex:0 0 14px;color:#A3AE7A;font-size:16px;line-height:1;letter-spacing:-2px}' +
    '.mr-qe-no{flex:0 0 22px;height:22px;border-radius:50%;background:#769636;color:#fff;font-size:12px;font-weight:800;display:grid;place-items:center}' +
    '.mr-qe-item.dragging{opacity:.55;transform:scale(.98);border-style:dashed;border-color:#769636;cursor:grabbing}' +
    '.mr-qe-tip{display:block;line-height:1.55;margin:0 22px 8px;padding:9px 12px;border-radius:12px;background:#EAF0CC;color:#769636;font-size:13px;font-weight:600}' +
    '.mr-qe-empty{grid-column:1/-1;padding:14px;text-align:center;color:#8a9a93;font-size:13.5px;border:1px dashed #d5e0da;border-radius:14px}' +
    '.mr-qe-foot{display:flex;gap:8px;padding:14px 22px 18px;border-top:1px solid #eef3f0}' +
    '.mr-qe-foot button{height:46px;border-radius:12px;font:inherit;font-size:15px;font-weight:800;cursor:pointer}' +
    '.mr-qe-reset{padding:0 14px;border:1px solid #d5e0da;background:#fff;color:#5b6d65}.mr-qe-cancel{margin-left:auto;padding:0 18px;border:1px solid #d5e0da;background:#fff;color:#3d5249}' +
    '.mr-qe-save{padding:0 24px;border:0;background:#769636;color:#fff}' +
    '@media (max-width:600px){.mr-qe-list{grid-template-columns:1fr}}';

  function openQuickEditor() {
    if ($('.mr-qe-ov')) return;
    let sel = loadQuick();
    const ov = document.createElement('div');
    ov.className = 'mr-qe-ov';
    ov.innerHTML =
      '<div class="mr-qe" role="dialog" aria-modal="true" aria-label="자주 쓰는 기능 메뉴 수정">' +
        '<div class="mr-qe-head"><h2>자주 쓰는 기능 메뉴 수정</h2><button type="button" class="mr-qe-x" aria-label="닫기">✕</button></div>' +
        '<p class="mr-qe-guide">－ 로 빼고, ＋ 로 넣으세요. (최대 ' + QUICK_MAX + '개)</p>' +
        '<p class="mr-qe-tip">⠿ 보이는 메뉴는 <b>끌어서(드래그) 원하는 위치로 옮길 수 있어요.</b> 번호 순서대로 화면에 보여요.</p>' +
        '<div class="mr-qe-body"></div>' +
        '<div class="mr-qe-foot"><button type="button" class="mr-qe-reset">기본값으로</button><button type="button" class="mr-qe-cancel">취소</button><button type="button" class="mr-qe-save">저장</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    const body = ov.querySelector('.mr-qe-body');
    const item = (c, on, full, no) =>
      '<div class="mr-qe-item' + (on ? ' on' : '') + '"' + (on ? ' data-id="' + c.id + '" title="끌어서 위치를 옮길 수 있어요"' : '') + '>' +
      (on ? '<span class="mr-qe-grip" aria-hidden="true">⠿</span><span class="mr-qe-no">' + no + '</span>' : '') +
      '<img src="' + c.art + '" alt="" draggable="false"' + (c.photo ? ' class="photo"' : '') + '><b>' + esc(c.name) + '</b>' +
      (on ? '<button type="button" class="rm" data-rm="' + c.id + '" aria-label="' + esc(c.name) + ' 빼기">－</button>'
          : '<button type="button" class="add" data-add="' + c.id + '" aria-label="' + esc(c.name) + ' 넣기"' + (full ? ' disabled' : '') + '>＋</button>') + '</div>';
    function paint() {
      const full = sel.length >= QUICK_MAX;
      const rest = CATALOG.filter((c) => !sel.includes(c.id));
      body.innerHTML =
        '<div class="mr-qe-sec">보이는 메뉴<small>' + sel.length + ' / ' + QUICK_MAX + '</small></div>' +
        '<div class="mr-qe-list">' + (sel.length ? sel.map((id, i) => item(byId(id), true, false, i + 1)).join('') : '<div class="mr-qe-empty">메뉴를 하나 이상 넣어 주세요.</div>') + '</div>' +
        '<div class="mr-qe-sec">넣을 수 있는 메뉴</div>' +
        '<div class="mr-qe-list">' + (rest.length ? rest.map((c) => item(c, false, full)).join('') : '<div class="mr-qe-empty">모든 메뉴를 넣었어요.</div>') + '</div>';
      body.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { sel = sel.filter((x) => x !== b.dataset.rm); paint(); }));
      body.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => { if (sel.length < QUICK_MAX) { sel.push(b.dataset.add); paint(); } }));
      ov.querySelector('.mr-qe-save').disabled = !sel.length;
      enableDrag(body.querySelector('.mr-qe-list'));
    }
    // 보이는 메뉴 끌어서 순서 바꾸기
    function enableDrag(list) {
      if (!list) return;
      list.querySelectorAll('.mr-qe-item.on').forEach((el) => {
        el.addEventListener('pointerdown', (e) => {
          if (e.button !== 0 || e.target.closest('button')) return;
          e.preventDefault();
          try { el.setPointerCapture(e.pointerId); } catch (err) {}
          el.classList.add('dragging');
          const move = (ev) => {
            const under = document.elementFromPoint(ev.clientX, ev.clientY);
            const tgt = under && under.closest('.mr-qe-item.on');
            if (!tgt || tgt === el || tgt.parentElement !== list) return;
            const items = [...list.querySelectorAll('.mr-qe-item.on')];
            if (items.indexOf(el) < items.indexOf(tgt)) tgt.after(el); else tgt.before(el);
            [...list.querySelectorAll('.mr-qe-item.on')].forEach((x, i) => { const n = x.querySelector('.mr-qe-no'); if (n) n.textContent = i + 1; });
          };
          const up = () => {
            el.classList.remove('dragging');
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            sel = [...list.querySelectorAll('.mr-qe-item.on')].map((x) => x.dataset.id);
          };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerup', up);
          el.addEventListener('pointercancel', up);
        });
      });
    }
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('.mr-qe-x').addEventListener('click', close);
    ov.querySelector('.mr-qe-cancel').addEventListener('click', close);
    ov.querySelector('.mr-qe-reset').addEventListener('click', () => { sel = DEFAULT_QUICK.slice(); paint(); });
    ov.querySelector('.mr-qe-save').addEventListener('click', () => { if (!sel.length) return; saveQuick(sel); renderQuick(); close(); });
    document.addEventListener('keydown', onKey);
    paint();
  }
  (function () { const s = document.createElement('style'); s.textContent = QE_CSS; document.head.appendChild(s); })();

  /* ── 질문 예시 카테고리 ───────────────────────── */
  const IDEAS = {
    '고객': ['○○○ 고객의 최근 상담 내용을 요약해줘', '○○○ 고객이 가입한 보험을 한눈에 정리해줘', '이번 달 생일인 고객을 알려줘', '오랫동안 연락하지 못한 고객을 찾아줘'],
    '일정': ['오늘 일정을 한눈에 보여줘', '이번 주 상담 일정을 정리해줘', '내일 미팅 전에 준비할 내용을 알려줘', '○○○ 고객과의 다음 약속을 알려줘'],
    '상품·약관': ['○○○ 상품의 보장 내용을 알려줘', '○○○ 보험의 면책 사항을 알려줘', '암보험 갱신형과 비갱신형의 차이를 설명해줘', '40대 남성에게 맞는 실손보험을 비교해줘'],
    '보험금 청구': ['실손 보험금 청구에 필요한 서류를 알려줘', '통원 치료 청구는 어떻게 진행해?', '청구 후 보험금이 지급되기까지 얼마나 걸려?', '○○○ 고객의 미청구 보험금을 찾아줘'],
    '영업': ['신규 고객에게 보낼 첫 인사 문자를 써줘', '보장분석 상담을 시작하는 멘트를 알려줘', '거절했던 고객에게 다시 연락할 때 할 말을 알려줘', '이번 달 목표를 달성할 전략을 제안해줘'],
    'ROOT 사용법': ['ROOT에서 고객을 등록하는 방법을 알려줘', '보험금 청구 화면은 어디에 있어?', 'ROOT Talk로 여러 고객에게 한 번에 보내는 방법을 알려줘', '보장분석 보고서는 어떻게 만들어?'],
  };
  const VAR = '○○○';

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderIdeas(cat) {
    const ul = $('.fcsc-qs');
    if (!ul) return;
    const tpl = ul.querySelector('li');
    ul.innerHTML = '';
    IDEAS[cat].forEach((q) => {
      const li = tpl.cloneNode(true);
      const text = li.querySelector('.fcsc-q-text');
      text.innerHTML = q.split(VAR).map((p) => '<span>' + esc(p) + '</span>').join('<em class="fcsc-q-var">' + VAR + '</em>').replace(/<span><\/span>/g, '');
      li.querySelector('.fcsc-q').addEventListener('click', () => pickIdea(q));
      ul.appendChild(li);
    });
  }

  function initChips() {
    const chips = [...document.querySelectorAll('.fcsc-chip')];
    chips.forEach((c) => c.addEventListener('click', () => {
      chips.forEach((x) => { x.classList.remove('is-on'); x.setAttribute('aria-selected', 'false'); });
      c.classList.add('is-on'); c.setAttribute('aria-selected', 'true');
      renderIdeas(c.textContent.trim());
    }));
    const on = chips.find((c) => c.classList.contains('is-on')) || chips[0];
    if (on) renderIdeas(on.textContent.trim());
    const tog = $('.fcsc-ideas-toggle');
    if (tog) tog.addEventListener('click', () => {
      const box = $('.fcsc-ideas');
      const o = box.classList.toggle('is-open');
      tog.setAttribute('aria-expanded', String(o));
    });
  }

  function pickIdea(q) {
    const ta = $('.fcsc-input');
    if (q.includes(VAR)) {           // 이름을 채워 넣어야 하는 질문 → 입력창에 넣고 ○○○ 선택
      ta.value = q; syncSend(); ta.focus();
      const i = q.indexOf(VAR); ta.setSelectionRange(i, i + VAR.length);
    } else {
      ask(q);
    }
  }

  /* ── 챗봇 ─────────────────────────────────────── */
  let history = [];
  let ctrl = null;
  let chatEl = null;

  const timeStr = () => {
    const d = new Date(); let h = d.getHours(); const ap = h < 12 ? '오전' : '오후';
    h = h % 12 || 12; return ap + ' ' + h + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  function md(src) {
    const inline = (s) => esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => '<a href="' + (u.startsWith('/') ? ROOT + u : u) + '" target="_blank" rel="noopener">' + t + '</a>');
    const out = []; let list = null;
    const close = () => { if (list) { out.push('</' + list + '>'); list = null; } };
    let para = [];
    const flush = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
    for (const raw of src.split('\n')) {
      const line = raw.trimEnd();
      let m;
      if ((m = line.match(/^\s*\d+\.\s+(.*)/))) { flush(); if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { flush(); if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); continue; }
      if ((m = line.match(/^#{1,4}\s+(.*)/))) { flush(); close(); out.push('<p><strong>' + inline(m[1]) + '</strong></p>'); continue; }
      if (!line.trim()) { flush(); close(); continue; }
      close(); para.push(line);
    }
    flush(); close();
    return out.join('');
  }

  function enterChat() {
    if (chatEl) return;
    const main = $('.fcsc-main');
    $('.fcsc-split').classList.add('is-chat');
    main.querySelectorAll('.fcsc-hero, .fcsc-ideas').forEach((e) => (e.style.display = 'none'));
    const head = document.createElement('div');
    head.className = 'fcsc-chat-head';
    head.innerHTML = '<span class="fcsc-chat-who"><img alt="" src="assets/chat_mascot.png">ROOT AI</span><button type="button" class="fcsc-reset">새 대화</button>';
    chatEl = document.createElement('div');
    chatEl.className = 'fcsc-chat';
    chatEl.innerHTML = '<div class="fcsc-end" aria-hidden="true"></div>';
    const askBox = $('.fcsc-ask');
    main.insertBefore(head, askBox);
    main.insertBefore(chatEl, askBox);
    head.querySelector('.fcsc-reset').addEventListener('click', resetChat);
  }

  function resetChat() {
    if (ctrl) ctrl.abort();
    history = [];
    const main = $('.fcsc-main');
    main.querySelectorAll('.fcsc-chat-head, .fcsc-chat').forEach((e) => e.remove());
    main.querySelectorAll('.fcsc-hero, .fcsc-ideas').forEach((e) => (e.style.display = ''));
    $('.fcsc-split').classList.remove('is-chat');
    chatEl = null;
  }

  function addRow(role, html) {
    const row = document.createElement('div');
    if (role === 'user') {
      row.className = 'pcb-row pcb-row--user';
      row.innerHTML = '<div class="pcb-col pcb-col--right"><div class="pcb-msg pcb-msg--user"></div><div class="pcb-time pcb-time--right">' + timeStr() + '</div></div>';
      row.querySelector('.pcb-msg').textContent = html;
    } else {
      row.className = 'pcb-row pcb-row--bot';
      row.innerHTML = '<img class="pcb-avatar" alt="" src="assets/chat_avatar.png"><div class="pcb-col"><div class="pcb-msg pcb-msg--bot"><div>' + html + '</div></div><div class="pcb-time pcb-time--left">' + timeStr() + '</div></div>';
    }
    chatEl.insertBefore(row, chatEl.querySelector('.fcsc-end'));
    row.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return row;
  }

  async function ask(q) {
    q = (q || '').trim();
    if (!q) return;
    const ta = $('.fcsc-input');
    ta.value = ''; syncSend();
    enterChat();
    addRow('user', q);
    const bot = addRow('bot', '<p class="mr-typing">답변을 준비하고 있어요…</p>');
    const body = bot.querySelector('.pcb-msg--bot > div');
    const prev = history.slice();
    history.push({ role: 'user', content: q });
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    let text = '';
    const paint = () => { body.innerHTML = md(text); bot.scrollIntoView({ block: 'end' }); };
    try {
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history: prev, ...USER, current_route: '/planner/start/custom' }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const l of lines) {
          if (!l.startsWith('data:')) continue;
          let ev; try { ev = JSON.parse(l.slice(5)); } catch (e) { continue; }
          if (ev.type === 'delta') { text += ev.text || ''; paint(); }
          else if (ev.type === 'answer') { text = ev.text || text; paint(); }
          else if (ev.type === 'error') { throw new Error(ev.message || '오류'); }
        }
      }
      if (!text) { text = '답변을 받지 못했어요. 다시 질문해 주세요.'; paint(); }
      history.push({ role: 'assistant', content: text });
    } catch (e) {
      if (e.name === 'AbortError') return;
      body.innerHTML = '<p>답변을 가져오지 못했어요. (' + esc(String(e.message || e)) + ')</p>';
      history.pop();
    }
  }

  function syncSend() {
    const ta = $('.fcsc-input'); const s = $('.fcsc-send');
    if (s) s.disabled = !ta.value.trim();
  }

  function initAsk() {
    const ta = $('.fcsc-input'); const send = $('.fcsc-send'); const mic = $('.fcsc-mic');
    if (!ta) return;
    ta.value = '';
    ta.addEventListener('input', syncSend);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(ta.value); }
    });
    send.addEventListener('click', () => ask(ta.value));
    syncSend();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    mic.addEventListener('click', () => {
      if (!SR) { alert('이 브라우저에서는 음성 입력을 지원하지 않아요. 크롬에서 열어 주세요.'); return; }
      const r = new SR(); r.lang = 'ko-KR'; r.interimResults = false;
      mic.classList.add('is-on');
      r.onresult = (ev) => { ta.value = (ta.value ? ta.value + ' ' : '') + ev.results[0][0].transcript; syncSend(); ta.focus(); };
      r.onerror = (ev) => { if (ev.error === 'not-allowed') alert('마이크 권한이 필요해요. 주소창 왼쪽 아이콘에서 마이크를 허용해 주세요.'); };
      r.onend = () => mic.classList.remove('is-on');
      r.start();
    });
  }

  /* ── 헤더·하단 탭 → 실제 ROOT ─────────────────── */
  function initNav() {
    const bind = (sel, path) => document.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(path); }));
    bind('.fc-topbar-sub', '/planner/subscription');
    bind('.fc-topbar-point', '/planner/point-charge');
    bind('.fc-topbar-icon-btn--cart', '/planner/cart');
    bind('.fcsw-opt[aria-label="간편 홈 화면"]', '/planner/start/simple');
    bind('.fcsw-opt[aria-label="대시보드 홈 화면"]', '/planner/dashboard');
    const fab = $('.planner-chatbot-fab');
    if (fab) fab.addEventListener('click', () => { const ta = $('.fcsc-input'); ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); ta.focus(); });
  }

  /* ── 하루를 여는 주요 뉴스 (ROOT 카드뉴스 팝업) ─────
   * ROOT 와 같은 방식: 페이지를 열거나 새로고침하면 뜸.
   * "오늘 하루 보지 않음" 을 누르면 그날은 안 뜸 (localStorage).
   * 이미지: ROOT API(/v1/dailynews/today)는 로그인 토큰이 필요하고 file:// 에서는 호출이 막혀서,
   *        토큰을 쓸 수 있는 환경이면 API로 최신 이미지를 받고, 아니면 아래 기본 이미지를 씀. */
  const DAILY_FALLBACK = {
    displayDate: '2026-11-12',
    imageUrl: 'https://root-common-content.s3.ap-northeast-2.amazonaws.com/dailynews/banners/891a0e5f-05ab-4af6-a573-1f57e0aadf03.png',
  };
  const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const DISMISS_KEY = 'minroot:dailyNewsDismissed';

  async function loadDaily() {
    try {
      const tk = localStorage.getItem('token');
      if (tk) {
        const r = await fetch('https://api-fc-root.sbt-root.com/api/v1/dailynews/today', { headers: { Authorization: 'Bearer ' + tk } });
        if (r.ok) { const j = await r.json(); if (j && j.imageUrl) return j; }
      }
    } catch (e) { /* file:// 등에서는 막힘 → 기본 이미지 */ }
    return DAILY_FALLBACK;
  }

  // ★ 하루를 여는 카드뉴스 팝업: 작업 중에는 끔. 프론트 확정 후 최종 HTML 만들 때 true 로 켬.
  const SHOW_DAILY = true;   // 2026-11-13 켬 (간편모드 첫 화면에 「하루를 여는 주요 뉴스」 팝업)
  async function showDaily() {
    if (!SHOW_DAILY) return;
    try { if (localStorage.getItem(DISMISS_KEY) === today()) return; } catch (e) {}
    const n = await loadDaily();
    const ov = document.createElement('div');
    ov.className = 'fc-modal-overlay';
    ov.innerHTML =
      '<div class="fc-modal fc-modal--lg fcn-daily-modal fcn-daily-auto" role="dialog" aria-modal="true" aria-label="하루를 여는 주요 뉴스">' +
        '<div class="fc-modal-header"><h2 class="fc-modal-title">하루를 여는 주요 뉴스</h2>' +
          '<div class="fc-modal-header-actions">' +
            '<button type="button" class="fcn-daily-dl-btn" aria-label="인쇄" title="인쇄 · PDF"><span class="material-symbols-rounded fcn-daily-dl-icon">print</span></button>' +
            '<button type="button" class="fc-modal-close" aria-label="닫기"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg></button>' +
          '</div></div>' +
        '<div class="fc-modal-body"><img class="fcn-daily-popup-img" alt="하루를 여는 주요 뉴스" src="' + esc(n.imageUrl) + '"></div>' +
        '<div class="fc-modal-actions"><span class="fcn-daily-dismiss-text" role="button" tabindex="0">오늘 하루 보지 않음</span><button type="button" class="fcn-daily-close-btn">닫기</button></div>' +
      '</div>';
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, today()); } catch (e) {} close(); };
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('.fc-modal-close').addEventListener('click', close);
    ov.querySelector('.fcn-daily-close-btn').addEventListener('click', close);
    const dm = ov.querySelector('.fcn-daily-dismiss-text');
    dm.addEventListener('click', dismiss);
    dm.addEventListener('keydown', (e) => { if (e.key === 'Enter') dismiss(); });
    ov.querySelector('.fcn-daily-dl-btn').addEventListener('click', () => {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write('<!doctype html><title>하루를여는주요뉴스_' + n.displayDate.replace(/-/g, '') + '</title><style>@page{margin:0}body{margin:0}img{width:100%;display:block}</style><img src="' + esc(n.imageUrl) + '" onload="setTimeout(function(){print()},300)">');
      w.document.close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
  }

  /* ── 상단 모드 스위치: 간편모드(이 화면) / 일반모드(기존 ROOT) ── */
  const NORMAL_MODE_URL = '/planner/dashboard';
  function initModeSwitch() {
    if (EMBEDDED) return;               // 상단 틀 안에서는 틀의 스위치를 씀
    const bar = $('.fc-topbar') || $('header');
    if (!bar) return;
    const st = document.createElement('style');
    st.textContent =
      '.mr-mode{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:4px;padding:4px;background:#fff;border:1px solid #c6d8ce;border-radius:14px;z-index:5}' +
      '.mr-mode button{height:38px;padding:0 18px;border:0;border-radius:10px;background:transparent;color:#3d5249;font-family:inherit;font-weight:700;font-size:15px;line-height:1;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}' +
      '.mr-mode button:hover{background:#EAF0CC}' +
      '.mr-mode button.is-on{background:#769636;color:#fff;box-shadow:0 3px 10px rgba(118,150,54,.25);cursor:default}' +
      '@media (max-width:600px){.mr-mode{padding:3px;border-radius:12px}.mr-mode button{height:32px;padding:0 12px;font-size:13px;border-radius:9px}}';
    document.head.appendChild(st);
    if (getComputedStyle(bar).position === 'static') bar.style.position = 'relative';
    const sw = document.createElement('nav');
    sw.className = 'mr-mode';
    sw.setAttribute('aria-label', '화면 모드');
    sw.innerHTML = '<button type="button" class="is-on" aria-pressed="true">간편모드</button><button type="button" aria-pressed="false" title="기존 ROOT 화면으로 이동">전체모드</button>';
    sw.children[1].addEventListener('click', () => { location.href = '이지루트.html#normal'; });
    bar.appendChild(sw);
  }

  /* ── ROOT 로그인 (문의 전송·내 문의·카드뉴스용) ─────────
   * ROOT API 는 localhost:5173 주소에서만 호출을 허용하므로, 「이지루트 실행.bat」 으로 띄웠을 때 동작함.
   * 로그인 결과는 ROOT 와 같은 이름(token, user)으로 이 주소의 브라우저 저장소에 보관. */
  const API = 'https://api-fc-root.sbt-root.com/api';
  const getToken = () => { try { return localStorage.getItem('token') || ''; } catch (e) { return ''; } };
  const IS_FILE = location.protocol === 'file:';
  async function rootLogin(id, pw) {
    const r = await fetch(API + '/v1/auth/fc/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUser: id.trim(), password: pw, keepSignedIn: true }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.result || !j.token) throw new Error(j.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
    const user = { idUser: j.idUser || id.trim(), noEmp: j.noEmp, name: j.name || '', authority: j.authority, role: j.role ?? null, businessUnitCode: j.businessUnitCode ?? null, admin: j.admin, position: j.position ?? '-', mustChangePassword: j.mustChangePassword ?? false, orgAuthorityCode: j.orgAuthorityCode ?? '', defaultQueryStoreCode: j.defaultQueryStoreCode ?? '', keepSignedIn: j.keepSignedIn ?? true, operator: j.operator === true };
    try { localStorage.setItem('token', j.token); localStorage.setItem('user', JSON.stringify(user)); } catch (e) {}
    return user;
  }
  async function api(path, opts) {
    const o = opts || {};
    const r = await fetch(API + path, { ...o, headers: { ...(o.headers || {}), Authorization: 'Bearer ' + getToken() } });
    if (r.status === 401 || r.status === 403) {
      try { localStorage.removeItem('token'); } catch (e) {}
      const err = new Error('로그인이 만료됐어요. 다시 로그인해 주세요.'); err.auth = true; throw err;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || '요청에 실패했어요. 잠시 후 다시 시도해 주세요.');
    return j;
  }

  /* ── 루티 「문의하기」 → 문의 작성 창 (ROOT 「의견 보내기」와 같은 구성·같은 API로 전송) ──
   * 남기기: 카테고리·내용·이미지(최대 10장, Ctrl+V 붙여넣기) → POST /v1/fc/feedbacks
   * 내 문의: GET /v1/fc/feedbacks?scope=mine (답변 확인)
   * 고객센터 전화·메일은 하단에 작게. */
  const CATS = ['버그', '기능 제안', '불편', '칭찬', '기타'];
  const CS_LINE = '고객센터 <a href="tel:01048902249">010-4890-2249</a> · <a href="mailto:sbt3466@gmail.com">sbt3466@gmail.com</a> · 평일 09:30~11:30 / 13:30~17:00';
  const INQ_CSS =
    '.mr-inq-ov{position:fixed;inset:0;z-index:9500;background:rgba(15,30,24,.35);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.mr-inq{width:min(460px,100%);max-height:min(760px,calc(100vh - 32px));display:flex;flex-direction:column;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden;font-family:inherit;color:#16261f}' +
    '.mr-inq-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 14px}' +
    '.mr-inq-head h2{margin:0;font-size:19px;font-weight:800}' +
    '.mr-inq-x{width:36px;height:36px;border:0;background:none;cursor:pointer;color:#6b7c74;font-size:20px;line-height:1;border-radius:10px}.mr-inq-x:hover{background:#f1f5f3}' +
    '.mr-inq-tabs{display:flex;gap:4px;padding:0 22px;border-bottom:1px solid #e3ebe7}' +
    '.mr-inq-tabs button{position:relative;height:44px;padding:0 14px;border:0;background:none;font:inherit;font-size:15px;font-weight:700;color:#7a8a83;cursor:pointer}' +
    '.mr-inq-tabs button.is-on{color:#769636}.mr-inq-tabs button.is-on:after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:3px;border-radius:3px;background:#769636}' +
    '.mr-inq-body{flex:1 1 auto;overflow:auto;padding:18px 22px}' +
    '.mr-inq-guide{margin:0 0 6px;font-size:13.5px;color:#5b6d65;line-height:1.55}' +
    '.mr-inq-label{display:block;margin:14px 0 8px;font-size:14px;font-weight:800;color:#3d5249}.mr-inq-label small{font-weight:500;color:#8a9a93}' +
    '.mr-inq-stars{display:flex;gap:4px}.mr-inq-stars button{border:0;background:none;font-size:30px;line-height:1;color:#d9dfe3;cursor:pointer;padding:0 2px}.mr-inq-stars button.on{color:#f5b400}' +
    '.mr-inq select,.mr-inq textarea,.mr-inq input{width:100%;box-sizing:border-box;border:1px solid #d5e0da;border-radius:12px;font:inherit;font-size:15px;color:#16261f;background:#fff}' +
    '.mr-inq select{height:48px;padding:0 14px}.mr-inq textarea{min-height:130px;padding:12px 14px;resize:vertical;line-height:1.55}.mr-inq input{height:46px;padding:0 14px}' +
    '.mr-inq select:focus,.mr-inq textarea:focus,.mr-inq input:focus{outline:2px solid #EAF0CC;border-color:#B5D334}' +
    '.mr-inq-files{display:flex;flex-wrap:wrap;gap:8px}.mr-inq-file{position:relative;width:72px;height:72px;border-radius:12px;overflow:hidden;border:1px solid #d5e0da}.mr-inq-file img{width:100%;height:100%;object-fit:cover}' +
    '.mr-inq-file button{position:absolute;top:3px;right:3px;width:22px;height:22px;border:0;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;line-height:22px;padding:0}' +
    '.mr-inq-add{width:72px;height:72px;border:1.5px dashed #c6d3cc;border-radius:12px;background:#fafcfb;color:#7a8a83;cursor:pointer;font-size:26px}' +
    '.mr-inq-msg{margin-top:12px;padding:10px 12px;border-radius:10px;font-size:13.5px;line-height:1.5}.mr-inq-msg.err{background:#fdecec;color:#b42318}.mr-inq-msg.ok{background:#EAF0CC;color:#769636}' +
    '.mr-inq-submit{width:100%;height:52px;margin-top:16px;border:0;border-radius:14px;background:#769636;color:#fff;font:inherit;font-size:16px;font-weight:800;cursor:pointer}.mr-inq-submit:disabled{opacity:.6;cursor:default}' +
    '.mr-inq-login{margin-top:14px;padding:14px;border:1px solid #d5e0da;border-radius:14px;background:#f8fbf9}.mr-inq-login p{margin:0 0 10px;font-size:13.5px;color:#3d5249;line-height:1.5}.mr-inq-login input{margin-bottom:8px}' +
    '.mr-inq-card{padding:14px;border:1px solid #e3ebe7;border-radius:14px;margin-bottom:10px}.mr-inq-card-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12.5px}' +
    '.mr-inq-chip{padding:3px 8px;border-radius:999px;background:#eef4f1;color:#3d5249;font-weight:700}.mr-inq-chip.reply{background:#EAF0CC;color:#769636}' +
    '.mr-inq-card p{margin:8px 0 0;font-size:14px;line-height:1.55;white-space:pre-wrap}.mr-inq-date{margin-top:6px;font-size:12px;color:#8a9a93}' +
    '.mr-inq-reply{margin-top:10px;padding:10px 12px;border-radius:10px;background:#f3f8f5;font-size:13.5px;line-height:1.55;white-space:pre-wrap}.mr-inq-reply b{display:block;margin-bottom:4px;color:#769636}' +
    '.mr-inq-empty{padding:30px 0;text-align:center;color:#7a8a83;font-size:14px;line-height:1.6}' +
    '.mr-inq-foot{padding:12px 22px 14px;border-top:1px solid #eef3f0;font-size:11.5px;color:#8a9a93;text-align:center;line-height:1.6}.mr-inq-foot a{color:#5b6d65;text-decoration:none}.mr-inq-foot a:hover{text-decoration:underline}';

  function openInquiry() {
    if ($('.mr-inq-ov')) return;
    if (!document.getElementById('mrInqStyle')) {
      const s = document.createElement('style'); s.id = 'mrInqStyle'; s.textContent = INQ_CSS; document.head.appendChild(s);
    }
    const state = { tab: 'write', rating: 0, files: [], busy: false };
    const ov = document.createElement('div');
    ov.className = 'mr-inq-ov';
    ov.innerHTML =
      '<div class="mr-inq" role="dialog" aria-modal="true" aria-label="문의하기">' +
        '<div class="mr-inq-head"><h2>문의하기</h2><button type="button" class="mr-inq-x" aria-label="닫기">✕</button></div>' +
        '<div class="mr-inq-tabs"><button type="button" data-t="write" class="is-on">남기기</button><button type="button" data-t="mine">내 문의</button></div>' +
        '<div class="mr-inq-body"></div>' +
        '<div class="mr-inq-foot">' + CS_LINE + '</div>' +
      '</div>';
    document.body.appendChild(ov);
    const body = ov.querySelector('.mr-inq-body');
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onPaste = (e) => { if (state.tab === 'write' && e.clipboardData && e.clipboardData.files.length) addFiles(e.clipboardData.files); };
    function close() {
      ov.remove();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('paste', onPaste);
      state.files.forEach((x) => URL.revokeObjectURL(x.url));
    }
    function addFiles(list) {
      [...list].filter((f) => f.type.startsWith('image/')).forEach((f) => { if (state.files.length < 10) state.files.push({ f, url: URL.createObjectURL(f) }); });
      renderFiles();
    }
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('.mr-inq-x').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('paste', onPaste);
    ov.querySelectorAll('.mr-inq-tabs button').forEach((b) => b.addEventListener('click', () => {
      state.tab = b.dataset.t;
      ov.querySelectorAll('.mr-inq-tabs button').forEach((x) => x.classList.toggle('is-on', x === b));
      render();
    }));

    const mainBtn = () => body.querySelector(':scope > .mr-inq-submit');
    function msg(text, kind) {
      let m = body.querySelector('.mr-inq-msg');
      if (!text) { if (m) m.remove(); return; }
      if (!m) { m = document.createElement('div'); mainBtn().before(m); }
      m.className = 'mr-inq-msg ' + (kind || 'err');
      m.textContent = text;
    }
    function renderFiles() {
      const box = body.querySelector('.mr-inq-files');
      if (!box) return;
      box.innerHTML = state.files.map((x, i) => '<div class="mr-inq-file"><img src="' + x.url + '" alt=""><button type="button" data-i="' + i + '" aria-label="첨부 삭제">×</button></div>').join('') +
        (state.files.length < 10 ? '<button type="button" class="mr-inq-add" aria-label="이미지 첨부">＋</button>' : '');
      box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        const x = state.files.splice(+b.dataset.i, 1)[0]; URL.revokeObjectURL(x.url); renderFiles();
      }));
      const add = box.querySelector('.mr-inq-add');
      if (add) add.addEventListener('click', () => body.querySelector('input[type=file]').click());
    }
    function loginBox(onDone) {
      if (body.querySelector('.mr-inq-login')) return;
      const lb = document.createElement('div');
      lb.className = 'mr-inq-login';
      lb.innerHTML = IS_FILE
        ? '<p><b>지금은 파일로 열려 있어서 문의를 보낼 수 없어요.</b><br>바탕화면의 「이지루트 실행」을 더블클릭해서 열면 바로 보낼 수 있어요.</p>'
        : '<p>문의를 보내려면 ROOT 계정으로 한 번 로그인해 주세요. (다음부터는 자동)</p>' +
          '<input type="text" placeholder="아이디" autocomplete="username"><input type="password" placeholder="비밀번호" autocomplete="current-password">' +
          '<button type="button" class="mr-inq-submit" style="margin-top:4px;height:46px">로그인하고 보내기</button>';
      mainBtn().before(lb);
      if (IS_FILE) return;
      const [idI, pwI] = lb.querySelectorAll('input');
      const btn = lb.querySelector('button');
      const go = async () => {
        btn.disabled = true; btn.textContent = '로그인 중…';
        try { await rootLogin(idI.value, pwI.value); lb.remove(); msg(''); onDone(); }
        catch (e) { btn.disabled = false; btn.textContent = '로그인하고 보내기'; msg(e.message); }
      };
      btn.addEventListener('click', go);
      pwI.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      idI.focus();
    }
    async function submit() {
      if (state.busy) return;
      const cat = body.querySelector('select').value;
      const content = body.querySelector('textarea').value.trim();
      if (!cat) return msg('카테고리를 선택해 주세요.');
      if (!content) return msg('내용을 입력해 주세요.');
      msg('');
      if (IS_FILE || !getToken()) return loginBox(submit);
      state.busy = true;
      const btn = mainBtn();
      btn.disabled = true; btn.textContent = '보내는 중…';
      try {
        const fd = new FormData();
        fd.append('metadata', new Blob([JSON.stringify({ category: cat, content })], { type: 'application/json' }));
        state.files.forEach((x) => fd.append('images', x.f));
        await api('/v1/fc/feedbacks', { method: 'POST', body: fd });
        state.rating = 0;
        state.files.forEach((x) => URL.revokeObjectURL(x.url));
        state.files = [];
        render();
        msg('문의가 잘 전달됐어요. 답변은 「내 문의」에서 확인할 수 있어요.', 'ok');
      } catch (e) {
        if (e.auth) loginBox(submit);
        msg(e.message);
      } finally {
        state.busy = false;
        const b2 = mainBtn();
        if (b2) { b2.disabled = false; b2.textContent = '보내기'; }
      }
    }
    // 예시 문의 기록 (로그인 전이거나 실제 기록이 없을 때 보여줌)
    const SAMPLE_INQ = [
      { category: '기능 제안', rating: 5, content: '보장분석 보고서를 PDF로 바로 카카오톡 전송할 수 있으면 좋겠어요.', createdAt: '2026-11-10 14:22',
        reply: { authorName: 'ROOT 운영팀', content: '좋은 의견 감사합니다! 다음 업데이트에서 보고서 화면에 「카카오톡으로 보내기」 버튼을 추가할 예정이에요.' } },
      { category: '버그', rating: 3, content: '모바일에서 보험금 청구 서류 첨부 시 사진이 회전돼서 올라가요.', createdAt: '2026-11-08 09:47',
        reply: { authorName: 'ROOT 운영팀', content: '불편을 드려 죄송합니다. 11/9 업데이트로 수정했어요. 같은 문제가 또 생기면 알려 주세요.' } },
      { category: '불편', rating: 4, content: '고객관리에서 고객 검색할 때 전화번호 뒷자리로도 찾을 수 있으면 좋겠습니다.', createdAt: '2026-11-12 11:05', reply: null },
    ];
    const cardHtml = (x) =>
      '<div class="mr-inq-card"><div class="mr-inq-card-top"><span class="mr-inq-chip">' + esc(x.category || '') + '</span>' +
      (x.reply ? '<span class="mr-inq-chip reply">답변 완료</span>' : '<span class="mr-inq-chip">답변 대기</span>') + '</div>' +
      '<p>' + esc(x.content || '') + '</p><div class="mr-inq-date">' + esc(String(x.createdAt || '')) + '</div>' +
      (x.reply ? '<div class="mr-inq-reply"><b>' + esc(x.reply.authorName || '답변') + '</b>' + esc(x.reply.content || '') + '</div>' : '') + '</div>';
    const showSamples = (note) => {
      body.innerHTML = '<div class="mr-inq-msg ok" style="margin:0 0 12px">' + note + '</div>' + SAMPLE_INQ.map(cardHtml).join('');
    };
    async function renderMine() {
      if (IS_FILE || !getToken()) {
        showSamples('아래는 <b>예시</b>예요. ' + (IS_FILE ? '바탕화면 「이지루트 실행」으로 열고 로그인하면' : '「남기기」에서 로그인하면') + ' 실제 내 문의와 답변이 보여요.');
        return;
      }
      body.innerHTML = '<div class="mr-inq-empty">불러오는 중…</div>';
      try {
        const j = await api('/v1/fc/feedbacks?scope=mine&size=50');
        const d = j.data || j;
        const list = Array.isArray(d) ? d : (d.content || []);
        if (!list.length) { showSamples('아직 남긴 문의가 없어요. 아래는 <b>예시</b>예요.'); return; }
        body.innerHTML = list.map(cardHtml).join('');
      } catch (e) {
        body.innerHTML = '<div class="mr-inq-empty">' + esc(e.message) + '</div>';
      }
    }
    function render() {
      if (state.tab === 'mine') { renderMine(); return; }
      body.innerHTML =
        '<p class="mr-inq-guide">궁금한 점, 불편한 점, 필요한 기능을 남겨 주세요. 담당자가 확인 후 답변드려요.</p>' +
        '<label class="mr-inq-label">카테고리</label><select><option value="">카테고리 선택</option>' + CATS.map((c) => '<option>' + c + '</option>').join('') + '</select>' +
        '<label class="mr-inq-label">내용</label><textarea maxlength="2000" placeholder="문의하실 내용을 자유롭게 적어 주세요."></textarea>' +
        '<label class="mr-inq-label">첨부 이미지 <small>(선택 · 최대 10장 · Ctrl+V 로 붙여넣기)</small></label><div class="mr-inq-files"></div><input type="file" accept="image/*" multiple hidden>' +
        '<button type="button" class="mr-inq-submit">보내기</button>';
      body.querySelector('input[type=file]').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
      mainBtn().addEventListener('click', submit);
      renderFiles();
      body.querySelector('textarea').focus();
    }
    render();
  }

  function initRutiInquiry() {
    const av = $('.fcsc-avatar');
    if (!av) return;
    const st = document.createElement('style');
    st.textContent =
      '.fcsc-avatar.mr-ruti{cursor:pointer;position:relative;pointer-events:auto}' +
      '.fcsc-avatar.mr-ruti:hover{transform:translateY(-2px);transition:transform .2s}' +
      '.mr-ruti-tag{position:absolute;left:50%;bottom:-10px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:4px;' +
        'padding:8px 18px;border-radius:999px;background:#769636;color:#fff;font-size:17px;font-weight:800;line-height:1;white-space:nowrap;' +
        'box-shadow:0 4px 12px rgba(118,150,54,.28);z-index:2}' +
      '.mr-ruti-tag .material-symbols-rounded{font-size:20px}' +
      '@media (max-width:600px){.mr-ruti-tag{font-size:15px;padding:6px 14px;bottom:-6px}.mr-ruti-tag .material-symbols-rounded{font-size:18px}}';
    document.head.appendChild(st);
    av.classList.add('mr-ruti');
    av.removeAttribute('aria-hidden');
    av.setAttribute('role', 'button');
    av.setAttribute('tabindex', '0');
    av.setAttribute('aria-label', '문의하기 — 고객센터 안내 열기');
    av.title = '문의하기';
    const tag = document.createElement('span');
    tag.className = 'mr-ruti-tag';
    tag.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">support_agent</span>문의하기';
    av.appendChild(tag);
    av.addEventListener('click', openInquiry);
    av.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInquiry(); } });
  }

  /* ── 좌측 상단 ROOT 로고 (「맞춤형」 글자 자리) ── */
  function initLogo() {
    const bc = $('.fc-topbar-breadcrumb');
    if (!bc || document.querySelector('.mr-logo')) return;
    const st = document.createElement('style');
    st.textContent = '.mr-logo{display:inline-flex;align-items:center;height:100%;visibility:visible !important}.mr-logo img{height:30px;width:auto;display:block}@media (max-width:600px){.mr-logo img{height:24px}}';
    document.head.appendChild(st);
    const a = document.createElement('a');
    a.className = 'mr-logo'; a.href = '#'; a.setAttribute('aria-label', 'ROOT 홈');
    a.innerHTML = '<img src="assets/logo-root.svg" alt="ROOT">';
    a.addEventListener('click', (e) => { e.preventDefault(); if (typeof resetChat === 'function') resetChat(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    bc.before(a);
    bc.style.display = 'none';
  }

  /* ── 간편모드 좌측 상단 메뉴 버튼(☰) → 전체 메뉴 펼침 ─────────
   * 순서: 전체모드 좌측 메뉴와 같게, 그 아래에 간편모드 기능 */
  const ALL_MENU = [   // 상위 카테고리별 분류 (2026-11-13)
    { sec: '고객·청구' },
    { name: '고객관리',         url: '/planner/customers',                  art: 'assets/v2_staff.webp' },
    { name: '보험금 청구',      url: '/planner/claim/request',              art: 'assets/v2_claim.webp' },
    { name: '미청구 보험금 찾기', url: '/planner/convenience/treatment-claim', art: 'assets/v2_solo-refund.webp' },
    { sec: '상담 준비' },
    { name: '보험료 비교',      url: '/planner/claim/premium-compare',      art: 'assets/clay_premium-compare.png' },
    { name: '상품 비교서',      url: '/planner/claim/product-compare',      art: 'assets/v2_lg-mydocs.webp' },
    { name: '보장분석 보고서',  url: '/planner/claim/report-basic',         art: 'assets/clay_coverage-report.png' },
    { sec: '교육' },
    { name: '동영상 강의',      url: '/planner/education',                  art: 'assets/clay_video-lecture.png' },
    // 보류(2026-11-13): 현장 용어 사전(/terms.html)·알면 받는 보상 사례(/cases.html)는 나중에 다시 넣음 — 파일은 그대로 보관
    { sec: '영업 관리' },
    { name: '오늘의 할 일',     url: '/planner/hub/tasks',                  art: 'assets/v2_quest.webp' },
    { name: '일일마감',         url: '/planner/hub/close',                  art: 'assets/v2_job.webp' },
    { name: '고객 리커넥팅',    url: '/planner/hub/reconnect/noncontract',  art: 'assets/v2_relay.webp' },
    { sec: '연락 도구' },
    { name: '온라인 명함',      url: '/planner/convenience/business-card',  art: 'assets/clay_business-card.png' },
    { name: '단체문자 발송',  url: '/planner/convenience/root-talk',      art: 'assets/clay_root-talk.png' },
    { name: '카드뉴스 보내기', url: '/planner/convenience/card-news',  art: 'assets/clay_card-news.png' },
    { name: '사주풀이',         url: '/planner/convenience/saju',           art: 'assets/clay_saju.png' },
    { sec: '업무 지원' },
    { name: '일정 관리',        url: '/planner/schedule',                   art: 'assets/v2_alarm.webp' },
    { name: '보험·금융 계산기', url: '/planner/convenience/fin-calc',       art: 'assets/clay_fin-calc.png' },
    { name: '보험사 사이트',    url: '/planner/convenience/insurer-sites',  art: 'assets/clay_insurer-sites.png' },
    { name: '응급병원 평가기준표', url: '/planner/convenience/hospital-eval', art: 'assets/clay_hospital-eval.png' },
    { name: '실시간 약국 찾기', url: '/planner/convenience/pharmacy',       art: 'assets/clay_pharmacy.png' },
  ];
  const BURGER_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const DRAWER_CSS =
    '.mr-burger{display:inline-grid;place-items:center;width:42px;height:42px;margin-right:14px;padding:0;border:1px solid #DFE3D6;border-radius:10px;background:#fff;color:#1F2A12;cursor:pointer;flex:0 0 42px;vertical-align:middle;transition:border-color .15s,box-shadow .15s}' +
    '.mr-burger:hover,.mr-burger:focus-visible{border-color:#B5D334;box-shadow:0 0 0 2px #B5D334;outline:none}' +
    '.fc-topbar-hamburger{display:none!important}' +
    '.mr-newsbtn{display:inline-flex;align-items:center;gap:6px;height:42px;margin-left:8px;padding:0 14px;border:1.5px solid #B5D334;border-radius:10px;background:#EAF0CC;color:#1F2A12;font:inherit;font-size:15px;font-weight:800;cursor:pointer;white-space:nowrap;transition:box-shadow .15s,background .15s}' +
    '.mr-hd-left{display:flex;align-items:center;gap:0;flex:0 1 auto;min-width:0;margin-right:auto}' +
    '.mr-hd-date{margin-left:12px;font-size:15px;font-weight:800;color:#1F2A12;white-space:nowrap}' +
    '.mr-hd-wx{display:inline-flex;align-items:center;gap:4px;margin-left:10px;font-size:14.5px;font-weight:700;color:#3a4131;white-space:nowrap}' +
    '.mr-hd-wx-ico{font-size:20px;line-height:1}' +
    '.mr-hd-temp{margin-left:4px;font-size:16px;font-weight:800;color:#1F2A12;white-space:nowrap}' +
    '@media (max-width:600px){.mr-hd-date{margin-left:8px;font-size:13px}.mr-hd-wx-desc{display:none}.mr-hd-wx{margin-left:8px}.mr-hd-temp{margin-left:2px;font-size:14px}}' +
    '.mr-newsbtn:hover,.mr-newsbtn:focus-visible{background:#fff;box-shadow:0 0 0 2px #B5D334;outline:none}' +
    '@media (max-width:600px){.mr-newsbtn{height:38px;padding:0 12px;font-size:13.5px;margin-left:8px}}' +
    '.mr-dw-ov{position:fixed;inset:0;z-index:9400;background:rgba(20,25,12,.32);opacity:0;transition:opacity .2s}' +
    '.mr-dw-ov.is-on{opacity:1}' +
    '.mr-dw{position:fixed;top:0;bottom:0;left:0;z-index:9401;width:min(300px,86vw);display:flex;flex-direction:column;background:#fff;box-shadow:8px 0 30px rgba(20,25,12,.18);transform:translateX(-100%);transition:transform .22s ease}' +
    '.mr-dw.is-on{transform:none}' +
    '.mr-dw-head{display:flex;align-items:center;justify-content:space-between;padding:18px 16px 12px 20px;border-bottom:1px solid #EEF0E8}' +
    '.mr-dw-head img{height:28px}' +
    '.mr-dw-title{font-size:16px;font-weight:800;letter-spacing:.06em;color:#1F2A12}' +
    '.mr-dw-x{width:38px;height:38px;border:0;border-radius:10px;background:none;color:#5b6152;font-size:20px;cursor:pointer}.mr-dw-x:hover{background:#EAF0CC}' +
    '.mr-dw-body{flex:1 1 auto;overflow:auto;padding:10px 16px 24px;display:flex;flex-direction:column;gap:4px}' +
    '.mr-dw-sec{margin:14px 10px 6px;font-size:13px;font-weight:800;letter-spacing:.04em;color:#769636}' +
    '.mr-dw-item{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;padding:6px 10px;border:1px solid transparent;border-radius:14px;background:none;color:#1F2A12;font:inherit;font-size:16px;font-weight:700;line-height:1.35;text-align:left;cursor:pointer}' +
    '.mr-dw-item img{width:40px;height:40px;flex:0 0 40px;padding:3px;box-sizing:border-box;object-fit:contain;border-radius:11px;background:linear-gradient(160deg,#f3f8f4,#EAF0CC)}' +
    '.mr-dw-item:hover,.mr-dw-item:focus-visible{background:#EAF0CC;border-color:#B5D334;outline:none}';

  function openDrawer() {
    if (document.querySelector('.mr-dw')) return;
    const ov = document.createElement('div'); ov.className = 'mr-dw-ov';
    const dw = document.createElement('nav'); dw.className = 'mr-dw'; dw.setAttribute('aria-label', '전체 메뉴');
    dw.innerHTML =
      '<div class="mr-dw-head"><span class="mr-dw-title">ROOT SERVICE</span><button type="button" class="mr-dw-x" aria-label="메뉴 닫기">✕</button></div>' +
      '<div class="mr-dw-body">' + ALL_MENU.map((m, i) => m.sec
        ? '<div class="mr-dw-sec">' + esc(m.sec) + '</div>'
        : '<button type="button" class="mr-dw-item" data-i="' + i + '"><img src="' + m.art + '" alt="">' + esc(m.name) + '</button>').join('') + '</div>';
    document.body.append(ov, dw);
    requestAnimationFrame(() => { ov.classList.add('is-on'); dw.classList.add('is-on'); });
    const close = () => {
      ov.classList.remove('is-on'); dw.classList.remove('is-on');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { ov.remove(); dw.remove(); }, 230);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    ov.addEventListener('click', close);
    dw.querySelector('.mr-dw-x').addEventListener('click', close);
    dw.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
      const m = ALL_MENU[+b.dataset.i]; close(); open(m.url, m.name);
    }));
    document.addEventListener('keydown', onKey);
    const first = dw.querySelector('.mr-dw-item'); if (first) first.focus({ preventScroll: true });
  }

  // 상단 바 날씨 (ROOT 날씨 API, 위치 기본값 서울 중구 명동 — 전체모드 날씨 카드와 같음)
  function loadHeaderWeather(wxEl, tpEl) {
    const ICON = { '01': ['☀️', '🌙'], '02': ['🌤️', '🌙'], '03': ['⛅', '☁️'], '04': ['☁️', '☁️'], '09': ['🌧️', '🌧️'], '10': ['🌦️', '🌧️'], '11': ['⛈️', '⛈️'], '13': ['❄️', '❄️'], '50': ['🌫️', '🌫️'] };
    let tk = ''; try { tk = localStorage.getItem('token') || ''; } catch (e) {}
    if (!tk) { wxEl.querySelector('.mr-hd-wx-desc').textContent = '날씨'; return; }
    fetch('https://api-fc-root.sbt-root.com/api/v1/fc/weather?lat=37.5636&lon=126.9826', { headers: { Authorization: 'Bearer ' + tk } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        const w = j && (j.content || j.data); if (!w) return;
        const k = String(w.iconCode || '').slice(0, 2), n = /n$/.test(w.iconCode || '') ? 1 : 0;
        wxEl.querySelector('.mr-hd-wx-ico').textContent = (ICON[k] || ['🌤️'])[n];
        const EASY = { '박무': '옅은 안개', '연무': '뿌연 날씨', '튼구름': '구름 조금', '온흐림': '흐림', '실 비': '가랑비', '약한 비': '약한 비', '짙은 안개': '짙은 안개', '튼 구름': '구름 조금', '조각 구름': '구름 조금' };
        const desc = (w.description || '').trim();
        wxEl.querySelector('.mr-hd-wx-desc').textContent = EASY[desc] || desc;
        wxEl.title = (w.location || '') + ' · 미세 ' + (w.pm10Grade || '-') + ' · 초미세 ' + (w.pm25Grade || '-');
        tpEl.textContent = Math.round(w.temperature) + '°';
      }).catch(() => {});
  }

  function initBurger() {
    if (document.querySelector('.mr-burger')) return;
    const st = document.createElement('style'); st.textContent = DRAWER_CSS; document.head.appendChild(st);
    const logo = document.querySelector('.mr-logo') || document.querySelector('.fc-topbar-breadcrumb');
    if (!logo) return;
    if (logo.classList.contains('fc-topbar-breadcrumb')) logo.style.display = 'none';   // 「맞춤형」 글자 자리 대신 메뉴 버튼
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mr-burger'; b.setAttribute('aria-label', '전체 메뉴 열기'); b.title = '전체 메뉴';
    b.innerHTML = BURGER_SVG;
    b.addEventListener('click', openDrawer);
    logo.before(b);
    b.style.marginRight = '0';
    // ☰ 버튼 오른쪽: 오늘의 소식 바로가기
    const nb = document.createElement('button');
    nb.type = 'button'; nb.className = 'mr-newsbtn'; nb.title = '오늘의 소식';
    nb.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5M8 17h3"/></svg>오늘의 소식';
    nb.addEventListener('click', () => open('/planner/board', '오늘의 소식'));
    // 순서: ☰ → 오늘 날짜 → 오늘의 소식 → 날씨 → 기온
    const now = new Date();
    const dateEl = document.createElement('span');
    dateEl.className = 'mr-hd-date';
    dateEl.textContent = (now.getMonth() + 1) + '월 ' + now.getDate() + '일 (' + '일월화수목금토'[now.getDay()] + ')';
    const wxEl = document.createElement('span');
    wxEl.className = 'mr-hd-wx'; wxEl.title = '오늘 날씨';
    wxEl.innerHTML = '<span class="mr-hd-wx-ico">🌤️</span><span class="mr-hd-wx-desc">날씨</span>';
    const tpEl = document.createElement('span');
    tpEl.className = 'mr-hd-temp'; tpEl.textContent = '--°';
    const grp = document.createElement('div');
    grp.className = 'mr-hd-left';
    b.before(grp);
    grp.append(b, nb, dateEl, wxEl, tpEl);   // ☰ → 오늘의 소식 → 날짜 → 날씨 → 기온
    loadHeaderWeather(wxEl, tpEl);
    if (logo.parentElement) { logo.parentElement.style.display = 'flex'; logo.parentElement.style.alignItems = 'center'; }
  }

  function init() { initBurger(); buildQuick(); initChips(); initAsk(); initNav(); initModeSwitch(); initRutiInquiry(); showDaily(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
