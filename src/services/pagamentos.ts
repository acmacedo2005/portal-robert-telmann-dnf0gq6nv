import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface Pagamento extends RecordModel {
  fatura_id: string
  valor_pago: number
  data_pagamento: string
  metodo:
    | 'cartao'
    | 'dinheiro'
    | 'transferencia'
    | 'pix'
    | 'cartao_debito'
    | 'cartao_credito'
    | 'permuta'
  observacoes?: string
  expand?: {
    fatura_id?: {
      paciente_id?: string
      expand?: {
        paciente_id?: {
          nome: string
        }
      }
    }
  }
}

export const getPagamentos = async (): Promise<Pagamento[]> => {
  return pb.collection('pagamentos').getFullList<Pagamento>({
    expand: 'fatura_id.paciente_id',
    sort: '-data_pagamento',
  })
}

export const createPagamento = async (data: Partial<Pagamento>): Promise<Pagamento> => {
  return pb.collection('pagamentos').create<Pagamento>(data)
}
