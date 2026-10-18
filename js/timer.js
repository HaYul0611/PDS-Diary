/* === timer.js — 실시간 실행 타이머 & 뽀모도로 모듈 === */

var Timer = (function () {
  var state = {
    activeTodoId: null,
    activeTodoTitle: '자유 집중 실행',
    mode: 'stopwatch', /* 'stopwatch' | 'pomodoro' */
    status: 'stopped', /* 'stopped' | 'running' | 'paused' */
    seconds: 0,
    pomodoroRemaining: 25 * 60,
    pomodoroTotal: 25 * 60,
    startedAt: null,
    intervalId: null
  };

  /* 시간 포맷팅 HH:MM:SS 또는 MM:SS */
  function formatDigits(totalSec) {
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) {
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* 플로팅 도크 HTML 주입 및 드래그/최소화 기능 */
  function ensureDockElement() {
    var dock = document.getElementById('floatingTimerDock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'floatingTimerDock';
      dock.className = 'floating-timer-dock';
      dock.style.display = 'none';

      /* 위치 복원 */
      var savedPos = null;
      try {
        savedPos = JSON.parse(localStorage.getItem('pds_timer_pos'));
      } catch (e) { }
      if (savedPos && savedPos.left && savedPos.top) {
        dock.style.left = savedPos.left + 'px';
        dock.style.top = savedPos.top + 'px';
        dock.style.bottom = 'auto';
      }

      dock.innerHTML =
        '<span class="timer-drag-handle" id="timerDragHandle" title="드래그하여 원하는 위치로 이동">' +
        '  <svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor">' +
        '    <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>' +
        '    <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>' +
        '    <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>' +
        '  </svg>' +
        '</span>' +
        '<div class="timer-dock-pulse" id="timerDockPulse"></div>' +
        '<div class="timer-dock-info" id="timerDockInfo" title="클릭하여 타이머 확장">' +
        '  <span class="timer-dock-title" id="timerDockTitle">할 일 실행 중</span>' +
        '  <span class="timer-dock-digits" id="timerDockDigits">00:00</span>' +
        '</div>' +
        '<div class="timer-dock-actions">' +
        '  <button class="timer-btn-icon" id="timerDockToggleBtn" title="일시정지/재개">' +
        '    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
        '  </button>' +
        '  <button class="timer-btn-icon primary" id="timerDockSaveBtn" title="실행 기록으로 저장">' +
        '    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
        '  </button>' +
        '  <button class="timer-btn-icon" id="timerDockExpandBtn" title="타이머 다이얼 열기">' +
        '    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
        '  </button>' +
        '  <button class="timer-btn-icon" id="timerDockMinBtn" title="최소화/축소">' +
        '    <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor"><rect width="10" height="2" rx="1"/></svg>' +
        '  </button>' +
        '  <button class="timer-btn-icon" id="timerDockCloseBtn" title="도크 숨기기">' +
        '    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '  </button>' +
        '</div>';
      document.body.appendChild(dock);

      /* 도크 이벤트 연결 */
      document.getElementById('timerDockInfo').addEventListener('click', function () {
        if (dock.classList.contains('minimized')) {
          dock.classList.remove('minimized');
        } else {
          openModal();
        }
      });
      document.getElementById('timerDockExpandBtn').addEventListener('click', openModal);
      document.getElementById('timerDockToggleBtn').addEventListener('click', togglePause);
      document.getElementById('timerDockSaveBtn').addEventListener('click', stopAndSave);

      /* 최소화 토글 */
      document.getElementById('timerDockMinBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        dock.classList.toggle('minimized');
      });

      /* 닫기 (숨기기) */
      document.getElementById('timerDockCloseBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        dock.style.display = 'none';
        U.toast('타이머 도크가 숨겨졌습니다. 할 일 목록의 [타이머]를 누르면 다시 표시됩니다.', 'info');
      });

      /* 드래그 앤 드롭 이동 로직 */
      var isDragging = false;
      var startX = 0, startY = 0;
      var origLeft = 0, origTop = 0;

      function onPointerDown(e) {
        if (e.target.closest('.timer-btn-icon')) return;
        isDragging = true;
        dock.classList.add('is-dragging');
        var clientX = e.clientX || (e.touches && e.touches[0].clientX);
        var clientY = e.clientY || (e.touches && e.touches[0].clientY);
        startX = clientX;
        startY = clientY;

        var rect = dock.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;

        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);
      }

      function onPointerMove(e) {
        if (!isDragging) return;
        if (e.preventDefault) e.preventDefault();
        var clientX = e.clientX || (e.touches && e.touches[0].clientX);
        var clientY = e.clientY || (e.touches && e.touches[0].clientY);

        var dx = clientX - startX;
        var dy = clientY - startY;

        var newLeft = Math.max(10, Math.min(window.innerWidth - dock.offsetWidth - 10, origLeft + dx));
        var newTop = Math.max(10, Math.min(window.innerHeight - dock.offsetHeight - 10, origTop + dy));

        dock.style.left = newLeft + 'px';
        dock.style.top = newTop + 'px';
        dock.style.bottom = 'auto';
      }

      function onPointerUp() {
        if (!isDragging) return;
        isDragging = false;
        dock.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('mouseup', onPointerUp);
        document.removeEventListener('touchmove', onPointerMove);
        document.removeEventListener('touchend', onPointerUp);

        var rect = dock.getBoundingClientRect();
        localStorage.setItem('pds_timer_pos', JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
      }

      var handle = document.getElementById('timerDragHandle');
      if (handle) {
        handle.addEventListener('mousedown', onPointerDown);
        handle.addEventListener('touchstart', onPointerDown, { passive: false });
      }
    }
    return dock;
  }

  /* 틱(Tick) 함수 */
  function tick() {
    if (state.mode === 'stopwatch') {
      state.seconds++;
      updateUI();
    } else {
      if (state.pomodoroRemaining > 0) {
        state.pomodoroRemaining--;
        state.seconds++;
        updateUI();
      } else {
        /* 뽀모도로 완료 */
        pause();
        U.toast('🍅 뽀모도로 1세션(25분)을 완수했습니다! 잠시 스트레칭하며 휴식을 취해보세요.', 'success');
        if (typeof Chiikawa !== 'undefined') {
          Chiikawa.celebrate('뽀모도로 집중 완수! 🍅');
        }
        updateUI();
      }
    }
  }

  /* UI 렌더링 갱신 */
  function updateUI() {
    var dock = ensureDockElement();
    var pulse = document.getElementById('timerDockPulse');
    var titleEl = document.getElementById('timerDockTitle');
    var digitsEl = document.getElementById('timerDockDigits');
    var toggleBtn = document.getElementById('timerDockToggleBtn');

    if (state.status === 'stopped') {
      dock.style.display = 'none';
      return;
    }

    dock.style.display = 'flex';
    if (titleEl) titleEl.textContent = state.activeTodoTitle;

    var currentDisplaySec = state.mode === 'stopwatch' ? state.seconds : state.pomodoroRemaining;
    var timeStr = formatDigits(currentDisplaySec);

    if (digitsEl) digitsEl.textContent = timeStr;

    if (pulse) {
      if (state.status === 'paused') {
        pulse.classList.add('paused');
      } else {
        pulse.classList.remove('paused');
      }
    }

    if (toggleBtn) {
      if (state.status === 'paused') {
        toggleBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      } else {
        toggleBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      }
    }

    /* 모달이 열려있다면 모달 내부 다이얼 및 텍스트 갱신 */
    var modalDigits = document.getElementById('modalTimerDigits');
    var circleProg = document.getElementById('modalTimerProgress');
    var modalToggle = document.getElementById('modalTimerToggleBtn');

    if (modalDigits) modalDigits.textContent = timeStr;
    if (modalToggle) {
      modalToggle.textContent = state.status === 'paused' ? '▶ 다시 시작' : '⏸ 일시 정지';
    }

    if (circleProg) {
      var circumference = 2 * Math.PI * 92; /* r=92 */
      var progress = 0;
      if (state.mode === 'stopwatch') {
        progress = (state.seconds % 3600) / 3600;
      } else {
        progress = 1 - (state.pomodoroRemaining / state.pomodoroTotal);
      }
      var offset = circumference * (1 - progress);
      circleProg.style.strokeDashoffset = offset;
    }
  }

  /* 타이머 시작 */
  function start(todoId, todoTitle, mode) {
    if (state.status !== 'stopped') {
      if (!confirm('현재 진행 중인 타이머가 있습니다. 새로운 타이머로 교체할까요?')) {
        openModal();
        return;
      }
      reset();
    }

    state.activeTodoId = todoId || null;
    state.activeTodoTitle = todoTitle || '자유 집중 실행';
    state.mode = mode || 'stopwatch';
    state.status = 'running';
    state.seconds = 0;
    state.pomodoroRemaining = 25 * 60;
    state.startedAt = new Date();

    if (state.intervalId) clearInterval(state.intervalId);
    state.intervalId = setInterval(tick, 1000);

    updateUI();
    U.toast('⏱️ "' + state.activeTodoTitle + '" 타이머가 시작되었습니다!', 'info');
  }

  /* 일시정지 / 재개 토글 */
  function togglePause() {
    if (state.status === 'running') {
      pause();
    } else if (state.status === 'paused') {
      resume();
    }
  }

  function pause() {
    if (state.status === 'running') {
      state.status = 'paused';
      if (state.intervalId) clearInterval(state.intervalId);
      updateUI();
    }
  }

  function resume() {
    if (state.status === 'paused') {
      state.status = 'running';
      state.intervalId = setInterval(tick, 1000);
      updateUI();
    }
  }

  /* 리셋 */
  function reset() {
    if (state.intervalId) clearInterval(state.intervalId);
    state.status = 'stopped';
    state.seconds = 0;
    state.pomodoroRemaining = 25 * 60;
    state.startedAt = null;
    updateUI();
  }

  /* 실행 기록으로 저장 및 정지 */
  async function stopAndSave() {
    if (state.seconds < 10) {
      if (!confirm('실행 시간이 10초 미만입니다. 그래도 기록으로 저장할까요?')) {
        return;
      }
    }

    var startedAt = state.startedAt || new Date(Date.now() - state.seconds * 1000);
    var endedAt = new Date();
    /* 시간 계산 (최소 0.1시간 단위) */
    var hours = Math.max(0.1, Math.round((state.seconds / 3600) * 10) / 10);

    /* 할 일이 미지정된 경우 사용자에게 선택 요청 */
    var todoId = state.activeTodoId;
    if (!todoId) {
      U.toast('타이머와 연동할 할 일을 선택해주세요.', 'info');
      openModal();
      return;
    }

    try {
      if (typeof Records !== 'undefined') {
        await Records.create({
          todo_id: todoId,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          actual_hours: hours,
          blocker: ''
        });

        U.toast('실행 기록에 ' + hours + '시간이 성공적으로 저장되었습니다! 🎉', 'success');

        /* 귀여운 치이카와 리액션 연동 */
        if (typeof Chiikawa !== 'undefined') {
          Chiikawa.celebrate(state.activeTodoTitle + ' (' + hours + 'h 실천)');
        }

        /* 탭 데이터 새로고침 */
        if (typeof App !== 'undefined') {
          if (App.currentTab === 'records' && typeof App.loadRecords === 'function') App.loadRecords();
          if (App.currentTab === 'review' && typeof App.loadReview === 'function') App.loadReview();
        }

        reset();

        /* 모달 닫기 */
        if (typeof closeModal === 'function') closeModal();
      }
    } catch (err) {
      console.error(err);
      U.toast('실행 기록 저장 실패: ' + (err.message || '오류가 발생했습니다.'), 'error');
    }
  }

  /* 풀 모달 열기 */
  function openModal() {
    var modalTitle = document.getElementById('modalTitle');
    var modalBody = document.getElementById('modalBody');
    var modalEl = document.getElementById('modal');
    if (!modalTitle || !modalBody || !modalEl) return;

    modalTitle.textContent = '실시간 실행 타이머 (Do Timer)';

    var circumference = 2 * Math.PI * 92;
    var currentDisplaySec = state.mode === 'stopwatch' ? state.seconds : state.pomodoroRemaining;
    var timeStr = formatDigits(currentDisplaySec);

    modalBody.innerHTML =
      '<div class="timer-modal-content">' +
      '  <div class="timer-mode-switcher">' +
      '    <button class="timer-mode-btn ' + (state.mode === 'stopwatch' ? 'active' : '') + '" id="timerModeStopwatch">⏱️ 스톱워치</button>' +
      '    <button class="timer-mode-btn ' + (state.mode === 'pomodoro' ? 'active' : '') + '" id="timerModePomodoro">🍅 뽀모도로 (25분)</button>' +
      '  </div>' +
      '  <div class="timer-dial-container">' +
      '    <svg class="timer-svg-circle" viewBox="0 0 200 200">' +
      '      <circle class="timer-circle-bg" cx="100" cy="100" r="92"></circle>' +
      '      <circle class="timer-circle-progress" id="modalTimerProgress" cx="100" cy="100" r="92" stroke-dasharray="' + circumference + '" stroke-dashoffset="0"></circle>' +
      '    </svg>' +
      '    <div class="timer-dial-inner">' +
      '      <span class="timer-dial-label">' + (state.mode === 'stopwatch' ? '실행 누적 시간' : '남은 집중 시간') + '</span>' +
      '      <span class="timer-big-digits" id="modalTimerDigits">' + timeStr + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="timer-target-info">' +
      '    <div>' +
      '      <div class="timer-target-label">현재 타이머 대상 할 일</div>' +
      '      <div class="timer-target-name">' + U.escapeHtml(state.activeTodoTitle) + '</div>' +
      '    </div>' +
      '    <span class="badge badge-priority-high">' + (state.status === 'running' ? '실행 중' : state.status === 'paused' ? '일시정지' : '대기') + '</span>' +
      '  </div>' +
      '  <div class="timer-controls-row">' +
      '    <button class="timer-btn-secondary" id="modalTimerToggleBtn">' + (state.status === 'paused' || state.status === 'stopped' ? '▶ 시작/재개' : '⏸ 일시 정지') + '</button>' +
      '    <button class="timer-btn-save" id="modalTimerSaveBtn">💾 실행 기록으로 저장</button>' +
      '    <button class="timer-btn-secondary" id="modalTimerResetBtn">🔄 리셋</button>' +
      '  </div>' +
      '</div>';

    modalEl.hidden = false;

    /* 모달 버튼 이벤트 연결 */
    document.getElementById('timerModeStopwatch').addEventListener('click', function () {
      state.mode = 'stopwatch';
      document.getElementById('timerModeStopwatch').classList.add('active');
      document.getElementById('timerModePomodoro').classList.remove('active');
      updateUI();
    });

    document.getElementById('timerModePomodoro').addEventListener('click', function () {
      state.mode = 'pomodoro';
      document.getElementById('timerModePomodoro').classList.add('active');
      document.getElementById('timerModeStopwatch').classList.remove('active');
      updateUI();
    });

    document.getElementById('modalTimerToggleBtn').addEventListener('click', function () {
      if (state.status === 'stopped') {
        start(state.activeTodoId, state.activeTodoTitle, state.mode);
      } else {
        togglePause();
      }
    });

    document.getElementById('modalTimerSaveBtn').addEventListener('click', stopAndSave);
    document.getElementById('modalTimerResetBtn').addEventListener('click', function () {
      if (confirm('타이머 시간을 초기화할까요?')) {
        reset();
      }
    });
  }

  return {
    init: function () {
      ensureDockElement();
    },
    start: start,
    pause: pause,
    resume: resume,
    reset: reset,
    togglePause: togglePause,
    stopAndSave: stopAndSave,
    openModal: openModal,
    getState: function () { return state; }
  };
})();
