-- ─────────────────────────────────────────
-- MIGRATION 002: MFHC Questionnaire Engine
-- Wipes legacy audit data and replaces with MFHC parameter-based flow.
-- ─────────────────────────────────────────

-- Step 1: Wipe legacy audit data
truncate table public.audit_responses cascade;
truncate table public.audits cascade;
truncate table public.checklist_items cascade;
-- (certificates kept; will be re-issued from new audits)
truncate table public.certificates cascade;
truncate table public.notifications cascade;

-- Step 2: New enums
do $$ begin
  create type mfhc_compliance_class as enum ('mandatory_critical','mandatory','recommended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mfhc_applies as enum ('both','type_a','type_b');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mfhc_level as enum ('full','partial','non','na');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mfhc_result as enum ('pending','rejected','not_certified','three_star','four_star','five_star');
exception when duplicate_object then null; end $$;

-- Add new tier values to existing cert_tier enum (additive only — Postgres limitation)
alter type cert_tier add value if not exists 'three_star';
alter type cert_tier add value if not exists 'four_star';
alter type cert_tier add value if not exists 'five_star';

-- Step 3: Hotels add hotel_type
alter table public.hotels
  add column if not exists hotel_type text check (hotel_type in ('type_a','type_b'));

-- Step 4: New mfhc_parameters table
create table if not exists public.mfhc_parameters (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  section_no int not null,
  section_title_en text not null,
  section_title_ms text not null,
  title_en text not null,
  title_ms text not null,
  description_en text,
  description_ms text,
  weight numeric(5,2) not null default 0,
  applies_to mfhc_applies not null default 'both',
  compliance_class mfhc_compliance_class not null,
  is_critical boolean not null default false,
  evidence_required text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists mfhc_parameters_section_idx on public.mfhc_parameters (section_no, sort_order);
create index if not exists mfhc_parameters_applies_idx on public.mfhc_parameters (applies_to);

alter table public.mfhc_parameters enable row level security;
create policy "mfhc_parameters_select" on public.mfhc_parameters for select using (true);
create policy "mfhc_parameters_admin" on public.mfhc_parameters for all using (public.get_my_role() = 'admin');

-- Step 5: Alter audit_responses for MFHC
alter table public.audit_responses
  add column if not exists parameter_id uuid references public.mfhc_parameters(id),
  add column if not exists compliance_level mfhc_level,
  add column if not exists item_score numeric(6,2);

-- Drop unique(audit_id, checklist_item_id) since checklist_item_id now unused
alter table public.audit_responses drop constraint if exists audit_responses_audit_id_checklist_item_id_key;
alter table public.audit_responses alter column checklist_item_id drop not null;
alter table public.audit_responses alter column passed drop not null;
alter table public.audit_responses
  add constraint audit_responses_audit_param_unique unique (audit_id, parameter_id);

-- Step 6: Alter audits for MFHC scoring
alter table public.audits
  add column if not exists hotel_type text check (hotel_type in ('type_a','type_b')),
  add column if not exists total_score numeric(6,2),
  add column if not exists section_scores jsonb,
  add column if not exists critical_failed boolean not null default false,
  add column if not exists failed_critical_items text[],
  add column if not exists mfhc_result mfhc_result default 'pending';

-- Step 7: Evidence files
create table if not exists public.audit_evidence (
  id uuid primary key default uuid_generate_v4(),
  audit_response_id uuid references public.audit_responses on delete cascade not null,
  file_url text not null,
  file_type text,
  filename text,
  uploaded_by uuid references public.profiles,
  created_at timestamptz default now()
);

create index if not exists audit_evidence_response_idx on public.audit_evidence (audit_response_id);

alter table public.audit_evidence enable row level security;

create policy "audit_evidence_select" on public.audit_evidence
  for select using (
    exists (
      select 1 from public.audit_responses ar
      join public.audits a on a.id = ar.audit_id
      where ar.id = audit_evidence.audit_response_id
      and (
        public.get_my_role() in ('admin','auditor') or
        a.hotel_id = public.get_my_hotel_id() or
        a.auditor_id = auth.uid()
      )
    )
  );

create policy "audit_evidence_insert" on public.audit_evidence
  for insert with check (
    exists (
      select 1 from public.audit_responses ar
      join public.audits a on a.id = ar.audit_id
      where ar.id = audit_evidence.audit_response_id
      and (
        public.get_my_role() in ('admin','auditor') or
        (a.hotel_id = public.get_my_hotel_id() and a.status in ('draft','in_progress')) or
        a.auditor_id = auth.uid()
      )
    )
  );

create policy "audit_evidence_delete" on public.audit_evidence
  for delete using (
    exists (
      select 1 from public.audit_responses ar
      join public.audits a on a.id = ar.audit_id
      where ar.id = audit_evidence.audit_response_id
      and (
        public.get_my_role() in ('admin','auditor') or
        (a.hotel_id = public.get_my_hotel_id() and a.status in ('draft','in_progress')) or
        a.auditor_id = auth.uid()
      )
    )
  );

-- Step 8: Storage bucket for evidence
insert into storage.buckets (id, name, public)
values ('audit-evidence', 'audit-evidence', false)
on conflict do nothing;

drop policy if exists "audit_evidence_upload" on storage.objects;
create policy "audit_evidence_upload" on storage.objects
  for insert with check (bucket_id = 'audit-evidence' and auth.uid() is not null);

drop policy if exists "audit_evidence_read" on storage.objects;
create policy "audit_evidence_read" on storage.objects
  for select using (bucket_id = 'audit-evidence' and auth.uid() is not null);

-- ─────────────────────────────────────────
-- SEED MFHC PARAMETERS
-- Total: 100 points across 8 sections
-- ─────────────────────────────────────────
insert into public.mfhc_parameters
  (code, section_no, section_title_en, section_title_ms, title_en, title_ms,
   description_en, description_ms, weight, applies_to, compliance_class, is_critical,
   evidence_required, sort_order)
values
-- Section 1: Guest Room Religious Facilitation (20)
('1.1', 1, 'Guest Room Religious Facilitation', 'Kemudahan Keagamaan Bilik Tetamu',
 'Qiblah Direction Indicator', 'Penunjuk Arah Qiblah',
 'Each guest room must clearly display the Qiblah direction. Permanent marker in visible location.',
 'Setiap bilik tetamu mesti memaparkan arah Qiblah dengan jelas. Penanda kekal di lokasi yang mudah dilihat.',
 5, 'both', 'mandatory', false, 'photo,checklist', 110),

('1.2', 1, 'Guest Room Religious Facilitation', 'Kemudahan Keagamaan Bilik Tetamu',
 'Bidet / Water Facility for Istinja', 'Bidet / Kemudahan Air untuk Istinja',
 'Bathroom must be equipped with bidet spray or equivalent functional installation.',
 'Bilik mandi mesti dilengkapi dengan semburan bidet atau pemasangan setara yang berfungsi.',
 5, 'both', 'mandatory', false, 'photo', 120),

('1.3', 1, 'Guest Room Religious Facilitation', 'Kemudahan Keagamaan Bilik Tetamu',
 'Prayer Mat (Sejadah)', 'Sejadah',
 'Must be available to Muslim guests. In-room or upon request.',
 'Mesti tersedia untuk tetamu Muslim. Di bilik atau atas permintaan.',
 5, 'both', 'mandatory', false, 'photo,sop', 130),

('1.4', 1, 'Guest Room Religious Facilitation', 'Kemudahan Keagamaan Bilik Tetamu',
 'Telekung / Prayer Garment', 'Telekung',
 'Available for female Muslim guests. In-room or upon request.',
 'Tersedia untuk tetamu wanita Muslim. Di bilik atau atas permintaan.',
 5, 'both', 'mandatory', false, 'photo,inventory', 140),

-- Section 2: Public Area Religious Information (5)
('2.1', 2, 'Public Area Religious Information', 'Maklumat Keagamaan Kawasan Awam',
 'Prayer Time Display', 'Paparan Waktu Solat',
 'Daily prayer times displayed via digital display or printed QR code linking to local prayer time information (updated daily).',
 'Waktu solat harian dipaparkan melalui paparan digital atau kod QR bercetak yang dipautkan ke maklumat waktu solat tempatan (dikemas kini setiap hari).',
 5, 'both', 'mandatory', false, 'photo', 210),

-- Section 3 Type A: F&B (25 points, no in-house F&B)
('3.1.1', 3, 'F&B Compliance', 'Pematuhan F&B',
 'Halal External Sourcing Policy (Type A)', 'Dasar Sumber Luaran Halal (Jenis A)',
 'Only halal-certified products or vendors allowed. Example: mineral water, drinking water, coffee bean supplier.',
 'Hanya produk atau vendor bersijil halal dibenarkan. Contoh: air mineral, air minuman, pembekal kopi.',
 15, 'type_a', 'mandatory_critical', true, 'vendor_list,certs', 311),

('3.1.2', 3, 'F&B Compliance', 'Pematuhan F&B',
 'Food Handling Control (Type A)', 'Kawalan Pengendalian Makanan (Jenis A)',
 'No contamination during receiving / handling.',
 'Tiada pencemaran semasa penerimaan / pengendalian.',
 5, 'type_a', 'mandatory', false, 'sop', 312),

('3.1.3', 3, 'F&B Compliance', 'Pematuhan F&B',
 'Guest Transparency Notice (Type A)', 'Notis Ketelusan Tetamu (Jenis A)',
 'Guests informed food is externally sourced. Notice posted in room or reception.',
 'Tetamu dimaklumkan makanan diperoleh dari sumber luar. Notis dipamerkan di bilik atau resepsi.',
 5, 'type_a', 'mandatory', false, 'notice_photo', 313),

-- Section 3 Type B: F&B (25 points, with in-house F&B)
('3.2.1', 3, 'F&B Compliance', 'Pematuhan F&B',
 'Halal Certification for In-House F&B', 'Pensijilan Halal F&B Dalaman',
 'In-house café/kitchen must obtain valid halal certification from JAKIM.',
 'Kafe/dapur dalaman mesti memperoleh pensijilan halal sah daripada JAKIM.',
 15, 'type_b', 'mandatory_critical', true, 'halal_cert', 321),

('3.2.2', 3, 'F&B Compliance', 'Pematuhan F&B',
 'Halal External Sourcing Policy (Type B)', 'Dasar Sumber Luaran Halal (Jenis B)',
 'Only halal-certified products or vendors allowed for items beyond in-house café/kitchen.',
 'Hanya produk atau vendor bersijil halal dibenarkan untuk item selain kafe/dapur dalaman.',
 5, 'type_b', 'mandatory_critical', true, 'vendor_list,certs', 322),

('3.2.3', 3, 'F&B Compliance', 'Pematuhan F&B',
 'No Non-Halal Minibar Items', 'Tiada Item Minibar Bukan Halal',
 'Minibar and rooms must not contain non-halal consumables.',
 'Minibar dan bilik tidak boleh mengandungi barangan tidak halal.',
 5, 'type_b', 'mandatory_critical', true, 'policy', 323),

-- Section 4: Hygiene & Religious Article Management (10)
('4.1', 4, 'Hygiene & Religious Article Management', 'Pengurusan Kebersihan & Bahan Keagamaan',
 'Cleaning & Hygiene Schedule', 'Jadual Pembersihan & Kebersihan',
 'Regular cleaning of prayer items with documented schedule.',
 'Pembersihan berkala bahan solat dengan jadual yang didokumenkan.',
 10, 'both', 'mandatory', false, 'cleaning_log,sop', 410),

-- Section 5: Premise Policy Compliance (15)
('5.1', 5, 'Premise Policy Compliance', 'Pematuhan Dasar Premis',
 'No Dogs Allowed Policy', 'Dasar Tiada Anjing',
 'Dogs not allowed in premises. Clear signage and policy.',
 'Anjing tidak dibenarkan di premis. Papan tanda dan dasar yang jelas.',
 5, 'both', 'mandatory_critical', true, 'policy,signage', 510),

('5.2', 5, 'Premise Policy Compliance', 'Pematuhan Dasar Premis',
 'Alcohol-Free Policy', 'Dasar Bebas Alkohol',
 'No alcohol provided or served. No alcohol in menu or minibar.',
 'Tiada alkohol disediakan atau dihidangkan. Tiada alkohol dalam menu atau minibar.',
 5, 'both', 'mandatory_critical', true, 'menu,declaration', 520),

('5.3', 5, 'Premise Policy Compliance', 'Pematuhan Dasar Premis',
 'No Nightclub / Bar Serving Alcohol', 'Tiada Kelab Malam / Bar Beralkohol',
 'No alcohol-based entertainment outlets in premises.',
 'Tiada outlet hiburan beralkohol di premis.',
 5, 'both', 'mandatory_critical', true, 'declaration,facility_photo', 530),

-- Section 6: Staff Religious Facilitation (10)
('6.1', 6, 'Staff Religious Facilitation', 'Kemudahan Keagamaan Kakitangan',
 'Prayer Space for Muslim Staff', 'Ruang Solat untuk Kakitangan Muslim',
 'Dedicated prayer area for Muslim staff. Clean, designated space.',
 'Kawasan solat khusus untuk kakitangan Muslim. Ruang yang bersih dan ditetapkan.',
 10, 'both', 'mandatory', false, 'photo', 610),

-- Section 7: Media & Content Compliance (5)
('7.1', 7, 'Media & Content Compliance', 'Pematuhan Media & Kandungan',
 'Conservative TV Channels', 'Saluran TV Konservatif',
 'No explicit / adult content channels.',
 'Tiada saluran kandungan eksplisit / dewasa.',
 2, 'both', 'mandatory', false, 'channel_list', 710),

('7.2', 7, 'Media & Content Compliance', 'Pematuhan Media & Kandungan',
 'Artwork & Visual Display Compliance', 'Pematuhan Karya Seni & Paparan Visual',
 'No human/animal imagery. Abstract / geometric designs.',
 'Tiada imej manusia/haiwan. Reka bentuk abstrak / geometri.',
 3, 'both', 'mandatory', false, 'photo', 720),

-- Section 8: Governance & Transparency (10 mandatory + 0 recommended)
('8.1', 8, 'Governance & Transparency', 'Tadbir Urus & Ketelusan',
 'Qiblah Accuracy Verification', 'Pengesahan Ketepatan Qiblah',
 'Verified using reliable method (Qiblah finder).',
 'Disahkan menggunakan kaedah yang boleh dipercayai (pencari Qiblah).',
 3, 'both', 'mandatory', false, 'photo', 810),

('8.2', 8, 'Governance & Transparency', 'Tadbir Urus & Ketelusan',
 'Complaint & Shariah Feedback Mechanism', 'Mekanisme Aduan & Maklum Balas Syariah',
 'Guests able to report non-compliance via QR / feedback system.',
 'Tetamu dapat melaporkan ketidakpatuhan melalui QR / sistem maklum balas.',
 4, 'both', 'mandatory', false, 'photo', 820),

('8.3', 8, 'Governance & Transparency', 'Tadbir Urus & Ketelusan',
 'MyBHA Certification Display & Transparency', 'Paparan Pensijilan MyBHA & Ketelusan',
 'Certificate or QR verification displayed.',
 'Sijil atau pengesahan QR dipamerkan.',
 3, 'both', 'mandatory', false, 'photo', 830),

('8.4', 8, 'Governance & Transparency', 'Tadbir Urus & Ketelusan',
 'Ramadan Facilitation', 'Kemudahan Ramadan',
 'Sahur arrangement and Iftar support (recommended).',
 'Pengaturan Sahur dan sokongan Iftar (disyorkan).',
 0, 'both', 'recommended', false, null, 840),

('8.5', 8, 'Governance & Transparency', 'Tadbir Urus & Ketelusan',
 'Gender Sensitivity Practices', 'Amalan Kepekaan Jantina',
 'Optional separate facilities / timings (recommended).',
 'Kemudahan / waktu berasingan pilihan (disyorkan).',
 0, 'both', 'recommended', false, null, 850),

('8.6', 8, 'Governance & Transparency', 'Tadbir Urus & Ketelusan',
 'Modest Staff Dress Code', 'Kod Pakaian Kakitangan Sopan',
 'Appropriate attire aligned with Muslim-friendly standards (recommended).',
 'Pakaian yang sesuai selaras dengan standard mesra Muslim (disyorkan).',
 0, 'both', 'recommended', false, null, 860);
