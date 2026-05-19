export function exportToCsv(filename, rows, columns) {
  const header = columns.map((c) => c.label).join(';')
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = c.get(row)
          const str = val == null ? '' : String(val)
          return `"${str.replace(/"/g, '""')}"`
        })
        .join(';'),
    )
    .join('\n')

  const blob = new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
