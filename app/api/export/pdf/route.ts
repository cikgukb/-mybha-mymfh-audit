import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

// Generates a printable HTML audit report
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const auditId = searchParams.get('audit_id')
  const locale = searchParams.get('locale') ?? 'en'

  if (!auditId) return NextResponse.json({ error: 'Missing audit_id' }, { status: 400 })

  const supabase = await createClient()

  const { data: audit } = await supabase
    .from('audits')
    .select(`*, hotels(*), profiles(full_name)`)
    .eq('id', auditId)
    .single()

  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: responses } = await supabase
    .from('audit_responses')
    .select(`*, checklist_items(*)`)
    .eq('audit_id', auditId)
    .order('checklist_items(sort_order)')

  const grouped = {
    mandatory: (responses ?? []).filter((r: any) => r.checklist_items?.tier === 'mandatory'),
    silver: (responses ?? []).filter((r: any) => r.checklist_items?.tier === 'silver'),
    gold: (responses ?? []).filter((r: any) => r.checklist_items?.tier === 'gold'),
  }

  const tierBg: Record<string, string> = {
    gold: '#C9A84C', silver: '#A8A9AD', bronze: '#CD7F32',
  }

  function renderSection(title: string, items: any[], color: string) {
    if (!items.length) return ''
    return `
      <div style="margin-bottom:24px">
        <h3 style="background:${color}22;border-left:4px solid ${color};padding:8px 12px;font-size:13px;color:#333;margin-bottom:12px">${title}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f8f8f8">
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #eee;width:50px">Code</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #eee">Requirement</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #eee;width:80px">Result</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #eee">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((r: any) => `
              <tr style="border-bottom:1px solid #f0f0f0">
                <td style="padding:6px 10px;color:#999;font-family:monospace">${r.checklist_items?.code}</td>
                <td style="padding:6px 10px;color:#333">${r.checklist_items?.label_en}</td>
                <td style="padding:6px 10px;text-align:center">
                  <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;${
                    r.passed === true ? 'background:#dcfce7;color:#16a34a' :
                    r.passed === false ? 'background:#fee2e2;color:#dc2626' :
                    'background:#f3f4f6;color:#9ca3af'
                  }">
                    ${r.passed === true ? '✓ PASS' : r.passed === false ? '✗ FAIL' : '—'}
                  </span>
                </td>
                <td style="padding:6px 10px;color:#666;font-size:11px">${r.notes ?? ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  const tierColor = audit.tier ? tierBg[audit.tier] : '#666'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Audit Report - ${(audit as any).hotels?.name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #333; font-size: 12px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>

<div class="no-print" style="margin-bottom:16px">
  <button onclick="window.print()" style="padding:8px 16px;background:#C9A84C;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">
    🖨 Print / Save as PDF
  </button>
</div>

<div style="border-bottom:2px solid #C9A84C;padding-bottom:16px;margin-bottom:24px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:11px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">MYBHA MyMFH Audit Report</div>
      <h1>${(audit as any).hotels?.name}</h1>
      <div style="color:#666;font-size:12px">${[(audit as any).hotels?.city, (audit as any).hotels?.state].filter(Boolean).join(', ')}</div>
    </div>
    ${audit.tier ? `<div style="background:${tierColor}22;border:1px solid ${tierColor};border-radius:6px;padding:8px 16px;text-align:center">
      <div style="color:${tierColor};font-weight:700;font-size:14px;text-transform:capitalize">${audit.tier} Tier</div>
      <div style="color:${tierColor};font-size:16px">${audit.tier === 'gold' ? '★★★★★' : audit.tier === 'silver' ? '★★★★' : '★★★'}</div>
    </div>` : ''}
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
  ${[
    ['Audit Type', audit.audit_type === 'self_audit' ? 'Self-Audit' : 'Conformity Assessment'],
    ['Auditor', (audit as any).profiles?.full_name],
    ['Date', formatDate(audit.created_at, locale)],
    ['Status', audit.status.replace('_', ' ')],
    ['Mandatory', `${audit.mandatory_passed}/${audit.mandatory_total}`],
    ['Silver Bonus', `${audit.silver_passed}/${audit.silver_total}`],
  ].map(([k, v]) => `
    <div style="background:#f8f8f8;border-radius:6px;padding:10px">
      <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">${k}</div>
      <div style="font-weight:600;color:#333;font-size:12px">${v}</div>
    </div>
  `).join('')}
</div>

${renderSection('Mandatory Requirements (Bronze)', grouped.mandatory, '#ef4444')}
${renderSection('Silver Bonus Items', grouped.silver, '#64748b')}
${renderSection('Gold Bonus Items', grouped.gold, '#C9A84C')}

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
  <span>MYBHA MyMFH Audit System</span>
  <span>Generated ${new Date().toLocaleDateString()}</span>
  <span>Audit ID: ${auditId.slice(0, 8)}...</span>
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
