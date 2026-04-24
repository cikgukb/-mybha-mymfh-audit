-- Replace Arabic localization columns with Mandarin (zh) and Japanese (ja)

-- ── checklist_items ─────────────────────────
alter table public.checklist_items add column if not exists label_zh text;
alter table public.checklist_items add column if not exists label_ja text;
alter table public.checklist_items add column if not exists description_zh text;
alter table public.checklist_items add column if not exists description_ja text;

alter table public.checklist_items drop column if exists label_ar;
alter table public.checklist_items drop column if exists description_ar;

-- ── notifications ───────────────────────────
alter table public.notifications add column if not exists message_zh text;
alter table public.notifications add column if not exists message_ja text;

alter table public.notifications drop column if exists message_ar;
