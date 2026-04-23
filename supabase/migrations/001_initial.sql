-- MYBHA MyMFH Audit System — Initial Schema
-- Run this in Supabase SQL editor or via supabase db push

-- Extensions
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
create type checklist_tier as enum ('mandatory', 'silver', 'gold');
create type audit_status as enum ('draft', 'in_progress', 'submitted', 'approved', 'rejected');
create type cert_tier as enum ('bronze', 'silver', 'gold');
create type user_role as enum ('admin', 'auditor', 'hotel_manager');
create type notification_type as enum ('expiry_reminder', 'audit_submitted', 'cert_approved', 'cert_rejected');

-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role user_role not null default 'hotel_manager',
  hotel_id uuid,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.hotels (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  city text,
  state text,
  country text not null default 'Malaysia',
  phone text,
  email text,
  pic_name text,
  mybha_member_id text,
  total_rooms int,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
  add constraint profiles_hotel_id_fkey
  foreign key (hotel_id) references public.hotels (id) on delete set null;

create table public.checklist_items (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  tier checklist_tier not null,
  category text not null,
  label_en text not null,
  label_ms text not null,
  label_ar text,
  description_en text,
  description_ms text,
  description_ar text,
  sort_order int default 0,
  is_active boolean default true
);

create table public.audits (
  id uuid default uuid_generate_v4() primary key,
  hotel_id uuid references public.hotels not null,
  auditor_id uuid references public.profiles not null,
  audit_type text not null check (audit_type in ('self_audit', 'conformity_assessment')),
  status audit_status not null default 'draft',
  tier cert_tier,
  mandatory_passed int not null default 0,
  mandatory_total int not null default 0,
  silver_passed int not null default 0,
  silver_total int not null default 0,
  gold_passed int not null default 0,
  gold_total int not null default 0,
  notes text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.audit_responses (
  id uuid default uuid_generate_v4() primary key,
  audit_id uuid references public.audits on delete cascade not null,
  checklist_item_id uuid references public.checklist_items not null,
  passed boolean,
  notes text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(audit_id, checklist_item_id)
);

create table public.certificates (
  id uuid default uuid_generate_v4() primary key,
  cert_number text unique not null,
  hotel_id uuid references public.hotels not null,
  audit_id uuid references public.audits not null,
  tier cert_tier not null,
  issued_date date not null default current_date,
  expiry_date date not null,
  issued_by uuid references public.profiles not null,
  is_active boolean default true,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  type notification_type not null,
  recipient_id uuid references public.profiles not null,
  hotel_id uuid references public.hotels,
  certificate_id uuid references public.certificates,
  audit_id uuid references public.audits,
  message_en text not null,
  message_ms text,
  message_ar text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index audits_hotel_id_idx on public.audits (hotel_id);
create index audits_status_idx on public.audits (status);
create index audit_responses_audit_id_idx on public.audit_responses (audit_id);
create index certificates_hotel_id_idx on public.certificates (hotel_id);
create index certificates_expiry_date_idx on public.certificates (expiry_date);
create index certificates_is_active_idx on public.certificates (is_active);
create index notifications_recipient_id_idx on public.notifications (recipient_id);
create index notifications_is_read_idx on public.notifications (is_read);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.hotels enable row level security;
alter table public.checklist_items enable row level security;
alter table public.audits enable row level security;
alter table public.audit_responses enable row level security;
alter table public.certificates enable row level security;
alter table public.notifications enable row level security;

-- Helper function
create or replace function public.get_my_role()
returns user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.get_my_hotel_id()
returns uuid language sql security definer stable as $$
  select hotel_id from public.profiles where id = auth.uid()
$$;

-- Profiles policies
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.get_my_role() in ('admin', 'auditor'));

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.get_my_role() = 'admin');

-- Hotels policies
create policy "hotels_select" on public.hotels
  for select using (
    public.get_my_role() in ('admin', 'auditor') or
    id = public.get_my_hotel_id()
  );

create policy "hotels_insert" on public.hotels
  for insert with check (public.get_my_role() = 'admin');

create policy "hotels_update" on public.hotels
  for update using (public.get_my_role() = 'admin');

-- Checklist items: public read
create policy "checklist_items_select" on public.checklist_items
  for select using (true);

create policy "checklist_items_admin" on public.checklist_items
  for all using (public.get_my_role() = 'admin');

-- Audits policies
create policy "audits_select" on public.audits
  for select using (
    public.get_my_role() in ('admin', 'auditor') or
    hotel_id = public.get_my_hotel_id() or
    auditor_id = auth.uid()
  );

create policy "audits_insert" on public.audits
  for insert with check (
    public.get_my_role() in ('admin', 'auditor', 'hotel_manager')
  );

create policy "audits_update" on public.audits
  for update using (
    public.get_my_role() in ('admin', 'auditor') or
    (hotel_id = public.get_my_hotel_id() and status in ('draft', 'in_progress')) or
    auditor_id = auth.uid()
  );

-- Audit responses policies
create policy "audit_responses_select" on public.audit_responses
  for select using (
    exists (
      select 1 from public.audits a
      where a.id = audit_responses.audit_id
      and (
        public.get_my_role() in ('admin', 'auditor') or
        a.hotel_id = public.get_my_hotel_id() or
        a.auditor_id = auth.uid()
      )
    )
  );

create policy "audit_responses_insert" on public.audit_responses
  for insert with check (
    exists (
      select 1 from public.audits a
      where a.id = audit_responses.audit_id
      and (
        public.get_my_role() in ('admin', 'auditor') or
        (a.hotel_id = public.get_my_hotel_id() and a.status in ('draft', 'in_progress')) or
        a.auditor_id = auth.uid()
      )
    )
  );

create policy "audit_responses_update" on public.audit_responses
  for update using (
    exists (
      select 1 from public.audits a
      where a.id = audit_responses.audit_id
      and (
        public.get_my_role() in ('admin', 'auditor') or
        (a.hotel_id = public.get_my_hotel_id() and a.status in ('draft', 'in_progress')) or
        a.auditor_id = auth.uid()
      )
    )
  );

-- Certificates policies
create policy "certificates_select" on public.certificates
  for select using (
    public.get_my_role() in ('admin', 'auditor') or
    hotel_id = public.get_my_hotel_id()
  );

create policy "certificates_insert" on public.certificates
  for insert with check (public.get_my_role() = 'admin');

create policy "certificates_update" on public.certificates
  for update using (public.get_my_role() = 'admin');

-- Notifications policies
create policy "notifications_select" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update using (recipient_id = auth.uid());

-- ─────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'hotel_manager')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at timestamps
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger hotels_updated_at before update on public.hotels
  for each row execute procedure public.touch_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create trigger audits_updated_at before update on public.audits
  for each row execute procedure public.touch_updated_at();

