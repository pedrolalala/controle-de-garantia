import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, ScrollText, RefreshCw, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { listarLogGarantia, type LogGarantiaEntry } from '@/services/garantia'

// SPEC-174 N10 — aba "Log", visível só para administrador: histórico de
// quem fez o quê (criação e qualquer alteração de protocolo/item de
// garantia, incluindo mudança de status e desfecho), mais recente
// primeiro, com busca simples. Fonte dos dados: listarLogGarantia() em
// services/garantia.ts (garantia_protocolos_log + garantia_itens_log,
// migration 20261001_174b_log_producao_garantia).

function fmtDataHora(v: string): string {
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function LogPanelGarantia() {
  const { toast } = useToast()
  const [entradas, setEntradas] = useState<LogGarantiaEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      setEntradas(await listarLogGarantia())
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar o log (confira se o seu usuário é administrador).',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return entradas
    return entradas.filter((e) =>
      [e.usuario_nome, e.acao, e.origem, e.referencia, e.detalhe]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(termo)),
    )
  }, [busca, entradas])

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por usuário, ação, fornecedor ou peça..."
            className="pl-9 bg-slate-50 border-slate-200 h-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={carregar} className="shadow-sm h-9 shrink-0" disabled={loading}>
          <RefreshCw className={loading ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2'} />
          Atualizar
        </Button>
      </div>

      <div className="text-xs text-slate-500 pb-2">
        {loading ? 'Carregando...' : `${filtradas.length} evento(s)`}
      </div>

      <div className="overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center text-slate-400 py-12">
            <ScrollText className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-slate-600 font-medium">Nenhum evento encontrado</p>
            <p className="text-sm mt-1">
              {busca ? 'Tente ajustar a busca.' : 'O log fica vazio até a primeira ação.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm text-slate-600">{fmtDataHora(e.data_hora)}</TableCell>
                  <TableCell className="text-sm text-slate-700">{e.usuario_nome ?? '—'}</TableCell>
                  <TableCell className="text-sm text-slate-900 font-medium">{e.acao}</TableCell>
                  <TableCell className="text-sm text-slate-600">{e.origem}</TableCell>
                  <TableCell className="text-sm text-slate-600">{e.referencia ?? '—'}</TableCell>
                  <TableCell className="text-sm text-slate-500">{e.detalhe ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
