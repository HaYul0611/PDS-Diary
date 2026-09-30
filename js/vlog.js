/* === vlog.js — 사진·Vlog 일기 CRUD + Supabase 연동 모듈 === */

var Vlog = {
  /* 본인의 사진·Vlog 일기 전체 목록 조회 (T07 RLS 적용) */
  list: async function () {
    try {
      var res = await db.from('vlog_entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (res.error) {
        console.error('Vlog list error:', res.error);
        return [];
      }

      return (res.data || []).map(function (it) {
        var rawPhotos = Array.isArray(it.photos) ? it.photos : [];
        var cleanPhotos = [];
        var pSeen = {};
        for (var pi = 0; pi < rawPhotos.length; pi++) {
          var pUrl = (typeof rawPhotos[pi] === 'string') ? rawPhotos[pi].trim() : '';
          if (pUrl && !pSeen[pUrl]) {
            pSeen[pUrl] = true;
            cleanPhotos.push(pUrl);
          }
        }
        return {
          id: it.id,
          date: it.date,
          dayOfWeek: it.day_of_week || 'mon',
          title: it.title || '',
          photos: cleanPhotos,
          content: it.content || '',
          created_at: it.created_at
        };
      });
    } catch (err) {
      console.error('Vlog.list fetch failed:', err);
      return [];
    }
  },

  /* 단건 조회 */
  get: async function (id) {
    try {
      var res = await db.from('vlog_entries').select('*').eq('id', id).single();
      if (res.error || !res.data) return null;
      var it = res.data;
      var rawPhotos = Array.isArray(it.photos) ? it.photos : [];
      var cleanPhotos = [];
      var pSeen = {};
      for (var pi = 0; pi < rawPhotos.length; pi++) {
        var pUrl = (typeof rawPhotos[pi] === 'string') ? rawPhotos[pi].trim() : '';
        if (pUrl && !pSeen[pUrl]) {
          pSeen[pUrl] = true;
          cleanPhotos.push(pUrl);
        }
      }
      return {
        id: it.id,
        date: it.date,
        dayOfWeek: it.day_of_week || 'mon',
        title: it.title || '',
        photos: cleanPhotos,
        content: it.content || '',
        created_at: it.created_at
      };
    } catch (err) {
      console.error('Vlog.get failed:', err);
      return null;
    }
  },

  /* 일기 생성 */
  create: async function (data) {
    var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    var payload = {
      title: data.title ? data.title.trim() : '',
      date: data.date,
      day_of_week: data.dayOfWeek || 'mon',
      photos: Array.isArray(data.photos) ? data.photos : [],
      content: data.content || ''
    };
    if (user && user.id) {
      payload.user_id = user.id;
    }

    var res = await db.from('vlog_entries').insert(payload).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  /* 일기 수정 */
  update: async function (id, data) {
    var payload = {
      title: data.title ? data.title.trim() : '',
      date: data.date,
      day_of_week: data.dayOfWeek || 'mon',
      photos: Array.isArray(data.photos) ? data.photos : [],
      content: data.content || '',
      updated_at: new Date().toISOString()
    };

    var res = await db.from('vlog_entries').update(payload).eq('id', id).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  /* 일기 삭제 */
  remove: async function (id) {
    var res = await db.from('vlog_entries').delete().eq('id', id);
    if (res.error) throw res.error;
    return true;
  },

  /* Supabase Storage 미디어 업로드 (사용자별 폴더 격리) */
  uploadMedia: async function (file) {
    if (!file) return null;
    var user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    var userId = (user && user.id) ? user.id : 'public';
    var ext = (file.name && file.name.split('.').pop()) || 'png';
    var fileName = 'vlog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
    var filePath = userId + '/' + fileName;

    try {
      var res = await db.storage.from('vlog-media').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (res && res.data) {
        var pub = db.storage.from('vlog-media').getPublicUrl(filePath);
        if (pub && pub.data && pub.data.publicUrl) {
          return pub.data.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Supabase storage upload fallback to dataURL:', err);
    }

    // Storage 버킷 미생성/권한 오류 시에도 사용자 경험이 끊기지 않도록 DataURL 폴백
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (evt) { resolve(evt.target.result); };
      reader.readAsDataURL(file);
    });
  }
};
