import { useState, useEffect } from 'react'
import {
  getArquivosPaciente,
  createArquivoPaciente,
  deleteArquivoPaciente,
} from '@/services/pacientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { FileIcon, Image as ImageIcon, Trash2 } from 'lucide-react'

const CATEGORIAS_FOTO = [
  'antes',
  'durante',
  'depois',
  'retorno_10d',
  'retorno_30d',
  'retorno_90d',
  'retorno_180d',
  'retorno_365d',
]
const CATEGORIAS_DOC = ['prontuario_medico', 'contrato', 'termo_de_consentimento']

export default function PacienteArquivos({ paciente }: { paciente: any }) {
  const [arquivos, setArquivos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()

  const [fileList, setFileList] = useState<FileList | null>(null)
  const [tipo, setTipo] = useState('foto')
  const [categoria, setCategoria] = useState(CATEGORIAS_FOTO[0])

  const loadData = async () => {
    try {
      const data = await getArquivosPaciente(paciente.id)
      setArquivos(data)
    } catch (err) {
      toast.error('Erro ao carregar arquivos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [paciente.id])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileList || fileList.length === 0) return toast.error('Selecione um arquivo')

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('paciente_id', paciente.id)
      fd.append('tipo', tipo)
      fd.append('categoria', categoria)
      fd.append('uploader_id', user.id)

      for (let i = 0; i < fileList.length; i++) {
        fd.append('file', fileList[i])
      }

      await createArquivoPaciente(fd)
      toast.success('Arquivo(s) enviado(s) com sucesso')
      setFileList(null)
      loadData()
    } catch (err) {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, uploaderId: string) => {
    if (user.papel !== 'admin' && user.id !== uploaderId) {
      return toast.error('Sem permissão para deletar este arquivo')
    }
    if (!confirm('Deseja excluir este arquivo?')) return
    try {
      await deleteArquivoPaciente(id)
      toast.success('Arquivo excluído')
      setArquivos((prev) => prev.filter((a) => a.id !== id))
    } catch {
      toast.error('Erro ao excluir arquivo')
    }
  }

  const fotos = arquivos.filter((a) => a.tipo === 'foto')
  const docs = arquivos.filter((a) => a.tipo === 'documento')

  if (loading) return <div className="p-4 text-center">Carregando...</div>

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleUpload}
        className="bg-muted/30 p-4 rounded-md border flex flex-col md:flex-row gap-4 items-end"
      >
        <div className="space-y-2 w-full">
          <Label>Arquivo(s)</Label>
          <Input type="file" multiple onChange={(e) => setFileList(e.target.files)} />
        </div>
        <div className="space-y-2 w-full">
          <Label>Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(v) => {
              setTipo(v)
              setCategoria(v === 'foto' ? CATEGORIAS_FOTO[0] : CATEGORIAS_DOC[0])
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="foto">Foto</SelectItem>
              <SelectItem value="documento">Documento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 w-full">
          <Label>Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(tipo === 'foto' ? CATEGORIAS_FOTO : CATEGORIAS_DOC).map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace(/_/g, ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={uploading || !fileList}>
          {uploading ? 'Enviando...' : 'Enviar'}
        </Button>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" /> Fotos
        </h3>
        {fotos.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Nenhum dado
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {fotos.map((f) => {
              const fileNames = Array.isArray(f.file) ? f.file : [f.file]
              return fileNames.map((fileName: string, idx: number) => (
                <div
                  key={`${f.id}-${idx}`}
                  className="relative group rounded-md border overflow-hidden bg-muted"
                >
                  <img
                    src={pb.files.getURL(f, fileName)}
                    alt={f.categoria}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2 bg-background/90 text-xs">
                    <p className="font-semibold uppercase truncate">
                      {f.categoria.replace('_', ' ')}
                    </p>
                    <p className="text-muted-foreground truncate">{f.expand?.uploader_id?.nome}</p>
                  </div>
                  {(user.papel === 'admin' || user.id === f.uploader_id) && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(f.id, f.uploader_id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileIcon className="w-5 h-5" /> Documentos
        </h3>
        {docs.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2">
            <FileIcon className="w-4 h-4" /> Nenhum dado
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {docs.map((d) => {
              const fileNames = Array.isArray(d.file) ? d.file : [d.file]
              return fileNames.map((fileName: string, idx: number) => (
                <div
                  key={`${d.id}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-md border bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="w-8 h-8 text-primary" />
                    <div>
                      <a
                        href={pb.files.getURL(d, fileName)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold hover:underline capitalize"
                      >
                        {d.categoria.replace(/_/g, ' ')}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        Enviado por: {d.expand?.uploader_id?.nome}
                      </p>
                    </div>
                  </div>
                  {(user.papel === 'admin' || user.id === d.uploader_id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id, d.uploader_id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            })}
          </div>
        )}
      </div>
    </div>
  )
}
