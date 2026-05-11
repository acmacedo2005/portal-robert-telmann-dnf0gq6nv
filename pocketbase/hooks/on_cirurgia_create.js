onRecordAfterCreateSuccess((e) => {
  const cirurgia = e.record
  const faturas = $app.findCollectionByNameOrId('faturas')

  const entrada = cirurgia.getFloat('entrada_paga')
  const valorTotal = cirurgia.getFloat('valor_total')
  const saldoRestante = cirurgia.getFloat('saldo_restante')

  if (entrada > 0) {
    const fEntrada = new Record(faturas)
    fEntrada.set('cirurgia_id', cirurgia.id)
    fEntrada.set('paciente_id', cirurgia.getString('paciente_id'))
    fEntrada.set('valor', entrada)
    fEntrada.set('data_vencimento', cirurgia.getString('data_cirurgia'))
    fEntrada.set('status', 'paga') // assumindo que a entrada já foi paga no ato
    fEntrada.set('data_pagamento', cirurgia.getString('created'))
    fEntrada.set('tipo_parcela', 'entrada')
    fEntrada.set('numero_parcela', 1)
    $app.save(fEntrada)
  }

  if (saldoRestante > 0) {
    const fSaldo = new Record(faturas)
    fSaldo.set('cirurgia_id', cirurgia.id)
    fSaldo.set('paciente_id', cirurgia.getString('paciente_id'))
    fSaldo.set('valor', saldoRestante)
    fSaldo.set('data_vencimento', cirurgia.getString('data_cirurgia'))
    fSaldo.set('status', 'pendente')
    fSaldo.set('tipo_parcela', 'saldo')
    fSaldo.set('numero_parcela', 1)
    $app.save(fSaldo)
  }

  e.next()
}, 'cirurgias')
