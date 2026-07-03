/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { MilitantesView } from "./components/MilitantesView";
import { QuotasView } from "./components/QuotasView";
import { IndicadoresView } from "./components/IndicadoresView";
import { CrescimentoView } from "./components/CrescimentoView";
import { RelatoriosView } from "./components/RelatoriosView";
import { InstrucoesView } from "./components/InstrucoesView";
import { PlaneamentoView } from "./components/PlaneamentoView";
import { LoginScreen } from "./components/LoginScreen";
import { ActiveTab, Militante, QuotaPayment, UserSession, AppNotification } from "./types";
import { loadData, saveData } from "./mockData";

export default function App() {
  // Authentication State
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Theme Selection State
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("mpla_theme");
    return saved === "dark" ? "dark" : "light";
  });

  // Handle toggling theme
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("mpla_theme", next);
      return next;
    });
  };

  // Sync theme class with document element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // State for militants and payments
  const [militants, setMilitants] = useState<Militante[]>([]);
  const [payments, setPayments] = useState<QuotaPayment[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  
  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("DASHBOARD");

  // Load initial data, session and notifications on mount
  useEffect(() => {
    const data = loadData();
    setMilitants(data.militants);
    setPayments(data.payments);

    const savedSession = localStorage.getItem("mpla_cap190_session");
    if (savedSession) {
      try {
        setUserSession(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem("mpla_cap190_session");
      }
    }

    const savedNotifications = localStorage.getItem("mpla_notifications");
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (e) {
        localStorage.removeItem("mpla_notifications");
      }
    } else {
      // Seed some initial notifications so the app looks alive
      const initialNotifs: AppNotification[] = [
        {
          id: "seed-notif-1",
          type: "success",
          title: "Sessão Iniciada",
          message: "Acesso ao painel administrativo CAP-190 estabelecido com sucesso.",
          timestamp: "Há momentos",
          read: false
        },
        {
          id: "seed-notif-2",
          type: "info",
          title: "Sincronização Concluída",
          message: "Banco de dados local sincronizado com 350 militantes registados.",
          timestamp: "Há 5 minutos",
          read: true
        }
      ];
      setNotifications(initialNotifs);
      localStorage.setItem("mpla_notifications", JSON.stringify(initialNotifs));
    }
  }, []);

  const handleLoginSuccess = (session: UserSession) => {
    setUserSession(session);
    localStorage.setItem("mpla_cap190_session", JSON.stringify(session));
    addNotification("success", "Sessão Iniciada", `Bem-vindo de volta, camarada ${session.nome}!`);
  };

  const handleLogout = () => {
    setUserSession(null);
    localStorage.removeItem("mpla_cap190_session");
  };

  // Helper to add notification
  const addNotification = (type: "success" | "info" | "warning" | "error", title: string, message: string) => {
    const timeStr = new Date().toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
    const dateStr = new Date().toLocaleDateString("pt-AO");
    
    const newNotification: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      title,
      message,
      timestamp: `${timeStr} - ${dateStr}`,
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      localStorage.setItem("mpla_notifications", JSON.stringify(updated));
      return updated;
    });

    // Add to active toast list
    setToasts(prev => [newNotification, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newNotification.id));
    }, 4500);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem("mpla_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("mpla_notifications");
  };

  // Helper to sync and save to localStorage
  const syncAndSave = (updatedMilitants: Militante[], updatedPayments: QuotaPayment[]) => {
    setMilitants(updatedMilitants);
    setPayments(updatedPayments);
    saveData(updatedMilitants, updatedPayments);
  };

  // 1. Militante Handlers
  const handleAddMilitante = (newMilitanteData: Omit<Militante, "id">) => {
    const newId = `militante-${Date.now()}`;
    const newMilitante: Militante = {
      ...newMilitanteData,
      id: newId
    };
    
    const updatedMilitants = [newMilitante, ...militants];
    syncAndSave(updatedMilitants, payments);

    addNotification(
      "success",
      "Militante Registado",
      `${newMilitante.nome} (${newMilitante.numeroCartao}) foi adicionado com sucesso ao CAP-190.`
    );
  };

  const handleUpdateMilitante = (updatedMilitante: Militante) => {
    const updatedMilitants = militants.map(m => m.id === updatedMilitante.id ? updatedMilitante : m);
    
    // Also update any payments registered with this militant to match the new name
    const updatedPayments = payments.map(p => {
      if (p.militanteId === updatedMilitante.id) {
        return { ...p, militanteNome: updatedMilitante.nome };
      }
      return p;
    });

    syncAndSave(updatedMilitants, updatedPayments);

    addNotification(
      "info",
      "Militante Atualizado",
      `Os dados cadastrais de ${updatedMilitante.nome} foram atualizados com sucesso.`
    );
  };

  const handleDeleteMilitante = (id: string) => {
    const militantToDelete = militants.find(m => m.id === id);
    const updatedMilitants = militants.filter(m => m.id !== id);
    // Also delete any payments associated with this militant
    const updatedPayments = payments.filter(p => p.militanteId !== id);
    syncAndSave(updatedMilitants, updatedPayments);

    if (militantToDelete) {
      addNotification(
        "error",
        "Militante Removido",
        `O registo de ${militantToDelete.nome} (${militantToDelete.numeroCartao}) foi excluído com sucesso.`
      );
    }
  };

  // 2. Payment Handlers
  const handleAddPayment = (newPaymentData: Omit<QuotaPayment, "id"> | Omit<QuotaPayment, "id">[]) => {
    const paymentsToAdd = Array.isArray(newPaymentData) ? newPaymentData : [newPaymentData];
    
    const newPayments = paymentsToAdd.map((p, idx) => ({
      ...p,
      id: `pay-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`
    }));

    const updatedPayments = [...newPayments, ...payments];
    syncAndSave(militants, updatedPayments);

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const formatAKZ = (val: number) => {
      return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
        .format(val).replace("Kz", "AKZ").trim();
    };

    if (paymentsToAdd.length === 1) {
      const p = paymentsToAdd[0];
      addNotification(
        "success", 
        "Quota Registada", 
        `Quota de ${monthNames[p.mes - 1]}/${p.ano} para ${p.militanteNome} no valor de ${formatAKZ(p.valor)} foi recebida.`
      );
    } else if (paymentsToAdd.length > 1) {
      const p = paymentsToAdd[0];
      const totalAmount = paymentsToAdd.reduce((sum, item) => sum + item.valor, 0);
      const listMonths = paymentsToAdd.map(item => monthNames[item.mes - 1].substring(0,3)).join(", ");
      addNotification(
        "success", 
        "Pagamento Adiantado", 
        `${paymentsToAdd.length} meses pagos em avanço para ${p.militanteNome} (${listMonths}) • Total: ${formatAKZ(totalAmount)}.`
      );
    }
  };

  const handleTogglePayment = (id: string) => {
    let changedPayment: QuotaPayment | undefined;
    const updatedPayments = payments.map(p => {
      if (p.id === id) {
        changedPayment = { ...p, pago: !p.pago };
        return changedPayment;
      }
      return p;
    });
    syncAndSave(militants, updatedPayments);

    if (changedPayment) {
      const action = changedPayment.pago ? "Validado" : "Estornado";
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      addNotification(
        changedPayment.pago ? "success" : "warning",
        `Quota ${action}`,
        `Quota de ${monthNames[changedPayment.mes - 1]} para ${changedPayment.militanteNome} foi ${action.toLowerCase()} com sucesso.`
      );
    }
  };

  const handleDeletePayment = (id: string) => {
    const paymentToDelete = payments.find(p => p.id === id);
    const updatedPayments = payments.filter(p => p.id !== id);
    syncAndSave(militants, updatedPayments);

    if (paymentToDelete) {
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      addNotification(
        "error",
        "Registo de Quota Removido",
        `Pagamento de quota de ${monthNames[paymentToDelete.mes - 1]}/${paymentToDelete.ano} para ${paymentToDelete.militanteNome} foi excluído.`
      );
    }
  };

  if (!userSession) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
      theme === "dark" ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"
    }`} id="app-workspace">
      {/* Dynamic Header with Notifications */}
      <Header 
        userSession={userSession} 
        onLogout={handleLogout} 
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearNotifications={handleClearNotifications}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main body: Sidebar + Content panel */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative" id="app-body">
        {/* Left Side menu */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userSession.role} />

        {/* Dynamic center panel with content views */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto select-text bg-zinc-50/50" id="main-content">
          {activeTab === "DASHBOARD" && (
            <DashboardView 
              militants={militants} 
              payments={payments} 
              notifications={notifications}
              onNavigate={(target) => setActiveTab(target)} 
              onAddPayment={handleAddPayment}
              onAddNotification={(notif) => addNotification(notif.type, notif.title, notif.message)}
              userRole={userSession.role}
            />
          )}
          {activeTab === "MILITANTES" && (
            <MilitantesView 
              militants={militants}
              payments={payments}
              onAddMilitante={handleAddMilitante}
              onUpdateMilitante={handleUpdateMilitante}
              onDeleteMilitante={handleDeleteMilitante}
              onAddNotification={(notif) => addNotification(notif.type, notif.title, notif.message)}
              userRole={userSession.role}
            />
          )}
          {activeTab === "QUOTAS" && (
            <QuotasView 
              militants={militants}
              payments={payments}
              onAddPayment={handleAddPayment}
              onTogglePayment={handleTogglePayment}
              onDeletePayment={handleDeletePayment}
              userRole={userSession.role}
            />
          )}
          {activeTab === "INDICADORES" && (
            <IndicadoresView 
              militants={militants}
              payments={payments}
            />
          )}
          {activeTab === "CRESCIMENTO" && (
            <CrescimentoView 
              militants={militants}
            />
          )}
          {activeTab === "RELATORIOS" && (
            <RelatoriosView 
              militants={militants}
              payments={payments}
              userRole={userSession.role}
            />
          )}
          {activeTab === "PLANEAMENTO" && (
            <PlaneamentoView 
              userSession={userSession}
              onAddNotification={(notif) => addNotification(notif.type, notif.title, notif.message)}
            />
          )}
          {activeTab === "INSTRUCOES" && (
            <InstrucoesView />
          )}
        </main>
      </div>

      {/* Toast Notification Popups Overlays */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" id="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-2xl flex gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
              toast.type === "success" ? "bg-zinc-950/95 border-emerald-500/30 text-emerald-100" :
              toast.type === "warning" ? "bg-zinc-950/95 border-amber-500/30 text-amber-100" :
              toast.type === "error" ? "bg-zinc-950/95 border-red-500/30 text-red-100" :
              "bg-zinc-950/95 border-zinc-800 text-zinc-100"
            }`}
            id={`toast-${toast.id}`}
          >
            <div className="shrink-0 mt-0.5 flex items-center justify-center">
              {toast.type === "success" && <span className="text-emerald-400 font-extrabold text-base">✓</span>}
              {toast.type === "warning" && <span className="text-amber-400 font-extrabold text-base">⚠</span>}
              {toast.type === "error" && <span className="text-red-400 font-extrabold text-base">✗</span>}
              {toast.type === "info" && <span className="text-blue-400 font-extrabold text-base">ℹ</span>}
            </div>
            <div className="space-y-1">
              <h5 className="font-extrabold text-xs uppercase tracking-wider text-white">{toast.title}</h5>
              <p className="text-[11px] leading-normal font-medium text-zinc-300">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
