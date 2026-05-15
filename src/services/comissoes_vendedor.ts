import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface ComissaoVendedor extends RecordModel {
  vendedor_id: string
  venda_id: string
  percentual_comissao: number
  valor_comissao: number
  status: 'pendente' | 'paga'
  data_calculo: string
}

export const getComissoes = () =>
  pb.collection('comissoes_vendedor').getFullList<ComissaoVendedor>({
    expand: 'vendedor_id,venda_id,venda_id.paciente_id',
    sort: '-data_calculo',
  })

export const updateComissao = (id: string, data: Partial<ComissaoVendedor>) =>
  pb.collection('comissoes_vendedor').update<ComissaoVendedor>(id, data)
