import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const locale = searchParams.get('locale') ?? 'en'

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: cert } = await supabase
    .from('certificates')
    .select(`*, hotels(*), audits(*), profiles(full_name)`)
    .eq('id', id)
    .single()

  if (!cert) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tierStars: Record<string, string> = { gold: '★★★★★', silver: '★★★★', bronze: '★★★' }
  const tierLabel: Record<string, Record<string, string>> = {
    gold:   { en: 'Gold',   ms: 'Emas',   ar: 'ذهبي' },
    silver: { en: 'Silver', ms: 'Perak',  ar: 'فضي' },
    bronze: { en: 'Bronze', ms: 'Gangsa', ar: 'برونزي' },
  }
  const isArabic = locale === 'ar'

  const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8"/>
<title>MYBHA Certificate - ${cert.cert_number}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: ${isArabic ? "'Noto Sans Arabic'" : "'Cinzel', 'Times New Roman'"}, serif;
    background: #0a0a0a;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }
  .cert {
    background: linear-gradient(135deg, #1a1206 0%, #0d0d0d 40%, #1a1206 100%);
    border: 3px solid #C9A84C;
    border-radius: 8px;
    width: 842px;
    min-height: 595px;
    padding: 50px 60px;
    position: relative;
    color: #f0e6c8;
    box-shadow: 0 0 60px rgba(201,168,76,0.3), inset 0 0 60px rgba(0,0,0,0.5);
  }
  .corner { position: absolute; width: 60px; height: 60px; border-color: #C9A84C; border-style: solid; }
  .tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
  .tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
  .bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
  .br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }
  .header { text-align: center; margin-bottom: 30px; }
  .org-name { color: #C9A84C; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 6px; }
  .title { font-size: 28px; color: #fff; letter-spacing: 2px; margin-bottom: 4px; }
  .subtitle { font-size: 11px; color: #a08040; letter-spacing: 3px; text-transform: uppercase; }
  .divider { border: none; border-top: 1px solid #C9A84C; opacity: 0.4; margin: 20px 0; }
  .cert-body { text-align: center; }
  .certifies { font-size: 11px; color: #a08040; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
  .hotel-name { font-size: 32px; color: #C9A84C; font-weight: 700; margin-bottom: 8px; }
  .hotel-address { font-size: 12px; color: #888; margin-bottom: 20px; }
  .complied { font-size: 11px; color: #a08040; letter-spacing: 1px; margin-bottom: 16px; }
  .tier-block {
    display: inline-block;
    background: linear-gradient(135deg, #2a1f00, #3a2b00);
    border: 1px solid #C9A84C;
    border-radius: 6px;
    padding: 12px 30px;
    margin: 12px 0;
  }
  .tier-label { font-size: 22px; color: #C9A84C; font-weight: 700; letter-spacing: 2px; }
  .tier-stars { font-size: 18px; color: #C9A84C; margin-top: 4px; }
  .cert-number { font-size: 12px; color: #666; font-family: monospace; letter-spacing: 1px; margin: 16px 0 6px; }
  .dates { display: flex; justify-content: center; gap: 60px; margin: 16px 0; font-size: 11px; }
  .date-block { text-align: center; }
  .date-label { color: #888; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .date-val { color: #C9A84C; font-size: 13px; font-weight: 600; }
  .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #555; width: 160px; padding-top: 6px; font-size: 10px; color: #888; }
  .mybha-seal { text-align: center; }
  .seal-ring {
    width: 80px; height: 80px; border-radius: 50%;
    border: 2px solid #C9A84C;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; color: #C9A84C;
    margin: 0 auto;
  }
  .seal-text { font-size: 9px; color: #555; margin-top: 4px; letter-spacing: 1px; }
  @media print {
    body { background: white; }
    .cert { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="cert">
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>

  <div class="header">
    <div class="org-name">Malaysia Budget & Business Hotel Association</div>
    <div class="title">MYBHA MyMFH</div>
    <div class="subtitle">My Muslim Friendly Hotel — Official Recognition Certificate</div>
  </div>

  <hr class="divider"/>

  <div class="cert-body">
    <div class="certifies">This is to certify that</div>
    <div class="hotel-name">${cert.hotels?.name ?? 'Hotel Name'}</div>
    <div class="hotel-address">
      ${[cert.hotels?.address, cert.hotels?.city, cert.hotels?.state, cert.hotels?.country].filter(Boolean).join(', ')}
    </div>
    <div class="complied">has complied with and fulfilled the requirements of the MYBHA MyMFH Recognition Scheme</div>

    <div class="tier-block">
      <div class="tier-label">${tierLabel[cert.tier]?.[locale] ?? tierLabel[cert.tier]?.en} Tier</div>
      <div class="tier-stars">${tierStars[cert.tier]}</div>
    </div>

    <div class="cert-number">Certificate No: ${cert.cert_number}</div>

    <div class="dates">
      <div class="date-block">
        <div class="date-label">Date Issued</div>
        <div class="date-val">${formatDate(cert.issued_date, locale)}</div>
      </div>
      <div class="date-block">
        <div class="date-label">Valid Until</div>
        <div class="date-val">${formatDate(cert.expiry_date, locale)}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="sig-block">
      <div class="sig-line">Authorized Signatory<br/>MYBHA Director</div>
    </div>
    <div class="mybha-seal">
      <div class="seal-ring">★</div>
      <div class="seal-text">MYBHA OFFICIAL</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${cert.profiles?.full_name ?? 'Auditor'}<br/>Certifying Auditor</div>
    </div>
  </div>
</div>

<script>
  window.addEventListener('load', () => window.print())
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
