-- ========================================================
-- PDS Diary 통합 스키마 & RLS & 스토리지 설정 (충돌 없음)
-- SKT_ALEPH_Defense 프로젝트 SQL Editor에서 실행
-- ========================================================

-- 1. 계획 테이블
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('높음', '보통', '낮음')),
  success_criteria TEXT NOT NULL,
  estimated_hours NUMERIC(6,1) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '진행중' CHECK (status IN ('진행중', '완료', '보류')),
  next_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 계획 수정 이력 테이블
CREATE TABLE IF NOT EXISTS plan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority TEXT NOT NULL,
  success_criteria TEXT NOT NULL,
  estimated_hours NUMERIC(6,1) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  change_reason TEXT
);

-- 3. 할 일 테이블
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '진행중' CHECK (status IN ('진행중', '완료', '보류')),
  due_date DATE,
  priority TEXT NOT NULL DEFAULT '보통' CHECK (priority IN ('높음', '보통', '낮음')),
  tag TEXT,
  estimated_hours NUMERIC(6,1) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_idempotency ON todos(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. 실행 기록 테이블
CREATE TABLE IF NOT EXISTS records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  actual_hours NUMERIC(6,1) NOT NULL,
  blocker TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 사진 / Vlog 일기 테이블
CREATE TABLE IF NOT EXISTS vlog_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL DEFAULT 'mon',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plans_updated ON plans;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_todos_updated ON todos;
CREATE TRIGGER trg_todos_updated BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_vlog_entries_updated ON vlog_entries;
CREATE TRIGGER trg_vlog_entries_updated BEFORE UPDATE ON vlog_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. 회원 탈퇴(계정 삭제)를 위한 RPC 함수
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS (Row Level Security) - 본인 데이터만 접근 가능
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vlog_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 plans 접근 제어" ON plans;
CREATE POLICY "본인 plans 접근 제어" ON plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 plan_history 접근 제어" ON plan_history;
CREATE POLICY "본인 plan_history 접근 제어" ON plan_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 todos 접근 제어" ON todos;
CREATE POLICY "본인 todos 접근 제어" ON todos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 records 접근 제어" ON records;
CREATE POLICY "본인 records 접근 제어" ON records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 vlog_entries 접근 제어" ON vlog_entries;
CREATE POLICY "본인 vlog_entries 접근 제어" ON vlog_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_history_user_id ON plan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_vlog_entries_user_id ON vlog_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_plan_id ON todos(plan_id);
CREATE INDEX IF NOT EXISTS idx_records_todo_id ON records(todo_id);

-- 10. 스토리지 버킷 (vlog-media) 생성 및 RLS 정책
INSERT INTO storage.buckets (id, name, public)
VALUES ('vlog-media', 'vlog-media', true)
ON CONFLICT (id) DO NOTHING;

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
