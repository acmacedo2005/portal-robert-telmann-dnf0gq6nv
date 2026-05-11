onRecordAfterCreateSuccess((e) => {
  const tratamento = e.record
  const pacienteId = tratamento.getString('paciente_id')
  const tipo = tratamento.getString('tipo_tratamento')
  const sessoes = tratamento.getInt('sessoes_total')
  const dataInicio = tratamento.getString('data_inicio')

  if (sessoes > 0) {
    const colSaldo = $app.findCollectionByNameOrId('saldo_tratamentos')
    const saldo = new Record(colSaldo)
    saldo.set('paciente_id', pacienteId)
    saldo.set('tipo_tratamento', tipo)
    saldo.set('sessoes_total', sessoes)
    saldo.set('sessoes_realizadas', 0)
    saldo.set('sessoes_restantes', sessoes)
    saldo.set('incluido_no_pacote', false)
    saldo.set('status', 'ativo')
    $app.save(saldo)

    if (dataInicio) {
      const agCol = $app.findCollectionByNameOrId('agendamentos')
      const ag = new Record(agCol)
      ag.set('paciente_id', pacienteId)
      ag.set('tipo', tipo)
      ag.set('data_agendamento', dataInicio)
      ag.set('status', 'agendado')
      ag.set('tratamento_id', tratamento.id)
      ag.set('saldo_tratamento_id', saldo.id)
      ag.set('observacoes', 'Sessão inicial gerada automaticamente')

      let profId = ''
      try {
        const profs = $app.findRecordsByFilter(
          'users',
          "papel = 'enfermagem' || papel = 'admin'",
          'created',
          1,
          0,
        )
        if (profs.length > 0) profId = profs[0].id
      } catch (_) {}
      if (profId) ag.set('profissional_id', profId)

      $app.save(ag)
    }
  }
  e.next()
}, 'tratamentos')
