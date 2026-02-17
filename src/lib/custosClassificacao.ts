// Mapeamento de v_cod_conta para grupo de custos
// Carregado dinamicamente do banco via store; fallback hardcoded para compatibilidade

import { useFinanceStore } from '@/store/financeStore';

const fallbackClassificacao: Record<string, string> = {
  '4.1.01.01.0030': 'Custos de Pessoal',
  '4.1.01.01.0031': 'Custos de Pessoal',
  '4.1.01.01.0001': 'Custos de Pessoal',
  '4.1.01.01.0006': 'Custos de Pessoal',
  '4.1.01.01.0004': 'Custos de Pessoal',
  '4.1.01.01.0009': 'Custos de Pessoal',
  '4.1.01.01.0010': 'Custos de Pessoal',
  '4.1.01.01.0005': 'Custos de Pessoal',
  '4.1.01.01.0008': 'Custos de Pessoal',
  '3.4.01.01.0031': 'Custos de Pessoal',
  '3.4.01.01.0010': 'Custos de Pessoal',
  '3.4.01.02.0009': 'Custos de Pessoal',
  '3.4.01.01.0005': 'Custos de Pessoal',
  '3.4.01.01.0004': 'Custos de Pessoal',
  '3.4.01.01.0009': 'Custos de Pessoal',
  '3.4.01.01.0006': 'Custos de Pessoal',
  '3.4.01.01.0030': 'Custos de Pessoal',
  '3.4.01.01.0001': 'Custos de Pessoal',
  '3.4.02.01.0004': 'Custos de Pessoal',
  '3.4.02.01.0001': 'Custos de Pessoal',
  '3.4.02.01.0009': 'Custos de Pessoal',
  '3.4.02.01.0031': 'Custos de Pessoal',
  '3.4.02.01.0010': 'Custos de Pessoal',
  '3.4.02.01.0006': 'Custos de Pessoal',
  '3.4.02.01.0005': 'Custos de Pessoal',
  '3.4.02.01.0030': 'Custos de Pessoal',
  '4.1.01.05.0001': 'Depreciações',
  '3.4.01.05.0001': 'Depreciações',
  '3.4.04.05.0004': 'Receitas Financeiras',
  '3.4.04.05.0020': 'Receitas Financeiras',
  '3.4.04.05.0001': 'Receitas Financeiras',
  '3.4.04.01.0006': 'Despesas Financeiras',
  '3.4.03.02.0008': 'Despesas Tributárias',
  '3.4.03.02.0007': 'Despesas Tributárias',
  '3.4.01.07.0001': 'Energia',
  '4.1.01.21.0012': 'Lanches',
  '3.4.02.10.0012': 'Lanches',
  '3.4.01.10.0012': 'Lanches',
  '4.1.01.04.0005': 'Manutenção',
  '4.1.01.04.0002': 'Manutenção',
  '4.2.01.01.0004': 'Manutenção',
  '4.1.01.04.0001': 'Manutenção',
  '3.4.01.04.0005': 'Manutenção',
  '3.4.01.04.0002': 'Manutenção',
  '3.4.01.20.0062': 'Manutenção',
  '3.4.01.04.0001': 'Manutenção',
  '3.4.02.04.0005': 'Manutenção',
  '3.4.01.04.0004': 'Materiais de Expediente',
  '4.1.01.02.0002': 'Serviços de Terceiros',
  '3.4.01.02.0002': 'Serviços de Terceiros',
  '3.4.01.20.0025': 'Taxas',
  '4.1.01.21.0013': 'Taxas',
  '3.4.03.01.0008': 'Taxas',
  '4.1.01.21.0003': 'Contribuições e Doações',
};

// Ordem de exibição dos grupos
export const gruposOrdem: string[] = [
  'Custos de Pessoal',
  'Depreciações',
  'Receitas Financeiras',
  'Despesas Financeiras',
  'Despesas Tributárias',
  'Energia',
  'Lanches',
  'Manutenção',
  'Materiais de Expediente',
  'Serviços de Terceiros',
  'Taxas',
  'Contribuições e Doações',
  'Outros',
];

export function getGrupoCusto(vCodConta: string): string {
  const storeClassif = useFinanceStore.getState().classificacaoCustos;
  const classificacao = Object.keys(storeClassif).length > 0 ? storeClassif : fallbackClassificacao;
  return classificacao[vCodConta] || 'Outros';
}
