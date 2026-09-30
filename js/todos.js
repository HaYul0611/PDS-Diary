/* === todos.js — 할 일 CRUD + 검색/필터/정렬 === */

var Todos = {
  /* 계획에 딸린 할 일 조회 */
  listByPlan: async function (planId, opts) {
    var q = db.from('todos').select('*').eq('plan_id', planId);

    /* 검색 (C18) */
    if (opts && opts.search) {
      q = q.ilike('title', '%' + opts.search + '%');
    }

    /* 필터 (C19) */
    if (opts && opts.status && opts.status !== 'all') {
      q = q.eq('status', opts.status);
    }
    if (opts && opts.priority && opts.priority !== 'all') {
      q = q.eq('priority', opts.priority);
    }
    if (opts && opts.tag) {
      q = q.ilike('tag', '%' + opts.tag + '%');
    }

    /* 정렬 (C20) — 최신순(기본) / 생성일순 / 마감일 / 우선순위 */
    if (opts && opts.sort === 'created_asc') {
      q = q.order('created_at', { ascending: true });
    } else if (opts && opts.sort === 'due') {
      q = q.order('due_date', { ascending: true, nullsFirst: false });
    } else if (opts && opts.sort === 'priority') {
      q = q.order('created_at', { ascending: false });
    } else {
      /* 기본값: 최신순 (최근 생성된 항목이 맨 위로) */
      q = q.order('created_at', { ascending: false });
    }

    var res = await q;
    var data = res.data || [];

    /* 우선순위 정렬 (높음 > 보통 > 낮음 순) */
    if (opts && opts.sort === 'priority') {
      var order = { '높음': 0, '보통': 1, '낮음': 2 };
      data.sort(function (a, b) {
        var diff = (order[a.priority] || 1) - (order[b.priority] || 1);
        return diff !== 0 ? diff : new Date(b.created_at) - new Date(a.created_at);
      });
    }

    return data;
  },

  /* 생성 (C09) */
  create: async function (data) {
    var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    var payload = {
      plan_id: data.plan_id,
      title: data.title,
      due_date: data.due_date || null,
      priority: data.priority || '보통',
      status: data.status || '진행중',
      tag: data.tag || null,
      estimated_hours: parseFloat(data.estimated_hours) || 0
    };
    if (user && user.id) {
      payload.user_id = user.id;
    }
    var res = await db.from('todos').insert(payload).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  /* 수정 (C10) */
  update: async function (id, data) {
    var payload = {
      title: data.title,
      due_date: data.due_date || null,
      priority: data.priority || '보통',
      tag: data.tag || null,
      estimated_hours: parseFloat(data.estimated_hours) || 0
    };
    if (data.status) {
      payload.status = data.status;
      if (data.status === '완료') {
        payload.completed_at = new Date().toISOString();
      } else {
        payload.completed_at = null;
      }
    }
    var res = await db.from('todos').update(payload).eq('id', id).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  /* 완료 처리 (C11 + C21 멱등성: 진행중 또는 보류 상태 모두 완료 가능) */
  complete: async function (id) {
    var key = 'complete-' + id + '-' + Date.now();
    var res = await db.from('todos').update({
      status: '완료',
      completed_at: new Date().toISOString(),
      idempotency_key: key
    }).eq('id', id).neq('status', '완료').select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  /* 진행 중으로 되돌리기 (C12) */
  revert: async function (id) {
    var res = await db.from('todos').update({
      status: '진행중',
      completed_at: null,
      idempotency_key: null
    }).eq('id', id).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  /* 삭제 (C13) */
  remove: async function (id) {
    var recDel = await db.from('records').delete().eq('todo_id', id);
    if (recDel.error) throw recDel.error;
    var todoDel = await db.from('todos').delete().eq('id', id);
    if (todoDel.error) throw todoDel.error;
    return true;
  }
};
