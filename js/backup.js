/* === backup.js — 데이터 백업 (JSON 내보내기) & 복원 (JSON 가져오기) 모듈 === */

var Backup = (function () {
  /* 데이터 전체 JSON 내보내기 */
  async function exportData() {
    try {
      U.toast('데이터 백업 파일을 생성 중입니다...', 'info');

      var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;

      /* 1. Plans 가져오기 */
      var plansRes = await db.from('plans').select('*');
      var plans = plansRes.data || [];

      /* 2. Todos 가져오기 */
      var todosRes = await db.from('todos').select('*');
      var todos = todosRes.data || [];

      /* 3. Records 가져오기 */
      var recsRes = await db.from('records').select('*');
      var records = recsRes.data || [];

      /* 4. Vlogs 가져오기 */
      var vlogsRes = await db.from('vlogs').select('*');
      var vlogs = vlogsRes.data || [];

      var backupPayload = {
        app: 'PDS-Diary Canvas',
        version: '1.2.0',
        exported_at: new Date().toISOString(),
        user_id: user ? user.id : 'anonymous',
        user_email: user ? user.email : '',
        counts: {
          plans: plans.length,
          todos: todos.length,
          records: records.length,
          vlogs: vlogs.length
        },
        data: {
          plans: plans,
          todos: todos,
          records: records,
          vlogs: vlogs
        }
      };

      var jsonStr = JSON.stringify(backupPayload, null, 2);
      var blob = new Blob([jsonStr], { type: 'application/json' });
      var url = URL.createObjectURL(blob);

      var a = document.createElement('a');
      var todayStr = new Date().toISOString().substring(0, 10);
      a.href = url;
      a.download = 'pds_canvas_backup_' + todayStr + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      U.toast('다이어리 데이터 백업 파일이 다운로드되었습니다! 📦', 'success');
    } catch (err) {
      console.error(err);
      U.toast('백업 파일 생성 실패: ' + (err.message || '오류가 발생했습니다.'), 'error');
    }
  }

  /* 백업 파일 선택 및 복원 모달 오픈 */
  function openImportDialog() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          var parsed = JSON.parse(event.target.result);
          showRestoreConfirmModal(parsed);
        } catch (err) {
          U.toast('유효하지 않은 백업 JSON 파일입니다.', 'error');
        }
      };
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  /* 복원 전 확인 및 카운트 모달 표시 */
  function showRestoreConfirmModal(backupObj) {
    var modalTitle = document.getElementById('modalTitle');
    var modalBody = document.getElementById('modalBody');
    var modalEl = document.getElementById('modal');
    if (!modalTitle || !modalBody || !modalEl) return;

    if (!backupObj || (!backupObj.data && !backupObj.plans)) {
      U.toast('백업 데이터 형식이 일치하지 않습니다.', 'error');
      return;
    }

    var data = backupObj.data || backupObj;
    var plansCount = (data.plans || []).length;
    var todosCount = (data.todos || []).length;
    var recordsCount = (data.records || []).length;
    var vlogsCount = (data.vlogs || []).length;
    var exportedAt = backupObj.exported_at ? new Date(backupObj.exported_at).toLocaleString() : '알 수 없음';

    modalTitle.textContent = '다이어리 데이터 복원 (JSON Import)';
    modalBody.innerHTML =
      '<div style="text-align: left; padding: 10px 0;">' +
      '  <div class="form-tip-banner" style="background:#fef3c7; border-color:#fde68a; color:#92400e; margin-bottom:16px;">' +
      '    <span>⚠️ 백업 파일에 담긴 데이터를 불러와 안전하게 복원합니다. 기존 데이터와 결합(Upsert)됩니다.</span>' +
      '  </div>' +
      '  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13.5px;">' +
      '    <tr style="border-bottom: 1px solid var(--border);"><td style="padding: 8px 0; color: var(--text-muted);">백업 생성 일시</td><td style="font-weight: 600; text-align: right;">' + exportedAt + '</td></tr>' +
      '    <tr style="border-bottom: 1px solid var(--border);"><td style="padding: 8px 0; color: var(--text-muted);">복원할 계획(Plan) 수</td><td style="font-weight: 700; color: var(--accent); text-align: right;">' + plansCount + '개</td></tr>' +
      '    <tr style="border-bottom: 1px solid var(--border);"><td style="padding: 8px 0; color: var(--text-muted);">복원할 할 일(Todo) 수</td><td style="font-weight: 700; color: var(--accent); text-align: right;">' + todosCount + '개</td></tr>' +
      '    <tr style="border-bottom: 1px solid var(--border);"><td style="padding: 8px 0; color: var(--text-muted);">복원할 실행 기록 수</td><td style="font-weight: 700; color: var(--accent); text-align: right;">' + recordsCount + '개</td></tr>' +
      '    <tr><td style="padding: 8px 0; color: var(--text-muted);">복원할 사진·Vlog 수</td><td style="font-weight: 700; color: var(--accent); text-align: right;">' + vlogsCount + '개</td></tr>' +
      '  </table>' +
      '  <div style="display: flex; justify-content: flex-end; gap: 10px;">' +
      '    <button class="btn btn-ghost" id="cancelRestoreBtn">취소</button>' +
      '    <button class="btn btn-primary" id="executeRestoreBtn" style="background:var(--accent);">데이터 복원 실행하기</button>' +
      '  </div>' +
      '</div>';

    modalEl.hidden = false;

    document.getElementById('cancelRestoreBtn').addEventListener('click', function () {
      if (typeof closeModal === 'function') closeModal();
    });

    document.getElementById('executeRestoreBtn').addEventListener('click', async function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = '복원 진행 중...';

      try {
        await executeRestore(data);
        U.toast('모든 데이터가 성공적으로 복원되었습니다! 🎉', 'success');
        if (typeof closeModal === 'function') closeModal();

        /* 화면 새로고침 */
        setTimeout(function () {
          window.location.reload();
        }, 1200);
      } catch (err) {
        console.error(err);
        U.toast('복원 실패: ' + (err.message || '오류가 발생했습니다.'), 'error');
        btn.disabled = false;
        btn.textContent = '데이터 복원 실행하기';
      }
    });
  }

  /* 실제 DB 업서트(Upsert) 수행 */
  async function executeRestore(data) {
    var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    var uid = user ? user.id : null;

    /* 1. Plans 복원 */
    if (data.plans && data.plans.length > 0) {
      var cleanPlans = data.plans.map(function (p) {
        var obj = Object.assign({}, p);
        if (uid) obj.user_id = uid;
        return obj;
      });
      var res1 = await db.from('plans').upsert(cleanPlans);
      if (res1.error) throw res1.error;
    }

    /* 2. Todos 복원 */
    if (data.todos && data.todos.length > 0) {
      var cleanTodos = data.todos.map(function (t) {
        var obj = Object.assign({}, t);
        if (uid) obj.user_id = uid;
        return obj;
      });
      var res2 = await db.from('todos').upsert(cleanTodos);
      if (res2.error) throw res2.error;
    }

    /* 3. Records 복원 */
    if (data.records && data.records.length > 0) {
      var cleanRecords = data.records.map(function (r) {
        var obj = Object.assign({}, r);
        if (uid) obj.user_id = uid;
        return obj;
      });
      var res3 = await db.from('records').upsert(cleanRecords);
      if (res3.error) throw res3.error;
    }

    /* 4. Vlogs 복원 */
    if (data.vlogs && data.vlogs.length > 0) {
      var cleanVlogs = data.vlogs.map(function (v) {
        var obj = Object.assign({}, v);
        if (uid) obj.user_id = uid;
        return obj;
      });
      var res4 = await db.from('vlogs').upsert(cleanVlogs);
      if (res4.error) throw res4.error;
    }

    return true;
  }

  return {
    exportData: exportData,
    openImportDialog: openImportDialog
  };
})();
