onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = record.original()

  if (original.getString('status') !== 'paga' && record.getString('status') === 'paga') {
    const valorTaxa = record.getFloat('valor_taxa')
    if (valorTaxa > 0) {
      const contasPagar = $app.findCollectionByNameOrId('contas_pagar')
      const despesa = new Record(contasPagar)
      despesa.set(
        'descricao',
        `Taxa de Cartão - Parcela ${record.getInt('numero_parcela')} da Venda ${record.getString('venda_id')}`,
      )
      despesa.set('fornecedor', 'Operadora de Cartão')
      despesa.set('valor', valorTaxa)
      despesa.set('status', 'pendente')
      despesa.set('categoria', 'taxas_cartao')
      despesa.set(
        'data_vencimento',
        record.getString('data_pagamento') || new Date().toISOString().split('T')[0],
      )
      $app.save(despesa)
    }
  }
  e.next()
}, 'parcelas_venda')
