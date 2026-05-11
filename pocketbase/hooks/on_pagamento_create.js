onRecordAfterCreateSuccess((e) => {
  const pagamento = e.record
  const faturaId = pagamento.getString('fatura_id')
  const valorPago = pagamento.getFloat('valor_pago')

  const fatura = $app.findRecordById('faturas', faturaId)
  const cirurgiaId = fatura.getString('cirurgia_id')
  const cirurgia = $app.findRecordById('cirurgias', cirurgiaId)

  const saldoAtual = cirurgia.getFloat('saldo_restante')
  const novoSaldo = Math.max(0, saldoAtual - valorPago)
  cirurgia.set('saldo_restante', novoSaldo)
  $app.save(cirurgia)

  fatura.set('status', 'paga')
  fatura.set('data_pagamento', pagamento.getString('data_pagamento'))
  $app.save(fatura)

  e.next()
}, 'pagamentos')
