export function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return []

  const separator = lines[0].includes(';') ? ';' : ','
  const parseLine = (line: string) => {
    const res = []
    let cur = '',
      inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes
      else if (line[i] === separator && !inQuotes) {
        res.push(cur)
        cur = ''
      } else cur += line[i]
    }
    res.push(cur)
    return res.map((c) => c.replace(/^"|"$/g, '').trim())
  }

  const headers = parseLine(lines[0]).map((h) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
  )

  const data = []
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i])
    const obj: any = {}
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || ''
    })
    data.push(obj)
  }
  return data
}

export function parseBrCurrency(val: string | number): number {
  if (val === undefined || val === null || val === '') return 0
  if (typeof val === 'number') return Number(val.toFixed(2))
  let clean = val
    .toString()
    .replace(/[R$\s]/g, '')
    .trim()
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : Number(num.toFixed(2))
}

export function parseExcelOrBrDate(val: any): string {
  if (val === null || val === undefined || val === '') return ''
  const strVal = String(val)
  if (/^\d{5}(\.\d+)?$/.test(strVal)) {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + parseFloat(strVal) * 86400000)
    return d.toISOString()
  }
  return parseBrDate(strVal)
}

export function parseBrDate(val: any): string {
  if (val === null || val === undefined || val === '') return ''
  const strVal = String(val)
  const match = strVal.match(/(\d{2})[/-](\d{2})[/-](\d{4})/)
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]} 12:00:00.000Z`
  }
  const isoMatch = strVal.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]} 12:00:00.000Z`
  }
  const d = new Date(strVal)
  if (!isNaN(d.getTime())) {
    return d.toISOString()
  }
  return strVal
}

export function normName(n: any): string {
  if (n === null || n === undefined || n === '') return ''
  return String(n).toLowerCase().trim()
}

export function normPhone(p: any): string {
  if (p === null || p === undefined || p === '') return ''
  return String(p).replace(/\D/g, '')
}

export function getField(row: any, possibleKeys: string[]): string {
  const key = Object.keys(row).find((k) => possibleKeys.some((pk) => k.includes(pk)))
  return key ? String(row[key]) : ''
}
