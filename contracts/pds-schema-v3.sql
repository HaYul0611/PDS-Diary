-- ========================================================
-- [과제 7] 플랜두씨 다이어리 (PDS Diary)
-- 인증(Auth), RLS 접근 제어 및 사용자 격리 DB 스키마 v3
-- ========================================================

-- 1. 기존 테이블들에 user_id 외래키 컬럼 추가
-- auth.users 테이블의 id를 참조하며, 계정 삭제 시 본인 데이터 자동 삭제 CASCADE
ALTER TABLE plans 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE plan_history 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE todos 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE records 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE vlog_entries 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 기존 데이터 마이그레이션 예시
-- 과제 6에서 등록된 기존 데이터(user_id IS NULL)를 가입한 내 계정으로 일괄 귀속
/*
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 가입한 내 계정 이메일 조회
  SELECT id INTO target_user_id FROM auth.users WHERE email = '내계정이메일@example.com';
  
  IF target_user_id IS NOT NULL THEN
    UPDATE plans SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE plan_history SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE todos SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE records SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE vlog_entries SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE '과제 6 데이터가 계정(%)으로 성공적으로 이전되었습니다.', target_user_id;
  END IF;
END $$;
*/

-- 3. 기존 공개 RLS 정책 제거 및 "본인 데이터만 접근 가능한 엄격한 RLS" 적용
DROP POLICY IF EXISTS "공개 전체 접근" ON plans;
DROP POLICY IF EXISTS "공개 전체 접근" ON plan_history;
DROP POLICY IF EXISTS "공개 전체 접근" ON todos;
DROP POLICY IF EXISTS "공개 전체 접근" ON records;
DROP POLICY IF EXISTS "공개 전체 접근" ON vlog_entries;

DROP POLICY IF EXISTS "본인 plans 접근 제어" ON plans;
CREATE POLICY "본인 plans 접근 제어" ON plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 plan_history 접근 제어" ON plan_history;
CREATE POLICY "본인 plan_history 접근 제어" ON plan_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 todos 접근 제어" ON todos;
CREATE POLICY "본인 todos 접근 제어" ON todos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 records 접근 제어" ON records;
CREATE POLICY "본인 records 접근 제어" ON records
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 vlog_entries 접근 제어" ON vlog_entries;
CREATE POLICY "본인 vlog_entries 접근 제어" ON vlog_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. 회원 탈퇴(계정 삭제)를 위한 RPC 함수 (T07-C134)
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 할 일(todos) 테이블 상태값에 '보류' 허용 (진행중 / 완료 / 보류)
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_status_check;
ALTER TABLE todos ADD CONSTRAINT todos_status_check CHECK (status IN ('진행중', '완료', '보류'));

-- 6. Supabase Storage (vlog-media) 버킷 사용자 격리 보안 정책 (과제 7 보안 강화)
-- 사용자는 자신의 UUID 폴더(vlog-media/{user_id}/*)에만 업로드 및 삭제가 가능하도록 통제
DROP POLICY IF EXISTS "vlog-media 본인 업로드 제어" ON storage.objects;
CREATE POLICY "vlog-media 본인 업로드 제어" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vlog-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "vlog-media 본인 삭제 제어" ON storage.objects;
CREATE POLICY "vlog-media 본인 삭제 제어" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vlog-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "vlog-media 공개 읽기 허용" ON storage.objects;
CREATE POLICY "vlog-media 공개 읽기 허용" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'vlog-media');
