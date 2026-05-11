import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getCirurgias = async (): Promise<RecordModel[]> => {
  return pb
    .collection('cirurgias')
    .getFullList({ expand: 'paciente_id,medico_id', sort: '-data_cirurgia' })
}

export const createCirurgia = async (data: any): Promise<RecordModel> => {
  return pb.collection('cirurgias').create(data)
}

export const updateCirurgia = async (id: string, data: any): Promise<RecordModel> => {
  return pb.collection('cirurgias').update(id, data)
}
