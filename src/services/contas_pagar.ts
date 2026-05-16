import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface ContaPagar extends RecordModel {
  descricao: string
  fornecedor: string
  valor: number
  status: 'pendente' | 'vencida' | 'paga'
  categoria:
    | 'aluguel'
    | 'fornecedores'
    | 'salarios'
    | 'utilitarios'
    | 'taxas_cartao'
    | 'outros'
    | 'faturas'
    | 'contas_pagar'
    | 'receita'
    | 'despesa'
  categoria_id?: string
  data_vencimento: string
  data_pagamento?: string
  valor_pago?: number
  metodo_pagamento?:
    | 'cartao'
    | 'dinheiro'
    | 'transferencia'
    | 'pix'
    | 'cartao_debito'
    | 'cartao_credito'
  forma_pagamento_id?: string
  observacoes?: string
  expand?: {
    categoria_id?: {
      id: string
      nome: string
    }
    forma_pagamento_id?: {
      id: string
      nome: string
    }
  }
}

export const getContasPagar = () =>
  pb
    .collection('contas_pagar')
    .getFullList<ContaPagar>({ expand: 'categoria_id,forma_pagamento_id', sort: '-created' })
export const getContaPagar = (id: string) =>
  pb
    .collection('contas_pagar')
    .getOne<ContaPagar>(id, { expand: 'categoria_id,forma_pagamento_id' })
export const createContaPagar = (data: Partial<ContaPagar>) =>
  pb.collection('contas_pagar').create<ContaPagar>(data)
export const updateContaPagar = (id: string, data: Partial<ContaPagar>) =>
  pb.collection('contas_pagar').update<ContaPagar>(id, data)
export const deleteContaPagar = (id: string) => pb.collection('contas_pagar').delete(id)
