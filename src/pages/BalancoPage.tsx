import React, { useState, useMemo } from 'react';
import { useFinanceStore, formatCurrency, calcAH, getBalanceteKey } from '@/store/financeStore';
import ReportHeader from '@/components/ReportHeader';
import { exportToPDF } from '@/lib/pdfExport';
import { FileDown } from 'lucide-react';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ativoCirculanteKeys = ['Caixa e equivalentes', 'Duplicatas e outras contas a receber ajustada', 'Ativos Biológicos', 'Estoques', 'Adiantamentos a fornecedores', 'Impostos a recuperar'];
const ativoNaoCirculanteKeys = ['Investimentos', 'Outros investimentos', 'Imobilizado'];
const passivoCirculanteKeys = ['Empréstimos e financiamentos', 'Fornecedores e outras contas a pagar', 'Salários e contribuições sociais', 'Impostos e contribuições a recolher', 'Adiantamentos de clientes'];
const passivoNaoCirculanteKeys = ['Empréstimos e financiamentos LP'];
const plKeys = ['Capital social', 'Partes relacionadas', 'Reserva de Capital', 'Reserva de lucros'];

const plLabels: Record<string, string> = {
  'Partes relacionadas': 'Adiantamento para Futuro Aumento de Capital',
  'Reserva de lucros': 'Reserva de Lucros',
};

type Row = { label: string; cur: number; prev: number };

function hasValue(cur: number, prev: number) {
  return cur !== 0 || prev !== 0;
}

function fmtVal(v: number): string {
  if (v === 0) return '-';
  return formatCurrency(v);
}

function fmtDelta(cur: number, prev: number): string {
  const ah = calcAH(cur, prev);
  return ah === '-' ? '-' : ah;
}

function DataRow({ label, cur, prev, indent = true }: Row & { indent?: boolean }) {
  return (
    <tr className="bp-row">
      <td className={indent ? 'bp-cell bp-indent' : 'bp-cell'}>{label}</td>
      <td className="bp-cell bp-right">{fmtVal(cur)}</td>
      <td className="bp-cell bp-right bp-delta">{fmtDelta(cur, prev)}</td>
      <td className="bp-cell bp-right">{fmtVal(prev)}</td>
    </tr>
  );
}

function SubtotalRow({ label, cur, prev }: Row) {
  return (
    <tr className="bp-subtotal">
      <td className="bp-cell bp-bold">{label}</td>
      <td className="bp-cell bp-right bp-bold bp-line-top">{fmtVal(cur)}</td>
      <td className="bp-cell bp-right bp-delta">{fmtDelta(cur, prev)}</td>
      <td className="bp-cell bp-right bp-bold bp-line-top">{fmtVal(prev)}</td>
    </tr>
  );
}

function TotalRow({ label, cur, prev }: Row) {
  return (
    <tr className="bp-total">
      <td className="bp-cell bp-bold">{label}</td>
      <td className="bp-cell bp-right bp-bold bp-line-double">{fmtVal(cur)}</td>
      <td className="bp-cell bp-right bp-delta">{fmtDelta(cur, prev)}</td>
      <td className="bp-cell bp-right bp-bold bp-line-double">{fmtVal(prev)}</td>
    </tr>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bp-section-header">
      <td className="bp-cell bp-bold">{label}</td>
      <td className="bp-cell"></td>
      <td className="bp-cell"></td>
      <td className="bp-cell"></td>
    </tr>
  );
}

function Spacer() {
  return <tr className="bp-spacer"><td colSpan={4}>&nbsp;</td></tr>;
}

