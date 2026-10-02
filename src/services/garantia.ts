import { supabase } from '@/lib/supabase/client'

// SPEC-156 Módulo 2 — Controle de Garantia. Substitui a planilha manual
// do Matheus (que já nem existia mais) por protocolos de garantia por
// fornecedor + itens individuais.
//
// garantia_itens/garantia_protocolos ainda não estão no types.ts gerado —
// `(supabase as any)` nas chamadas que tocam essas tabelas, mesmo padrão
// usado em todo o ecossistema Lucenera pra tabelas novas ainda não
// tipadas.
//
// Decisões do usuário (22/09/2026): qualquer authenticated pode criar um
// garantia_itens; o processo com o fornecedor (garantia_protocolos) é
// normalmente conduzido por Vitória/Débora, mas sem allowlist de RLS
// (Vitória não tem login em usuarios ainda) — reforçado só na UI.
// Busca de produto e resolução de data de venda passam por funções
// SECURITY DEFINER porque `produtos`/`notas_fiscais` têm RLS restrita a
// papéis do Hub que este sistema (ainda não registrado) não tem.

export type MotivoGarantia =
  | 'queimou'
  | 'sobrecarga_mau_uso'
  | 'envio_errado'
  | 'producao_errada'
  | 'avaria'
  | 'outro'
export type AtendimentoGarantia = 'imediato' | 'analise_fornecedor'
export type PrazoReferencia = 'peca' | 'fornecedor'
export type DataVendaOrigem = 'nota_fiscal' | 'orcamento' | 'vendas_legado' | 'manual'
export type ProtocoloStatus =
  | 'em_contato_fornecedor'
  | 'nota_fiscal_emitida'
  | 'material_enviado'
  | 'aguardando_analise'
  | 'material_recebido'
  | 'finalizado'

export const MOTIVO_LABEL: Record<MotivoGarantia, string> = {
  queimou: 'Queimou',
  sobrecarga_mau_uso: 'Sobrecarga / mau uso',
  envio_errado: 'Envio errado',
  producao_errada: 'Produção errada',
  avaria: 'Avaria (dano na entrega)',
  outro: 'Outro',
}

export const ATENDIMENTO_LABEL: Record<AtendimentoGarantia, string> = {
  imediato: 'Atendido de imediato',
  analise_fornecedor: 'Foi para análise do fornecedor',
}

export const DATA_VENDA_ORIGEM_LABEL: Record<DataVendaOrigem, string> = {
  nota_fiscal: 'Nota fiscal',
  orcamento: 'Orçamento aprovado',
  vendas_legado: 'Venda legada (Connect)',
  manual: 'Preenchido manualmente',
}

export const PROTOCOLO_STATUS_ORDER: ProtocoloStatus[] = [
  'em_contato_fornecedor',
  'nota_fiscal_emitida',
  'material_enviado',
  'aguardando_analise',
  'material_recebido',
  'finalizado',
]

export const PROTOCOLO_STATUS_LABEL: Record<ProtocoloStatus, string> = {
  em_contato_fornecedor: 'Em contato com fornecedor',
  nota_fiscal_emitida: 'Nota fiscal emitida',
  material_enviado: 'Material enviado',
  aguardando_analise: 'Aguardando análise',
  material_recebido: 'Material recebido',
  finalizado: 'Finalizado',
}

export const DESFECHO_LABEL: Record<string, string> = {
  peca_nova: 'Peça nova',
  conserto: 'Conserto',
  nao_acatado: 'Não acatado',
  credito_gerado_despacho: 'Crédito gerado em despacho',
}

export interface Contato {
  id: string
  nome: string
}

export async function getFornecedores(): Promise<Contato[]> {
  const { data, error } = await (supabase as any)
    .from('contatos')
    .select('id, nome')
    .eq('tipo', 'fornecedor')
    .order('nome')
  if (error) throw error
  return (data ?? []) as Contato[]
}

export async function buscarClientes(search: string): Promise<Contato[]> {
  if (!search.trim()) return []
  const { data, error } = await (supabase as any)
    .from('contatos')
    .select('id, nome')
    .eq('tipo', 'cliente')
    .ilike('nome', `%${search.trim()}%`)
    .order('nome')
    .limit(20)
  if (error) throw error
  return (data ?? []) as Contato[]
}

export interface ProdutoBusca {
  id: string
  nome: string
  sku: string | null
  referencia: string | null
  codigo_produto: number | null
}

// Usa a RPC garantia_buscar_produtos (SECURITY DEFINER) porque a RLS real
// de `produtos` exige papel do Hub que este sistema não tem.
export async function buscarProdutos(search: string): Promise<ProdutoBusca[]> {
  const { data, error } = await (supabase as any).rpc('garantia_buscar_produtos', {
    p_search: search.trim(),
  })
  if (error) throw error
  return (data ?? []) as ProdutoBusca[]
}

