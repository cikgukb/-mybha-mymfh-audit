# MYBHA MyMFH Audit System — Setup Guide

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (auth + database + storage)
- Deploy: Vercel (1-click)

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Supabase
1. Create project at supabase.com
2. Copy `.env.example` → `.env.local`
3. Fill in your Supabase URL and keys

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run database migration
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/migrations/001_initial.sql`
3. Click Run

This creates all tables, RLS policies, triggers, storage buckets, and seeds all 34 checklist items.

### 4. Create first admin user
1. Go to Supabase → Authentication → Users → Invite user
2. After user signs in, update their role in SQL:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';
```

### 5. Run dev server
```bash
npm run dev
```
Open http://localhost:3000

---

## User Roles

| Role | Can Do |
|------|--------|
| `admin` | Everything — manage hotels, approve audits, issue certs |
| `auditor` | Conduct conformity assessments, view all hotels |
| `hotel_manager` | Self-audit own hotel, view own certs |

## Certification Tiers

| Tier | Stars | Requirements |
|------|-------|--------------|
| Bronze | ★★★ | All 14 mandatory items pass |
| Silver | ★★★★ | Mandatory + ≥5/8 silver bonus |
| Gold | ★★★★★ | Mandatory + ≥6/8 silver + ≥7/10 gold bonus |

## Checklist Items
- **14 Mandatory** (M01–M14) — required for Bronze
- **8 Silver Bonus** (S01–S08) — required for Silver
- **10 Gold Bonus** (G01–G10) — required for Gold

## Audit Workflow
1. Hotel manager or auditor creates new audit
2. Fill checklist: Pass/Fail per item + notes + photo
3. Progress auto-saves every 2 seconds
4. Submit for review (status → `submitted`)
5. MYBHA admin reviews and approves (issues certificate)
6. Certificate generated with 2-year validity
7. Expiry reminders appear at 90/30/7 days

## Export
- **Certificate PDF**: `/api/certificates/generate?id=CERT_ID&locale=en`
- **Audit Report PDF**: `/api/export/pdf?audit_id=AUDIT_ID` (opens printable page)
- **Excel — Single audit**: `/api/export/excel?audit_id=AUDIT_ID`
- **Excel — All certs**: `/api/export/excel?all=true`

## Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables
4. Deploy

## Languages
Switch UI language using the EN | BM | 中文 | 日本 switcher in the top-right header.
- EN = English
- BM = Bahasa Malaysia
- 中文 = Mandarin Chinese
- 日本 = Japanese
