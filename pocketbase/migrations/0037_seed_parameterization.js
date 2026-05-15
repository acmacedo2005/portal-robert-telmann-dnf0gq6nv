migrate(
  (app) => {
    const formasPag = app.findCollectionByNameOrId('formas_pagamento')
    const defaultFormas = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'permuta']
    for (const f of defaultFormas) {
      try {
        app.findFirstRecordByData('formas_pagamento', 'nome', f)
      } catch (_) {
        const record = new Record(formasPag)
        record.set('nome', f)
        record.set('ativo', true)
        app.save(record)
      }
    }

    const config = app.findCollectionByNameOrId('configuracoes_gerais')
    try {
      app.findFirstRecordByData('configuracoes_gerais', 'comissao_padrao', 10)
    } catch (_) {
      const r = new Record(config)
      r.set('comissao_padrao', 10)
      r.set('taxa_cartao_padrao', 3.5)
      r.set('intervalo_parcelas_padrao', 30)
      r.set('max_parcelas', 12)
      app.save(r)
    }
  },
  (app) => {},
)
