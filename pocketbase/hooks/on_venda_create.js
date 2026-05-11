onRecordAfterCreateSuccess((e) => {
  const venda = e.record
  const pacienteId = venda.get('paciente_id')
  const tipo = venda.getString('tipo')
  const entrada = venda.getFloat('entrada_paga')
  const saldo = venda.getFloat('saldo_restante')
  const parcelas = venda.getInt('parcelas') || 1
  const dataVendaStr = venda.getString('data_venda')

  if (!dataVendaStr) return e.next()

  const createFatura = (valor, dataVenc, status, tipoParcela, numParcela) => {
    const col = $app.findCollectionByNameOrId('faturas')
    const f = new Record(col)
    f.set('venda_id', venda.id)
    f.set('paciente_id', pacienteId)
    f.set('valor', valor)
    f.set('data_vencimento', dataVenc)
    f.set('status', status)
    f.set('tipo_parcela', tipoParcela)
    f.set('numero_parcela', numParcela)
    $app.save(f)
  }

  if (entrada > 0) {
    createFatura(entrada, dataVendaStr, 'paga', 'entrada', 1)
  }

  if (saldo > 0) {
    const valorParcela = saldo / parcelas
    const d = new Date(dataVendaStr)
    for (let i = 1; i <= parcelas; i++) {
      d.setMonth(d.getMonth() + 1)
      const nextDateStr = d.toISOString().split('T')[0] + ' 12:00:00.000Z'
      createFatura(valorParcela, nextDateStr, 'pendente', parcelas > 1 ? 'parcelada' : 'saldo', i)
    }
  }

  if (tipo === 'tratamento' || tipo === 'cirurgia_tratamento') {
    const meso = venda.getInt('sessoes_meso')
    const prp = venda.getInt('sessoes_prp')
    const botox = venda.getInt('sessoes_botox')

    const createSaldo = (tipoTratamento, sessoes) => {
      if (sessoes > 0) {
        const col = $app.findCollectionByNameOrId('saldo_tratamentos')
        const r = new Record(col)
        r.set('venda_id', venda.id)
        r.set('paciente_id', pacienteId)
        r.set('tipo_tratamento', tipoTratamento)
        r.set('sessoes_total', sessoes)
        r.set('sessoes_realizadas', 0)
        r.set('sessoes_restantes', sessoes)
        r.set('status', 'ativo')
        $app.save(r)
      }
    }
    createSaldo('meso', meso)
    createSaldo('prp', prp)
    createSaldo('botox', botox)
  }

  const dataCirurgia = venda.getString('data_cirurgia')
  if ((tipo === 'cirurgia' || tipo === 'cirurgia_tratamento') && dataCirurgia) {
    const col = $app.findCollectionByNameOrId('agendamentos')
    const ag = new Record(col)
    ag.set('paciente_id', pacienteId)
    ag.set('tipo', 'cirurgia')
    ag.set('data_agendamento', dataCirurgia)

    let profId = ''
    try {
      const medics = $app.findRecordsByFilter(
        'users',
        "papel = 'medico' || papel = 'admin'",
        'created',
        1,
        0,
      )
      if (medics.length > 0) profId = medics[0].id
    } catch (_) {}

    if (profId) {
      ag.set('profissional_id', profId)
      ag.set('status', 'rascunho')
      ag.set('observacoes', 'Gerado pela venda: ' + venda.id)
      $app.save(ag)
    }
  }

  e.next()
}, 'vendas')
