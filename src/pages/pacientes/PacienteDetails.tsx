import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPaciente } from '@/services/pacientes'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

import PacientePersonalInfo from './components/PacientePersonalInfo'
import PacienteProntuario from './components/PacienteProntuario'
import PacienteArquivos from './components/PacienteArquivos'
import PacienteHistorico from './components/PacienteHistorico'

export default function PacienteDetails() {
  const { id } = useParams()
  const [paciente, setPaciente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(false)
      const data = await getPaciente(id)
      setPaciente(data)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error || !paciente) {
    return (
      <div className="p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-destructive font-semibold">Erro ao carregar dados</p>
        <Button onClick={loadData} variant="outline">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background rounded-lg shadow-sm border border-border">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/pacientes">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Perfil: {paciente.nome}</h1>
      </div>

      <Tabs defaultValue="pessoais" className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-2 h-auto bg-muted">
          <TabsTrigger value="pessoais">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="prontuario">Prontuário Médico</TabsTrigger>
          <TabsTrigger value="arquivos">Galeria e Arquivos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="pessoais">
          <PacientePersonalInfo paciente={paciente} onUpdate={setPaciente} />
        </TabsContent>
        <TabsContent value="prontuario">
          <PacienteProntuario paciente={paciente} onUpdate={setPaciente} />
        </TabsContent>
        <TabsContent value="arquivos">
          <PacienteArquivos paciente={paciente} />
        </TabsContent>
        <TabsContent value="historico">
          <PacienteHistorico pacienteId={paciente.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
