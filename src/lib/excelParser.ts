import * as XLSX from 'xlsx';
import { PlanoContaItem, DeParaItem, BalanceteItem, CustoItem } from '@/store/financeStore';

export function parsePlanoContas(file: File): Promise<PlanoContaItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Skip header row
        const items: PlanoContaItem[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[2]) continue;
          items.push({
            reduzido: String(row[0] || ''),
            tipo: (String(row[1] || 'A') as 'A' | 'S'),
            codConta: String(row[2] || ''),
            descricao: String(row[3] || ''),
            natureza: String(row[4] || ''),
            grau: Number(row[6] || 0),
            ativo: true,
          });
        }
        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function parseDePara(file: File): Promise<DeParaItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const items: DeParaItem[] = [];

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[0]) continue;
            const cat = String(row[3] || 'balanco').toLowerCase().trim();
            items.push({
              contaOrigem: String(row[0] || ''),
              descricaoOrigem: String(row[1] || ''),
              descricaoDestino: String(row[2] || ''),
              categoria: cat.includes('dre') ? 'DRE' : 'balanco',
            });
          }
        }
        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function parseBalancete(file: File): Promise<{ items: BalanceteItem[]; mes: number; ano: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const items: BalanceteItem[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;

          const parseNum = (v: any): number => {
            if (v === null || v === undefined || v === '') return 0;
            if (typeof v === 'number') return v;
            return Number(String(v).replace(/\./g, '').replace(',', '.')) || 0;
          };

          items.push({
            conta: String(row[0] || ''),
            reduzido: String(row[1] || ''),
            descricao: String(row[2] || ''),
            anterior: parseNum(row[3]),
            debitos: parseNum(row[4]),
            creditos: parseNum(row[5]),
            saldoAtual: parseNum(row[6]),
          });
        }

        // Try to detect month/year from first data or filename
        const now = new Date();
        resolve({ items, mes: now.getMonth() + 1, ano: now.getFullYear() });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function extractClienteName(complemento: string): string {
  // Format: "000000133 - LUCASAT GESTAO E MARKETING LTDA -" or "000114089 - GA BRASIL..."
  const match = complemento.match(/^\d+\s*-\s*(.+?)(?:\s*-\s*)?$/);
  if (match) return match[1].trim();
  // fallback: return as-is
  return complemento.trim();
}

export function parseClassificacaoCustos(file: File): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const mapping: Record<string, string> = {};
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0] || !row[1]) continue;
          // Format: "4.1.01.21.0012 - LANCHES E REFEICOES" -> extract code
          const raw = String(row[0]).trim();
          const code = raw.split(' - ')[0].trim();
          const grupo = String(row[1]).trim();
          if (code && grupo) mapping[code] = grupo;
        }
        resolve(mapping);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function parseCustos(file: File): Promise<{ items: CustoItem[]; mes: number; ano: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const items: CustoItem[] = [];
        let detectedMonth = new Date().getMonth() + 1;
        let detectedYear = new Date().getFullYear();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row[0] === undefined || row[0] === null || row[0] === '') continue;

          const parseNum = (v: any): number => {
            if (v === null || v === undefined || v === '') return 0;
            if (typeof v === 'number') return v;
            return Number(String(v).replace(/\./g, '').replace(',', '.')) || 0;
          };

          const complemento = String(row[8] || '');
          const dataStr = String(row[18] || '');
          
          // Try detect month/year from first valid date
          if (i === 1 && dataStr) {
            const dateMatch = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) {
              detectedMonth = parseInt(dateMatch[2]);
              detectedYear = parseInt(dateMatch[3]);
            }
          }

          items.push({
            rowl: Number(row[0]) || 0,
            codDepartamento: String(row[3] || ''),
            codCCusto: String(row[4] || ''),
            nomeDepto: String(row[5] || ''),
            nomeCusto: String(row[6] || ''),
            vlCusto: parseNum(row[7]),
            complemento,
            vCodConta: String(row[9] || ''),
            contaContabil: String(row[10] || ''),
            produto: String(row[12] || ''),
            historicoMov: String(row[13] || ''),
            documento: String(row[14] || ''),
            nomeConta: String(row[15] || ''),
            data: dataStr,
            clienteNome: extractClienteName(complemento),
          });
        }

        resolve({ items, mes: detectedMonth, ano: detectedYear });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
