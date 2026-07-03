/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Check, 
  X, 
  DollarSign, 
  Calendar, 
  Filter, 
  Trash2, 
  PlusCircle, 
  CreditCard,
  User,
  AlertCircle,
  TrendingUp,
  Grid,
  Printer,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Militante, QuotaPayment } from "../types";

interface QuotasViewProps {
  militants: Militante[];
  payments: QuotaPayment[];
  onAddPayment: (p: Omit<QuotaPayment, "id"> | Omit<QuotaPayment, "id">[]) => void;
  onTogglePayment: (id: string) => void;
  onDeletePayment: (id: string) => void;
  userRole?: string;
}

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function QuotasView({ 
  militants, 
  payments, 
  onAddPayment, 
  onTogglePayment, 
  onDeletePayment,
  userRole = "Administrador"
}: QuotasViewProps) {
  // Navigation inside Quotas Tab: "LIST" or "MATRIX"
  const [quotaSubTab, setQuotaSubTab] = useState<"LIST" | "MATRIX">("LIST");

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | "Todos">("Todos");
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | "Todos">(2026);
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [zoneFilter, setZoneFilter] = useState("Todos");

  // Unique sector and zone lists for filter
  const uniqueSectors = useMemo(() => {
    const sSet = new Set(militants.map(m => m.setor).filter(Boolean));
    return ["Todos", ...Array.from(sSet)].sort();
  }, [militants]);

  const uniqueZones = useMemo(() => {
    const zSet = new Set(militants.map(m => m.zona).filter(Boolean));
    return ["Todos", ...Array.from(zSet)].sort();
  }, [militants]);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMilitanteId, setFormMilitanteId] = useState("");
  const [formMes, setFormMes] = useState<number>(new Date().getMonth() + 1);
  const [formAno, setFormAno] = useState<number>(2026);
  const [formValor, setFormValor] = useState<string>("10000"); // 10,000 AKZ standard
  const [formMesesQtd, setFormMesesQtd] = useState<number>(1); // Number of months to pay
  const [formDataPagamento, setFormDataPagamento] = useState(new Date().toISOString().split("T")[0]);

  // Confirmation modal state for payments validation and estorno
  const [confirmAction, setConfirmAction] = useState<{
    type: "VALIDATE" | "ESTORNAR" | "DELETE";
    title: string;
    message: string;
    details?: {
      militante: string;
      ref: string;
      valor: string;
    };
    onConfirm: () => void;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filter Active Militantes for dropdown (only Active or Suspended should pay, but let's list all sorted by name)
  const sortedMilitantes = useMemo(() => {
    return [...militants].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [militants]);

  // List of filtered payments
  const filteredPayments = useMemo(() => {
    let result = payments;

    if (selectedMonthFilter !== "Todos") {
      result = result.filter(p => p.mes === selectedMonthFilter);
    }

    if (selectedYearFilter !== "Todos") {
      result = result.filter(p => p.ano === selectedYearFilter);
    }

    if (sectorFilter !== "Todos") {
      result = result.filter(p => {
        const mil = militants.find(m => m.id === p.militanteId || m.nome === p.militanteNome);
        return mil?.setor === sectorFilter;
      });
    }

    if (zoneFilter !== "Todos") {
      result = result.filter(p => {
        const mil = militants.find(m => m.id === p.militanteId || m.nome === p.militanteNome);
        return mil?.zona === zoneFilter;
      });
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        p => p.militanteNome.toLowerCase().includes(term) || 
             p.militanteId.toLowerCase().includes(term) ||
             (() => {
               const mil = militants.find(m => m.id === p.militanteId || m.nome === p.militanteNome);
               return (mil?.setor && mil.setor.toLowerCase().includes(term)) || 
                      (mil?.zona && mil.zona.toLowerCase().includes(term));
             })()
      );
    }

    // Sort by payment date newest first
    return [...result].sort((a, b) => {
      if (a.mes !== b.mes) return b.mes - a.mes;
      return (b.dataPagamento || "").localeCompare(a.dataPagamento || "");
    });
  }, [payments, searchTerm, selectedMonthFilter, selectedYearFilter, sectorFilter, zoneFilter, militants]);

  // Paged payments
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  // Format currency
  const formatAKZ = (val: number) => {
    return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
      .format(val)
      .replace("Kz", "AKZ")
      .trim();
  };

  // Stats
  const stats = useMemo(() => {
    const totalCollected = filteredPayments.filter(p => p.pago).reduce((sum, p) => sum + p.valor, 0);
    const totalCount = filteredPayments.filter(p => p.pago).length;
    const avgValue = totalCount > 0 ? Math.round(totalCollected / totalCount) : 0;
    
    return {
      totalCollected,
      totalCount,
      avgValue
    };
  }, [filteredPayments]);

  // Handlers
  const handleAddQuotaSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formMilitanteId) {
      alert("Por favor, selecione um militante.");
      return;
    }

    const selectedMilitante = militants.find(m => m.id === formMilitanteId);
    if (!selectedMilitante) return;

    const singleMonthValue = parseInt(formValor, 10) || 0;
    const paymentsList: Omit<QuotaPayment, "id">[] = [];

    for (let i = 0; i < formMesesQtd; i++) {
      const currentStepMes = ((formMes - 1 + i) % 12) + 1;
      const currentStepAno = formAno + Math.floor((formMes - 1 + i) / 12);
      
      paymentsList.push({
        militanteId: formMilitanteId,
        militanteNome: selectedMilitante.nome,
        mes: currentStepMes,
        ano: currentStepAno,
        valor: singleMonthValue,
        pago: true,
        dataPagamento: formDataPagamento
      });
    }

    onAddPayment(paymentsList);

    setIsFormOpen(false);
    setFormMilitanteId("");
    setFormMesesQtd(1); // Reset to 1 month
  };

  const handleToggle = (id: string) => {
    const p = payments.find(pay => pay.id === id);
    if (!p) return;

    if (p.pago) {
      setConfirmAction({
        type: "ESTORNAR",
        title: "Estornar Pagamento",
        message: `Confirma o estorno desta quota no sistema? O estado da transação passará a "Cancelado" e o valor correspondente será retirado do balanço financeiro consolidado.`,
        details: {
          militante: p.militanteNome,
          ref: `${MONTHS_FULL[p.mes - 1]} / ${p.ano}`,
          valor: formatAKZ(p.valor)
        },
        onConfirm: () => onTogglePayment(id)
      });
    } else {
      setConfirmAction({
        type: "VALIDATE",
        title: "Validar Pagamento",
        message: `Confirma a validação e reposição deste pagamento de quota? O estado passará a "Pago" e será contabilizado nas estatísticas financeiras.`,
        details: {
          militante: p.militanteNome,
          ref: `${MONTHS_FULL[p.mes - 1]} / ${p.ano}`,
          valor: formatAKZ(p.valor)
        },
        onConfirm: () => onTogglePayment(id)
      });
    }
  };

  const handleDelete = (id: string) => {
    const p = payments.find(pay => pay.id === id);
    if (!p) return;

    setConfirmAction({
      type: "DELETE",
      title: "Excluir Registo",
      message: `Atenção extrema: Esta acção irá remover de forma permanente o registo de quota do histórico financeiro. Este procedimento é irreversível.`,
      details: {
        militante: p.militanteNome,
        ref: `${MONTHS_FULL[p.mes - 1]} / ${p.ano}`,
        valor: formatAKZ(p.valor)
      },
      onConfirm: () => onDeletePayment(id)
    });
  };

  const matrixYear = useMemo(() => {
    return selectedYearFilter === "Todos" ? 2026 : selectedYearFilter;
  }, [selectedYearFilter]);

  const filteredMilitantesForMatrix = useMemo(() => {
    let result = sortedMilitantes;

    if (sectorFilter !== "Todos") {
      result = result.filter(m => m.setor === sectorFilter);
    }

    if (zoneFilter !== "Todos") {
      result = result.filter(m => m.zona === zoneFilter);
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        m => m.nome.toLowerCase().includes(term) || 
             m.id.toLowerCase().includes(term) ||
             (m.numeroCartao && m.numeroCartao.toLowerCase().includes(term)) ||
             (m.setor && m.setor.toLowerCase().includes(term)) ||
             (m.zona && m.zona.toLowerCase().includes(term))
      );
    }

    return result;
  }, [sortedMilitantes, sectorFilter, zoneFilter, searchTerm]);

  // Matrix generation
  // For each of the first 15 militants, check if they have paid for months 1-12
  // (We paginate or show first 15 so it's readable and super responsive)
  const [matrixPage, setMatrixPage] = useState(0);
  const matrixPageSize = 15;
  const totalMatrixPages = Math.ceil(filteredMilitantesForMatrix.length / matrixPageSize) || 1;
  
  const matrixMilitantes = useMemo(() => {
    const start = matrixPage * matrixPageSize;
    return filteredMilitantesForMatrix.slice(start, start + matrixPageSize);
  }, [filteredMilitantesForMatrix, matrixPage]);

  const isReadOnly = userRole === "Secretário";

  // Quick matrix toggle payment handler
  const handleMatrixCellClick = (militanteId: string, mesNum: number) => {
    if (isReadOnly) return; // Prevent any modifications in read-only mode
    
    // Check if there is already a paid quota for this specific year
    const existingPayment = payments.find(p => p.militanteId === militanteId && p.mes === mesNum && p.ano === matrixYear && p.pago);
    const selectedMilitante = militants.find(m => m.id === militanteId);
    if (!selectedMilitante) return;

    if (existingPayment) {
      setConfirmAction({
        type: "ESTORNAR",
        title: "Remover Quota (Matriz)",
        message: `Deseja realmente remover e estornar o pagamento desta quota através da matriz de controlo rápido para o ano de ${matrixYear}?`,
        details: {
          militante: selectedMilitante.nome,
          ref: `${MONTHS_FULL[mesNum - 1]} / ${matrixYear}`,
          valor: formatAKZ(existingPayment.valor)
        },
        onConfirm: () => onDeletePayment(existingPayment.id)
      });
    } else {
      // Create quick payment of 10,000 for matrixYear
      const formattedMonth = mesNum < 10 ? `0${mesNum}` : `${mesNum}`;
      const quickValor = 10000;
      setConfirmAction({
        type: "VALIDATE",
        title: "Lançamento Rápido (Matriz)",
        message: `Confirma o lançamento rápido de pagamento de quota diretamente a partir da matriz de controlo para o ano de ${matrixYear}?`,
        details: {
          militante: selectedMilitante.nome,
          ref: `${MONTHS_FULL[mesNum - 1]} / ${matrixYear}`,
          valor: formatAKZ(quickValor)
        },
        onConfirm: () => {
          onAddPayment({
            militanteId,
            militanteNome: selectedMilitante.nome,
            mes: mesNum,
            ano: matrixYear,
            valor: quickValor,
            pago: true,
            dataPagamento: `${matrixYear}-${formattedMonth}-05`
          });
        }
      });
    }
  };

  const handleExportPaymentsCSV = () => {
    const headers = [
      "Militante",
      "Mes Pago",
      "Ano",
      "Valor Contribuido",
      "Data Pagamento",
      "Estado"
    ];

    const rows = filteredPayments.map(p => [
      `"${p.militanteNome.replace(/"/g, '""')}"`,
      MONTHS_FULL[p.mes - 1],
      p.ano,
      p.valor,
      p.dataPagamento || "",
      p.pago ? "Pago" : "Pendente"
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pagamentos_cap190_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="quotas-view">
      {/* 1. View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4" id="quotas-header">
        <div>
          <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
            Gestão Financeira & Quotas
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Controle de arrecadação de contribuições do partido, registo de pagamentos e análise de adimplência.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-sm transition-all cursor-pointer select-none no-print"
            id="print-quotas-btn"
          >
            <Printer className="w-4 h-4 text-yellow-500" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleExportPaymentsCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-sm transition-all cursor-pointer select-none no-print"
            id="export-payments-csv-btn"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Exportar (CSV)</span>
          </button>

          {isReadOnly ? (
          <div 
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-400 bg-zinc-200 border border-zinc-300 rounded-lg cursor-not-allowed select-none"
            title="O seu perfil de acesso (Secretário) não possui permissões para registrar ou estornar pagamentos."
            id="register-payment-btn-disabled"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v16m4 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <span>Acesso Bloqueado</span>
          </div>
        ) : (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-all cursor-pointer select-none"
            id="open-payment-form-btn"
          >
            <PlusCircle className="w-4 h-4 text-yellow-400" />
            <span>Registar Pagamento</span>
          </button>
        )}
        </div>
      </div>

      {/* Corporate Access Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3" id="financial-read-only-alert">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="space-y-0.5 text-xs text-amber-800">
            <h4 className="font-black uppercase tracking-wider">Perfil de Acesso Corporativo: Modo de Leitura Financeiro</h4>
            <p className="font-bold leading-normal text-amber-700">
              O seu perfil (<span className="text-amber-950 font-black">Secretário</span>) possui atribuições focadas na gestão cadastral nominal de militantes. O registo de quotas, conciliações bancárias e estornos são competências delegadas exclusivamente ao <span className="text-amber-950 font-black">Tesoureiro</span> e à <span className="text-amber-950 font-black">Administração Geral</span>.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Finance Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="quotas-quick-stats">
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg p-4 shadow-sm text-white border border-blue-600">
          <span className="text-[10px] font-black tracking-wider text-blue-200 block uppercase">
            Valor Total Arrecadado
          </span>
          <span className="text-2xl md:text-3xl font-black tracking-tight mt-1.5 block">
            {formatAKZ(stats.totalCollected)}
          </span>
          <p className="text-[10px] text-blue-100 font-bold mt-2">
            Acumulado no ano fiscal de 2026
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-700 to-purple-900 rounded-lg p-4 shadow-sm text-white border border-purple-600">
          <span className="text-[10px] font-black tracking-wider text-purple-200 block uppercase">
            Número de Quotas Pagas
          </span>
          <span className="text-3xl font-black tracking-tight mt-1.5 block">
            {stats.totalCount} <span className="text-sm font-bold text-purple-200">mensalidades</span>
          </span>
          <p className="text-[10px] text-purple-100 font-bold mt-2">
            Transações processadas com sucesso
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg p-4 shadow-sm text-white border border-amber-500">
          <span className="text-[10px] font-black tracking-wider text-amber-200 block uppercase">
            Valor Médio por Quota
          </span>
          <span className="text-2xl md:text-3xl font-black tracking-tight mt-1.5 block">
            {formatAKZ(stats.avgValue)}
          </span>
          <p className="text-[10px] text-amber-100 font-bold mt-2">
            Contribuição média individual por mês
          </p>
        </div>
      </div>

      {/* 3. Sub-navigation within Quotas: List of Payments OR Interactive Matrix */}
      <div className="flex border-b border-zinc-200" id="quotas-subtabs">
        <button
          onClick={() => setQuotaSubTab("LIST")}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            quotaSubTab === "LIST"
              ? "border-red-600 text-red-600 bg-red-50/10"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
          id="subtab-list-btn"
        >
          <CreditCard className="w-4 h-4" />
          <span>Histórico de Pagamentos</span>
        </button>
        <button
          onClick={() => setQuotaSubTab("MATRIX")}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            quotaSubTab === "MATRIX"
              ? "border-red-600 text-red-600 bg-red-50/10"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
          id="subtab-matrix-btn"
        >
          <Grid className="w-4 h-4" />
          <span>Matriz de Quotas (Checklist)</span>
        </button>
      </div>

      {/* Shared Filters Panel (Applies to both LIST and MATRIX tabs) */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm space-y-3 mt-4" id="quotas-shared-search-filters">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:w-80" id="quota-search-box">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, setor ou zona..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                setMatrixPage(0);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50"
              id="quota-search-input"
            />
          </div>

          {/* Month and Year Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end" id="quota-month-year-filters">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5" id="quota-month-filter">
              <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                Mês:
              </span>
              <select
                value={selectedMonthFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMonthFilter(val === "Todos" ? "Todos" : parseInt(val, 10));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-md bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200 cursor-pointer"
                id="quota-month-select"
              >
                <option value="Todos">Todos os Meses</option>
                {MONTHS_FULL.map((name, idx) => (
                  <option key={idx} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-1.5" id="quota-year-filter">
              <span className="text-xs font-bold text-zinc-500">Ano:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedYearFilter(val === "Todos" ? "Todos" : parseInt(val, 10));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-md bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200 cursor-pointer font-mono"
                id="quota-year-select"
              >
                <option value="Todos">Todos os Anos</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sector and Zone Filters Row */}
        <div className="pt-3 border-t border-zinc-100 flex flex-wrap gap-4 items-center text-xs font-bold" id="quota-setor-zona-filters">
          <span className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider">Filtrar por Área:</span>
          
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-bold">Setor:</span>
            <select
              value={sectorFilter}
              onChange={(e) => { setSectorFilter(e.target.value); setCurrentPage(1); setMatrixPage(0); }}
              className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-zinc-50 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              id="quota-sector-select"
            >
              {uniqueSectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-bold">Zona:</span>
            <select
              value={zoneFilter}
              onChange={(e) => { setZoneFilter(e.target.value); setCurrentPage(1); setMatrixPage(0); }}
              className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-zinc-50 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              id="quota-zone-select"
            >
              {uniqueZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Sub-tab Content: History List of Payments */}
      {quotaSubTab === "LIST" && (
        <div className="space-y-4" id="quotas-list-content">
          {/* Table list */}
          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden" id="payments-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="payments-table">
                <thead>
                  <tr className="bg-zinc-950 text-white text-[10px] uppercase font-black tracking-wider border-b border-zinc-800">
                    <th className="py-3 px-4">Militante</th>
                    <th className="py-3 px-4 w-40">Mês Pago</th>
                    <th className="py-3 px-4 w-40 text-right">Valor Contribuído</th>
                    <th className="py-3 px-4 w-32">Data Pagamento</th>
                    <th className="py-3 px-4 w-28">Estado</th>
                    <th className="py-3 px-4 w-24 text-center">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
                  {paginatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center font-bold text-zinc-400">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                        Nenhum pagamento registado nesta selecção.
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors" id={`pay-row-${p.id}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-black text-xs border border-red-200/50 shrink-0">
                              {p.militanteNome.charAt(0)}
                            </div>
                            <div className="leading-tight">
                              <span className="font-extrabold text-zinc-900 block">{p.militanteNome}</span>
                              <span className="text-[10px] font-mono text-zinc-400 font-bold block">ID: {p.militanteId.replace("militante-", "M")}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-700">
                          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            {MONTHS_FULL[p.mes - 1]} / {p.ano}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                          {formatAKZ(p.valor)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-500 text-[11px]">
                          {p.dataPagamento || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            p.pago 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {p.pago ? "Pago" : "Cancelado"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {isReadOnly ? (
                              <span className="text-zinc-400 text-[10px] font-black uppercase flex items-center gap-1 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                                <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Auditado
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggle(p.id)}
                                  className={`p-1 border rounded cursor-pointer transition-colors ${
                                    p.pago 
                                      ? "text-zinc-500 hover:text-amber-600 bg-zinc-50 hover:bg-amber-50 border-zinc-200" 
                                      : "text-zinc-500 hover:text-emerald-600 bg-zinc-50 hover:bg-emerald-50 border-zinc-200"
                                  }`}
                                  title={p.pago ? "Estornar Pagamento" : "Validar Pagamento"}
                                  id={`toggle-pay-${p.id}`}
                                >
                                  {p.pago ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  className="p-1 text-zinc-500 hover:text-red-600 bg-zinc-50 hover:bg-red-50 border border-zinc-200 rounded cursor-pointer transition-colors"
                                  title="Excluir Transação"
                                  id={`delete-pay-${p.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredPayments.length > 0 && (
              <div className="bg-zinc-50 px-4 py-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 font-bold" id="quota-pagination">
                <div>
                  Mostrando <span className="text-zinc-900">{Math.min(filteredPayments.length, (currentPage - 1) * itemsPerPage + 1)}</span> a{" "}
                  <span className="text-zinc-900">{Math.min(filteredPayments.length, currentPage * itemsPerPage)}</span> de{" "}
                  <span className="text-zinc-900">{filteredPayments.length}</span> transações registadas.
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2 py-1 border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                    id="prev-pay-page"
                  >
                    Anterior
                  </button>
                  <span className="font-bold">Página {currentPage} de {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2 py-1 border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                    id="next-pay-page"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Sub-tab Content: Interactive Matrix */}
      {quotaSubTab === "MATRIX" && (
        <div className="space-y-4" id="quotas-matrix-content">
          {selectedYearFilter === "Todos" && (
            <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-lg p-3 text-xs font-bold leading-relaxed flex items-center gap-2" id="matrix-todos-years-banner">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>
                Visualização Consolidada: Como selecionou <strong className="text-blue-900 font-black">"Todos os Anos"</strong> no filtro superior, a Matriz de Quotas está a exibir o ano de <strong className="text-blue-900 font-black">2026</strong> por predefinição. Altere o filtro de ano acima para gerir outros períodos.
              </span>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs font-bold leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-950">Como funciona a Matriz de Quotas de {matrixYear}?</p>
              <p className="font-medium text-[11px] mt-0.5">
                Esta tabela representa o controle consolidado anual de pagamentos por membro para o ano de <strong className="font-extrabold text-amber-955">{matrixYear}</strong>. 
                Células com <span className="text-emerald-600 font-extrabold">✓</span> indicam que o membro já pagou. 
                Células vazias indicam pendências. 
                <span className="font-extrabold"> Clique em qualquer célula</span> para alternar ou criar rapidamente um pagamento padrão de 10.000 AKZ para o ano de {matrixYear}!
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden" id="matrix-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="matrix-table">
                <thead>
                  <tr className="bg-zinc-950 text-white text-[10px] uppercase font-black tracking-wider border-b border-zinc-800 text-center">
                    <th className="py-3 px-3 text-left min-w-[180px]">Militante</th>
                    {MONTHS_SHORT.map((m, idx) => {
                      const monthNum = idx + 1;
                      const isHighlighted = selectedMonthFilter !== "Todos" && selectedMonthFilter === monthNum;
                      return (
                        <th 
                          key={idx} 
                          className={`py-3 px-1 border-l border-zinc-800 w-11 transition-all ${
                            isHighlighted 
                              ? "bg-red-800 text-yellow-300 font-extrabold shadow-inner" 
                              : "text-white"
                          }`}
                        >
                          {m}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-bold text-zinc-700">
                  {matrixMilitantes.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors" id={`matrix-row-${m.id}`}>
                      <td className="py-2.5 px-3">
                        <div className="leading-tight">
                          <span className="font-extrabold text-zinc-900 block truncate max-w-[180px]">{m.nome}</span>
                          <span className="text-[9px] font-mono text-zinc-400 font-bold block">{m.numeroCartao} • {m.estado}</span>
                        </div>
                      </td>
                      {Array.from({ length: 12 }).map((_, monthIdx) => {
                        const monthNum = monthIdx + 1;
                        // Check if this member has paid this month in the selected year
                        const payment = payments.find(p => p.militanteId === m.id && p.mes === monthNum && p.ano === matrixYear && p.pago);
                        const isHighlighted = selectedMonthFilter !== "Todos" && selectedMonthFilter === monthNum;
                        
                        return (
                          <td 
                            key={monthIdx}
                            onClick={() => handleMatrixCellClick(m.id, monthNum)}
                            className={`py-2 px-1 border-l border-zinc-100 text-center select-none cursor-pointer hover:bg-zinc-100/80 transition-all font-mono text-[11px] ${
                              payment 
                                ? isHighlighted 
                                  ? "bg-emerald-100 text-emerald-800 font-black border-x-2 border-emerald-400" 
                                  : "bg-emerald-50/75 text-emerald-600 font-black" 
                                : isHighlighted 
                                  ? "bg-amber-50/70 text-zinc-400 font-bold border-x-2 border-amber-300"
                                  : "text-zinc-300 hover:text-red-500 font-normal"
                            }`}
                            title={payment ? `Paga em ${payment.dataPagamento} (${formatAKZ(payment.valor)})` : `Registrar quota de ${MONTHS_SHORT[monthIdx]} / ${matrixYear}`}
                            id={`cell-${m.id}-${monthNum}`}
                          >
                            {payment ? (
                              <div className="flex flex-col items-center">
                                <span>✓</span>
                                <span className="text-[7px] text-emerald-500 leading-none">pago</span>
                              </div>
                            ) : (
                              <span className="opacity-0 hover:opacity-100 font-bold text-red-600">+</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Pagination Controls */}
            <div className="bg-zinc-50 px-4 py-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-bold" id="matrix-pagination">
              <span>
                Mostrando militantes <span className="text-zinc-900">{matrixPage * matrixPageSize + 1}</span> a{" "}
                <span className="text-zinc-900">{Math.min(filteredMilitantesForMatrix.length, (matrixPage + 1) * matrixPageSize)}</span> de{" "}
                <span className="text-zinc-900">{filteredMilitantesForMatrix.length}</span> (Filtrado em 12 colunas anuais de {matrixYear}).
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  disabled={matrixPage === 0}
                  onClick={() => setMatrixPage(p => Math.max(0, p - 1))}
                  className="px-2.5 py-1 bg-white border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                  id="prev-matrix-btn"
                >
                  Anterior
                </button>
                <span>Módulo {matrixPage + 1} de {totalMatrixPages}</span>
                <button
                  disabled={matrixPage === totalMatrixPages - 1}
                  onClick={() => setMatrixPage(p => Math.min(totalMatrixPages - 1, p + 1))}
                  className="px-2.5 py-1 bg-white border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
                  id="next-matrix-btn"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Form Modal to Record New Payment */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="payment-form-modal">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-zinc-950 text-white p-4 flex items-center justify-between border-b border-zinc-800">
              <span className="text-xs font-black tracking-widest uppercase text-yellow-400">
                Registar Contribuição de Quota
              </span>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="p-1 hover:bg-zinc-900 rounded transition-colors text-zinc-400 hover:text-white cursor-pointer"
                id="close-payform-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddQuotaSubmit} className="p-6 space-y-4 text-xs font-bold text-zinc-700" id="quota-form-fields">
              
              {/* Select Militante */}
              <div className="space-y-1.5">
                <label className="text-zinc-700 block">Selecione o Militante *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <select
                    required
                    value={formMilitanteId}
                    onChange={(e) => setFormMilitanteId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="payform-select-militante"
                  >
                    <option value="">-- Seleccionar Militante --</option>
                    {sortedMilitantes.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.numeroCartao} • {m.estado})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid month / year */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Mês de Início */}
                <div className="space-y-1.5">
                  <label className="text-zinc-700 block">Mês de Referência (Início) *</label>
                  <select
                    value={formMes}
                    onChange={(e) => setFormMes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="payform-select-month"
                  >
                    {MONTHS_FULL.map((name, idx) => (
                      <option key={idx} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Ano de Referência */}
                <div className="space-y-1.5">
                  <label className="text-zinc-700 block">Ano de Referência *</label>
                  <input
                    type="number"
                    required
                    value={formAno}
                    onChange={(e) => setFormAno(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 font-mono font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="payform-input-year"
                  />
                </div>

                {/* Valor Mensal */}
                <div className="space-y-1.5">
                  <label className="text-zinc-700 block">Valor Mensal da Quota *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[9px] font-black text-zinc-400 font-mono">AKZ</span>
                    <input
                      type="number"
                      required
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      placeholder="Ex: 10000"
                      className="w-full pl-11 pr-3 py-2 font-mono font-black border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                      id="payform-input-amount"
                    />
                  </div>
                </div>

                {/* Quantidade de Meses a Pagar */}
                <div className="space-y-1.5">
                  <label className="text-zinc-700 block">Número de Meses (Adiantar) *</label>
                  <select
                    value={formMesesQtd}
                    onChange={(e) => setFormMesesQtd(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="payform-select-months-qty"
                  >
                    <option value={1}>1 Mês (Regular)</option>
                    <option value={2}>2 Meses (Adiantado)</option>
                    <option value={3}>3 Meses (Trimestral)</option>
                    <option value={4}>4 Meses</option>
                    <option value={5}>5 Meses</option>
                    <option value={6}>6 Meses (Semestral)</option>
                    <option value={12}>12 Meses (Anual)</option>
                  </select>
                </div>

                {/* Data de Pagamento */}
                <div className="space-y-1.5 col-span-2">
                  <label className="text-zinc-700 block">Data do Pagamento *</label>
                  <input
                    type="date"
                    required
                    value={formDataPagamento}
                    onChange={(e) => setFormDataPagamento(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="payform-input-paydate"
                  />
                </div>

              </div>

              {/* Automatic Bill Calculation Display */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5" id="auto-calc-display">
                <div className="flex justify-between items-center text-zinc-900">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total a Pagar (Automático)</span>
                  <span className="text-sm font-black text-red-700 font-mono">
                    {formatAKZ(formMesesQtd * (parseInt(formValor, 10) || 0))}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-bold leading-relaxed border-t border-zinc-200/60 pt-1.5">
                  <span className="text-zinc-700">Meses abrangidos:</span>{" "}
                  {Array.from({ length: formMesesQtd }).map((_, i) => {
                    const currentStepMes = ((formMes - 1 + i) % 12) + 1;
                    const currentStepAno = formAno + Math.floor((formMes - 1 + i) / 12);
                    return `${MONTHS_SHORT[currentStepMes - 1]}/${currentStepAno}`;
                  }).join(", ")}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2" id="payform-actions">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-black cursor-pointer transition-colors"
                  id="payform-cancel"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-black shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  id="payform-submit"
                >
                  <Check className="w-4 h-4 text-yellow-400" />
                  <span>Registar Pagamento</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. Beautiful Confirmation Dialog Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="confirmation-dialog-modal">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header with appropriate theme colors depending on the action type */}
            <div className={`p-4 flex items-center gap-2.5 border-b text-white ${
              confirmAction.type === "ESTORNAR" || confirmAction.type === "DELETE"
                ? "bg-red-700 border-red-800" 
                : "bg-emerald-700 border-emerald-800"
            }`}>
              <AlertTriangle className="w-5 h-5 text-yellow-400 animate-pulse shrink-0" />
              <span className="text-xs font-black tracking-widest uppercase">
                {confirmAction.title}
              </span>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs font-bold text-zinc-700 leading-normal">
              <p className="text-zinc-600 font-medium">
                {confirmAction.message}
              </p>
              
              {confirmAction.details && (
                <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 space-y-1 font-mono text-[10px]">
                  {confirmAction.details.militante && (
                    <p className="flex justify-between border-b border-zinc-200/60 pb-1 text-zinc-500">
                      <span>Militante:</span>
                      <span className="font-extrabold text-zinc-950">{confirmAction.details.militante}</span>
                    </p>
                  )}
                  {confirmAction.details.ref && (
                    <p className="flex justify-between border-b border-zinc-200/60 pb-1 text-zinc-500 pt-1">
                      <span>Referência:</span>
                      <span className="font-extrabold text-zinc-950 uppercase">{confirmAction.details.ref}</span>
                    </p>
                  )}
                  {confirmAction.details.valor && (
                    <p className="flex justify-between text-zinc-500 pt-1">
                      <span>Valor:</span>
                      <span className="font-black text-emerald-600">{confirmAction.details.valor}</span>
                    </p>
                  )}
                </div>
              )}

              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-center pt-1">
                Esta ação será auditada e registada no sistema.
              </p>
            </div>

            {/* Actions */}
            <div className="bg-zinc-50 px-5 py-3.5 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3.5 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-black uppercase text-[10px] tracking-wider rounded-md cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className={`px-4 py-2 text-white font-black uppercase text-[10px] tracking-wider rounded-md cursor-pointer transition-colors shadow-xs ${
                  confirmAction.type === "ESTORNAR" || confirmAction.type === "DELETE"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
                id="modal-confirm-action-btn"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
