import { useState, useEffect, useRef } from 'react'
import {
  getArquivosPaciente,
  createArquivoPaciente,
  deleteArquivoPaciente,
} from '@/services/pacientes'
import { Button } from '@/components/ui/button'
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
import { FileIcon, Image as ImageIcon, Trash2, UploadCloud } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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

  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fotoFilter, setFotoFilter] = useState('todas')

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

  const handleUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!fileList || fileList.length === 0) return toast.error('Selecione um arquivo')

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('paciente_id', paciente.id)
      fd.append('tipo', tipo)
      fd.append('categoria', categoria)
      if (user?.id) fd.append('uploader_id', user.id)

      for (let i = 0; i < fileList.length; i++) {
        fd.append('file', fileList[i])
      }

      await createArquivoPaciente(fd)
      toast.success('Cadastro atualizado com sucesso')
      setFileList(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadData()
    } catch (err) {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, uploaderId: string) => {
    if (user?.papel !== 'admin' && user?.id !== uploaderId) {
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileList(e.dataTransfer.files)
    }
  }

  const fotos = arquivos.filter((a) => a.tipo === 'foto')
  const fotosFiltradas =
    fotoFilter === 'todas' ? fotos : fotos.filter((f) => f.categoria === fotoFilter)
  const docs = arquivos.filter((a) => a.tipo === 'documento')

  if (loading)
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-muted rounded-md" />
        <div className="h-48 bg-muted rounded-md" />
      </div>
    )

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleUpload}
        className="bg-card p-4 sm:p-6 rounded-lg border flex flex-col gap-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 w-full sm:w-1/3">
            <Label>Tipo de Arquivo</Label>
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
          <div className="space-y-2 w-full sm:w-2/3">
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
        </div>

        <div className="space-y-2">
          <Label>Anexar Arquivos</Label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer',
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
              fileList && fileList.length > 0 ? 'bg-primary/5 border-primary/50' : '',
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => setFileList(e.target.files)}
              accept={tipo === 'foto' ? 'image/*' : 'application/pdf,image/*'}
            />
            <UploadCloud
              className={cn(
                'w-10 h-10 mb-4',
                isDragging ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            {fileList && fileList.length > 0 ? (
              <p className="text-sm font-medium text-primary">
                {fileList.length} arquivo(s) selecionado(s)
              </p>
            ) : (
              <div className="space-y-1 text-muted-foreground">
                <p className="text-sm font-medium">Arraste e solte arquivos aqui</p>
                <p className="text-xs">Ou clique para procurar (Upload múltiplo suportado)</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={uploading || !fileList}>
            {uploading ? 'Enviando...' : 'Enviar Arquivos'}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5" /> Galeria de Fotos
          </h3>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground whitespace-nowrap">Filtrar:</Label>
            <Select value={fotoFilter} onValueChange={setFotoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORIAS_FOTO.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fotosFiltradas.length === 0 ? (
          <div className="h-40 border rounded-md flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <p>Nenhuma foto encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {fotosFiltradas.map((f) => {
              const fileNames = Array.isArray(f.file) ? f.file : [f.file]
              return fileNames.map((fileName: string, idx: number) => (
                <div
                  key={`${f.id}-${idx}`}
                  className="relative group rounded-md border overflow-hidden bg-muted"
                >
                  <img
                    src={pb.files.getURL(f, fileName)}
                    alt={f.categoria}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/90 text-xs translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="font-semibold uppercase truncate">
                      {f.categoria.replace('_', ' ')}
                    </p>
                    <p className="text-muted-foreground truncate">{f.expand?.uploader_id?.nome}</p>
                    {f.created && (
                      <p className="text-muted-foreground/70">
                        {format(new Date(f.created), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/50 to-transparent flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {(user?.papel === 'admin' || user?.id === f.uploader_id) && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(f.id, f.uploader_id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileIcon className="w-5 h-5" /> Documentos e Termos
        </h3>
        {docs.length === 0 ? (
          <div className="h-32 border rounded-md flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
            <FileIcon className="w-8 h-8 mb-2 opacity-50" />
            <p>Nenhum documento encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((d) => {
              const fileNames = Array.isArray(d.file) ? d.file : [d.file]
              return fileNames.map((fileName: string, idx: number) => {
                const isPdf = fileName.toLowerCase().endsWith('.pdf')
                return (
                  <div
                    key={`${d.id}-${idx}`}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="p-3 rounded-md bg-primary/10 text-primary">
                      {isPdf ? <FileIcon className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={pb.files.getURL(d, fileName)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline hover:text-primary truncate block text-sm"
                        title={fileName}
                      >
                        {fileName}
                      </a>
                      <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase">
                        {d.categoria.replace(/_/g, ' ')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[100px]">
                          {d.expand?.uploader_id?.nome}
                        </span>
                        <span>•</span>
                        <span>{d.created ? format(new Date(d.created), 'dd/MM/yyyy') : ''}</span>
                      </div>
                    </div>
                    {(user?.papel === 'admin' || user?.id === d.uploader_id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(d.id, d.uploader_id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )
              })
            })}
          </div>
        )}
      </div>
    </div>
  )
}
