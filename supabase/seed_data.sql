-- ─────────────────────────────────────────
-- SEED: 10 Malaysian Hotels
-- ─────────────────────────────────────────
INSERT INTO public.hotels (id, name, address, city, state, country, phone, email, pic_name, mybha_member_id, total_rooms, is_active)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Hotel Seri Bayu', 'Jalan Ampang, 50450', 'Kuala Lumpur', 'Wilayah Persekutuan', 'Malaysia', '03-21234567', 'info@seribayu.com.my', 'Haji Azman bin Razak', 'MYBHA-2024-001', 85, true),
  ('a1000000-0000-0000-0000-000000000002', 'Perdana Business Hotel', 'No. 12, Jalan Sultan Ismail', 'Kuala Lumpur', 'Wilayah Persekutuan', 'Malaysia', '03-22345678', 'reservations@perdanahotel.com.my', 'Puan Rohani bt Hashim', 'MYBHA-2024-002', 120, true),
  ('a1000000-0000-0000-0000-000000000003', 'Zamrud Inn Penang', 'Lebuh Chulia, 10200', 'George Town', 'Pulau Pinang', 'Malaysia', '04-2612345', 'zamrudinn@gmail.com', 'Encik Faizal Kamarudin', 'MYBHA-2024-003', 60, true),
  ('a1000000-0000-0000-0000-000000000004', 'Hotel Al-Maidah', 'Jalan Dato Keramat, 15000', 'Kota Bharu', 'Kelantan', 'Malaysia', '09-7481234', 'almaidah@hotel.my', 'Tuan Haji Nik Zulkifli', 'MYBHA-2024-004', 45, true),
  ('a1000000-0000-0000-0000-000000000005', 'Impiana Budget Hotel', 'Jalan Munshi Abdullah, 50100', 'Kuala Lumpur', 'Wilayah Persekutuan', 'Malaysia', '03-26781234', 'impiana@budgethotel.my', 'Cik Suriani Mohd Nor', 'MYBHA-2024-005', 72, true),
  ('a1000000-0000-0000-0000-000000000006', 'Selesa Inn Johor Bahru', 'Jalan Wong Ah Fook, 80000', 'Johor Bahru', 'Johor', 'Malaysia', '07-2234567', 'selesainn@jb.my', 'Encik Shahril Nizam', 'MYBHA-2024-006', 55, true),
  ('a1000000-0000-0000-0000-000000000007', 'Hotel Warisan Melaka', 'Jalan Tun Ali, 75000', 'Melaka', 'Melaka', 'Malaysia', '06-2823456', 'warisan@melaka.my', 'Puan Haslinda bt Osman', 'MYBHA-2024-007', 90, true),
  ('a1000000-0000-0000-0000-000000000008', 'Kinabalu Budget Suites', 'Jalan Gaya, 88000', 'Kota Kinabalu', 'Sabah', 'Malaysia', '088-234567', 'kinabalu@suites.my', 'Mr. James Tangau', 'MYBHA-2024-008', 68, true),
  ('a1000000-0000-0000-0000-000000000009', 'Bayu Timur Hotel', 'Jalan Masjid India, 50100', 'Kuala Lumpur', 'Wilayah Persekutuan', 'Malaysia', '03-26921234', 'bayutimur@hotel.my', 'Haji Roslan bin Daud', 'MYBHA-2024-009', 105, true),
  ('a1000000-0000-0000-0000-000000000010', 'De Palma Inn Shah Alam', 'Persiaran Kemajuan, Seksyen 14, 40000', 'Shah Alam', 'Selangor', 'Malaysia', '03-55123456', 'depalma@shahalam.my', 'Puan Azizah bt Mokhtar', 'MYBHA-2024-010', 98, true);

-- ─────────────────────────────────────────
-- SEED: Audits (using admin user as auditor)
-- ─────────────────────────────────────────
DO $$
DECLARE
  v_auditor uuid;
