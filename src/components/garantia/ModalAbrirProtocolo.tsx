import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, FolderPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  abrirProtocolo,
  getFornecedores,
  getUsuariosAtivos,
  listarItens,
  MOTIVO_LABEL,
  type Contato,
  type GarantiaItemRow,
  type UsuarioSimples,
} from '@/services/garantia'

// SPEC-156 Módulo 2 — "abrir um protocolo" é o processo formal com o
// fornecedor, normalmente conduzido por Vitória ou Débora (sem bloqueio
// rígido no banco, ver services/garantia.ts). Agrupa N itens do mesmo
// fornecedor que ainda não têm protocolo.

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ModalAbrirProtocolo({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast()

  const [fornecedores, setFornecedores] = useState<Contato[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [itensDisponiveis, setItensDisponiveis] = useState<GarantiaItemRow[]>([])
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set())
  const [usuarios, setUsuarios] = useState<UsuarioSimples[]>([])
  const [responsavelNome, setResponsavelNome] = useState('')
  const [carregandoItens, setCarregandoItens] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    getFornecedores()
      .then(setFornecedores)
      .catch(() => {})
    getUsuariosAtivos()
      .then(setUsuarios)
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) {
      setFornecedorId('')
      setItensDisponiveis([])
      setItensSelecionados(new Set())
      setResponsavelNome('')
    }
  }, [open])

  useEffect(() => {
    if (!fornecedorId) {
      setItensDisponiveis([])
      setItensSelecionados(new Set())
      return
    }
    setCarregandoItens(true)
    listarItens({ semProtocolo: true, fornecedorId })
      .then((itens) => {
        setItensDisponiveis(itens)
        setItensSelecionados(new Set())
      })
      .catch(() => {})
      .finally(() => setCarregandoItens(false))
  }, [fornecedorId])

  const responsavelId = useMemo(() => {
    const match = usuarios.find(
      (u) => u.nome.trim().toLowerCase() === responsavelNome.trim().toLowerCase(),
    )
    return match?.id ?? null
  }, [usuarios, responsavelNome])

  function toggleItem(id: string) {
    setItensSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const podeSalvar = !!fornecedorId && !!responsavelNome.trim() && itensSelecionados.size > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSalvar) return
    setSalvando(true)
    try {
      await abrirProtocolo(
        fornecedorId,
        responsavelNome,
        responsavelId,
        Array.from(itensSelecionados),
      )
      toast({ title: 'Protocolo aberto' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao abrir protocolo',
        description: err?.message ?? 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !salvando && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[600px] max-h-[92vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="w-4 h-4 text-primary" />
            Abrir protocolo de garantia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsável pelo processo com o fornecedor *</Label>
            <Input
              list="usuarios-garantia"
              value={responsavelNome}
              onChange={(e) => setResponsavelNome(e.target.value)}
              placeholder="Normalmente Vitória ou Débora"
            />
            <datalist id="usuarios-garantia">
              {usuarios.map((u) => (
                <option key={u.id} value={u.nome} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label>Itens sem protocolo deste fornecedor</Label>
            {!fornecedorId ? (
              <p className="text-xs text-slate-400">Escolha um fornecedor primeiro.</p>
            ) : carregandoItens ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : itensDisponiveis.length === 0 ? (
              <p className="text-xs text-slate-400">
                Nenhum item aguardando protocolo para este fornecedor.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-md max-h-64 overflow-y-auto divide-y divide-slate-100">
                {itensDisponiveis.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={itensSelecionados.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-0.5"
                    />
                    <span className="flex-1">
                      <span className="font-medium text-slate-800">
                        {item.produto_descricao_livre || item.produto_nome_resolvido || 'Peça'}
                      </span>{' '}
                      <span className="text-slate-500">
                        — {MOTIVO_LABEL[item.motivo]}
                        {item.cliente_nome ? ` · ${item.cliente_nome}` : ''} · qtd {item.quantidade}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeSalvar || salvando} className="min-w-[160px]">
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Abrir protocolo ({itensSelecionados.size})
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
