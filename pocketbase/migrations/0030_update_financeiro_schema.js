migrate(
  (app) => {
    const faturas = app.findCollectionByNameOrId('faturas')
    const fStatus = faturas.fields.getByName('status')
    if (fStatus && !fStatus.values.includes('parcial')) {
      fStatus.values.push('parcial')
    }

    if (!faturas.fields.getByName('valor_pago')) {
      faturas.fields.add(new NumberField({ name: 'valor_pago', min: 0 }))
    }
    if (!faturas.fields.getByName('saldo_restante')) {
      faturas.fields.add(new NumberField({ name: 'saldo_restante', min: 0 }))
    }
    if (!faturas.fields.getByName('parcelas_restantes')) {
      faturas.fields.add(new NumberField({ name: 'parcelas_restantes', min: 0 }))
    }
    app.save(faturas)

    const contas = app.findCollectionByNameOrId('contas_pagar')
    const cCat = contas.fields.getByName('categoria')
    if (cCat && !cCat.values.includes('taxas_cartao')) {
      cCat.values.push('taxas_cartao')
    }
    app.save(contas)

    const pags = app.findCollectionByNameOrId('pagamentos')
    const pMet = pags.fields.getByName('metodo')
    if (pMet) {
      pMet.values = [
        'cartao',
        'dinheiro',
        'transferencia',
        'pix',
        'cartao_debito',
        'cartao_credito',
        'permuta',
      ]
    }
    app.save(pags)
  },
  (app) => {
    // Down migration not implemented to prevent data loss.
  },
)
