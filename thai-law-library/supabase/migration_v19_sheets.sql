-- ย้ายข้อมูลจาก Google Sheets (คลังกฎหมาย) มายัง Supabase: 1 ชีต = 1 ตาราง, คอลัมน์ตรงกับหัวคอลัมน์เดิม
-- _row = ลำดับแถวในชีต (ใช้ซิงก์), _synced_at = เวลาซิงก์ล่าสุด · ทุกตารางเปิด RLS ไม่มีนโยบายสาธารณะ (เข้าถึงได้เฉพาะ service role ฝั่งเซิร์ฟเวอร์)
create table if not exists public.ratings (
  _row integer primary key,
  "id" text,
  "time" text,
  "member_id" text,
  "username" text,
  "display_name" text,
  "stars" text,
  "text" text,
  "device" text,
  _synced_at timestamptz not null default now()
);
alter table public.ratings enable row level security;
revoke all on public.ratings from anon, authenticated;
comment on table public.ratings is 'ชีต Ratings ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.chat (
  _row integer primary key,
  "id" text,
  "time" text,
  "member_id" text,
  "username" text,
  "sender" text,
  "admin_id" text,
  "admin_name" text,
  "text" text,
  "status" text,
  "attach" text,
  "edited_at" text,
  _synced_at timestamptz not null default now()
);
alter table public.chat enable row level security;
revoke all on public.chat from anon, authenticated;
comment on table public.chat is 'ชีต Chat ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.members (
  _row integer primary key,
  "member_id" text,
  "username" text,
  "username_lower" text,
  "title" text,
  "first_name" text,
  "last_name" text,
  "display_name" text,
  "birth_date" text,
  "gender" text,
  "member_type" text,
  "education_json" text,
  "work_json" text,
  "phone" text,
  "address" text,
  "bio" text,
  "avatar" text,
  "admin_hash" text,
  "personal_hash" text,
  "salt" text,
  "recovery_q" text,
  "recovery_ahash" text,
  "plan" text,
  "plan_cycle" text,
  "plan_expires" text,
  "trial_start" text,
  "created_at" text,
  "last_login" text,
  "account_status" text,
  "fail_count" text,
  "lock_until" text,
  "lock_count" text,
  "social_json" text,
  "privacy_json" text,
  "role" text,
  "extra_json" text,
  "email" text,
  "email_verified" text,
  "otp_hash" text,
  "otp_exp" text,
  "otp_tries" text,
  "blocked" text,
  "device_ids" text,
  "line_user_id" text,
  "line_linked_at" text,
  "last_active" text,
  "block_reason" text,
  _synced_at timestamptz not null default now()
);
alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;
comment on table public.members is 'ชีต Members ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.stats (
  _row integer primary key,
  "date" text,
  "visits" text,
  "mobile" text,
  "tablet" text,
  "desktop" text,
  "chrome" text,
  "safari" text,
  "edge" text,
  "firefox" text,
  "other" text,
  "logins" text,
  "law_opens" text,
  "updated_at" text,
  _synced_at timestamptz not null default now()
);
alter table public.stats enable row level security;
revoke all on public.stats from anon, authenticated;
comment on table public.stats is 'ชีต Stats ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.sessions (
  _row integer primary key,
  "token_hash" text,
  "member_id" text,
  "created_at" text,
  "last_seen" text,
  "device" text,
  "os" text,
  "browser" text,
  "ip" text,
  "location" text,
  "revoked" text,
  "active_at" text,
  "online" text,
  "lat" text,
  "lng" text,
  "accuracy" text,
  "map_url" text,
  _synced_at timestamptz not null default now()
);
alter table public.sessions enable row level security;
revoke all on public.sessions from anon, authenticated;
comment on table public.sessions is 'ชีต Sessions ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.user_data (
  _row integer primary key,
  "member_id" text,
  "rev" text,
  "updated_at" text,
  "part" text,
  "json" text,
  _synced_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