create trigger audit_responses_updated_at before update on public.audit_responses
  for each row execute procedure public.touch_updated_at();

-- Auto-create expiry notifications when cert is issued
create or replace function public.create_expiry_notifications()
returns trigger language plpgsql security definer as $$
declare
  days_until int;
  hotel_manager_id uuid;
  hotel_name text;
begin
  select p.id, h.name
  into hotel_manager_id, hotel_name
  from public.profiles p
  join public.hotels h on h.id = new.hotel_id
  where p.hotel_id = new.hotel_id and p.role = 'hotel_manager'
  limit 1;

  if hotel_manager_id is not null then
    insert into public.notifications (
      type, recipient_id, hotel_id, certificate_id,
      message_en, message_ms
    ) values (
      'cert_approved', hotel_manager_id, new.hotel_id, new.id,
      'Certificate ' || new.cert_number || ' issued for ' || hotel_name || '. Valid until ' || to_char(new.expiry_date, 'DD Mon YYYY') || '.',
      'Sijil ' || new.cert_number || ' dikeluarkan untuk ' || hotel_name || '. Sah sehingga ' || to_char(new.expiry_date, 'DD Mon YYYY') || '.'
    );
  end if;

  return new;
end;
$$;

create trigger on_certificate_created
  after insert on public.certificates
  for each row execute procedure public.create_expiry_notifications();

-- ─────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('audit-photos', 'audit-photos', false)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', true)
on conflict do nothing;

create policy "audit_photos_upload" on storage.objects
  for insert with check (
    bucket_id = 'audit-photos' and auth.uid() is not null
  );

create policy "audit_photos_select" on storage.objects
  for select using (
    bucket_id = 'audit-photos' and auth.uid() is not null
  );

create policy "certificates_public_read" on storage.objects
  for select using (bucket_id = 'certificates');

-- ─────────────────────────────────────────
-- SEED: CHECKLIST ITEMS
-- ─────────────────────────────────────────
insert into public.checklist_items
  (code, tier, category, label_en, label_ms, label_ar, description_en, description_ms, sort_order)
values
-- ── MANDATORY (Bronze) ─────────────────
('M01','mandatory','Room Facilities',
 'Qiblah direction marked in every room',
 'Tanda arah Qiblah di setiap bilik',
 'علامة اتجاه القبلة في كل غرفة',
 'Clear Qiblah direction indicator (sticker, plaque, or arrow) visible in every guest room',
 'Penunjuk arah Qiblah yang jelas (pelekat, plak atau anak panah) kelihatan di setiap bilik tetamu',
 10),

