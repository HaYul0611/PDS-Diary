/* === supabase.js — Supabase 클라이언트 초기화 === */
/* anon key는 공개용(RLS로 접근 제어)이므로 프론트 코드에 포함해도 안전합니다 */

var SUPABASE_URL = 'https://jrsoosoflveipirsqokx.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc29vc29mbHZlaXBpcnNxb2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MDE1NzUsImV4cCI6MjEwNzE3NzU3NX0.RqMp0GvBXLDbn0pYDaVnKLY177E6z7XMzYhPRi7yIec';

var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
