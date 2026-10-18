/* === chiikawa.js — 치이카와 다이어리 컴패니언 & 큐트 요소 모듈 === */

var Chiikawa = (function () {
  /* 캐릭터 데이터 정의 (투명 배경 정품 일러스트 & 감정/동작/말풍선/뱃지 100% 매칭) */
  var CHARACTERS = {
    chiikawa: {
      id: 'chiikawa',
      name: '치이카와',
      image: 'assets/chiikawa.png',
      actionImage: 'assets/chiikawa_cheer.png',
      themeColor: '#ffccd5',
      quotes: [
        { dialogue: '와... 와아...!', action: '조심스럽게 눈을 반짝인다', pose: 'default', badge: '🍀', badgeColor: '#10b981', anim: 'companion-nod', reaction: '🌸' },
        { dialogue: '에헤헤...', action: '수줍게 고개를 끄덕인다', pose: 'default', badge: '🌸', badgeColor: '#ec4899', anim: 'companion-shy', reaction: '💕' },
        { dialogue: '으, 응! 오늘도 차근차근 힘내자...!', action: '용기를 내어 다짐', pose: 'default', badge: '🌱', badgeColor: '#14b8a6', anim: 'companion-steady', reaction: '✨' },
        { dialogue: '후에에... 조금 떨리지만 힘낼게!', action: '긴장해서 꼬물꼬물', pose: 'default', badge: '💧', badgeColor: '#3b82f6', anim: 'companion-tremble', reaction: '💦' },
        { dialogue: '햐아...', action: '마음이 놓여 방긋 미소 짓는다', pose: 'default', badge: '💖', badgeColor: '#f43f5e', anim: 'companion-shy', reaction: '🥰' },
        { dialogue: '와아-!', action: '두 손 번쩍 만세 응원!', pose: 'action', badge: '🙌', badgeColor: '#f43f5e', anim: 'companion-cheer', reaction: '🎉' },
        { dialogue: '응! 으응-!', action: '두 주먹을 꼬옥 쥐고 파이팅!', pose: 'action', badge: '✊', badgeColor: '#e11d48', anim: 'companion-fist', reaction: '🔥' },
        { dialogue: '와앗!', action: '온 힘을 다해 폴짝 만세!', pose: 'action', badge: '✨', badgeColor: '#f59e0b', anim: 'companion-superjump', reaction: '⭐' }
      ],
      victoryCheers: [
        { dialogue: '와아---!!', action: '기뻐서 두 손 번쩍 만세!', pose: 'action', badge: '🎉', badgeColor: '#f43f5e', anim: 'companion-cheer', reaction: '✨' },
        { dialogue: '에헤헤...! 해냈다...!', action: '감격의 미소 활짝', pose: 'action', badge: '💖', badgeColor: '#ec4899', anim: 'companion-shy', reaction: '💕' },
        { dialogue: '와아-!', action: '감동해서 콩콩 뛰며 박수친다', pose: 'action', badge: '👏', badgeColor: '#f59e0b', anim: 'companion-superjump', reaction: '🌟' }
      ]
    },
    hachiware: {
      id: 'hachiware',
      name: '하치와레',
      image: 'assets/hachiware.png',
      actionImage: 'assets/hachiware_cheer.png',
      themeColor: '#bae6fd',
      quotes: [
        { dialogue: '어떻게든 될 거야! 내가 옆에서 응원할게!', action: '기운 넘치는 응원 팍팍', pose: 'action', badge: '☀️', badgeColor: '#0284c7', anim: 'companion-cheer', reaction: '✨' },
        { dialogue: '차근차근 하나씩 해나가면 문제없어!', action: '차분하게 토닥토닥', pose: 'default', badge: '📝', badgeColor: '#0ea5e9', anim: 'companion-steady', reaction: '🌱' },
        { dialogue: '대단하다! 벌써 여기까지 집중해서 해내다니!', action: '엄지 척! 최고야 👍', pose: 'action', badge: '👍', badgeColor: '#10b981', anim: 'companion-praise', reaction: '👍' },
        { dialogue: '오늘 계획 멋지게 끝내고 맛있는 거 먹자!', action: '따뜻한 라멘 생각 🍜', pose: 'default', badge: '🍜', badgeColor: '#f59e0b', anim: 'companion-sway', reaction: '😋' },
        { dialogue: '포기하지 마! 넌 진짜 잘하고 있어!', action: '눈을 반짝이며 격려 ✨', pose: 'action', badge: '🌟', badgeColor: '#8b5cf6', anim: 'companion-shine', reaction: '✨' },
        { dialogue: '힘들 땐 언제든 나한테 기대도 돼!', action: '다정하게 어깨 토닥', pose: 'default', badge: '💙', badgeColor: '#38bdf8', anim: 'companion-steady', reaction: '💫' },
        { dialogue: '화이팅! 멋진 하루를 만들어보자구!', action: '주먹 불끈 파이팅!', pose: 'action', badge: '🔥', badgeColor: '#f43f5e', anim: 'companion-cheer', reaction: '💥' }
      ],
      victoryCheers: [
        { dialogue: '어떻게든 됐네! 진짜 대단해!!', action: '별빛 가득 하이파이브 🌟', pose: 'action', badge: '🌟', badgeColor: '#0284c7', anim: 'companion-superjump', reaction: '🎉' },
        { dialogue: '해냈다! 역시 넌 멋진 친구야!', action: '최고의 미소와 엄지 척 👍', pose: 'action', badge: '👍', badgeColor: '#10b981', anim: 'companion-praise', reaction: '👏' },
        { dialogue: '최고야! 다음 목표도 함께 가보자!', action: '신나서 나란히 발맞춤', pose: 'action', badge: '🚀', badgeColor: '#8b5cf6', anim: 'companion-cheer', reaction: '⭐' }
      ]
    },
    usagi: {
      id: 'usagi',
      name: '우사기',
      image: 'assets/usagi.png',
      actionImage: 'assets/usagi_dance.png',
      themeColor: '#fef08a',
      quotes: [
        { dialogue: '야하---!', action: '카리스마 번쩍!', pose: 'default', badge: '⚡', badgeColor: '#eab308', anim: 'companion-pop', reaction: '⚡' },
        { dialogue: '우라야하---!', action: '광란의 댄스 💃', pose: 'action', badge: '💃', badgeColor: '#ec4899', anim: 'companion-dance360', reaction: '🎉' },
        { dialogue: '우나! 우나우나!', action: '신비한 멜로디 콧노래', pose: 'default', badge: '🎵', badgeColor: '#06b6d4', anim: 'companion-sway', reaction: '🎶' },
        { dialogue: '뿌르르르르르--!', action: '초고속 귀 회전 진동 💫', pose: 'action', badge: '💫', badgeColor: '#8b5cf6', anim: 'companion-vibrate', reaction: '🌀' },
        { dialogue: '이-야-하---!', action: '두 귀를 흔들흔들', pose: 'action', badge: '🐰', badgeColor: '#f59e0b', anim: 'companion-ear-shake', reaction: '✨' },
        { dialogue: '푸뤠!!', action: '돌발 에너지 방출!', pose: 'default', badge: '💥', badgeColor: '#f97316', anim: 'companion-rush', reaction: '💨' },
        { dialogue: '하?!', action: '초롱초롱한 동공 의문', pose: 'default', badge: '❓', badgeColor: '#64748b', anim: 'companion-curious', reaction: '❗' },
        { dialogue: '후하--!', action: '하늘 높이 폴짝 점프! ⭐️', pose: 'action', badge: '🚀', badgeColor: '#10b981', anim: 'companion-superjump', reaction: '⭐' }
      ],
      victoryCheers: [
        { dialogue: '우라야하---!!', action: '광란의 폭풍 승리 댄스 🎉', pose: 'action', badge: '🏆', badgeColor: '#eab308', anim: 'companion-dance360', reaction: '🎊' },
        { dialogue: '이-야-하---!!', action: '성공의 초특급 점프 ⭐️', pose: 'action', badge: '🌟', badgeColor: '#f59e0b', anim: 'companion-superjump', reaction: '⭐' },
        { dialogue: '뿌르르르르르--!!', action: '감격의 폭풍 진동 💥', pose: 'action', badge: '💥', badgeColor: '#ef4444', anim: 'companion-vibrate', reaction: '💥' }
      ]
    },
    momonga: {
      id: 'momonga',
      name: '모몽가',
      image: 'assets/momonga.png',
      actionImage: 'assets/momonga_pout.png',
      themeColor: '#c7d2fe',
      quotes: [
        { dialogue: '날 봐라! 귀여운 나를 보면서 일해라!', action: '당당하게 서서 눈빛 발사', pose: 'default', badge: '👑', badgeColor: '#8b5cf6', anim: 'companion-smug', reaction: '✨' },
        { dialogue: '얼른 끝내고 나를 칭찬해라!', action: '볼 빵빵 뾰루퉁', pose: 'action', badge: '💢', badgeColor: '#f43f5e', anim: 'companion-pout', reaction: '💢' },
        { dialogue: '어리광 부리게 해줘! 칭찬해줘!!', action: '발을 동동 구르며 칭찬 조르기', pose: 'action', badge: '💖', badgeColor: '#ec4899', anim: 'companion-plead', reaction: '🥺' },
        { dialogue: '흥! 내가 지켜보고 있으니까 똑바로 해!', action: '도도한 눈으로 감시 중', pose: 'action', badge: '🐾', badgeColor: '#6366f1', anim: 'companion-pout', reaction: '👀' },
        { dialogue: '대단하지? 내가 옆에 있어주는 것만으로도 감사해라!', action: '새침하게 턱을 든다', pose: 'default', badge: '⭐', badgeColor: '#eab308', anim: 'companion-smug', reaction: '✨' },
        { dialogue: '나한테 맛있는 거 줄 때까지 힘내!', action: '간식 기대하며 꼬리 살랑', pose: 'default', badge: '🍰', badgeColor: '#f59e0b', anim: 'companion-hop', reaction: '😋' },
        { dialogue: '왜 나한테 집중 안 해? 얼른 칭찬하란 말야!', action: '버럭! 귀여운 발구르기', pose: 'action', badge: '🔥', badgeColor: '#ef4444', anim: 'companion-tantrum', reaction: '💥' }
      ],
      victoryCheers: [
        { dialogue: '끝났으면 날 어서 칭찬해라! 칭찬!!', action: '양 볼 빵빵 감격', pose: 'action', badge: '🎉', badgeColor: '#ec4899', anim: 'companion-superjump', reaction: '👑' },
        { dialogue: '흥! 제법이잖아? 나만큼은 아니지만!', action: '도도하게 박수 짝짝', pose: 'action', badge: '😼', badgeColor: '#8b5cf6', anim: 'companion-smug', reaction: '✨' },
        { dialogue: '귀여운 내가 응원해준 덕분인 줄 알아라!', action: '위풍당당 만세', pose: 'default', badge: '👑', badgeColor: '#eab308', anim: 'companion-cheer', reaction: '🌟' }
      ]
    }
  };

  /* 모든 애니메이션 클래스 목록 (중복 누적 방지) */
  var ALL_ANIM_CLASSES = [
    'companion-pout', 'companion-tantrum', 'companion-plead', 'companion-dance360',
    'companion-vibrate', 'companion-superjump', 'companion-ear-shake', 'companion-tremble',
    'companion-shy', 'companion-smug', 'companion-sway', 'companion-shine',
    'companion-fist', 'companion-praise', 'companion-pop', 'companion-rush',
    'companion-curious', 'companion-steady', 'companion-nod', 'companion-cheer',
    'companion-hop', 'companion-bounce'
  ];

  /* 멘트 데이터 정규화 파서 (대사 vs 행동 지문 분리 & 가독성 최적화) */
  function parseQuote(quoteObj) {
    if (!quoteObj) {
      return { dialogue: '오늘도 힘내자!', action: '', pose: 'default', badge: '♥', badgeColor: '#ff4d6d', anim: 'companion-cheer', reaction: '✨' };
    }
    if (typeof quoteObj === 'string') {
      quoteObj = { text: quoteObj };
    }
    var dialogue = quoteObj.dialogue;
    var action = quoteObj.action || '';
    var rawText = quoteObj.text || '';

    if (!dialogue) {
      // 괄호 지문 자동 분리 (예: "얼른 끝내고 나를 칭찬해라! (볼 빵빵) 😤")
      var match = rawText.match(/^(.*?)\s*\((.+?)\)\s*(.*)$/);
      if (match) {
        dialogue = match[1].trim();
        var extra = match[3] ? (' ' + match[3].trim()) : '';
        action = match[2].trim() + extra;
      } else {
        dialogue = rawText;
      }
    }

    return {
      dialogue: dialogue,
      action: action,
      pose: quoteObj.pose || 'default',
      badge: quoteObj.badge || '♥',
      badgeColor: quoteObj.badgeColor || '#ff4d6d',
      anim: quoteObj.anim || 'companion-cheer',
      reaction: quoteObj.reaction || '✨'
    };
  }

  /* 플로팅 리액션 파티클 생성기 */
  function spawnFloatingReaction(emoji, parentEl) {
    if (!parentEl || !emoji) return;
    var reactionEl = document.createElement('div');
    reactionEl.className = 'chiikawa-floating-reaction';
    reactionEl.textContent = emoji;
    parentEl.appendChild(reactionEl);
    setTimeout(function () {
      if (reactionEl.parentNode) {
        reactionEl.parentNode.removeChild(reactionEl);
      }
    }, 950);
  }

  var currentCharId = localStorage.getItem('pds_chiikawa_char') || 'chiikawa';
  var isMenuOpen = false;
  var bubbleTimer = null;

  /* 부드러운 차임벨 사운드 효과 (Web Audio API) */
  function playCheerChime() {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      var ctx = new AudioContext();

      var notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach(function (freq, idx) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.5);
      });
    } catch (e) { }
  }

  /* 콘페티 파티클 애니메이션 엔진 */
  function triggerConfetti() {
    var canvas = document.getElementById('chiikawaConfettiCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'chiikawaConfettiCanvas';
      document.body.appendChild(canvas);
    }

    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var particles = [];
    var colors = ['#ff758f', '#ffccd5', '#38bdf8', '#fde047', '#4ade80', '#c084fc'];

    for (var i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35,
        r: Math.random() * 6 + 4,
        d: Math.random() * 50 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() * -12) - 4,
        gravity: 0.35
      });
    }

    var startTime = Date.now();
    function animate() {
      var elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.tiltAngle += p.tiltAngleIncremental;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.tilt = Math.sin(p.tiltAngle - (i / 3)) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
        ctx.fill();
      }

      if (elapsed < 2400) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    animate();
  }

  /* 캐릭터 응원 축하 팝업 */
  function celebrate(taskTitle) {
    playCheerChime();
    triggerConfetti();

    var toast = document.getElementById('chiikawaCelebrateToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'chiikawaCelebrateToast';
      toast.className = 'chiikawa-celebrate-toast';
      document.body.appendChild(toast);
    }

    var char = CHARACTERS[currentCharId] || CHARACTERS.chiikawa;
    var cheers = char.victoryCheers;
    var cheerObj = cheers[Math.floor(Math.random() * cheers.length)];
    var parsed = parseQuote(cheerObj);
    var cheerImg = (parsed.pose === 'action') ? (char.actionImage || char.image) : char.image;

    // 플로팅 컴패니언 아바타도 동적 액션 표정으로 전환 & 신나는 점프 바운스!
    var avatarImg = document.getElementById('chiikawaAvatarImg');
    var avatarBtn = document.getElementById('chiikawaAvatarBtn');
    var heartBadge = document.getElementById('chiikawaHeartBadge');
    if (avatarImg) avatarImg.src = cheerImg;
    if (heartBadge) {
      heartBadge.textContent = parsed.badge;
      heartBadge.style.backgroundColor = parsed.badgeColor;
      heartBadge.classList.remove('badge-pop');
      void heartBadge.offsetWidth;
      heartBadge.classList.add('badge-pop');
    }
    if (avatarBtn) {
      ALL_ANIM_CLASSES.forEach(function (cls) { avatarBtn.classList.remove(cls); });
      void avatarBtn.offsetWidth;
      avatarBtn.classList.add(parsed.anim);
      spawnFloatingReaction(parsed.reaction, avatarBtn);
      setTimeout(function () {
        avatarBtn.classList.remove(parsed.anim);
      }, 800);
    }

    var actionBadgeHtml = parsed.action
      ? ' <span class="chiikawa-action-badge" style="font-size:11px; padding:2px 8px; vertical-align:middle; margin-left:4px;"><span class="badge-icon">' + parsed.badge + '</span> ' + (typeof U !== 'undefined' ? U.esc(parsed.action) : parsed.action) + '</span>'
      : '';

    toast.innerHTML =
      '<div class="chiikawa-celebrate-avatar" style="width:52px; height:52px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.15); overflow:hidden; flex-shrink:0;">' +
      '  <img src="' + cheerImg + '" alt="' + char.name + '" style="width:44px; height:44px; object-fit:contain;">' +
      '</div>' +
      '<div class="chiikawa-celebrate-text">' +
      '  <h4>' + char.name + '의 폭풍 칭찬! 🎉</h4>' +
      '  <p style="font-family:var(--font-body); font-size:13.5px; font-weight:700; line-height:1.4; color:inherit;">"' + (typeof U !== 'undefined' ? U.esc(parsed.dialogue) : parsed.dialogue) + '"' + actionBadgeHtml + ' <span style="font-size:11.5px; font-weight:400; color:var(--text-muted); display:block; margin-top:3px;">— ' + (typeof U !== 'undefined' ? U.esc(taskTitle || '할 일') : taskTitle) + ' 완료!</span></p>' +
      '</div>';

    toast.classList.add('active');

    setTimeout(function () {
      toast.classList.remove('active');
    }, 4500);
  }

  /* 사이드바 토글 뱃지 동기화 */
  function syncSidebarBadge(isVisible) {
    var badge = document.getElementById('chiikawaToggleBadge');
    if (badge) {
      if (isVisible) {
        badge.textContent = 'ON';
        badge.className = 'mate-toggle-badge on';
      } else {
        badge.textContent = 'OFF';
        badge.className = 'mate-toggle-badge off';
      }
    }
  }

  /* 컴패니언 위젯 마운트 */
  function init() {
    var widget = document.getElementById('chiikawaCompanionWidget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'chiikawaCompanionWidget';
      widget.className = 'chiikawa-companion-widget';
      document.body.appendChild(widget);
    }

    renderWidget(widget);

    // 사이드바 토글 버튼 바인딩
    var sidebarToggleBtn = document.getElementById('chiikawaQuickToggleBtn');
    if (sidebarToggleBtn) {
      sidebarToggleBtn.onclick = function () {
        toggleVisibility();
      };
    }
  }

  /* 표시 / 숨김 토글 */
  function toggleVisibility(forceState) {
    var widget = document.getElementById('chiikawaCompanionWidget');
    if (!widget) return;

    var isHidden = (widget.style.display === 'none');
    var shouldShow = (typeof forceState === 'boolean') ? forceState : isHidden;

    if (shouldShow) {
      widget.style.display = 'flex';
      localStorage.setItem('pds_chiikawa_hidden', 'false');
      syncSidebarBadge(true);
      var curC = CHARACTERS[currentCharId] || CHARACTERS.chiikawa;
      if (typeof U !== 'undefined') {
        U.toast(curC.name + '(이)가 다이어리로 돌아왔어요! 🌸', 'success');
      }
      var bubble = document.getElementById('chiikawaBubble');
      if (bubble) {
        bubble.classList.remove('fade-out');
        startBubbleTimer();
      }
    } else {
      widget.style.display = 'none';
      localStorage.setItem('pds_chiikawa_hidden', 'true');
      syncSidebarBadge(false);
      if (typeof U !== 'undefined') {
        U.toast('먼작귀 메이트를 숨겼습니다. (사이드바 하단 버튼으로 언제든 다시 부를 수 있어요)', 'info');
      }
    }
  }

  /* 5.5초 후 말풍선 부드럽게 자동 닫힘 */
  function startBubbleTimer() {
    if (bubbleTimer) clearTimeout(bubbleTimer);
    var bubble = document.getElementById('chiikawaBubble');
    bubbleTimer = setTimeout(function () {
      if (bubble) bubble.classList.add('fade-out');
    }, 5500);
  }

  /* 위젯 DOM 렌더링 및 드래그/자동숨김 기능 */
  function renderWidget(widget) {
    var char = CHARACTERS[currentCharId] || CHARACTERS.chiikawa;
    var quotes = char.quotes;
    var initialQuoteObj = quotes[Math.floor(Math.random() * quotes.length)];
    var initialParsed = parseQuote(initialQuoteObj);
    var initialImg = (initialParsed.pose === 'action') ? (char.actionImage || char.image) : char.image;

    /* 숨김 상태 복원 */
    var isHidden = localStorage.getItem('pds_chiikawa_hidden') === 'true';
    if (isHidden) {
      widget.style.display = 'none';
      syncSidebarBadge(false);
    } else {
      widget.style.display = 'flex';
      syncSidebarBadge(true);
    }

    /* 위치 복원 */
    var savedPos = null;
    try {
      savedPos = JSON.parse(localStorage.getItem('pds_chiikawa_pos'));
    } catch (e) { }
    if (savedPos && savedPos.left && savedPos.top) {
      widget.style.left = savedPos.left + 'px';
      widget.style.top = savedPos.top + 'px';
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    }

    var charChipsHtml = Object.keys(CHARACTERS).map(function (k) {
      var c = CHARACTERS[k];
      var isActive = (k === currentCharId);
      return '<div class="chiikawa-char-chip ' + (isActive ? 'active' : '') + '" data-char="' + c.id + '" title="' + c.name + '">' +
        '  <img src="' + c.image + '" class="chiikawa-chip-img" alt="' + c.name + '">' +
        '  <span class="chiikawa-char-name">' + c.name + '</span>' +
        '</div>';
    }).join('');

    var initialBadgeCls = initialParsed.action ? '' : 'is-empty';

    widget.innerHTML =
      '<div class="chiikawa-speech-bubble" id="chiikawaBubble" title="클릭하면 새로운 응원을 들려줘요">' +
      '  <button class="bubble-close-btn" id="bubbleCloseBtn" title="말풍선 닫기">&times;</button>' +
      '  <div class="chiikawa-bubble-content">' +
      '    <p class="chiikawa-dialogue" id="chiikawaDialogue">"' + initialParsed.dialogue + '"</p>' +
      '    <div class="chiikawa-action-badge ' + initialBadgeCls + '" id="chiikawaActionBadge">' +
      '      <span class="badge-icon">' + initialParsed.badge + '</span> ' + (initialParsed.action || '') +
      '    </div>' +
      '  </div>' +
      '  <div class="chiikawa-quote-sub" id="chiikawaQuoteSub">— ' + char.name + ' —</div>' +
      '</div>' +
      '<div class="chiikawa-avatar-btn ' + initialParsed.anim + '" id="chiikawaAvatarBtn" title="먼작귀 친구들 선택 & 드래그로 자유 이동">' +
      '  <div class="chiikawa-heart-badge" id="chiikawaHeartBadge" style="background-color: ' + initialParsed.badgeColor + ';">' + initialParsed.badge + '</div>' +
      '  <img src="' + initialImg + '" class="chiikawa-avatar-img" id="chiikawaAvatarImg" alt="' + char.name + '" style="width:48px; height:48px; object-fit:contain; pointer-events:none;">' +
      '</div>' +
      '<div class="chiikawa-menu-popover" id="chiikawaMenuPopover" style="display: none;">' +
      '  <div class="chiikawa-menu-title">' +
      '    <span>나의 다이어리 친구</span>' +
      '    <span style="font-size:10px; color:#ff758f; font-weight:800;">먼작귀 에디션</span>' +
      '  </div>' +
      '  <div class="chiikawa-char-list">' +
      charChipsHtml +
      '  </div>' +
      '  <div style="display:flex; flex-direction:column; gap:6px; border-top:1px dashed var(--border); padding-top:8px; margin-top:2px;">' +
      '    <button type="button" id="chiikawaNewQuoteBtn" style="width:100%; background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:6px; font-size:11.5px; font-weight:600; cursor:pointer; color:var(--text); transition:var(--transition); display:flex; align-items:center; justify-content:center; gap:4px;">' +
      '      💬 새 응원 듣기' +
      '    </button>' +
      '    <button type="button" id="chiikawaHideBtn" style="width:100%; background:var(--surface-elevated); border:1px solid var(--border); border-radius:6px; padding:6px; font-size:11px; cursor:pointer; color:var(--text-muted); transition:var(--transition);">' +
      '      🐾 화면에서 메이트 숨기기' +
      '    </button>' +
      '    <div style="font-size:9.5px; color:var(--text-muted); text-align:center; line-height:1.3;">' +
      '      사이드바 하단의 <strong>🐾 다이어리 메이트</strong> 버튼으로 언제든 다시 꺼낼 수 있어요!' +
      '    </div>' +
      '  </div>' +
      '</div>';

    var bubble = document.getElementById('chiikawaBubble');
    startBubbleTimer();

    /* 말풍선 닫기 X 버튼 */
    var bubbleCloseBtn = document.getElementById('bubbleCloseBtn');
    if (bubbleCloseBtn) {
      bubbleCloseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (bubble) bubble.classList.add('fade-out');
      });
    }

    /* 말풍선 클릭 -> 랜덤 명언 갱신 */
    bubble.addEventListener('click', function () {
      refreshQuote();
      startBubbleTimer();
    });

    function refreshQuote() {
      var curC = CHARACTERS[currentCharId] || CHARACTERS.chiikawa;
      var quoteObj = curC.quotes[Math.floor(Math.random() * curC.quotes.length)];
      var parsed = parseQuote(quoteObj);

      var dialogueEl = document.getElementById('chiikawaDialogue');
      var actionBadge = document.getElementById('chiikawaActionBadge');
      var quoteSub = document.getElementById('chiikawaQuoteSub');

      if (dialogueEl) {
        dialogueEl.style.opacity = '0';
        if (actionBadge) actionBadge.style.opacity = '0';
        setTimeout(function () {
          dialogueEl.textContent = '"' + parsed.dialogue + '"';
          dialogueEl.style.opacity = '1';

          if (actionBadge) {
            if (parsed.action) {
              actionBadge.innerHTML = '<span class="badge-icon">' + parsed.badge + '</span> ' + parsed.action;
              actionBadge.classList.remove('is-empty');
              actionBadge.style.opacity = '1';
            } else {
              actionBadge.classList.add('is-empty');
            }
          }
          if (quoteSub) {
            quoteSub.textContent = '— ' + curC.name + ' —';
          }
        }, 150);
      }

      var avatarImg = document.getElementById('chiikawaAvatarImg');
      var avatarBtn = document.getElementById('chiikawaAvatarBtn');
      var heartBadge = document.getElementById('chiikawaHeartBadge');

      if (avatarImg) {
        var targetSrc = (parsed.pose === 'action') ? (curC.actionImage || curC.image) : curC.image;
        avatarImg.src = targetSrc;
      }

      if (heartBadge) {
        heartBadge.textContent = parsed.badge;
        heartBadge.style.backgroundColor = parsed.badgeColor;
        heartBadge.classList.remove('badge-pop');
        void heartBadge.offsetWidth;
        heartBadge.classList.add('badge-pop');
      }

      if (avatarBtn) {
        ALL_ANIM_CLASSES.forEach(function (cls) { avatarBtn.classList.remove(cls); });
        void avatarBtn.offsetWidth;
        avatarBtn.classList.add(parsed.anim);
        spawnFloatingReaction(parsed.reaction, avatarBtn);
        setTimeout(function () {
          avatarBtn.classList.remove(parsed.anim);
        }, 800);
      }
    }

    /* 새 응원 듣기 버튼 */
    var newQuoteBtn = document.getElementById('chiikawaNewQuoteBtn');
    if (newQuoteBtn) {
      newQuoteBtn.onclick = function (e) {
        e.stopPropagation();
        refreshQuote();
        if (bubble && bubble.classList.contains('fade-out')) {
          bubble.classList.remove('fade-out');
        }
        startBubbleTimer();
      };
    }

    /* 아바타 버튼 드래그 이동 및 클릭 분기 로직 */
    var avatarBtn = document.getElementById('chiikawaAvatarBtn');
    var menu = document.getElementById('chiikawaMenuPopover');

    var isDragging = false;
    var startX = 0, startY = 0;
    var origLeft = 0, origTop = 0;
    var hasMoved = false;

    function onPointerDown(e) {
      isDragging = true;
      hasMoved = false;
      var clientX = e.clientX || (e.touches && e.touches[0].clientX);
      var clientY = e.clientY || (e.touches && e.touches[0].clientY);
      startX = clientX;
      startY = clientY;

      var rect = widget.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;

      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      var clientX = e.clientX || (e.touches && e.touches[0].clientX);
      var clientY = e.clientY || (e.touches && e.touches[0].clientY);

      var dx = clientX - startX;
      var dy = clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
        widget.classList.add('is-dragging');
        if (e.preventDefault) e.preventDefault();

        var newLeft = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, origLeft + dx));
        var newTop = Math.max(10, Math.min(window.innerHeight - widget.offsetHeight - 10, origTop + dy));

        widget.style.left = newLeft + 'px';
        widget.style.top = newTop + 'px';
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
      }
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      widget.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);

      if (hasMoved) {
        var rect = widget.getBoundingClientRect();
        localStorage.setItem('pds_chiikawa_pos', JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
      } else {
        /* 단순 클릭인 경우 메뉴 토글 및 말풍선 복원 */
        if (bubble && bubble.classList.contains('fade-out')) {
          bubble.classList.remove('fade-out');
          startBubbleTimer();
        }
        isMenuOpen = !isMenuOpen;
        menu.style.display = isMenuOpen ? 'flex' : 'none';
      }
    }

    avatarBtn.addEventListener('mousedown', onPointerDown);
    avatarBtn.addEventListener('touchstart', onPointerDown, { passive: false });

    /* 바깥 클릭 시 메뉴 닫기 */
    document.addEventListener('click', function (e) {
      if (!widget.contains(e.target)) {
        isMenuOpen = false;
        menu.style.display = 'none';
      }
    });

    /* 캐릭터 변경 칩 클릭 */
    var chips = widget.querySelectorAll('.chiikawa-char-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        var charId = this.getAttribute('data-char');
        setChar(charId);
        menu.style.display = 'none';
        isMenuOpen = false;
      });
    });

    /* 숨기기 버튼 */
    var hideBtn = document.getElementById('chiikawaHideBtn');
    if (hideBtn) {
      hideBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleVisibility(false);
        isMenuOpen = false;
        menu.style.display = 'none';
      });
    }
  }

  /* 캐릭터 변경 함수 */
  function setChar(charId) {
    if (!CHARACTERS[charId]) return;
    currentCharId = charId;
    localStorage.setItem('pds_chiikawa_char', charId);

    var widget = document.getElementById('chiikawaCompanionWidget');
    if (widget) renderWidget(widget);

    var char = CHARACTERS[charId];
    if (typeof U !== 'undefined') {
      U.toast(char.name + '(이)가 오늘의 다이어리 메이트가 되었습니다! 🌸', 'success');
    }
  }

  return {
    init: init,
    celebrate: celebrate,
    setChar: setChar,
    toggleVisibility: toggleVisibility,
    getChar: function () { return CHARACTERS[currentCharId]; }
  };
})();
