import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getPacientes = async (): Promise<RecordModel[]> => {
  return pb.collection('pacientes').getFullList({ sort: 'nome', requestKey: null })
}

export const getPaciente = async (id: string): Promise<RecordModel> => {
  return pb.collection('pacientes').getOne(id, { expand: 'criado_por', requestKey: null })
}

export const createPaciente = async (data: any): Promise<RecordModel> => {
  if (pb.authStore.record) {
    data.criado_por = pb.authStore.record.id
  }
  return pb.collection('pacientes').create(data)
}

export const updatePaciente = async (id: string, data: any): Promise<RecordModel> => {
  return pb.collection('pacientes').update(id, data)
}

export const getArquivosPaciente = async (pacienteId: string): Promise<RecordModel[]> => {
  return pb.collection('arquivos_paciente').getFullList({
    filter: `paciente_id = "${pacienteId}"`,
    sort: '-created',
    expand: 'uploader_id',
  })
}

export const createArquivoPaciente = async (data: FormData): Promise<RecordModel> => {
  return pb.collection('arquivos_paciente').create(data)
}

export const deleteArquivoPaciente = async (id: string): Promise<void> => {
  return pb.collection('arquivos_paciente').delete(id)
}

export const getPacienteLogs = async (pacienteId: string): Promise<RecordModel[]> => {
  return pb.collection('pacientes_logs').getFullList({
    filter: `paciente_id = "${pacienteId}"`,
    sort: '-created',
    expand: 'user_id',
  })
}

export const createPacienteLog = async (data: any): Promise<RecordModel> => {
  return pb.collection('pacientes_logs').create(data)
}
