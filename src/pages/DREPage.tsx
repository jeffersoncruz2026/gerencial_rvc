import React, { useState, useMemo } from 'react';
import { useLatestOption } from '@/hooks/useLatestOption';
import { useFinanceStore, formatCurrency, calcAH, getBalanceteKey } from '@/store/financeStore';
import ReportHeader from '@/components/ReportHeader';
import { exportToPDF } from '@/lib/pdfExport';
import { FileDown } from 'lucide-react';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface DRERow {
  key: string;
  label: string;
  indent?: number;
  bold?: boolean;
  isTotal?: boolean;
  isLastTotal?: boolean;
  computed?: (values: Record<string, number>) => number;
}

const dreStructure: DRERow[] = [
  { key: 'Receita operacional líquida', label: 'Receita operacional líquida', indent: 1 },
  { key: '(-) Custo das vendas e serviços', label: '(-)Custo das vendas e serviços', indent: 1 },
  {
    key: '_lucro_bruto',
    label: 'Lucro bruto',
    bold: true,
    isTotal: true,
    computed: (v) => (v['Receita operacional líquida'] || 0) + (v['(-) Custo das vendas e serviços'] || 0),
  },
  { key: 'Despesas de vendas', label: 'Despesas de vendas', indent: 2 },
  { key: 'Despesas administrativas e Gerais', label: 'Despesas administrativas e Gerais', indent: 2 },
  { key: 'Outras receitas operacionais', label: 'Outras receitas operacionais', indent: 2 },
  {
    key: '_resultado_antes_financeiras',
    label: 'Resultado antes das receitas (despesas) financeiras líquidas e impostos',
    bold: true,
    isTotal: true,
    computed: (v) => {
      const lb = (v['Receita operacional líquida'] || 0) + (v['(-) Custo das vendas e serviços'] || 0);
      return lb + (v['Despesas de vendas'] || 0) + (v['Despesas administrativas e Gerais'] || 0) + (v['Outras receitas operacionais'] || 0);
    },
  },
  { key: 'Despesas financeiras', label: 'Despesas financeiras', indent: 2 },
  { key: 'Receitas financeiras', label: 'Receitas financeiras', indent: 2 },
  {
    key: '_financeiras_liquidas',
    label: 'Financeiras líquidas',
    bold: true,
    isTotal: true,
    computed: (v) => (v['Despesas financeiras'] || 0) + (v['Receitas financeiras'] || 0),
  },
  {
    key: '_resultado_antes_impostos',
    label: 'Resultado antes dos impostos',
    bold: true,
    isTotal: true,
    computed: (v) => {
      const lb = (v['Receita operacional líquida'] || 0) + (v['(-) Custo das vendas e serviços'] || 0);
      const raf = lb + (v['Despesas de vendas'] || 0) + (v['Despesas administrativas e Gerais'] || 0) + (v['Outras receitas operacionais'] || 0);
      const fin = (v['Despesas financeiras'] || 0) + (v['Receitas financeiras'] || 0);
      return raf + fin;
    },
  },
  { key: 'Imposto de renda e contribuição social corrente', label: 'Imposto de renda e contribuição social corrente', indent: 1 },
  { key: 'Imposto de renda e contribuição social diferido', label: 'Imposto de renda e contribuição social diferido', indent: 1 },
  {
    key: '_lucro_liquido',
    label: 'Lucro líquido do exercício',
    bold: true,
    isTotal: true,
    isLastTotal: true,
    computed: (v) => {
      const lb = (v['Receita operacional líquida'] || 0) + (v['(-) Custo das vendas e serviços'] || 0);
      const raf = lb + (v['Despesas de vendas'] || 0) + (v['Despesas administrativas e Gerais'] || 0) + (v['Outras receitas operacionais'] || 0);
      const fin = (v['Despesas financeiras'] || 0) + (v['Receitas financeiras'] || 0);
      return raf + fin + (v['Imposto de renda e contribuição social corrente'] || 0) + (v['Imposto de renda e contribuição social diferido'] || 0);
    },
  },
];

function fmtVal(v: number): string {
  if (v === 0) return '-';
  return formatCurrency(v);
}

function fmtDelta(cur: number, prev: number): string {
  const ah = calcAH(cur, prev);
  return ah === '-' ? '-' : ah;
}

