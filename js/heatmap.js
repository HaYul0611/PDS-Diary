/* === heatmap.js — 실천 잔디밭 & 월간 실천 현황 (Habit Tracker) 모듈 === */

var Heatmap = (function () {
  var currentViewMode = localStorage.getItem('pds_heatmap_view') || 'month'; /* 'month' | 'grass' */

  function formatDateKey(d) {
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function ensureTooltip() {
    var tip = document.getElementById('heatmapGlobalTooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'heatmapGlobalTooltip';
      tip.className = 'heatmap-tooltip';
      document.body.appendChild(tip);
    }
    return tip;
  }

  async function render(containerId, planId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    /* 1. Supabase에서 실행 기록(records) 및 완료 할 일(todos) 집계 */
    var dailyHours = {};
    var dailyDoneCount = {};

    try {
      var recsQuery = db.from('records').select('started_at, actual_hours');
      var todosQuery = db.from('todos').select('id, completed_at, plan_id');

      if (planId) {
        var planTodos = (await db.from('todos').select('id').eq('plan_id', planId)).data || [];
        var todoIds = planTodos.map(function (t) { return t.id; });
        if (todoIds.length > 0) {
          recsQuery = recsQuery.in('todo_id', todoIds);
          todosQuery = todosQuery.eq('plan_id', planId);
        }
      }

      var recsRes = await recsQuery;
      var recsData = recsRes.data || [];
      for (var r = 0; r < recsData.length; r++) {
        var rec = recsData[r];
        if (!rec.started_at) continue;
        var dateKey = rec.started_at.substring(0, 10);
        var hrs = parseFloat(rec.actual_hours) || 0;
        dailyHours[dateKey] = (dailyHours[dateKey] || 0) + hrs;
      }

      var todosRes = await todosQuery;
      var todosData = todosRes.data || [];
      for (var t = 0; t < todosData.length; t++) {
        var td = todosData[t];
        if (td.completed_at) {
          var doneKey = td.completed_at.substring(0, 10);
          dailyDoneCount[doneKey] = (dailyDoneCount[doneKey] || 0) + 1;
        }
      }
    } catch (e) {
      console.warn('실천 데이터 로드 중 경고:', e);
    }

    /* 2. 스트릭 및 누적 지표 계산 */
    var totalLoggedHours = 0;
    var currentStreak = 0;
    var maxStreak = 0;
    var tempStreak = 0;

    var yearStart = new Date(today.getFullYear(), 0, 1);
    var checkDate = new Date(yearStart);
    while (checkDate <= today) {
      var k = formatDateKey(checkDate);
      var h = dailyHours[k] || 0;
      totalLoggedHours += h;

      if (h > 0 || (dailyDoneCount[k] && dailyDoneCount[k] > 0)) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    /* 현재 스트릭 역산 */
    var cursor = new Date(today);
    var todayKey = formatDateKey(cursor);
    if (!dailyHours[todayKey] && (!dailyDoneCount[todayKey] || dailyDoneCount[todayKey] === 0)) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (true) {
      var ck = formatDateKey(cursor);
      if (dailyHours[ck] > 0 || (dailyDoneCount[ck] && dailyDoneCount[ck] > 0)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    /* 3. 뷰 모드별 HTML 생성 */
    var bodyHtml = '';

    if (currentViewMode === 'month') {
      /* [뷰 1] 해당 달(이번 달) 실천 캘린더 그리드 */
      var curYear = today.getFullYear();
      var curMonth = today.getMonth(); /* 0~11 */
      var firstDayOfMonth = new Date(curYear, curMonth, 1);
      var lastDateOfMonth = new Date(curYear, curMonth + 1, 0).getDate();
      var startDayOfWeek = firstDayOfMonth.getDay(); /* 0(일) ~ 6(토) */

      var monthCellsHtml = '';

      /* 시작 요일 이전 빈 칸 패딩 */
      for (var p = 0; p < startDayOfWeek; p++) {
        monthCellsHtml += '<div class="month-day-cell empty-pad"></div>';
      }

      /* 1일부터 마지막 날까지 채우기 */
      for (var day = 1; day <= lastDateOfMonth; day++) {
        var dayDate = new Date(curYear, curMonth, day);
        var dateStr = formatDateKey(dayDate);
        var dow = dayDate.getDay();
        var hrs = dailyHours[dateStr] || 0;
        var done = dailyDoneCount[dateStr] || 0;
        var isToday = (dateStr === todayKey);

        var level = 0;
        if (hrs > 4) level = 4;
        else if (hrs >= 2) level = 3;
        else if (hrs >= 1) level = 2;
        else if (hrs > 0 || done > 0) level = 1;

        monthCellsHtml +=
          '<div class="month-day-cell ' + (isToday ? 'today' : '') + '" data-date="' + dateStr + '" data-dow="' + dow + '" data-level="' + level + '" data-hours="' + hrs.toFixed(1) + '" data-done="' + done + '">' +
          '  <div class="month-day-header">' +
          '    <span class="month-day-num">' + day + '</span>' +
          '    ' + (hrs > 0 ? '<span class="month-day-hours">' + hrs.toFixed(1) + 'h</span>' : '') +
          '  </div>' +
          '  <div class="month-day-badge">' +
          '    ' + (done > 0 ? '<span>✓ ' + done + '건</span>' : (hrs > 0 ? '<span>실행 중</span>' : '<span style="color:var(--text-muted); opacity:0.4;">-</span>')) +
          '  </div>' +
          '  <div class="month-day-level-bar">' +
          '    <div class="month-day-level-fill"></div>' +
          '  </div>' +
          '</div>';
      }

      bodyHtml =
        '<div class="heatmap-month-calendar">' +
        '  <div class="month-cal-weekdays">' +
        '    <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>' +
        '  </div>' +
        '  <div class="month-cal-grid">' + monthCellsHtml + '</div>' +
        '</div>';

    } else {
      /* [뷰 2] 16주 연속 잔디밭 (GitHub Grass) 뷰 */
      var totalWeeks = 16;
      var dayOfWeek = today.getDay();
      var mondayOffset = (dayOfWeek + 6) % 7;
      var startDate = new Date(today);
      startDate.setDate(today.getDate() - (totalWeeks * 7 - 1) - mondayOffset);

      var monthHeaders = [];
      var cellsHtml = '';
      var cur = new Date(startDate);
      var lastMonth = -1;

      for (var w = 0; w < totalWeeks + 1; w++) {
        var weekStartMonth = cur.getMonth() + 1;
        if (weekStartMonth !== lastMonth) {
          monthHeaders.push('<div class="heatmap-month-col">' + weekStartMonth + '월</div>');
          lastMonth = weekStartMonth;
        } else {
          monthHeaders.push('<div class="heatmap-month-col"></div>');
        }

        for (var d = 0; d < 7; d++) {
          var dKey = formatDateKey(cur);
          var hVal = dailyHours[dKey] || 0;
          var dnVal = dailyDoneCount[dKey] || 0;

          var lvl = 0;
          if (hVal > 4) lvl = 4;
          else if (hVal >= 2) lvl = 3;
          else if (hVal >= 1) lvl = 2;
          else if (hVal > 0 || dnVal > 0) lvl = 1;

          var isFuture = cur > today;
          cellsHtml +=
            '<div class="heatmap-cell" ' +
            'data-date="' + dKey + '" ' +
            'data-hours="' + hVal.toFixed(1) + '" ' +
            'data-done="' + dnVal + '" ' +
            'data-level="' + (isFuture ? 0 : lvl) + '" ' +
            (isFuture ? 'style="opacity:0.25;pointer-events:none;"' : '') +
            '></div>';

          cur.setDate(cur.getDate() + 1);
        }
      }

      bodyHtml =
        '<div class="heatmap-grass-wrap">' +
        '  <div class="heatmap-grass-table">' +
        '    <div class="heatmap-months-header">' + monthHeaders.join('') + '</div>' +
        '    <div class="heatmap-grass-body">' +
        '      <div class="heatmap-grass-weekdays">' +
        '        <span>월</span>' +
        '        <span>화</span>' +
        '        <span>수</span>' +
        '        <span>목</span>' +
        '        <span>금</span>' +
        '        <span class="dow-sat">토</span>' +
        '        <span class="dow-sun">일</span>' +
        '      </div>' +
        '      <div class="heatmap-grass-grid">' + cellsHtml + '</div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    }

    var displayMonthName = (today.getMonth() + 1) + '월';

    /* 전체 카드 렌더링 */
    container.innerHTML =
      '<div class="heatmap-card">' +
      '  <div class="heatmap-header">' +
      '    <div class="heatmap-title-wrap">' +
      '      <span style="font-size:22px;">🌱</span>' +
      '      <div>' +
      '        <h3 class="heatmap-title">나의 실천 잔디밭 (Habit Tracker)</h3>' +
      '        <span class="heatmap-subtitle">' + (currentViewMode === 'month' ? displayMonthName + '의 일자별 몰입 및 실천 현황을 기록합니다.' : '꾸준한 계획 실행과 몰입 시간이 초록빛 잔디로 피어납니다.') + '</span>' +
      '      </div>' +
      '    </div>' +
      '    <div class="heatmap-header-right">' +
      '      <div class="heatmap-view-toggle">' +
      '        <button class="heatmap-toggle-btn ' + (currentViewMode === 'month' ? 'active' : '') + '" id="viewMonthBtn">📅 ' + displayMonthName + ' 실천 현황</button>' +
      '        <button class="heatmap-toggle-btn ' + (currentViewMode === 'grass' ? 'active' : '') + '" id="viewGrassBtn">🌱 16주 잔디밭</button>' +
      '      </div>' +
      '      <div class="heatmap-stats-pills">' +
      '        <div class="heatmap-stat-pill highlight">' +
      '          <span>🔥 연속 실천:</span>' +
      '          <strong>' + currentStreak + '일</strong>' +
      '        </div>' +
      '        <div class="heatmap-stat-pill">' +
      '          <span>🏆 최장 연속:</span>' +
      '          <strong>' + maxStreak + '일</strong>' +
      '        </div>' +
      '        <div class="heatmap-stat-pill">' +
      '          <span>⏱️ 누적 시간:</span>' +
      '          <strong>' + Math.round(totalLoggedHours * 10) / 10 + 'h</strong>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  ' + bodyHtml +
      '  <div class="heatmap-footer">' +
      '    <span>덜 실천함</span>' +
      '    <div class="heatmap-legend-cells">' +
      '      <div class="heatmap-cell" data-level="0"></div>' +
      '      <div class="heatmap-cell" data-level="1"></div>' +
      '      <div class="heatmap-cell" data-level="2"></div>' +
      '      <div class="heatmap-cell" data-level="3"></div>' +
      '      <div class="heatmap-cell" data-level="4"></div>' +
      '    </div>' +
      '    <span>더 많이 실천함</span>' +
      '  </div>' +
      '</div>';

    /* 뷰 전환 버튼 이벤트 */
    var btnM = document.getElementById('viewMonthBtn');
    var btnG = document.getElementById('viewGrassBtn');

    if (btnM) {
      btnM.addEventListener('click', function () {
        currentViewMode = 'month';
        localStorage.setItem('pds_heatmap_view', 'month');
        render(containerId, planId);
      });
    }

    if (btnG) {
      btnG.addEventListener('click', function () {
        currentViewMode = 'grass';
        localStorage.setItem('pds_heatmap_view', 'grass');
        render(containerId, planId);
      });
    }

    /* 툴팁 이벤트 */
    var tooltip = ensureTooltip();
    var hoverElements = container.querySelectorAll('[data-date]');
    for (var i = 0; i < hoverElements.length; i++) {
      hoverElements[i].addEventListener('mouseenter', function (e) {
        var dt = this.getAttribute('data-date');
        var hr = this.getAttribute('data-hours');
        var dn = this.getAttribute('data-done');
        var txt = dt + ' · ' + hr + '시간 실천';
        if (dn > 0) txt += ' (' + dn + '건 완료)';
        tooltip.textContent = txt;
        tooltip.classList.add('visible');

        var rect = this.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = rect.top + 'px';
      });

      hoverElements[i].addEventListener('mouseleave', function () {
        tooltip.classList.remove('visible');
      });
    }
  }

  return {
    render: render
  };
})();
