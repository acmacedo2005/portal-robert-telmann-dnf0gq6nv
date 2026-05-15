import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface Pagamento extends RecordModel {
  fatura_id: string
  valor_pago: number
  data_pagamento: string
  metodo: 'cartao' | 'dinheiro' | 'transferencia'
  observacoes?: string
}

export const createPagamento = async (data: Partial<Pagamento>): Promise<Pagamento> => {
  return pb.collection('pagamentos').create<Pagamento>(data)
}
