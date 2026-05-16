migrate(
  (app) => {
    const pacientes = app.findRecordsByFilter('pacientes', '1=1', '', 10000, 0)
    const regex = /^\d+\s+/

    for (const p of pacientes) {
      const nome = p.getString('nome')
      if (regex.test(nome)) {
        const novoNome = nome.replace(regex, '').trim()
        if (novoNome.length > 0) {
          p.set('nome', novoNome)
          app.save(p)
        }
      }
    }
  },
  (app) => {
    // Irreversible data transformation
  },
)