('M02','mandatory','Room Facilities',
 'Bidet or water spray in every bathroom',
 'Bidet atau semburan air di setiap bilik mandi',
 'مرشة مياه في كل حمام',
 'Functional bidet or hand-held water spray (shattaf) available in all bathrooms',
 'Bidet atau semburan air (shattaf) yang berfungsi tersedia di semua bilik mandi',
 20),

('M03','mandatory','Prayer Amenities',
 'Prayer mat available at room or reception',
 'Sejadah tersedia di bilik atau kaunter resepsi',
 'سجادة الصلاة متاحة في الغرفة أو الاستقبال',
 'Clean prayer mats provided in rooms or available upon request at reception',
 'Sejadah bersih disediakan di bilik atau boleh diminta di kaunter resepsi',
 30),

('M04','mandatory','Prayer Amenities',
 'Telekung / prayer shawl available for women',
 'Telekung / kain sembahyang wanita tersedia',
 'شال الصلاة للنساء متاح',
 'Telekung (prayer garment) available for female Muslim guests at room or reception',
 'Telekung tersedia untuk tetamu wanita Muslim di bilik atau kaunter resepsi',
 40),

('M05','mandatory','Reception Services',
 'Daily prayer times displayed at reception',
 'Waktu solat harian dipamerkan di kaunter resepsi',
 'أوقات الصلاة اليومية معروضة في الاستقبال',
 'Current daily prayer timetable displayed prominently at the front desk',
 'Jadual waktu solat harian semasa dipamerkan dengan jelas di kaunter hadapan',
 50),

('M06','mandatory','Food & Beverage',
 'No alcoholic beverages or services provided',
 'Tiada minuman atau perkhidmatan beralkohol disediakan',
 'لا تُقدَّم مشروبات كحولية',
 'Hotel does not serve, sell, or permit alcoholic beverages anywhere on the premises',
 'Hotel tidak menyajikan, menjual atau membenarkan minuman beralkohol di mana-mana di premis',
 60),

('M07','mandatory','Housekeeping',
 'Cleaning schedule maintained for prayer mat and telekung',
 'Jadual pembersihan sejadah dan telekung diselenggarakan',
 'جدول تنظيف سجادة الصلاة والشال محفوظ',
 'Written laundering/cleaning schedule exists and is followed for prayer mats and telekung',
 'Jadual mencuci/membersihkan bertulis wujud dan diikuti untuk sejadah dan telekung',
 70),

('M08','mandatory','Premises Policy',
 'Pets (dogs) not allowed on premises',
 'Haiwan peliharaan (anjing) tidak dibenarkan di premis',
 'الكلاب غير مسموح بها في المبنى',
 'Clear no-dogs policy enforced throughout the property; signage displayed',
 'Dasar tiada anjing yang jelas dikuatkuasakan di seluruh harta; papan tanda dipasang',
 80),

('M09','mandatory','Premises Policy',
 'No nightclub or bar serving alcohol on premises',
 'Tiada kelab malam atau bar yang menyajikan alkohol di premis',
 'لا يوجد نادٍ ليلي أو بار يقدم الكحول',
 'No nightclub, pub, lounge, or alcohol-serving establishment within the hotel property',
 'Tiada kelab malam, pub, lounge atau pertubuhan yang menghidangkan alkohol di dalam premis hotel',
 90),

('M10','mandatory','Staff Welfare',
 'Prayer room or space provided for Muslim staff',
 'Bilik atau ruang solat disediakan untuk kakitangan Muslim',
 'غرفة أو مساحة صلاة للموظفين المسلمين',
 'Dedicated prayer room or clearly designated prayer space available for Muslim employees',
 'Bilik solat khusus atau ruang solat yang jelas tersedia untuk pekerja Muslim',
 100),

('M11','mandatory','Entertainment',
 'TV channels are conservative / family-friendly',
 'Saluran TV adalah konservatif / mesra keluarga',
 'قنوات التلفزيون محافظة وملائمة للعائلة',
 'In-room TV does not include adult, explicit, or inappropriate content channels',
 'TV bilik tidak termasuk saluran kandungan dewasa, lucah atau tidak sesuai',
 110),

('M12','mandatory','Decor & Design',
 'Displayed artwork free from human and animal imagery',
 'Karya seni yang dipamerkan bebas dari imej manusia dan haiwan',
 'الأعمال الفنية المعروضة خالية من صور الإنسان والحيوان',
 'All decorative artwork on walls and common areas does not depict human figures or animals',
 'Semua karya seni hiasan di dinding dan kawasan awam tidak menggambarkan manusia atau haiwan',
 120),

