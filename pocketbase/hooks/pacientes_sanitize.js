routerAdd(
  'POST',
  '/backend/v1/pacientes/sanitize',
  (e) => {
    if (!e.auth || e.auth.getString('papel') !== 'admin') {
      return e.forbiddenError('Apenas administradores podem executar esta ação.')
    }

    const pacientes = $app.findRecordsByFilter('pacientes', '1=1', '', 10000, 0)
    let count = 0
    const regex = /^\d+\s+/

    $app.runInTransaction((txApp) => {
      for (const p of pacientes) {
        const nome = p.getString('nome')
        if (regex.test(nome)) {
          const novoNome = nome.replace(regex, '').trim()
          if (novoNome.length > 0) {
            p.set('nome', novoNome)
            txApp.save(p)
            count++
          }
        }
      }
    })

    return e.json(200, { corrected: count })
  },
  $apis.requireAuth(),
)
