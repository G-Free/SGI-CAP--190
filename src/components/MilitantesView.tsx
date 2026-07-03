/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  AlertTriangle, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShieldAlert,
  Download,
  Printer,
  FileText
} from "lucide-react";
import { Militante, MilitanteEstado, QuotaPayment } from "../types";
import { jsPDF } from "jspdf";

interface MilitantesViewProps {
  militants: Militante[];
  payments?: QuotaPayment[];
  onAddMilitante: (m: Omit<Militante, "id">) => void;
  onUpdateMilitante: (m: Militante) => void;
  onDeleteMilitante: (id: string) => void;
  onAddNotification?: (notif: { type: "success" | "info" | "warning" | "error"; title: string; message: string }) => void;
  userRole?: string;
}

export function MilitantesView({ 
  militants, 
  payments = [],
  onAddMilitante, 
  onUpdateMilitante, 
  onDeleteMilitante,
  onAddNotification,
  userRole = "Administrador"
}: MilitantesViewProps) {

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | MilitanteEstado>("Todos");
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilitante, setEditingMilitante] = useState<Militante | null>(null);
  
  // Form Field States
  const [formNome, setFormNome] = useState("");
  const [formNumeroCartao, setFormNumeroCartao] = useState("");
  const [formEstado, setFormEstado] = useState<MilitanteEstado>("Activo");
  const [formTelefone, setFormTelefone] = useState("");
  const [formBairro, setFormBairro] = useState("Ingombota");
  const [formDataAdmissao, setFormDataAdmissao] = useState(new Date().toISOString().split("T")[0]);
  const [formEmail, setFormEmail] = useState("");
  const [formCargo, setFormCargo] = useState("Militantes");
  const [formProfissao, setFormProfissao] = useState("");
  const [formAnoInclusao, setFormAnoInclusao] = useState<number>(new Date().getFullYear());
  const [formDataNascimento, setFormDataNascimento] = useState("");
  const [formMorada, setFormMorada] = useState("");
  const [formSetor, setFormSetor] = useState("");
  const [formZona, setFormZona] = useState("");
  const [formFoto, setFormFoto] = useState("");
  const [formGenero, setFormGenero] = useState("Masculino");
  const [formRegistoEleitoral, setFormRegistoEleitoral] = useState<"Registado" | "Não Registado" | "Pendente">("Pendente");

  // Detail Modal States
  const [selectedMilitante, setSelectedMilitante] = useState<Militante | null>(null);

  // Advanced Filter States
  const [bairroFilter, setBairroFilter] = useState("Todos");
  const [admissionYearFilter, setAdmissionYearFilter] = useState("Todos");
  const [regularityFilter, setRegularityFilter] = useState("Todos");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [zoneFilter, setZoneFilter] = useState("Todos");
  const [cargoFilter, setCargoFilter] = useState("Todos");
  const [electoralFilter, setElectoralFilter] = useState("Todos");

  // Voter registration campaign toggle
  const [campanhaEleitoralActiva, setCampanhaEleitoralActiva] = useState(() => {
    const saved = localStorage.getItem("mpla_campanha_activa");
    return saved !== "false"; // default to true
  });

  // Email Simulator Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEmailRecipient, setSelectedEmailRecipient] = useState<Militante | "all" | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Overdue month count checker helper (current month: June 2026, Year: 2026)
  const getOverdueMonths = (m: Militante) => {
    if (m.estado !== "Activo") return 0;
    const currentYear = 2026;
    const currentMonth = 6;
    
    const joinParts = m.dataAdmissao.split("-");
    const joinYear = parseInt(joinParts[0], 10) || 2026;
    const joinMonth = parseInt(joinParts[1], 10) || 1;
    
    let startYear = 2026;
    let startMonth = 1;
    
    if (joinYear > startYear || (joinYear === startYear && joinMonth > startMonth)) {
      startYear = joinYear;
      startMonth = joinMonth;
    }
    
    if (startYear > currentYear || (startYear === currentYear && startMonth > currentMonth)) {
      return 0;
    }
    
    const totalRequiredMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth + 1);
    
    const paidMonthsCount = payments.filter(p => {
      if (p.militanteId !== m.id || !p.pago) return false;
      const pYear = p.ano;
      const pMes = p.mes;
      if (pYear < startYear || (pYear === startYear && pMes < startMonth)) return false;
      if (pYear > currentYear || (pYear === currentYear && pMes > currentMonth)) return false;
      return true;
    }).length;
    
    return Math.max(0, totalRequiredMonths - paidMonthsCount);
  };

  const formatAKZ = (val: number) => {
    return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
      .format(val)
      .replace("Kz", "AKZ")
      .trim();
  };

  const uniqueBairros = useMemo(() => {
    const bSet = new Set(militants.map(m => m.bairro).filter(Boolean));
    return ["Todos", ...Array.from(bSet)].sort();
  }, [militants]);

  const uniqueSectors = useMemo(() => {
    const sSet = new Set(militants.map(m => m.setor).filter(Boolean));
    return ["Todos", ...Array.from(sSet)].sort();
  }, [militants]);

  const uniqueZones = useMemo(() => {
    const zSet = new Set(militants.map(m => m.zona).filter(Boolean));
    return ["Todos", ...Array.from(zSet)].sort();
  }, [militants]);

  const uniqueCargos = useMemo(() => {
    const cSet = new Set(militants.map(m => m.cargo || "Membro do Partido").filter(Boolean));
    return ["Todos", ...Array.from(cSet)].sort();
  }, [militants]);

  // Filter & Search Logic
  const filteredMilitants = useMemo(() => {
    let result = militants;

    if (statusFilter !== "Todos") {
      result = result.filter(m => m.estado === statusFilter);
    }

    if (bairroFilter !== "Todos") {
      result = result.filter(m => m.bairro === bairroFilter);
    }

    if (sectorFilter !== "Todos") {
      result = result.filter(m => m.setor === sectorFilter);
    }

    if (zoneFilter !== "Todos") {
      result = result.filter(m => m.zona === zoneFilter);
    }

    if (cargoFilter !== "Todos") {
      result = result.filter(m => (m.cargo || "Membro do Partido") === cargoFilter);
    }

    if (electoralFilter !== "Todos") {
      result = result.filter(m => (m.registoEleitoral || "Pendente") === electoralFilter);
    }

    if (admissionYearFilter !== "Todos") {
      result = result.filter(m => {
        const year = m.dataAdmissao.split("-")[0];
        if (admissionYearFilter === "Antes de 2025") {
          return parseInt(year, 10) < 2025;
        }
        return year === admissionYearFilter;
      });
    }

    if (regularityFilter !== "Todos") {
      result = result.filter(m => {
        const overdueCount = getOverdueMonths(m);
        if (regularityFilter === "Regular") {
          return m.estado === "Activo" && overdueCount === 0;
        } else if (regularityFilter === "Em Atraso") {
          return m.estado === "Activo" && overdueCount > 0 && overdueCount <= 3;
        } else if (regularityFilter === "Atraso Crítico (+3m)") {
          return m.estado === "Activo" && overdueCount > 3;
        }
        return true;
      });
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const formatDateForSearch = (dateStr?: string) => {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      };

      result = result.filter(
        m => m.nome.toLowerCase().includes(term) || 
             m.numeroCartao.toLowerCase().includes(term) ||
             (m.cargo && m.cargo.toLowerCase().includes(term)) ||
             (m.profissao && m.profissao.toLowerCase().includes(term)) ||
             (m.setor && m.setor.toLowerCase().includes(term)) ||
             (m.zona && m.zona.toLowerCase().includes(term)) ||
             m.dataAdmissao.includes(term) ||
             formatDateForSearch(m.dataAdmissao).includes(term) ||
             (m.dataNascimento && (m.dataNascimento.includes(term) || formatDateForSearch(m.dataNascimento).includes(term)))
      );
    }

    // Sort by card number or admission date (newest first)
    return [...result].sort((a, b) => b.dataAdmissao.localeCompare(a.dataAdmissao));
  }, [militants, searchTerm, statusFilter, bairroFilter, sectorFilter, zoneFilter, cargoFilter, electoralFilter, admissionYearFilter, regularityFilter, payments]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredMilitants.length / itemsPerPage) || 1;
  const paginatedMilitants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMilitants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMilitants, currentPage]);

  // Reset pagination when filter changes
  const handleStatusFilterChange = (filter: "Todos" | MilitanteEstado) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Open Form to Add
  const handleOpenAddModal = () => {
    setEditingMilitante(null);
    setFormNome("");
    // Suggest sequential card number
    const nextNum = militants.length + 1;
    setFormNumeroCartao(`CAP190-${nextNum.toString().padStart(4, "0")}`);
    setFormEstado("Activo");
    setFormTelefone("");
    setFormBairro("Ingombota");
    setFormDataAdmissao(new Date().toISOString().split("T")[0]);
    setFormEmail("");
    setFormCargo("Militantes");
    setFormProfissao("");
    setFormAnoInclusao(new Date().getFullYear());
    setFormDataNascimento("");
    setFormMorada("");
    setFormSetor("");
    setFormZona("");
    setFormFoto("");
    setFormGenero("Masculino");
    setFormRegistoEleitoral("Pendente");
    setIsModalOpen(true);
  };

  // Open Form to Edit
  const handleOpenEditModal = (m: Militante) => {
    setEditingMilitante(m);
    setFormNome(m.nome);
    setFormNumeroCartao(m.numeroCartao);
    setFormEstado(m.estado);
    setFormTelefone(m.telefone);
    setFormBairro(m.bairro);
    setFormDataAdmissao(m.dataAdmissao);
    setFormEmail(m.email || "");
    setFormCargo(m.cargo || "Militantes");
    setFormProfissao(m.profissao || "");
    setFormAnoInclusao(m.anoInclusao || new Date().getFullYear());
    setFormDataNascimento(m.dataNascimento || "");
    setFormMorada(m.morada || "");
    setFormSetor(m.setor || "");
    setFormZona(m.zona || "");
    setFormFoto(m.foto || "");
    setFormGenero(m.genero || "Masculino");
    setFormRegistoEleitoral(m.registoEleitoral || "Pendente");
    setIsModalOpen(true);
  };

  // Save / Update Handler
  const handleSaveMilitante = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formNome.trim() || !formNumeroCartao.trim() || !formTelefone.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios (Nome, Cartão e Telefone).");
      return;
    }

    if (editingMilitante) {
      // Edit
      onUpdateMilitante({
        ...editingMilitante,
        nome: formNome,
        numeroCartao: formNumeroCartao,
        estado: formEstado,
        telefone: formTelefone,
        bairro: formBairro,
        dataAdmissao: formDataAdmissao,
        email: formEmail,
        cargo: formCargo,
        profissao: formProfissao || undefined,
        anoInclusao: Number(formAnoInclusao) || undefined,
        dataNascimento: formDataNascimento || undefined,
        morada: formMorada || undefined,
        setor: formSetor || undefined,
        zona: formZona || undefined,
        genero: formGenero,
        foto: formFoto || undefined,
        registoEleitoral: formRegistoEleitoral,
      });
    } else {
      // Add
      onAddMilitante({
        nome: formNome,
        numeroCartao: formNumeroCartao,
        estado: formEstado,
        telefone: formTelefone,
        bairro: formBairro,
        dataAdmissao: formDataAdmissao,
        email: formEmail,
        cargo: formCargo,
        profissao: formProfissao || undefined,
        anoInclusao: Number(formAnoInclusao) || undefined,
        dataNascimento: formDataNascimento || undefined,
        morada: formMorada || undefined,
        setor: formSetor || undefined,
        zona: formZona || undefined,
        genero: formGenero,
        foto: formFoto || undefined,
        registoEleitoral: formRegistoEleitoral,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este militante? Esta acção removerá permanentemente o registo.")) {
      onDeleteMilitante(id);
      if (selectedMilitante?.id === id) {
        setSelectedMilitante(null);
      }
    }
  };

  const isReadOnly = userRole === "Tesoureiro";

  const handleExportFilteredPDF = () => {
    const doc = new jsPDF();
    
    // Header Style
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text("MPLA", 14, 20);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27); // Zinc-900
    doc.text("COMITE DE ACCAO DO PARTIDO - 190", 14, 27);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122); // Zinc-500
    doc.text("Ingombota - Luanda * Angola", 14, 32);
    const dateStr = new Date().toLocaleDateString("pt-AO");
    doc.text(`Lista de Militantes Filtrada * Gerado em ${dateStr}`, 14, 37);
    
    // Decorative Red Bar
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(1.5);
    doc.line(14, 42, 196, 42);
    
    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(24, 24, 27);
    doc.text(`LISTA DE MILITANTES FILTRADA (${filteredMilitants.length} MEMBROS)`, 14, 52);
    
    doc.setFontSize(9);
    let startY = 62;
    
    // Header rect
    doc.setFillColor(244, 244, 245);
    doc.rect(14, startY, 182, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.text("N Card", 16, startY + 6);
    doc.text("Nome Completo", 55, startY + 6);
    doc.text("Bairro", 125, startY + 6);
    doc.text("Estado", 155, startY + 6);
    doc.text("Admissao", 175, startY + 6);
    
    startY += 8;
    doc.setFont("Helvetica", "normal");
    
    filteredMilitants.forEach((m) => {
      if (startY > 265) {
        doc.addPage();
        startY = 20;
        doc.setFillColor(244, 244, 245);
        doc.rect(14, startY, 182, 8, "F");
        doc.setFont("Helvetica", "bold");
        doc.text("N Card", 16, startY + 6);
        doc.text("Nome Completo", 55, startY + 6);
        doc.text("Bairro", 125, startY + 6);
        doc.text("Estado", 155, startY + 6);
        doc.text("Admissao", 175, startY + 6);
        startY += 8;
        doc.setFont("Helvetica", "normal");
      }
      doc.text(m.numeroCartao, 16, startY + 6);
      let nameText = m.nome;
      if (nameText.length > 30) nameText = nameText.substring(0, 30) + "...";
      doc.text(nameText, 55, startY + 6);
      doc.text(m.bairro, 125, startY + 6);
      doc.text(m.estado, 155, startY + 6);
      doc.text(m.dataAdmissao, 175, startY + 6);
      
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.2);
      doc.line(14, startY + 8, 196, startY + 8);
      startY += 8;
    });
    
    // Save PDF
    doc.save(`CAP190_Lista_Militantes_${dateStr.replace(/\//g, "-")}.pdf`);
  };

  const handleExportCSV = () => {
    const headers = [
      "No Cartao",
      "Nome Completo",
      "Cargo",
      "Estado",
      "Bairro",
      "Telefone",
      "Email",
      "Data Admissao",
      "Profissao",
      "Ano Inclusao",
      "Data Nascimento",
      "Setor",
      "Zona",
      "Morada"
    ];

    const rows = filteredMilitants.map(m => [
      m.numeroCartao,
      `"${m.nome.replace(/"/g, '""')}"`,
      `"${(m.cargo || "Membro").replace(/"/g, '""')}"`,
      m.estado,
      `"${(m.bairro || "").replace(/"/g, '""')}"`,
      m.telefone,
      m.email || "",
      m.dataAdmissao,
      `"${(m.profissao || "").replace(/"/g, '""')}"`,
      m.anoInclusao || "",
      m.dataNascimento || "",
      `"${(m.setor || "").replace(/"/g, '""')}"`,
      `"${(m.zona || "").replace(/"/g, '""')}"`,
      `"${(m.morada || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `militantes_cap190_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const criticalOverdueCount = useMemo(() => {
    return militants.filter(m => m.estado === "Activo" && getOverdueMonths(m) > 3).length;
  }, [militants, payments]);

  // Compute gender stats (totals and due amounts by sex)
  const genderStats = useMemo(() => {
    let mascTotal = 0;
    let mascComDivida = 0;
    let mascValorDivida = 0;
    let femTotal = 0;
    let femComDivida = 0;
    let femValorDivida = 0;

    militants.forEach((m) => {
      const gen = (m.genero || "Masculino").toLowerCase();
      const overdueMonths = getOverdueMonths(m);
      const isDevedor = overdueMonths > 0;
      const valorDivida = overdueMonths * 10000; // 10,000 AKZ per month

      if (gen === "feminino") {
        femTotal++;
        if (isDevedor) {
          femComDivida++;
          femValorDivida += valorDivida;
        }
      } else {
        // Default to Masculino
        mascTotal++;
        if (isDevedor) {
          mascComDivida++;
          mascValorDivida += valorDivida;
        }
      }
    });

    return {
      mascTotal,
      mascComDivida,
      mascValorDivida,
      femTotal,
      femComDivida,
      femValorDivida,
    };
  }, [militants, payments]);

  // Compute electoral registration statistics for the campaign
  const electoralStats = useMemo(() => {
    const total = militants.length;
    const registados = militants.filter(m => m.registoEleitoral === "Registado").length;
    const pendentes = militants.filter(m => m.registoEleitoral === "Pendente").length;
    const naoRegistados = militants.filter(m => m.registoEleitoral === "Não Registado").length;
    
    const pctRegistados = total > 0 ? Math.round((registados / total) * 100) : 0;
    const pctPendentes = total > 0 ? Math.round((pendentes / total) * 100) : 0;
    const pctNaoRegistados = total > 0 ? Math.round((naoRegistados / total) * 100) : 0;

    return {
      total,
      registados,
      pendentes,
      naoRegistados,
      pctRegistados,
      pctPendentes,
      pctNaoRegistados
    };
  }, [militants]);

  return (
    <div className="space-y-6" id="militantes-view">
      {/* 1. View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4" id="militantes-header">
        <div>
          <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
            Gestão de Militantes
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Pesquise, adicione, edite dados e acompanhe o estado de registo dos membros do CAP-190.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-sm transition-all cursor-pointer select-none no-print"
            id="print-militantes-btn"
          >
            <Printer className="w-4 h-4 text-yellow-500" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleExportFilteredPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-sm transition-all cursor-pointer select-none"
            id="export-militantes-pdf-btn"
          >
            <Download className="w-4 h-4 text-red-600" />
            <span>Exportar Lista (PDF)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg shadow-sm transition-all cursor-pointer select-none"
            id="export-militantes-csv-btn"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Exportar (CSV)</span>
          </button>

          {isReadOnly ? (
            <div 
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-400 bg-zinc-200 border border-zinc-300 rounded-lg cursor-not-allowed select-none"
              title="O seu perfil de acesso (Tesoureiro) não possui permissões para criar novos militantes."
              id="add-militante-btn-disabled"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Acesso Bloqueado</span>
            </div>
          ) : (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-all cursor-pointer select-none"
              id="add-militante-btn"
            >
              <UserPlus className="w-4 h-4 text-yellow-400" />
              <span>Novo Militante</span>
            </button>
          )}
        </div>
      </div>

      {/* Gender Statistics Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="militantes-gender-stats">
        {/* Male Statistics Card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-zinc-300 transition-all">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Género Masculino
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{genderStats.mascTotal}</span>
              <span className="text-xs text-zinc-500 font-bold">militantes registados</span>
            </div>
            <div className="text-xs font-semibold text-zinc-600">
              Membros Devedores: <span className="font-extrabold text-red-600">{genderStats.mascComDivida}</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Total Devido (Quotas)</span>
            <span className="text-lg font-black text-red-700 font-mono">
              {formatAKZ(genderStats.mascValorDivida)}
            </span>
          </div>
        </div>

        {/* Female Statistics Card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-zinc-300 transition-all">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Género Feminino
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{genderStats.femTotal}</span>
              <span className="text-xs text-zinc-500 font-bold">militantes registadas</span>
            </div>
            <div className="text-xs font-semibold text-zinc-600">
              Membros Devedores: <span className="font-extrabold text-red-600">{genderStats.femComDivida}</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Total Devido (Quotas)</span>
            <span className="text-lg font-black text-red-700 font-mono">
              {formatAKZ(genderStats.femValorDivida)}
            </span>
          </div>
        </div>
      </div>

      {/* Corporate Access Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3" id="read-only-alert-banner">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5 text-xs text-amber-800">
            <h4 className="font-black uppercase tracking-wider">Perfil de Acesso Corporativo: Modo de Leitura</h4>
            <p className="font-bold leading-normal text-amber-700">
              O seu perfil (<span className="text-amber-950 font-black">Tesoureiro</span>) foi configurado para supervisão e auditoria de fluxo de caixa. Alterações em dados cadastrais de militantes, exclusões ou novos cadastros são delegados exclusivamente à Administração e Secretaria Geral.
            </p>
          </div>
        </div>
      )}

      {/* Overdue Alerts & Email Simulator Launcher Banner */}
      {criticalOverdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="overdue-alerts-banner">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5 text-xs text-red-800">
              <h4 className="font-black uppercase tracking-wider">Militantes com Quotas Críticas em Atraso</h4>
              <p className="font-bold leading-normal text-red-700">
                Existem <span className="font-black text-red-950">{criticalOverdueCount} militantes activos</span> com quotas em atraso superior a 3 meses. Utilize o simulador para enviar notificações formais por correio electrónico.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedEmailRecipient("all");
              setEmailSubject("Aviso Geral: Regularização de Quotas Partidárias em Atraso");
              setEmailBody(`Estimados camaradas,

Escrevemos a presente notificação formal para informar que se encontram valores pendentes referentes às quotas partidárias mensais por um período superior a 3 meses.

A contribuição pontual é um dever fundamental para assegurar a sustentabilidade das actividades do Comité de Acção do Partido nº 190.

Solicitamos que visitem a Tesouraria com brevidade para regularizar a vossa situação cadastral de quotas.

Com saudações militantes,
Comissão Executiva do CAP-190`);
              setIsEmailModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-white bg-red-700 hover:bg-red-800 rounded shadow-sm shrink-0 self-start sm:self-center cursor-pointer transition-colors"
            id="launch-email-simulator-btn"
          >
            <Mail className="w-3.5 h-3.5 text-yellow-400" />
            <span>Simular Email de Cobrança</span>
          </button>
        </div>
      )}

      {/* 2. Filter & Search Action Bar */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm space-y-4" id="militantes-action-bar">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80" id="search-box">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, nº cartão ou data de adesão..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50"
              id="search-input"
            />
          </div>

          {/* Tab filters */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end" id="filters-box">
            <span className="text-xs font-bold text-zinc-500 flex items-center gap-1.5 mr-2">
              <Filter className="w-3.5 h-3.5" />
              Estado:
            </span>
            {(["Todos", "Activo", "Inactivo", "Suspenso"] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilterChange(status)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === status
                    ? status === "Activo"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : status === "Inactivo"
                      ? "bg-red-600 text-white shadow-sm"
                      : status === "Suspenso"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-zinc-800 text-white shadow-sm"
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                }`}
                id={`filter-btn-${status.toLowerCase()}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters Block */}
        <div className={`border-t border-zinc-200 pt-3.5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 ${campanhaEleitoralActiva ? "xl:grid-cols-7" : "xl:grid-cols-6"} gap-3`} id="advanced-filters">
          {/* Sector / Bairro Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Sector de Residência</label>
            <select
              value={bairroFilter}
              onChange={(e) => { setBairroFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="bairro-filter-select"
            >
              {uniqueBairros.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Setor Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Filtro por Setor</label>
            <select
              value={sectorFilter}
              onChange={(e) => { setSectorFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="sector-filter-select"
            >
              {uniqueSectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Zona Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Filtro por Zona</label>
            <select
              value={zoneFilter}
              onChange={(e) => { setZoneFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="zone-filter-select"
            >
              {uniqueZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Cargo Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Filtro por Cargo</label>
            <select
              value={cargoFilter}
              onChange={(e) => { setCargoFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="cargo-filter-select"
            >
              {uniqueCargos.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Admission Year Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Ano de Admissão</label>
            <select
              value={admissionYearFilter}
              onChange={(e) => { setAdmissionYearFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="admission-year-filter-select"
            >
              <option value="Todos">Todos os Anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="Antes de 2025">Antes de 2025</option>
            </select>
          </div>

          {/* Quota Regularity Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Regularidade das Quotas</label>
            <select
              value={regularityFilter}
              onChange={(e) => { setRegularityFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="regularity-filter-select"
            >
              <option value="Todos">Todos os Estados</option>
              <option value="Regular">Regular (Sem Dívidas)</option>
              <option value="Em Atraso">Em Atraso (1 a 3 meses)</option>
              <option value="Atraso Crítico (+3m)">Atraso Crítico (+3 meses)</option>
            </select>
          </div>

          {/* Situação Eleitoral Select (Impacto Temporário) */}
          {campanhaEleitoralActiva && (
            <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
              <label className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider block flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                Situação Eleitoral
              </label>
              <select
                value={electoralFilter}
                onChange={(e) => { setElectoralFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs font-bold border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-red-50/50 text-red-800 cursor-pointer"
                id="electoral-filter-select"
              >
                <option value="Todos">Todas as Situações</option>
                <option value="Registado">✓ Registado</option>
                <option value="Pendente">⚠ Recenseamento Pendente</option>
                <option value="Não Registado">✗ Não Registado</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. Militantes List Table */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden" id="militantes-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="militantes-table">
            <thead>
              <tr className="bg-zinc-950 text-white text-[10px] uppercase font-black tracking-wider border-b border-zinc-800">
                <th className="py-3 px-4 w-28">Nº Cartão</th>
                <th className="py-3 px-4">Nome Completo</th>
                <th className="py-3 px-4 w-24">Sexo</th>
                <th className="py-3 px-4">Cargo</th>
                {campanhaEleitoralActiva && (
                  <th className="py-3 px-4 w-44 text-red-400 font-extrabold">Registo Eleitoral</th>
                )}
                <th className="py-3 px-4">Bairro</th>
                <th className="py-3 px-4 w-28">Estado</th>
                <th className="py-3 px-4 w-32">Admissão</th>
                <th className="py-3 px-4 w-28 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
              {paginatedMilitants.length === 0 ? (
                <tr>
                  <td colSpan={campanhaEleitoralActiva ? 9 : 8} className="py-10 text-center font-bold text-zinc-400">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                    Nenhum militante encontrado para os critérios de busca.
                  </td>
                </tr>
              ) : (
                paginatedMilitants.map((m) => {
                  const overdueCount = getOverdueMonths(m);
                  return (
                    <tr 
                      key={m.id} 
                      className="hover:bg-zinc-50/50 transition-colors"
                      id={`row-${m.id}`}
                    >
                      <td className="py-3 px-4 font-mono font-black text-zinc-900">
                        {m.numeroCartao}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {/* Photo or Initials */}
                          {m.foto ? (
                            <img src={m.foto} className="w-8 h-8 rounded-full object-cover border border-zinc-200 shadow-xs shrink-0" referrerPolicy="no-referrer" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 text-red-700 font-extrabold flex items-center justify-center text-[11px] uppercase shadow-inner shrink-0">
                              {m.nome.substring(0, 2)}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-zinc-900">{m.nome}</div>
                            {m.estado === "Activo" && overdueCount > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  overdueCount > 3 
                                    ? "bg-red-100 text-red-800 border border-red-200 animate-pulse" 
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}>
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                  <span>{overdueCount} {overdueCount === 1 ? "mês" : "meses"} em atraso</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          (m.genero || "Masculino") === "Feminino"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {m.genero || "Masculino"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-500 text-[11px]">
                        {m.cargo || "Membro do Partido"}
                      </td>
                      {campanhaEleitoralActiva && (
                        <td className="py-3 px-4">
                          {m.registoEleitoral === "Registado" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                Registado
                              </span>
                            </div>
                          ) : m.registoEleitoral === "Não Registado" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-red-50 text-red-800 border border-red-200">
                                Sem Registo
                              </span>
                              {!isReadOnly && (
                                <button
                                  onClick={() => {
                                    onUpdateMilitante({
                                      ...m,
                                      registoEleitoral: "Pendente"
                                    });
                                  }}
                                  className="text-[9px] text-red-600 hover:underline font-extrabold cursor-pointer"
                                  id={`mark-pendente-btn-${m.id}`}
                                >
                                  Mudar para Pendente
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                Pendente
                              </span>
                              {!isReadOnly && (
                                <button
                                  onClick={() => {
                                    onUpdateMilitante({
                                      ...m,
                                      registoEleitoral: "Registado"
                                    });
                                    onAddNotification?.({
                                      type: "success",
                                      title: "Registo Concluído",
                                      message: `O recenseamento do militante ${m.nome} foi validado com sucesso.`
                                    });
                                  }}
                                  className="text-[9px] text-red-600 hover:underline font-black cursor-pointer flex items-center gap-0.5 shrink-0"
                                  title="Validar recenseamento do militante"
                                  id={`validate-voter-${m.id}`}
                                >
                                  <span>Validar</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium text-zinc-500">
                        {m.bairro}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          m.estado === "Activo"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : m.estado === "Inactivo"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            m.estado === "Activo" ? "bg-emerald-500" : m.estado === "Inactivo" ? "bg-red-500" : "bg-amber-500"
                          }`} />
                          {m.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-zinc-500 text-[11px]">
                        {m.dataAdmissao}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedMilitante(m)}
                            className="p-1 text-zinc-500 hover:text-blue-600 bg-zinc-50 hover:bg-blue-50 border border-zinc-200 rounded cursor-pointer transition-colors"
                            title="Visualizar Detalhes"
                            id={`detail-btn-${m.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          {m.estado === "Activo" && overdueCount > 3 && (
                            <button
                              onClick={() => {
                                setSelectedEmailRecipient(m);
                                const overdueCountVal = getOverdueMonths(m);
                                setEmailSubject(`Aviso Urgente: Regularização de Quotas - ${m.nome}`);
                                setEmailBody(`Caro(a) camarada ${m.nome},

Escrevemos a presente notificação formal para informar que constam no sistema quotas partidárias pendentes em seu nome, relativas ao cartão de identificação partidária nº ${m.numeroCartao}.

O montante total acumulado em dívida é de ${formatAKZ(overdueCountVal * 10000)} (referente a ${overdueCountVal} meses em atraso).

A contribuição pontual é um dever estatutário fundamental para garantir a manutenção e o desenvolvimento das actividades políticas do nosso Comité de Acção do Partido nº 190 (CAP-190).

Pedimos que efectue o pagamento ou contacte a nossa Tesouraria com a maior brevidade possível para proceder à devida regularização fiscal partidária.

Com saudações militantes,
Comissão Executiva do CAP-190`);
                                setIsEmailModalOpen(true);
                              }}
                              className="p-1 text-zinc-500 hover:text-red-700 bg-zinc-50 hover:bg-red-50 border border-zinc-200 rounded cursor-pointer transition-colors animate-pulse"
                              title="Simular Notificação por Email"
                              id={`email-sim-btn-${m.id}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(m)}
                                className="p-1 text-zinc-500 hover:text-yellow-600 bg-zinc-50 hover:bg-yellow-50 border border-zinc-200 rounded cursor-pointer transition-colors"
                                title="Editar Dados"
                                id={`edit-btn-${m.id}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="p-1 text-zinc-500 hover:text-red-600 bg-zinc-50 hover:bg-red-50 border border-zinc-200 rounded cursor-pointer transition-colors"
                                title="Excluir Registo"
                                id={`delete-btn-${m.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredMilitants.length > 0 && (
          <div className="bg-zinc-50 px-4 py-3.5 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 font-bold" id="militantes-pagination">
            <div>
              Mostrando <span className="text-zinc-900">{Math.min(filteredMilitants.length, (currentPage - 1) * itemsPerPage + 1)}</span> a{" "}
              <span className="text-zinc-900">{Math.min(filteredMilitants.length, currentPage * itemsPerPage)}</span> de{" "}
              <span className="text-zinc-900">{filteredMilitants.length}</span> militantes registados.
            </div>
            
            <div className="flex items-center gap-2.5 justify-end">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-1.5 border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                id="prev-page-btn"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold">Página {currentPage} de {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2 py-1.5 border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                id="next-page-btn"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Drawer modal of militante detail */}
      {selectedMilitante && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="detail-drawer">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-zinc-950 text-white p-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span className="text-xs font-black tracking-widest uppercase text-yellow-400">Dados do Militante</span>
              </div>
              <button 
                onClick={() => setSelectedMilitante(null)} 
                className="p-1 hover:bg-zinc-900 rounded transition-colors text-zinc-400 hover:text-white cursor-pointer"
                id="close-detail-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-5" id="detail-body">
              {/* Profile Card Summary */}
              <div className="flex items-start gap-4 pb-4 border-b border-zinc-100">
                {selectedMilitante.foto ? (
                  <img src={selectedMilitante.foto} className="w-14 h-14 rounded-full object-cover border border-red-200 shadow-inner shrink-0" referrerPolicy="no-referrer" alt="" />
                ) : (
                  <div className="w-14 h-14 bg-red-50 rounded-full border border-red-200 flex items-center justify-center text-red-600 font-black text-lg shadow-inner shrink-0">
                    {selectedMilitante.nome.charAt(0)}
                  </div>
                )}
                <div className="space-y-1">
                  <h4 className="text-base font-black text-zinc-950 leading-tight">{selectedMilitante.nome}</h4>
                  <p className="text-xs font-black font-mono text-zinc-400">{selectedMilitante.numeroCartao}</p>
                  <p className="text-xs font-extrabold text-red-700 bg-red-50/50 inline-block px-2 py-0.5 rounded border border-red-200/40">
                    {selectedMilitante.cargo || "Membro"}
                  </p>
                </div>
              </div>

              {/* Grid of attributes */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-zinc-700">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Estado do Registo</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedMilitante.estado === "Activo"
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedMilitante.estado === "Inactivo"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedMilitante.estado}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Bairro de Actuação</span>
                  <span className="flex items-center gap-1 text-zinc-900 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedMilitante.bairro}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Telefone Directo</span>
                  <span className="flex items-center gap-1 text-zinc-900 font-mono font-bold">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedMilitante.telefone}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Data de Admissão</span>
                  <span className="flex items-center gap-1 text-zinc-900 font-mono font-bold">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedMilitante.dataAdmissao}
                  </span>
                </div>

                {selectedMilitante.profissao && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Profissão</span>
                    <span className="text-zinc-900 font-bold">{selectedMilitante.profissao}</span>
                  </div>
                )}

                {selectedMilitante.anoInclusao && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Ano de Inclusão</span>
                    <span className="text-zinc-900 font-mono font-bold">{selectedMilitante.anoInclusao}</span>
                  </div>
                )}

                {selectedMilitante.dataNascimento && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Data de Nascimento</span>
                    <span className="flex items-center gap-1 text-zinc-900 font-mono font-bold">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {selectedMilitante.dataNascimento}
                    </span>
                  </div>
                )}

                {(selectedMilitante.setor || selectedMilitante.zona) && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Setor / Zona</span>
                    <span className="text-zinc-900 font-bold">
                      {selectedMilitante.setor || "S/S"} • {selectedMilitante.zona || "S/Z"}
                    </span>
                  </div>
                )}

                {selectedMilitante.morada && (
                  <div className="space-y-1 col-span-2 border-t border-zinc-100 pt-3">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Morada Completa</span>
                    <span className="flex items-center gap-1 text-zinc-900 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      {selectedMilitante.morada}
                    </span>
                  </div>
                )}

                {selectedMilitante.email && (
                  <div className="space-y-1 col-span-2 border-t border-zinc-50 pt-3">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">Correio Electrónico</span>
                    <span className="flex items-center gap-1 text-zinc-900 font-bold truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      {selectedMilitante.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Voter Campaign Information (Impacto Temporário) */}
              <div className="bg-zinc-50 border border-zinc-200/60 rounded-lg p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide font-extrabold">Recenseamento Eleitoral 2026</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    selectedMilitante.registoEleitoral === "Registado"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : selectedMilitante.registoEleitoral === "Não Registado"
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    {selectedMilitante.registoEleitoral || "Pendente"}
                  </span>
                </div>
                
                {selectedMilitante.registoEleitoral !== "Registado" && !isReadOnly && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        onUpdateMilitante({
                          ...selectedMilitante,
                          registoEleitoral: "Registado"
                        });
                        setSelectedMilitante({
                          ...selectedMilitante,
                          registoEleitoral: "Registado"
                        });
                        onAddNotification?.({
                          type: "success",
                          title: "Registo Concluído",
                          message: `Registo do militante ${selectedMilitante.nome} foi validado com sucesso.`
                        });
                      }}
                      className="w-full text-center py-1.5 bg-red-600 hover:bg-red-700 text-white font-black rounded text-[10px] uppercase cursor-pointer"
                    >
                      Validar Recenseamento
                    </button>
                  </div>
                )}
              </div>

              {/* Actions Footer inside detail modal */}
              <div className="pt-4 border-t border-zinc-100 flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    handleOpenEditModal(selectedMilitante);
                    setSelectedMilitante(null);
                  }}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-black cursor-pointer transition-colors"
                  id="detail-edit-shortcut"
                >
                  Editar Registo
                </button>
                <button
                  onClick={() => handleDelete(selectedMilitante.id)}
                  className="px-3.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-black cursor-pointer transition-colors"
                  id="detail-delete-shortcut"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add / Edit Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="form-modal">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl w-full max-w-3xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-zinc-950 text-white p-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase text-yellow-400">
                  {editingMilitante ? "Editar Militante" : "Cadastrar Novo Militante"}
                </span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 hover:bg-zinc-900 rounded transition-colors text-zinc-400 hover:text-white cursor-pointer"
                id="close-form-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMilitante} className="p-6 space-y-4 text-xs" id="militante-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Foto do Militante (Upload / Drag and Drop) */}
                <div className="space-y-2 sm:col-span-2 flex flex-col items-center justify-center pb-2 border-b border-zinc-100" id="photo-upload-container">
                  <span className="font-extrabold text-zinc-700 block text-center uppercase tracking-wider text-[10px]">Foto de Perfil do Militante</span>
                  <div className="flex items-center gap-4">
                    {/* circular preview */}
                    <div 
                      className="relative group w-20 h-20 rounded-full bg-zinc-50 border-2 border-dashed border-zinc-300 hover:border-red-600 flex items-center justify-center overflow-hidden transition-all shadow-inner"
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormFoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    >
                      {formFoto ? (
                        <>
                          <img src={formFoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Foto Militante" />
                          <button
                            type="button"
                            onClick={() => setFormFoto("")}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-black text-[9px] uppercase transition-opacity cursor-pointer"
                            title="Remover Foto"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-zinc-100/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setFormFoto(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Plus className="w-5 h-5 text-zinc-400 group-hover:text-red-600 transition-colors" />
                          <span className="text-[8px] font-bold text-zinc-400 mt-1 uppercase">Upload</span>
                        </label>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-left">
                      <p className="text-[10px] font-bold text-zinc-500 leading-normal">
                        Arraste ou clique no círculo para carregar a foto do camarada.
                      </p>
                      <p className="text-[9px] font-medium text-zinc-400 leading-tight">
                        Formatos suportados: PNG, JPG ou WEBP. Tamanho recomendado: Quadrado (1:1).
                      </p>
                      {formFoto && (
                        <button
                          type="button"
                          onClick={() => setFormFoto("")}
                          className="text-[9px] font-black text-red-600 hover:text-red-800 uppercase tracking-wider flex items-center gap-1 cursor-pointer mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Foto</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nome Completo */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-extrabold text-zinc-700 block">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Manuel Francisco Chipenda"
                    className="w-full px-3 py-2 font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-nome"
                  />
                </div>

                {/* Número do Cartão */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Nº Cartão do Partido *</label>
                  <input
                    type="text"
                    required
                    value={formNumeroCartao}
                    onChange={(e) => setFormNumeroCartao(e.target.value)}
                    placeholder="Ex: CAP190-0351"
                    className="w-full px-3 py-2 font-mono font-black border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-card"
                  />
                </div>

                {/* Estado */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Estado de Registo *</label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value as MilitanteEstado)}
                    className="w-full px-3 py-2 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="form-select-estado"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Suspenso">Suspenso</option>
                  </select>
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Número de Telefone *</label>
                  <input
                    type="text"
                    required
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="Ex: 923 456 789"
                    className="w-full px-3 py-2 font-mono font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-phone"
                  />
                </div>

                {/* Correio Electrónico */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Email (Opcional)</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ex: militante@email.com"
                    className="w-full px-3 py-2 font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-email"
                  />
                </div>

                {/* Bairro */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Bairro de Actuação</label>
                  <input
                    type="text"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value)}
                    className="w-full px-3 py-2 font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-bairro"
                  />
                </div>

                {/* Data Admissão */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Data de Admissão *</label>
                  <input
                    type="date"
                    required
                    value={formDataAdmissao}
                    onChange={(e) => setFormDataAdmissao(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="form-input-date"
                  />
                </div>

                {/* Cargo */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-extrabold text-zinc-700 block">Cargo / Função no Comité</label>
                  <select
                    value={formCargo}
                    onChange={(e) => setFormCargo(e.target.value)}
                    className="w-full px-3 py-2 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer text-zinc-800"
                    id="form-select-cargo"
                  >
                    <option value="Primeiro (a) Secretário">Primeiro (a) Secretário</option>
                    <option value="Segundo Secretário">Segundo Secretário</option>
                    <option value="Secretário / Organização e Mobilização">Secretário / Organização e Mobilização</option>
                    <option value="Secretário P/ Questões Políticas e Eleitorais">Secretário P/ Questões Políticas e Eleitorais</option>
                    <option value="Secretário P/ Questões da Comunidade">Secretário P/ Questões da Comunidade</option>
                    <option value="Secretário P/ Informação e Propaganda">Secretário P/ Informação e Propaganda</option>
                    <option value="Secretário P/ Formação de Militantes e Educação Patriótica">Secretário P/ Formação de Militantes e Educação Patriótica</option>
                    <option value="Comissão de Auditoria, Ética e Disciplina">Comissão de Auditoria, Ética e Disciplina</option>
                    <option value="Tesoureiro">Tesoureiro</option>
                    <option value="Coordenadora da Secção da OMA">Coordenadora da Secção da OMA</option>
                    <option value="Coordenador (a) do Núcleo da JMPLA">Coordenador (a) do Núcleo da JMPLA</option>
                    <option value="Membros de direcção (suplentes)">Membros de direcção (suplentes)</option>
                    <option value="Militantes">Militantes</option>
                    <option value="Membro do Partido">Membro do Partido</option>
                  </select>
                </div>

                {/* Registo Eleitoral (Voter Status) */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Situação de Recenseamento</label>
                  <select
                    value={formRegistoEleitoral}
                    onChange={(e) => {
                      const val = e.target.value as "Registado" | "Não Registado" | "Pendente";
                      setFormRegistoEleitoral(val);
                    }}
                    className="w-full px-3 py-2 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer text-zinc-800"
                    id="form-select-registo-eleitoral"
                  >
                    <option value="Registado">✓ Registado / Recenseado</option>
                    <option value="Pendente">⚠ Recenseamento Pendente</option>
                    <option value="Não Registado">✗ Não Registado</option>
                  </select>
                </div>

                {/* Profissão */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Profissão</label>
                  <input
                    type="text"
                    value={formProfissao}
                    onChange={(e) => setFormProfissao(e.target.value)}
                    placeholder="Ex: Professor, Enfermeiro, etc."
                    className="w-full px-3 py-2 font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-profissao"
                  />
                </div>

                {/* Ano de Inclusão */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Ano de Inclusão</label>
                  <input
                    type="number"
                    value={formAnoInclusao}
                    onChange={(e) => setFormAnoInclusao(Number(e.target.value))}
                    className="w-full px-3 py-2 font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs font-mono"
                    id="form-input-anoinclusao"
                  />
                </div>

                {/* Data de Nascimento */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formDataNascimento}
                    onChange={(e) => setFormDataNascimento(e.target.value)}
                    className="w-full px-3 py-2 font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs font-mono cursor-pointer"
                    id="form-input-datanascimento"
                  />
                </div>

                {/* Setor */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Setor</label>
                  <input
                    type="text"
                    value={formSetor}
                    onChange={(e) => setFormSetor(e.target.value)}
                    placeholder="Ex: Setor A"
                    className="w-full px-3 py-2 font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-setor"
                  />
                </div>

                {/* Zona */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Zona</label>
                  <input
                    type="text"
                    value={formZona}
                    onChange={(e) => setFormZona(e.target.value)}
                    placeholder="Ex: Zona Norte"
                    className="w-full px-3 py-2 font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-zona"
                  />
                </div>

                {/* Morada Completa */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-extrabold text-zinc-700 block">Morada Completa</label>
                  <input
                    type="text"
                    value={formMorada}
                    onChange={(e) => setFormMorada(e.target.value)}
                    placeholder="Ex: Rua Direita da Samba, Casa nº 15"
                    className="w-full px-3 py-2 font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="form-input-morada"
                  />
                </div>

                {/* Género */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-zinc-700 block">Género</label>
                  <select
                    value={formGenero}
                    onChange={(e) => setFormGenero(e.target.value)}
                    className="w-full px-3 py-2 font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="form-input-genero"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino (OMA)</option>
                  </select>
                </div>

              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2" id="form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-black transition-colors cursor-pointer"
                  id="cancel-form-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-black shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  id="save-militante-submit"
                >
                  <Check className="w-4 h-4 text-yellow-400" />
                  <span>Salvar Registo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Email Simulator Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="email-simulator-modal">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl w-full max-w-lg my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-zinc-950 text-white p-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-yellow-400 shrink-0" />
                <span className="text-xs font-black tracking-widest uppercase text-yellow-400">
                  Simulador de Envio de Notificação por Email
                </span>
              </div>
              <button 
                onClick={() => setIsEmailModalOpen(false)} 
                className="p-1 hover:bg-zinc-900 rounded transition-colors text-zinc-400 hover:text-white cursor-pointer"
                id="close-email-sim-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs font-semibold text-zinc-700">
              <p className="text-zinc-500 font-bold leading-relaxed">
                Este simulador permite estruturar e registar mensagens de cobrança para militantes com quotas em atraso superior a 3 meses. O envio gera um registo de log no histórico de notificações do CAP-190.
              </p>

              {/* Recipient Selector */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block">Destinatário do Email *</label>
                <select
                  value={selectedEmailRecipient === "all" ? "all" : (selectedEmailRecipient?.id || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "all") {
                      setSelectedEmailRecipient("all");
                      setEmailSubject("Aviso Geral: Regularização de Quotas Partidárias em Atraso");
                      setEmailBody(`Estimados camaradas,

Escrevemos a presente notificação formal para informar que se encontram valores pendentes referentes às quotas partidárias mensais por um período superior a 3 meses.

A contribuição pontual é um dever fundamental para assegurar a sustentabilidade das actividades do Comité de Acção do Partido nº 190.

Solicitamos que visitem a Tesouraria com brevidade para regularizar a vossa situação cadastral de quotas.

Com saudações militantes,
Comissão Executiva do CAP-190`);
                    } else {
                      const found = militants.find(m => m.id === val);
                      if (found) {
                        setSelectedEmailRecipient(found);
                        const overdueCount = getOverdueMonths(found);
                        setEmailSubject(`Aviso Urgente: Regularização de Quotas - ${found.nome}`);
                        setEmailBody(`Caro(a) camarada ${found.nome},

Escrevemos a presente notificação formal para informar que constam no sistema quotas partidárias pendentes em seu nome, relativas ao cartão de identificação partidária nº ${found.numeroCartao}.

O montante total acumulado em dívida é de ${formatAKZ(overdueCount * 10000)} (referente a ${overdueCount} meses em atraso).

A contribuição pontual é um dever estatutário fundamental para garantir a manutenção e o desenvolvimento das actividades políticas do nosso Comité de Acção do Partido nº 190 (CAP-190).

Pedimos que efectue o pagamento ou contacte a nossa Tesouraria com a maior brevidade possível para proceder à devida regularização fiscal partidária.

Com saudações militantes,
Comissão Executiva do CAP-190`);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                  id="email-recipient-select"
                >
                  <option value="all">Múltiplos Destinatários (Todos em Atraso Crítico)</option>
                  {militants.filter(m => m.estado === "Activo" && getOverdueMonths(m) > 3).map(m => (
                    <option key={m.id} value={m.id}>{m.nome} ({m.numeroCartao}) - {getOverdueMonths(m)} meses em falta</option>
                  ))}
                </select>
              </div>

              {/* Email Subject */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block">Assunto da Mensagem *</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Ex: Regularização Urgente de Contribuição de Quotas"
                  className="w-full px-3 py-2 font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                  id="email-subject-input"
                />
              </div>

              {/* Email Body Textarea */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-zinc-700 block">Corpo do Correio Electrónico *</label>
                <textarea
                  required
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Escreva a mensagem aqui..."
                  className="w-full px-3 py-2 font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs font-sans resize-none"
                  id="email-body-textarea"
                />
              </div>

              {/* Simulated Delivery Note */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[10px] text-zinc-500 font-bold space-y-1">
                <span className="text-zinc-700 font-extrabold uppercase tracking-wider block">Nota de Simulação SMTP:</span>
                <p className="leading-normal">
                  Ao confirmar, o sistema enviará um payload simulado, disparando o webhook de registo do CAP-190 e inserindo um log permanente no histórico de notificações do sistema para fins de auditoria interna.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2" id="email-actions">
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  id="cancel-email-btn"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
                  onClick={() => {
                    setIsSendingEmail(true);
                    setTimeout(() => {
                      if (onAddNotification) {
                        if (selectedEmailRecipient === "all") {
                          onAddNotification({
                            type: "warning",
                            title: "Notificação em Lote Simulada",
                            message: `Disparo de notificações de cobrança por email realizado para todos os militantes activos em atraso crítico de quotas.`
                          });
                        } else if (selectedEmailRecipient) {
                          onAddNotification({
                            type: "success",
                            title: `Email de Cobrança: ${selectedEmailRecipient.nome}`,
                            message: `Simulação de e-mail enviada para ${selectedEmailRecipient.nome} (${selectedEmailRecipient.email || "sem e-mail corporativo cadastrado"}). Assunto: "${emailSubject}"`
                          });
                        }
                      }
                      setIsSendingEmail(false);
                      setIsEmailModalOpen(false);
                      alert("Simulação de envio efetuada com sucesso! O registo foi inserido no histórico de notificações do CAP-190.");
                    }, 1200);
                  }}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-black shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  id="send-email-submit"
                >
                  {isSendingEmail ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>A processar envio...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-yellow-400" />
                      <span>Confirmar e Enviar Simulador</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
