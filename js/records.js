/* === records.js — 실행 기록 CRUD === */

var Records = {
  /* 할 일에 딸린 실행 기록 조회 */
  listByTodo: async function(todoId) {
    var res = await db.from('records').select('*').eq('todo_id', todoId).order('created_at', { ascending: false });
    return res.data || [];
  },

  /* 계획에 딸린 전체 실행 기록 조회 */
  listByPlan: async function(planId) {
    /* todos를 통해 간접 조회 */
    var todos = await db.from('todos').select('id').eq('plan_id', planId);
    if (!todos.data || todos.data.length === 0) return [];

    var ids = todos.data.map(function(t) { return t.id; });
    var res = await db.from('records').select('*').in('todo_id', ids).order('created_at', { ascending: false });
    return res.data || [];
  },

  /* 생성 (C23~C26) */
  create: async function(data) {
    var started = new Date(data.started_at);
    var ended = new Date(data.ended_at);
    if (isNaN(started.getTime()) || isNaN(ended.getTime())) {
      throw new Error('유효한 시작 및 종료 시각을 입력해주세요.');
    }
    if (ended < started) {
      throw new Error('끝난 시각은 시작 시각보다 빠를 수 없습니다.');
    }
    var hours = U.hoursDiff(data.started_at, data.ended_at);

    var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    var payload = {
      todo_id: data.todo_id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      actual_hours: hours,
      blocker: data.blocker ? data.blocker.trim() : null
    };
    if (user && user.id) {
      payload.user_id = user.id;
    }
    var res = await db.from('records').insert(payload).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  /* 삭제 */
  remove: async function(id) {
    var res = await db.from('records').delete().eq('id', id);
    if (res.error) throw res.error;
    return true;
  }
};
