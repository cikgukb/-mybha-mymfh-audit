'use client'

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-mybha-gold text-white text-sm font-medium rounded-lg"
    >
      🖨 {label}
    </button>
  )
}