export default function DREPage() {
  const { balancetes, dePara } = useFinanceStore();
  const keys = useMemo(() => Object.keys(balancetes).sort(), [balancetes]);
  const [selectedKey, setSelectedKey] = useLatestOption(keys);
  const [viewMode, setViewMode] = useState<'mensal' | 'acumulado'>('acumulado');

  const data = useMemo(() => {
    if (!selectedKey) return null;

    const current = balancetes[selectedKey] || [];
    const [y, m] = selectedKey.split('-');
    const prevKey = getBalanceteKey(Number(y) - 1, Number(m));
    const previous = balancetes[prevKey] || [];

    const dreItems = dePara.filter((d) => d.categoria === 'DRE');

    const mapAccumulated = (items: typeof current) => {
      const result: Record<string, number> = {};
      for (const dp of dreItems) {
        const match = items.find((b) => b.conta === dp.contaOrigem);
        const value = match ? match.saldoAtual * -1 : 0;
        if (result[dp.descricaoDestino] === undefined) result[dp.descricaoDestino] = 0;
        result[dp.descricaoDestino] += value;
      }
      return result;
    };

    const mapMonthly = (items: typeof current) => {
      const result: Record<string, number> = {};
      for (const dp of dreItems) {
        const match = items.find((b) => b.conta === dp.contaOrigem);
        const value = match ? (match.saldoAtual - match.anterior) * -1 : 0;
        if (result[dp.descricaoDestino] === undefined) result[dp.descricaoDestino] = 0;
        result[dp.descricaoDestino] += value;
      }
      return result;
    };

    return {
      currentMap: mapAccumulated(current),
      prevMap: mapAccumulated(previous),
      currentMonthlyMap: mapMonthly(current),
      prevMonthlyMap: mapMonthly(previous),
      mesAno: `${meses[Number(m) - 1].substring(0, 3).toLowerCase()}-${y.substring(2)}`,
      prevMesAno: previous.length > 0 ? `${meses[Number(m) - 1].substring(0, 3).toLowerCase()}-${String(Number(y) - 1).substring(2)}` : '-',
      mesNome: meses[Number(m) - 1],
      ano: y,
    };
  }, [selectedKey, balancetes, dePara]);

  if (keys.length === 0) {
    return (
      <div>
        <ReportHeader title="Demonstração de Resultado" />
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
          Nenhum balancete carregado.
        </div>
      </div>
    );
  }

  const getValue = (row: DRERow, map: Record<string, number>): number => {
    if (row.computed) return row.computed(map);
    return map[row.key] || 0;
  };

  return (
    <div className="dre-report" id="dre-report">
      <ReportHeader
        title="Demonstração de Resultado"
        subtitle={data ? `${data.mesNome} de ${data.ano}` : ''}
      >
        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'mensal' | 'acumulado')}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring print:hidden"
          >
            <option value="acumulado">Acumulado</option>
            <option value="mensal">Mensal</option>
          </select>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring print:hidden"
          >
            {keys.map((k) => {
              const [y, m] = k.split('-');
              return <option key={k} value={k}>{meses[Number(m) - 1]} de {y}</option>;
            })}
          </select>
          <button
            onClick={() => exportToPDF('dre-report', `dre-${selectedKey}.pdf`, 'portrait')}
            className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-sm bg-background hover:bg-muted transition-colors print:hidden"
            title="Exportar PDF"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
        </div>
      </ReportHeader>

      <p className="dre-subtitle">(Em Reais)</p>

      <table className="dre-table">
        <thead>
          <tr className="dre-thead-row">
            <th className="dre-th" style={{ width: '50%' }} />
            <th className="dre-th dre-right" style={{ width: '18%' }}>{data?.mesAno}</th>
            <th className="dre-th dre-right" style={{ width: '10%' }}>Δ</th>
            <th className="dre-th dre-right" style={{ width: '18%' }}>{data?.prevMesAno}</th>
          </tr>
        </thead>
        <tbody>
          {data && dreStructure.map((row, idx) => {
            const activeMap = viewMode === 'mensal' ? data.currentMonthlyMap : data.currentMap;
            const activePrevMap = viewMode === 'mensal' ? data.prevMonthlyMap : data.prevMap;
            const curVal = getValue(row, activeMap);
            const prevVal = getValue(row, activePrevMap);

            // Add spacer before total rows (except the first group)
            const needsSpacerBefore = row.isTotal;
            const needsSpacerAfter = row.isTotal && !row.isLastTotal;

            return (
              <React.Fragment key={row.key}>
                {needsSpacerBefore && <tr className="dre-spacer"><td colSpan={4}>&nbsp;</td></tr>}
                <tr className={`dre-row ${row.isTotal ? 'dre-total-row' : ''}`}>
                  <td
                    className={`dre-cell ${row.bold ? 'dre-bold' : ''}`}
                    style={{ paddingLeft: `${(row.indent || 1) * 20}px` }}
                  >
                    {row.label}
                  </td>
                  <td className={`dre-cell dre-right ${row.isTotal ? 'dre-line-top' : ''} ${row.isLastTotal ? 'dre-line-double' : ''} ${row.bold ? 'dre-bold' : ''}`}>
                    {fmtVal(curVal)}
                  </td>
                  <td className="dre-cell dre-right dre-delta">
                    {fmtDelta(curVal, prevVal)}
                  </td>
                  <td className={`dre-cell dre-right ${row.isTotal ? 'dre-line-top' : ''} ${row.isLastTotal ? 'dre-line-double' : ''} ${row.bold ? 'dre-bold' : ''}`}>
                    {fmtVal(prevVal)}
                  </td>
                </tr>
                {needsSpacerAfter && <tr className="dre-spacer"><td colSpan={4}>&nbsp;</td></tr>}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