('M13','mandatory','Documentation',
 'Muslim-friendly management policy documented',
 'Dasar pengurusan mesra Muslim didokumenkan',
 'سياسة الإدارة الصديقة للمسلمين موثقة',
 'Written policy document for MyMFH operations exists, is approved by management, and is accessible',
 'Dokumen dasar bertulis untuk operasi MyMFH wujud, diluluskan oleh pihak pengurusan dan boleh diakses',
 130),

('M14','mandatory','Documentation',
 'Staff roles and responsibilities for compliance assigned',
 'Peranan dan tanggungjawab kakitangan untuk pematuhan ditetapkan',
 'تحديد أدوار ومسؤوليات الموظفين للامتثال',
 'Clear written assignment of MyMFH compliance responsibilities to designated personnel',
 'Penugasan bertulis yang jelas tentang tanggungjawab pematuhan MyMFH kepada kakitangan yang ditetapkan',
 140),

-- ── SILVER BONUS ───────────────────────
('S01','silver','Room Facilities',
 'Quran available in every guest room',
 'Al-Quran tersedia di setiap bilik tetamu',
 'القرآن الكريم متاح في كل غرفة',
 'A copy of the Quran (physical or digital) provided in every guest room',
 'Satu salinan Al-Quran (fizikal atau digital) disediakan di setiap bilik tetamu',
 10),

('S02','silver','Decor & Design',
 'Islamic calligraphy decor displayed',
 'Hiasan kaligrafi Islam dipamerkan',
 'ديكور الخط الإسلامي معروض',
 'Islamic calligraphy artwork (free from human/animal imagery) used as decor in rooms or lobby',
 'Karya seni kaligrafi Islam (bebas dari imej manusia/haiwan) digunakan sebagai hiasan di bilik atau lobi',
 20),

('S03','silver','Food & Beverage',
 'Halal food or beverage options available',
 'Pilihan makanan atau minuman halal tersedia',
 'خيارات طعام أو شراب حلال متاحة',
 'Halal food or beverages available at hotel restaurant, café, minibar, or room service',
 'Makanan atau minuman halal tersedia di restoran hotel, kafe, minibar atau perkhidmatan bilik',
 30),

('S04','silver','Prayer Amenities',
 'Separate prayer facilities for male and female guests',
 'Kemudahan solat berasingan untuk tetamu lelaki dan wanita',
 'مرافق صلاة منفصلة للضيوف الذكور والإناث',
 'Separate prayer rooms or designated areas for male and female Muslim guests',
 'Bilik solat berasingan atau kawasan yang ditetapkan untuk tetamu Muslim lelaki dan wanita',
 40),

('S05','silver','Training',
 'Staff Islamic awareness training records maintained',
 'Rekod latihan kesedaran Islam kakitangan diselenggarakan',
 'سجلات تدريب الوعي الإسلامي للموظفين محفوظة',
 'Documented training records showing staff have completed Muslim-friendly hospitality training',
 'Rekod latihan yang didokumenkan menunjukkan kakitangan telah menyelesaikan latihan hospitaliti mesra Muslim',
 50),

('S06','silver','Room Facilities',
 'Additional Islamic amenities provided (qibla compass, prayer beads, Islamic booklet)',
 'Kemudahan Islam tambahan disediakan (kompas qibla, tasbih, buku Islam)',
 'وسائل إسلامية إضافية (بوصلة القبلة، مسبحة، كتيب إسلامي)',
 'Guest rooms include extra Islamic amenities such as a qibla compass, prayer beads (tasbih), or Islamic welcome booklet',
 'Bilik tetamu termasuk kemudahan Islam tambahan seperti kompas qibla, tasbih atau buku alu-aluan Islam',
 60),

('S07','silver','Guest Services',
 'Islamic reading materials available for guests',
 'Bahan bacaan Islam tersedia untuk tetamu',
 'مواد القراءة الإسلامية متاحة للضيوف',
 'Islamic books, booklets, or informational pamphlets available in rooms or at reception',
 'Buku Islam, buku kecil atau risalah maklumat tersedia di bilik atau di kaunter resepsi',
 70),

('S08','silver','Food & Beverage',
 'Halal kitchen certification obtained (if F&B operated)',
 'Pensijilan dapur halal diperoleh (jika F&B dioperasikan)',
 'شهادة المطبخ الحلال (إن وُجدت خدمة الطعام)',
 'Hotel kitchen holds a valid Halal certification from JAKIM or an equivalent recognized authority',
 'Dapur hotel memegang sijil Halal yang sah daripada JAKIM atau pihak berkuasa yang diiktiraf',
 80),

