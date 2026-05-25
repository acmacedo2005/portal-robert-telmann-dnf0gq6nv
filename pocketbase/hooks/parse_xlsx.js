// @deps xlsx@0.18.5
routerAdd(
  'POST',
  '/backend/v1/parse-xlsx',
  (e) => {
    const xlsx = require('xlsx')
    const body = e.requestInfo().body
    if (!body || !body.file) return e.badRequestError('No file provided')

    try {
      const workbook = xlsx.read(body.file, { type: 'base64' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false })

      return e.json(200, data)
    } catch (err) {
      return e.badRequestError('Failed to parse Excel file: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
