/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { 
  TrendingUp, 
  ArrowUpRight, 
  Users, 
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { Militante } from "../types";

interface CrescimentoViewProps {
  militants: Militante[];
}

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function CrescimentoView({ militants }: CrescimentoViewProps) {
  // Compute monthly admissions
  const monthlyAdmissions = useMemo(() => {
    const counts = Array(12).fill(0);
    militants.forEach(m => {
      const parts = m.dataAdmissao.split("-");
      if (parts.length === 3) {
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          counts[monthIndex]++;
        }
      }
    });
    return counts;
  }, [militants]);

  // Compute quarters
  const quarterlyStats = useMemo(() => {
    const q1 = monthlyAdmissions[0] + monthlyAdmissions[1] + monthlyAdmissions[2];
    const q2 = monthlyAdmissions[3] + monthlyAdmissions[4] + monthlyAdmissions[5];
    const q3 = monthlyAdmissions[6] + monthlyAdmissions[7] + monthlyAdmissions[8];
    const q4 = monthlyAdmissions[9] + monthlyAdmissions[10] + monthlyAdmissions[11];
    const total = q1 + q2 + q3 + q4;

    return [
      { name: "1º Trimestre (Jan-Mar)", count: q1, pct: total > 0 ? (q1 / total) * 100 : 0 },
      { name: "2º Trimestre (Abr-Jun)", count: q2, pct: total > 0 ? (q2 / total) * 100 : 0 },
      { name: "3º Trimestre (Jul-Set)", count: q3, pct: total > 0 ? (q3 / total) * 100 : 0 },
      { name: "4º Trimestre (Out-Dez)", count: q4, pct: total > 0 ? (q4 / total) * 100 : 0 },
    ];
  }, [monthlyAdmissions]);

  // Cumulative monthly counts for listing
  const tableData = useMemo(() => {
    let cumulative = 0;
    return monthlyAdmissions.map((newCount, index) => {
      cumulative += newCount;
      const prevCount = cumulative - newCount;
      const growthRate = prevCount > 0 ? (newCount / prevCount) * 100 : 0;
      
      return {
        mes: MONTHS_FULL[index],
        novos: newCount,
        acumulado: cumulative,
        taxa: growthRate
      };
    });
  }, [monthlyAdmissions]);

  return (
    <div className="space-y-6" id="crescimento-view">
      {/* 1. Header */}
      <div className="border-b border-zinc-200 pb-4" id="crescimento-header">
        <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
          Análise de Crescimento Organizacional
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Estatísticas detalhadas de novas admissões e acumulação de força partidária ao longo do ano de 2026.
        </p>
      </div>

      {/* 2. Quarter Stats Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="quarters-grid">
        {quarterlyStats.map((q, idx) => (
          <div key={idx} className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm relative overflow-hidden flex flex-col justify-between" id={`quarter-card-${idx}`}>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">{q.name}</span>
              <span className="text-3xl font-black text-red-600 block font-mono">{q.count}</span>
            </div>
            <div className="mt-4 pt-2 border-t border-zinc-50 text-[11px] font-bold text-zinc-500 flex items-center justify-between">
              <span>Novos Membros</span>
              <span className="text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">{q.pct.toFixed(1)}%</span>
            </div>
            {/* Background design */}
            <div className="absolute right-0 bottom-0 opacity-5 -mr-2 -mb-2 text-zinc-900 pointer-events-none">
              <Layers className="w-16 h-16" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Monthly detail list */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden" id="crescimento-table-box">
        <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#F9D71C]" />
          <span className="text-xs font-black text-white uppercase tracking-wider">
            Detalhamento de Fluxo Mensal - 2026
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" id="crescimento-table">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[9px] tracking-wider border-b border-zinc-800">
                <th className="py-3 px-4">Mês</th>
                <th className="py-3 px-4 text-center">Novos Militantes</th>
                <th className="py-3 px-4 text-center">Total Acumulado</th>
                <th className="py-3 px-4 text-right">Taxa de Crescimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-bold text-zinc-700">
              {tableData.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50 transition-colors" id={`growth-row-${idx}`}>
                  <td className="py-3 px-4 text-zinc-900 font-extrabold">{row.mes}</td>
                  <td className="py-3 px-4 text-center text-red-600 font-black font-mono">{row.novos}</td>
                  <td className="py-3 px-4 text-center text-zinc-900 font-black font-mono">{row.acumulado}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                    {row.taxa > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        +{row.taxa.toFixed(1)}%
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    ) : idx === 0 ? (
                      <span className="text-zinc-400">—</span>
                    ) : (
                      <span className="text-zinc-500">Estável (0.0%)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