export default function BalancoPage() {
  const { balancetes, dePara } = useFinanceStore();
  const keys = Object.keys(balancetes).sort();
  const [selectedKey, setSelectedKey] = useState(keys[keys.length - 1] || '');

  const data = useMemo(() => {
    if (!selectedKey) return null;
    const current = balancetes[selectedKey] || [];
    const [y, m] = selectedKey.split('-');
    const prevKey = getBalanceteKey(Number(y) - 1, Number(m));
    const previous = balancetes[prevKey] || [];

    const mapValues = (items: typeof current) => {
      const result: Record<string, number> = {};
      for (const dp of dePara.filter((d) => d.categoria === 'balanco')) {
        const directMatch = items.find((b) => b.conta === dp.contaOrigem);
        const value = directMatch ? directMatch.saldoAtual : 0;
        if (result[dp.descricaoDestino] === undefined) result[dp.descricaoDestino] = 0;
        result[dp.descricaoDestino] += value;
      }
      return result;
    };

    const currentMap = mapValues(current);
    const prevMap = mapValues(previous);
    const mesAno = `${meses[Number(m) - 1].substring(0, 3).toLowerCase()}-${y.substring(2)}`;
    const prevMesAno = previous.length > 0 ? `${meses[Number(m) - 1].substring(0, 3).toLowerCase()}-${String(Number(y) - 1).substring(2)}` : '-';
    return { currentMap, prevMap, mesAno, prevMesAno };
  }, [selectedKey, balancetes, dePara]);

  if (keys.length === 0) {
    return (
      <div>
        <ReportHeader title="Balanço Patrimonial" />
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
          Nenhum balancete carregado. Faça o upload primeiro.
        </div>
      </div>
    );
  }

  const cur = data?.currentMap || {};
  const prev = data?.prevMap || {};

  const buildRows = (keys: string[], labels?: Record<string, string>, useAbs = false): Row[] =>
    keys
      .map((k) => {
        const c = useAbs ? Math.abs(cur[k] || 0) : (cur[k] || 0);
        const p = useAbs ? Math.abs(prev[k] || 0) : (prev[k] || 0);
        return { label: labels?.[k] || k, cur: c, prev: p };
      })
      .filter((r) => hasValue(r.cur, r.prev));

  const ativoCircRows = buildRows(ativoCirculanteKeys);
  const ativoNaoCircRows = buildRows(ativoNaoCirculanteKeys);
  const passCircRows = buildRows(passivoCirculanteKeys, undefined, true);
  const passNaoCircRows = buildRows(passivoNaoCirculanteKeys, undefined, true);
  const plRows = buildRows(plKeys, plLabels, true);

  const sumRows = (rows: Row[]) => ({ cur: rows.reduce((s, r) => s + r.cur, 0), prev: rows.reduce((s, r) => s + r.prev, 0) });

  const ativoCircTotal = sumRows(ativoCircRows);
  const ativoNaoCircTotal = sumRows(ativoNaoCircRows);
  const totalAtivo = { cur: ativoCircTotal.cur + ativoNaoCircTotal.cur, prev: ativoCircTotal.prev + ativoNaoCircTotal.prev };

  const passCircTotal = sumRows(passCircRows);
  const passNaoCircTotal = sumRows(passNaoCircRows);
  const plTotal = sumRows(plRows);
  const totalPassivoPL = { cur: passCircTotal.cur + passNaoCircTotal.cur + plTotal.cur, prev: passCircTotal.prev + passNaoCircTotal.prev + plTotal.prev };

  // Pad rows for alignment
  const ativoRowCount = ativoCircRows.length + 2 + ativoNaoCircRows.length + 2; // items + spacer+subtotal each
  const passivoRowCount = passCircRows.length + 2 + passNaoCircRows.length + 2 + 1 + plRows.length + 2; // + PL header + pl items + subtotal
  const maxRows = Math.max(ativoRowCount, passivoRowCount);
  const ativoPad = maxRows - ativoRowCount;
  const passivoPad = maxRows - passivoRowCount;

  return (
    <div className="bp-report" id="balanco-report">
      <ReportHeader title="Balanço Patrimonial" subtitle="(Em Reais)">
        <div className="flex items-center gap-2">
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none print:hidden"
          >
            {keys.map((k) => {
              const [y, m] = k.split('-');
              return <option key={k} value={k}>{meses[Number(m) - 1]} de {y}</option>;
            })}
          </select>
          <button
            onClick={() => exportToPDF('balanco-report', `balanco-patrimonial-${selectedKey}.pdf`, 'landscape')}
            className="inline-flex items-center gap-1.5 border border-border rounded px-3 py-1.5 text-sm bg-background hover:bg-muted transition-colors print:hidden"
            title="Exportar PDF"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
        </div>
      </ReportHeader>

      <div className="bp-container">
        {/* ATIVO */}
        <div className="bp-column">
          <table className="bp-table">
            <thead>
              <tr className="bp-thead-row">
                <th className="bp-th">Ativo</th>
                <th className="bp-th bp-right">{data?.mesAno}</th>
                <th className="bp-th bp-right">Δ</th>
                <th className="bp-th bp-right">{data?.prevMesAno}</th>
              </tr>
            </thead>
            <tbody>
              {ativoCircRows.map((r) => <DataRow key={r.label} {...r} />)}
              <Spacer />
              <SubtotalRow label="Total do ativo circulante" cur={ativoCircTotal.cur} prev={ativoCircTotal.prev} />
              <Spacer />
              {ativoNaoCircRows.map((r) => <DataRow key={r.label} {...r} />)}
              <Spacer />
              <SubtotalRow label="Total do ativo não circulante" cur={ativoNaoCircTotal.cur} prev={ativoNaoCircTotal.prev} />
            </tbody>
          </table>
          {/* Flex spacer pushes total to bottom */}
          <div className="bp-flex-spacer" />
          <table className="bp-table">
            <tfoot>
              <TotalRow label="" cur={totalAtivo.cur} prev={totalAtivo.prev} />
            </tfoot>
          </table>
        </div>

        {/* PASSIVO + PL */}
        <div className="bp-column">
          <table className="bp-table">
            <thead>
              <tr className="bp-thead-row">
                <th className="bp-th">Passivo</th>
                <th className="bp-th bp-right">{data?.mesAno}</th>
                <th className="bp-th bp-right">Δ</th>
                <th className="bp-th bp-right">{data?.prevMesAno}</th>
              </tr>
            </thead>
            <tbody>
              {passCircRows.map((r) => <DataRow key={r.label} {...r} />)}
              <Spacer />
              <SubtotalRow label="Total do passivo circulante" cur={passCircTotal.cur} prev={passCircTotal.prev} />
              <Spacer />
              {passNaoCircRows.length > 0
                ? passNaoCircRows.map((r) => <DataRow key={r.label} label="Empréstimos e financiamentos" {...r} />)
                : <DataRow label="Empréstimos e financiamentos" cur={0} prev={0} />}
              <Spacer />
              <SubtotalRow label="Total do passivo não circulante" cur={passNaoCircTotal.cur} prev={passNaoCircTotal.prev} />
              <Spacer />
              <SectionHeader label="Patrimônio líquido" />
              {plRows.map((r) => <DataRow key={r.label} {...r} />)}
              <Spacer />
              <SubtotalRow label="Total do patrimônio líquido" cur={plTotal.cur} prev={plTotal.prev} />
            </tbody>
          </table>
          {/* Flex spacer pushes total to bottom */}
          <div className="bp-flex-spacer" />
          <table className="bp-table">
            <tfoot>
              <TotalRow label="" cur={totalPassivoPL.cur} prev={totalPassivoPL.prev} />
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
