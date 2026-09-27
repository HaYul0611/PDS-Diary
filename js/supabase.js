/* === supabase.js — Supabase 클라이언트 초기화 === */
/* anon key는 공개용(RLS로 접근 제어)이므로 프론트 코드에 포함해도 안전합니다 */

var SUPABASE_URL = 'https://euukjkroljoqoaktzwwa.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dWtqa3JvbGpvcW9ha3R6d3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDg5MDYsImV4cCI6MjEwNjAyNDkwNn0.7I3O4al7sr6jIvpx4hR_sO2MhW-TxSDCf-PucUYPReo';

var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
