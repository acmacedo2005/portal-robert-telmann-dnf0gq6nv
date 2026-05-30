migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('lancamentos_financeiros')

    try {
      col.removeIndex('idx_lancamentos_hash')
    } catch (e) {}

    if (col.fields.getByName('hash')) {
      col.fields.removeByName('hash')
    }

    if (!col.fields.getByName('paciente_fornecedor')) {
      col.fields.add(new TextField({ name: 'paciente_fornecedor' }))
    }

    if (!col.fields.getByName('cliente_id')) {
      col.fields.add(
        new RelationField({
          name: 'cliente_id',
          collectionId: app.findCollectionByNameOrId('pacientes').id,
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('conta_receber_id')) {
      col.fields.add(
        new RelationField({
          name: 'conta_receber_id',
          collectionId: app.findCollectionByNameOrId('contas_receber').id,
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('conta_pagar_id')) {
      col.fields.add(
        new RelationField({
          name: 'conta_pagar_id',
          collectionId: app.findCollectionByNameOrId('contas_pagar').id,
          maxSelect: 1,
        }),
      )
    }

    const tipoField = col.fields.getByName('tipo')
    if (tipoField && tipoField.type === 'select') {
      tipoField.values = ['REVENUE', 'EXPENSE', 'Receita', 'Despesa']
    }

    app.save(col)
  },
  (app) => {
    // no down logic
  },
)
