/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { MplaCrestSvg } from "./Header";
import { 
  FileText, 
  Printer, 
  Download, 
  ChevronRight, 
  Users, 
  DollarSign, 
  AlertOctagon, 
  Calendar,
  Building
} from "lucide-react";
import { Militante, QuotaPayment, UserRole } from "../types";
import { generateReportPDF, generateMonthlySharePDF } from "../lib/pdfReportGenerator";

interface RelatoriosViewProps {
  militants: Militante[];
  payments: QuotaPayment[];
  userRole?: UserRole;
}

type ReportType = "LISTA_GERAL" | "BALANCO_FINANCEIRO" | "INACTIVOS_SUSPENSOS" | "MILITANTES_DIVIDA" | "PARTILHA_MENSAL";

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function RelatoriosView({ militants, payments, userRole = "Administrador" }: RelatoriosViewProps) {
  const [activeReport, setActiveReport] = useState<ReportType>(() => {
    if (userRole === "Tesoureiro") {
      return "BALANCO_FINANCEIRO";
    }
    return "LISTA_GERAL";
  });

  // Report filter states
  const [bairroFilter, setBairroFilter] = useState("Todos");
  const [generoFilter, setGeneroFilter] = useState("Todos");
  const [anoAdmissaoFilter, setAnoAdmissaoFilter] = useState("Todos");
  const [mesFilter, setMesFilter] = useState("Todos");

  const uniqueBairros = useMemo(() => {
    const bSet = new Set(militants.map(m => m.bairro).filter(Boolean));
    return Array.from(bSet).sort();
  }, [militants]);

  // Filtered militants based on selection
  const filteredMilitantsForReports = useMemo(() => {
    return militants.filter(m => {
      if (bairroFilter !== "Todos" && m.bairro !== bairroFilter) return false;
      if (generoFilter !== "Todos" && m.genero !== generoFilter) return false;
      if (anoAdmissaoFilter !== "Todos") {
        const year = m.dataAdmissao.split("-")[0];
        if (anoAdmissaoFilter === "Antes de 2025") {
          if (parseInt(year, 10) >= 2025) return false;
        } else if (year !== anoAdmissaoFilter) {
          return false;
        }
      }
      if (mesFilter !== "Todos") {
        const parts = m.dataAdmissao.split("-");
        if (parts.length === 3) {
          const mMonth = parseInt(parts[1], 10);
          if (mMonth !== parseInt(mesFilter, 10)) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [militants, bairroFilter, generoFilter, anoAdmissaoFilter, mesFilter]);

  // Filtered payments based on filtered militants and month filter
  const filteredPaymentsForReports = useMemo(() => {
    const allowedMilitantIds = new Set(filteredMilitantsForReports.map(m => m.id));
    let result = payments.filter(p => allowedMilitantIds.has(p.militanteId));
    if (mesFilter !== "Todos") {
      result = result.filter(p => p.mes === parseInt(mesFilter, 10));
    }
    return result;
  }, [payments, filteredMilitantsForReports, mesFilter]);

  // Format currency helper
  const formatAKZ = (val: number) => {
    return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
      .format(val)
      .replace("Kz", "AKZ")
      .trim();
  };

  // Get current date string for report footer
  const formattedToday = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("pt-AO", { day: "numeric", month: "long", year: "numeric" });
  }, []);

  // 1. Report: General Militant List
  const reportGeneralList = useMemo(() => {
    return [...filteredMilitantsForReports].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredMilitantsForReports]);

  // 2. Report: Inactives & Suspended List
  const reportNonActiveList = useMemo(() => {
    return filteredMilitantsForReports
      .filter(m => m.estado !== "Activo")
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredMilitantsForReports]);

  // 3. Report: Financial Balanco
  const reportFinanceBalanco = useMemo(() => {
    const monthlyData = Array(12).fill(null).map((_, idx) => ({
      mesNum: idx + 1,
      mesNome: MONTHS_FULL[idx],
      quantidade: 0,
      total: 0
    }));

    filteredPaymentsForReports.forEach(p => {
      if (p.pago && p.mes >= 1 && p.mes <= 12) {
        monthlyData[p.mes - 1].quantidade++;
        monthlyData[p.mes - 1].total += p.valor;
      }
    });

    const sumQuantidades = monthlyData.reduce((sum, d) => sum + d.quantidade, 0);
    const sumTotals = monthlyData.reduce((sum, d) => sum + d.total, 0);

    return {
      months: monthlyData,
      totalCount: sumQuantidades,
      totalValue: sumTotals
    };
  }, [filteredPaymentsForReports]);

  // Compute debtors map (militanteId -> { totalDivida, mesesDevidos })
  const devedoresMap = useMemo(() => {
    const listIds = new Set(filteredMilitantsForReports.map(m => m.id));
    const relevantPayments = payments.filter(p => listIds.has(p.militanteId));
    const filteredPayments = mesFilter !== "Todos"
      ? relevantPayments.filter(p => p.mes === parseInt(mesFilter, 10))
      : relevantPayments;

    const map = new Map<string, { totalDivida: number; mesesDevidos: number[] }>();
    filteredPayments.forEach(p => {
      if (!p.pago) {
        const current = map.get(p.militanteId) || { totalDivida: 0, mesesDevidos: [] };
        current.totalDivida += p.valor;
        current.mesesDevidos.push(p.mes);
        map.set(p.militanteId, current);
      }
    });
    return map;
  }, [filteredMilitantsForReports, payments, mesFilter]);

  // 4. Report: Militants with debt
  const reportDividaList = useMemo(() => {
    return filteredMilitantsForReports
      .filter(m => devedoresMap.has(m.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredMilitantsForReports, devedoresMap]);

  // Consolidated totals based on applied filters
  const reportTotals = useMemo(() => {
    const list = filteredMilitantsForReports;
    const totalMilitants = list.length;
    const totalActivos = list.filter(m => m.estado === "Activo").length;
    const totalInactivos = list.filter(m => m.estado === "Inactivo").length;
    const totalSuspensos = list.filter(m => m.estado === "Suspenso").length;
    const totalDevedores = reportDividaList.length;
    const valorTotalDivida = reportDividaList.reduce((sum, m) => sum + (devedoresMap.get(m.id)?.totalDivida || 0), 0);

    return {
      totalMilitants,
      totalActivos,
      totalInactivos,
      totalSuspensos,
      totalDevedores,
      valorTotalDivida
    };
  }, [filteredMilitantsForReports, reportDividaList, devedoresMap]);

  // Load beneficiaries from localStorage
  const beneficiarios = useMemo(() => {
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
  }, []);

  const [localApprovals, setLocalApprovals] = useState<{ [key: string]: any }>(() => {
    const saved = localStorage.getItem("cap190_quota_distribution_approvals");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const selectedReportMonthNum = useMemo(() => {
    return mesFilter === "Todos" ? 7 : parseInt(mesFilter, 10);
  }, [mesFilter]);

  const selectedReportYearNum = 2026; // Current fiscal year

  const partilhaData = useMemo(() => {
    const mNum = selectedReportMonthNum;
    const yNum = selectedReportYearNum;
    const approvalKey = `${mNum}-${yNum}`;
    const appState = localApprovals[approvalKey] || {};

    const totalArrecadado = payments
      .filter(p => p.pago && p.mes === mNum && p.ano === yNum)
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
    const isHomologated = !!(appState.elaborado?.assinado && appState.autorizado?.assinado);
    const isSubmetido = !!appState.submetido;

    return {
      monthNum: mNum,
      yearNum: yNum,
      totalArrecadado,
      totalPercent,
      saldoPercent,
      calculatedShares,
      totalDistribuido,
      saldoResidual,
      isHomologated,
      isSubmetido,
      appState,
      approvalKey
    };
  }, [selectedReportMonthNum, selectedReportYearNum, payments, beneficiarios, localApprovals]);

  const handleSubmeterReport = (approvalKey: string) => {
    const updated = {
      ...localApprovals,
      [approvalKey]: {
        ...(localApprovals[approvalKey] || {}),
        submetido: true,
        dataSubmissao: new Date().toISOString().split("T")[0]
      }
    };
    setLocalApprovals(updated);
    localStorage.setItem("cap190_quota_distribution_approvals", JSON.stringify(updated));
    alert(`O relatório homologado do mês de ${MONTHS_FULL[partilhaData.monthNum - 1]} foi submetido digitalmente ao Comité do Distrito com sucesso!`);
    window.dispatchEvent(new Event("storage"));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (activeReport === "PARTILHA_MENSAL") {
      generateMonthlySharePDF(
        partilhaData.monthNum,
        partilhaData.yearNum,
        partilhaData.totalArrecadado,
        partilhaData.calculatedShares,
        partilhaData.totalDistribuido,
        partilhaData.saldoResidual,
        partilhaData.isHomologated,
        partilhaData.isSubmetido,
        partilhaData.appState,
        new Date().toISOString().split("T")[0] // emission date
      );
    } else {
      generateReportPDF(militants, payments, {
        activeReport,
        bairroFilter,
        generoFilter,
        anoAdmissaoFilter,
        mesFilter
      });
    }
  };

  const handleExportPDF_UNUSED = () => {
    const doc = {
      setFont: () => {},
      setFontSize: () => {},
      setTextColor: () => {},
      text: () => {},
      setFillColor: () => {},
      rect: () => {},
      triangle: () => {},
      setDrawColor: () => {},
      setLineWidth: () => {},
      line: () => {},
      addPage: () => {},
      save: () => {},
    } as any;
    
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
    doc.text(`Documento de Controle Interno * Emitido em ${formattedToday}`, 14, 37);

    // Draw Official Flag Logo on PDF
    doc.setFillColor(185, 28, 28); // Red
    doc.rect(170, 16, 24, 6, "F");
    doc.setFillColor(24, 24, 27); // Black
    doc.rect(170, 22, 24, 6, "F");
    // Gold star centered at 182, 22
    doc.setFillColor(234, 179, 8); // Gold
    // Triangle pointing up
    doc.triangle(182, 20.0, 179.5, 24.0, 184.5, 24.0, "F");
    // Triangle pointing down
    doc.triangle(182, 24.7, 179.5, 20.7, 184.5, 20.7, "F");
    
    // Decorative Red Bar
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(1.5);
    doc.line(14, 42, 196, 42);
    
    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(24, 24, 27);
    let title = "";
    if (activeReport === "LISTA_GERAL") title = "RELATORIO DE LISTAGEM GERAL DE MILITANTES";
    else if (activeReport === "BALANCO_FINANCEIRO") title = "BALANCO FINANCEIRO DE ARRECADACAO DE QUOTAS - 2026";
    else if (activeReport === "MILITANTES_DIVIDA") title = "RELATORIO DE INCOMPATIBILIDADE E DIVIDAS DE QUOTAS";
    else title = "RELATORIO DE MOBILIZACAO: MEMBROS INACTIVOS E SUSPENSOS";
    doc.text(title, 14, 52);
    
    doc.setFontSize(9);
    let startY = 62;

    // Print active filters on PDF and adjust startY
    if (bairroFilter !== "Todos" || generoFilter !== "Todos" || anoAdmissaoFilter !== "Todos" || mesFilter !== "Todos") {
      let filterText = "Filtros aplicados: ";
      if (bairroFilter !== "Todos") filterText += `Bairro: ${bairroFilter}  |  `;
      if (generoFilter !== "Todos") filterText += `Gênero: ${generoFilter}  |  `;
      if (anoAdmissaoFilter !== "Todos") filterText += `Admissão: ${anoAdmissaoFilter}  |  `;
      if (mesFilter !== "Todos") filterText += `Mês: ${MONTHS_FULL[parseInt(mesFilter, 10) - 1]}  |  `;
      if (filterText.endsWith("  |  ")) filterText = filterText.substring(0, filterText.length - 5);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28); // red-700
      doc.text(filterText.toUpperCase(), 14, 58);
      startY = 68;
    }
    
    if (activeReport === "LISTA_GERAL") {
      // Header rect
      doc.setFillColor(244, 244, 245);
      doc.rect(14, startY, 182, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.text("N Card", 15, startY + 6);
      doc.text("Nome Completo", 40, startY + 6);
      doc.text("Gen", 95, startY + 6);
      doc.text("Bairro", 112, startY + 6);
      doc.text("Admissao", 135, startY + 6);
      doc.text("Estado", 158, startY + 6);
      doc.text("Telefone", 175, startY + 6);
      
      startY += 8;
      doc.setFont("Helvetica", "normal");
      
      reportGeneralList.forEach((m) => {
        if (startY > 265) {
          doc.addPage();
          startY = 20;
          doc.setFillColor(244, 244, 245);
          doc.rect(14, startY, 182, 8, "F");
          doc.setFont("Helvetica", "bold");
          doc.text("N Card", 15, startY + 6);
          doc.text("Nome Completo", 40, startY + 6);
          doc.text("Gen", 95, startY + 6);
          doc.text("Bairro", 112, startY + 6);
          doc.text("Admissao", 135, startY + 6);
          doc.text("Estado", 158, startY + 6);
          doc.text("Telefone", 175, startY + 6);
          startY += 8;
          doc.setFont("Helvetica", "normal");
        }
        doc.text(m.numeroCartao, 15, startY + 6);
        let nameText = m.nome;
        if (nameText.length > 30) nameText = nameText.substring(0, 30) + "...";
        doc.text(nameText, 40, startY + 6);
        doc.text(m.genero || "-", 95, startY + 6);
        let bairroText = m.bairro || "-";
        if (bairroText.length > 12) bairroText = bairroText.substring(0, 12) + "...";
        doc.text(bairroText, 112, startY + 6);
        
        const formattedDate = m.dataAdmissao ? m.dataAdmissao.split("-").reverse().join("/") : "-";
        doc.text(formattedDate, 135, startY + 6);
        doc.text(m.estado, 158, startY + 6);
        doc.text(m.telefone, 175, startY + 6);
        
        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.2);
        doc.line(14, startY + 8, 196, startY + 8);
        startY += 8;
      });

      // Add general list summary totals row/box
      if (startY > 230) {
        doc.addPage();
        startY = 20;
      } else {
        startY += 8;
      }
      doc.setFillColor(24, 24, 27);
      doc.rect(14, startY, 182, 11, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text("CONSOLIDADO GERAL", 16, startY + 7);
      doc.text(`Militantes: ${reportTotals.totalMilitants}  |  Activos: ${reportTotals.totalActivos}  |  Inactivos: ${reportTotals.totalInactivos}  |  Suspensos: ${reportTotals.totalSuspensos}  |  Devedores: ${reportTotals.totalDevedores} (${formatAKZ(reportTotals.valorTotalDivida)})`, 55, startY + 7);
      doc.setTextColor(24, 24, 27);
      startY += 15;
    } else if (activeReport === "BALANCO_FINANCEIRO") {
      // Header rect
      doc.setFillColor(244, 244, 245);
      doc.rect(14, startY, 182, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.text("Mes de Referencia", 16, startY + 6);
      doc.text("Contribuicoes Registadas", 75, startY + 6);
      doc.text("Total Arrecadado (AKZ)", 140, startY + 6);
      
      startY += 8;
      doc.setFont("Helvetica", "normal");
      
      // If mesFilter !== "Todos", show only the selected month row in summary
      const monthsToRender = mesFilter === "Todos" 
        ? reportFinanceBalanco.months 
        : reportFinanceBalanco.months.filter(m => m.mesNum === parseInt(mesFilter, 10));

      monthsToRender.forEach((m) => {
        doc.text(m.mesNome, 16, startY + 6);
        doc.text(`${m.quantidade} pagamentos`, 75, startY + 6);
        doc.text(formatAKZ(m.total), 140, startY + 6);
        
        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.2);
        doc.line(14, startY + 8, 196, startY + 8);
        startY += 8;
      });
      
      // Totals bar
      doc.setFillColor(24, 24, 27);
      doc.rect(14, startY, 182, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.text("TOTAL CONSOLIDADO", 16, startY + 7);
      doc.text(`${reportFinanceBalanco.totalCount} pagamentos`, 75, startY + 7);
      doc.text(formatAKZ(reportFinanceBalanco.totalValue), 140, startY + 7);
      doc.setTextColor(24, 24, 27);
      startY += 15;

      // Add detailed breakdown of payments
      if (startY > 230) {
        doc.addPage();
        startY = 20;
      }
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DETALHAMENTO DAS CONTRIBUICOES INDIVIDUAIS", 14, startY);
      startY += 6;

      doc.setFillColor(244, 244, 245);
      doc.rect(14, startY, 182, 8, "F");
      doc.setFontSize(8);
      doc.text("Militante", 16, startY + 6);
      doc.text("Mes Ref.", 85, startY + 6);
      doc.text("Valor Pago", 115, startY + 6);
      doc.text("Data Pagamento", 150, startY + 6);
      startY += 8;
      doc.setFont("Helvetica", "normal");

      if (filteredPaymentsForReports.length === 0) {
        doc.text("Nenhuma contribuicao registada para os filtros selecionados.", 16, startY + 6);
        startY += 8;
      } else {
        filteredPaymentsForReports.forEach((p) => {
          if (startY > 265) {
            doc.addPage();
            startY = 20;
            doc.setFillColor(244, 244, 245);
            doc.rect(14, startY, 182, 8, "F");
            doc.setFont("Helvetica", "bold");
            doc.text("Militante", 16, startY + 6);
            doc.text("Mes Ref.", 85, startY + 6);
            doc.text("Valor Pago", 115, startY + 6);
            doc.text("Data Pagamento", 150, startY + 6);
            startY += 8;
            doc.setFont("Helvetica", "normal");
          }

          let nameText = p.militanteNome;
          if (nameText.length > 35) nameText = nameText.substring(0, 35) + "...";
          doc.text(nameText, 16, startY + 6);
          doc.text(MONTHS_FULL[p.mes - 1], 85, startY + 6);
          doc.text(formatAKZ(p.valor), 115, startY + 6);
          const formattedDate = p.dataPagamento ? p.dataPagamento.split("-").reverse().join("/") : "-";
          doc.text(formattedDate, 150, startY + 6);

          doc.setDrawColor(228, 228, 231);
          doc.setLineWidth(0.1);
          doc.line(14, startY + 8, 196, startY + 8);
          startY += 8;
        });
      }
    } else if (activeReport === "MILITANTES_DIVIDA") {
      // Header rect
      doc.setFillColor(244, 244, 245);
      doc.rect(14, startY, 182, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.text("N Card", 15, startY + 6);
      doc.text("Nome Completo", 40, startY + 6);
      doc.text("Gen", 95, startY + 6);
      doc.text("Bairro", 112, startY + 6);
      doc.text("Meses Devidos", 135, startY + 6);
      doc.text("Total Divida", 168, startY + 6);
      
      startY += 8;
      doc.setFont("Helvetica", "normal");
      
      reportDividaList.forEach((m) => {
        if (startY > 265) {
          doc.addPage();
          startY = 20;
          doc.setFillColor(244, 244, 245);
          doc.rect(14, startY, 182, 8, "F");
          doc.setFont("Helvetica", "bold");
          doc.text("N Card", 15, startY + 6);
          doc.text("Nome Completo", 40, startY + 6);
          doc.text("Gen", 95, startY + 6);
          doc.text("Bairro", 112, startY + 6);
          doc.text("Meses Devidos", 135, startY + 6);
          doc.text("Total Divida", 168, startY + 6);
          startY += 8;
          doc.setFont("Helvetica", "normal");
        }
        doc.text(m.numeroCartao, 15, startY + 6);
        let nameText = m.nome;
        if (nameText.length > 30) nameText = nameText.substring(0, 30) + "...";
        doc.text(nameText, 40, startY + 6);
        doc.text(m.genero || "-", 95, startY + 6);
        let bairroText = m.bairro || "-";
        if (bairroText.length > 12) bairroText = bairroText.substring(0, 12) + "...";
        doc.text(bairroText, 112, startY + 6);
        
        const devInfo = devedoresMap.get(m.id);
        const mesesText = devInfo ? devInfo.mesesDevidos.map(num => MONTHS_FULL[num - 1].substring(0, 3)).join(", ") : "-";
        let truncatedMeses = mesesText;
        if (truncatedMeses.length > 18) truncatedMeses = truncatedMeses.substring(0, 15) + "...";
        doc.text(truncatedMeses, 135, startY + 6);
        
        const valorDividaText = devInfo ? formatAKZ(devInfo.totalDivida) : "0 AKZ";
        doc.text(valorDividaText, 168, startY + 6);
        
        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.2);
        doc.line(14, startY + 8, 196, startY + 8);
        startY += 8;
      });

      // Consolidation row for debt
      if (startY > 230) {
        doc.addPage();
        startY = 20;
      } else {
        startY += 8;
      }
      doc.setFillColor(24, 24, 27);
      doc.rect(14, startY, 182, 11, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL DE MILITANTES EM INCUMPRIMENTO", 16, startY + 7);
      doc.text(`Total Devedores: ${reportTotals.totalDevedores}  |  Divida Consolidada: ${formatAKZ(reportTotals.valorTotalDivida)}`, 100, startY + 7);
      doc.setTextColor(24, 24, 27);
      startY += 15;
    } else {
      // Non active listing
      doc.setFillColor(244, 244, 245);
      doc.rect(14, startY, 182, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.text("N Card", 15, startY + 6);
      doc.text("Nome Completo", 40, startY + 6);
      doc.text("Gen", 95, startY + 6);
      doc.text("Bairro", 112, startY + 6);
      doc.text("Admissao", 135, startY + 6);
      doc.text("Estado", 158, startY + 6);
      doc.text("Telefone", 175, startY + 6);
      
      startY += 8;
      doc.setFont("Helvetica", "normal");
      
      reportNonActiveList.forEach((m) => {
        if (startY > 265) {
          doc.addPage();
          startY = 20;
          doc.setFillColor(244, 244, 245);
          doc.rect(14, startY, 182, 8, "F");
          doc.setFont("Helvetica", "bold");
          doc.text("N Card", 15, startY + 6);
          doc.text("Nome Completo", 40, startY + 6);
          doc.text("Gen", 95, startY + 6);
          doc.text("Bairro", 112, startY + 6);
          doc.text("Admissao", 135, startY + 6);
          doc.text("Estado", 158, startY + 6);
          doc.text("Telefone", 175, startY + 6);
          startY += 8;
          doc.setFont("Helvetica", "normal");
        }
        doc.text(m.numeroCartao, 15, startY + 6);
        let nameText = m.nome;
        if (nameText.length > 30) nameText = nameText.substring(0, 30) + "...";
        doc.text(nameText, 40, startY + 6);
        doc.text(m.genero || "-", 95, startY + 6);
        let bairroText = m.bairro || "-";
        if (bairroText.length > 12) bairroText = bairroText.substring(0, 12) + "...";
        doc.text(bairroText, 112, startY + 6);
        
        const formattedDate = m.dataAdmissao ? m.dataAdmissao.split("-").reverse().join("/") : "-";
        doc.text(formattedDate, 135, startY + 6);
        doc.text(m.estado, 158, startY + 6);
        doc.text(m.telefone, 175, startY + 6);
        
        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.2);
        doc.line(14, startY + 8, 196, startY + 8);
        startY += 8;
      });

      // Add non active list summary totals row/box
      if (startY > 230) {
        doc.addPage();
        startY = 20;
      } else {
        startY += 8;
      }
      doc.setFillColor(24, 24, 27);
      doc.rect(14, startY, 182, 11, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text("CONSOLIDADO FORA DE SERVICO", 16, startY + 7);
      doc.text(`Total Fora de Servico: ${reportNonActiveList.length}  |  Inactivos: ${reportTotals.totalInactivos}  |  Suspensos: ${reportTotals.totalSuspensos}`, 75, startY + 7);
      doc.setTextColor(24, 24, 27);
      startY += 15;
    }
    
    // Signatures
    if (startY > 230) {
      doc.addPage();
      startY = 30;
    } else {
      startY += 15;
    }
    
    doc.setDrawColor(161, 161, 170);
    doc.setLineWidth(0.5);
    doc.line(20, startY, 80, startY);
    doc.line(120, startY, 180, startY);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text("SECRETARIA PARA ADMINISTRACAO", 21, startY + 5);
    doc.text("COORDENADOR GERAL DO CAP-190", 121, startY + 5);
    
    doc.save(`CAP190_Relatorio_${activeReport}_2026.pdf`);
  };

  return (
    <div className="space-y-6" id="relatorios-view">
      {/* CSS style injection to optimize printable view */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-paper, #printable-report-paper * {
            visibility: visible;
          }
          #printable-report-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* 1. View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4" id="relatorios-header">
        <div>
          <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
            Centro de Emissão de Relatórios
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Selecione um relatório pré-formatado, visualize-o na folha oficial e envie para a impressora ou PDF.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-all cursor-pointer select-none"
            id="export-pdf-report-btn"
          >
            <Download className="w-4 h-4 text-yellow-400" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg shadow-sm transition-all cursor-pointer select-none"
            id="print-report-btn"
          >
            <Printer className="w-4 h-4 text-red-600" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm space-y-3 animate-fade-in" id="reports-filter-bar">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
          <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">Filtros Activos no Relatório</span>
          <span className="text-[10px] text-zinc-400 font-bold font-sans">(Aplica-se a todos os relatórios abaixo)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Bairro Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Sector / Bairro</label>
            <select
              value={bairroFilter}
              onChange={(e) => setBairroFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="report-bairro-filter-select"
            >
              <option value="Todos">Todos os Bairros</option>
              {uniqueBairros.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Genero Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Gênero</label>
            <select
              value={generoFilter}
              onChange={(e) => setGeneroFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="report-genero-filter-select"
            >
              <option value="Todos">Todos os Gêneros</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>

          {/* Ano Admissao Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Ano de Admissão</label>
            <select
              value={anoAdmissaoFilter}
              onChange={(e) => setAnoAdmissaoFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="report-ano-filter-select"
            >
              <option value="Todos">Todos os Anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="Antes de 2025">Antes de 2025</option>
            </select>
          </div>

          {/* Mes Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Mês de Referência</label>
            <select
              value={mesFilter}
              onChange={(e) => setMesFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="report-mes-filter-select"
            >
              <option value="Todos">Todos os Meses</option>
              {MONTHS_FULL.map((m, idx) => (
                <option key={idx} value={String(idx + 1)}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Layout of Report Selector & Document Paper Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="relatorios-layout-grid">
        
        {/* Left Side: Report selector */}
        <div className="space-y-2 lg:col-span-1" id="report-selectors">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-1 mb-2">
            Tipos de Relatórios
          </span>

          {(userRole === "Administrador" || userRole === "Secretário") && (
            <button
              onClick={() => setActiveReport("LISTA_GERAL")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                activeReport === "LISTA_GERAL"
                  ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border-zinc-200 hover:bg-zinc-50"
              }`}
              id="report-select-general"
            >
              <Users className="w-4 h-4 shrink-0 text-red-600" />
              <div className="leading-tight">
                <span>Lista Geral de Militantes</span>
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">Todos os membros cadastrados</span>
              </div>
            </button>
          )}

          {(userRole === "Administrador" || userRole === "Tesoureiro") && (
            <button
              onClick={() => setActiveReport("BALANCO_FINANCEIRO")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                activeReport === "BALANCO_FINANCEIRO"
                  ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border-zinc-200 hover:bg-zinc-50"
              }`}
              id="report-select-financial"
            >
              <DollarSign className="w-4 h-4 shrink-0 text-red-600" />
              <div className="leading-tight">
                <span>Balanço Financeiro de Quotas</span>
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">Arrecadação mensal e totais de 2026</span>
              </div>
            </button>
          )}

          {(userRole === "Administrador" || userRole === "Secretário") && (
            <button
              onClick={() => setActiveReport("INACTIVOS_SUSPENSOS")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                activeReport === "INACTIVOS_SUSPENSOS"
                  ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border-zinc-200 hover:bg-zinc-50"
              }`}
              id="report-select-inactive"
            >
              <AlertOctagon className="w-4 h-4 shrink-0 text-red-600" />
              <div className="leading-tight">
                <span>Militantes Fora de Serviço</span>
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">Membros Inactivos e Suspensos</span>
              </div>
            </button>
          )}

          {(userRole === "Administrador" || userRole === "Tesoureiro" || userRole === "Secretário") && (
            <button
              onClick={() => setActiveReport("MILITANTES_DIVIDA")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                activeReport === "MILITANTES_DIVIDA"
                  ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border-zinc-200 hover:bg-zinc-50"
              }`}
              id="report-select-divida"
            >
              <AlertOctagon className="w-4 h-4 shrink-0 text-amber-600" />
              <div className="leading-tight">
                <span>Militantes com Dívida</span>
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">Militantes em atraso de quota</span>
              </div>
            </button>
          )}

          {(userRole === "Administrador" || userRole === "Tesoureiro" || userRole === "Secretário") && (
            <button
              onClick={() => setActiveReport("PARTILHA_MENSAL")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                activeReport === "PARTILHA_MENSAL"
                  ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border-zinc-200 hover:bg-zinc-50"
              }`}
              id="report-select-partilha"
            >
              <Building className="w-4 h-4 shrink-0 text-emerald-600" />
              <div className="leading-tight">
                <span>Partilha Mensal de Quotas</span>
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">Distribuição mensal homologada</span>
              </div>
            </button>
          )}
        </div>

        {/* Right Side: Printable Paper Sheet Preview */}
        <div className="lg:col-span-3 bg-zinc-100 p-4 md:p-8 rounded-xl border border-zinc-200 shadow-inner overflow-x-auto" id="report-paper-preview">
          
          <div 
            className="bg-white text-zinc-950 p-6 md:p-12 mx-auto rounded shadow-lg border border-zinc-300 max-w-[800px] font-serif leading-relaxed text-xs" 
            id="printable-report-paper"
          >
            {/* 1. Official Letterhead */}
            <div className="border-b-4 border-red-600 pb-4 mb-6 flex items-center relative" id="report-letterhead">
              <div className="absolute left-0">
                <MplaCrestSvg className="w-16 h-20 sm:w-20 sm:h-24 shrink-0" />
              </div>
              <div className="w-full text-center py-2 flex flex-col items-center justify-center">
                <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-zinc-950 font-sans leading-none m-0">MPLA</h1>
                <h2 className="text-xs sm:text-sm font-black text-zinc-900 uppercase mt-2.5 tracking-wide font-sans leading-none">COMITE DE ACCAO DO PARTIDO - 190</h2>
                <h3 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase mt-1.5 font-sans leading-none">Ingombota - Luanda * Angola</h3>
              </div>
            </div>

            {/* 2. Report Title & Date */}
            <div className="text-left mb-6 font-sans" id="report-title-section">
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-zinc-950 font-sans leading-snug">
                {activeReport === "LISTA_GERAL" && "RELATORIO DE LISTAGEM GERAL DE MILITANTES"}
                {activeReport === "BALANCO_FINANCEIRO" && "BALANCO FINANCEIRO DE ARRECADACAO DE QUOTAS - 2026"}
                {activeReport === "INACTIVOS_SUSPENSOS" && "RELATORIO DE MOBILIZACAO: MEMBROS INACTIVOS E SUSPENSOS"}
                {activeReport === "MILITANTES_DIVIDA" && "RELATORIO DE INCOMPATIBILIDADE E DIVIDAS DE QUOTAS"}
                {activeReport === "PARTILHA_MENSAL" && "RELATORIO MENSAL DE DISTRIBUICAO E PARTILHA DE QUOTAS"}
              </h2>
              <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase tracking-wider block mt-1">
                Documento de Controle Interno * Emitido em {formattedToday}
              </span>

              {/* Active filters display (All uppercase red layout matching user screenshot) */}
              <div className="mt-3 text-[10px] font-black text-red-600 font-sans tracking-wide uppercase">
                FILTROS APLICADOS: {
                  [
                    bairroFilter !== "Todos" ? `BAIRRO: ${bairroFilter.toUpperCase()}` : null,
                    generoFilter !== "Todos" ? `GENERO: ${generoFilter.toUpperCase()}` : null,
                    anoAdmissaoFilter !== "Todos" ? `ADMISSAO: ${anoAdmissaoFilter.toUpperCase()}` : null,
                    mesFilter !== "Todos" ? `MES: ${MONTHS_FULL[parseInt(mesFilter, 10) - 1].toUpperCase()}` : null
                  ].filter(Boolean).join(" | ") || "NENHUM FILTRO APLICADO"
                }
              </div>
            </div>

            {/* 3. Report Content Conditional Rendering */}
            <div className="space-y-4 font-sans text-xs text-zinc-800" id="report-dynamic-table">
              
              {/* REPORT A: General Listing */}
              {activeReport === "LISTA_GERAL" && (
                <div className="space-y-4">
                  <p className="text-zinc-600 italic">
                    Este relatório lista todos os cidadãos inscritos no Comité de Acção do Partido nº 190, Ingombota, totalizando {reportGeneralList.length} militantes cadastrados.
                  </p>
                  
                  <table className="w-full text-left border-collapse text-[10px] font-sans">
                    <thead>
                      <tr className="bg-zinc-100/85 font-bold border-b border-zinc-300 text-zinc-700 uppercase tracking-wide text-[9px]">
                        <th className="py-2 px-3 w-24">Nº Cartão</th>
                        <th className="py-2 px-3">Nome Completo</th>
                        <th className="py-2 px-3 w-20">Gênero</th>
                        <th className="py-2 px-3 w-28">Bairro</th>
                        <th className="py-2 px-3 w-28">Admissão</th>
                        <th className="py-2 px-3 w-20">Estado</th>
                        <th className="py-2 px-3 w-28">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-800 text-[10px]">
                      {reportGeneralList.map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-50/50">
                          <td className="py-2 px-3 font-mono font-bold">{m.numeroCartao}</td>
                          <td className="py-2 px-3 font-bold">{m.nome}</td>
                          <td className="py-2 px-3">{m.genero || "-"}</td>
                          <td className="py-2 px-3">{m.bairro || "-"}</td>
                          <td className="py-2 px-3 font-mono">
                            {m.dataAdmissao ? m.dataAdmissao.split("-").reverse().join("/") : "-"}
                          </td>
                          <td className="py-2 px-3 font-bold">
                            {m.estado}
                          </td>
                          <td className="py-2 px-3 font-mono">{m.telefone}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-zinc-300 font-bold bg-zinc-50/50">
                      <tr className="text-zinc-900 text-[10px] uppercase">
                        <td className="py-2.5 px-3 font-extrabold" colSpan={3}>
                          TOTAL FILTRADO: {reportTotals.totalMilitants} Militantes
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600" colSpan={2}>
                          Activos: {reportTotals.totalActivos} • Inac: {reportTotals.totalInactivos} • Susp: {reportTotals.totalSuspensos}
                        </td>
                        <td className="py-2.5 px-3 text-red-600 text-right font-black" colSpan={2}>
                          Devedores: {reportTotals.totalDevedores} ({formatAKZ(reportTotals.valorTotalDivida)})
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Consolidated Summary Panel */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 mt-4" id="general-consolidated-panel">
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest block">Resumo Consolidado (Filtros Ativos)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px]">
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">Total Militantes</span>
                        <span className="text-sm font-black text-zinc-900">{reportTotals.totalMilitants}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-green-600 block">Activos</span>
                        <span className="text-sm font-black text-green-700">{reportTotals.totalActivos}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">Fora de Serviço</span>
                        <span className="text-sm font-black text-zinc-800">{reportTotals.totalInactivos + reportTotals.totalSuspensos}</span>
                        <span className="text-[8px] text-zinc-400 block font-bold">({reportTotals.totalInactivos} Inac. / {reportTotals.totalSuspensos} Susp.)</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-red-600 block">Militantes Devedores</span>
                        <span className="text-sm font-black text-red-700">{reportTotals.totalDevedores}</span>
                        <span className="text-[8px] text-zinc-500 block font-bold">Dívida: {formatAKZ(reportTotals.valorTotalDivida)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT B: Financial Balance */}
              {activeReport === "BALANCO_FINANCEIRO" && (
                <div className="space-y-4">
                  <p className="text-zinc-600 italic">
                    Este balanço representa a arrecadação acumulada de quotas em Kwanzas angolanos (AKZ) efetuadas pelos militantes ao longo dos meses correspondentes do exercício de 2026.
                  </p>

                  <table className="w-full text-left border-collapse text-[11px] font-sans">
                    <thead>
                      <tr className="bg-zinc-100/85 font-bold border-b border-zinc-300 text-zinc-700 text-[10px] uppercase tracking-wide">
                        <th className="py-2.5 px-4">Mês de Referência</th>
                        <th className="py-2.5 px-4 text-center">Contribuições Registadas</th>
                        <th className="py-2.5 px-4 text-right">Total Arrecadado (AKZ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-800">
                      {(mesFilter === "Todos" 
                        ? reportFinanceBalanco.months 
                        : reportFinanceBalanco.months.filter(m => m.mesNum === parseInt(mesFilter, 10))
                      ).map((m, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 text-zinc-800 font-medium">
                          <td className="py-2.5 px-4">{m.mesNome}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-semibold text-zinc-700">{m.quantidade}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-extrabold text-zinc-950">{formatAKZ(m.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-zinc-50/80 text-zinc-900 border-t border-zinc-400 font-extrabold">
                        <td className="py-3 px-4 uppercase">TOTAL CONSOLIDADO DE ARRECADAÇÃO</td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-700">{reportFinanceBalanco.totalCount} pagamentos</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-red-700">{formatAKZ(reportFinanceBalanco.totalValue)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Detailed list of individual payments */}
                  <div className="mt-6 space-y-2 border-t border-zinc-200 pt-4">
                    <h5 className="text-[10px] font-extrabold text-zinc-800 uppercase tracking-widest flex items-center justify-between">
                      <span>Relação Detalhada de Contribuições {mesFilter !== "Todos" ? `(${MONTHS_FULL[parseInt(mesFilter, 10) - 1]})` : "(Ano Inteiro)"}</span>
                      <span className="text-[9px] font-mono font-bold font-sans text-zinc-500">
                        {filteredPaymentsForReports.length} pagamentos registados
                      </span>
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[10px] font-sans">
                        <thead>
                          <tr className="bg-zinc-50/80 font-bold border-b border-zinc-200 text-zinc-600 text-[9px] uppercase tracking-wide">
                            <th className="py-2 px-3">Militante</th>
                            <th className="py-2 px-3 font-sans">Mês Ref.</th>
                            <th className="py-2 px-3 text-right font-sans">Valor Pago (AKZ)</th>
                            <th className="py-2 px-3 font-sans">Data de Pagamento</th>
                            <th className="py-2 px-3 font-sans">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                          {filteredPaymentsForReports.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-zinc-400 font-bold">
                                Nenhuma contribuição encontrada para os filtros selecionados.
                              </td>
                            </tr>
                          ) : (
                            filteredPaymentsForReports.map((p) => (
                              <tr key={p.id} className="hover:bg-zinc-50/50">
                                <td className="py-2 px-3 font-bold">{p.militanteNome}</td>
                                <td className="py-2 px-3">{MONTHS_FULL[p.mes - 1]}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold">{formatAKZ(p.valor)}</td>
                                <td className="py-2 px-3 font-mono">
                                  {p.dataPagamento ? p.dataPagamento.split("-").reverse().join("/") : "-"}
                                </td>
                                <td className="py-2 px-3 font-bold">
                                  {p.pago ? "Pago" : "Pendente"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT C: Non-Active List */}
              {activeReport === "INACTIVOS_SUSPENSOS" && (
                <div className="space-y-4">
                  <p className="text-zinc-600 italic">
                    Relação nominal de militantes registados com estatuto de <span className="text-red-600 font-black">Inactivo</span> ou <span className="text-amber-500 font-black">Suspenso</span>, visando o planeamento de brigadas físicas de recondução e engajamento.
                  </p>

                  <table className="w-full text-left border-collapse text-[10px] font-sans">
                    <thead>
                      <tr className="bg-zinc-100/85 font-bold border-b border-zinc-300 text-zinc-700 text-[9px] uppercase tracking-wide">
                        <th className="py-2 px-3 w-24">Nº Cartão</th>
                        <th className="py-2 px-3">Nome Completo</th>
                        <th className="py-2 px-3 w-20">Gênero</th>
                        <th className="py-2 px-3 w-28">Bairro</th>
                        <th className="py-2 px-3 w-28">Admissão</th>
                        <th className="py-2 px-3 w-20">Estado</th>
                        <th className="py-2 px-3 w-28">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-800 text-[10px]">
                      {reportNonActiveList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center font-bold text-zinc-400">
                            Excelente! 100% de adimplência e actividade no comité.
                          </td>
                        </tr>
                      ) : (
                        reportNonActiveList.map((m) => (
                          <tr key={m.id} className="hover:bg-zinc-50/50">
                            <td className="py-2 px-3 font-mono font-bold">{m.numeroCartao}</td>
                            <td className="py-2 px-3 font-bold">{m.nome}</td>
                            <td className="py-2 px-3">{m.genero || "-"}</td>
                            <td className="py-2 px-3">{m.bairro || "-"}</td>
                            <td className="py-2 px-3 font-mono">
                              {m.dataAdmissao ? m.dataAdmissao.split("-").reverse().join("/") : "-"}
                            </td>
                            <td className="py-2 px-3 font-bold">
                              {m.estado}
                            </td>
                            <td className="py-2 px-3 font-mono">{m.telefone}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {reportNonActiveList.length > 0 && (
                      <tfoot className="border-t border-zinc-300 font-bold bg-zinc-50/50">
                        <tr className="text-zinc-900 text-[10px] uppercase">
                          <td className="py-2.5 px-3 font-extrabold" colSpan={3}>
                            TOTAL DE INACTIVOS E SUSPENSOS: {reportNonActiveList.length} Militantes
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 font-medium" colSpan={2}>
                            Inactivos: {reportTotals.totalInactivos} • Suspensos: {reportTotals.totalSuspensos}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black" colSpan={2}>
                            Total: {reportNonActiveList.length}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {/* Consolidated Summary Panel */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 mt-4" id="nonactive-consolidated-panel">
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest block">Resumo Consolidado de Militantes Fora de Serviço</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px]">
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">Total Fora de Serviço (Filtrado)</span>
                        <span className="text-sm font-black text-zinc-900">{reportNonActiveList.length}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-red-600 block">Total Inactivos</span>
                        <span className="text-sm font-black text-red-700">{reportTotals.totalInactivos}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-amber-600 block">Total Suspensos</span>
                        <span className="text-sm font-black text-amber-700">{reportTotals.totalSuspensos}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT D: Militantes com Divida */}
              {activeReport === "MILITANTES_DIVIDA" && (
                <div className="space-y-4">
                  <p className="text-zinc-600 italic">
                    Relação nominal de militantes registados com quotas/contribuições em <span className="text-red-600 font-black">Atraso</span> para o mês ou ano selecionado, totalizando {reportDividaList.length} devedores.
                  </p>

                  <table className="w-full text-left border-collapse text-[10px] font-sans">
                    <thead>
                      <tr className="bg-zinc-100/85 font-bold border-b border-zinc-300 text-zinc-700 text-[9px] uppercase tracking-wide">
                        <th className="py-2 px-3 w-24">Nº Cartão</th>
                        <th className="py-2 px-3">Nome Completo</th>
                        <th className="py-2 px-3 w-20">Gênero</th>
                        <th className="py-2 px-3 w-28">Bairro</th>
                        <th className="py-2 px-3 w-36">Meses Devidos</th>
                        <th className="py-2 px-3 w-28 text-right">Dívida Total</th>
                        <th className="py-2 px-3 w-20">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-800 text-[10px]">
                      {reportDividaList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center font-bold text-zinc-400">
                            Excelente! 100% de adimplência financeira no período selecionado.
                          </td>
                        </tr>
                      ) : (
                        reportDividaList.map((m) => {
                          const devInfo = devedoresMap.get(m.id);
                          return (
                            <tr key={m.id} className="hover:bg-zinc-50/50">
                              <td className="py-2 px-3 font-mono font-bold">{m.numeroCartao}</td>
                              <td className="py-2 px-3 font-bold">{m.nome}</td>
                              <td className="py-2 px-3">{m.genero || "-"}</td>
                              <td className="py-2 px-3">{m.bairro || "-"}</td>
                              <td className="py-2 px-3">
                                <span className="text-[9px] font-bold">
                                  {devInfo ? devInfo.mesesDevidos.map(mNum => MONTHS_FULL[mNum - 1].substring(0, 3)).join(", ") : "-"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {devInfo ? formatAKZ(devInfo.totalDivida) : "0 AKZ"}
                              </td>
                              <td className="py-2 px-3 font-bold">
                                {m.estado}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {reportDividaList.length > 0 && (
                      <tfoot className="border-t border-zinc-300 font-bold bg-zinc-50/50">
                        <tr className="text-zinc-900 text-[10px] uppercase">
                          <td className="py-2.5 px-3 font-extrabold" colSpan={3}>
                            TOTAL FILTRADO DE DEVEDORES: {reportDividaList.length} Militantes
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 font-medium" colSpan={2}>
                            Total consolidado em atraso
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-red-700" colSpan={2}>
                            {formatAKZ(reportTotals.valorTotalDivida)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {activeReport === "PARTILHA_MENSAL" && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="no-print">
                    {partilhaData.isHomologated ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h5 className="font-extrabold uppercase text-xs flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            ✓ Relatório Submetido e Aprovado
                          </h5>
                          <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                            Este relatório foi submetido pelo Tesoureiro e aprovado pelo Coordenador Geral, estando em plena conformidade.
                          </p>
                        </div>
                        {partilhaData.isSubmetido ? (
                          <div className="px-3.5 py-2 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded border border-emerald-300 uppercase tracking-wide shrink-0">
                            ✓ Arquivado no Distrito
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSubmeterReport(partilhaData.approvalKey)}
                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-black rounded shadow-sm hover:shadow transition-all uppercase tracking-wider shrink-0 cursor-pointer"
                          >
                            Submeter ao Distrito
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
                        <h5 className="font-extrabold uppercase text-xs flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                          • Aguardando Submissão e Aprovação Geral
                        </h5>
                        <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                          Este relatório é provisório (Rascunho) pois necessita de submissão pelo Tesoureiro e aprovação pelo Coordenador. Para registar as assinaturas, por favor aceda ao menu <strong>Quotas</strong>, clique em <strong>Distribuição Mensal</strong>, e realize a submissão e aprovação do relatório.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Memorandum Meta Info Box */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2 text-xs font-sans text-zinc-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">MEMORANDO INTERNO / ADENDA REGULAMENTAR</span>
                        <span className="text-zinc-900 font-black block mt-0.5">REF: ADENDA-CAP190-PARTILHA-{partilhaData.monthNum}-{partilhaData.yearNum}</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">DATA DE EMISSÃO</span>
                        <span className="text-zinc-900 font-black block mt-0.5 font-mono">{formattedToday}</span>
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
                        <strong className="text-zinc-500 uppercase font-black font-sans">ASSUNTO:</strong> <span className="text-zinc-900 font-black uppercase">Partilha de Quotas Consolidadas - {MONTHS_FULL[partilhaData.monthNum - 1]} de {partilhaData.yearNum}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-zinc-600 text-xs leading-relaxed font-sans font-medium">
                    Em conformidade com as regras estatutárias e o regulamento sobre a autonomia financeira dos órgãos locais, serve o presente instrumento (Adenda) para formalizar a distribuição automática dos fundos arrecadados a título de quotas de militantes, conforme os coeficientes estatutários estabelecidos, resultando no montante total de partilha abaixo discriminado:
                  </p>

                  {/* Summary block (Only showing the distributed value as requested) */}
                  <div className="bg-emerald-50/30 border border-emerald-200 rounded-xl p-4 text-center max-w-sm mx-auto">
                    <span className="text-[9px] font-extrabold text-emerald-800 block uppercase tracking-wider">Total Partilhado (Distribuído)</span>
                    <strong className="text-lg font-black text-emerald-700 block mt-1">{formatAKZ(partilhaData.totalDistribuido)}</strong>
                    <span className="text-[8px] text-emerald-600 font-bold block mt-0.5 uppercase">Soma das Cotas Estatutárias ({partilhaData.totalPercent}%)</span>
                  </div>

                  {/* Processo de Homologação Campo Visual (Visual Tracker) */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 font-sans no-print">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-800 uppercase tracking-wider block">
                        Fluxo de Tramitação e Homologação Administrativa
                      </span>
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                        partilhaData.isHomologated 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                      }`}>
                        {partilhaData.isHomologated ? "Homologado e Ativo" : "Pendente de Assinaturas"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center text-[9px]">
                      {/* Step 1 */}
                      <div className={`p-3.5 rounded-lg border flex flex-col justify-between h-20 ${
                        partilhaData.appState.elaborado?.assinado 
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" 
                          : "bg-zinc-100 border-zinc-200 text-zinc-400"
                      }`}>
                        <span className="font-extrabold uppercase text-[8px]">1. Elaboração</span>
                        {partilhaData.appState.elaborado?.assinado ? (
                          <div className="my-1">
                            <span className="font-serif italic font-black text-[10px] block leading-none text-red-700">{partilhaData.appState.elaborado.nome}</span>
                            <span className="text-[7px] text-zinc-400 font-mono block mt-1">{partilhaData.appState.elaborado.data.split("-").reverse().join("/")}</span>
                          </div>
                        ) : (
                          <span className="italic block my-2 font-bold text-zinc-400">Pendente</span>
                        )}
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase border-t border-zinc-200/50 pt-1">Tesoureiro CAP-190</span>
                      </div>

                      {/* Step 2 */}
                      <div className={`p-3.5 rounded-lg border flex flex-col justify-between h-20 ${
                        partilhaData.appState.autorizado?.assinado 
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" 
                          : "bg-zinc-100 border-zinc-200 text-zinc-400"
                      }`}>
                        <span className="font-extrabold uppercase text-[8px]">2. Homologação &amp; Autorização</span>
                        {partilhaData.appState.autorizado?.assinado ? (
                          <div className="my-1">
                            <span className="font-serif italic font-black text-[10px] block leading-none text-red-700">{partilhaData.appState.autorizado.nome}</span>
                            <span className="text-[7px] text-zinc-400 font-mono block mt-1">{partilhaData.appState.autorizado.data.split("-").reverse().join("/")}</span>
                          </div>
                        ) : (
                          <span className="italic block my-2 font-bold text-zinc-400">Pendente</span>
                        )}
                        <span className="text-[7.5px] font-bold text-zinc-500 uppercase border-t border-zinc-200/50 pt-1">Coordenador do CAP-190</span>
                      </div>
                    </div>
                  </div>

                  {/* Shares Table */}
                  <table className="w-full text-left border-collapse text-[10px] font-sans">
                    <thead>
                      <tr className="bg-zinc-100/80 font-black border-b border-zinc-300 text-zinc-700 uppercase">
                        <th className="py-2.5 px-3">Beneficiário / Quota Destinatária</th>
                        <th className="py-2.5 px-3 w-40 text-center">Alíquota %</th>
                        <th className="py-2.5 px-3 w-44 text-right">Valor Partilhado (AKZ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                      {partilhaData.calculatedShares.map((b) => (
                        <tr key={b.id} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-3 font-extrabold text-zinc-900">{b.nome}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-700">{b.percentagem}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-zinc-950">{formatAKZ(b.valorCalculado)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-zinc-900 font-black bg-zinc-50">
                      <tr className="text-zinc-900 font-bold uppercase">
                        <td className="py-2.5 px-3">Total Consolidado Distribuído</td>
                        <td className="py-2.5 px-3 text-center font-mono font-extrabold">{partilhaData.totalPercent}%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold">{formatAKZ(partilhaData.totalDistribuido)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Mini Authentication Block in Document */}
                  <div className="border-t border-dashed border-zinc-300 pt-6 mt-6 print-break-inside-avoid">
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-wider block text-center mb-4">
                      2. Submissão e Aprovação (Assinaturas Físicas)
                    </span>
                    <div className="grid grid-cols-2 gap-6 text-[9px]">
                      {/* Box 1: Elaborado */}
                      <div className="border border-zinc-200 rounded p-3 text-center flex flex-col justify-between bg-zinc-50/15 min-h-[110px]">
                        <span className="font-extrabold text-zinc-400 block text-[8px] tracking-wider uppercase mb-1">1. Submetido Por</span>
                        
                        <div className="flex-1 flex flex-col items-center justify-center py-2">
                          <div className="w-4/5 border-b border-zinc-300 h-4"></div>
                          <span className="block text-[9.5px] font-extrabold text-zinc-900 mt-1.5 leading-tight">
                            {partilhaData.appState.elaborado?.assinado 
                              ? `( ${partilhaData.appState.elaborado.nome} )` 
                              : "( ___________________________ )"}
                          </span>
                          <span className="text-[7px] text-zinc-500 font-mono mt-0.5 block">
                            {partilhaData.appState.elaborado?.assinado 
                              ? `Registado em: ${partilhaData.appState.elaborado.data.split("-").reverse().join("/")}`
                              : "Data: ____/____/2026   [ Carimbo ]"}
                          </span>
                        </div>
                        
                        <span className="text-[8px] font-extrabold text-zinc-800 border-t border-zinc-100 block pt-1 mt-1">Tesoureiro CAP-190</span>
                      </div>
 
                      {/* Box 2: Autorizado */}
                      <div className="border border-zinc-200 rounded p-3 text-center flex flex-col justify-between bg-zinc-50/15 min-h-[110px]">
                        <span className="font-extrabold text-zinc-400 block text-[8px] tracking-wider uppercase mb-1">2. Aprovado Por</span>
                        
                        <div className="flex-1 flex flex-col items-center justify-center py-2">
                          <div className="w-4/5 border-b border-zinc-300 h-4"></div>
                          <span className="block text-[9.5px] font-extrabold text-zinc-900 mt-1.5 leading-tight">
                            {partilhaData.appState.autorizado?.assinado 
                              ? `( ${partilhaData.appState.autorizado.nome} )` 
                              : "( ___________________________ )"}
                          </span>
                          <span className="text-[7px] text-zinc-500 font-mono mt-0.5 block">
                            {partilhaData.appState.autorizado?.assinado 
                              ? `Registado em: ${partilhaData.appState.autorizado.data.split("-").reverse().join("/")}`
                              : "Data: ____/____/2026   [ Carimbo ]"}
                          </span>
                        </div>
                        
                        <span className="text-[8px] font-extrabold text-zinc-800 border-t border-zinc-100 block pt-1 mt-1">Coordenador do CAP-190</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Consolidated Black Banner */}
            {activeReport !== "PARTILHA_MENSAL" && (
              <div className="bg-zinc-950 text-white p-3.5 rounded-lg font-bold font-sans text-[10px] tracking-wide uppercase flex flex-col sm:flex-row items-center justify-between gap-2 mt-8 mb-6 shadow-sm no-print" id="report-black-banner">
                <span className="font-extrabold text-[#F9D71C]">CONSOLIDADO GERAL</span>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[9px] sm:text-[10px]">
                  <span>Militantes: <strong className="text-white font-black">{reportTotals.totalMilitants}</strong></span>
                  <span className="text-zinc-700">|</span>
                  <span>Activos: <strong className="text-green-400 font-black">{reportTotals.totalActivos}</strong></span>
                  <span className="text-zinc-700">|</span>
                  <span>Inactivos: <strong className="text-red-400 font-black">{reportTotals.totalInactivos}</strong></span>
                  <span className="text-zinc-700">|</span>
                  <span>Suspensos: <strong className="text-amber-400 font-black">{reportTotals.totalSuspensos}</strong></span>
                  <span className="text-zinc-700">|</span>
                  <span>Devedores: <strong className="text-red-500 font-black">{reportTotals.totalDevedores}</strong> ({formatAKZ(reportTotals.valorTotalDivida)})</span>
                </div>
              </div>
            )}

            {/* Print version of Black Banner (Always visible on print) */}
            {activeReport !== "PARTILHA_MENSAL" && (
              <div className="hidden print:flex bg-zinc-950 text-white p-3 font-bold font-sans text-[9px] tracking-wide uppercase items-center justify-between w-full mt-8 mb-6" id="report-black-banner-print">
                <span className="font-extrabold text-[#F9D71C]">CONSOLIDADO GERAL</span>
                <div className="flex items-center justify-end gap-3 text-[9px]">
                  <span>Militantes: {reportTotals.totalMilitants}</span>
                  <span className="text-zinc-800">|</span>
                  <span>Activos: {reportTotals.totalActivos}</span>
                  <span className="text-zinc-800">|</span>
                  <span>Inactivos: {reportTotals.totalInactivos}</span>
                  <span className="text-zinc-800">|</span>
                  <span>Suspensos: {reportTotals.totalSuspensos}</span>
                  <span className="text-zinc-800">|</span>
                  <span>Devedores: {reportTotals.totalDevedores} ({formatAKZ(reportTotals.valorTotalDivida)})</span>
                </div>
              </div>
            )}

            {/* 4. Report Signatures Footer */}
            {activeReport !== "PARTILHA_MENSAL" && (
              <div className="mt-16 pt-8 border-t border-dashed border-zinc-300 grid grid-cols-2 gap-8 text-center text-[10px] font-sans font-bold animate-fade-in" id="report-signatures">
                <div className="space-y-6">
                  <div className="h-0.5 bg-zinc-400 w-44 mx-auto" />
                  <span className="block text-zinc-500 uppercase">Secretaria para Administração</span>
                </div>
                <div className="space-y-6">
                  <div className="h-0.5 bg-zinc-400 w-44 mx-auto" />
                  <span className="block text-zinc-500 uppercase">Coordenador Geral do CAP-190</span>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
