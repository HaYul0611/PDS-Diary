/* === plans.js — 계획 CRUD + 수정 이력 === */

var Plans = {
  /* 전체 조회 */
  list: async function() {
    var res = await db.from('plans').select('*').order('created_at', { ascending: false });
    return res.data || [];
  },

  /* 단건 조회 */
  get: async function(id) {
    var res = await db.from('plans').select('*').eq('id', id).single();
    return res.data;
  },

  /* 생성 */
  create: async function(data) {
    var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    var payload = {
      title: data.title,
      start_date: data.start_date,
      end_date: data.end_date,
      priority: data.priority,
      success_criteria: data.success_criteria,
      estimated_hours: parseFloat(data.estimated_hours) || 0
    };
    if (user && user.id) {
      payload.user_id = user.id;
    }
    var res = await db.from('plans').insert(payload).select().single();
    return res.data;
  },

  /* 수정 (이전 내용을 plan_history에 보존 후 업데이트) */
  update: async function(id, data, reason) {
    /* 1. 현재 값을 이력에 보존 (C08) */
    var current = await Plans.get(id);
    if (current) {
      var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
      var histPayload = {
        plan_id: id,
        title: current.title,
        start_date: current.start_date,
        end_date: current.end_date,
        priority: current.priority,
        success_criteria: current.success_criteria,
        estimated_hours: current.estimated_hours,
        change_reason: reason || ''
      };
      if (user && user.id) {
        histPayload.user_id = user.id;
      }
      await db.from('plan_history').insert(histPayload);
    }

    /* 2. 업데이트 */
    var res = await db.from('plans').update({
      title: data.title,
      start_date: data.start_date,
      end_date: data.end_date,
      priority: data.priority,
      success_criteria: data.success_criteria,
      estimated_hours: parseFloat(data.estimated_hours) || 0,
      status: data.status || '진행중',
      next_action: data.next_action || null
    }).eq('id', id).select().single();
    return res.data;
  },

  /* 수정 이력 조회 */
  getHistory: async function(planId) {
    var res = await db.from('plan_history').select('*').eq('plan_id', planId).order('changed_at', { ascending: false });
    return res.data || [];
  },

  /* 계획 삭제 (안전한 종속 항목 정리 후 계획 삭제) */
  remove: async function(id) {
    // 1. 해당 계획의 모든 할 일 조회
    var todosRes = await db.from('todos').select('id').eq('plan_id', id);
    if (todosRes.data && todosRes.data.length > 0) {
      var todoIds = todosRes.data.map(function(t) { return t.id; });
      // 2. 실행 기록 삭제
      await db.from('records').delete().in('todo_id', todoIds);
      // 3. 할 일 삭제
      await db.from('todos').delete().eq('plan_id', id);
    }
    // 4. 계획 수정 이력 삭제
    await db.from('plan_history').delete().eq('plan_id', id);
    // 5. 계획 본체 삭제
    var res = await db.from('plans').delete().eq('id', id);
    if (res.error) throw res.error;
    return true;
  },

  /* 다음 계획으로 넘기기 (C33) */
  setNextAction: async function(planId, text) {
    var res = await db.from('plans').update({ next_action: text }).eq('id', planId);
    if (res.error) throw res.error;
    return res.data;
  }
};

