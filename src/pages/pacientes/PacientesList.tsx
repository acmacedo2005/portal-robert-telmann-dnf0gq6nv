import { useState, useEffect } from 'react'
import { api, Paciente, Cirurgia, Fatura } from '@/services/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { Search, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { CsvValidatorDialog } from '@/components/pacientes/CsvValidatorDialog'

export default function PacientesList() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [search, setSearch] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [detalhesCirurgias, setDetalhesCirurgias] = useState<Cirurgia[]>([])
  const [detalhesFaturas, setDetalhesFaturas] = useState<Fatura[]>([])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await api.pacientes.list()
      setPacientes(data)
    } catch (err: any) {
      if (!err?.isAbort) setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('pacientes', () => loadData())

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      nome: formData.get('nome') as string,
      telefone: formData.get('telefone') as string,
      email: formData.get('email') as string,
      data_nascimento: formData.get('data_nascimento')
        ? new Date(formData.get('data_nascimento') as string).toISOString()
        : undefined,
      cpf: formData.get('cpf') as string,
      endereco: formData.get('endereco') as string,
      cidade: formData.get('cidade') as string,
      estado: formData.get('estado') as string,
      genero: formData.get('genero') as string,
    }

    try {
      await api.pacientes.create(data)
      toast.success('Cadastro realizado com sucesso')
      setIsSheetOpen(false)
    } catch (error) {
      toast.error('Erro ao salvar dados')
    }
  }

  const openDetails = async (p: Paciente) => {
    setSelectedPaciente(p)
    try {
      const [c, f] = await Promise.all([
        api.cirurgias.list().then((res) => res.filter((x) => x.paciente_id === p.id)),
        api.faturas.list().then((res) => res.filter((x) => x.paciente_id === p.id)),
      ])
      setDetalhesCirurgias(c)
      setDetalhesFaturas(f)
    } catch {
      /* intentionally ignored */
    }
  }

  const filtered = pacientes.filter(
    (p) => p.nome.toLowerCase().includes(search.toLowerCase()) || p.cpf?.includes(search),
  )

  return (
    <div className="space-y-4 bg-background p-6 rounded-lg shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <CsvValidatorDialog pacientes={pacientes} />
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo Paciente
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto w-full sm:max-w-md">
              <SheetHeader className="mb-4">
                <SheetTitle>Cadastrar Paciente</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input name="nome" required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input name="cpf" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Input name="genero" placeholder="M/F/Outro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Nascimento</Label>
                    <Input type="date" name="data_nascimento" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input name="telefone" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" name="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input name="endereco" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input name="cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input name="estado" maxLength={2} placeholder="SP" />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-4">
                  Salvar
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Gênero</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-destructive">
                  Ocorreu um erro ao carregar os dados. Verifique a conexão com o banco.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum paciente encontrado no sistema.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/pacientes/${p.id}`)}
                >
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{p.cpf || '-'}</TableCell>
                  <TableCell>{(p as any).genero || '-'}</TableCell>
                  <TableCell>{p.telefone || '-'}</TableCell>
                  <TableCell>{p.cidade ? `${p.cidade}/${p.estado}` : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedPaciente} onOpenChange={(v) => !v && setSelectedPaciente(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Paciente: {selectedPaciente?.nome}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Histórico de Cirurgias</h3>
              {detalhesCirurgias.length > 0 ? (
                <ul className="space-y-2">
                  {detalhesCirurgias.map((c) => (
                    <li key={c.id} className="border p-2 rounded text-sm">
                      <div>Data: {format(new Date(c.data_cirurgia), 'dd/MM/yyyy')}</div>
                      <div>
                        Status: <span className="capitalize">{c.status}</span>
                      </div>
                      <div>Restante: R$ {c.saldo_restante?.toFixed(2)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma cirurgia registrada.</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Situação Financeira</h3>
              {detalhesFaturas.length > 0 ? (
                <ul className="space-y-2">
                  {detalhesFaturas.map((f) => (
                    <li key={f.id} className="border p-2 rounded text-sm flex justify-between">
                      <span>
                        {f.tipo_parcela} (Venc: {format(new Date(f.data_vencimento), 'dd/MM/yyyy')})
                      </span>
                      <span
                        className={`font-semibold ${f.status === 'pendente' ? 'text-orange-500' : f.status === 'paga' ? 'text-green-500' : 'text-red-500'}`}
                      >
                        R$ {f.valor.toFixed(2)} - {f.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma fatura registrada.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