BEGIN
  SELECT id INTO v_auditor FROM public.profiles WHERE role = 'admin' LIMIT 1;

  -- Approved Gold audit — Hotel 1
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at, approved_at, approved_by)
  VALUES ('b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001', v_auditor, 'conformity_assessment', 'approved', 'gold',
    14, 14, 7, 8, 8, 10,
    now() - interval '30 days', now() - interval '25 days', v_auditor);

  -- Approved Silver audit — Hotel 2
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at, approved_at, approved_by)
  VALUES ('b1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002', v_auditor, 'conformity_assessment', 'approved', 'silver',
    14, 14, 6, 8, 3, 10,
    now() - interval '60 days', now() - interval '55 days', v_auditor);

  -- Approved Bronze audit — Hotel 3
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at, approved_at, approved_by)
  VALUES ('b1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003', v_auditor, 'self_audit', 'approved', 'bronze',
    14, 14, 2, 8, 1, 10,
    now() - interval '45 days', now() - interval '40 days', v_auditor);

  -- Approved Gold audit — Hotel 4 (expiring soon — issued 23 months ago)
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at, approved_at, approved_by)
  VALUES ('b1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000004', v_auditor, 'conformity_assessment', 'approved', 'gold',
    14, 14, 8, 8, 9, 10,
    now() - interval '700 days', now() - interval '695 days', v_auditor);

  -- Approved Silver audit — Hotel 5 (expiring soon)
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at, approved_at, approved_by)
  VALUES ('b1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000005', v_auditor, 'self_audit', 'approved', 'silver',
    14, 14, 5, 8, 2, 10,
    now() - interval '680 days', now() - interval '675 days', v_auditor);

  -- Submitted (pending review) — Hotel 6
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at)
  VALUES ('b1000000-0000-0000-0000-000000000006',
    'a1000000-0000-0000-0000-000000000006', v_auditor, 'conformity_assessment', 'submitted', null,
    13, 14, 4, 8, 2, 10,
    now() - interval '2 days');

  -- In progress — Hotel 7
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total)
  VALUES ('b1000000-0000-0000-0000-000000000007',
    'a1000000-0000-0000-0000-000000000007', v_auditor, 'self_audit', 'in_progress', null,
    10, 14, 2, 8, 0, 10);

  -- Approved Bronze — Hotel 8
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at, approved_at, approved_by)
  VALUES ('b1000000-0000-0000-0000-000000000008',
    'a1000000-0000-0000-0000-000000000008', v_auditor, 'conformity_assessment', 'approved', 'bronze',
    14, 14, 3, 8, 1, 10,
    now() - interval '90 days', now() - interval '85 days', v_auditor);

  -- Draft — Hotel 9
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total)
  VALUES ('b1000000-0000-0000-0000-000000000009',
    'a1000000-0000-0000-0000-000000000009', v_auditor, 'self_audit', 'draft',
    0, 14, 0, 8, 0, 10);

  -- Approved Silver — Hotel 10
  INSERT INTO public.audits (id, hotel_id, auditor_id, audit_type, status, tier,
    mandatory_passed, mandatory_total, silver_passed, silver_total, gold_passed, gold_total,
    submitted_at, approved_at, approved_by)
  VALUES ('b1000000-0000-0000-0000-000000000010',
    'a1000000-0000-0000-0000-000000000010', v_auditor, 'conformity_assessment', 'approved', 'silver',
    14, 14, 6, 8, 4, 10,
    now() - interval '15 days', now() - interval '10 days', v_auditor);

END $$;

-- ─────────────────────────────────────────
-- SEED: Certificates for approved audits
-- ─────────────────────────────────────────
DO $$
DECLARE
  v_auditor uuid;
BEGIN
  SELECT id INTO v_auditor FROM public.profiles WHERE role = 'admin' LIMIT 1;

  -- Hotel 1 — Gold cert, 2 years from 25 days ago
  INSERT INTO public.certificates (cert_number, hotel_id, audit_id, tier, issued_date, expiry_date, issued_by)
  VALUES ('MYBHA-G-2026-0001-0001',
    'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
    'gold',
    (current_date - interval '25 days')::date,
    (current_date - interval '25 days' + interval '2 years')::date,
    v_auditor);

  -- Hotel 2 — Silver cert
  INSERT INTO public.certificates (cert_number, hotel_id, audit_id, tier, issued_date, expiry_date, issued_by)
  VALUES ('MYBHA-S-2026-0001-0002',
    'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002',
    'silver',
    (current_date - interval '55 days')::date,
    (current_date - interval '55 days' + interval '2 years')::date,
    v_auditor);

  -- Hotel 3 — Bronze cert
  INSERT INTO public.certificates (cert_number, hotel_id, audit_id, tier, issued_date, expiry_date, issued_by)
  VALUES ('MYBHA-B-2026-0001-0003',
    'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003',
    'bronze',
    (current_date - interval '40 days')::date,
    (current_date - interval '40 days' + interval '2 years')::date,
    v_auditor);

  -- Hotel 4 — Gold cert, expiring in ~35 days (issued 695 days ago)
  INSERT INTO public.certificates (cert_number, hotel_id, audit_id, tier, issued_date, expiry_date, issued_by)
  VALUES ('MYBHA-G-2024-0001-0004',
    'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004',
    'gold',
    (current_date - interval '695 days')::date,
    (current_date + interval '35 days')::date,
    v_auditor);

  -- Hotel 5 — Silver cert, expiring in ~50 days
  INSERT INTO public.certificates (cert_number, hotel_id, audit_id, tier, issued_date, expiry_date, issued_by)
  VALUES ('MYBHA-S-2024-0001-0005',
    'a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005',
    'silver',
    (current_date - interval '675 days')::date,
    (current_date + interval '50 days')::date,
    v_auditor);

  -- Hotel 8 — Bronze cert
  INSERT INTO public.certificates (cert_number, hotel_id, audit_id, tier, issued_date, expiry_date, issued_by)
  VALUES ('MYBHA-B-2026-0001-0008',
    'a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000008',
    'bronze',
    (current_date - interval '85 days')::date,
    (current_date - interval '85 days' + interval '2 years')::date,
    v_auditor);

  -- Hotel 10 — Silver cert
  INSERT INTO public.certificates (cert_number, hotel_id, audit_id, tier, issued_date, expiry_date, issued_by)
  VALUES ('MYBHA-S-2026-0001-0010',
    'a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000010',
    'silver',
    (current_date - interval '10 days')::date,
    (current_date - interval '10 days' + interval '2 years')::date,
    v_auditor);

END $$;
