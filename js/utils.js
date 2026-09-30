/* === utils.js — 공통 유틸리티 === */

var U = {
  /* XSS 방어: 스크립트 모양 글자를 글자 그대로 출력 (C57) */
  esc: function (str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  },

  /* 날짜 포맷 (서울 시간 기준) */
  formatDate: function (iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    // 만약 연도가 9999 이상 등 비정상적으로 크면 보정
    var year = d.getFullYear();
    if (year > 2100) {
      // 오타 등으로 잘못 들어간 경우 보정
      year = 2026;
    }
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return year + '. ' + m + '. ' + day + '.';
  },

  formatDateTime: function (iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  },

  formatDateInput: function (iso) {
    if (!iso) return '';
    return iso.substring(0, 10);
  },

  /* 로컬 datetime-local 입력 포맷 (YYYY-MM-DDTHH:mm) */
  nowLocalInput: function (d) {
    var date = d ? new Date(d) : new Date();
    var offset = date.getTimezoneOffset() * 60000;
    var localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
    return localISOTime;
  },

  /* 오늘 날짜 (서울 기준) */
  todaySeoul: function () {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  },

  /* UUID 생성 */
  uuid: function () {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
  },

  /* 전체 데이터 내보내기 (C36) */
  exportAll: async function () {
    try {
      var plans = (await db.from('plans').select('*')).data || [];
      var history = (await db.from('plan_history').select('*')).data || [];
      var todos = (await db.from('todos').select('*')).data || [];
      var records = (await db.from('records').select('*')).data || [];
      var vlogs = (await db.from('vlog_entries').select('*')).data || [];

      var data = {
        exported_at: new Date().toISOString(),
        plans: plans,
        plan_history: history,
        todos: todos,
        records: records,
        vlog_entries: vlogs
      };

      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var link = document.createElement('a');
      link.download = 'pds-diary-export-' + U.todaySeoul() + '.json';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      return true;
    } catch (e) {
      console.error(e);
      U.toast('데이터 내보내기 중 오류가 발생했습니다: ' + e.message, 'error');
      return false;
    }
  },

  /* 토스트 메시지 (SVG 아이콘 포함) */
  toast: function (msg, type) {
    var el = document.getElementById('globalToast');
    if (!el) return;
    var iconSvg = '';
    if (type === 'success') {
      iconSvg = Icons.check(18);
    } else if (type === 'error') {
      iconSvg = Icons.alertCircle(18);
    } else {
      iconSvg = Icons.info(18);
    }
    el.innerHTML = '<span class="toast-icon">' + iconSvg + '</span><span class="toast-text">' + U.esc(msg) + '</span>';
    el.className = 'toast show ' + (type || 'info');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = 'toast'; }, 3200);
  },

  /* 시간 차이 계산 (시간 단위) */
  hoursDiff: function (start, end) {
    if (!start || !end) return 0;
    return Math.round(((new Date(end) - new Date(start)) / 3600000) * 10) / 10;
  }
};

/* === Icons — SVG 아이콘 모음 (이모지 대체) === */
var Icons = {
  svg: function (inner, size, cls) {
    var s = size || 16;
    var c = cls ? ' ' + cls : '';
    return '<svg class="app-icon' + c + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  },
  plus: function (s) {
    return Icons.svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', s);
  },
  check: function (s) {
    return Icons.svg('<polyline points="20 6 9 17 4 12"/>', s);
  },
  x: function (s) {
    return Icons.svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', s);
  },
  edit: function (s) {
    return Icons.svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', s);
  },
  trash: function (s) {
    return Icons.svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>', s);
  },
  history: function (s) {
    return Icons.svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/>', s);
  },
  rotateCcw: function (s) {
    return Icons.svg('<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>', s);
  },
  arrowRight: function (s) {
    return Icons.svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', s);
  },
  calendar: function (s) {
    return Icons.svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', s);
  },
  clock: function (s) {
    return Icons.svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', s);
  },
  tag: function (s) {
    return Icons.svg('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>', s);
  },
  target: function (s) {
    return Icons.svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s);
  },
  alertCircle: function (s) {
    return Icons.svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', s);
  },
  info: function (s) {
    return Icons.svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>', s);
  },
  play: function (s) {
    return Icons.svg('<polygon points="5 3 19 12 5 21 5 3"/>', s);
  },
  flag: function (s) {
    return Icons.svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>', s);
  },
  chevronDown: function (s) {
    return Icons.svg('<polyline points="6 9 12 15 18 9"/>', s);
  },
  list: function (s) {
    return Icons.svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', s);
  },
  save: function (s) {
    return Icons.svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>', s);
  },
  filter: function (s) {
    return Icons.svg('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>', s);
  },
  calendarGrid: function (s) {
    return Icons.svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>', s);
  },
  camera: function (s) {
    return Icons.svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', s);
  },
  video: function (s) {
    return Icons.svg('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>', s);
  },
  image: function (s) {
    return Icons.svg('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>', s);
  },
  bookOpen: function (s) {
    return Icons.svg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>', s);
  },
  flower: function (s) {
    return Icons.svg('<path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V12m4.5 0a4.5 4.5 0 1 1-4.5 4.5M16.5 12H12m-4.5 0a4.5 4.5 0 1 0 4.5 4.5M7.5 12H12m0 4.5V21"/>', s);
  },
  bookmark: function (s) {
    return Icons.svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>', s);
  },
  quote: function (s) {
    return Icons.svg('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>', s);
  },
  pause: function (s) {
    return Icons.svg('<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>', s);
  },
  moon: function (s) {
    return Icons.svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', s);
  },
  sun: function (s) {
    return Icons.svg('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>', s);
  },
  user: function (s) {
    return Icons.svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s);
  },
  lock: function (s) {
    return Icons.svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s);
  },
  sparkles: function (s) {
    return Icons.svg('<path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"/><path d="M19 16l1.2 2.8L23 20l-2.8 1.2L19 24l-1.2-2.8L15 20l2.8-1.2z"/>', s);
  },
  globe: function (s) {
    return Icons.svg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', s);
  }
};

