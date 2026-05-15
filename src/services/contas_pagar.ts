import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface ContaPagar extends RecordModel {
  descricao: string
  fornecedor: string
  valor: number
  status: 'pendente' | 'vencida' | 'paga'
  categoria: 'aluguel' | 'fornecedores' | 'salarios' | 'utilitarios' | 'outros'
  data_vencimento: string
  data_pagamento?: string
  valor_pago?: number
  metodo_pagamento?: 'cartao' | 'dinheiro' | 'transferencia'
  observacoes?: string
}

export const getContasPagar = () => pb.collection('contas_pagar').getFullList<ContaPagar>()
export const getContaPagar = (id: string) => pb.collection('contas_pagar').getOne<ContaPagar>(id)
export const createContaPagar = (data: Partial<ContaPagar>) =>
  pb.collection('contas_pagar').create<ContaPagar>(data)
export const updateContaPagar = (id: string, data: Partial<ContaPagar>) =>
  pb.collection('contas_pagar').update<ContaPagar>(id, data)
export const deleteContaPagar = (id: string) => pb.collection('contas_pagar').delete(id)
