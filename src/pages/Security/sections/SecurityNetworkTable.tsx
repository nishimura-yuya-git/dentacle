import type { NetworkAllowRow } from '@/pages/Security/securityCopy'

export function SecurityNetworkTable({ rows }: { rows: NetworkAllowRow[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-left text-[15px]">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500">
          <tr>
            <th className="px-4 py-3">接続先</th>
            <th className="px-4 py-3">用途</th>
            <th className="px-4 py-3">必要になる場面</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.endpoint} className="border-t border-slate-100">
              <td className="px-4 py-3 font-bold text-slate-800">{row.endpoint}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{row.purpose}</td>
              <td className="px-4 py-3 font-medium text-slate-600">{row.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
