/* === review.js — 돌아보기 집계 + 드릴다운 (C28~C33, C83) === */

var Review = {
  /* 계획별 집계 계산 */
  compute: async function(planId) {
    var todos = (await db.from('todos').select('*').eq('plan_id', planId)).data || [];
    var today = U.todaySeoul();

    var total = todos.length;
    var completed = 0;
    var delayed = 0;
    var blocked = 0;
    var estHours = 0;
    var actHours = 0;

    var completedIds = [];
    var delayedIds = [];
    var blockedIds = [];

    for (var i = 0; i < todos.length; i++) {
      var t = todos[i];
      estHours += parseFloat(t.estimated_hours) || 0;

      /* 완료 수 (C29) */
      if (t.status === '완료') {
        completed++;
        completedIds.push(t.id);
      }

      /* 지연 수 (C30) — 미완료이고 마감일이 오늘 이전 */
      if (t.status !== '완료' && t.due_date && t.due_date < today) {
        delayed++;
        delayedIds.push(t.id);
      }
    }

    /* 막힘 수 (C31) — 실행 기록에 blocker가 있는 할 일 */
    var todoIds = todos.map(function(t) { return t.id; });
    if (todoIds.length > 0) {
      var recs = (await db.from('records').select('todo_id, blocker').in('todo_id', todoIds)).data || [];

      var blockedSet = {};
      for (var j = 0; j < recs.length; j++) {
        if (recs[j].blocker && recs[j].blocker.trim() !== '') {
          blockedSet[recs[j].todo_id] = true;
        }
        /* 실제 시간 합산 */
      }
      blocked = Object.keys(blockedSet).length;
      blockedIds = Object.keys(blockedSet);

      /* 실제 시간 합계 (C32) */
      var allRecs = (await db.from('records').select('actual_hours').in('todo_id', todoIds)).data || [];
      for (var k = 0; k < allRecs.length; k++) {
        actHours += parseFloat(allRecs[k].actual_hours) || 0;
      }
    }

    estHours = Math.round(estHours * 10) / 10;
    actHours = Math.round(actHours * 10) / 10;
    var diffHours = Math.round((actHours - estHours) * 10) / 10;

    return {
      total: total,
      completed: completed,
      delayed: delayed,
      blocked: blocked,
      estHours: estHours,
      actHours: actHours,
      diffHours: diffHours,
      completedIds: completedIds,
      delayedIds: delayedIds,
      blockedIds: blockedIds,
      allTodoIds: todoIds
    };
  },

  /* 드릴다운: 집계 숫자가 나온 기록 조회 및 상세 정보(막힘 사유, 실제 실행 시간, 지연 일수) 연계 (C83) */
  drillDown: async function(planId, type) {
    var data = await Review.compute(planId);
    var ids = [];
    if (type === 'total' || type === 'estHours' || type === 'actHours' || type === 'diffHours') {
      ids = data.allTodoIds;
    } else if (type === 'completed') {
      ids = data.completedIds;
    } else if (type === 'delayed') {
      ids = data.delayedIds;
    } else if (type === 'blocked') {
      ids = data.blockedIds;
    }

    if (!ids || ids.length === 0) return [];
    var res = await db.from('todos').select('*').in('id', ids).order('created_at', { ascending: true });
    var todos = res.data || [];

    // 실행 기록(records) 조회하여 막힘 사유(blocker) 및 실제 실행 시간 데이터 결합
    var recsRes = await db.from('records').select('*').in('todo_id', ids).order('start_time', { ascending: false });
    var records = recsRes.data || [];

    var recordsByTodo = {};
    for (var r = 0; r < records.length; r++) {
      var rec = records[r];
      if (!recordsByTodo[rec.todo_id]) recordsByTodo[rec.todo_id] = [];
      recordsByTodo[rec.todo_id].push(rec);
    }

    var today = U.todaySeoul();

    return todos.map(function(t) {
      var tRecs = recordsByTodo[t.id] || [];
      var blockers = [];
      var actualHours = 0;
      for (var k = 0; k < tRecs.length; k++) {
        if (tRecs[k].blocker && tRecs[k].blocker.trim()) {
          blockers.push(tRecs[k].blocker.trim());
        }
        actualHours += parseFloat(tRecs[k].actual_hours) || 0;
      }
      actualHours = Math.round(actualHours * 10) / 10;
      var estHours = parseFloat(t.estimated_hours) || 0;
      var diffHours = Math.round((actualHours - estHours) * 10) / 10;

      // 마감 지연 일수 계산
      var delayedDays = 0;
      if (t.status !== '완료' && t.due_date && t.due_date < today) {
        var d1 = new Date(t.due_date);
        var d2 = new Date(today);
        var diffTime = d2.getTime() - d1.getTime();
        delayedDays = Math.max(1, Math.round(diffTime / (1000 * 3600 * 24)));
      }

      return Object.assign({}, t, {
        drillType: type,
        blockers: blockers,
        records: tRecs,
        actual_hours: actualHours,
        diff_hours: diffHours,
        delayed_days: delayedDays
      });
    });
  }
};
