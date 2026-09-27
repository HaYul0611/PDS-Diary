-- =============================================
-- 플랜두씨 다이어리 (PDS Diary) — 통합 DB 스키마 & 스토리지
-- Supabase SQL Editor에서 한 번에 안전하게 실행 (반복 실행 가능)
-- =============================================

-- 1. 계획 테이블
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- 2. 계획 수정 이력 (고치기 전 내용 보존)
CREATE TABLE IF NOT EXISTS plan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '진행중' CHECK (status IN ('진행중', '완료')),
  due_date DATE,
  priority TEXT NOT NULL DEFAULT '보통' CHECK (priority IN ('높음', '보통', '낮음')),
  tag TEXT,
  estimated_hours NUMERIC(6,1) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 완료 중복 방지용 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_idempotency ON todos(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. 실행 기록 테이블
CREATE TABLE IF NOT EXISTS records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  actual_hours NUMERIC(6,1) NOT NULL,
  blocker TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 사진 / Vlog 일기 테이블 (다중 사진·영상 캐러셀 & 손글씨 다이어리)
CREATE TABLE IF NOT EXISTS vlog_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL DEFAULT 'mon',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb, -- 업로드된 사진/동영상 공개 URL 배열
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS (Row Level Security) 설정
-- 로그인 없이 공개 접근 허용 (과제 6 기준)
-- =============================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vlog_entries ENABLE ROW LEVEL SECURITY;

-- 기존 정책 충돌 방지 및 재등록
DROP POLICY IF EXISTS "공개 전체 접근" ON plans;
CREATE POLICY "공개 전체 접근" ON plans FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "공개 전체 접근" ON plan_history;
CREATE POLICY "공개 전체 접근" ON plan_history FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "공개 전체 접근" ON todos;
CREATE POLICY "공개 전체 접근" ON todos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "공개 전체 접근" ON records;
CREATE POLICY "공개 전체 접근" ON records FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "공개 전체 접근" ON vlog_entries;
CREATE POLICY "공개 전체 접근" ON vlog_entries FOR ALL TO anon USING (true) WITH CHECK (true);

-- =============================================
-- Supabase Storage (사진 / 동영상 파일 업로드 버킷)
-- =============================================
-- vlog-media 버킷 생성 (공개 버킷)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vlog-media', 'vlog-media', true)
ON CONFLICT (id) DO NOTHING;

-- 누구나 다이어리 사진/영상을 업로드하고 조회할 수 있는 스토리지 정책
DROP POLICY IF EXISTS "공개 미디어 업로드" ON storage.objects;
CREATE POLICY "공개 미디어 업로드" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'vlog-media');

DROP POLICY IF EXISTS "공개 미디어 조회" ON storage.objects;
CREATE POLICY "공개 미디어 조회" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'vlog-media');

DROP POLICY IF EXISTS "공개 미디어 수정" ON storage.objects;
CREATE POLICY "공개 미디어 수정" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'vlog-media');

DROP POLICY IF EXISTS "공개 미디어 삭제" ON storage.objects;
CREATE POLICY "공개 미디어 삭제" ON storage.objects
  FOR DELETE TO anon USING (bucket_id = 'vlog-media');

-- =============================================
-- updated_at 자동 갱신 트리거
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plans_updated ON plans;
CREATE TRIGGER trg_plans_updated
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_todos_updated ON todos;
CREATE TRIGGER trg_todos_updated
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_vlog_entries_updated ON vlog_entries;
CREATE TRIGGER trg_vlog_entries_updated
  BEFORE UPDATE ON vlog_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

