import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { formatDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const auditId = searchParams.get('audit_id')
  const certId = searchParams.get('cert_id')
  const all = searchParams.get('all') === 'true'
  const locale = searchParams.get('locale') ?? 'en'

  const supabase = await createClient()

  if (all) {
    // Export all certificates
    const { data: certs } = await supabase
      .from('certificates')
      .select(`*, hotels(name, city, state, mybha_member_id)`)
      .order('issued_date', { ascending: false })

    const rows = (certs ?? []).map((c: any) => ({
      'Certificate No': c.cert_number,
      'Hotel': c.hotels?.name,
      'City': c.hotels?.city,
      'State': c.hotels?.state,
      'MYBHA Member ID': c.hotels?.mybha_member_id,
      'Tier': c.tier.charAt(0).toUpperCase() + c.tier.slice(1),
      'Issued Date': c.issued_date,
      'Expiry Date': c.expiry_date,
      'Status': c.is_active ? 'Active' : 'Revoked',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Certificates')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="mybha-certificates-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  }

  if (auditId) {
    // Export single audit report
    const { data: audit } = await supabase
      .from('audits')
      .select(`*, hotels(*), profiles(full_name)`)
      .eq('id', auditId)
      .single()

    const { data: responses } = await supabase
      .from('audit_responses')
      .select(`*, checklist_items(*)`)
      .eq('audit_id', auditId)

    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      ['MYBHA MyMFH Audit Report'],
      [],
      ['Hotel:', audit?.hotels?.name],
      ['City:', audit?.hotels?.city],
      ['Audit Type:', audit?.audit_type === 'self_audit' ? 'Self-Audit' : 'Conformity Assessment'],
      ['Auditor:', audit?.profiles?.full_name],
      ['Status:', audit?.status],
      ['Date:', audit ? formatDate(audit.created_at, locale) : ''],
      [],
      ['Scoring Summary:'],
      ['Mandatory:', `${audit?.mandatory_passed}/${audit?.mandatory_total}`],
      ['Silver Bonus:', `${audit?.silver_passed}/${audit?.silver_total}`],
      ['Gold Bonus:', `${audit?.gold_passed}/${audit?.gold_total}`],
      ['Achieved Tier:', audit?.tier ? audit.tier.charAt(0).toUpperCase() + audit.tier.slice(1) : 'Not eligible'],
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Checklist sheet
    const checklistRows = (responses ?? []).map((r: any) => ({
      'Code': r.checklist_items?.code,
      'Tier': r.checklist_items?.tier,
      'Category': r.checklist_items?.category,
      'Requirement': r.checklist_items?.label_en,
      'Result': r.passed === true ? 'PASS' : r.passed === false ? 'FAIL' : 'Not Answered',
      'Notes': r.notes ?? '',
      'Photo': r.photo_url ? 'Yes' : 'No',
    }))
    const checklistWs = XLSX.utils.json_to_sheet(checklistRows)
    XLSX.utils.book_append_sheet(wb, checklistWs, 'Checklist')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="audit-${auditId.slice(0, 8)}.xlsx"`,
      },
    })
  }

  return NextResponse.json({ error: 'Provide audit_id, cert_id, or all=true' }, { status: 400 })
}
