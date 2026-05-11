onRecordAfterUpdateSuccess((e) => {
  const cirurgia = e.record
  const oldStatus = cirurgia.original().getString('status')
  const newStatus = cirurgia.getString('status')

  if (oldStatus !== 'realizada' && newStatus === 'realizada') {
    const pacienteId = cirurgia.getString('paciente_id')
    const medicoId = cirurgia.getString('medico_id')
    const dataCirurgia = new Date(cirurgia.getString('data_cirurgia'))

    const dias = [10, 30, 90, 180, 365]
    const retornosCol = $app.findCollectionByNameOrId('retornos_automaticos')
    const agendamentosCol = $app.findCollectionByNameOrId('agendamentos')

    dias.forEach((d) => {
      const ret = new Record(retornosCol)
      ret.set('cirurgia_id', cirurgia.id)
      ret.set('dias_apos', d.toString())
      ret.set('tipo_retorno', d <= 30 ? 'presencial' : 'online')
      ret.set('profissional_tipo', 'medico')
      ret.set('status', 'agendado')

      const dataAgendamento = new Date(dataCirurgia)
      dataAgendamento.setDate(dataAgendamento.getDate() + d)
      ret.set('data_agendamento_gerada', dataAgendamento.toISOString())

      $app.save(ret)

      const ag = new Record(agendamentosCol)
      ag.set('paciente_id', pacienteId)
      ag.set('tipo', 'retorno')
      ag.set('data_agendamento', dataAgendamento.toISOString())
      ag.set('profissional_id', medicoId)
      ag.set('status', 'agendado')
      ag.set('cirurgia_id', cirurgia.id)
      ag.set('retorno_automatico_id', ret.id)
      ag.set('observacoes', `Retorno de ${d} dias (Automático)`)

      $app.save(ag)
    })
  }
  e.next()
}, 'cirurgias')