revoke all on public.user_data from anon, authenticated;
comment on table public.user_data is 'ชีต UserData ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.laws (
  _row integer primary key,
  "law_id" text,
  "category" text,
  "title" text,
  "short_name" text,
  "year" text,
  "source_url" text,
  "status" text,
  "updated_at" text,
  "note" text,
  _synced_at timestamptz not null default now()
);
alter table public.laws enable row level security;
revoke all on public.laws from anon, authenticated;
comment on table public.laws is 'ชีต Laws ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.sections (
  _row integer primary key,
  "section_id" text,
  "law_id" text,
  "section_no" text,
  "popular_name" text,
  "text" text,
  "tags" text,
  "source_url" text,
  "updated_at" text,
  _synced_at timestamptz not null default now()
);
alter table public.sections enable row level security;
revoke all on public.sections from anon, authenticated;
comment on table public.sections is 'ชีต Sections ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.treaties (
  _row integer primary key,
  "treaty_id" text,
  "group" text,
  "title" text,
  "title_th" text,
  "date" text,
  "source_url" text,
  "summary" text,
  "updated_at" text,
  _synced_at timestamptz not null default now()
);
alter table public.treaties enable row level security;
revoke all on public.treaties from anon, authenticated;
comment on table public.treaties is 'ชีต Treaties ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.login_log (
  _row integer primary key,
  "time" text,
  "username" text,
  "member_id" text,
  "result" text,
  "reason" text,
  "ip" text,
  "location" text,
  "isp" text,
  "device" text,
  "os" text,
  "browser" text,
  _synced_at timestamptz not null default now()
);
alter table public.login_log enable row level security;
revoke all on public.login_log from anon, authenticated;
comment on table public.login_log is 'ชีต LoginLog ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.security (
  _row integer primary key,
  "report_id" text,
  "time" text,
  "type" text,
  "severity" text,
  "member_id" text,
  "username" text,
  "ip" text,
  "location" text,
  "device" text,
  "detail" text,
  "attempts" text,
  "action" text,
  "status" text,
  "pdf_url" text,
  _synced_at timestamptz not null default now()
);
alter table public.security enable row level security;
revoke all on public.security from anon, authenticated;
comment on table public.security is 'ชีต Security ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.error_log (
  _row integer primary key,
  "time" text,
  "member_id" text,
  "where" text,
  "message" text,
  "stack" text,
  "user_agent" text,
  "version" text,
  _synced_at timestamptz not null default now()
);
alter table public.error_log enable row level security;
revoke all on public.error_log from anon, authenticated;
comment on table public.error_log is 'ชีต ErrorLog ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.audit_log (
  _row integer primary key,
  "time" text,
  "member_id" text,
  "action" text,
  "detail" text,
  _synced_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
comment on table public.audit_log is 'ชีต AuditLog ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.config (
  _row integer primary key,
  "key" text,
  "value" text,
  "note" text,
  _synced_at timestamptz not null default now()
);
alter table public.config enable row level security;
revoke all on public.config from anon, authenticated;
comment on table public.config is 'ชีต Config ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.announcements (
  _row integer primary key,
  "id" text,
  "time" text,
  "type" text,
  "title" text,
  "body" text,
  "active" text,
  _synced_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;
comment on table public.announcements is 'ชีต Announcements ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.reports (
  _row integer primary key,
  "time" text,
  "member_id" text,
  "username" text,
  "kind" text,
  "subject" text,
  "detail" text,
  "status" text,
  _synced_at timestamptz not null default now()
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
comment on table public.reports is 'ชีต Reports ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.payments (
  _row integer primary key,
  "time" text,
  "member_id" text,
  "username" text,
  "plan" text,
  "cycle" text,
  "amount" text,
  "status" text,
  "note" text,
  _synced_at timestamptz not null default now()
);
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
comment on table public.payments is 'ชีต Payments ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.sources (
  _row integer primary key,
  "category" text,
  "url" text,
  "parser" text,
  "enabled" text,
  "last_run" text,
  "last_result" text,
  _synced_at timestamptz not null default now()
);
alter table public.sources enable row level security;
revoke all on public.sources from anon, authenticated;
comment on table public.sources is 'ชีต Sources ใน Google Sheets (ข้อมูลต้นฉบับยังอยู่ในชีตเดิม)';
create table if not exists public.sheet_snapshots (
  sheet text not null,
  _row integer not null,
  cells jsonb not null,
  _synced_at timestamptz not null default now(),
  primary key (sheet, _row)
);
alter table public.sheet_snapshots enable row level security;
revoke all on public.sheet_snapshots from anon, authenticated;
comment on table public.sheet_snapshots is 'ชีตสรุป (สรุปผล, สรุปผู้ใช้งาน) เก็บค่าทุกช่องตามแถว';
create table if not exists public.sync_state (
  sheet text primary key,
  rows integer not null default 0,
  last_sync timestamptz not null default now(),
  note text
);
alter table public.sync_state enable row level security;
revoke all on public.sync_state from anon, authenticated;
create index if not exists members_member_id_idx on public.members ("member_id");
create index if not exists members_username_lower_idx on public.members ("username_lower");
create index if not exists sessions_token_hash_idx on public.sessions ("token_hash");
create index if not exists sessions_member_id_idx on public.sessions ("member_id");
create index if not exists sections_law_id_idx on public.sections ("law_id");
create index if not exists sections_section_id_idx on public.sections ("section_id");
create index if not exists laws_law_id_idx on public.laws ("law_id");
create index if not exists config_key_idx on public.config ("key");
create index if not exists chat_member_id_idx on public.chat ("member_id");
create index if not exists login_log_member_id_idx on public.login_log ("member_id");