/* 날짜 계산 헬퍼: 오늘로부터 N일 후의 YYYY-MM-DD */
U.daysFromToday = function (n) {
  var d = new Date();
  d.setDate(d.getDate() + (n || 0));
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
};

/* === CustomSelect — 브라우저 기본 드롭다운을 감성 다이어리 리스트박스로 대체 === */
var CustomSelect = {
  enhance: function (selectEl) {
    if (!selectEl) return;
    if (selectEl.dataset.customEnhanced === 'true') {
      CustomSelect.sync(selectEl);
      return;
    }

    selectEl.dataset.customEnhanced = 'true';
    selectEl.style.display = 'none';

    var wrapper = document.createElement('div');
    wrapper.className = 'custom-select-box' + (selectEl.className.includes('select-sm') ? ' sm' : '');
    if (selectEl.id) wrapper.dataset.for = selectEl.id;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var label = document.createElement('span');
    label.className = 'custom-select-label';

    var arrow = document.createElement('span');
    arrow.className = 'custom-select-arrow';
    arrow.innerHTML = Icons.chevronDown(14);

    trigger.appendChild(label);
    trigger.appendChild(arrow);
    wrapper.appendChild(trigger);

    var dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';
    dropdown.setAttribute('role', 'listbox');
    wrapper.appendChild(dropdown);

    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);

    function renderOptions() {
      dropdown.innerHTML = '';
      var opts = Array.from(selectEl.options);
      var currentVal = selectEl.value;
      var selectedText = '';

      opts.forEach(function (opt) {
        var isSelected = opt.value === currentVal;
        if (isSelected || (!selectedText && opt === opts[0])) {
          selectedText = opt.textContent;
        }

        var item = document.createElement('div');
        item.className = 'custom-select-option' + (isSelected ? ' selected' : '');
        item.dataset.value = opt.value;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', isSelected ? 'true' : 'false');

        var itemText = document.createElement('span');
        itemText.className = 'option-text';
        itemText.textContent = opt.textContent;
        item.appendChild(itemText);

        var checkIcon = document.createElement('span');
        checkIcon.className = 'option-check';
        checkIcon.innerHTML = Icons.check(14);
        item.appendChild(checkIcon);

        item.addEventListener('click', function (e) {
          e.stopPropagation();
          selectEl.value = opt.value;
          label.textContent = opt.textContent;

          dropdown.querySelectorAll('.custom-select-option').forEach(function (el) {
            el.classList.remove('selected');
            el.setAttribute('aria-selected', 'false');
          });
          item.classList.add('selected');
          item.setAttribute('aria-selected', 'true');

          closeDropdown();
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        });

        dropdown.appendChild(item);
      });

      label.textContent = selectedText || (opts.length > 0 ? opts[0].textContent : '');
      if (selectEl.disabled) {
        trigger.disabled = true;
        wrapper.classList.add('disabled');
      } else {
        trigger.disabled = false;
        wrapper.classList.remove('disabled');
      }
    }

    function toggleDropdown() {
      if (trigger.disabled) return;
      var isOpen = wrapper.classList.contains('open');
      if (isOpen) {
        closeDropdown();
      } else {
        // 다른 열린 드롭다운들 모두 닫기
        document.querySelectorAll('.custom-select-box.open').forEach(function (b) {
          b.classList.remove('open');
          var tr = b.querySelector('.custom-select-trigger');
          if (tr) tr.setAttribute('aria-expanded', 'false');
        });
        wrapper.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    }

    function closeDropdown() {
      wrapper.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDropdown();
    });

    selectEl._customRender = renderOptions;
    renderOptions();
  },

  sync: function (selectEl) {
    if (selectEl && typeof selectEl._customRender === 'function') {
      selectEl._customRender();
    }
  },

  enhanceAll: function (container) {
    var root = container || document;
    root.querySelectorAll('select').forEach(function (sel) {
      CustomSelect.enhance(sel);
    });
  }
};

// 외부 클릭 시 모든 커스텀 셀렉트 드롭다운 닫기
document.addEventListener('click', function (e) {
  if (!e.target.closest('.custom-select-box')) {
    document.querySelectorAll('.custom-select-box.open').forEach(function (box) {
      box.classList.remove('open');
      var tr = box.querySelector('.custom-select-trigger');
      if (tr) tr.setAttribute('aria-expanded', 'false');
    });
  }
});


