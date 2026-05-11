onRecordAfterCreateSuccess((e) => {
  const cirurgia = e.record

  const vendasCol = $app.findCollectionByNameOrId('vendas')
  const venda = new Record(vendasCol)

  const valorTotal = cirurgia.getFloat('valor_total')
  const entrada = cirurgia.getFloat('entrada_paga')

  venda.set('paciente_id', cirurgia.getString('paciente_id'))
  venda.set('tipo', 'cirurgia')
  venda.set('valor_total', valorTotal)
  venda.set('valor_final', valorTotal)
  venda.set('entrada_paga', entrada)
  venda.set('saldo_restante', Math.max(0, valorTotal - entrada))
  venda.set('status', entrada >= valorTotal ? 'paga' : entrada > 0 ? 'parcial' : 'pendente')
  venda.set('data_venda', cirurgia.getString('created'))
  venda.set('data_cirurgia', cirurgia.getString('data_cirurgia'))
  venda.set('observacoes', 'Gerado automaticamente pela cirurgia ' + cirurgia.id)

  $app.save(venda)

  e.next()
}, 'cirurgias')
