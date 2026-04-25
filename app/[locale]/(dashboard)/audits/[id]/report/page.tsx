import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { evaluateMFHC, tierLabel, tierStars } from '@/lib/mfhc-scoring'
import { formatDate } from '@/lib/utils'
import PrintButton from '@/components/PrintButton'
import type { MFHCParameter, HotelType } from '@/types/mfhc'

export default async function AuditReportPage({
  params,
}: {
  params: { locale: string; id: string }
}) {
  const supabase = await createClient()
  const isMS = params.locale === 'ms'

  const { data: audit } = await supabase
    .from('audits')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!audit) notFound()

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', audit.hotel_id)
    .maybeSingle()

  const { data: auditor } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', audit.auditor_id)
    .maybeSingle()

  const { data: parameters } = await supabase
    .from('mfhc_parameters')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: responses } = await supabase
    .from('audit_responses')
    .select('*')
    .eq('audit_id', params.id)

  const hotelType: HotelType = (audit.hotel_type ?? hotel?.hotel_type ?? 'type_a') as HotelType

  const respList = (responses ?? []).map((r: any) => ({
    parameter_id: r.parameter_id,
    compliance_level: r.compliance_level,
    notes: r.notes,
    evidence_urls: r.photo_url ? [r.photo_url] : [],
  }))

  const evaluation = evaluateMFHC(
    (parameters ?? []) as MFHCParameter[],
    respList,
    hotelType,
  )

  // Map parameter id → response for evidence/notes display
  const respByParam = new Map<string, any>()
  for (const r of responses ?? []) respByParam.set(r.parameter_id, r)
  const paramById = new Map<string, MFHCParameter>()
  for (const p of (parameters ?? []) as MFHCParameter[]) paramById.set(p.id, p)

  // Group items by section for display
  const sectionItems: Record<number, MFHCParameter[]> = {}
  for (const item of evaluation.items) {
    const param = (parameters ?? []).find((p: any) => p.code === item.code)
    if (!param) continue
    if (!sectionItems[param.section_no]) sectionItems[param.section_no] = []
    sectionItems[param.section_no].push(param)
  }

  const T = isMS ? TXT.ms : TXT.en

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 p-8 print:p-0 print:border-0">
      <style>{`@media print { body { background: white; } }`}</style>

      {/* Header */}
      <div className="border-b-2 border-mybha-gold pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs uppercase tracking-widest text-mybha-gold font-bold">MyBha</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{T.title}</h1>
            <p className="text-sm text-gray-500">{T.subtitle}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{T.auditId}: {audit.id.slice(0, 8)}</p>
            <p>{T.auditDate}: {formatDate(audit.created_at, params.locale)}</p>
          </div>
        </div>
      </div>

      {/* Hotel info */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{T.hotelInfo}</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-1 text-gray-500 w-32">{T.hotelName}</td><td className="font-medium">{hotel?.name}</td></tr>
            <tr><td className="py-1 text-gray-500">{T.address}</td><td>{[hotel?.address, hotel?.city, hotel?.state].filter(Boolean).join(', ')}</td></tr>
            <tr><td className="py-1 text-gray-500">{T.regNo}</td><td>{hotel?.mybha_member_id ?? '—'}</td></tr>
            <tr><td className="py-1 text-gray-500">{T.hotelType}</td><td className="font-medium">{hotelType === 'type_a' ? T.typeA : T.typeB}</td></tr>
            <tr><td className="py-1 text-gray-500">{T.auditor}</td><td>{auditor?.full_name}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Result banner */}
      <section className={`mb-6 p-4 rounded-lg border-2 ${
        evaluation.result === 'rejected' ? 'bg-red-50 border-red-300' :
        evaluation.result === 'not_certified' ? 'bg-gray-50 border-gray-300' :
        evaluation.result === 'five_star' ? 'bg-yellow-50 border-yellow-400' :
        evaluation.result === 'four_star' ? 'bg-amber-50 border-amber-400' :
        'bg-orange-50 border-orange-400'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-600">{T.finalResult}</p>
            <p className="text-2xl font-bold text-gray-900">{tierLabel(evaluation.result, isMS ? 'ms' : 'en')}</p>
            <p className="text-sm text-gray-600 mt-1">{evaluation.reason}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-gray-900">{evaluation.total_score}<span className="text-xl text-gray-400">/100</span></p>
            {tierStars(evaluation.result) > 0 && (
              <p className="text-yellow-500 text-2xl">{'★'.repeat(tierStars(evaluation.result))}</p>
            )}
          </div>
        </div>
      </section>

      {/* Critical compliance status */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{T.criticalStatus}</h2>
        <div className={`p-3 rounded-lg ${
          evaluation.critical_failed ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <p className={`text-sm font-semibold ${evaluation.critical_failed ? 'text-red-700' : 'text-green-700'}`}>
            {evaluation.critical_failed ? `✗ ${T.failed}` : `✓ ${T.passed}`}
          </p>
          {evaluation.critical_failed && (
            <p className="text-xs text-red-600 mt-1">
              {T.failedItems}: {evaluation.failed_critical_items.join(', ')}
            </p>
          )}
        </div>
      </section>

      {/* Section breakdown */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{T.sectionBreakdown}</h2>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">{T.section}</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">{T.earned}</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">{T.total}</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(evaluation.section_scores).map(([sno, score]) => {
              const sectionParam = (parameters ?? []).find((p: any) => p.section_no === Number(sno))
              const title = isMS ? sectionParam?.section_title_ms : sectionParam?.section_title_en
              const pct = score.total > 0 ? Math.round((score.earned / score.total) * 100) : 0
              return (
                <tr key={sno} className="border-t border-gray-100">
                  <td className="px-3 py-2">{sno}. {title}</td>
                  <td className="text-right px-3 py-2 font-medium">{score.earned}</td>
                  <td className="text-right px-3 py-2 text-gray-500">{score.total}</td>
                  <td className="text-right px-3 py-2 text-xs text-gray-500">{pct}%</td>
                </tr>
              )
            })}
            <tr className="bg-mybha-cream font-bold border-t-2 border-mybha-gold">
              <td className="px-3 py-2">{T.totalRow}</td>
              <td className="text-right px-3 py-2">{evaluation.total_score}</td>
              <td className="text-right px-3 py-2">{evaluation.total_possible}</td>
              <td className="text-right px-3 py-2">{Math.round((evaluation.total_score / evaluation.total_possible) * 100)}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Item-level breakdown */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">{T.itemBreakdown}</h2>
        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-2 py-1.5 font-semibold text-gray-600 w-12">#</th>
              <th className="text-left px-2 py-1.5 font-semibold text-gray-600">{T.item}</th>
              <th className="text-center px-2 py-1.5 font-semibold text-gray-600 w-20">{T.level}</th>
              <th className="text-right px-2 py-1.5 font-semibold text-gray-600 w-16">{T.score}</th>
              <th className="text-center px-2 py-1.5 font-semibold text-gray-600 w-16">{T.evidence}</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.items.map((item) => {
              const param = (parameters ?? []).find((p: any) => p.code === item.code)
              const resp = param ? respByParam.get(param.id) : null
              const title = param ? (isMS ? param.title_ms : param.title_en) : item.title
              return (
                <tr key={item.code} className="border-t border-gray-100">
                  <td className="px-2 py-1.5 font-mono text-gray-400">{item.code}</td>
                  <td className="px-2 py-1.5">
                    {title}
                    {item.is_critical && <span className="ml-1 text-[10px] text-red-600 font-semibold">CRITICAL</span>}
                  </td>
                  <td className="text-center px-2 py-1.5">
                    <LevelTag level={item.level} isMS={isMS} />
                  </td>
                  <td className="text-right px-2 py-1.5 font-medium">
                    {item.score}/{item.weight}
                  </td>
                  <td className="text-center px-2 py-1.5">
                    {resp?.photo_url ? (
                      <a href={resp.photo_url} target="_blank" rel="noreferrer" className="text-mybha-gold underline">📎</a>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* Signature */}
      <section className="mt-10 grid grid-cols-2 gap-8 print:break-inside-avoid">
        <div>
          <div className="border-b border-gray-400 mb-1 h-12"></div>
          <p className="text-xs text-gray-500">{T.auditor}: {auditor?.full_name}</p>
          <p className="text-xs text-gray-500">{T.date}: {audit.submitted_at ? formatDate(audit.submitted_at, params.locale) : '—'}</p>
        </div>
        <div>
          <div className="border-b border-gray-400 mb-1 h-12"></div>
          <p className="text-xs text-gray-500">{T.hotelRep}</p>
          <p className="text-xs text-gray-500">{T.date}: ____________</p>
        </div>
      </section>

      {/* Print button */}
      <div className="mt-6 print:hidden flex gap-2">
        <PrintButton label={T.printPdf} />
        <a
          href={`/${params.locale}/audits/${audit.id}`}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
        >
          ← {T.backToAudit}
        </a>
      </div>
    </div>
  )
}

function LevelTag({ level, isMS }: { level: string | null; isMS: boolean }) {
  if (!level) return <span className="text-gray-300">—</span>
  const map: Record<string, { en: string; ms: string; cls: string }> = {
    full: { en: 'Full', ms: 'Penuh', cls: 'bg-green-100 text-green-700' },
    partial: { en: 'Partial', ms: 'Separa', cls: 'bg-amber-100 text-amber-700' },
    non: { en: 'Non', ms: 'Tidak', cls: 'bg-red-100 text-red-700' },
    na: { en: 'N/A', ms: 'TB', cls: 'bg-gray-100 text-gray-600' },
  }
  const v = map[level]
  return <span className={`px-1.5 py-0.5 rounded ${v.cls}`}>{isMS ? v.ms : v.en}</span>
}

const TXT = {
  en: {
    title: 'MFHC Audit Report',
    subtitle: 'Muslim-Friendly Hotel Certification — Verification Audit',
    auditId: 'Audit ID', auditDate: 'Audit Date',
    hotelInfo: 'Hotel Information',
    hotelName: 'Hotel Name', address: 'Address', regNo: 'Registration No.',
    hotelType: 'F&B Classification',
    typeA: 'Type A — Without In-house F&B', typeB: 'Type B — With In-house F&B',
    auditor: 'Auditor', finalResult: 'Final Result',
    criticalStatus: 'Critical Compliance Status',
    failed: 'Failed', passed: 'Passed',
    failedItems: 'Items',
    sectionBreakdown: 'Section Breakdown',
    section: 'Section', earned: 'Earned', total: 'Total', totalRow: 'Total',
    itemBreakdown: 'Item-Level Breakdown',
    item: 'Item', level: 'Level', score: 'Score', evidence: 'Evidence',
    date: 'Date', hotelRep: 'Hotel Representative',
    printPdf: 'Print / Save PDF',
    backToAudit: 'Back to Audit',
  },
  ms: {
    title: 'Laporan Audit MFHC',
    subtitle: 'Pensijilan Hotel Mesra Muslim — Audit Pengesahan',
    auditId: 'ID Audit', auditDate: 'Tarikh Audit',
    hotelInfo: 'Maklumat Hotel',
    hotelName: 'Nama Hotel', address: 'Alamat', regNo: 'No. Pendaftaran',
    hotelType: 'Klasifikasi F&B',
    typeA: 'Jenis A — Tanpa F&B Dalaman', typeB: 'Jenis B — Dengan F&B Dalaman',
    auditor: 'Juruaudit', finalResult: 'Keputusan Akhir',
    criticalStatus: 'Status Pematuhan Kritikal',
    failed: 'Gagal', passed: 'Lulus',
    failedItems: 'Item',
    sectionBreakdown: 'Pecahan Seksyen',
    section: 'Seksyen', earned: 'Diperoleh', total: 'Jumlah', totalRow: 'Jumlah',
    itemBreakdown: 'Pecahan Tahap Item',
    item: 'Item', level: 'Tahap', score: 'Skor', evidence: 'Bukti',
    date: 'Tarikh', hotelRep: 'Wakil Hotel',
    printPdf: 'Cetak / Simpan PDF',
    backToAudit: 'Kembali ke Audit',
  },
}
