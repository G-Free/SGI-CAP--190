/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { 
  Percent, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  Coins, 
  ArrowUpRight, 
  Scale, 
  CheckCircle,
  Clock,
  Briefcase,
  Users
} from "lucide-react";
import { 
  Bar,
  BarChart,
  Cell,
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Militante, QuotaPayment } from "../types";

interface IndicadoresViewProps {
  militants: Militante[];
  payments: QuotaPayment[];
}

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const AGE_COLORS = ["#dc2626", "#f59e0b", "#2563eb", "#16a34a", "#7c3aed"];

export function IndicadoresView({ militants, payments }: IndicadoresViewProps) {
  const stats = useMemo(() => {
    const total = militants.length;
    const activos = militants.filter(m => m.estado === "Activo").length;
    const inactivos = militants.filter(m => m.estado === "Inactivo").length;
    const suspensos = militants.filter(m => m.estado === "Suspenso").length;

    const totalQuotas = payments.filter(p => p.pago).reduce((sum, p) => sum + p.valor, 0);
    const totalPaymentsCount = payments.filter(p => p.pago).length;
    
    const pctActivos = total > 0 ? (activos / total) * 100 : 0;
    const pctInactivos = total > 0 ? (inactivos / total) * 100 : 0;
    const pctSuspensos = total > 0 ? (suspensos / total) * 100 : 0;

    // Financial calculations
    const expectedQuotas = total * 12; // 12 months expected per militant
    const paidQuotasCount = payments.filter(p => p.pago).length;
    const collectionsPct = expectedQuotas > 0 ? (paidQuotasCount / expectedQuotas) * 100 : 0;

    // Active members that have paid at least 1 month
    const payingActiveMembers = new Set(payments.filter(p => p.pago).map(p => p.militanteId)).size;
    const payerRatio = activos > 0 ? (payingActiveMembers / activos) * 100 : 0;

    return {
      total,
      activos,
      inactivos,
      suspensos,
      pctActivos,
      pctInactivos,
      pctSuspensos,
      totalQuotas,
      totalPaymentsCount,
      collectionsPct,
      payingActiveMembers,
      payerRatio
    };
  }, [militants, payments]);

  // Dynamic Monthly quota collection data for 2026
  const chartData = useMemo(() => {
    return MONTHS_SHORT.map((name, index) => {
      const monthNum = index + 1;
      const monthlyTotal = payments
        .filter(p => p.pago && p.mes === monthNum && p.ano === 2026)
        .reduce((sum, p) => sum + p.valor, 0);
      return {
        mes: name,
        "Quota Arrecadada": monthlyTotal
      };
    });
  }, [payments]);

  // Group by cargo / role
  const cargoStats = useMemo(() => {
    const counts: Record<string, number> = {};
    militants.forEach(m => {
      const cargo = m.cargo || "Membro do Partido";
      counts[cargo] = (counts[cargo] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: (count / militants.length) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [militants]);

  const ageStats = useMemo(() => {
    const groups = [
      { faixa: "18-25", min: 18, max: 25, total: 0 },
      { faixa: "26-35", min: 26, max: 35, total: 0 },
      { faixa: "36-45", min: 36, max: 45, total: 0 },
      { faixa: "46-60", min: 46, max: 60, total: 0 },
      { faixa: "60+", min: 61, max: 150, total: 0 }
    ];

    militants.forEach((m) => {
      if (!m.dataNascimento) return;
      const birthYear = parseInt(m.dataNascimento.split("-")[0], 10);
      if (Number.isNaN(birthYear)) return;
      const age = 2026 - birthYear;
      const group = groups.find((item) => age >= item.min && age <= item.max);
      if (group) group.total++;
    });

    const totalWithAge = groups.reduce((sum, item) => sum + item.total, 0);
    return groups.map((item) => ({
      faixa: item.faixa,
      total: item.total,
      taxa: totalWithAge > 0 ? (item.total / totalWithAge) * 100 : 0
    }));
  }, [militants]);

  const formatAKZ = (val: number) => {
    return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
      .format(val)
      .replace("Kz", "AKZ")
      .trim();
  };

  return (
    <div className="space-y-6" id="indicadores-view">
      {/* 1. Header */}
      <div className="border-b border-zinc-200 pb-4" id="indicadores-header">
        <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
          Análise Detalhada de Indicadores (KPIs)
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Métricas de conformidade estatística, rácio de pagadores e distribuição funcional de funções do partido.
        </p>
      </div>

      {/* 2. Grid of metrics detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="kpi-panels-grid">
        
        {/* Panel Line Chart: Evolução da Arrecadação Mensal */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-4 md:col-span-2 flex flex-col justify-between" id="kpi-arrecadacao-evolucao-panel">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-red-600" />
                Evolução da Arrecadação Mensal de Quotas (2026)
              </h4>
              <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 py-0.5 px-2.5 rounded-full border border-emerald-200">
                Arrecadação Total: {formatAKZ(stats.totalQuotas)}
              </span>
            </div>

            <div className="h-72 w-full pt-2" id="collection-line-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="mes" 
                    tickLine={false}
                    axisLine={{ stroke: '#e4e4e7' }}
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatAKZ(Number(value)), "Arrecadado"]}
                    contentStyle={{ 
                      backgroundColor: '#09090b', 
                      borderRadius: '8px', 
                      border: '1px solid #27272a',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                    labelStyle={{ color: '#f4f4f5', fontWeight: 'extrabold', textTransform: 'uppercase', fontSize: '10px' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#3f3f46' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Quota Arrecadada" 
                    name="Valores Recebidos (AKZ)"
                    stroke="#dc2626" 
                    strokeWidth={3} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    dot={{ r: 4, stroke: '#dc2626', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold leading-relaxed border-t border-zinc-100 pt-3">
            * O gráfico de linhas ilustra a evolução temporal em tempo real. Novos pagamentos registados no painel de quotas reflectem-se instantaneamente na curva de arrecadação do CAP-190.
          </p>
        </div>

        {/* Panel 1: Rácio de Engajamento e Actividade */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-4" id="kpi-activity-panel">
          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-500" />
            Engajamento e Conformidade de Membros
          </h4>
          
          <div className="space-y-4" id="kpi-activity-bars">
            {/* Activos bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  Militantes Activos
                </span>
                <span className="font-mono">{stats.activos} / {stats.total} ({stats.pctActivos.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${stats.pctActivos}%` }} />
              </div>
            </div>

            {/* Inactivos bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-red-500" />
                  Militantes Inactivos
                </span>
                <span className="font-mono">{stats.inactivos} / {stats.total} ({stats.pctInactivos.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${stats.pctInactivos}%` }} />
              </div>
            </div>

            {/* Suspensos bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Militantes Suspensos
                </span>
                <span className="font-mono">{stats.suspensos} / {stats.total} ({stats.pctSuspensos.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${stats.pctSuspensos}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] font-bold text-zinc-600 leading-relaxed" id="activity-insights">
            💡 <span className="text-zinc-950 font-black">Meta Organizacional:</span> Manter o rácio de membros activos acima de 85% para assegurar a mobilização operacional do comité durante campanhas e acções de militância de bairro.
          </div>
        </div>

        {/* Panel 2: Adimplência e Penetração Financeira */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-4" id="kpi-financial-panel">
          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-blue-500" />
            Adimplência e Quotas Arrecadadas
          </h4>

          <div className="space-y-4" id="kpi-financial-bars">
            {/* Payer ratio bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  Militantes Activos Pagadores
                </span>
                <span className="font-mono">{stats.payingActiveMembers} / {stats.activos} ({stats.payerRatio.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${stats.payerRatio}%` }} />
              </div>
              <p className="text-[10px] text-zinc-400 font-bold">Proporção de membros activos que já contribuíram com pelo menos uma quota este ano.</p>
            </div>

            {/* Collections pct bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-purple-500" />
                  Taxa de Cobertura de Quotas (Anual)
                </span>
                <span className="font-mono">{stats.totalPaymentsCount} / {stats.total * 12} ({stats.collectionsPct.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${stats.collectionsPct}%` }} />
              </div>
              <p className="text-[10px] text-zinc-400 font-bold">Volume total de mensalidades pagas contra a expectativa anual teórica acumulada.</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-[11px] font-bold text-zinc-600 leading-relaxed" id="financial-insights">
            💡 <span className="text-blue-950 font-black">Meta Financeira:</span> A arrecadação total acumulada é re-investida directamente no plano de apoio social de bairro em Luanda e manutenção do CAP-190.
          </div>
        </div>

        {/* Panel 3: Distribuição por Funções / Cargos */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-4 md:col-span-2" id="kpi-age-panel">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Distribuição Etária dos Militantes
            </h4>
            <span className="text-[10px] font-black text-zinc-500 bg-zinc-50 border border-zinc-200 px-2.5 py-0.5 rounded-full">
              Taxa por faixa de idade
            </span>
          </div>

          <div className="h-72 w-full" id="age-bar-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageStats} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis
                  dataKey="faixa"
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  tick={{ fill: "#71717a", fontSize: 10, fontWeight: "bold" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fill: "#71717a", fontSize: 10, fontWeight: "bold" }}
                />
                <Tooltip
                  formatter={(value: any, name: string, item: any) => [
                    `${Number(value).toFixed(1)}% (${item.payload.total} militantes)`,
                    "Taxa"
                  ]}
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderRadius: "8px",
                    border: "1px solid #27272a",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "bold"
                  }}
                  labelStyle={{ color: "#f4f4f5", fontWeight: "extrabold", textTransform: "uppercase", fontSize: "10px" }}
                />
                <Bar dataKey="taxa" name="Taxa de Idade" radius={[6, 6, 0, 0]}>
                  {ageStats.map((_, index) => (
                    <Cell key={`age-cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ageStats.map((item) => (
              <div key={item.faixa} className="bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-center">
                <span className="text-[9px] font-black uppercase text-zinc-500 block">{item.faixa} anos</span>
                <span className="text-sm font-black text-zinc-950">{item.total}</span>
                <span className="text-[9px] font-bold text-zinc-400 block">{item.taxa.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-4 md:col-span-2" id="kpi-roles-panel">
          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-red-500" />
            Estrutura Funcional e Cargos do Comité (Top 5)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="kpi-roles-grid">
            {cargoStats.map((item, idx) => (
              <div key={idx} className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg flex flex-col justify-between" id={`role-card-${idx}`}>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold block truncate uppercase">{item.name}</span>
                  <span className="text-2xl font-black text-zinc-950 mt-1 block font-mono">{item.count}</span>
                </div>
                <div className="mt-3 text-[11px] font-bold text-zinc-500">
                  {item.pct.toFixed(1)}% do total
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