export interface ResolverDataVendaResult {
  data_venda: string | null
  origem: DataVendaOrigem | null
}

export async function resolverDataVenda(
  clienteId: string,
  produtoId: string,
): Promise<ResolverDataVendaResult> {
  const { data, error } = await (supabase as any).rpc('garantia_resolver_data_venda', {
    p_cliente_id: clienteId,
    p_produto_id: produtoId,
  })
  if (error) throw error
  const row = (data ?? [])[0]
  return { data_venda: row?.data_venda ?? null, origem: row?.origem ?? null }
}

export interface GarantiaItemRow {
  id: string
  fornecedor_id: string
  fornecedor_nome: string | null
  produto_id: string | null
  produto_descricao_livre: string | null
  produto_nome_resolvido: string | null
  cliente_id: string | null
  cliente_nome: string | null
  orcamento_id: string | null
  data_venda_referencia: string | null
  data_venda_origem: DataVendaOrigem | null
  prazo_garantia_anos: number | null
  prazo_garantia_referencia: PrazoReferencia | null
  motivo: MotivoGarantia
  atendimento: AtendimentoGarantia
  adiantamento: boolean
  peca_antiga_devolvida_em: string | null
  garantia_protocolo_id: string | null
  quantidade: number
  observacao: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ListarItensFiltro {
  semProtocolo?: boolean
  fornecedorId?: string
  adiantamentoPendente?: boolean
  garantiaProtocoloId?: string
  search?: string
}

// SPEC-161 Prioridade 12 — bug confirmado: antes, produto_nome_resolvido
// sempre copiava produto_descricao_livre, nunca resolvia o nome real de um
// produto cadastrado (produto_id preenchido). Não dá pra corrigir com um
// simples `.select('*, produtos(nome)')`: a RLS real de `produtos`
// (spec069_produtos_select) exige um papel do Hub que o Controle de
// Garantia não tem — um embed direto ficaria em branco pra qualquer
// usuário sem esse papel (mesmo bug, disfarçado). Por isso resolve em lote
// via garantia_resolver_nomes_produtos (SECURITY DEFINER).
async function resolverNomesProdutos(produtoIds: string[]): Promise<Record<string, string>> {
  if (produtoIds.length === 0) return {}
  const { data, error } = await (supabase as any).rpc('garantia_resolver_nomes_produtos', {
    p_produto_ids: produtoIds,
  })
  if (error) throw error
  const mapa: Record<string, string> = {}
  for (const row of (data ?? []) as { id: string; nome: string }[]) {
    mapa[row.id] = row.nome
  }
  return mapa
}

export async function listarItens(filtro: ListarItensFiltro = {}): Promise<GarantiaItemRow[]> {
  let query = (supabase as any)
    .from('garantia_itens')
    .select('*, contatos_fornecedor:fornecedor_id(nome), contatos_cliente:cliente_id(nome)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (filtro.semProtocolo) query = query.is('garantia_protocolo_id', null)
  if (filtro.fornecedorId) query = query.eq('fornecedor_id', filtro.fornecedorId)
  if (filtro.adiantamentoPendente) {
    query = query.eq('adiantamento', true).is('peca_antiga_devolvida_em', null)
  }
  if (filtro.garantiaProtocoloId) query = query.eq('garantia_protocolo_id', filtro.garantiaProtocoloId)
  if (filtro.search && filtro.search.trim()) {
    const termo = filtro.search.trim()
    query = query.or(
      `produto_descricao_livre.ilike.%${termo}%,cliente_nome.ilike.%${termo}%,observacao.ilike.%${termo}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error

  const linhas = (data ?? []) as any[]
  const produtoIds = Array.from(
    new Set(linhas.map((d) => d.produto_id).filter((id): id is string => !!id)),
  )
  const nomesProdutos = await resolverNomesProdutos(produtoIds).catch(() => ({}) as Record<
    string,
    string
  >)

  return linhas.map((d) => ({
    id: d.id,
    fornecedor_id: d.fornecedor_id,
    fornecedor_nome: d.contatos_fornecedor?.nome ?? null,
    produto_id: d.produto_id,
    produto_descricao_livre: d.produto_descricao_livre,
    produto_nome_resolvido: d.produto_id
      ? (nomesProdutos[d.produto_id] ?? d.produto_descricao_livre ?? null)
      : d.produto_descricao_livre,
    cliente_id: d.cliente_id,
    cliente_nome: d.contatos_cliente?.nome ?? d.cliente_nome ?? null,
    orcamento_id: d.orcamento_id,
    data_venda_referencia: d.data_venda_referencia,
    data_venda_origem: d.data_venda_origem,
    prazo_garantia_anos: d.prazo_garantia_anos,
    prazo_garantia_referencia: d.prazo_garantia_referencia,
    motivo: d.motivo,
    atendimento: d.atendimento,
    adiantamento: d.adiantamento,
    peca_antiga_devolvida_em: d.peca_antiga_devolvida_em,
    garantia_protocolo_id: d.garantia_protocolo_id,
    quantidade: d.quantidade,
    observacao: d.observacao,
    created_by: d.created_by,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }))
}

// SPEC-161 Prioridade 11 — mostrar os itens dentro de um protocolo.
// Reaproveita listarItens com o filtro novo (garantiaProtocoloId).
export async function listarItensDoProtocolo(protocoloId: string): Promise<GarantiaItemRow[]> {
  return listarItens({ garantiaProtocoloId: protocoloId })
}

export interface CriarGarantiaItemInput {
  fornecedor_id: string
  produto_id?: string | null
  produto_descricao_livre?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  orcamento_id?: string | null
  data_venda_referencia?: string | null
  data_venda_origem?: DataVendaOrigem | null
  prazo_garantia_anos?: number | null
  prazo_garantia_referencia?: PrazoReferencia | null
  motivo: MotivoGarantia
  atendimento: AtendimentoGarantia
  adiantamento: boolean
  quantidade: number
  observacao?: string | null
}

export async function criarGarantiaItem(input: CriarGarantiaItemInput): Promise<string> {
  const { data: userData } = await supabase.auth.getUser()

  const { data: inserted, error } = await (supabase as any)
    .from('garantia_itens')
    .insert({
      fornecedor_id: input.fornecedor_id,
      produto_id: input.produto_id || null,
      produto_descricao_livre: input.produto_descricao_livre?.trim() || null,
      cliente_id: input.cliente_id || null,
      cliente_nome: input.cliente_nome?.trim() || null,
      orcamento_id: input.orcamento_id || null,
      data_venda_referencia: input.data_venda_referencia || null,
      data_venda_origem: input.data_venda_origem || null,
      prazo_garantia_anos: input.prazo_garantia_anos ?? null,
      prazo_garantia_referencia: input.prazo_garantia_referencia || null,
      motivo: input.motivo,
      atendimento: input.atendimento,
      adiantamento: input.adiantamento,
      quantidade: input.quantidade,
      observacao: input.observacao?.trim() || null,
      created_by: userData?.user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return inserted.id as string
}

export async function marcarPecaAntigaDevolvida(id: string, data: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('garantia_itens')
    .update({ peca_antiga_devolvida_em: data })
    .eq('id', id)
  if (error) throw error
}

export interface GarantiaProtocoloRow {
  id: string
  fornecedor_id: string
  fornecedor_nome: string | null
  responsavel_id: string | null
  responsavel_nome: string
  status: ProtocoloStatus
  desfecho: string | null
  desfecho_em: string | null
  observacao: string | null
  created_at: string
  updated_at: string
  itens_count?: number
}

export async function listarProtocolos(fornecedorId?: string): Promise<GarantiaProtocoloRow[]> {
  let query = (supabase as any)
    .from('garantia_protocolos')
    .select('*, contatos:fornecedor_id(nome), garantia_itens(count)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (fornecedorId) query = query.eq('fornecedor_id', fornecedorId)

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    fornecedor_id: d.fornecedor_id,
    fornecedor_nome: d.contatos?.nome ?? null,
    responsavel_id: d.responsavel_id,
    responsavel_nome: d.responsavel_nome,
    status: d.status,
    desfecho: d.desfecho,
    desfecho_em: d.desfecho_em,
    observacao: d.observacao,
    created_at: d.created_at,
    updated_at: d.updated_at,
    itens_count: d.garantia_itens?.[0]?.count ?? 0,
  }))
}

export interface UsuarioSimples {
  id: string
  nome: string
}

export async function getUsuariosAtivos(): Promise<UsuarioSimples[]> {
  const { data, error } = await (supabase as any)
    .from('usuarios')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return (data ?? []) as UsuarioSimples[]
}

// Regra da SPEC-156: qualquer authenticated pode criar/gerenciar um
// protocolo no banco (sem allowlist de RLS, ver comentário no topo do
// arquivo) — a UI só sugere que normalmente é a Vitória ou a Débora.
export async function abrirProtocolo(
  fornecedorId: string,
  responsavelNome: string,
  responsavelId: string | null,
  itemIds: string[],
): Promise<string> {
  const nome = responsavelNome.trim()
  if (!nome) throw new Error('Informe o responsável pelo protocolo.')
  if (itemIds.length === 0) throw new Error('Selecione ao menos um item para abrir o protocolo.')

  const { data: userData } = await supabase.auth.getUser()

  const { data: inserted, error } = await (supabase as any)
    .from('garantia_protocolos')
    .insert({
      fornecedor_id: fornecedorId,
      responsavel_id: responsavelId,
      responsavel_nome: nome,
      created_by: userData?.user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) throw error

  const protocoloId = inserted.id as string

  const { error: updateError } = await (supabase as any)
    .from('garantia_itens')
    .update({ garantia_protocolo_id: protocoloId })
    .in('id', itemIds)
  if (updateError) throw updateError

  return protocoloId
}

export async function atualizarStatusProtocolo(
  id: string,
  status: ProtocoloStatus,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('garantia_protocolos')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// SPEC-161 Prioridade 10: desfecho ganhou 'credito_gerado_despacho' + data
// própria (desfecho_em) — "a data do que aconteceu, de quando aconteceu",
// pra medir a duração do protocolo junto com created_at.
export async function finalizarProtocolo(
  id: string,
  desfecho: 'peca_nova' | 'conserto' | 'nao_acatado' | 'credito_gerado_despacho',
  desfechoEm: string,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('garantia_protocolos')
    .update({ status: 'finalizado', desfecho, desfecho_em: desfechoEm })
    .eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------
// SPEC-174 N10 — aba "Log" (só administrador): histórico de quem fez o
// quê. Junta a trilha de auditoria genérica nova (garantia_protocolos_log
// e garantia_itens_log, migration 20261001_174b_log_producao_garantia —
// cobre criação e qualquer UPDATE: mudança de status, desfecho, devolução
// de peça de adiantamento). Garantia não tinha nenhuma tabela de
// histórico antes desta migration (diferente da Produção). A RLS das 2
// tabelas *_log só deixa administrador ler; para qualquer outro papel
// essas queries voltam vazias.
// ---------------------------------------------------------------------

export const LOG_ACAO_LABEL: Record<string, string> = {
  criado: 'Criado',
  atualizado: 'Atualizado',
  status_alterado: 'Status alterado',
}

export interface LogGarantiaEntry {
  id: string
  data_hora: string
  usuario_nome: string | null
  acao: string
  origem: 'Protocolo' | 'Item'
  referencia: string | null
  detalhe: string | null
}

export async function listarLogGarantia(limite = 300): Promise<LogGarantiaEntry[]> {
  const [protocolosLog, itensLog] = await Promise.all([
    (supabase as any)
      .from('garantia_protocolos_log')
      .select(
        '*, usuarios:usuario_id(nome), garantia_protocolos:garantia_protocolo_id(responsavel_nome, contatos:fornecedor_id(nome))',
      )
      .order('criado_em', { ascending: false })
      .limit(limite),
    (supabase as any)
      .from('garantia_itens_log')
      .select(
        '*, usuarios:usuario_id(nome), garantia_itens:garantia_item_id(produto_descricao_livre, cliente_nome)',
      )
      .order('criado_em', { ascending: false })
      .limit(limite),
  ])

  if (protocolosLog.error) throw protocolosLog.error
  if (itensLog.error) throw itensLog.error

  const entradas: LogGarantiaEntry[] = []

  for (const d of (protocolosLog.data ?? []) as any[]) {
    entradas.push({
      id: `protocolo-${d.id}`,
      data_hora: d.criado_em,
      usuario_nome: d.usuarios?.nome ?? null,
      acao: LOG_ACAO_LABEL[d.acao] ?? d.acao,
      origem: 'Protocolo',
      referencia: d.garantia_protocolos?.contatos?.nome ?? d.garantia_protocolos?.responsavel_nome ?? null,
      detalhe:
        d.acao === 'status_alterado'
          ? `${PROTOCOLO_STATUS_LABEL[d.dados_antigos?.status as ProtocoloStatus] ?? d.dados_antigos?.status ?? '—'} → ${PROTOCOLO_STATUS_LABEL[d.dados_novos?.status as ProtocoloStatus] ?? d.dados_novos?.status ?? '—'}`
          : null,
    })
  }

  for (const d of (itensLog.data ?? []) as any[]) {
    entradas.push({
      id: `item-${d.id}`,
      data_hora: d.criado_em,
      usuario_nome: d.usuarios?.nome ?? null,
      acao: LOG_ACAO_LABEL[d.acao] ?? d.acao,
      origem: 'Item',
      referencia:
        d.garantia_itens?.produto_descricao_livre ?? d.garantia_itens?.cliente_nome ?? null,
      detalhe: null,
    })
  }

  return entradas.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
}
