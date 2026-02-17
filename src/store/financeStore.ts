import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface PlanoContaItem {
  reduzido: string;
  tipo: 'A' | 'S';
  codConta: string;
  descricao: string;
  natureza: string;
  grau: number;
  ativo: boolean;
}

export interface DeParaItem {
  contaOrigem: string;
  descricaoOrigem: string;
  descricaoDestino: string;
  categoria: 'balanco' | 'DRE';
}

export interface BalanceteItem {
  conta: string;
  reduzido: string;
  descricao: string;
  anterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
}

export interface CustoItem {
  rowl: number;
  codDepartamento: string;
  codCCusto: string;
  nomeDepto: string;
  nomeCusto: string;
  vlCusto: number;
  complemento: string;
  vCodConta: string;
  contaContabil: string;
  produto: string;
  historicoMov: string;
  documento: string;
  nomeConta: string;
  data: string;
  clienteNome: string;
}

export interface UploadRecord {
  id: string;
  tipo: 'plano_contas' | 'de_para' | 'balancete' | 'custos';
  nomeArquivo: string;
  dataUpload: string;
  mes?: number;
  ano?: number;
  registros: number;
}

interface FinanceStore {
  planoContas: PlanoContaItem[];
  dePara: DeParaItem[];
  balancetes: Record<string, BalanceteItem[]>;
  custos: Record<string, CustoItem[]>;
  uploads: UploadRecord[];
  contaFaturamento: string | null;
  classificacaoCustos: Record<string, string>;
  loading: boolean;
  loaded: boolean;

  fetchAll: () => Promise<void>;
  savePlanoContas: (items: PlanoContaItem[]) => Promise<void>;
  saveDePara: (items: DeParaItem[]) => Promise<void>;
  saveBalancete: (key: string, items: BalanceteItem[]) => Promise<void>;
  saveCustos: (key: string, items: CustoItem[]) => Promise<void>;
  removeBalancete: (key: string) => Promise<void>;
  removeCustos: (key: string) => Promise<void>;
  saveUpload: (record: UploadRecord) => Promise<void>;
  setContaFaturamento: (conta: string) => Promise<void>;
  saveClassificacaoCustos: (mapping: Record<string, string>) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
  planoContas: [],
  dePara: [],
  balancetes: {},
  custos: {},
  uploads: [],
  contaFaturamento: null,
  classificacaoCustos: {},
  loading: false,
  loaded: false,

