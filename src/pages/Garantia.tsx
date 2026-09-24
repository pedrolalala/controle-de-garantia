import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShieldCheck,
  Plus,
  FolderPlus,
  Loader2,
  Inbox,
  Clock,
  Folders,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ModalNovoItemGarantia } from '@/components/garantia/ModalNovoItemGarantia'
import { ModalAbrirProtocolo } from '@/components/garantia/ModalAbrirProtocolo'
import { ModalAtualizarProtocolo } from '@/components/garantia/ModalAtualizarProtocolo'
import { PainelAdiantamentosPendentes } from '@/components/garantia/PainelAdiantamentosPendentes'
import {
  listarItens,
  listarProtocolos,
  MOTIVO_LABEL,
  ATENDIMENTO_LABEL,
  PROTOCOLO_STATUS_LABEL,
  DESFECHO_LABEL,
  type GarantiaItemRow,
  type GarantiaProtocoloRow,
} from '@/services/garantia'

// SPEC-156 Módulo 2 — Controle de Garantia. 3 abas: itens aguardando
// protocolo ("o canto cheio de coisas pra pedir garantia"), protocolos
// abertos com o fornecedor, e adiantamentos pendentes de devolução.

type Aba = 'aguardando' | 'protocolos' | 'adiantamentos'

// Só pra colunas `date` puro (ex.: data_venda_referencia) — concatenar
// T00:00:00 evita o fuso local jogar a data pro dia anterior.
function fmtDate(v: string | null): string {
  if (!v) return '—'
  const d = new Date(`${v}T00:00:00`)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

// SPEC-161 Prioridade 15 — bug confirmado: fmtDate() tratava created_at
// (timestamptz, já com hora/offset completos) como se fosse um `date` puro,
// concatenando "T00:00:00" numa string que já tinha timestamp completo —
// isso gerava uma data inválida e a coluna "Criado em" sempre mostrava
// "—". Pra timestamptz, usar new Date(v) direto, sem concatenar nada.
function fmtDateTime(v: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

function statusBadgeClass(status: string): string {
  if (status === 'finalizado') return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  if (status === 'em_contato_fornecedor') return 'bg-blue-50 border-blue-200 text-blue-700'
  return 'bg-amber-50 border-amber-200 text-amber-700'
}

export default function Garantia() {
  const { toast } = useToast()
  const [aba, setAba] = useState<Aba>('aguardando')

  const [itensAguardando, setItensAguardando] = useState<GarantiaItemRow[]>([])
  const [protocolos, setProtocolos] = useState<GarantiaProtocoloRow[]>([])
  const [loading, setLoading] = useState(true)

  const [modalNovoItemOpen, setModalNovoItemOpen] = useState(false)
  const [modalAbrirProtocoloOpen, setModalAbrirProtocoloOpen] = useState(false)
  const [protocoloSelecionado, setProtocoloSelecionado] = useState<GarantiaProtocoloRow | null>(
    null,
  )
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [itens, prots] = await Promise.all([
        listarItens({ semProtocolo: true }),
        listarProtocolos(),
      ])
      setItensAguardando(itens)
      setProtocolos(prots)
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de garantia.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function refresh() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col space-y-4 w-full pb-20 max-w-[1600px] mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Garantia
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Itens de garantia e protocolos com fornecedores — todo mundo pode registrar um item,
            Vitória/Débora conduzem o processo formal com o fornecedor.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setModalAbrirProtocoloOpen(true)}
            className="shadow-sm flex-1 sm:flex-none"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Abrir protocolo
          </Button>
          <Button
            onClick={() => setModalNovoItemOpen(true)}
            className="shadow-sm flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setAba('aguardando')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5',
            aba === 'aguardando'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
          )}
        >
          <Inbox className="w-3.5 h-3.5" />
          Aguardando protocolo ({itensAguardando.length})
        </button>
        <button
          type="button"
          onClick={() => setAba('protocolos')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5',
            aba === 'protocolos'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
          )}
        >
          <Folders className="w-3.5 h-3.5" />
          Protocolos ({protocolos.length})
        </button>
        <button
          type="button"
          onClick={() => setAba('adiantamentos')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5',
            aba === 'adiantamentos'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Adiantamentos pendentes
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col min-h-0 p-4">
        {loading && aba !== 'adiantamentos' ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : aba === 'aguardando' ? (
          itensAguardando.length === 0 ? (
            <div className="flex flex-col items-center text-slate-400 py-12">
              <Inbox className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">Nada aguardando protocolo</p>
              <p className="text-sm mt-1">Crie um item pelo botão "Novo item".</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Peça</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Atendimento</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Adiantamento</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensAguardando.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.fornecedor_nome ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {item.produto_descricao_livre || item.produto_nome_resolvido || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{item.cliente_nome ?? '—'}</TableCell>
                      <TableCell className="text-sm">{MOTIVO_LABEL[item.motivo]}</TableCell>
                      <TableCell className="text-sm">
                        {ATENDIMENTO_LABEL[item.atendimento]}
                      </TableCell>
                      <TableCell className="text-sm">{item.quantidade}</TableCell>
                      <TableCell className="text-sm">
                        {item.adiantamento ? (
                          <Badge className="bg-amber-50 border-amber-200 text-amber-700 border">
                            Sim
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {fmtDateTime(item.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : aba === 'protocolos' ? (
          protocolos.length === 0 ? (
            <div className="flex flex-col items-center text-slate-400 py-12">
              <Folders className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">Nenhum protocolo aberto</p>
              <p className="text-sm mt-1">Use "Abrir protocolo" quando juntar itens suficientes.</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Desfecho</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocolos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{p.fornecedor_nome ?? '—'}</TableCell>
                      <TableCell className="text-sm">{p.responsavel_nome}</TableCell>
                      <TableCell className="text-sm">{p.itens_count}</TableCell>
                      <TableCell>
                        <button type="button" onClick={() => setProtocoloSelecionado(p)}>
                          <Badge className={cn('border font-medium', statusBadgeClass(p.status))}>
                            {PROTOCOLO_STATUS_LABEL[p.status]}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.desfecho ? DESFECHO_LABEL[p.desfecho] : '—'}
                        {p.desfecho_em && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            em {fmtDate(p.desfecho_em)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => setProtocoloSelecionado(p)}
                        >
                          Atualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <PainelAdiantamentosPendentes />
        )}
      </div>

      <ModalNovoItemGarantia
        open={modalNovoItemOpen}
        onOpenChange={setModalNovoItemOpen}
        onSuccess={refresh}
      />

      <ModalAbrirProtocolo
        open={modalAbrirProtocoloOpen}
        onOpenChange={setModalAbrirProtocoloOpen}
        onSuccess={refresh}
      />

      <ModalAtualizarProtocolo
        open={!!protocoloSelecionado}
        onOpenChange={(v) => !v && setProtocoloSelecionado(null)}
        protocolo={protocoloSelecionado}
        onSuccess={refresh}
      />
    </div>
  )
}
