migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contas_pagar')
    const field = col.fields.getByName('metodo_pagamento')
    if (field) {
      field.values = [
        'cartao',
        'dinheiro',
        'transferencia',
        'pix',
        'cartao_debito',
        'cartao_credito',
      ]
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('contas_pagar')
    const field = col.fields.getByName('metodo_pagamento')
    if (field) {
      field.values = ['cartao', 'dinheiro', 'transferencia']
      app.save(col)
    }
  },
)
