migrate((app) => {
  const saldos = app.findCollectionByNameOrId('saldo_tratamentos')
  const vendas = app.findCollectionByNameOrId('vendas')
  saldos.fields.add(
    new RelationField({
      name: 'venda_id',
      collectionId: vendas.id,
      cascadeDelete: false,
      maxSelect: 1,
      required: false,
    }),
  )
  app.save(saldos)
})
