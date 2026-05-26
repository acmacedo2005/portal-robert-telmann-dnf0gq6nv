routerAdd(
  'POST',
  '/backend/v1/sanitize-vendas',
  (e) => {
    const vendas = $app.findRecordsByFilter('vendas', '1=1', '', 10000, 0)

    let corrected = 0

    let defaultVendedor = null
    try {
      defaultVendedor = $app.findFirstRecordByFilter('vendedores', '1=1')
    } catch (_) {}

    let defaultServico = null
    try {
      defaultServico = $app.findFirstRecordByFilter('tipos_servico', '1=1')
    } catch (_) {}

    for (const v of vendas) {
      let updated = false

      if (!v.getString('forma_pagamento')) {
        v.set('forma_pagamento', 'Não informado')
        updated = true
      }

      if (!v.getString('novo_vendedor_id') && defaultVendedor) {
        v.set('novo_vendedor_id', defaultVendedor.id)
        updated = true
      }

      if (!v.getString('tipo_servico_id') && defaultServico) {
        v.set('tipo_servico_id', defaultServico.id)
        updated = true
      }

      if (v.getInt('parcelas') === 0) {
        v.set('parcelas', 1)
        updated = true
      }

      const total = v.getFloat('valor_total') || 0
      const entrada = v.getFloat('entrada') || 0
      const parcelas = v.getInt('parcelas') || 1
      const valorParcela = (total - entrada) / parcelas

      if (v.getFloat('valor_parcela') !== valorParcela) {
        v.set('valor_parcela', valorParcela)
        updated = true
      }

      if (updated) {
        $app.saveNoValidate(v)
        corrected++
      }
    }

    const sellers = $app.findRecordsByFilter('vendedores', '1=1', '', 1000, 0)
    const services = $app.findRecordsByFilter('tipos_servico', '1=1', '', 1000, 0)

    return e.json(200, {
      corrected,
      uniqueSellersCreated: sellers.length,
      uniqueServicesCreated: services.length,
      message: 'Correção de vendas concluída',
    })
  },
  $apis.requireAuth(),
)
