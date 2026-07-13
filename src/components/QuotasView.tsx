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
import { MplaCrestSvg } from "./Header";
import { generateMonthlySharePDF } from "../lib/pdfReportGenerator";

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
  // Navigation inside Quotas Tab: "LIST", "MATRIX" or "DISTRIBUICAO"
  const [quotaSubTab, setQuotaSubTab] = useState<"LIST" | "MATRIX" | "DISTRIBUICAO">("LIST");

  // State for monthly quota distribution beneficiaries & percentages
  const [beneficiarios, setBeneficiarios] = useState<{ id: string; nome: string; percentagem: number; }[]>(() => {
    const saved = localStorage.getItem("cap190_quota_beneficiaries");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: "cap190", nome: "CAP-190 (Comité Local)", percentagem: 40 },
      { id: "distrito", nome: "Comité de Distrito (Ingombota)", percentagem: 25 },
      { id: "provincial", nome: "Comité Provincial (Luanda)", percentagem: 15 },
      { id: "central", nome: "Comité Central (Nacional)", percentagem: 10 },
      { id: "solidariedade", nome: "Fundo de Solidariedade Social", percentagem: 5 },
    ];
  });

  // State for monthly quota distribution approvals / signatures
  interface ApprovalDetail {
    nome: string;
    data: string;
    assinado: boolean;
  }
  interface MonthApproval {
    elaborado?: ApprovalDetail;
    verificado?: ApprovalDetail;
    aprovado?: ApprovalDetail;
    autorizado?: ApprovalDetail;
    submetido?: boolean;
    dataSubmissao?: string;
  }
  const [approvals, setApprovals] = useState<{ [monthYear: string]: MonthApproval }>(() => {
    const saved = localStorage.getItem("cap190_quota_distribution_approvals");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {};
  });

  // Helper function to save beneficiaries & avoid useEffect complexity
  const saveBeneficiarios = (newBenefs: typeof beneficiarios) => {
    setBeneficiarios(newBenefs);
    localStorage.setItem("cap190_quota_beneficiaries", JSON.stringify(newBenefs));
  };

  // Helper function to save approvals
  const saveApprovals = (newApprovals: typeof approvals) => {
    setApprovals(newApprovals);
    localStorage.setItem("cap190_quota_distribution_approvals", JSON.stringify(newApprovals));
  };

  // State for active report modal
  const [selectedReportMonth, setSelectedReportMonth] = useState<number | null>(null);
  const [selectedReportYear, setSelectedReportYear] = useState<number | null>(null);
  const [reportEmissionDate, setReportEmissionDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form states for adding/editing a beneficiary
  const [isAddingBeneficiary, setIsAddingBeneficiary] = useState(false);
  const [newBenefNome, setNewBenefNome] = useState("");
  const [newBenefPct, setNewBenefPct] = useState<number>(5);

  // Sign inputs for each signature category
  const [signInputs, setSignInputs] = useState({
    elaboradoNome: "",
    elaboradoData: new Date().toISOString().split("T")[0],
    verificadoNome: "",
    verificadoData: new Date().toISOString().split("T")[0],
    aprovadoNome: "",
    aprovadoData: new Date().toISOString().split("T")[0],
    autorizadoNome: "",
    autorizadoData: new Date().toISOString().split("T")[0],
  });

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

      {/* 3. Sub-navigation within Quotas: List of Payments OR Interactive Matrix OR Monthly Distribution */}
      <div className="flex border-b border-zinc-200 no-print" id="quotas-subtabs">
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
        <button
          onClick={() => setQuotaSubTab("DISTRIBUICAO")}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            quotaSubTab === "DISTRIBUICAO"
              ? "border-red-600 text-red-600 bg-red-50/10"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
          id="subtab-distribuicao-btn"
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Distribuição de Receitas</span>
        </button>
      </div>

      {/* Shared Filters Panel (Applies to both LIST and MATRIX tabs) */}
      {quotaSubTab !== "DISTRIBUICAO" && (
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
      )}

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

      {/* 5.5. Sub-tab Content: Monthly Share Distribution */}
      {quotaSubTab === "DISTRIBUICAO" && (
        <div className="space-y-6" id="quotas-distribution-content">
          {/* Top Info Banner */}
          <div className="bg-gradient-to-r from-red-800 to-zinc-900 text-white rounded-lg p-4 shadow-sm border border-red-700">
            <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-300" />
              Processamento Automatizado de Partilha de Quotas
            </h4>
            <p className="text-xs text-red-100 font-medium leading-relaxed mt-1">
              O sistema calcula mensalmente o total de quotas pagas e distribui de forma automática entre os beneficiários partidários configurados, conforme as percentagens oficiais das regras de negócio. Todos os relatórios gerados necessitam de homologação com assinaturas para obter validade regulamentar.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rules and Configuration Panel */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-zinc-200 p-4 shadow-sm space-y-4">
              <div className="border-b border-zinc-200 pb-2">
                <span className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                  Regras de Partilha (%)
                </span>
                <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                  Configure as percentagens de destino para cada órgão/quota.
                </span>
              </div>

              {/* List of Beneficiaries with edit controls */}
              <div className="space-y-3">
                {beneficiarios.map((b) => {
                  const totalPercent = beneficiarios.reduce((sum, x) => sum + x.percentagem, 0);
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-2 bg-zinc-50 p-2.5 rounded border border-zinc-200">
                      <div className="leading-tight flex-1">
                        <span className="text-xs font-bold text-zinc-800 block">{b.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative w-16">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={b.percentagem}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                              const updated = beneficiarios.map(x => x.id === b.id ? { ...x, percentagem: val } : x);
                              saveBeneficiarios(updated);
                            }}
                            className="w-full text-right pr-4 py-1 text-xs font-bold border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 font-mono bg-white"
                          />
                          <span className="absolute right-1 top-1.5 text-[9px] text-zinc-400 font-bold">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = beneficiarios.filter(x => x.id !== b.id);
                            saveBeneficiarios(updated);
                          }}
                          className="p-1 hover:text-red-600 text-zinc-400 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Remover Beneficiário"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Beneficiary Inline Form */}
                {isAddingBeneficiary ? (
                  <div className="bg-zinc-100 p-3 rounded-lg border border-zinc-300 space-y-2.5 animate-in fade-in duration-150">
                    <span className="text-[10px] font-black uppercase text-zinc-600 block">Novo Destinatário</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-bold block">Nome do Beneficiário / Quota</label>
                      <input
                        type="text"
                        placeholder="Ex: Comité de Zona"
                        value={newBenefNome}
                        onChange={(e) => setNewBenefNome(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-zinc-300 rounded focus:outline-none bg-white font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-bold block">Percentagem (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newBenefPct}
                        onChange={(e) => setNewBenefPct(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 text-xs border border-zinc-300 rounded focus:outline-none bg-white font-mono font-bold"
                      />
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingBeneficiary(false);
                          setNewBenefNome("");
                        }}
                        className="px-2 py-1 text-[10px] bg-zinc-200 hover:bg-zinc-300 rounded text-zinc-700 font-black uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newBenefNome.trim()) return;
                          const newId = "benef_" + Date.now();
                          saveBeneficiarios([...beneficiarios, { id: newId, nome: newBenefNome, percentagem: newBenefPct }]);
                          setIsAddingBeneficiary(false);
                          setNewBenefNome("");
                        }}
                        className="px-2.5 py-1 text-[10px] bg-red-700 hover:bg-red-800 text-white rounded font-black uppercase cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingBeneficiary(true);
                      setNewBenefNome("");
                      setNewBenefPct(5);
                    }}
                    className="w-full py-2 bg-zinc-50 hover:bg-zinc-100 border border-dashed border-zinc-300 hover:border-zinc-400 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Adicionar Destinatário</span>
                  </button>
                )}
              </div>

              {/* Percentages Summary and Warning Block */}
              {(() => {
                const totalPercent = beneficiarios.reduce((sum, b) => sum + b.percentagem, 0);
                const saldoPercent = Math.max(0, 100 - totalPercent);
                return (
                  <div className="pt-3 border-t border-zinc-200 space-y-2 text-xs font-bold">
                    <div className="flex justify-between items-center text-zinc-600">
                      <span>Total Configurado:</span>
                      <span className={totalPercent > 100 ? "text-red-600 font-black" : "text-zinc-900 font-black"}>
                        {totalPercent}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-zinc-600">
                      <span>Saldo Retido no CAP:</span>
                      <span className="text-emerald-600 font-black">
                        {saldoPercent}%
                      </span>
                    </div>

                    {totalPercent > 100 ? (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded text-[10px] leading-relaxed">
                        <strong>⚠️ Percentagem Excedida:</strong> A soma das regras é {totalPercent}%, o que excede o limite absoluto de 100%. Por favor, reduza os valores antes de emitir relatórios.
                      </div>
                    ) : (
                      <div className="p-2.5 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded text-[10px] leading-relaxed font-medium">
                        * Qualquer diferença entre a soma e 100% ({saldoPercent}%) é contabilizada como <strong>Saldo Local</strong> residual na conta corrente do CAP-190.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Monthly Calculation and Process Board */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-zinc-200 p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <div>
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-wider block">
                    Balanço Mensal de Distribuição
                  </span>
                  <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                    Demonstração de arrecadação e destinação de receitas para o ano selecionado.
                  </span>
                </div>

                {/* Year Select specifically for Distribution */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400">Ano Fiscal:</span>
                  <select
                    value={selectedYearFilter === "Todos" ? 2026 : selectedYearFilter}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSelectedYearFilter(val);
                    }}
                    className="px-2 py-1 text-xs border border-zinc-300 rounded font-bold font-mono bg-zinc-50 hover:bg-zinc-100 cursor-pointer text-zinc-700"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                </div>
              </div>

              {/* Monthly Shares Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-bold text-zinc-700">
                  <thead>
                    <tr className="bg-zinc-950 text-white text-[10px] uppercase font-black tracking-wider border-b border-zinc-800">
                      <th className="py-2.5 px-3">Mês</th>
                      <th className="py-2.5 px-3 text-right">Total Arrecadado</th>
                      <th className="py-2.5 px-3 text-right">Total Distribuído</th>
                      <th className="py-2.5 px-3 text-right">Saldo CAP</th>
                      <th className="py-2.5 px-3 text-center">Homologação</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const monthNum = idx + 1;
                      const yearNum = selectedYearFilter === "Todos" ? 2026 : selectedYearFilter;
                      
                      // Calculate values
                      const collected = payments
                        .filter(p => p.pago && p.mes === monthNum && p.ano === yearNum)
                        .reduce((sum, p) => sum + p.valor, 0);

                      const totalPercent = beneficiarios.reduce((sum, b) => sum + b.percentagem, 0);
                      const distributed = Math.round(collected * (totalPercent / 100));
                      const saldo = collected - distributed;

                      // Approval status
                      const approvalKey = `${monthNum}-${yearNum}`;
                      const appState = approvals[approvalKey] || {};
                      
                      const isAprovado = !!(appState.elaborado?.assinado && appState.autorizado?.assinado);
                      const isSubmetido = !!appState.elaborado?.assinado;

                      let statusBadge = (
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black bg-zinc-100 text-zinc-400 border border-zinc-200 uppercase">
                          PENDENTE
                        </span>
                      );
                      if (isAprovado) {
                        statusBadge = (
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            ✓ APROVADO
                          </span>
                        );
                      } else if (isSubmetido) {
                        statusBadge = (
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            SUBMETIDO
                          </span>
                        );
                      }

                      return (
                        <tr key={monthNum} className="hover:bg-zinc-50/50 transition-all">
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-zinc-900 block uppercase text-[11px] tracking-tight">
                              {MONTHS_FULL[idx]}
                            </span>
                            <span className="text-[9px] text-zinc-400 block font-mono">Competência {monthNum}/{yearNum}</span>
                          </td>
                          
                          <td className="py-3 px-3 text-right font-mono font-black text-zinc-900">
                            {formatAKZ(collected)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-emerald-600 font-extrabold">
                            {formatAKZ(distributed)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-blue-600 font-extrabold">
                            {formatAKZ(Math.max(0, saldo))}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {statusBadge}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReportMonth(monthNum);
                                setSelectedReportYear(yearNum);
                                setReportEmissionDate(new Date().toISOString().split("T")[0]);
                              }}
                              className="px-2.5 py-1 text-[10px] font-black uppercase rounded bg-red-700 hover:bg-red-800 text-white cursor-pointer shadow-xs transition-colors flex items-center gap-1 ml-auto"
                            >
                              <FileText className="w-3.5 h-3.5 text-yellow-300" />
                              <span>Relatório</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5.6. Beautiful Monthly Share Distribution Report Overlay Modal */}
      {selectedReportMonth !== null && selectedReportYear !== null && (() => {
        const monthNum = selectedReportMonth;
        const yearNum = selectedReportYear;
        const approvalKey = `${monthNum}-${yearNum}`;
        const appState = approvals[approvalKey] || {};
        
        // Calculate report values
        const totalArrecadado = payments
          .filter(p => p.pago && p.mes === monthNum && p.ano === yearNum)
          .reduce((sum, p) => sum + p.valor, 0);

        const totalPercent = beneficiarios.reduce((sum, b) => sum + b.percentagem, 0);
        const saldoPercent = Math.max(0, 100 - totalPercent);

        const calculatedShares = beneficiarios.map(b => {
          const shareVal = Math.round(totalArrecadado * (b.percentagem / 100));
          return {
            ...b,
            valorCalculado: shareVal
          };
        });

        const totalDistribuido = calculatedShares.reduce((sum, b) => sum + b.valorCalculado, 0);
        const saldoResidual = totalArrecadado - totalDistribuido;

        // Check is Homologated
        const isHomologated = !!(appState.elaborado?.assinado && appState.autorizado?.assinado);

        // Fetch list of payments in this month/year to show on the report
        const monthPayments = payments.filter(p => p.pago && p.mes === monthNum && p.ano === yearNum);

        const handleSign = (roleKey: "elaborado" | "verificado" | "aprovado" | "autorizado") => {
          const typedName = signInputs[`${roleKey}Nome` as keyof typeof signInputs];
          const typedDate = signInputs[`${roleKey}Data` as keyof typeof signInputs];

          if (!typedName.trim()) {
            alert(`Por favor, insira o nome do responsável por este pelouro.`);
            return;
          }

          const updatedApproval = {
            ...appState,
            [roleKey]: {
              nome: typedName,
              data: typedDate,
              assinado: true
            }
          };

          const newApprovals = {
            ...approvals,
            [approvalKey]: updatedApproval
          };

          saveApprovals(newApprovals);
        };

        const handleClearSign = (roleKey: "elaborado" | "verificado" | "aprovado" | "autorizado") => {
          const updatedApproval = {
            ...appState,
            [roleKey]: undefined
          };

          const newApprovals = {
            ...approvals,
            [approvalKey]: updatedApproval
          };

          saveApprovals(newApprovals);
        };

        const handleSubmeter = () => {
          const updatedApproval = {
            ...appState,
            submetido: true,
            dataSubmissao: new Date().toISOString().split("T")[0]
          };

          const newApprovals = {
            ...approvals,
            [approvalKey]: updatedApproval
          };

          saveApprovals(newApprovals);
          alert(`O relatório homologado do mês de ${MONTHS_FULL[monthNum - 1]} foi submetido digitalmente ao Comité do Distrito com sucesso!`);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" id="modal-distribution-report-overlay">
            {/* Inject printable styles */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                /* Hide everything else */
                body * {
                  visibility: hidden !important;
                }
                #dist-report-print-content, #dist-report-print-content * {
                  visibility: visible !important;
                }
                #dist-report-print-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  background: white !important;
                  color: black !important;
                  padding: 1.5cm !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print {
                  display: none !important;
                }
                /* Watermark in printing */
                .print-watermark-container {
                  position: relative !important;
                }
                .print-watermark {
                  display: block !important;
                }
                .print-break-inside-avoid {
                  page-break-inside: avoid !important;
                }
              }
            `}} />

            <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" id="modal-distribution-report">
              {/* Modal Header */}
              <div className="bg-zinc-950 text-white p-4 flex items-center justify-between border-b-4 border-red-700 no-print">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  <span className="text-xs font-black tracking-widest uppercase">
                    Relatório Oficial de Partilha e Distribuição de Quotas
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedReportMonth(null);
                    setSelectedReportYear(null);
                  }}
                  className="p-1 hover:bg-zinc-900 rounded transition-colors text-zinc-400 hover:text-white cursor-pointer"
                  id="close-dist-report-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Bar (hidden on print) */}
              <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-bold">Data de Emissão do Documento:</span>
                  <input
                    type="date"
                    value={reportEmissionDate}
                    onChange={(e) => setReportEmissionDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-zinc-300 rounded font-mono font-bold text-zinc-700 bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-sm transition-all cursor-pointer select-none"
                    id="print-dist-report-btn"
                  >
                    <Printer className="w-4 h-4 text-yellow-500" />
                    <span>Imprimir Relatório</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      generateMonthlySharePDF(
                        monthNum,
                        selectedReportYear,
                        totalArrecadado,
                        calculatedShares,
                        totalDistribuido,
                        saldoResidual,
                        isHomologated,
                        !!appState.submetido,
                        appState,
                        reportEmissionDate
                      );
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer select-none"
                    id="pdf-dist-report-btn"
                  >
                    <FileText className="w-4 h-4 text-yellow-300" />
                    <span>Exportar em PDF</span>
                  </button>

                  {isHomologated && (
                    appState.submetido ? (
                      <div
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-lg shadow-sm opacity-90 select-none"
                        id="submit-dist-report-btn-done"
                      >
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>✓ Relatório Submetido</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSubmeter}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer select-none border border-blue-600"
                        id="submit-dist-report-btn"
                      >
                        <TrendingUp className="w-4 h-4 text-yellow-300" />
                        <span>Submeter Homologado</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Scrollable body of the modal */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6" id="report-modal-scrollable-body">
                {/* Validity alerts based on signatures */}
                <div className="mb-6 no-print">
                  {isHomologated ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3.5 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold">✓</div>
                      <div>
                        <h5 className="font-extrabold uppercase text-xs">Relatório Submetido e Aprovado</h5>
                        <p className="text-[11px] text-emerald-700 mt-0.5 font-medium leading-relaxed">
                          Este relatório de partilha de quotas foi devidamente <strong>submetido pelo Tesoureiro</strong> e <strong>aprovado pelo Coordenador Geral</strong>. O documento está ativo e validado.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3.5 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <h5 className="font-extrabold uppercase text-xs text-amber-950">Aviso: Relatório Pendente de Aprovação</h5>
                        <p className="text-[11px] text-amber-700 mt-0.5 font-medium leading-relaxed">
                          Este documento <strong>não é considerado definitivo</strong> até que o Tesoureiro realize a submissão e o Coordenador faça a respetiva aprovação. Atualmente encontra-se sob o estatuto de <strong>"Rascunho de Trabalho"</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* THE PRINTABLE FRAME */}
                <div 
                  className="bg-white rounded-lg border border-zinc-200 p-8 shadow-sm relative overflow-hidden print:p-0 print:border-none print:shadow-none print-watermark-container"
                  id="dist-report-print-content"
                >
                  {/* Diagonal Watermark if NOT Homologated */}
                  {!isHomologated && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 print-watermark"
                      style={{ opacity: 0.04 }}
                    >
                      <span 
                        className="text-red-700 text-5xl font-black tracking-widest border-8 border-red-700 p-6 uppercase leading-none rounded-2xl whitespace-nowrap"
                        style={{ transform: "rotate(-30deg)" }}
                      >
                        PENDENTE DE APROVAÇÃO
                      </span>
                    </div>
                  )}

                  {/* Official Header */}
                  <div className="border-b-4 border-red-600 pb-4 mb-6 flex items-center relative" id="report-letterhead">
                    <div className="absolute left-0">
                      <MplaCrestSvg className="w-16 h-20 shrink-0" />
                    </div>
                    <div className="w-full text-center py-2 flex flex-col items-center justify-center">
                      <h1 className="text-3xl font-black tracking-widest text-zinc-950 font-sans leading-none m-0">MPLA</h1>
                      <h2 className="text-xs font-black text-zinc-900 uppercase mt-2.5 tracking-wide font-sans leading-none">COMITE DE ACCAO DO PARTIDO - 190</h2>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase mt-1.5 font-sans leading-none">Ingombota - Luanda * Angola</h3>
                    </div>
                  </div>

                  {/* Memorandum Meta Info Box */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2 text-xs font-sans text-zinc-800 mb-6" id="report-memo-header">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">MEMORANDO INTERNO / ADENDA REGULAMENTAR</span>
                        <span className="text-zinc-900 font-black block mt-0.5">REF: ADENDA-CAP190-PARTILHA-{monthNum}-{yearNum}</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">DATA DE EMISSÃO</span>
                        <span className="text-zinc-900 font-black block mt-0.5 font-mono">{reportEmissionDate.split("-").reverse().join("/")}</span>
                      </div>
                    </div>
                    <div className="border-t border-zinc-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <strong className="text-zinc-500 uppercase font-black">PARA:</strong> <span className="text-zinc-900 font-bold">Comité do Distrito Urbano da Ingombota / Órgãos de Controle</span>
                      </div>
                      <div>
                        <strong className="text-zinc-500 uppercase font-black">DE:</strong> <span className="text-zinc-900 font-bold">Comité de Acção do Partido 190 (CAP-190)</span>
                      </div>
                      <div className="sm:col-span-2">
                        <strong className="text-zinc-500 uppercase font-black font-sans">ASSUNTO:</strong> <span className="text-zinc-900 font-black uppercase">Partilha de Quotas Consolidadas - {MONTHS_FULL[monthNum - 1]} de {yearNum}</span>
                      </div>
                    </div>
                  </div>

                  {/* Introduction Statement */}
                  <p className="text-xs text-zinc-700 font-normal leading-relaxed mb-6 font-sans text-justify">
                    Em estrito cumprimento das diretrizes estatutárias vigentes e em conformidade com o regulamento sobre a autonomia financeira dos órgãos locais do Partido, o Comité de Acção do Partido 190 (CAP-190) apresenta o presente Memorando de Partilha e Distribuição de Quotas. Este instrumento formaliza e homologa a alocação automática de fundos arrecadados a título de quotas de militantes referentes ao período indicado, distribuindo-os estritamente de acordo com os coeficientes e percentagens estatutárias aplicáveis aos órgãos destinatários, conforme detalhado no quadro demonstrativo abaixo:
                  </p>

                  {/* Summary block (Only showing distributed value as requested) */}
                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30 text-center max-w-sm mx-auto mb-6 mb-6 font-sans">
                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block leading-none">TOTAL PARTILHADO (DISTRIBUÍDO)</span>
                    <span className="text-lg font-black text-emerald-700 font-mono mt-1.5 block">{formatAKZ(totalDistribuido)}</span>
                    <span className="text-[8px] text-emerald-600 font-bold block mt-1 uppercase">Soma das Cotas Estatutárias ({totalPercent}%)</span>
                  </div>

                  {/* Processo de Homologação Campo Visual (Visual Tracker) */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 font-sans mb-6 no-print" id="report-homologation-tracker">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-800 uppercase tracking-wider block">
                        Fluxo de Tramitação e Homologação Administrativa
                      </span>
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                        isHomologated 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                      }`}>
                        {isHomologated ? "Homologado e Ativo" : "Pendente de Assinaturas"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center text-[9px]">
                      {/* Step 1 */}
                      <div className={`p-3.5 rounded-lg border flex flex-col justify-between h-20 ${
                        appState.elaborado?.assinado 
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" 
                          : "bg-zinc-100 border-zinc-200 text-zinc-400"
                      }`}>
                        <span className="font-extrabold uppercase text-[8px]">1. Submissão (Tesoureiro)</span>
                        {appState.elaborado?.assinado ? (
                          <div className="my-1">
                            <span className="font-serif italic font-black text-[10px] block leading-none text-red-700">{appState.elaborado.nome}</span>
                            <span className="text-[7px] text-zinc-400 font-mono block mt-1">{appState.elaborado.data.split("-").reverse().join("/")}</span>
                          </div>
                        ) : (
                          <span className="italic block my-2 font-bold text-zinc-400">Pendente</span>
                        )}
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase border-t border-zinc-200/50 pt-1">Tesoureiro CAP-190</span>
                      </div>

                      {/* Step 2 */}
                      <div className={`p-3.5 rounded-lg border flex flex-col justify-between h-20 ${
                        appState.autorizado?.assinado 
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" 
                          : "bg-zinc-100 border-zinc-200 text-zinc-400"
                      }`}>
                        <span className="font-extrabold uppercase text-[8px]">2. Aprovação (Coordenador)</span>
                        {appState.autorizado?.assinado ? (
                          <div className="my-1">
                            <span className="font-serif italic font-black text-[10px] block leading-none text-red-700">{appState.autorizado.nome}</span>
                            <span className="text-[7px] text-zinc-400 font-mono block mt-1">{appState.autorizado.data.split("-").reverse().join("/")}</span>
                          </div>
                        ) : (
                          <span className="italic block my-2 font-bold text-zinc-400">Pendente</span>
                        )}
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase border-t border-zinc-200/50 pt-1">Coordenador do CAP-190</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Share Distribution Table */}
                  <div className="mb-6">
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-wider block mb-2 font-sans">
                      1. Demonstração de Valores Partilhados por Beneficiário
                    </span>
                    <table className="w-full text-left border-collapse text-[10px] font-sans">
                      <thead>
                        <tr className="bg-zinc-100/80 font-black border-b border-zinc-300 text-zinc-700 uppercase">
                          <th className="py-2.5 px-3">Beneficiário / Quota Destinatária</th>
                          <th className="py-2.5 px-3 text-center w-36">Percentagem Aplicada</th>
                          <th className="py-2.5 px-3 text-right w-44">Valor Partilhado (Kwanza)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                        {calculatedShares.map((b) => (
                          <tr key={b.id}>
                            <td className="py-2.5 px-3 font-extrabold text-zinc-900">{b.nome}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-700">{b.percentagem}%</td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-zinc-950">{formatAKZ(b.valorCalculado)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-zinc-900 font-black bg-zinc-50">
                        <tr className="text-zinc-900 font-bold uppercase">
                          <td className="py-2.5 px-3">TOTAL REPARTIDO E CONSOLIDADO</td>
                          <td className="py-2.5 px-3 text-center font-mono">{totalPercent}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold">{formatAKZ(totalDistribuido)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 2 Official Signature Blocks */}
                  <div className="border-t border-dashed border-zinc-300 pt-6 mt-10 print-break-inside-avoid" id="report-signatures">
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-wider text-center block mb-6 font-sans">
                      2. Submissão e Aprovação (Assinaturas Físicas)
                    </span>

                    <div className="grid grid-cols-2 gap-8 text-[10px] font-sans">
                      {/* Box 1: Elaborado por (Tesoureiro) */}
                      <div className="border border-zinc-200 rounded p-4 text-center flex flex-col justify-between bg-zinc-50/15 min-h-[140px]">
                        <span className="font-extrabold text-zinc-400 uppercase tracking-wider block text-[8px] leading-none mb-1">
                          1. SUBMETIDO POR (TESOUREIRO)
                        </span>
                        
                        {/* Physical Signature Line and Name */}
                        <div className="flex-1 flex flex-col items-center justify-center py-4">
                          <div className="w-4/5 border-b border-zinc-400 h-6"></div>
                          <span className="block text-[10px] font-extrabold text-zinc-900 mt-2">
                            {appState.elaborado?.assinado ? `( ${appState.elaborado.nome} )` : "( ___________________________ )"}
                          </span>
                          <span className="text-[7.5px] text-zinc-500 font-mono mt-0.5 block">
                            {appState.elaborado?.assinado 
                              ? `Registado em: ${appState.elaborado.data.split("-").reverse().join("/")}`
                              : "Data: ____/____/2026   [ Carimbo ]"}
                          </span>
                        </div>

                        {/* Setup fields - Hidden on print */}
                        {!appState.elaborado?.assinado && (
                          <div className="py-1.5 space-y-2 no-print border-t border-zinc-100 pt-2">
                            <input
                              type="text"
                              placeholder="Nome do Tesoureiro"
                              value={signInputs.elaboradoNome}
                              onChange={(e) => setSignInputs(prev => ({ ...prev, elaboradoNome: e.target.value }))}
                              className="w-full px-2 py-1 text-[10px] border border-zinc-300 rounded focus:outline-none bg-white font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleSign("elaborado")}
                              className="w-full py-1 bg-red-700 hover:bg-red-800 text-white rounded text-[9px] font-black uppercase cursor-pointer"
                            >
                              Submeter Relatório
                            </button>
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-200/50">
                          <span className="font-black text-zinc-800 uppercase text-[9px]">Tesoureiro CAP-190</span>
                          {appState.elaborado?.assinado && (
                            <button
                              type="button"
                              onClick={() => handleClearSign("elaborado")}
                              className="text-[8px] text-red-600 font-bold underline hover:text-red-800 block mt-1 mx-auto no-print cursor-pointer"
                            >
                              Limpar Registo
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Box 2: Autorizado por (Coordenador do CAP-190) */}
                      <div className="border border-zinc-200 rounded p-4 text-center flex flex-col justify-between bg-zinc-50/15 min-h-[140px]">
                        <span className="font-extrabold text-zinc-400 uppercase tracking-wider block text-[8px] leading-none mb-1">
                          2. APROVADO POR (COORDENADOR)
                        </span>
                        
                        {/* Physical Signature Line and Name */}
                        <div className="flex-1 flex flex-col items-center justify-center py-4">
                          <div className="w-4/5 border-b border-zinc-400 h-6"></div>
                          <span className="block text-[10px] font-extrabold text-zinc-900 mt-2">
                            {appState.autorizado?.assinado ? `( ${appState.autorizado.nome} )` : "( ___________________________ )"}
                          </span>
                          <span className="text-[7.5px] text-zinc-500 font-mono mt-0.5 block">
                            {appState.autorizado?.assinado 
                              ? `Registado em: ${appState.autorizado.data.split("-").reverse().join("/")}`
                              : "Data: ____/____/2026   [ Carimbo ]"}
                          </span>
                        </div>

                        {/* Setup fields - Hidden on print */}
                        {!appState.autorizado?.assinado && (
                          <div className="py-1.5 space-y-2 no-print border-t border-zinc-100 pt-2">
                            {appState.elaborado?.assinado ? (
                              <>
                                <input
                                  type="text"
                                  placeholder="Nome do Coordenador"
                                  value={signInputs.autorizadoNome}
                                  onChange={(e) => setSignInputs(prev => ({ ...prev, autorizadoNome: e.target.value }))}
                                  className="w-full px-2 py-1 text-[10px] border border-zinc-300 rounded focus:outline-none bg-white font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSign("autorizado")}
                                  className="w-full py-1 bg-red-700 hover:bg-red-800 text-white rounded text-[9px] font-black uppercase cursor-pointer"
                                >
                                  Aprovar Relatório
                                </button>
                              </>
                            ) : (
                              <div className="text-[9px] text-zinc-400 italic font-medium py-2.5 bg-zinc-100/50 border border-zinc-200 rounded">
                                Aguardando Submissão do Tesoureiro
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-200/50">
                          <span className="font-black text-zinc-800 uppercase text-[9px]">Coordenador do CAP-190</span>
                          {appState.autorizado?.assinado && (
                            <button
                              type="button"
                              onClick={() => handleClearSign("autorizado")}
                              className="text-[8px] text-red-600 font-bold underline hover:text-red-800 block mt-1 mx-auto no-print cursor-pointer"
                            >
                              Limpar Registo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stamp Seal and Close Block */}
                  {isHomologated && (
                    <div className="mt-10 border-t border-zinc-200 pt-6 flex flex-col items-center justify-center font-sans print-break-inside-avoid">
                      <div className="border-4 border-emerald-600 text-emerald-600 font-black p-3 rounded-full text-xs uppercase tracking-widest text-center max-w-sm rotate-1 mx-auto leading-none bg-white shadow-xs">
                        <span className="block font-black text-[13px]">MPLA * APROVADO</span>
                        <span className="block text-[8px] font-bold mt-1 text-zinc-500 font-mono">REPARTIÇÃO SUBMETIDA E APROVADA</span>
                        <span className="block text-[8px] font-bold text-zinc-400 font-mono">CÓDIGO DE QUITAÇÃO: CAP190-SHARE-{monthNum}-{yearNum}</span>
                      </div>
                    </div>
                  )}

                  {/* Technical Footer */}
                  <div className="mt-12 text-center text-[8px] text-zinc-400 font-mono uppercase tracking-wider block">
                    Documento Gerado Automáticamente pelo Módulo de Gestão Financeira CAP-190 * {yearNum}
                  </div>
                </div>

              </div>

              {/* Modal Footer (hidden on print) */}
              <div className="bg-zinc-100 px-5 py-3.5 flex justify-end gap-2 border-t border-zinc-200 no-print">
                <button
                  onClick={() => {
                    setSelectedReportMonth(null);
                    setSelectedReportYear(null);
                  }}
                  className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-lg text-xs font-black uppercase tracking-wider shadow-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