  fetchAll: async () => {
    if (get().loaded) return;
    set({ loading: true });
    try {
      // Helper to fetch all rows from a table (bypasses 1000-row default limit)
      const fetchAllRows = async (table: string) => {
        const PAGE = 1000;
        let allData: any[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase.from(table as any).select('*').range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allData = allData.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return allData;
      };

      const [pcData, dpData, balData, custData, uplData, cfgRes, classifRes] = await Promise.all([
        fetchAllRows('plano_contas'),
        fetchAllRows('de_para'),
        fetchAllRows('balancetes'),
        fetchAllRows('custos'),
        fetchAllRows('uploads'),
        supabase.from('config').select('*').eq('key', 'conta_faturamento').maybeSingle(),
        supabase.from('config').select('*').eq('key', 'custos_classificacao').maybeSingle(),
      ]);

      const planoContas: PlanoContaItem[] = (pcData || []).map((r: any) => ({
        reduzido: r.reduzido,
        tipo: r.tipo as 'A' | 'S',
        codConta: r.cod_conta,
        descricao: r.descricao,
        natureza: r.natureza,
        grau: r.grau,
        ativo: r.ativo,
      }));

      const dePara: DeParaItem[] = (dpData || []).map((r: any) => ({
        contaOrigem: r.conta_origem,
        descricaoOrigem: r.descricao_origem,
        descricaoDestino: r.descricao_destino,
        categoria: r.categoria as 'balanco' | 'DRE',
      }));

      const balancetes: Record<string, BalanceteItem[]> = {};
      for (const r of (balData || []) as any[]) {
        if (!balancetes[r.periodo]) balancetes[r.periodo] = [];
        balancetes[r.periodo].push({
          conta: r.conta,
          reduzido: r.reduzido,
          descricao: r.descricao,
          anterior: Number(r.anterior),
          debitos: Number(r.debitos),
          creditos: Number(r.creditos),
          saldoAtual: Number(r.saldo_atual),
        });
      }

      const custos: Record<string, CustoItem[]> = {};
      for (const r of (custData || []) as any[]) {
        if (!custos[r.periodo]) custos[r.periodo] = [];
        custos[r.periodo].push({
          rowl: r.rowl,
          codDepartamento: r.cod_departamento,
          codCCusto: r.cod_ccusto,
          nomeDepto: r.nome_depto,
          nomeCusto: r.nome_custo,
          vlCusto: Number(r.vl_custo),
          complemento: r.complemento,
          vCodConta: r.v_cod_conta,
          contaContabil: r.conta_contabil,
          produto: r.produto,
          historicoMov: r.historico_mov,
          documento: r.documento,
          nomeConta: r.nome_conta,
          data: r.data,
          clienteNome: r.cliente_nome,
        });
      }

      const uploads: UploadRecord[] = (uplData || []).map((r: any) => ({
        id: r.id,
        tipo: r.tipo,
        nomeArquivo: r.nome_arquivo,
        dataUpload: r.data_upload,
        mes: r.mes,
        ano: r.ano,
        registros: r.registros,
      }));

      let classificacaoCustos: Record<string, string> = {};
      try {
        if (classifRes.data?.value) classificacaoCustos = JSON.parse(classifRes.data.value);
      } catch { /* ignore parse errors */ }

      set({
        planoContas,
        dePara,
        balancetes,
        custos,
        uploads,
        contaFaturamento: cfgRes.data?.value || null,
        classificacaoCustos,
        loading: false,
        loaded: true,
      });
    } catch (err) {
      console.error('Error fetching finance data:', err);
      set({ loading: false });
    }
  },

  savePlanoContas: async (items) => {
    // Delete existing, then insert
    await supabase.from('plano_contas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = items.map((i) => ({
      reduzido: i.reduzido,
      tipo: i.tipo,
      cod_conta: i.codConta,
      descricao: i.descricao,
      natureza: i.natureza,
      grau: i.grau,
      ativo: i.ativo,
    }));
    // Insert in batches of 500
    for (let j = 0; j < rows.length; j += 500) {
      await supabase.from('plano_contas').insert(rows.slice(j, j + 500));
    }
    set({ planoContas: items });
  },

  saveDePara: async (items) => {
    await supabase.from('de_para').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = items.map((i) => ({
      conta_origem: i.contaOrigem,
      descricao_origem: i.descricaoOrigem,
      descricao_destino: i.descricaoDestino,
      categoria: i.categoria,
    }));
    for (let j = 0; j < rows.length; j += 500) {
      await supabase.from('de_para').insert(rows.slice(j, j + 500));
    }
    set({ dePara: items });
  },

  saveBalancete: async (key, items) => {
    // Delete existing for this period
    await supabase.from('balancetes').delete().eq('periodo', key);
    const rows = items.map((i) => ({
      periodo: key,
      conta: i.conta,
      reduzido: i.reduzido,
      descricao: i.descricao,
      anterior: i.anterior,
      debitos: i.debitos,
      creditos: i.creditos,
      saldo_atual: i.saldoAtual,
    }));
    for (let j = 0; j < rows.length; j += 500) {
      await supabase.from('balancetes').insert(rows.slice(j, j + 500));
    }
    set((state) => ({
      balancetes: { ...state.balancetes, [key]: items },
    }));
  },

  saveCustos: async (key, items) => {
    await supabase.from('custos').delete().eq('periodo', key);
    const rows = items.map((i) => ({
      periodo: key,
      rowl: i.rowl,
      cod_departamento: i.codDepartamento,
      cod_ccusto: i.codCCusto,
      nome_depto: i.nomeDepto,
      nome_custo: i.nomeCusto,
      vl_custo: i.vlCusto,
      complemento: i.complemento,
      v_cod_conta: i.vCodConta,
      conta_contabil: i.contaContabil,
      produto: i.produto,
      historico_mov: i.historicoMov,
      documento: i.documento,
      nome_conta: i.nomeConta,
      data: i.data,
      cliente_nome: i.clienteNome,
    }));
    for (let j = 0; j < rows.length; j += 500) {
      await supabase.from('custos').insert(rows.slice(j, j + 500));
    }
    set((state) => ({
      custos: { ...state.custos, [key]: items },
    }));
  },

  removeBalancete: async (key) => {
    await supabase.from('balancetes').delete().eq('periodo', key);
    set((state) => {
      const { [key]: _, ...rest } = state.balancetes;
      return { balancetes: rest };
    });
  },

  removeCustos: async (key) => {
    await supabase.from('custos').delete().eq('periodo', key);
    set((state) => {
      const { [key]: _, ...rest } = state.custos;
      return { custos: rest };
    });
  },

  saveUpload: async (record) => {
    await supabase.from('uploads').insert({
      tipo: record.tipo,
      nome_arquivo: record.nomeArquivo,
      mes: record.mes,
      ano: record.ano,
      registros: record.registros,
    });
    set((state) => ({
      uploads: [record, ...state.uploads],
    }));
  },

  setContaFaturamento: async (conta) => {
    await supabase.from('config').upsert({ key: 'conta_faturamento', value: conta });
    set({ contaFaturamento: conta });
  },

  saveClassificacaoCustos: async (mapping) => {
    await supabase.from('config').upsert({ key: 'custos_classificacao', value: JSON.stringify(mapping) });
    set({ classificacaoCustos: mapping });
  },
}));

// Utility functions
export function formatCurrency(value: number): string {
  if (value === 0 || isNaN(value)) return '-';
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `(${formatted})` : formatted;
}

export function calcAH(atual: number, anterior: number): string {
  if (!anterior || anterior === 0) return '-';
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  return `${pct >= 0 ? '' : ''}${Math.round(pct)}%`;
}

export function getBalanceteKey(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}
