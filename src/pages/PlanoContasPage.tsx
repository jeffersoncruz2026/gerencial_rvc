import React, { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import FileUploadZone from '@/components/FileUploadZone';
import { parsePlanoContas } from '@/lib/excelParser';
import { Search } from 'lucide-react';

export default function PlanoContasPage() {
  const { planoContas, savePlanoContas, saveUpload } = useFinanceStore();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [search, setSearch] = useState('');

  const handleUpload = async (file: File) => {
    try {
      const items = await parsePlanoContas(file);
      await savePlanoContas(items);
      await saveUpload({
        id: Date.now().toString(),
        tipo: 'plano_contas',
        nomeArquivo: file.name,
        dataUpload: new Date().toISOString(),
        registros: items.length,
      });
      setStatus('success');
      setStatusMsg(`${items.length} contas carregadas com sucesso.`);
    } catch {
      setStatus('error');
      setStatusMsg('Erro ao processar o arquivo. Verifique o formato.');
    }
  };

  const filtered = planoContas.filter(
    (c) =>
      c.descricao.toLowerCase().includes(search.toLowerCase()) ||
      c.codConta.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Plano de Contas</h1>
        <p className="page-subtitle">Upload e visualização da estrutura contábil</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-6">
        <FileUploadZone
          onFileSelect={handleUpload}
          label="Upload do Plano de Contas"
          description="Envie o arquivo Excel com a estrutura do plano de contas"
          status={status}
          statusMessage={statusMsg}
        />
      </div>

      {planoContas.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Contas ({filtered.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar conta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Natureza</th>
                  <th>Grau</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((c, i) => (
                  <tr
                    key={i}
                    className={c.tipo === 'S' ? 'row-header' : ''}
                  >
                    <td className="font-mono text-xs">{c.codConta}</td>
                    <td style={{ paddingLeft: `${(c.grau - 1) * 16 + 16}px` }}>
                      {c.descricao}
                    </td>
                    <td>{c.tipo === 'S' ? 'Sintética' : 'Analítica'}</td>
                    <td>{c.natureza}</td>
                    <td>{c.grau}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
