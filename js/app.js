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
    bindOfflineDetection();
    bindThemeToggle();
    bindModal();
    bindEvents();
    bindCalendarControls();
    bindVlogControls();
    bindAuth();
    CustomSelect.enhanceAll(document);

    // [과제 7] 인증 세션 감지 및 초기화 (T07-C03, T07-C91~C100)
    if (typeof Auth !== 'undefined') {
      Auth.init(handleAuthState);
    } else {
      loadPlans();
    }
  }

  /* ========== 인증 상태 처리 및 UI 전환 (T07-C03, T07-C97) ========== */
  function handleAuthState(user) {
    var appEl = document.getElementById('app');
    var authScreen = document.getElementById('authScreen');
    var diaryWrapper = document.getElementById('diaryMainWrapper');
    var userProfile = document.getElementById('userProfileArea');
    var emailText = document.getElementById('userEmailText');
    var dropdownEmail = document.getElementById('dropdownUserEmail');
    var dropdownWrap = document.getElementById('accountDropdownWrap');

    if (user) {
      // 1. 로그인 성공 상태: 오픈된 다이어리 내지 스타일 복원
      if (authScreen) authScreen.hidden = true;
      if (appEl) {
        appEl.hidden = false;
        appEl.classList.remove('auth-mode');
      }
      if (diaryWrapper) diaryWrapper.hidden = false;
      if (userProfile) userProfile.style.display = 'inline-flex';
      if (emailText) emailText.textContent = user.email || '내 다이어리';
      if (dropdownEmail) dropdownEmail.textContent = user.email || '내 계정';

      // 사용자 데이터 로드
      loadPlans();
      if (currentTab === 'calendar') loadCalendar();
      else if (currentTab === 'todos') loadTodos();
      else if (currentTab === 'records') loadRecords();
      else if (currentTab === 'vlog') loadVlog();
      else if (currentTab === 'review') loadReview();
    } else {
      // 2. 비로그인 상태: 오픈된 프레임 숨기고 완전히 닫힌 다이어리 표지만 노출
      selectedPlanId = null;
      localStorage.removeItem('pds_vlog_entries');
      if (authScreen) authScreen.hidden = false;
      if (appEl) {
        appEl.hidden = true;
        appEl.classList.add('auth-mode');
      }
      if (diaryWrapper) diaryWrapper.hidden = true;
      if (userProfile) userProfile.style.display = 'none';
      if (emailText) emailText.textContent = '';
      if (dropdownEmail) dropdownEmail.textContent = '';
      if (dropdownWrap) dropdownWrap.classList.remove('open');

      closeModal();
    }
  }

  /* ========== 인증 폼 및 컨트롤 바인딩 (T07-C91~C100, T07-C134) ========== */
  var authMode = 'login'; // 'login' | 'signup'

  function bindAuth() {
    var toggleWrap = document.getElementById('authSwitchToggle');
    var tabLogin = document.getElementById('authTabLogin');
    var tabSignup = document.getElementById('authTabSignup');
    var switchBtn = document.getElementById('authSwitchModeBtn');
    var authForm = document.getElementById('authForm');
    var submitBtn = document.getElementById('authSubmitBtn');
    var submitText = document.getElementById('authSubmitText');
    var emailLabel = document.getElementById('authEmailLabel');
    var helpP = document.getElementById('authToggleHelp');
    var errorBox = document.getElementById('authErrorMsg');
    var logoutBtn = document.getElementById('logoutBtn');
    var deleteBtn = document.getElementById('deleteAccountBtn');

    // 계정 프로필 드롭다운 엘리먼트
    var accountTrigger = document.getElementById('accountTriggerBtn');
    var accountDropdown = document.getElementById('accountDropdownWrap');

    if (accountTrigger && accountDropdown) {
      accountTrigger.onclick = function (e) {
        e.stopPropagation();
        var isOpen = accountDropdown.classList.contains('open');
        accountDropdown.classList.toggle('open');
        accountTrigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      };

      document.addEventListener('click', function (e) {
        if (!accountDropdown.contains(e.target)) {
          accountDropdown.classList.remove('open');
          accountTrigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    function setAuthMode(mode) {
      authMode = mode;
      if (errorBox) {
        errorBox.hidden = true;
        errorBox.textContent = '';
        errorBox.className = 'auth-msg-box';
      }

      if (mode === 'login') {
        if (toggleWrap) toggleWrap.classList.remove('signup-mode');
        if (tabLogin) tabLogin.classList.add('active');
        if (tabSignup) tabSignup.classList.remove('active');
        if (submitText) submitText.textContent = '다이어리 열기';
        if (emailLabel) emailLabel.textContent = '계정 이메일';
        if (helpP) {
          helpP.innerHTML = '아직 다이어리 계정이 없으신가요? <button type="button" id="authSwitchModeBtn" class="auth-link-btn hp-link">새 계정 만들기</button>';
          var newSwitch = document.getElementById('authSwitchModeBtn');
          if (newSwitch) newSwitch.onclick = function () { setAuthMode('signup'); };
        }
      } else {
        if (toggleWrap) toggleWrap.classList.add('signup-mode');
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabSignup) tabSignup.classList.add('active');
        if (submitText) submitText.textContent = '새 다이어리 등록하기';
        if (emailLabel) emailLabel.textContent = '가입할 이메일';
        if (helpP) {
          helpP.innerHTML = '이미 계정이 있으신가요? <button type="button" id="authSwitchModeBtn" class="auth-link-btn hp-link">로그인하기</button>';
          var newSwitch2 = document.getElementById('authSwitchModeBtn');
          if (newSwitch2) newSwitch2.onclick = function () { setAuthMode('login'); };
        }
      }
    }

    if (tabLogin) tabLogin.onclick = function () { setAuthMode('login'); };
    if (tabSignup) tabSignup.onclick = function () { setAuthMode('signup'); };
    if (switchBtn) switchBtn.onclick = function () { setAuthMode('signup'); };

    // 폼 제출 (로그인 또는 회원가입)
    if (authForm) {
      authForm.onsubmit = async function (e) {
        e.preventDefault();
        var emailInput = document.getElementById('authEmail');
        var pwInput = document.getElementById('authPassword');
        var email = emailInput ? emailInput.value.trim() : '';
        var pw = pwInput ? pwInput.value : '';

        if (!email || !pw) {
          showAuthError('이메일과 비밀번호를 모두 입력해주세요.');
          return;
        }

        if (authMode === 'login' && checkLockout()) {
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.7';
        }

        try {
          if (authMode === 'login') {
            var res = await Auth.signIn(email, pw);
            if (!res.success) {
              failedLoginAttempts++;
              if (failedLoginAttempts >= 5) {
                var until = Date.now() + 30000;
                localStorage.setItem('pds_lockout_until', String(until));
                startLockoutCountdown(30);
              } else {
                showAuthError(res.message + ' (연속 실패 ' + failedLoginAttempts + '/5회)');
              }
            } else {
              failedLoginAttempts = 0;
              localStorage.removeItem('pds_lockout_until');
              if (lockoutTimer) {
                clearInterval(lockoutTimer);
                lockoutTimer = null;
              }
              if (errorBox) errorBox.hidden = true;

              // ★ [3D 북 오픈 애니메이션 시퀀스] ★
              var buckle = document.getElementById('lockBuckle');
              var frontCover = document.getElementById('diaryFrontCover');
              var appEl = document.getElementById('app');
              var diaryWrapper = document.getElementById('diaryMainWrapper');
              var authScreen = document.getElementById('authScreen');
              var userProfile = document.getElementById('userProfileArea');
              var emailText = document.getElementById('userEmailText');
              var dropdownEmail = document.getElementById('dropdownUserEmail');

              // 1. 자물쇠 풀림
              if (buckle) buckle.classList.add('unlocked');
              U.toast('다이어리 자물쇠가 풀렸습니다!', 'success');

              // 2. 3D 앞표지 책장 열림
              setTimeout(function () {
                if (frontCover) frontCover.classList.add('opening');
              }, 200);

              // 3. 다이어리 본문 활짝 펼쳐짐
              setTimeout(function () {
                if (authScreen) authScreen.hidden = true;
                if (appEl) {
                  appEl.hidden = false;
                  appEl.classList.remove('auth-mode');
                }
                if (diaryWrapper) diaryWrapper.hidden = false;
                if (userProfile) userProfile.style.display = 'inline-flex';
                if (emailText) emailText.textContent = res.user.email || '내 다이어리';
                if (dropdownEmail) dropdownEmail.textContent = res.user.email || '내 계정';
                if (frontCover) frontCover.classList.remove('opening');
                if (buckle) buckle.classList.remove('unlocked');
                if (pwInput) pwInput.value = '';

                loadPlans();
              }, 700);
            }
          } else {
            var resSign = await Auth.signUp(email, pw);
            if (!resSign.success) {
              showAuthError(resSign.message);
            } else {
              U.toast('회원가입이 완료되었습니다!', 'success');
              if (resSign.user) {
                // 자동 로그인 세션 발급 시 즉시 북 오픈 연출
                var buckle2 = document.getElementById('lockBuckle');
                var frontCover2 = document.getElementById('diaryFrontCover');
                var appEl2 = document.getElementById('app');
                var diaryWrapper2 = document.getElementById('diaryMainWrapper');
                var authScreen2 = document.getElementById('authScreen');
                var userProfile2 = document.getElementById('userProfileArea');
                var emailText2 = document.getElementById('userEmailText');
                var dropdownEmail2 = document.getElementById('dropdownUserEmail');

                if (buckle2) buckle2.classList.add('unlocked');
                setTimeout(function () {
                  if (frontCover2) frontCover2.classList.add('opening');
                }, 200);

                setTimeout(function () {
                  if (authScreen2) authScreen2.hidden = true;
                  if (appEl2) {
                    appEl2.hidden = false;
                    appEl2.classList.remove('auth-mode');
                  }
                  if (diaryWrapper2) diaryWrapper2.hidden = false;
                  if (userProfile2) userProfile2.style.display = 'inline-flex';
                  if (emailText2) emailText2.textContent = resSign.user.email || '내 다이어리';
                  if (dropdownEmail2) dropdownEmail2.textContent = resSign.user.email || '내 계정';
                  if (frontCover2) frontCover2.classList.remove('opening');
                  if (buckle2) buckle2.classList.remove('unlocked');
                  if (pwInput) pwInput.value = '';
                  loadPlans();
                }, 700);
              } else {
                setAuthMode('login');
                showAuthSuccess('가입이 완료되었습니다. 로그인해주세요.');
              }
            }
          }
        } catch (err) {
          showAuthError('인증 처리 중 오류가 발생했습니다: ' + (err.message || err));
        } finally {
          if (submitBtn && !checkLockout()) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '';
          }
        }
      };
    }

    var failedLoginAttempts = 0;
    var lockoutTimer = null;

    function checkLockout() {
      var lockoutUntil = parseInt(localStorage.getItem('pds_lockout_until') || '0', 10);
      var now = Date.now();
      if (lockoutUntil > now) {
        var remainSec = Math.ceil((lockoutUntil - now) / 1000);
        startLockoutCountdown(remainSec);
        return true;
      }
      return false;
    }

    function startLockoutCountdown(sec) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
      }
      if (lockoutTimer) clearInterval(lockoutTimer);

      function updateMsg(s) {
        showAuthError('⚠️ 보안을 위해 로그인이 ' + s + '초간 일시 제한됩니다. 잠시 후 다시 시도해주세요.');
      }

      updateMsg(sec);
      var current = sec;
      lockoutTimer = setInterval(function () {
        current--;
        if (current <= 0) {
          clearInterval(lockoutTimer);
          lockoutTimer = null;
          localStorage.removeItem('pds_lockout_until');
          failedLoginAttempts = 0;
          if (errorBox) errorBox.hidden = true;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '';
          }
        } else {
          updateMsg(current);
        }
      }, 1000);
    }

    checkLockout();

    function showAuthError(msg) {
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.className = 'auth-msg-box error';
        errorBox.textContent = msg;
      }
    }

    function showAuthSuccess(msg) {
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.className = 'auth-msg-box success';
        errorBox.textContent = msg;
      }
    }

    // 로그아웃 (T07-C96)
    if (logoutBtn) {
      logoutBtn.onclick = async function () {
        if (accountDropdown) accountDropdown.classList.remove('open');
        selectedPlanId = null;
        localStorage.removeItem('pds_vlog_entries');
        await Auth.signOut();
        U.toast('다이어리가 안전하게 잠겼습니다 (로그아웃).', 'info');
      };
    }

    // 회원 탈퇴 및 자료 영구 삭제 (T07-C134) - 브라우저 기본 confirm 대신 다이어리 감성 커스텀 모달 적용
    if (deleteBtn) {
      deleteBtn.onclick = function () {
        if (accountDropdown) accountDropdown.classList.remove('open');
        var user = Auth.getUser();
        if (!user) return;

        var html = '<div class="confirm-modal-box delete-account-dialog">' +
          '<div class="delete-dialog-badge">' +
          '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
          '<line x1="12" y1="9" x2="12" y2="13"/>' +
          '<line x1="12" y1="17" x2="12.01" y2="17"/>' +
          '</svg>' +
          '</div>' +
          '<h3 class="delete-dialog-title">회원 탈퇴 및 데이터 영구 파기 안내</h3>' +
          '<div class="delete-dialog-card">' +
          '<p class="delete-dialog-desc">' +
          '계정을 삭제하면 지금까지 작성하신 <strong>모든 계획, 할 일, 실행 기록, 사진 일기</strong>가 데이터베이스에서 즉시 영구적으로 삭제되며 다시는 복구할 수 없습니다.' +
          '</p>' +
          '</div>' +
          '<p class="delete-dialog-prompt">정말로 계정을 완전히 삭제하시겠습니까?</p>' +
          '<div class="confirm-buttons delete-dialog-actions">' +
          '<button class="btn-outline btn-delete-cancel" type="button" onclick="App.closeModal()">취소</button>' +
          '<button class="btn-danger btn-delete-confirm" id="btnExecuteDeleteAccount" type="button">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="3 6 5 6 21 6"/>' +
          '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
          '</svg><span>확인 (완전 삭제)</span>' +
          '</button>' +
          '</div>' +
          '</div>';

        openModal('계정 탈퇴 확인', html);

        var btnExecute = document.getElementById('btnExecuteDeleteAccount');
        if (btnExecute) {
          btnExecute.onclick = async function () {
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<span>삭제 처리 중...</span>';
            var res = await Auth.deleteAccount();
            closeModal();
            if (res.success) {
              U.toast('계정과 모든 다이어리 기록이 안전하게 영구 삭제되었습니다.', 'info');
            } else {
              U.toast('탈퇴 처리 중 오류: ' + res.message, 'error');
            }
          };
        }
      };
    }
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

  function triggerPageFlip(isForward) {
    var layer = document.getElementById('pageFlipLayer');
    var page = document.getElementById('flippingPage');
    if (!layer || !page) return;

    if (pageFlipTimer) clearTimeout(pageFlipTimer);

    // 3D 종이 본체 아치 넘김 클래스 설정
    page.className = 'flipping-page ' + (isForward ? 'flip-forward' : 'flip-backward');
    layer.hidden = false;

    pageFlipTimer = setTimeout(function () {
      layer.hidden = true;
      page.className = 'flipping-page';
    }, 520);
  }

  function switchTab(name) {
    if (name === currentTab) return;

    var oldName = currentTab;
    var oldIndex = TAB_ORDER.indexOf(oldName);
    var newIndex = TAB_ORDER.indexOf(name);
    var isForward = newIndex >= oldIndex;

    // 실제 양장본 감성의 부드러운 3D 페이퍼 컬(Page Curl) 책 넘김 애니메이션 즉시 가동
    triggerPageFlip(isForward);

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

    // 새 패널은 책이 말려 넘어가는 밑장에 즉시 활성화되어 컬 뒤로 자연스럽게 노출
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      var isActive = p.id === 'tab' + capitalize(name);
      p.classList.toggle('active', isActive);
    });

    // GPU 애니메이션이 부드럽게 끝나는 시점에 데이터 로딩을 수행하여 60fps 무결점 보장
    setTimeout(function () {
      renderTabContent(name);
    }, 420);
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

  /* ========== 오프라인 상태 감지 및 복구 안내 (고도화 요소 1) ========== */
  function bindOfflineDetection() {
    var banner = document.getElementById('offlineNoticeBanner');
    var textEl = document.getElementById('offlineBannerText');
    if (!banner || !textEl) return;

    window.addEventListener('offline', function () {
      textEl.textContent = '인터넷 연결이 끊겼습니다. 네트워크가 재연결될 때까지 대기합니다.';
      banner.className = 'offline-banner active warning';
      banner.hidden = false;
      U.toast('오프라인 상태입니다. 인터넷 연결을 확인해주세요.', 'error');
    });

    window.addEventListener('online', function () {
      textEl.textContent = '인터넷 연결이 정상적으로 복구되었습니다. 실시간 동기화가 재개됩니다.';
      banner.className = 'offline-banner active success';
      banner.hidden = false;
      U.toast('인터넷이 다시 연결되었습니다.', 'success');
      setTimeout(function () {
        banner.hidden = true;
        banner.classList.remove('active');
      }, 3500);
    });
  }

  /* ========== 심야 서재 캔들라이트 테마 (고도화 요소 4) ========== */
  function bindThemeToggle() {
    var btn = document.getElementById('themeToggleBtn');
    var textEl = document.getElementById('themeToggleText');
    var savedTheme = localStorage.getItem('pds_theme') || 'light';

    function applyTheme(theme) {
      if (theme === 'dark') {
        document.body.classList.add('candlelight-theme');
        if (textEl) textEl.textContent = '주간 서재';
        if (btn) btn.setAttribute('title', '주간 서재 모드로 전환');
      } else {
        document.body.classList.remove('candlelight-theme');
        if (textEl) textEl.textContent = '캔들라이트';
        if (btn) btn.setAttribute('title', '심야 서재 캔들라이트 모드로 전환');
      }
    }

    applyTheme(savedTheme);

    if (btn) {
      btn.addEventListener('click', function () {
        var isDark = document.body.classList.contains('candlelight-theme');
        var nextTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('pds_theme', nextTheme);
        applyTheme(nextTheme);
        U.toast(nextTheme === 'dark' ? '심야 서재 캔들라이트 모드가 켜졌습니다.' : '주간 서재 모드가 켜졌습니다.', 'info');
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
    // ESC 키로 열린 모달 즉시 닫기 (접근성 개선)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        var m = document.getElementById('modal');
        if (m && !m.hidden) closeModal();
      }
    });
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
          U.toast(err.message || '계획 저장 중 오류가 발생했습니다.', 'error');
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

    // 1. 해당 월의 모든 할 일(Todos), 계획(Plans), 사진일기(Vlogs) 비동기 로드 (Supabase 전용)
    var allTodos = [];
    var allPlans = [];
    var vlogEntries = [];
    try {
      var [todosRes, plansRes, vlogsData] = await Promise.all([
        db.from('todos').select('*'),
        db.from('plans').select('*'),
        (typeof Vlog !== 'undefined' ? Vlog.list() : Promise.resolve([]))
      ]);
      allTodos = todosRes.data || [];
      allPlans = plansRes.data || [];
      vlogEntries = vlogsData || [];
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

    var list = (typeof Vlog !== 'undefined') ? await Vlog.list() : [];
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
      var rawPhotos = item.photos || [];
      var photos = rawPhotos.filter(function (p) { return typeof p === 'string' && p.trim().length > 0; });
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
      '<input class="input" name="title" value="' + (isEdit ? U.esc(existingItem.title) : '') + '" placeholder="예: 오늘 하루를 기억하며" required>' +
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
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '저장 중...';
        }

        try {
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
              return Vlog.uploadMedia(file);
            });
            uploadedFileUrls = (await Promise.all(uploadPromises)).filter(Boolean);
          }

          var combined = photos.concat(uploadedFileUrls);
          // 텍스트 영역에 노출되지 않았던 기존 data: URI가 있다면 유지
          if (isEdit && existingItem && Array.isArray(existingItem.photos)) {
            existingItem.photos.forEach(function (p) {
              if (p && p.startsWith('data:') && !combined.includes(p)) {
                combined.push(p);
              }
            });
          }

          // 중복 사진 URL 제거 (캐러셀 복제 방지)
          var seen = {};
          var allPhotos = [];
          for (var pi = 0; pi < combined.length; pi++) {
            var pUrl = combined[pi].trim();
            if (pUrl && !seen[pUrl]) {
              seen[pUrl] = true;
              allPhotos.push(pUrl);
            }
          }

          var entryData = {
            title: title,
            date: date,
            dayOfWeek: dayOfWeek,
            photos: allPhotos,
            content: content
          };

          if (isEdit && existingItem && existingItem.id) {
            await Vlog.update(existingItem.id, entryData);
            U.toast('포토 일기가 수정되었습니다.', 'success');
          } else {
            await Vlog.create(entryData);
            U.toast('새 포토 일기가 저장되었습니다.', 'success');
          }

          closeModal();
          await loadVlog();
          if (currentTab === 'calendar') loadCalendar();
        } catch (err) {
          console.error(err);
          U.toast('저장 실패: ' + err.message, 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? '수정 내용 저장하기' : '캐러셀 다이어리에 붙이기';
          }
        }
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
          (t.status === '완료'
            ? '<button class="btn-revert" type="button" onclick="App.revertTodo(\'' + t.id + '\')">' + Icons.rotateCcw(14) + ' 진행 중으로 되돌리기</button>'
            : t.status === '보류'
              ? '<button class="btn-revert" type="button" onclick="App.togglePendingTodo(\'' + t.id + '\', \'진행중\')">' + Icons.play(13) + ' 진행 재개</button>' +
              '<button class="btn-complete" type="button" onclick="App.completeTodo(\'' + t.id + '\')">' + Icons.check(14) + ' 완료 처리</button>'
              : '<button class="btn-complete" type="button" onclick="App.completeTodo(\'' + t.id + '\')">' + Icons.check(14) + ' 완료 처리</button>' +
              '<button class="btn-outline btn-pending-toggle" type="button" title="할 일을 보류 상태로 변경합니다" onclick="App.togglePendingTodo(\'' + t.id + '\', \'보류\')">' + Icons.pause(13) + ' 보류</button>') +
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
      '<label>상태</label>' +
      '<div class="select-wrapper">' +
      '<select class="select" name="status">' +
      '<option value="진행중"' + (!todo || todo.status === '진행중' ? ' selected' : '') + '>진행중</option>' +
      '<option value="보류"' + (todo && todo.status === '보류' ? ' selected' : '') + '>보류</option>' +
      '<option value="완료"' + (todo && todo.status === '완료' ? ' selected' : '') + '>완료</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-row">' +
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
              '<div class="record-time-header">' +
              '<span class="record-time">' + Icons.clock(13) + ' <strong>' + U.formatDateTime(r.started_at) + '</strong> ~ ' + U.formatDateTime(r.ended_at) + '</span>' +
              '<span class="record-hours badge badge-tag">' + r.actual_hours + '시간 소요</span>' +
              '</div>' +
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
    togglePendingTodo: async function (id, newStatus) {
      try {
        await Todos.update(id, { status: newStatus });
        U.toast(newStatus === '보류' ? '할 일을 보류 상태로 변경했습니다.' : '할 일을 다시 진행 중으로 변경했습니다.', 'info');
        if (currentTab === 'calendar') loadCalendar();
        else loadTodos();
      } catch (err) {
        U.toast('상태 변경 실패: ' + err.message, 'error');
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
    editVlog: async function (id) {
      try {
        var item = await Vlog.get(id);
        if (item) {
          showVlogForm(item);
        } else {
          U.toast('해당 일기를 찾을 수 없습니다.', 'error');
        }
      } catch (err) {
        U.toast('일기 불러오기 실패: ' + err.message, 'error');
      }
    },
    deleteVlog: async function (id) {
      if (!confirm('정말로 이 포토 일기를 삭제하시겠습니까?')) return;
      try {
        await Vlog.remove(id);
        U.toast('포토 일기가 삭제되었습니다.', 'success');
        await loadVlog();
        if (currentTab === 'calendar') loadCalendar();
      } catch (err) {
        U.toast('삭제 실패: ' + err.message, 'error');
      }
    },
    /* 캐러셀 네비게이션 */
    carouselNext: function (id) {
      var card = document.getElementById('vlogCard_' + id);
      if (!card) return;
      var slides = card.querySelectorAll('.carousel-slide');
      var total = slides.length || 1;
      var curIdx = carouselStates[id] || 0;
      curIdx = (curIdx + 1) % total;
      carouselStates[id] = curIdx;
      App.updateCarouselUI(id, curIdx, total);
    },
    carouselPrev: function (id) {
      var card = document.getElementById('vlogCard_' + id);
      if (!card) return;
      var slides = card.querySelectorAll('.carousel-slide');
      var total = slides.length || 1;
      var curIdx = carouselStates[id] || 0;
      curIdx = (curIdx - 1 + total) % total;
      carouselStates[id] = curIdx;
      App.updateCarouselUI(id, curIdx, total);
    },
    carouselGoTo: function (id, idx) {
      var card = document.getElementById('vlogCard_' + id);
      if (!card) return;
      var slides = card.querySelectorAll('.carousel-slide');
      var total = slides.length || 1;
      carouselStates[id] = idx;
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