-- ── GOLD BONUS ─────────────────────────
('G01','gold','Guest Services',
 'Arabic language support available for guests',
 'Sokongan bahasa Arab tersedia untuk tetamu',
 'الدعم باللغة العربية متاح للضيوف',
 'Arabic language materials, signage, or staff able to communicate in Arabic for guests',
 'Bahan dalam bahasa Arab, papan tanda, atau kakitangan yang boleh berkomunikasi dalam bahasa Arab untuk tetamu',
 10),

('G02','gold','Room Facilities',
 'Zamzam water available for guests',
 'Air Zamzam tersedia untuk tetamu',
 'ماء زمزم متاح للضيوف',
 'Zamzam water provided in rooms or available for purchase/request by Muslim guests',
 'Air Zamzam disediakan di bilik atau tersedia untuk dibeli/diminta oleh tetamu Muslim',
 20),

('G03','gold','Room Facilities',
 'Wudhu (ablution) facilities provided',
 'Kemudahan wudhu disediakan',
 'مرافق الوضوء متاحة',
 'Dedicated wudhu facilities with appropriate washing areas for ritual purification before prayer',
 'Kemudahan wudhu khusus dengan kawasan basuhan yang sesuai untuk bersuci sebelum solat',
 30),

('G04','gold','Entertainment',
 'Islamic TV channels available (e.g. Al-Hijrah, TV Al-Quran)',
 'Saluran TV Islam tersedia (cth. Al-Hijrah, TV Al-Quran)',
 'قنوات تلفزيونية إسلامية متاحة (مثل الهجرة)',
 'At least one dedicated Islamic television channel available on in-room TV',
 'Sekurang-kurangnya satu saluran televisyen Islam khusus tersedia di TV bilik',
 40),

('G05','gold','Room Facilities',
 'Halal-certified toiletries in guest rooms',
 'Kelengkapan mandi bersijil halal di bilik tetamu',
 'مستلزمات الاستحمام المعتمدة حلالاً في الغرف',
 'Halal-certified personal care products (shampoo, soap, lotion) provided in all guest rooms',
 'Produk penjagaan diri bersijil Halal (syampu, sabun, losyen) disediakan di semua bilik tetamu',
 50),

('G06','gold','Reception Services',
 'Digital / automatic prayer time display system',
 'Sistem paparan waktu solat digital / automatik',
 'نظام عرض أوقات الصلاة الرقمي التلقائي',
 'Automated digital display system showing real-time prayer times prominently in the lobby',
 'Sistem paparan digital automatik yang menunjukkan waktu solat masa nyata dengan jelas di lobi',
 60),

('G07','gold','Guest Services',
 'Islamic concierge service available',
 'Perkhidmatan konsierj Islam tersedia',
 'خدمة الكونسيرج الإسلامي متاحة',
 'Dedicated concierge assistance for Muslim guests: mosque directions, halal dining, Islamic events',
 'Bantuan konsierj khusus untuk tetamu Muslim: arah ke masjid, restoran halal, acara Islam',
 70),

('G08','gold','Room Facilities',
 'Hijab-friendly amenities provided (extra pins, hijab hangers)',
 'Kemudahan mesra hijab disediakan (pin ekstra, penyangkut hijab)',
 'وسائل الراحة الصديقة للحجاب (دبابيس إضافية، علاقات الحجاب)',
 'In-room amenities catering to hijab-wearing guests: extra hair pins, dedicated hijab hangers',
 'Kemudahan bilik yang memenuhi keperluan tetamu berhijab: pin rambut ekstra, penyangkut hijab khusus',
 80),

('G09','gold','Documentation',
 'Communication plan for Muslim guests documented',
 'Pelan komunikasi untuk tetamu Muslim didokumenkan',
 'خطة التواصل مع الضيوف المسلمين موثقة',
 'Written strategy for communicating available Islamic facilities to Muslim guests at check-in and marketing',
 'Strategi bertulis untuk menyampaikan kemudahan Islam yang tersedia kepada tetamu Muslim semasa daftar masuk dan pemasaran',
 90),

('G10','gold','Training',
 'Advanced Islamic hospitality certification completed by staff',
 'Pensijilan hospitaliti Islam lanjutan diselesaikan oleh kakitangan',
 'شهادة الضيافة الإسلامية المتقدمة للموظفين',
 'Key staff have completed an advanced certification program in Islamic hospitality standards',
 'Kakitangan utama telah menyelesaikan program pensijilan lanjutan dalam standard hospitaliti Islam',
 100);
