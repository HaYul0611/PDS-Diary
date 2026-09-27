/* === app.js — 메인 컨트롤러 (캘린더 연도선택/계획스티커, Vlog 다중 캐러셀, 3D 책장넘김) === */

(function () {
  var currentTab = 'plans';
  var selectedPlanId = null;

  // 캘린더 상태 (년/월)
  var now = new Date();
  var calYear = now.getFullYear();
  var calMonth = now.getMonth(); // 0-indexed

  // 캐러셀 상태 보관
  var carouselStates = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindTabs();
    bindExport();
    bindModal();
    bindEvents();
    bindCalendarControls();
    bindVlogControls();
    CustomSelect.enhanceAll(document);
    loadPlans();
  }

  /* ========== 탭 전환 (책 중앙 제본선 중심 3D 책장 넘김) ========== */
  var TAB_ORDER = ['plans', 'calendar', 'todos', 'records', 'vlog', 'review'];
  var pageFlipTimer = null;

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        switchTab(t.dataset.tab);
      });
    });
  }

  /* 다이어리 탭별 페이지 번호 */
  var FOLIO_MAP = {
    plans: ['- 1 -', '- 2 -'],
    calendar: ['- 3 -', '- 4 -'],
    todos: ['- 5 -', '- 6 -'],
    records: ['- 7 -', '- 8 -'],
    vlog: ['- 9 -', '- 10 -'],
    review: ['- 11 -', '- 12 -']
  };

  function triggerPageFlip(isForward, oldPanel, newPanel) {
    var layer = document.getElementById('pageFlipLayer');
    var page = document.getElementById('flippingPage');
    if (!layer || !page) return;

    if (pageFlipTimer) clearTimeout(pageFlipTimer);

    var frontInner = page.querySelector('.page-front .page-clone-inner');
    var backInner = page.querySelector('.page-back .page-clone-inner');

    // 앞장 & 뒷장: DOM ID 중복 충돌을 원천 차단하기 위해 id 속성을 제거하여 복제
    if (frontInner && oldPanel) {
      frontInner.innerHTML = oldPanel.innerHTML.replace(/\s+id="[^"]*"/g, '');
      frontInner.className = 'page-clone-inner ' + (isForward ? 'show-right' : 'show-left');
    }

    if (backInner && newPanel) {
      backInner.innerHTML = newPanel.innerHTML.replace(/\s+id="[^"]*"/g, '');
      backInner.className = 'page-clone-inner ' + (isForward ? 'show-left' : 'show-right');
    }

    page.className = 'flipping-page ' + (isForward ? 'flip-forward' : 'flip-backward');
    layer.hidden = false;

    pageFlipTimer = setTimeout(function () {
      layer.hidden = true;
      page.className = 'flipping-page';
    }, 670);
  }

  function switchTab(name) {
    if (name === currentTab) return;

    var oldName = currentTab;
    var oldIndex = TAB_ORDER.indexOf(oldName);
    var newIndex = TAB_ORDER.indexOf(name);
    var isForward = newIndex >= oldIndex;

    var oldPanel = document.getElementById('tab' + capitalize(oldName));
    var newPanel = document.getElementById('tab' + capitalize(name));

    // 실제 앞장/뒷장 콘텐츠를 지닌 3D 책장 넘김 실행
    triggerPageFlip(isForward, oldPanel, newPanel);

    currentTab = name;
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === name);
    });

    // 다이어리 좌우 하단 페이지 번호 업데이트
    var folios = FOLIO_MAP[name] || ['- 1 -', '- 2 -'];
    var lEl = document.getElementById('pageFolioLeft');
    var rEl = document.getElementById('pageFolioRight');
    if (lEl) lEl.textContent = folios[0];
    if (rEl) rEl.textContent = folios[1];

    // 책장이 수직(90도)으로 펼쳐져 시야를 가리는 320ms 시점에 실제 패널 활성화 및 렌더링
    setTimeout(function () {
      document.querySelectorAll('.tab-panel').forEach(function (p) {
        var isActive = p.id === 'tab' + capitalize(name);
        p.classList.toggle('active', isActive);
      });
      // 활성화된 패널의 데이터 및 커스텀 셀렉트 안전 로드
      renderTabContent(name);
    }, 320);
  }

  function renderTabContent(name) {
    if (name === 'plans') {
      loadPlans();
    } else if (name === 'calendar') {
      loadCalendar();
    } else if (name === 'todos') {
      loadPlanSelect('planSelect').then(function () {
        loadTodos();
        CustomSelect.enhanceAll(document.getElementById('tabTodos'));
      });
    } else if (name === 'records') {
      loadPlanSelect('recordPlanSelect').then(function () {
        loadRecords();
        CustomSelect.enhanceAll(document.getElementById('tabRecords'));
      });
    } else if (name === 'vlog') {
      loadVlog();
    } else if (name === 'review') {
      loadPlanSelect('reviewPlanSelect').then(function () {
        loadReview();
        CustomSelect.enhanceAll(document.getElementById('tabReview'));
      });
    }
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ========== 이벤트 바인딩 ========== */
  function bindEvents() {
    // 새 계획 버튼
    var addPlanBtn = document.getElementById('addPlanBtn');
    if (addPlanBtn) {
      addPlanBtn.addEventListener('click', function () {
        showPlanForm();
      });
    }

    // 할 일 추가 버튼
    var addTodoBtn = document.getElementById('addTodoBtn');
    if (addTodoBtn) {
      addTodoBtn.addEventListener('click', function () {
        if (!selectedPlanId) {
          U.toast('먼저 계획을 선택하거나 생성해주세요.', 'error');
          return;
        }
        showTodoForm();
      });
    }

    // 할 일 검색 & 필터
    ['todoSearch', 'todoStatusFilter', 'todoPriorityFilter', 'todoSort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', function () {
          loadTodos();
        });
      }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var modal = document.getElementById('modal');
        if (modal && !modal.hidden) {
          closeModal();
        }
      }
    });
  }

  /* ========== 내보내기 ========== */
  function bindExport() {
    var btn = document.getElementById('exportBtn');
    if (btn) {
      btn.addEventListener('click', async function () {
        var ok = await U.exportAll();
        if (ok) {
          U.toast('모든 데이터를 JSON으로 내보냈습니다.', 'success');
        }
      });
    }
  }

  /* ========== 모달 ========== */
  function bindModal() {
    var closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    var modal = document.getElementById('modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });
    }
  }

  function openModal(title, html) {
    var titleEl = document.getElementById('modalTitle');
    var bodyEl = document.getElementById('modalBody');
    var modal = document.getElementById('modal');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) {
      bodyEl.innerHTML = html;
      bodyEl.scrollTop = 0;
    }
    if (modal) {
      var card = modal.querySelector('.modal-card');
      if (card) card.scrollTop = 0;
      modal.hidden = false;
      CustomSelect.enhanceAll(modal);
      var firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
      if (firstInput) {
        setTimeout(function () {
          try {
            firstInput.focus({ preventScroll: true });
          } catch (e) {
            firstInput.focus();
          }
        }, 60);
      }
    }
  }

  function closeModal() {
    var modal = document.getElementById('modal');
    if (modal) modal.hidden = true;
  }

  /* ========== 계획 셀렉트 로드 & 동기화 ========== */
  async function loadPlanSelect(selectId) {
    try {
      var plans = await Plans.list();
      var sel = document.getElementById(selectId);
      if (!sel) return;

      if (!plans || plans.length === 0) {
        sel.innerHTML = '<option value="">(등록된 계획 없음)</option>';
        sel.disabled = true;
        selectedPlanId = null;
        CustomSelect.enhance(sel);
        return;
      }

      sel.disabled = false;
      var exists = plans.some(function (p) { return p.id === selectedPlanId; });
      if (!exists && plans.length > 0) {
        selectedPlanId = plans[0].id;
      }

      sel.innerHTML = plans.map(function (p) {
        var s = p.id === selectedPlanId ? ' selected' : '';
        return '<option value="' + p.id + '"' + s + '>' + U.esc(p.title) + '</option>';
      }).join('');

      sel.onchange = function () {
        selectedPlanId = sel.value;
        syncPlanSelects(sel.value);
        onPlanSelectChange();
      };

      CustomSelect.enhance(sel);
    } catch (err) {
      console.error(err);
      U.toast('계획 목록을 불러오지 못했습니다: ' + err.message, 'error');
    }
  }

  function syncPlanSelects(val) {
    ['planSelect', 'recordPlanSelect', 'reviewPlanSelect'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        if (el.value !== val) el.value = val;
        CustomSelect.sync(el);
      }
    });
  }

  function onPlanSelectChange() {
    if (currentTab === 'todos') loadTodos();
    if (currentTab === 'records') loadRecords();
    if (currentTab === 'review') loadReview();
  }

  /* ========== 계획 목록 ========== */
  async function loadPlans() {
    var el = document.getElementById('plansList');
    if (!el) return;

    try {
      var plans = await Plans.list();

      if (!plans || plans.length === 0) {
        el.innerHTML = '<div class="empty-state">' +
          '<div class="empty-icon">' + Icons.target(40) + '</div>' +
          '<div class="empty-title">아직 등록된 계획이 없습니다</div>' +
          '<div class="empty-desc">새로운 목표와 일정을 담은 계획을 만들고 실천해보세요.</div>' +
          '<button class="btn-primary" type="button" onclick="App.showNewPlanForm()">' +
          Icons.plus(16) + ' 첫 계획 만들기' +
          '</button>' +
          '</div>';
        return;
      }

      el.innerHTML = plans.map(function (p) {
        var pb = priorityBadge(p.priority);
        var sb = statusBadge(p.status);
        return '<div class="card">' +
          '<div class="card-header-line">' +
          '<div class="card-title">' + U.esc(p.title) + '</div>' +
          '<div class="card-badges">' + pb + sb + '</div>' +
          '</div>' +
          '<div class="card-meta">' +
          '<span class="meta-date">' + Icons.calendar(14) + U.formatDate(p.start_date) + ' ~ ' + U.formatDate(p.end_date) + '</span>' +
          '<span class="meta-hours">' + Icons.clock(14) + '예상 ' + p.estimated_hours + '시간</span>' +
          '</div>' +
          '<div class="card-sub-info">' +
          '<span class="sub-label">' + Icons.target(13) + ' 성공 기준:</span> ' + U.esc(p.success_criteria) +
          '</div>' +
          (p.next_action ? '<div class="card-sub-info next-info">' +
            '<span class="sub-label">' + Icons.arrowRight(13) + ' 다음 계획:</span> ' + U.esc(p.next_action) +
            '</div>' : '') +
          '<div class="card-actions">' +
          '<button class="btn-outline btn-go" type="button" onclick="App.selectAndGo(\'' + p.id + '\',\'todos\')">' +
          Icons.list(14) + ' 할 일 보기' +
          '</button>' +
          '<button class="btn-outline" type="button" onclick="App.editPlan(\'' + p.id + '\')">' +
          Icons.edit(14) + ' 수정' +
          '</button>' +
          '<button class="btn-outline" type="button" onclick="App.viewHistory(\'' + p.id + '\')">' +
          Icons.history(14) + ' 수정 이력' +
          '</button>' +
          '<button class="btn-danger" type="button" onclick="App.confirmDeletePlan(\'' + p.id + '\',\'' + U.esc(p.title) + '\')">' +
          Icons.trash(14) + ' 삭제' +
          '</button>' +
          '</div></div>';
      }).join('');
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="empty-state error"><p>계획 데이터를 불러오는데 실패했습니다: ' + U.esc(err.message) + '</p></div>';
    }
  }

  /* ========== 계획 폼 (생성/수정) ========== */
  function showPlanForm(plan) {
    var isEdit = !!plan;
    var html = '<form id="planForm">' +
      '<div class="form-group">' +
      '<label>계획 제목</label>' +
      '<input class="input" name="title" value="' + (plan ? U.esc(plan.title) : '') + '" placeholder="예: 3분기 자격증 취득하기" required>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label>시작일</label>' +
      '<input class="input" type="date" name="start_date" value="' + (plan ? U.formatDateInput(plan.start_date) : U.todaySeoul()) + '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>종료일</label>' +
      '<input class="input" type="date" name="end_date" value="' + (plan ? U.formatDateInput(plan.end_date) : U.daysFromToday(30)) + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label>우선순위</label>' +
      '<div class="select-wrapper">' +
      '<select class="select" name="priority">' +
      '<option value="높음"' + (plan && plan.priority === '높음' ? ' selected' : '') + '>높음</option>' +
      '<option value="보통"' + (!plan || plan.priority === '보통' ? ' selected' : '') + '>보통</option>' +
      '<option value="낮음"' + (plan && plan.priority === '낮음' ? ' selected' : '') + '>낮음</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>예상 시간 (h)</label>' +
      '<input class="input" type="number" name="estimated_hours" step="0.5" min="0" value="' + (plan ? plan.estimated_hours : 0) + '">' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>성공 기준</label>' +
      '<textarea class="textarea" name="success_criteria" placeholder="어떤 상태가 되면 완료된 것으로 볼 것인가요?" required>' + (plan ? U.esc(plan.success_criteria) : '') + '</textarea>' +
      '</div>' +
      (isEdit ? '<div class="form-group"><label>상태</label><div class="select-wrapper"><select class="select" name="status">' +
        '<option value="진행중"' + (plan.status === '진행중' ? ' selected' : '') + '>진행중</option>' +
        '<option value="완료"' + (plan.status === '완료' ? ' selected' : '') + '>완료</option>' +
        '<option value="보류"' + (plan.status === '보류' ? ' selected' : '') + '>보류</option>' +
        '</select></div></div>' : '') +
      (isEdit ? '<div class="form-group"><label>수정 이유</label><input class="input" name="change_reason" placeholder="내용을 왜 수정하나요? (수정 이력에 기록됩니다)"></div>' : '') +
      '<button type="submit" class="btn-primary btn-submit">' +
      (isEdit ? Icons.save(16) + ' 수정사항 저장' : Icons.plus(16) + ' 계획 만들기') +
      '</button></form>';

    openModal(isEdit ? '계획 수정' : '새 계획 만들기', html);

    var form = document.getElementById('planForm');
    if (form) {
      form.onsubmit = async function (e) {
        e.preventDefault();
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        var fd = new FormData(this);
        var data = Object.fromEntries(fd);

        try {
          if (isEdit) {
            await Plans.update(plan.id, data, data.change_reason);
            U.toast('계획이 수정되었습니다.', 'success');
          } else {
            var created = await Plans.create(data);
            if (created) selectedPlanId = created.id;
            U.toast('새 계획이 생성되었습니다.', 'success');
          }
          closeModal();
          loadPlans();
          if (currentTab === 'calendar') loadCalendar();
        } catch (err) {
          console.error(err);
          U.toast('계획 저장 중 오류가 발생했습니다: ' + err.message, 'error');
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }
  }

  /* ========== 캘린더 다이어리 (연도/월 점프 & 계획 스티커 표시) ========== */
  function bindCalendarControls() {
    var prevBtn = document.getElementById('calPrevBtn');
    var nextBtn = document.getElementById('calNextBtn');
    var todayBtn = document.getElementById('calTodayBtn');
    var addBtn = document.getElementById('calAddTodoBtn');
    var yearSel = document.getElementById('calYearSelect');
    var monthSel = document.getElementById('calMonthSelect');

    // 연도 셀렉트 옵션 채우기 (2023 ~ 2032)
    if (yearSel) {
      var yHtml = '';
      for (var y = 2023; y <= 2032; y++) {
        yHtml += '<option value="' + y + '">' + y + '년</option>';
      }
      yearSel.innerHTML = yHtml;
      yearSel.addEventListener('change', function () {
        calYear = parseInt(this.value);
        loadCalendar();
      });
    }

    // 월 셀렉트 옵션 채우기 (1 ~ 12월)
    if (monthSel) {
      var mHtml = '';
      for (var m = 0; m < 12; m++) {
        mHtml += '<option value="' + m + '">' + (m + 1) + '월</option>';
      }
      monthSel.innerHTML = mHtml;
      monthSel.addEventListener('change', function () {
        calMonth = parseInt(this.value);
        loadCalendar();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        loadCalendar();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        loadCalendar();
      });
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', function () {
        var d = new Date();
        calYear = d.getFullYear();
        calMonth = d.getMonth();
        loadCalendar();
      });
    }
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        showTodoForm();
      });
    }
  }

  async function loadCalendar() {
    var gridEl = document.getElementById('calendarGrid');
    var yearSel = document.getElementById('calYearSelect');
    var monthSel = document.getElementById('calMonthSelect');
    if (!gridEl) return;

    // 연도/월 셀렉트 동기화
    if (yearSel && yearSel.value != calYear) {
      yearSel.value = calYear;
      CustomSelect.sync(yearSel);
    }
    if (monthSel && monthSel.value != calMonth) {
      monthSel.value = calMonth;
      CustomSelect.sync(monthSel);
    }

    // 1. 해당 월의 모든 할 일(Todos) 및 계획(Plans) 동시 로드
    var allTodos = [];
    var allPlans = [];
    try {
      var [todosRes, plansRes] = await Promise.all([
        db.from('todos').select('*'),
        db.from('plans').select('*')
      ]);
      allTodos = todosRes.data || [];
      allPlans = plansRes.data || [];
    } catch (e) {
      console.warn('캘린더 데이터 조회 오류:', e);
    }

    var firstDay = new Date(calYear, calMonth, 1).getDay(); // 0: 일요일
    var lastDate = new Date(calYear, calMonth + 1, 0).getDate();
    var prevLastDate = new Date(calYear, calMonth, 0).getDate();

    var todayStr = U.todaySeoul();
    var cellsHtml = '';

    // 이전 달 잔여 날짜
    for (var i = firstDay - 1; i >= 0; i--) {
      var pDate = prevLastDate - i;
      cellsHtml += '<div class="cal-cell other-month"><div class="cal-date-num">' + pDate + '</div></div>';
    }

    var vlogEntries = getVlogEntries();

    // 이번 달 날짜들
    for (var date = 1; date <= lastDate; date++) {
      var mm = String(calMonth + 1).padStart(2, '0');
      var dd = String(date).padStart(2, '0');
      var dateStr = calYear + '-' + mm + '-' + dd;
      var isToday = (dateStr === todayStr);
      var dow = (firstDay + date - 1) % 7; // 0: 일요일, 6: 토요일

      // (A) 계획 스티커: 기간 동안 하나의 형광펜 줄처럼 이어지게 렌더링
      var dayPlans = allPlans.filter(function (p) {
        if (!p.start_date || !p.end_date) return false;
        var s = p.start_date.slice(0, 10);
        var e = p.end_date.slice(0, 10);
        return dateStr >= s && dateStr <= e;
      });

      var planStickersHtml = dayPlans.map(function (p) {
        var s = p.start_date.slice(0, 10);
        var e = p.end_date.slice(0, 10);
        var isStart = (dateStr === s || dow === 0 || date === 1);
        var isEnd = (dateStr === e || dow === 6 || date === lastDate);
        var isSingle = (isStart && isEnd);
        var cls = isSingle ? 'hl-single' : (isStart ? 'hl-start' : (isEnd ? 'hl-end' : 'hl-mid'));

        var titleHtml = (isStart || isSingle)
          ? '<span class="hl-title">' + Icons.bookOpen(11) + ' ' + U.esc(p.title) + '</span>'
          : '';

        return '<div class="cal-plan-highlighter ' + cls + '" title="[계획] ' + U.esc(p.title) + ' (' + s + ' ~ ' + e + ')" onclick="event.stopPropagation(); App.editPlan(\'' + p.id + '\');">' +
          titleHtml +
          '</div>';
      }).join('');

      // (B) 할 일 스티커: 이 날짜가 마감일인 할 일
      var dayTodos = allTodos.filter(function (t) {
        return t.due_date && t.due_date.slice(0, 10) === dateStr;
      });

      var todoStickersHtml = dayTodos.map(function (t) {
        var isDone = t.status === '완료';
        var colorCls = isDone ? 'done' : (t.priority === '높음' ? 'red' : t.priority === '낮음' ? 'blue' : 'yellow');
        return '<div class="cal-todo-sticker ' + colorCls + '" title="' + U.esc(t.title) + '">' +
          (isDone ? Icons.check(11) : '') +
          '<span class="sticker-text">' + U.esc(t.title) + '</span>' +
          '</div>';
      }).join('');

      // (C) 사진·Vlog 일기 스티커: 해당 날짜에 작성된 포토 일기 노출
      var dayVlogs = vlogEntries.filter(function (v) {
        return v.date === dateStr;
      });

      var vlogStickersHtml = dayVlogs.map(function (v) {
        var thumbSrc = (v.photos && v.photos[0]) ? v.photos[0] : '';
        return '<div class="cal-vlog-sticker" title="[사진·Vlog] ' + U.esc(v.title) + '" onclick="event.stopPropagation(); App.openVlogFromCal(\'' + v.id + '\');">' +
          '<div class="cal-vlog-thumb-wrap">' +
          (thumbSrc ? '<img src="' + thumbSrc + '" class="cal-vlog-thumb-img" alt="" />' : Icons.camera(10)) +
          '</div>' +
          '<span class="cal-vlog-title">' + Icons.camera(10) + ' ' + U.esc(v.title) + '</span>' +
          '</div>';
      }).join('');

      cellsHtml += '<div class="cal-cell' + (isToday ? ' today' : '') + '" onclick="App.openCalDateAdd(\'' + dateStr + '\')">' +
        '<div class="cal-cell-header">' +
        '<span class="cal-date-num' + (isToday ? ' today-circle' : '') + '">' + date + '</span>' +
        (isToday ? '<span class="today-tag">오늘</span>' : '') +
        '</div>' +
        '<div class="cal-stickers-box">' +
        planStickersHtml +
        todoStickersHtml +
        vlogStickersHtml +
        '</div>' +
        '</div>';
    }

    // 다음 달 잔여 날짜
    var totalCells = firstDay + lastDate;
    var remaining = (7 - (totalCells % 7)) % 7;
    for (var n = 1; n <= remaining; n++) {
      cellsHtml += '<div class="cal-cell other-month"><div class="cal-date-num">' + n + '</div></div>';
    }

    gridEl.innerHTML = cellsHtml;
  }

  /* ========== 사진 / Vlog 일기 (다중 이미지 캐러셀 슬라이딩) ========== */
  function bindVlogControls() {
    var addBtn = document.getElementById('addVlogBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        showVlogForm();
      });
    }
  }

  function getVlogEntries() {
    var raw = localStorage.getItem('pds_vlog_entries');
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(function (it) {
            if (it && it.photos) {
              it.photos = it.photos.filter(function (p) { return typeof p === 'string' && p.trim().length > 0; });
              if (it.photos.length === 0) {
                it.photos = ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80'];
              }
            }
          });
          return parsed;
        }
      } catch (e) { }
    }
    // 5번 이미지와 동일한 감성 샘플 포스트 (다중 사진 캐러셀 지원)
    return [
      {
        id: 'sample-vlog-1',
        date: U.todaySeoul(),
        dayOfWeek: 'mon',
        title: 'Today is better than tomorrow.',
        // 다중 이미지 배열 (캐러셀 슬라이더 지원!)
        photos: [
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80'
        ],
        content: '내일이 오늘보다 좋지 않을 거라는 뜻이 아니라, 내일을 기다리는 대신 오늘을 살라는 말.\n\n# 평범한 일상을 특별히 소중하게 여기며 내일보다 좋은 오늘을 살아가고 싶다.\n# 일상을 대하는 태도가 결국 인생을 대하는 태도이다.\n<평일도 인생이니까 / 김신지>'
      }
    ];
  }

  function saveVlogEntries(list) {
    localStorage.setItem('pds_vlog_entries', JSON.stringify(list));
  }

  /* Supabase Storage 미디어 업로드 헬퍼 */
  async function uploadMediaToSupabase(file) {
    if (!file) return null;
    try {
      var ext = (file.name && file.name.split('.').pop()) || 'png';
      var cleanName = 'vlog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
      var res = await db.storage.from('vlog-media').upload(cleanName, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (res && res.data) {
        var pub = db.storage.from('vlog-media').getPublicUrl(cleanName);
        if (pub && pub.data && pub.data.publicUrl) {
          return pub.data.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Supabase storage upload fallback to dataURL:', err);
    }
    // Storage 버킷 미생성 시에도 끊김 없이 동작하도록 DataURL로 안전 폴백
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (evt) { resolve(evt.target.result); };
      reader.readAsDataURL(file);
    });
  }

  /* Supabase vlog_entries DB 및 로컬 동기화 */
  async function fetchVlogEntriesFromDb() {
    try {
      var res = await db.from('vlog_entries').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
      if (res && res.data && res.data.length > 0) {
        var mapped = res.data.map(function (it) {
          return {
            id: it.id,
            date: it.date,
            dayOfWeek: it.day_of_week || 'mon',
            title: it.title,
            photos: Array.isArray(it.photos) ? it.photos : [],
            content: it.content
          };
        });
        saveVlogEntries(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Supabase vlog_entries fetch fallback to local:', e);
    }
    return getVlogEntries();
  }

  async function persistVlogEntryToDb(entry) {
    try {
      var payload = {
        title: entry.title,
        date: entry.date,
        day_of_week: entry.dayOfWeek || 'mon',
        photos: entry.photos || [],
        content: entry.content
      };
      var isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.id);
      if (isUuid) {
        await db.from('vlog_entries').update(payload).eq('id', entry.id);
      } else {
        var res = await db.from('vlog_entries').insert(payload).select().single();
        if (res && res.data && res.data.id) {
          entry.id = res.data.id;
        }
      }
    } catch (e) {
      console.warn('Supabase vlog save fallback to local:', e);
    }
  }

  async function deleteVlogEntryFromDb(id) {
    try {
      var isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await db.from('vlog_entries').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Supabase vlog delete fallback to local:', e);
    }
  }

  function formatVlogDiaryText(rawText) {
    if (!rawText) return '';
    var lines = rawText.split('\n');
    var html = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) {
        html.push('<div class="vlog-line-gap"></div>');
        continue;
      }

      // 1) 해시태그 불릿 (# 문장 또는 ## 문장)
      var hashMatch = line.match(/^#+\s*(.+)$/);
      if (hashMatch) {
        html.push(
          '<div class="vlog-note-point">' +
          '<span class="note-hash">#</span>' +
          '<span class="note-text">' + U.esc(hashMatch[1]) + '</span>' +
          '</div>'
        );
        continue;
      }

      // 2) 리스트 불릿 (- 항목 또는 * 항목)
      var bulletMatch = line.match(/^[-*·]\s*(.+)$/);
      if (bulletMatch) {
        html.push(
          '<div class="vlog-note-point">' +
          '<span class="note-bullet">•</span>' +
          '<span class="note-text">' + U.esc(bulletMatch[1]) + '</span>' +
          '</div>'
        );
        continue;
      }

      // 3) 도서/출처 인용구 badge (<...> 또는 〈...〉 또는 《...》)
      var quoteMatch = line.match(/^[<〈《](.+)[>〉》]$/);
      if (quoteMatch) {
        html.push(
          '<div class="vlog-quote-badge">' +
          '<span class="quote-icon">' + Icons.bookmark(14) + '</span>' +
          '<span class="quote-text">〈' + U.esc(quoteMatch[1]) + '〉</span>' +
          '</div>'
        );
        continue;
      }

      // 4) 일반 문단 (word-break: keep-all, text-wrap: balance)
      html.push('<div class="vlog-paragraph">' + U.esc(line) + '</div>');
    }

    return html.join('');
  }

  async function loadVlog() {
    var el = document.getElementById('vlogList');
    if (!el) return;

    var list = await fetchVlogEntriesFromDb();
    if (!list || list.length === 0) {
      el.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">' + Icons.camera(36) + '</div>' +
        '<div class="empty-title">아직 작성된 사진·Vlog 일기가 없습니다</div>' +
        '<div class="empty-desc">오늘 하루의 소중한 순간들을 여러 장의 사진·영상과 함께 캐러셀 다이어리에 담아보세요.</div>' +
        '<button class="btn-primary" type="button" onclick="App.showNewVlogForm()">' +
        Icons.plus(16) + ' 첫 포토 일기 쓰기' +
        '</button>' +
        '</div>';
      return;
    }

    el.innerHTML = list.map(function (item) {
      var d = new Date(item.date);
      var monthNum = isNaN(d.getMonth()) ? '9' : String(d.getMonth() + 1);
      var dayNum = isNaN(d.getDate()) ? '27' : String(d.getDate());
      var dayStr = monthNum + ' / ' + dayNum;

      var daysOfWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      var activeDay = item.dayOfWeek || 'mon';
      var dayPillsHtml = daysOfWeek.map(function (dw) {
        var isCur = (dw === activeDay);
        return '<span class="vlog-dw-pill' + (isCur ? ' active' : '') + '">' + dw + '</span>';
      }).join(' ');

      // 다중 사진/영상 캐러셀 렌더링
      var rawPhotos = item.photos || (item.photoUrl ? [item.photoUrl] : []);
      var photos = rawPhotos.filter(function (p) { return typeof p === 'string' && p.trim().length > 0; });
      if (photos.length === 0) {
        photos = ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80'];
      }
      var hasMultiple = photos.length > 1;
      var curIdx = carouselStates[item.id] || 0;
      if (curIdx >= photos.length) curIdx = 0;

      var slidesHtml = photos.map(function (pUrl) {
        var isVideo = pUrl.includes('youtube.com') || pUrl.includes('youtu.be');
        return '<div class="carousel-slide">' +
          (isVideo
            ? '<iframe class="vlog-media-embed" src="' + U.esc(pUrl) + '" allowfullscreen></iframe>'
            : '<img class="vlog-photo-img" src="' + U.esc(pUrl) + '" alt="다이어리 사진" loading="lazy">') +
          '</div>';
      }).join('');

      var dotsHtml = photos.map(function (_, idx) {
        return '<button type="button" class="carousel-dot' + (idx === curIdx ? ' active' : '') + '" onclick="App.carouselGoTo(\'' + item.id + '\',' + idx + ')"></button>';
      }).join('');

      return '<div class="vlog-card" id="vlogCard_' + item.id + '">' +
        '<div class="vlog-tape"></div>' +
        '<div class="vlog-header-stamps">' +
        '<div class="vlog-dw-group">' + dayPillsHtml + '</div>' +
        '<div class="vlog-date-badge">' + dayStr + '</div>' +
        '</div>' +
        (photos.length > 0 ?
          '<div class="vlog-polaroid-frame">' +
          '<div class="vlog-carousel" data-id="' + item.id + '">' +
          '<div class="vlog-carousel-track" style="transform: translateX(-' + (curIdx * 100) + '%);">' +
          slidesHtml +
          '</div>' +
          (hasMultiple ?
            '<button type="button" class="carousel-nav-btn prev" onclick="App.carouselPrev(\'' + item.id + '\')">&lt;</button>' +
            '<button type="button" class="carousel-nav-btn next" onclick="App.carouselNext(\'' + item.id + '\')">&gt;</button>' +
            '<div class="carousel-dots-bar">' + dotsHtml + '</div>'
            : '') +
          '</div>' +
          '</div>' : '') +
        '<div class="vlog-doodle-flower">' + Icons.flower(22) + '</div>' +
        '<div class="vlog-hand-body">' +
        (item.title ? '<h3 class="vlog-title-hash"># ' + U.esc(item.title) + '</h3>' : '') +
        '<div class="vlog-text-content">' + formatVlogDiaryText(item.content) + '</div>' +
        '</div>' +
        '<div class="vlog-actions">' +
        '<button class="btn-outline btn-sm" type="button" onclick="App.editVlog(\'' + item.id + '\')">' +
        Icons.edit(13) + ' 일기 수정' +
        '</button>' +
        '<button class="btn-danger btn-sm" type="button" onclick="App.deleteVlog(\'' + item.id + '\')">' +
        Icons.trash(13) + ' 삭제' +
        '</button>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  function showVlogForm(existingItem) {
    var isEdit = !!existingItem;
    var photosText = (isEdit && existingItem.photos)
      ? existingItem.photos.filter(function (p) { return !p.startsWith('data:'); }).join('\n')
      : '';

    var html = '<form id="vlogForm">' +
      '<div class="form-tip-banner">' +
      Icons.camera(16) + ' <span>사진이나 영상을 여러 개 선택하면 폴라로이드 <strong>캐러셀 슬라이더</strong>로 만들어집니다.</span>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>일기 제목 (한 줄 문구)</label>' +
      '<input class="input" name="title" value="' + (isEdit ? U.esc(existingItem.title) : '') + '" placeholder="예: Today is better than tomorrow." required>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label>날짜</label>' +
      '<input class="input" type="date" name="date" value="' + (isEdit ? existingItem.date : U.todaySeoul()) + '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>요일 스탬프</label>' +
      '<div class="select-wrapper">' +
      '<select class="select" name="dayOfWeek">' +
      '<option value="mon"' + (isEdit && existingItem.dayOfWeek === 'mon' ? ' selected' : '') + '>월요일 (mon)</option>' +
      '<option value="tue"' + (isEdit && existingItem.dayOfWeek === 'tue' ? ' selected' : '') + '>화요일 (tue)</option>' +
      '<option value="wed"' + (isEdit && existingItem.dayOfWeek === 'wed' ? ' selected' : '') + '>수요일 (wed)</option>' +
      '<option value="thu"' + (isEdit && existingItem.dayOfWeek === 'thu' ? ' selected' : '') + '>목요일 (thu)</option>' +
      '<option value="fri"' + (isEdit && existingItem.dayOfWeek === 'fri' ? ' selected' : '') + '>금요일 (fri)</option>' +
      '<option value="sat"' + (isEdit && existingItem.dayOfWeek === 'sat' ? ' selected' : '') + '>토요일 (sat)</option>' +
      '<option value="sun"' + (isEdit && existingItem.dayOfWeek === 'sun' ? ' selected' : '') + '>일요일 (sun)</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>다중 사진 파일 올리기 (여러 개 선택 가능)</label>' +
      '<input class="input" type="file" id="vlogFileInput" multiple accept="image/*,video/*">' +
      '<span style="font-size:12.5px;color:var(--text3);display:block;margin-top:4px">Ctrl 키를 누른 채 여러 장의 사진을 선택하면 캐러셀 슬라이더로 만들어집니다.</span>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>또는 사진 / 영상 링크 (여러 개일 경우 한 줄에 하나씩 입력)</label>' +
      '<textarea class="textarea" name="photoUrlsText" style="min-height:65px" placeholder="https://image1.jpg&#10;https://image2.jpg&#10;https://www.youtube.com/embed/...">' + U.esc(photosText) + '</textarea>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>손글씨 다이어리 일기 내용</label>' +
      '<textarea class="textarea" name="content" style="min-height:115px" placeholder="오늘 느낀 생각, 기억하고 싶은 순간을 다이어리에 적어보세요." required>' + (isEdit ? U.esc(existingItem.content) : '') + '</textarea>' +
      '<span style="font-size:12.5px;color:var(--text3);display:block;margin-top:4px">💡 <strong># 문장</strong>으로 입력하면 강조 포인트 목록으로, <strong>&lt;책 제목 / 저자&gt;</strong>로 입력하면 인용구 뱃지로 자동 변환되어 가독성이 높아집니다.</span>' +
      '</div>' +
      '<button type="submit" class="btn-primary btn-submit">' +
      (isEdit ? Icons.save(16) + ' 수정 내용 저장하기' : Icons.save(16) + ' 캐러셀 다이어리에 붙이기') +
      '</button></form>';

    openModal(isEdit ? '사진 · Vlog 일기 수정' : '새 사진 · Vlog 일기 쓰기', html);

    var form = document.getElementById('vlogForm');
    if (form) {
      form.onsubmit = async function (e) {
        e.preventDefault();
        var fd = new FormData(this);
        var title = fd.get('title');
        var date = fd.get('date');
        var dayOfWeek = fd.get('dayOfWeek');
        var content = fd.get('content');
        var urlsText = fd.get('photoUrlsText') || '';

        var photos = urlsText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);

        var uploadedFileUrls = [];
        var fileInput = document.getElementById('vlogFileInput');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          var files = Array.from(fileInput.files);
          var uploadPromises = files.map(function (file) {
            return uploadMediaToSupabase(file);
          });
          uploadedFileUrls = (await Promise.all(uploadPromises)).filter(Boolean);
        }

        var entryId = (form.dataset.editId) || ('vlog-' + Date.now());
        var existingPhotos = [];
        if (form.dataset.editId) {
          var oldEntry = getVlogEntries().find(function (it) { return it.id === form.dataset.editId; });
          if (oldEntry && oldEntry.photos) {
            existingPhotos = oldEntry.photos.filter(function (p) { return p && (p.startsWith('http') || p.startsWith('data:')); });
          }
        }

        var allPhotos = photos.concat(existingPhotos).concat(uploadedFileUrls).filter(Boolean);
        if (allPhotos.length === 0) {
          allPhotos = ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'];
        }

        var entry = {
          id: entryId,
          date: date,
          dayOfWeek: dayOfWeek,
          title: title,
          photos: allPhotos,
          content: content
        };

        // 1. Supabase DB 영구 저장
        await persistVlogEntryToDb(entry);

        // 2. 로컬 캐시 동기화
        var list = getVlogEntries();
        if (form.dataset.editId) {
          var idx = list.findIndex(function (it) { return it.id === form.dataset.editId; });
          if (idx !== -1) list[idx] = entry;
          else list.unshift(entry);
        } else {
          list.unshift(entry);
        }
        saveVlogEntries(list);
        U.toast(form.dataset.editId ? '포토 일기가 수정되었습니다.' : '다중 캐러셀 다이어리 일기가 저장되었습니다.', 'success');
        closeModal();
        await loadVlog();
        if (currentTab === 'calendar') loadCalendar();
      };
    }
  }

  /* ========== 할 일 목록 ========== */
  async function loadTodos() {
    var el = document.getElementById('todosList');
    if (!el) return;

    if (!selectedPlanId) {
      el.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">' + Icons.target(36) + '</div>' +
        '<div class="empty-title">선택된 계획이 없습니다</div>' +
        '<div class="empty-desc">먼저 [계획] 탭에서 계획을 만들거나 상단에서 계획을 선택해주세요.</div>' +
        '<button class="btn-primary" type="button" onclick="App.switchTab(\'plans\')">' +
        Icons.arrowRight(16) + ' 계획 만들러 가기' +
        '</button>' +
        '</div>';
      return;
    }

    var sel = document.getElementById('planSelect');
    if (sel && sel.value) selectedPlanId = sel.value;

    var opts = {
      search: (document.getElementById('todoSearch') || {}).value || '',
      status: (document.getElementById('todoStatusFilter') || {}).value || 'all',
      priority: (document.getElementById('todoPriorityFilter') || {}).value || 'all',
      sort: (document.getElementById('todoSort') || {}).value || 'created_desc'
    };

    var sortLabels = { created_desc: '최신순', created_asc: '오래된순', due: '마감일순', priority: '우선순위순' };
    var sortInfoEl = document.getElementById('sortInfo');
    if (sortInfoEl) {
      sortInfoEl.innerHTML = Icons.filter(12) + ' 정렬 기준: <strong>' + (sortLabels[opts.sort] || '최신순') + '</strong>';
    }

    try {
      var todos = await Todos.listByPlan(selectedPlanId, opts);

      if (!todos || todos.length === 0) {
        el.innerHTML = '<div class="empty-state">' +
          '<div class="empty-icon">' + Icons.check(36) + '</div>' +
          '<div class="empty-title">할 일이 없습니다</div>' +
          '<div class="empty-desc">해당 계획에 등록된 할 일이 없거나 검색 조건과 일치하는 할 일이 없습니다.</div>' +
          '<button class="btn-primary" type="button" onclick="App.showNewTodoForm()">' +
          Icons.plus(16) + ' 새 할 일 추가하기' +
          '</button>' +
          '</div>';
        return;
      }

      el.innerHTML = todos.map(function (t) {
        var isDone = t.status === '완료';
        return '<div class="card' + (isDone ? ' card-done' : '') + '">' +
          '<div class="card-header-line">' +
          '<div class="card-title' + (isDone ? ' title-done' : '') + '">' +
          (isDone ? '<span class="done-check-icon">' + Icons.check(14) + '</span>' : '') +
          U.esc(t.title) +
          '</div>' +
          '<div class="card-badges">' + priorityBadge(t.priority) + statusBadge(t.status) + '</div>' +
          '</div>' +
          '<div class="card-meta">' +
          (t.due_date ? '<span class="meta-date">' + Icons.calendar(13) + '마감: ' + U.formatDate(t.due_date) + '</span>' : '') +
          (t.tag ? '<span class="meta-tag">' + Icons.tag(13) + '<span class="badge badge-tag">' + U.esc(t.tag) + '</span></span>' : '') +
          '<span class="meta-hours">' + Icons.clock(13) + '예상 ' + (t.estimated_hours || 0) + 'h</span>' +
          '</div>' +
          '<div class="card-actions">' +
          (isDone
            ? '<button class="btn-revert" type="button" onclick="App.revertTodo(\'' + t.id + '\')">' + Icons.rotateCcw(14) + ' 진행 중으로 되돌리기</button>'
            : '<button class="btn-complete" type="button" onclick="App.completeTodo(\'' + t.id + '\')">' + Icons.check(14) + ' 완료 처리</button>') +
          '<button class="btn-outline" type="button" onclick="App.addRecord(\'' + t.id + '\')">' + Icons.play(13) + ' 실행 기록</button>' +
          '<button class="btn-outline" type="button" onclick="App.editTodo(\'' + t.id + '\')">' + Icons.edit(13) + ' 수정</button>' +
          '<button class="btn-danger" type="button" onclick="App.confirmDeleteTodo(\'' + t.id + '\',\'' + U.esc(t.title) + '\')">' + Icons.trash(13) + ' 삭제</button>' +
          '</div></div>';
      }).join('');
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="empty-state error"><p>할 일을 불러오지 못했습니다: ' + U.esc(err.message) + '</p></div>';
    }
  }

  /* ========== 할 일 폼 (생성/수정) ========== */
  function showTodoForm(todo, defaultDate) {
    var isEdit = !!todo;
    var dDate = defaultDate || (todo ? U.formatDateInput(todo.due_date) : U.daysFromToday(7));

    var html = '<form id="todoForm">' +
      '<div class="form-group">' +
      '<label>할 일 이름</label>' +
      '<input class="input" name="title" value="' + (todo ? U.esc(todo.title) : '') + '" placeholder="예: 챕터 1 핵심 요약 정리" required>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label>마감일</label>' +
      '<input class="input" type="date" name="due_date" value="' + dDate + '">' +
      '</div>' +
      '<div class="form-group">' +
      '<label>우선순위</label>' +
      '<div class="select-wrapper">' +
      '<select class="select" name="priority">' +
      '<option value="높음"' + (todo && todo.priority === '높음' ? ' selected' : '') + '>높음</option>' +
      '<option value="보통"' + (!todo || todo.priority === '보통' ? ' selected' : '') + '>보통</option>' +
      '<option value="낮음"' + (todo && todo.priority === '낮음' ? ' selected' : '') + '>낮음</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label>태그 (분류)</label>' +
      '<input class="input" name="tag" value="' + (todo ? U.esc(todo.tag || '') : '') + '" placeholder="예: 개발, 기획, 공부">' +
      '</div>' +
      '<div class="form-group">' +
      '<label>예상 시간 (h)</label>' +
      '<input class="input" type="number" name="estimated_hours" step="0.5" min="0" value="' + (todo ? todo.estimated_hours : 0) + '">' +
      '</div>' +
      '</div>' +
      '<button type="submit" class="btn-primary btn-submit">' +
      (isEdit ? Icons.save(16) + ' 할 일 수정' : Icons.plus(16) + ' 할 일 추가') +
      '</button></form>';

    openModal(isEdit ? '할 일 수정' : '새 할 일 추가', html);

    var form = document.getElementById('todoForm');
    if (form) {
      form.onsubmit = async function (e) {
        e.preventDefault();
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        var fd = new FormData(this);
        var data = Object.fromEntries(fd);
        data.plan_id = selectedPlanId;

        try {
          if (isEdit) {
            await Todos.update(todo.id, data);
            U.toast('할 일이 수정되었습니다.', 'success');
          } else {
            await Todos.create(data);
            U.toast('할 일이 추가되었습니다.', 'success');
          }
          closeModal();
          if (currentTab === 'calendar') loadCalendar();
          else loadTodos();
        } catch (err) {
          console.error(err);
          U.toast('할 일 저장 중 오류가 발생했습니다: ' + err.message, 'error');
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }
  }

  /* ========== 실행 기록 목록 ========== */
  async function loadRecords() {
    var el = document.getElementById('recordsList');
    if (!el) return;

    if (!selectedPlanId) {
      el.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">' + Icons.clock(36) + '</div>' +
        '<div class="empty-title">선택된 계획이 없습니다</div>' +
        '<div class="empty-desc">상단에서 계획을 선택하거나 새 계획을 먼저 만들어주세요.</div>' +
        '</div>';
      return;
    }

    var sel = document.getElementById('recordPlanSelect');
    if (sel && sel.value) selectedPlanId = sel.value;

    try {
      var todos = await Todos.listByPlan(selectedPlanId, {});

      if (!todos || todos.length === 0) {
        el.innerHTML = '<div class="empty-state">' +
          '<div class="empty-icon">' + Icons.list(36) + '</div>' +
          '<div class="empty-title">할 일이 없습니다</div>' +
          '<div class="empty-desc">실행 기록을 남기려면 먼저 [할 일] 탭에서 할 일을 만들어주세요.</div>' +
          '<button class="btn-primary" type="button" onclick="App.switchTab(\'todos\')">' +
          Icons.arrowRight(16) + ' 할 일 만들러 가기' +
          '</button>' +
          '</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < todos.length; i++) {
        var t = todos[i];
        var recs = await Records.listByTodo(t.id);
        var totalHours = recs.reduce(function (acc, cur) { return acc + (parseFloat(cur.actual_hours) || 0); }, 0);
        totalHours = Math.round(totalHours * 10) / 10;

        html += '<div class="card">' +
          '<div class="card-header-line">' +
          '<div class="card-title">' + U.esc(t.title) + '</div>' +
          '<div class="card-badges">' +
          statusBadge(t.status) +
          '<span class="badge badge-mid">' + Icons.clock(12) + '누적 ' + totalHours + 'h</span>' +
          '</div>' +
          '</div>';

        if (recs.length === 0) {
          html += '<p class="no-records-msg">' + Icons.info(13) + ' 아직 실행 기록이 없습니다.</p>';
        } else {
          html += '<div class="records-sub-list">';
          for (var j = 0; j < recs.length; j++) {
            var r = recs[j];
            html += '<div class="history-item record-item">' +
              '<div class="record-info">' +
              '<span class="record-time">' + Icons.clock(13) + ' <strong>' + U.formatDateTime(r.started_at) + '</strong> ~ ' + U.formatDateTime(r.ended_at) + '</span>' +
              '<span class="record-hours badge badge-tag">' + r.actual_hours + '시간 소요</span>' +
              (r.blocker ? '<div class="record-blocker">' + Icons.alertCircle(13) + ' <strong>막힌 이유:</strong> ' + U.esc(r.blocker) + '</div>' : '') +
              '</div>' +
              '<button class="btn-icon-danger" type="button" title="기록 삭제" onclick="App.confirmDeleteRecord(\'' + r.id + '\')">' +
              Icons.trash(14) +
              '</button>' +
              '</div>';
          }
          html += '</div>';
        }

        html += '<div class="card-actions">' +
          '<button class="btn-outline" type="button" onclick="App.addRecord(\'' + t.id + '\')">' +
          Icons.play(13) + ' 실행 기록 추가' +
          '</button>' +
          '</div></div>';
      }

      el.innerHTML = html;
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="empty-state error"><p>실행 기록을 불러오지 못했습니다: ' + U.esc(err.message) + '</p></div>';
    }
  }

  /* ========== 실행 기록 추가 폼 ========== */
  function showRecordForm(todoId) {
    var nowD = new Date();
    var oneHourAgo = new Date(nowD.getTime() - 60 * 60 * 1000);
    var startVal = U.nowLocalInput(oneHourAgo);
    var endVal = U.nowLocalInput(nowD);

    var html = '<form id="recordForm">' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label>시작 시각</label>' +
      '<input class="input" type="datetime-local" name="started_at" value="' + startVal + '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>끝난 시각</label>' +
      '<input class="input" type="datetime-local" name="ended_at" value="' + endVal + '" required>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>막혔던 이유 (선택 사항)</label>' +
      '<textarea class="textarea" name="blocker" placeholder="작업 도중 예상치 못하게 지연되었거나 막혔던 이유가 있다면 기록해주세요."></textarea>' +
      '</div>' +
      '<button type="submit" class="btn-primary btn-submit">' +
      Icons.save(16) + ' 기록 저장' +
      '</button></form>';

    openModal('실행 기록 남기기', html);

    var form = document.getElementById('recordForm');
    if (form) {
      form.onsubmit = async function (e) {
        e.preventDefault();
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        var fd = new FormData(this);
        var data = Object.fromEntries(fd);
        data.todo_id = todoId;

        try {
          await Records.create(data);
          U.toast('실행 기록이 안전하게 저장되었습니다.', 'success');
          closeModal();
          if (currentTab === 'records') loadRecords();
          if (currentTab === 'todos') loadTodos();
        } catch (err) {
          console.error(err);
          U.toast(err.message || '실행 기록 저장 중 오류가 발생했습니다.', 'error');
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }
  }

  /* ========== 돌아보기 대시보드 ========== */
  async function loadReview() {
    var dashEl = document.getElementById('reviewDash');
    var naEl = document.getElementById('nextActionArea');
    var drillEl = document.getElementById('drillDownArea');
    if (!dashEl) return;

    if (!selectedPlanId) {
      dashEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">' +
        '<div class="empty-icon">' + Icons.target(36) + '</div>' +
        '<div class="empty-title">선택된 계획이 없습니다</div>' +
        '<div class="empty-desc">상단에서 분석할 계획을 선택해주세요.</div>' +
        '</div>';
      if (naEl) naEl.innerHTML = '';
      if (drillEl) { drillEl.hidden = true; drillEl.innerHTML = ''; }
      return;
    }

    var sel = document.getElementById('reviewPlanSelect');
    if (sel && sel.value) selectedPlanId = sel.value;

    try {
      var d = await Review.compute(selectedPlanId);
      var plan = await Plans.get(selectedPlanId);

      var diffClass = d.diffHours > 0 ? 'negative' : d.diffHours < 0 ? 'positive' : '';
      var diffSign = d.diffHours > 0 ? '+' : '';

      dashEl.innerHTML =
        dashCard('total', '전체 할 일', d.total, '', Icons.list(20)) +
        dashCard('completed', '완료된 일', d.completed, 'positive', Icons.check(20)) +
        dashCard('delayed', '마감 지연', d.delayed, d.delayed > 0 ? 'negative' : '', Icons.alertCircle(20)) +
        dashCard('blocked', '막힘 발생', d.blocked, d.blocked > 0 ? 'negative' : '', Icons.flag(20)) +
        '<div class="dash-card"><div class="dash-card-header">' + Icons.clock(18) + '<span class="dash-label">예상 시간</span></div><div class="dash-num">' + d.estHours + 'h</div></div>' +
        '<div class="dash-card"><div class="dash-card-header">' + Icons.play(18) + '<span class="dash-label">실제 실행 시간</span></div><div class="dash-num">' + d.actHours + 'h</div></div>' +
        '<div class="dash-card ' + diffClass + '"><div class="dash-card-header">' + Icons.history(18) + '<span class="dash-label">시간 오차</span></div><div class="dash-num">' + diffSign + d.diffHours + 'h</div></div>';

      /* 다음 계획으로 넘길 한 줄 (C33) */
      if (naEl) {
        naEl.innerHTML = '<div class="next-action-header">' +
          Icons.arrowRight(18) +
          '<h3>다음 계획으로 넘길 한 줄 피드백</h3>' +
          '</div>' +
          '<p class="next-action-guide">이번 계획의 실행 결과를 돌아보고, 다음 계획에 반영할 개선점이나 인사이트를 남겨보세요.</p>' +
          '<form id="nextActionForm" class="next-action-form">' +
          '<input class="input" name="next_action" value="' + U.esc(plan && plan.next_action || '') + '" placeholder="예: 예상보다 자료조사에 시간이 더 걸리므로 리서치 시간을 20% 더 확보할 것">' +
          '<button type="submit" class="btn-primary">' + Icons.save(14) + ' 저장</button>' +
          '</form>';

        var naForm = document.getElementById('nextActionForm');
        if (naForm) {
          naForm.onsubmit = async function (e) {
            e.preventDefault();
            var val = new FormData(this).get('next_action');
            try {
              await Plans.setNextAction(selectedPlanId, val);
              U.toast('다음 계획 피드백이 저장되었습니다.', 'success');
            } catch (err) {
              U.toast('저장 실패: ' + err.message, 'error');
            }
          };
        }
      }

      /* 드릴다운 이벤트 */
      document.querySelectorAll('.dash-card[data-type]').forEach(function (card) {
        card.onclick = async function () {
          var type = card.dataset.type;
          var items = await Review.drillDown(selectedPlanId, type);
          var label = card.querySelector('.dash-label').textContent;

          if (drillEl) {
            drillEl.hidden = false;
            drillEl.innerHTML = '<div class="drilldown-header">' +
              '<h3>' + Icons.list(16) + ' "' + U.esc(label) + '" 세부 항목 (' + items.length + '건)</h3>' +
              '<button class="btn-outline btn-sm" type="button" onclick="App.closeDrillDown()">' + Icons.x(14) + ' 닫기</button>' +
              '</div>' +
              (items.length === 0
                ? '<p class="empty-drilldown">해당 조건에 해당하는 할 일이 없습니다.</p>'
                : items.map(function (t) {
                  return '<div class="card">' +
                    '<div class="card-header-line">' +
                    '<div class="card-title">' + U.esc(t.title) + '</div>' +
                    '<div class="card-badges">' + priorityBadge(t.priority) + statusBadge(t.status) + '</div>' +
                    '</div>' +
                    '<div class="card-meta">' +
                    (t.due_date ? '<span class="meta-date">' + Icons.calendar(13) + '마감: ' + U.formatDate(t.due_date) + '</span>' : '') +
                    '<span class="meta-hours">' + Icons.clock(13) + '예상 ' + (t.estimated_hours || 0) + 'h</span>' +
                    '</div></div>';
                }).join(''));

            drillEl.scrollIntoView({ behavior: 'smooth' });
          }
        };
      });
    } catch (err) {
      console.error(err);
      dashEl.innerHTML = '<div class="empty-state error"><p>돌아보기 데이터를 분석하지 못했습니다: ' + U.esc(err.message) + '</p></div>';
    }
  }

  function dashCard(type, label, value, cls, icon) {
    return '<div class="dash-card ' + (cls || '') + '" data-type="' + type + '" title="클릭하여 세부 내역 보기">' +
      '<div class="dash-card-header">' +
      (icon || '') +
      '<span class="dash-label">' + label + '</span>' +
      '</div>' +
      '<div class="dash-num">' + value + '</div>' +
      '<div class="dash-hint">자세히 보기 &rarr;</div>' +
      '</div>';
  }

  /* ========== 공통 유틸 및 뱃지 ========== */
  function priorityBadge(p) {
    var cls = p === '높음' ? 'badge-high' : p === '낮음' ? 'badge-low' : 'badge-mid';
    return '<span class="badge ' + cls + '">' + Icons.flag(12) + ' ' + U.esc(p) + '</span>';
  }

  function statusBadge(s) {
    var cls = s === '완료' ? 'badge-done' : s === '보류' ? 'badge-pending' : 'badge-progress';
    var icon = s === '완료' ? Icons.check(12) : s === '보류' ? Icons.alertCircle(12) : Icons.clock(12);
    return '<span class="badge ' + cls + '">' + icon + ' ' + U.esc(s) + '</span>';
  }

  /* ========== 전역 API ========== */
  window.App = {
    showNewPlanForm: function () { showPlanForm(); },
    showNewTodoForm: function () {
      if (!selectedPlanId) {
        U.toast('먼저 계획을 선택하거나 생성해주세요.', 'error');
        return;
      }
      showTodoForm();
    },
    showNewVlogForm: function () { showVlogForm(); },
    openCalDateAdd: function (dateStr) {
      if (!selectedPlanId) {
        U.toast('일정을 등록할 계획을 먼저 선택해주세요.', 'info');
      }
      showTodoForm(null, dateStr);
    },
    closeDrillDown: function () {
      var d = document.getElementById('drillDownArea');
      if (d) { d.hidden = true; d.innerHTML = ''; }
    },
    switchTab: switchTab,
    editPlan: async function (id) {
      try {
        var p = await Plans.get(id);
        if (p) showPlanForm(p);
      } catch (err) {
        U.toast('계획 정보를 불러오지 못했습니다: ' + err.message, 'error');
      }
    },
    confirmDeletePlan: function (id, title) {
      var html = '<div class="confirm-modal-box">' +
        '<div class="confirm-icon">' + Icons.trash(32) + '</div>' +
        '<p class="confirm-text"><strong>"' + U.esc(title) + '"</strong> 계획을 정말 삭제할까요?<br><span class="confirm-sub">연결된 모든 할 일과 실행 기록이 함께 영구 삭제됩니다.</span></p>' +
        '<div class="confirm-buttons">' +
        '<button class="btn-danger" type="button" onclick="App.executeDeletePlan(\'' + id + '\')">' + Icons.trash(14) + ' 완전히 삭제</button>' +
        '<button class="btn-outline" type="button" onclick="App.closeModal()">' + Icons.x(14) + ' 취소</button>' +
        '</div>' +
        '</div>';
      openModal('계획 삭제 확인', html);
    },
    executeDeletePlan: async function (id) {
      try {
        await Plans.remove(id);
        U.toast('계획이 안전하게 삭제되었습니다.', 'success');
        if (selectedPlanId === id) selectedPlanId = null;
        closeModal();
        loadPlans();
        if (currentTab === 'calendar') loadCalendar();
      } catch (err) {
        console.error(err);
        U.toast('계획 삭제 실패: ' + err.message, 'error');
      }
    },
    viewHistory: async function (id) {
      try {
        var hist = await Plans.getHistory(id);
        var html = hist.length === 0
          ? '<div class="empty-state"><div class="empty-desc">수정 이력이 없습니다.</div></div>'
          : hist.map(function (h) {
            return '<div class="history-item">' +
              '<div class="history-header">' +
              Icons.clock(13) + ' <strong>' + U.formatDateTime(h.changed_at) + '</strong> 수정' +
              '</div>' +
              '<div class="history-content">' +
              '<div><strong>제목:</strong> ' + U.esc(h.title) + '</div>' +
              '<div><strong>기간:</strong> ' + U.formatDate(h.start_date) + ' ~ ' + U.formatDate(h.end_date) + '</div>' +
              '<div><strong>우선순위:</strong> ' + h.priority + ' | <strong>예상시간:</strong> ' + h.estimated_hours + 'h</div>' +
              '<div><strong>성공 기준:</strong> ' + U.esc(h.success_criteria) + '</div>' +
              (h.change_reason ? '<div class="history-reason">' + Icons.alertCircle(12) + ' <strong>수정 이유:</strong> ' + U.esc(h.change_reason) + '</div>' : '') +
              '</div></div>';
          }).join('');
        openModal('계획 수정 이력', html);
      } catch (err) {
        U.toast('이력을 불러오지 못했습니다: ' + err.message, 'error');
      }
    },
    selectAndGo: function (planId, tab) {
      selectedPlanId = planId;
      syncPlanSelects(planId);
      switchTab(tab);
    },
    editTodo: async function (id) {
      try {
        var res = await db.from('todos').select('*').eq('id', id).single();
        if (res.data) showTodoForm(res.data);
      } catch (err) {
        U.toast('할 일 정보를 불러오지 못했습니다: ' + err.message, 'error');
      }
    },
    completeTodo: async function (id) {
      try {
        await Todos.complete(id);
        U.toast('할 일이 완료되었습니다.', 'success');
        if (currentTab === 'calendar') loadCalendar();
        else loadTodos();
      } catch (err) {
        U.toast('완료 처리 실패: ' + err.message, 'error');
      }
    },
    revertTodo: async function (id) {
      try {
        await Todos.revert(id);
        U.toast('진행 중으로 되돌렸습니다.', 'success');
        if (currentTab === 'calendar') loadCalendar();
        else loadTodos();
      } catch (err) {
        U.toast('되돌리기 실패: ' + err.message, 'error');
      }
    },
    confirmDeleteTodo: function (id, title) {
      var html = '<div class="confirm-modal-box">' +
        '<div class="confirm-icon">' + Icons.trash(32) + '</div>' +
        '<p class="confirm-text"><strong>"' + U.esc(title) + '"</strong> 할 일을 삭제할까요?<br><span class="confirm-sub">관련된 실행 기록도 함께 삭제됩니다.</span></p>' +
        '<div class="confirm-buttons">' +
        '<button class="btn-danger" type="button" onclick="App.executeDeleteTodo(\'' + id + '\')">' + Icons.trash(14) + ' 삭제하기</button>' +
        '<button class="btn-outline" type="button" onclick="App.closeModal()">' + Icons.x(14) + ' 취소</button>' +
        '</div>' +
        '</div>';
      openModal('할 일 삭제 확인', html);
    },
    executeDeleteTodo: async function (id) {
      try {
        await Todos.remove(id);
        U.toast('할 일이 삭제되었습니다.', 'success');
        closeModal();
        if (currentTab === 'calendar') loadCalendar();
        else loadTodos();
      } catch (err) {
        U.toast('할 일 삭제 실패: ' + err.message, 'error');
      }
    },
    addRecord: function (todoId) {
      showRecordForm(todoId);
    },
    confirmDeleteRecord: function (recordId) {
      var html = '<div class="confirm-modal-box">' +
        '<div class="confirm-icon">' + Icons.trash(32) + '</div>' +
        '<p class="confirm-text">이 실행 기록을 삭제하시겠습니까?</p>' +
        '<div class="confirm-buttons">' +
        '<button class="btn-danger" type="button" onclick="App.executeDeleteRecord(\'' + recordId + '\')">' + Icons.trash(14) + ' 삭제</button>' +
        '<button class="btn-outline" type="button" onclick="App.closeModal()">' + Icons.x(14) + ' 취소</button>' +
        '</div>' +
        '</div>';
      openModal('기록 삭제 확인', html);
    },
    executeDeleteRecord: async function (recordId) {
      try {
        await Records.remove(recordId);
        U.toast('실행 기록이 삭제되었습니다.', 'success');
        closeModal();
        loadRecords();
      } catch (err) {
        U.toast('실행 기록 삭제 실패: ' + err.message, 'error');
      }
    },
    editVlog: function (id) {
      var list = getVlogEntries();
      var item = list.find(function (it) { return it.id === id; });
      if (item) {
        showVlogForm(item);
        var form = document.getElementById('vlogForm');
        if (form) form.dataset.editId = item.id;
      }
    },
    deleteVlog: async function (id) {
      await deleteVlogEntryFromDb(id);
      var list = getVlogEntries().filter(function (it) { return it.id !== id; });
      saveVlogEntries(list);
      U.toast('포토 일기가 삭제되었습니다.', 'success');
      await loadVlog();
      if (currentTab === 'calendar') loadCalendar();
    },
    /* 캐러셀 네비게이션 */
    carouselNext: function (id) {
      var list = getVlogEntries();
      var item = list.find(function (it) { return it.id === id; });
      if (!item) return;
      var photos = item.photos || (item.photoUrl ? [item.photoUrl] : []);
      var curIdx = carouselStates[id] || 0;
      curIdx = (curIdx + 1) % photos.length;
      carouselStates[id] = curIdx;
      App.updateCarouselUI(id, curIdx, photos.length);
    },
    carouselPrev: function (id) {
      var list = getVlogEntries();
      var item = list.find(function (it) { return it.id === id; });
      if (!item) return;
      var photos = item.photos || (item.photoUrl ? [item.photoUrl] : []);
      var curIdx = carouselStates[id] || 0;
      curIdx = (curIdx - 1 + photos.length) % photos.length;
      carouselStates[id] = curIdx;
      App.updateCarouselUI(id, curIdx, photos.length);
    },
    carouselGoTo: function (id, idx) {
      carouselStates[id] = idx;
      var list = getVlogEntries();
      var item = list.find(function (it) { return it.id === id; });
      var total = item && item.photos ? item.photos.length : 1;
      App.updateCarouselUI(id, idx, total);
    },
    updateCarouselUI: function (id, idx, total) {
      var card = document.getElementById('vlogCard_' + id);
      if (!card) return;
      var track = card.querySelector('.vlog-carousel-track');
      if (track) {
        track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      }
      var dots = card.querySelectorAll('.carousel-dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
    },
    openVlogFromCal: function (vlogId) {
      switchTab('vlog');
      setTimeout(function () {
        var card = document.getElementById('vlogCard_' + vlogId);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
          card.style.boxShadow = '0 0 0 4px var(--accent), 0 12px 35px rgba(184, 92, 57, 0.25)';
          card.style.transform = 'scale(1.02)';
          setTimeout(function () {
            card.style.boxShadow = '';
            card.style.transform = '';
          }, 2000);
        }
      }, 250);
    },
    closeModal: closeModal
  };
})();
