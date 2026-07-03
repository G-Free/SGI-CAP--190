/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { MplaCrestSvg } from "./Header";
import { 
  Calendar, 
  Plus, 
  Search, 
  MapPin, 
  User, 
  Clock, 
  Coins, 
  Briefcase, 
  CheckCircle, 
  TrendingUp, 
  X, 
  Filter, 
  Edit, 
  Trash2,
  AlertCircle,
  FileText,
  Printer,
  Check,
  Award,
  Users,
  Percent,
  Map,
  UserCheck
} from "lucide-react";
import { Actividade, UserSession, Militante } from "../types";

interface PlaneamentoViewProps {
  userSession?: UserSession;
  militants?: Militante[];
  onUpdateMilitante?: (m: Militante) => void;
  onAddNotification?: (notif: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
}

const DEFAULT_ACTIVIDADES: Actividade[] = [
  {
    id: "act-1",
    titulo: "Campanha de Mobilização de Bairro - Ingombota",
    descricao: "Acção de sensibilização porta a porta e contacto com moradores para distribuição do manifesto e materiais informativos.",
    data: "2026-07-04",
    local: "Comunidade da Ingombota Central, Luanda",
    responsavel: "Isabel Carolina Ginga",
    estado: "Planeada",
    tipo: "Mobilização",
    custoPrevisto: 150000
  },
  {
    id: "voter-campaign-activity",
    titulo: "Campanha Extraordinária de Recenseamento e Registo Eleitoral 2026",
    descricao: "Mapeamento de regularidade cívica dos militantes do CAP-190 para as próximas eleições. Esta actividade tem impacto extraordinário e temporário em todo o sistema.",
    data: "2026-06-30",
    local: "CAP-190 e Zonas Adjacentes",
    responsavel: "Secretaria para Assuntos Políticos e Eleitorais",
    estado: "Em Progresso",
    tipo: "Atividade Extraordinária Temporária",
    custoPrevisto: 500000
  },
  {
    id: "act-2",
    titulo: "Assembleia de Balanço do CAP-190",
    descricao: "Reunião de militantes para prestação de contas orçamentais, análise da taxa de adimplência de quotas e metas do trimestre.",
    data: "2026-07-12",
    local: "Sede do Comité de Especialidade, Luanda",
    responsavel: "João Baptista Kiala",
    estado: "Planeada",
    tipo: "Reunião",
    custoPrevisto: 30000
  },
  {
    id: "act-3",
    titulo: "Doação de Cestas e Apoio Social Comunitário",
    descricao: "Acção social de solidariedade para famílias vulneráveis da comuna, providenciando bens alimentares e apoio essencial.",
    data: "2026-06-25",
    local: "Zona Periurbana da Ingombota",
    responsavel: "Maria da Conceição Neto",
    estado: "Concluída",
    tipo: "Apoio Social",
    custoPrevisto: 450000
  },
  {
    id: "act-4",
    titulo: "Palestra de Formação Cívica e Política",
    descricao: "Seminário intensivo sobre liderança de proximidade, história do partido e capacitação ideológica da juventude.",
    data: "2026-07-20",
    local: "Anfiteatro Provincial de Luanda",
    responsavel: "Ana Paula de Carvalho",
    estado: "Em Progresso",
    tipo: "Formação",
    custoPrevisto: 200000
  }
];

export function PlaneamentoView({ userSession, militants = [], onUpdateMilitante, onAddNotification }: PlaneamentoViewProps) {
  // Voter registration campaign toggle
  const [campanhaEleitoralActiva, setCampanhaEleitoralActiva] = useState(() => {
    const saved = localStorage.getItem("mpla_campanha_activa");
    return saved !== "false"; // default to true
  });

  // Campaign completion state
  const [campanhaConcluida, setCampanhaConcluida] = useState(() => {
    const saved = localStorage.getItem("mpla_campanha_concluida");
    return saved === "true"; // default to false
  });

  // Report Modal Open State
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Toggle active campaign and sync to localStorage
  const handleToggleCampanha = (val: boolean) => {
    setCampanhaEleitoralActiva(val);
    localStorage.setItem("mpla_campanha_activa", String(val));
    if (onAddNotification) {
      onAddNotification({
        type: "info",
        title: val ? "Impacto Eleitoral Activado" : "Impacto Eleitoral Desactivado",
        message: val 
          ? "As colunas e filtros eleitorais estão agora ativos no módulo de Militantes." 
          : "As colunas eleitorais foram ocultadas do módulo de Militantes."
      });
    }
  };

  // Toggle finish/reopen campaign
  const handleToggleConcluirCampanha = () => {
    const nextVal = !campanhaConcluida;
    setCampanhaConcluida(nextVal);
    localStorage.setItem("mpla_campanha_concluida", String(nextVal));
    
    if (nextVal) {
      if (onAddNotification) {
        onAddNotification({
          type: "success",
          title: "Campanha Eleitoral Finalizada!",
          message: "O balanço foi concluído. O relatório oficial de fecho foi gerado com sucesso."
        });
      }
      setIsReportOpen(true); // Automatically open the report modal on conclusion!
    } else {
      if (onAddNotification) {
        onAddNotification({
          type: "info",
          title: "Campanha Reaberta",
          message: "A campanha extraordinária de recenseamento foi reaberta para novos lançamentos."
        });
      }
    }
  };

  // Calculate electoral stats
  const electoralStats = useMemo(() => {
    const list = militants || [];
    const total = list.length;
    const registados = list.filter(m => m.registoEleitoral === "Registado").length;
    const pendentes = list.filter(m => m.registoEleitoral === "Pendente").length;
    const naoRegistados = list.filter(m => m.registoEleitoral === "Não Registado" || !m.registoEleitoral).length;
    
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

  // Neighborhoods report calculation
  const bairrosReport = useMemo(() => {
    const list = militants || [];
    const map: { [bairro: string]: { total: number; registados: number; pendentes: number; naoRegistados: number } } = {};
    list.forEach(m => {
      const b = m.bairro || "Ingombota Centro";
      if (!map[b]) {
        map[b] = { total: 0, registados: 0, pendentes: 0, naoRegistados: 0 };
      }
      map[b].total += 1;
      if (m.registoEleitoral === "Registado") map[b].registados += 1;
      else if (m.registoEleitoral === "Pendente") map[b].pendentes += 1;
      else map[b].naoRegistados += 1;
    });

    return Object.entries(map).map(([nome, s]) => ({
      nome,
      ...s,
      taxa: s.total > 0 ? Math.round((s.registados / s.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }, [militants]);

  // Gender report calculation
  const genderReport = useMemo(() => {
    const list = militants || [];
    const registeredOnly = list.filter(m => m.registoEleitoral === "Registado");
    const mCount = list.filter(m => (m.genero || "Masculino") === "Masculino").length;
    const fCount = list.filter(m => (m.genero) === "Feminino").length;
    
    const regMCount = registeredOnly.filter(m => (m.genero || "Masculino") === "Masculino").length;
    const regFCount = registeredOnly.filter(m => (m.genero) === "Feminino").length;

    return {
      totalM: mCount,
      totalF: fCount,
      regM: regMCount,
      regF: regFCount,
      pctRegM: mCount > 0 ? Math.round((regMCount / mCount) * 100) : 0,
      pctRegF: fCount > 0 ? Math.round((regFCount / fCount) * 100) : 0
    };
  }, [militants]);

  // Members who need mobilization
  const membersNeedMobilization = useMemo(() => {
    const list = militants || [];
    return list.filter(m => m.registoEleitoral !== "Registado").slice(0, 15);
  }, [militants]);

  // Load activities from localStorage or defaults
  const [actividades, setActividades] = useState<Actividade[]>(() => {
    let list = DEFAULT_ACTIVIDADES;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mpla_actividades");
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch (e) {
          console.error("Error loading activities, fallback to default", e);
        }
      }
    }

    // Ensure the "voter-campaign-activity" exists in the list
    const hasCampaign = list.some(a => a.id === "voter-campaign-activity");
    if (!hasCampaign) {
      list = [
        ...list,
        {
          id: "voter-campaign-activity",
          titulo: "Campanha Extraordinária de Recenseamento e Registo Eleitoral 2026",
          descricao: "Mapeamento de regularidade cívica dos militantes do CAP-190 para as próximas eleições. Esta actividade tem impacto extraordinário e temporário em todo o sistema.",
          data: "2026-06-30",
          local: "CAP-190 e Zonas Adjacentes",
          responsavel: "Secretaria para Assuntos Políticos e Eleitorais",
          estado: "Em Progresso",
          tipo: "Atividade Extraordinária Temporária",
          custoPrevisto: 500000
        }
      ];
    }

    // Sync state with localStorage state mpla_campanha_concluida
    const isConcluida = typeof window !== "undefined" && localStorage.getItem("mpla_campanha_concluida") === "true";
    list = list.map(a => {
      if (a.id === "voter-campaign-activity") {
        return { ...a, estado: isConcluida ? "Concluída" : "Em Progresso" };
      }
      return a;
    });

    return list;
  });

  // Save changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mpla_actividades", JSON.stringify(actividades));
    }
  }, [actividades]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<string>("TODOS");
  const [selectedEstado, setSelectedEstado] = useState<string>("TODOS");

  // Add / Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formData, setFormData] = useState("");
  const [formLocal, setFormLocal] = useState("");
  const [formResponsavel, setFormResponsavel] = useState("");
  const [formEstado, setFormEstado] = useState<Actividade["estado"]>("Planeada");
  const [formTipo, setFormTipo] = useState<Actividade["tipo"]>("Mobilização");
  const [formCusto, setFormCusto] = useState("100000");

  // Summary statistics
  const stats = useMemo(() => {
    const total = actividades.length;
    const planeadas = actividades.filter(a => a.estado === "Planeada").length;
    const emProgresso = actividades.filter(a => a.estado === "Em Progresso").length;
    const concluidas = actividades.filter(a => a.estado === "Concluída").length;
    const canceladas = actividades.filter(a => a.estado === "Cancelada").length;
    const custoTotal = actividades.reduce((sum, a) => sum + (a.custoPrevisto || 0), 0);

    return { total, planeadas, emProgresso, concluidas, canceladas, custoTotal };
  }, [actividades]);

  // Filtered activities
  const filteredActividades = useMemo(() => {
    return actividades.filter(a => {
      const matchesSearch = 
        a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.responsavel.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = selectedTipo === "TODOS" || a.tipo === selectedTipo;
      const matchesEstado = selectedEstado === "TODOS" || a.estado === selectedEstado;

      return matchesSearch && matchesTipo && matchesEstado;
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [actividades, searchTerm, selectedTipo, selectedEstado]);

  const handleOpenCreateForm = () => {
    setEditingId(null);
    setFormTitulo("");
    setFormDescricao("");
    setFormData(new Date().toISOString().split("T")[0]);
    setFormLocal("Sede do Comité CAP-190, Luanda");
    setFormResponsavel(userSession?.nome || "");
    setFormEstado("Planeada");
    setFormTipo("Mobilização");
    setFormCusto("100000");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (act: Actividade) => {
    setEditingId(act.id);
    setFormTitulo(act.titulo);
    setFormDescricao(act.descricao);
    setFormData(act.data);
    setFormLocal(act.local);
    setFormResponsavel(act.responsavel);
    setFormEstado(act.estado);
    setFormTipo(act.tipo);
    setFormCusto(act.custoPrevisto?.toString() || "0");
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formData || !formLocal.trim() || !formResponsavel.trim()) {
      alert("Preencha todos os campos obrigatórios (*).");
      return;
    }

    const costNum = parseInt(formCusto, 10) || 0;

    if (editingId) {
      // Edit
      setActividades(prev => prev.map(a => {
        if (a.id === editingId) {
          return {
            ...a,
            titulo: formTitulo,
            descricao: formDescricao,
            data: formData,
            local: formLocal,
            responsavel: formResponsavel,
            estado: formEstado,
            tipo: formTipo,
            custoPrevisto: costNum
          };
        }
        return a;
      }));

      // Sync if special type
      if (formTipo === "Atividade Extraordinária Temporária") {
        const nextVal = formEstado === "Concluída";
        setCampanhaConcluida(nextVal);
        localStorage.setItem("mpla_campanha_concluida", String(nextVal));
        if (nextVal) {
          setIsReportOpen(true);
        }
      }

      if (onAddNotification) {
        onAddNotification({
          type: "success",
          title: "Actividade Actualizada",
          message: `A actividade "${formTitulo}" foi modificada com sucesso.`
        });
      }
    } else {
      // Create
      const newAct: Actividade = {
        id: `act-${Date.now()}`,
        titulo: formTitulo,
        descricao: formDescricao,
        data: formData,
        local: formLocal,
        responsavel: formResponsavel,
        estado: formEstado,
        tipo: formTipo,
        custoPrevisto: costNum
      };

      setActividades(prev => [...prev, newAct]);

      // Sync if special type
      if (formTipo === "Atividade Extraordinária Temporária") {
        const nextVal = formEstado === "Concluída";
        setCampanhaConcluida(nextVal);
        localStorage.setItem("mpla_campanha_concluida", String(nextVal));
        if (nextVal) {
          setIsReportOpen(true);
        }
      }

      if (onAddNotification) {
        onAddNotification({
          type: "success",
          title: "Nova Actividade Criada",
          message: `Planeamento registado com sucesso: "${formTitulo}".`
        });
      }
    }

    setIsFormOpen(false);
  };

  const handleDeleteActividade = (id: string, titulo: string) => {
    if (confirm(`Pretende mesmo eliminar a actividade planeada: "${titulo}"?`)) {
      setActividades(prev => prev.filter(a => a.id !== id));
      if (onAddNotification) {
        onAddNotification({
          type: "warning",
          title: "Actividade Eliminada",
          message: `A actividade "${titulo}" foi removida do diário de planeamento.`
        });
      }
    }
  };

  const handleQuickChangeEstado = (id: string, novoEstado: Actividade["estado"], titulo: string) => {
    // Update state list
    setActividades(prev => {
      const updated = prev.map(a => {
        if (a.id === id) {
          return { ...a, estado: novoEstado };
        }
        return a;
      });

      // Find if we just updated a special type
      const targetAct = updated.find(a => a.id === id);
      if (targetAct && targetAct.tipo === "Atividade Extraordinária Temporária") {
        const nextVal = novoEstado === "Concluída";
        setCampanhaConcluida(nextVal);
        localStorage.setItem("mpla_campanha_concluida", String(nextVal));
        if (nextVal) {
          // Open report modal automatically!
          setTimeout(() => setIsReportOpen(true), 100);
        }
      }

      return updated;
    });

    if (onAddNotification) {
      onAddNotification({
        type: "info",
        title: "Estado Actualizado",
        message: `Actividade "${titulo}" alterada para o estado: ${novoEstado}.`
      });
    }
  };

  const formatAKZ = (val: number) => {
    return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
      .format(val)
      .replace("Kz", "AKZ")
      .trim();
  };

  return (
    <div className="space-y-6" id="planeamento-view">
      {/* 1. View Header */}
      <div className="border-b border-zinc-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="planeamento-header">
        <div>
          <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
            Planeamento Geral de Actividades (CAP-190)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Gira a agenda política, mobilizações comunitárias, assembleias de comissão de bairro e acções de solidariedade.
          </p>
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          id="btn-add-activity"
        >
          <Plus className="w-4 h-4 text-[#F9D71C]" />
          <span>Planear Actividade</span>
        </button>
      </div>

      {/* 2. Key Metrics Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="planeamento-metrics-cards">
        
        {/* Total Activities */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm" id="pm-total">
          <span className="text-[10px] text-zinc-400 font-extrabold block uppercase">Total Planeado</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-zinc-950 font-mono">{stats.total}</span>
            <span className="text-[10px] text-zinc-400 font-bold">acções</span>
          </div>
        </div>

        {/* Planeadas */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm border-l-4 border-blue-500" id="pm-planeadas">
          <span className="text-[10px] text-zinc-400 font-extrabold block uppercase text-blue-600">Planeadas</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-zinc-950 font-mono">{stats.planeadas}</span>
            <span className="text-[10px] text-blue-500 font-bold">agenda</span>
          </div>
        </div>

        {/* Em Progresso */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm border-l-4 border-amber-500" id="pm-progresso">
          <span className="text-[10px] text-zinc-400 font-extrabold block uppercase text-amber-600">Em Progresso</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-zinc-950 font-mono">{stats.emProgresso}</span>
            <span className="text-[10px] text-amber-500 font-bold">decorrer</span>
          </div>
        </div>

        {/* Concluídas */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm border-l-4 border-emerald-500" id="pm-concluidas">
          <span className="text-[10px] text-zinc-400 font-extrabold block uppercase text-emerald-600">Concluídas</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-zinc-950 font-mono">{stats.concluidas}</span>
            <span className="text-[10px] text-emerald-500 font-bold">sucesso</span>
          </div>
        </div>

        {/* Budget Estimated */}
        <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm col-span-2 lg:col-span-1 border-l-4 border-zinc-950" id="pm-budget">
          <span className="text-[10px] text-zinc-400 font-extrabold block uppercase text-zinc-700">Orçamento Previsto</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-zinc-950 font-mono text-red-700">{formatAKZ(stats.custoTotal)}</span>
          </div>
        </div>

      </div>

      {/* 3. Filtering Toolbar */}
      <div className="bg-zinc-100/80 border border-zinc-200/80 p-3.5 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between" id="planeamento-toolbar">
        {/* Search input */}
        <div className="relative w-full md:max-w-xs" id="planeamento-search-wrap">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar actividade, local, etc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white pl-9 pr-3 py-1.5 font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-xs placeholder-zinc-400"
            id="input-search-activities"
          />
        </div>

        {/* Selector Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end" id="planeamento-filters">
          
          {/* Tipo Filter */}
          <div className="flex items-center gap-1.5" id="f-tipo-wrapper">
            <Filter className="w-3 h-3 text-zinc-400" />
            <span className="text-[10px] font-black uppercase text-zinc-500">Tipo:</span>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-600 cursor-pointer"
              id="select-filter-tipo"
            >
              <option value="TODOS">Todos os tipos</option>
              <option value="Mobilização">Mobilização</option>
              <option value="Reunião">Reunião</option>
              <option value="Apoio Social">Apoio Social</option>
              <option value="Formação">Formação</option>
              <option value="Atividade Extraordinária Temporária">Atividade Extraordinária Temporária</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Estado Filter */}
          <div className="flex items-center gap-1.5" id="f-estado-wrapper">
            <span className="text-[10px] font-black uppercase text-zinc-500">Estado:</span>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-600 cursor-pointer"
              id="select-filter-estado"
            >
              <option value="TODOS">Todos os estados</option>
              <option value="Planeada">Planeada</option>
              <option value="Em Progresso">Em Progresso</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

        </div>
      </div>

      {/* 4. Activities Listing Grid */}
      {filteredActividades.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 font-bold" id="planeamento-empty-state">
          <Calendar className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm">Nenhuma actividade registada coincide com os filtros actuais.</p>
          <button 
            onClick={handleOpenCreateForm}
            className="mt-4 px-3 py-1.5 bg-zinc-950 text-white hover:text-[#F9D71C] font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
            id="empty-btn-create"
          >
            Planear Primeira Actividade
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="planeamento-grid-cards">
          {filteredActividades.map(act => (
            <div 
              key={act.id} 
              onClick={() => {
                if (act.tipo === "Atividade Extraordinária Temporária") {
                  setIsReportOpen(true);
                }
              }}
              className={`bg-white rounded-xl border border-zinc-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden ${
                act.tipo === "Atividade Extraordinária Temporária" ? "cursor-pointer border-yellow-500/60 ring-1 ring-yellow-400/20" : ""
              }`}
              id={`act-card-${act.id}`}
            >
              {/* Type tag line on top edge */}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                act.tipo === "Mobilização" ? "bg-red-600" :
                act.tipo === "Reunião" ? "bg-zinc-700" :
                act.tipo === "Apoio Social" ? "bg-emerald-500" :
                act.tipo === "Formação" ? "bg-blue-500" :
                act.tipo === "Atividade Extraordinária Temporária" ? "bg-yellow-500 animate-pulse" : "bg-purple-500"
              }`} />

              <div className="space-y-3">
                
                {/* Header row of card */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`text-[8px] font-black tracking-widest uppercase border px-2 py-0.5 rounded-full ${
                      act.tipo === "Mobilização" ? "bg-red-50 text-red-700 border-red-200" :
                      act.tipo === "Reunião" ? "bg-zinc-50 text-zinc-700 border-zinc-200" :
                      act.tipo === "Apoio Social" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      act.tipo === "Formação" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      act.tipo === "Atividade Extraordinária Temporária" ? "bg-yellow-50 text-yellow-800 border-yellow-200 animate-pulse" : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}>
                      {act.tipo}
                    </span>
                    <h4 className="text-sm font-black text-zinc-900 leading-snug uppercase mt-1.5">
                      {act.titulo}
                    </h4>
                  </div>
                  
                  {/* Estado indicator pill */}
                  <span className={`text-[9px] font-black uppercase py-0.5 px-2.5 rounded-full shrink-0 border ${
                    act.estado === "Planeada" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    act.estado === "Em Progresso" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    act.estado === "Concluída" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {act.estado}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                  {act.descricao}
                </p>

                {/* Meta details list */}
                <div className="space-y-1.5 border-t border-zinc-100 pt-3 text-[10px] font-extrabold text-zinc-500" id="act-meta-details">
                  
                  {/* Date & Local */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Data: <span className="text-zinc-800 font-black font-mono">{act.data}</span></span>
                  </div>

                  {/* Local */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="truncate">Local: <span className="text-zinc-800 font-black truncate">{act.local}</span></span>
                  </div>

                  {/* Responsável */}
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Responsável: <span className="text-zinc-800 font-black">{act.responsavel}</span></span>
                  </div>

                  {/* Budget planned */}
                  {act.custoPrevisto !== undefined && (
                    <div className="flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5 text-red-500" />
                      <span>Custo Previsto: <span className="text-red-700 font-black font-mono">{formatAKZ(act.custoPrevisto)}</span></span>
                    </div>
                  )}

                </div>

              </div>

              {/* Action bar of card */}
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4 mt-4" id="act-card-actions" onClick={(e) => e.stopPropagation()}>
                
                {/* State Quick Switch */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-black uppercase text-zinc-400 mr-1 inline-block">Mudar Estado:</span>
                  {act.estado !== "Planeada" && (
                    <button 
                      onClick={() => handleQuickChangeEstado(act.id, "Planeada", act.titulo)}
                      className="text-[9px] font-black bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded cursor-pointer"
                      title="Definir como Planeada"
                    >
                      Planear
                    </button>
                  )}
                  {act.estado !== "Em Progresso" && act.estado !== "Concluída" && (
                    <button 
                      onClick={() => handleQuickChangeEstado(act.id, "Em Progresso", act.titulo)}
                      className="text-[9px] font-black bg-amber-50 hover:bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded cursor-pointer"
                      title="Definir em Progresso"
                    >
                      Iniciar
                    </button>
                  )}
                  {act.estado !== "Concluída" && (
                    <button 
                      onClick={() => handleQuickChangeEstado(act.id, "Concluída", act.titulo)}
                      className="text-[9px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded cursor-pointer"
                      title="Definir como Concluída"
                    >
                      Concluir
                    </button>
                  )}
                  {act.estado !== "Cancelada" && (
                    <button 
                      onClick={() => handleQuickChangeEstado(act.id, "Cancelada", act.titulo)}
                      className="text-[9px] font-black bg-red-50 hover:bg-red-100 text-red-800 px-1.5 py-0.5 rounded cursor-pointer"
                      title="Definir como Cancelada"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {/* Edit & Delete Actions or Unique Report Button */}
                {act.tipo === "Atividade Extraordinária Temporária" && act.estado === "Concluída" ? (
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-zinc-950 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow shadow-yellow-500/10"
                    title="Ver Relatório de Balanço"
                    id={`btn-report-balanco-${act.id}`}
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Ver Relatório de Balanço</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditForm(act)}
                      className="p-1.5 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 rounded transition-colors cursor-pointer"
                      title="Editar Actividade"
                      id={`btn-edit-act-${act.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {act.id !== "voter-campaign-activity" && (
                      <button
                        onClick={() => handleDeleteActividade(act.id, act.titulo)}
                        className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Eliminar Actividade"
                        id={`btn-del-act-${act.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

              </div>

            </div>
          ))}
        </div>
      )}

      {/* 5. Create / Edit Activity Modal Panel Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto" id="modal-activity-form-overlay">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" id="modal-activity-form">
            
            {/* Modal Header */}
            <div className="bg-zinc-950 text-white p-4 flex items-center justify-between border-b-4 border-[#F9D71C]">
              <h4 className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F9D71C]" />
                {editingId ? "Editar Actividade Planeada" : "Planear Nova Actividade (Comité)"}
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-zinc-900"
                id="modal-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs font-bold text-zinc-800" id="form-activity">
              
              {/* Titulo */}
              <div className="space-y-1">
                <label className="text-zinc-700 block">Título da Actividade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campanha de Sensibilização Comunitária"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                  id="actform-input-title"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-zinc-700 block">Descrição Detalhada</label>
                <textarea
                  placeholder="Descreva detalhadamente os objectivos, métodos de actuação e materiais necessários..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                  id="actform-textarea-desc"
                />
              </div>

              {/* Row: Tipo, Estado & Data */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Tipo */}
                <div className="space-y-1">
                  <label className="text-zinc-700 block">Tipo *</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as Actividade["tipo"])}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="actform-select-tipo"
                  >
                    <option value="Mobilização">Mobilização</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Apoio Social">Apoio Social</option>
                    <option value="Formação">Formação</option>
                    <option value="Atividade Extraordinária Temporária">Atividade Extraordinária Temporária</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Estado */}
                <div className="space-y-1">
                  <label className="text-zinc-700 block">Estado *</label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value as Actividade["estado"])}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs cursor-pointer"
                    id="actform-select-estado"
                  >
                    <option value="Planeada">Planeada</option>
                    <option value="Em Progresso">Em Progresso</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                {/* Data */}
                <div className="space-y-1">
                  <label className="text-zinc-700 block">Data Prevista *</label>
                  <input
                    type="date"
                    required
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="actform-input-date"
                  />
                </div>

              </div>

              {/* Local, Responsável & Custo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Local */}
                <div className="space-y-1">
                  <label className="text-zinc-700 block">Local *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Comuna da Ingombota"
                    value={formLocal}
                    onChange={(e) => setFormLocal(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="actform-input-local"
                  />
                </div>

                {/* Responsável */}
                <div className="space-y-1">
                  <label className="text-zinc-700 block">Responsável *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do coordenador"
                    value={formResponsavel}
                    onChange={(e) => setFormResponsavel(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="actform-input-responsible"
                  />
                </div>

                {/* Custo Previsto */}
                <div className="space-y-1">
                  <label className="text-zinc-700 block">Custo Previsto (AKZ)</label>
                  <input
                    type="number"
                    placeholder="Ex: 150000"
                    value={formCusto}
                    onChange={(e) => setFormCusto(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 text-xs"
                    id="actform-input-cost"
                  />
                </div>

              </div>

              {/* Footer buttons of form */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2" id="actform-actions">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg font-black uppercase tracking-wider cursor-pointer"
                  id="actform-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-950 text-white hover:text-[#F9D71C] rounded-lg font-black uppercase tracking-wider cursor-pointer"
                  id="actform-submit-btn"
                >
                  {editingId ? "Gravar Alterações" : "Planear Actividade"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Campaign Report Modal (Atividade Temporária) */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto" id="modal-report-overlay">
          {/* Printable Stylesheets Injection */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              /* Hide everything else */
              body * {
                visibility: hidden !important;
              }
              #report-print-content, #report-print-content * {
                visibility: visible !important;
              }
              #report-print-content {
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
              /* For continuous printing with page breaks */
              .print-break-inside-avoid {
                page-break-inside: avoid !important;
              }
            }
          `}} />

          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" id="modal-report">
            {/* Modal Control Header (hidden on print) */}
            <div className="bg-zinc-950 text-white p-4 flex items-center justify-between border-b-4 border-yellow-500 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Relatório Oficial de Balanço • Recenseamento 2026
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] rounded-lg shadow transition-all cursor-pointer flex items-center gap-1.5 uppercase"
                  id="print-report-action"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Relatório</span>
                </button>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-zinc-900"
                  id="close-report-modal-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Frame */}
            <div 
              className="flex-1 overflow-y-auto p-8 space-y-6 text-zinc-900 bg-white" 
              id="report-print-content"
            >
              {/* Official Header */}
              <div className="border-b-4 border-red-600 pb-4 mb-6 flex items-center relative animate-fade-in" id="report-letterhead">
                <div className="absolute left-0">
                  <MplaCrestSvg className="w-16 h-20 sm:w-20 sm:h-24 shrink-0" />
                </div>
                <div className="w-full text-center py-2 flex flex-col items-center justify-center">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-zinc-950 font-sans leading-none m-0">MPLA</h1>
                  <h2 className="text-xs sm:text-sm font-black text-zinc-900 uppercase mt-2.5 tracking-wide font-sans leading-none">COMITE DE ACCAO DO PARTIDO - 190</h2>
                  <h3 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase mt-1.5 font-sans leading-none">Ingombota - Luanda * Angola</h3>
                </div>
              </div>

              <div className="text-left mb-6 font-sans" id="report-title-section">
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-zinc-950 font-sans leading-snug">
                  RELATORIO DE BALANCO DA CAMPANHA EXTRAORDINARIA DE REGISTO ELEITORAL
                </h2>
                <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase tracking-wider block mt-1">
                  Documento de Controle Interno * Emitido em {new Date().toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
                <div className="mt-3 text-[10px] font-black text-red-600 font-sans tracking-wide uppercase">
                  ESTADO DA ACTIVIDADE: {campanhaConcluida ? "CONCLUIDO" : "EM CURSO"}
                </div>
              </div>

              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="border border-zinc-200 p-3 rounded-lg text-center bg-zinc-50/50">
                  <span className="text-[8px] text-zinc-500 uppercase font-black block">Militantes Inscritos</span>
                  <span className="text-xl font-black text-zinc-950 font-mono mt-1 block">{electoralStats.total}</span>
                </div>
                <div className="border border-zinc-200 p-3 rounded-lg text-center bg-emerald-50/30 border-l-4 border-l-emerald-500">
                  <span className="text-[8px] text-emerald-800 uppercase font-black block">Registados (Cartão)</span>
                  <span className="text-xl font-black text-emerald-600 font-mono mt-1 block">{electoralStats.registados}</span>
                  <span className="text-[8px] font-bold text-emerald-700 font-mono">({electoralStats.pctRegistados}%)</span>
                </div>
                <div className="border border-zinc-200 p-3 rounded-lg text-center bg-amber-50/30 border-l-4 border-l-amber-500">
                  <span className="text-[8px] text-amber-800 uppercase font-black block">Pendentes (Triagem)</span>
                  <span className="text-xl font-black text-amber-600 font-mono mt-1 block">{electoralStats.pendentes}</span>
                  <span className="text-[8px] font-bold text-amber-700 font-mono">({electoralStats.pctPendentes}%)</span>
                </div>
                <div className="border border-zinc-200 p-3 rounded-lg text-center bg-red-50/30 border-l-4 border-l-red-500">
                  <span className="text-[8px] text-red-800 uppercase font-black block">Sem Registo</span>
                  <span className="text-xl font-black text-red-600 font-mono mt-1 block">{electoralStats.naoRegistados}</span>
                  <span className="text-[8px] font-bold text-red-700 font-mono">({electoralStats.pctNaoRegistados}%)</span>
                </div>
              </div>

              {/* Progress and Executive Note */}
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/20 space-y-3">
                <h4 className="text-xs font-black uppercase text-zinc-900 border-b border-zinc-200 pb-1.5 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-red-600" /> Nota Executiva de Coordenação
                </h4>
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
                    A Campanha Extraordinária de Recenseamento e Registo Eleitoral do CAP-190 foi concebida para realizar o levantamento minucioso do registo eleitoral dos militantes deste Comité de Acção. O objectivo central consiste em garantir que 100% dos militantes possuam cartão de eleitor válido e actual, em estrita conformidade com as directrizes de mobilização partidária.
                  </p>
                  <p className="text-[10px] text-zinc-600 leading-relaxed font-medium">
                    {campanhaConcluida ? (
                      <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 block">
                        ✓ CAMPANHA CONCLUÍDA: A comissão técnica dá por encerrada a acção extraordinária de acompanhamento directo, recomendando a manutenção das colunas no ficheiro geral de militantes para actualizações correntes. A taxa final de registados situa-se em {electoralStats.pctRegistados}%.
                      </span>
                    ) : (
                      <span className="text-amber-700 font-extrabold bg-amber-50 px-2 py-1 rounded border border-amber-100 block">
                        ● CAMPANHA EM CURSO: As brigadas de bairro continuam a recolher comprovativos de cartões de eleitor. Recomenda-se reforço prioritário nos bairros com taxas de recenseamento inferiores a 80%.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Geographical and Gender Tables Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
                {/* Neighborhood Census Table */}
                <div className="border border-zinc-200 rounded-lg p-4 bg-white shadow-sm">
                  <h4 className="text-xs font-black uppercase text-[#b91c1c] border-b border-zinc-200 pb-2 mb-3 flex items-center gap-1.5 font-sans">
                    <Map className="w-4 h-4 text-red-600" /> Distribuição Geográfica (Bairros)
                  </h4>
                  <table className="w-full text-[10px]" style={{ color: "#b91c1c" }}>
                    <thead>
                      <tr className="bg-zinc-100/80 font-black border-b border-zinc-200 text-[#b91c1c] uppercase text-[10px]">
                        <th className="text-left py-2 px-2">Bairro</th>
                        <th className="text-center py-2 px-2">Total</th>
                        <th className="text-center py-2 px-2">✓ Reg.</th>
                        <th className="text-right py-2 px-2">Taxa %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium text-[#b91c1c]">
                      {bairrosReport.map((b) => (
                        <tr key={b.nome} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-2 text-zinc-900 font-bold">{b.nome}</td>
                          <td className="text-center py-2.5 px-2 font-mono font-bold">{b.total}</td>
                          <td className="text-center py-2.5 px-2 font-mono font-bold text-emerald-600">{b.registados}</td>
                          <td className="text-right py-2.5 px-2 font-black font-mono">
                            <span className={b.taxa >= 80 ? "text-emerald-600" : b.taxa >= 50 ? "text-amber-600" : "text-red-600"}>
                              {b.taxa}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Gender Representation & CIVIC Action Table */}
                <div className="space-y-4">
                  <div className="border border-zinc-200 rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="text-xs font-black uppercase text-[#b91c1c] border-b border-zinc-200 pb-2 mb-3 flex items-center gap-1.5 font-sans">
                      <Users className="w-4 h-4 text-red-600" /> Representação de Registo por Género
                    </h4>
                    <table className="w-full text-[10px]" style={{ color: "#b91c1c" }}>
                      <thead>
                        <tr className="bg-zinc-100/80 font-black border-b border-zinc-200 text-[#b91c1c] uppercase text-[10px]">
                          <th className="text-left py-2 px-2">Gênero</th>
                          <th className="text-center py-2 px-2">Militantes</th>
                          <th className="text-center py-2 px-2">Reg. Efectivos</th>
                          <th className="text-right py-2 px-2">Cobertura</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-medium text-[#b91c1c]">
                        <tr className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-2 text-zinc-900 font-bold">Masculino</td>
                          <td className="text-center py-2.5 px-2 font-mono font-bold">{genderReport.totalM}</td>
                          <td className="text-center py-2.5 px-2 font-mono font-bold">{genderReport.regM}</td>
                          <td className="text-right py-2.5 px-2 text-emerald-600 font-black font-mono">{genderReport.pctRegM}%</td>
                        </tr>
                        <tr className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-2 text-zinc-900 font-bold">Feminino</td>
                          <td className="text-center py-2.5 px-2 font-mono font-bold">{genderReport.totalF}</td>
                          <td className="text-center py-2.5 px-2 font-mono font-bold">{genderReport.regF}</td>
                          <td className="text-right py-2.5 px-2 text-emerald-600 font-black font-mono">{genderReport.pctRegF}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 space-y-1.5 shadow-sm">
                    <h5 className="text-[10px] font-black uppercase text-red-800 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Alerta de Triagem
                    </h5>
                    <p className="text-[10px] text-red-700 leading-normal font-medium">
                      Existem <strong>{electoralStats.pendentes} militantes</strong> listados com recenseamento pendente. Foram enviadas notificações ao sistema para triagem imediata dos cartões físicos de eleitor.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nominal follow-up list (extremely useful for mobilizers) */}
              {membersNeedMobilization.length > 0 && (
                <div className="border border-zinc-200 rounded-lg p-4 bg-white shadow-sm print-break-inside-avoid">
                  <h4 className="text-xs font-black uppercase text-[#b91c1c] border-b border-zinc-200 pb-2 mb-3 flex items-center gap-1.5 font-sans">
                    <UserCheck className="w-4 h-4 text-red-600" /> Lista Nominativa para Diligências de Mobilização (Top 15)
                  </h4>
                  <table className="w-full text-[10px]" style={{ color: "#b91c1c" }}>
                    <thead>
                      <tr className="bg-zinc-100/80 font-black border-b border-zinc-200 text-[#b91c1c] uppercase text-[10px]">
                        <th className="text-left py-2 px-2">Nome do Militante</th>
                        <th className="text-left py-2 px-2 font-sans">Telemóvel</th>
                        <th className="text-left py-2 px-2 font-sans">Bairro</th>
                        <th className="text-center py-2 px-2 font-sans">Setor / Zona</th>
                        <th className="text-right py-2 px-2 font-sans">Estado Eleitoral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium text-[#b91c1c] text-left">
                      {membersNeedMobilization.map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-2 text-zinc-900 font-bold">{m.nome}</td>
                          <td className="py-2.5 px-2 font-mono">{m.telefone || "Sem contacto"}</td>
                          <td className="py-2.5 px-2 text-zinc-600">{m.bairro || "Ingombota Centro"}</td>
                          <td className="py-2.5 px-2 text-center text-zinc-600">Setor {m.sector || "1"} / Zona {m.zona || "A"}</td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={`px-2 py-0.5 rounded font-black text-[8px] inline-block ${
                              m.registoEleitoral === "Pendente" 
                                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}>
                              {(m.registoEleitoral || "Não Registado").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[8px] text-zinc-400 mt-2 italic font-sans font-bold">
                    * Esta listagem contém os militantes sem registo eleitoral verificado. Use os contactos listados para diligências presenciais imediatas de esclarecimento cívico.
                  </p>
                </div>
              )}

              {/* Consolidated Black Banner */}
              <div className="bg-zinc-950 text-white p-3.5 rounded-lg font-bold font-sans text-[10px] tracking-wide uppercase flex flex-col sm:flex-row items-center justify-between gap-2 mt-8 mb-6 shadow-sm no-print" id="report-black-banner">
                <span className="font-extrabold text-[#F9D71C]">CONSOLIDADO DA CAMPANHA</span>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[9px] sm:text-[10px]">
                  <span>Militantes: <strong className="text-white font-black">{electoralStats.total}</strong></span>
                  <span className="text-zinc-700">|</span>
                  <span>Registados: <strong className="text-green-400 font-black">{electoralStats.registados} ({electoralStats.pctRegistados}%)</strong></span>
                  <span className="text-zinc-700">|</span>
                  <span>Pendentes: <strong className="text-amber-400 font-black">{electoralStats.pendentes} ({electoralStats.pctPendentes}%)</strong></span>
                  <span className="text-zinc-700">|</span>
                  <span>Não Registados: <strong className="text-red-400 font-black">{electoralStats.naoRegistados} ({electoralStats.pctNaoRegistados}%)</strong></span>
                </div>
              </div>

              {/* Print version of Black Banner (Always visible on print) */}
              <div className="hidden print:flex bg-zinc-950 text-white p-3 font-bold font-sans text-[9px] tracking-wide uppercase items-center justify-between w-full mt-8 mb-6" id="report-black-banner-print">
                <span className="font-extrabold text-[#F9D71C]">CONSOLIDADO DA CAMPANHA</span>
                <div className="flex items-center justify-end gap-3 text-[9px]">
                  <span>Militantes: {electoralStats.total}</span>
                  <span className="text-zinc-800">|</span>
                  <span>Registados: {electoralStats.registados} ({electoralStats.pctRegistados}%)</span>
                  <span className="text-zinc-800">|</span>
                  <span>Pendentes: {electoralStats.pendentes} ({electoralStats.pctPendentes}%)</span>
                  <span className="text-zinc-800">|</span>
                  <span>Não Registados: {electoralStats.naoRegistados} ({electoralStats.pctNaoRegistados}%)</span>
                </div>
              </div>

              {/* Official Closing / Signature block */}
              <div className="pt-8 space-y-8 print-break-inside-avoid">
                <p className="text-[10px] text-zinc-600 font-medium text-center">
                  Luanda, aos {new Date().toLocaleDateString("pt-AO", { day: "numeric" })} de {new Date().toLocaleDateString("pt-AO", { month: "long" })} de {new Date().toLocaleDateString("pt-AO", { year: "numeric" })}.
                </p>
                
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center space-y-10">
                    <div className="border-t border-zinc-400 w-48 mx-auto" />
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-zinc-950 uppercase">Coordenador da Campanha</p>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold">Comissão de Mobilização</p>
                    </div>
                  </div>
                  <div className="text-center space-y-10">
                    <div className="border-t border-zinc-400 w-48 mx-auto" />
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-zinc-950 uppercase">Secretário para Organização</p>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold">Comité CAP-190</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Control Footer (hidden on print) */}
            <div className="bg-zinc-50 px-5 py-3.5 flex justify-end gap-2 border-t border-zinc-200 no-print">
              <button
                onClick={() => setIsReportOpen(false)}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                id="close-report-footer-btn"
              >
                Fechar Visualização
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow"
                id="print-report-footer-btn"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
