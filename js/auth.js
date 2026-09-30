/* === auth.js — Supabase 인증(Auth) 관리 모듈 === */

var Auth = (function () {
  var currentUser = null;

  // 인증 상태 변화 리스너 등록
  function initAuth(onUserChange) {
    // 1. 현재 세션 확인
    db.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        currentUser = res.data.session.user;
      } else {
        currentUser = null;
      }
      if (typeof onUserChange === 'function') {
        onUserChange(currentUser);
      }
    }).catch(function (err) {
      console.error('세션 확인 중 오류:', err);
      currentUser = null;
      if (typeof onUserChange === 'function') {
        onUserChange(null);
      }
    });

    // 2. 인증 상태 변경 감지 (로그인/로그아웃 등)
    db.auth.onAuthStateChange(function (event, session) {
      currentUser = session ? session.user : null;
      if (typeof onUserChange === 'function') {
        onUserChange(currentUser);
      }
    });
  }

  // 현재 사용자 반환
  function getUser() {
    return currentUser;
  }

  // 회원가입 (T07-C94, T07-C98)
  async function signUp(email, password) {
    if (!email || !password) {
      return { success: false, message: '이메일과 비밀번호를 모두 입력해 주세요.' };
    }
    if (password.length < 6) {
      return { success: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' };
    }

    try {
      var res = await db.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (res.error) {
        // 이미 가입된 경우 등
        if (res.error.message && res.error.message.toLowerCase().includes('already registered')) {
          return { success: false, message: '이미 가입된 이메일 계정입니다.' };
        }
        return { success: false, message: res.error.message };
      }

      // Supabase에서 User Signups가 켜져 있고 Confirm email이 꺼져 있으면 res.data.user 즉시 반환
      if (res.data && res.data.user) {
        // 일부 환경에서 identities가 비어있으면 이미 존재하는 유저일 수 있음
        if (res.data.user.identities && res.data.user.identities.length === 0) {
          return { success: false, message: '이미 가입된 이메일 계정입니다.' };
        }
        return { success: true, user: res.data.user, message: '회원가입이 완료되었습니다.' };
      }

      return { success: true, message: '회원가입이 완료되었습니다.' };
    } catch (err) {
      return { success: false, message: '회원가입 처리 중 오류가 발생했습니다: ' + (err.message || err) };
    }
  }

  // 로그인 (T07-C95, T07-C99 계정 열거 방지: 동일 안내 문구)
  async function signIn(email, password) {
    if (!email || !password) {
      return { success: false, message: '이메일과 비밀번호를 모두 입력해 주세요.' };
    }

    try {
      var res = await db.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (res.error) {
        // T07-C99: 아이디는 맞고 비밀번호만 틀렸을 때와 아이디 자체가 없을 때의 안내 문구를 일치시킴
        return {
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다.'
        };
      }

      currentUser = res.data.user;
      return { success: true, user: res.data.user };
    } catch (err) {
      return {
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      };
    }
  }

  // 로그아웃 (T07-C96, T07-C114)
  async function signOut() {
    try {
      await db.auth.signOut();
      currentUser = null;
      return { success: true };
    } catch (err) {
      console.error('로그아웃 오류:', err);
      return { success: false, message: err.message };
    }
  }

  // 회원 탈퇴 및 본인 데이터 영구 삭제 (T07-C134)
  async function deleteAccount() {
    if (!currentUser) {
      return { success: false, message: '로그인 상태가 아닙니다.' };
    }

    try {
      // 1. RPC 호출을 통해 auth.users에서 삭제 (DB ON DELETE CASCADE로 연관 plans, todos, records, vlog_entries 자동 삭제)
      var rpcRes = await db.rpc('delete_user_account');
      if (rpcRes.error) {
        // RPC가 없는 경우 대비: 수동으로 본인 데이터들을 삭제 후 로그아웃
        await db.from('records').delete().eq('user_id', currentUser.id);
        await db.from('todos').delete().eq('user_id', currentUser.id);
        await db.from('plan_history').delete().eq('user_id', currentUser.id);
        await db.from('plans').delete().eq('user_id', currentUser.id);
        await db.from('vlog_entries').delete().eq('user_id', currentUser.id);
      }

      // 로그아웃 처리
      await signOut();
      return { success: true, message: '계정과 모든 다이어리 기록이 영구적으로 삭제되었습니다.' };
    } catch (err) {
      return { success: false, message: '계정 삭제 중 오류가 발생했습니다: ' + (err.message || err) };
    }
  }

  return {
    init: initAuth,
    getUser: getUser,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    deleteAccount: deleteAccount
  };
})();
