/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  Download,
  ChevronRight,
  Users,
  DollarSign,
  AlertOctagon,
  Calendar,
  Building,
} from "lucide-react";
import { Militante, QuotaPayment, UserRole } from "../types";
import { jsPDF } from "jspdf";
import mplaCrestImage from "../image/MPLA(logo).png";

interface RelatoriosViewProps {
  militants: Militante[];
  payments: QuotaPayment[];
  userRole?: UserRole;
}

type ReportType =
  | "LISTA_GERAL"
  | "BALANCO_FINANCEIRO"
  | "INACTIVOS_SUSPENSOS"
  | "MILITANTES_DIVIDA";

const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const COMITE_PRIMARY_NAME = "COMITE DE ACCAO DO PARTIDO - 190";
const COMITE_SECONDARY_NAME = "Ingombota - Luanda * Angola";

const imageUrlToDataUrl = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export function RelatoriosView({
  militants,
  payments,
  userRole = "Administrador",
}: RelatoriosViewProps) {
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
    const bSet = new Set(militants.map((m) => m.bairro).filter(Boolean));
    return Array.from(bSet).sort();
  }, [militants]);

  // Filtered militants based on selection
  const filteredMilitantsForReports = useMemo(() => {
    return militants.filter((m) => {
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
    const allowedMilitantIds = new Set(
      filteredMilitantsForReports.map((m) => m.id),
    );
    let result = payments.filter((p) => allowedMilitantIds.has(p.militanteId));
    if (mesFilter !== "Todos") {
      result = result.filter((p) => p.mes === parseInt(mesFilter, 10));
    }
    return result;
  }, [payments, filteredMilitantsForReports, mesFilter]);

  // Format currency helper
  const formatAKZ = (val: number) => {
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace("Kz", "AKZ")
      .trim();
  };

  // Get current date string for report footer
  const formattedToday = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("pt-AO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const activeFiltersText = useMemo(() => {
    const filters = [];
    if (bairroFilter !== "Todos") filters.push(`Bairro: ${bairroFilter}`);
    if (generoFilter !== "Todos") filters.push(`Gênero: ${generoFilter}`);
    if (anoAdmissaoFilter !== "Todos")
      filters.push(`Admissão: ${anoAdmissaoFilter}`);
    if (mesFilter !== "Todos")
      filters.push(`Mês: ${MONTHS_FULL[parseInt(mesFilter, 10) - 1]}`);
    return filters.join(" | ");
  }, [bairroFilter, generoFilter, anoAdmissaoFilter, mesFilter]);

  // 1. Report: General Militant List
  const reportGeneralList = useMemo(() => {
    return [...filteredMilitantsForReports].sort((a, b) =>
      a.nome.localeCompare(b.nome),
    );
  }, [filteredMilitantsForReports]);

  // 2. Report: Inactives & Suspended List
  const reportNonActiveList = useMemo(() => {
    return filteredMilitantsForReports
      .filter((m) => m.estado !== "Activo")
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredMilitantsForReports]);

  // 3. Report: Financial Balanco
  const reportFinanceBalanco = useMemo(() => {
    const monthlyData = Array(12)
      .fill(null)
      .map((_, idx) => ({
        mesNum: idx + 1,
        mesNome: MONTHS_FULL[idx],
        quantidade: 0,
        total: 0,
      }));

    filteredPaymentsForReports.forEach((p) => {
      if (p.pago && p.mes >= 1 && p.mes <= 12) {
        monthlyData[p.mes - 1].quantidade++;
        monthlyData[p.mes - 1].total += p.valor;
      }
    });

    const sumQuantidades = monthlyData.reduce(
      (sum, d) => sum + d.quantidade,
      0,
    );
    const sumTotals = monthlyData.reduce((sum, d) => sum + d.total, 0);

    return {
      months: monthlyData,
      totalCount: sumQuantidades,
      totalValue: sumTotals,
    };
  }, [filteredPaymentsForReports]);

  // Compute debtors map (militanteId -> { totalDivida, mesesDevidos })
  const devedoresMap = useMemo(() => {
    const listIds = new Set(filteredMilitantsForReports.map((m) => m.id));
    const relevantPayments = payments.filter((p) => listIds.has(p.militanteId));
    const filteredPayments =
      mesFilter !== "Todos"
        ? relevantPayments.filter((p) => p.mes === parseInt(mesFilter, 10))
        : relevantPayments;

    const map = new Map<
      string,
      { totalDivida: number; mesesDevidos: number[] }
    >();
    filteredPayments.forEach((p) => {
      if (!p.pago) {
        const current = map.get(p.militanteId) || {
          totalDivida: 0,
          mesesDevidos: [],
        };
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
      .filter((m) => devedoresMap.has(m.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredMilitantsForReports, devedoresMap]);

  // Consolidated totals based on applied filters
  const reportTotals = useMemo(() => {
    const list = filteredMilitantsForReports;
    const totalMilitants = list.length;
    const totalActivos = list.filter((m) => m.estado === "Activo").length;
    const totalInactivos = list.filter((m) => m.estado === "Inactivo").length;
    const totalSuspensos = list.filter((m) => m.estado === "Suspenso").length;
    const totalDevedores = reportDividaList.length;
    const valorTotalDivida = reportDividaList.reduce(
      (sum, m) => sum + (devedoresMap.get(m.id)?.totalDivida || 0),
      0,
    );

    return {
      totalMilitants,
      totalActivos,
      totalInactivos,
      totalSuspensos,
      totalDevedores,
      valorTotalDivida,
    };
  }, [filteredMilitantsForReports, reportDividaList, devedoresMap]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const crestDataUrl = await imageUrlToDataUrl(mplaCrestImage);

    // Header Style
    doc.addImage(crestDataUrl, "PNG", 37, 10, 23, 30);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(25);
    doc.setTextColor(0, 0, 0);
    doc.text("MPLA", 105, 23, { align: "center" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text(COMITE_PRIMARY_NAME, 105, 34, { align: "center" });
    doc.text(COMITE_SECONDARY_NAME, 105, 40, { align: "center" });

    // Decorative Red Bar
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(1.5);
    doc.line(14, 46, 196, 46);

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(24, 24, 27);
    let title = "";
    if (activeReport === "LISTA_GERAL")
      title = "RELATORIO DE LISTAGEM GERAL DE MILITANTES";
    else if (activeReport === "BALANCO_FINANCEIRO")
      title = "BALANCO FINANCEIRO DE ARRECADACAO DE QUOTAS - 2026";
    else if (activeReport === "MILITANTES_DIVIDA")
      title = "RELATORIO DE INCOMPATIBILIDADE E DIVIDAS DE QUOTAS";
    else title = "RELATORIO DE MOBILIZACAO: MEMBROS INACTIVOS E SUSPENSOS";
    doc.text(title, 14, 56);

    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(113, 113, 122);
    doc.text(
      `Documento de Controle Interno * Emitido em ${formattedToday}`,
      14,
      63,
    );
    let startY = 68;

    // Print active filters on PDF and adjust startY
    if (
      bairroFilter !== "Todos" ||
      generoFilter !== "Todos" ||
      anoAdmissaoFilter !== "Todos" ||
      mesFilter !== "Todos"
    ) {
      let filterText = "Filtros aplicados: ";
      if (bairroFilter !== "Todos")
        filterText += `Bairro: ${bairroFilter}  |  `;
      if (generoFilter !== "Todos")
        filterText += `Gênero: ${generoFilter}  |  `;
      if (anoAdmissaoFilter !== "Todos")
        filterText += `Admissão: ${anoAdmissaoFilter}  |  `;
      if (mesFilter !== "Todos")
        filterText += `Mês: ${MONTHS_FULL[parseInt(mesFilter, 10) - 1]}  |  `;
      if (filterText.endsWith("  |  "))
        filterText = filterText.substring(0, filterText.length - 5);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28); // red-700

      const filterLines = doc.splitTextToSize(filterText.toUpperCase(), 182);
      doc.text(filterLines, 14, startY);
      startY += filterLines.length * 4 + 4;
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
        if (bairroText.length > 12)
          bairroText = bairroText.substring(0, 12) + "...";
        doc.text(bairroText, 112, startY + 6);

        const formattedDate = m.dataAdmissao
          ? m.dataAdmissao.split("-").reverse().join("/")
          : "-";
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
      doc.text(
        `Militantes: ${reportTotals.totalMilitants}  |  Activos: ${reportTotals.totalActivos}  |  Inactivos: ${reportTotals.totalInactivos}  |  Suspensos: ${reportTotals.totalSuspensos}  |  Devedores: ${reportTotals.totalDevedores} (${formatAKZ(reportTotals.valorTotalDivida)})`,
        55,
        startY + 7,
      );
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
      const monthsToRender =
        mesFilter === "Todos"
          ? reportFinanceBalanco.months
          : reportFinanceBalanco.months.filter(
              (m) => m.mesNum === parseInt(mesFilter, 10),
            );

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
        doc.text(
          "Nenhuma contribuicao registada para os filtros selecionados.",
          16,
          startY + 6,
        );
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
          if (nameText.length > 35)
            nameText = nameText.substring(0, 35) + "...";
          doc.text(nameText, 16, startY + 6);
          doc.text(MONTHS_FULL[p.mes - 1], 85, startY + 6);
          doc.text(formatAKZ(p.valor), 115, startY + 6);
          const formattedDate = p.dataPagamento
            ? p.dataPagamento.split("-").reverse().join("/")
            : "-";
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
        if (bairroText.length > 12)
          bairroText = bairroText.substring(0, 12) + "...";
        doc.text(bairroText, 112, startY + 6);

        const devInfo = devedoresMap.get(m.id);
        const mesesText = devInfo
          ? devInfo.mesesDevidos
              .map((num) => MONTHS_FULL[num - 1].substring(0, 3))
              .join(", ")
          : "-";
        let truncatedMeses = mesesText;
        if (truncatedMeses.length > 18)
          truncatedMeses = truncatedMeses.substring(0, 15) + "...";
        doc.text(truncatedMeses, 135, startY + 6);

        const valorDividaText = devInfo
          ? formatAKZ(devInfo.totalDivida)
          : "0 AKZ";
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
      doc.text(
        `Total Devedores: ${reportTotals.totalDevedores}  |  Divida Consolidada: ${formatAKZ(reportTotals.valorTotalDivida)}`,
        100,
        startY + 7,
      );
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
        if (bairroText.length > 12)
          bairroText = bairroText.substring(0, 12) + "...";
        doc.text(bairroText, 112, startY + 6);

        const formattedDate = m.dataAdmissao
          ? m.dataAdmissao.split("-").reverse().join("/")
          : "-";
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
      doc.text(
        `Total Fora de Servico: ${reportNonActiveList.length}  |  Inactivos: ${reportTotals.totalInactivos}  |  Suspensos: ${reportTotals.totalSuspensos}`,
        75,
        startY + 7,
      );
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
    doc.text("TESOUREIRO(A)", 21, startY + 5);
    doc.text("1.º SECRETÁRIO DO CAP-190", 121, startY + 5);
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
        }
      `}</style>

      {/* 1. View Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4"
        id="relatorios-header"
      >
        <div>
          <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
            Centro de Emissão de Relatórios
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Selecione um relatório pré-formatado, visualize-o na folha oficial e
            envie para a impressora ou PDF.
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
      <div
        className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm space-y-3 animate-fade-in"
        id="reports-filter-bar"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
          <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">
            Filtros Activos no Relatório
          </span>
          <span className="text-[10px] text-zinc-400 font-bold font-sans">
            (Aplica-se a todos os relatórios abaixo)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Bairro Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              Sector / Bairro
            </label>
            <select
              value={bairroFilter}
              onChange={(e) => setBairroFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="report-bairro-filter-select"
            >
              <option value="Todos">Todos os Bairros</option>
              {uniqueBairros.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Genero Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              Gênero
            </label>
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
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              Ano de Admissão
            </label>
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
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              Mês de Referência
            </label>
            <select
              value={mesFilter}
              onChange={(e) => setMesFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 bg-zinc-50 cursor-pointer"
              id="report-mes-filter-select"
            >
              <option value="Todos">Todos os Meses</option>
              {MONTHS_FULL.map((m, idx) => (
                <option key={idx} value={String(idx + 1)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Layout of Report Selector & Document Paper Preview */}
      <div
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        id="relatorios-layout-grid"
      >
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
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">
                  Todos os membros cadastrados
                </span>
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
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">
                  Arrecadação mensal e totais de 2026
                </span>
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
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">
                  Membros Inactivos e Suspensos
                </span>
              </div>
            </button>
          )}

          {(userRole === "Administrador" ||
            userRole === "Tesoureiro" ||
            userRole === "Secretário") && (
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
                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">
                  Militantes em atraso de quota
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Right Side: Printable Paper Sheet Preview */}
        <div
          className="lg:col-span-3 bg-zinc-100 p-4 md:p-8 rounded-xl border border-zinc-200 shadow-inner overflow-x-auto"
          id="report-paper-preview"
        >
          <div
            className="bg-white text-zinc-950 p-6 md:p-12 mx-auto rounded shadow-lg border border-zinc-300 max-w-[800px] font-serif leading-relaxed text-xs"
            id="printable-report-paper"
          >
            {/* 1. Official Letterhead */}
            <div
              className="border-b-2 border-red-600 pb-4 mb-6 grid grid-cols-[72px_1fr_72px] items-center gap-4"
              id="report-letterhead"
            >
              <img
                src={mplaCrestImage}
                alt="Logotipo do MPLA"
                className="w-14 h-20 object-contain justify-self-center"
                id="report-logo-img"
              />
              <div className="text-center font-serif text-zinc-950 leading-tight">
                <span className="text-4xl font-black uppercase tracking-normal block font-sans">
                  MPLA
                </span>
                <span className="text-sm font-black uppercase block mt-2">
                  {COMITE_PRIMARY_NAME}
                </span>
                <span className="text-sm font-black uppercase block">
                  {COMITE_SECONDARY_NAME}
                </span>
              </div>
              <div aria-hidden="true" />
            </div>
            <div className="hidden" id="legacy-report-letterhead">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-red-600 block font-sans">
                  MPLA
                </span>
                <span className="text-sm font-black uppercase text-zinc-900 block font-sans">
                  COMITÉ DE ACÇÃO DO PARTIDO - 190
                </span>
                <span className="text-[10px] text-zinc-500 font-sans font-bold block">
                  Ingombota - Luanda • Angola
                </span>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className="flex flex-col items-end mr-1 text-[9px] font-sans font-bold text-zinc-400 leading-none">
                  <span>COMITÉ DE ACÇÃO</span>
                  <span className="text-red-600 font-extrabold text-[10px]">
                    CAP-190
                  </span>
                </div>
                <svg
                  className="w-12 h-12 shadow-sm rounded-md border border-zinc-200"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  id="report-logo-svg"
                >
                  {/* Top half: Red */}
                  <rect x="0" y="0" width="100" height="50" fill="#b91c1c" />
                  {/* Bottom half: Black */}
                  <rect x="0" y="50" width="100" height="50" fill="#18181b" />
                  {/* Gold star in the center */}
                  <polygon
                    points="50,25 54,37 67,37 56,45 60,58 50,50 40,58 44,45 33,37 46,37"
                    fill="#eab308"
                  />
                </svg>
              </div>
            </div>

            {/* 2. Report Title & Date */}
            <div className="text-center mb-8" id="report-title-section">
              <h2 className="text-base font-black tracking-wide uppercase text-zinc-950 font-sans">
                {activeReport === "LISTA_GERAL" &&
                  "RELATÓRIO DE LISTAGEM GERAL DE MILITANTES"}
                {activeReport === "BALANCO_FINANCEIRO" &&
                  "BALANÇO FINANCEIRO DE ARRECADAÇÃO DE QUOTAS - 2026"}
                {activeReport === "INACTIVOS_SUSPENSOS" &&
                  "RELATÓRIO DE MOBILIZAÇÃO: MEMBROS INACTIVOS E SUSPENSOS"}
                {activeReport === "MILITANTES_DIVIDA" &&
                  "RELATÓRIO DE INCOMPATIBILIDADE E DÍVIDAS DE QUOTAS"}
              </h2>
              <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase tracking-wider block mt-1">
                Documento de Controle Interno • Emitido em {formattedToday}
              </span>

              {/* Active filters display */}
              {activeFiltersText && (
                <div className="mt-2 mx-auto max-w-[640px] border-y border-zinc-200 py-1 text-[9px] font-bold text-zinc-500 font-sans uppercase tracking-wide leading-snug break-words">
                  <span className="uppercase text-red-600">
                    Filtros Activos:
                  </span>
                  {bairroFilter !== "Todos" && (
                    <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      Bairro: {bairroFilter}
                    </span>
                  )}
                  {generoFilter !== "Todos" && (
                    <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      Gênero: {generoFilter}
                    </span>
                  )}
                  {anoAdmissaoFilter !== "Todos" && (
                    <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      Admissão: {anoAdmissaoFilter}
                    </span>
                  )}
                  {mesFilter !== "Todos" && (
                    <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      Mês: {MONTHS_FULL[parseInt(mesFilter, 10) - 1]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 3. Report Content Conditional Rendering */}
            <div
              className="space-y-4 font-sans text-xs text-zinc-800"
              id="report-dynamic-table"
            >
              {/* REPORT A: General Listing */}
              {activeReport === "LISTA_GERAL" && (
                <div className="space-y-4">
                  <p className="text-zinc-600 italic">
                    Este relatório lista todos os cidadãos inscritos no Comité
                    de Acção do Partido nº 190, Ingombota, totalizando{" "}
                    {reportGeneralList.length} militantes cadastrados.
                  </p>

                  <table className="w-full text-left border-collapse border border-zinc-200 text-[10px]">
                    <thead>
                      <tr className="bg-zinc-50 font-black border-b border-zinc-300 text-zinc-700">
                        <th className="py-2 px-3 w-24 border-r border-zinc-200">
                          Nº Cartão
                        </th>
                        <th className="py-2 px-3 border-r border-zinc-200">
                          Nome Completo
                        </th>
                        <th className="py-2 px-3 w-20 border-r border-zinc-200">
                          Gênero
                        </th>
                        <th className="py-2 px-3 w-32 border-r border-zinc-200">
                          Bairro
                        </th>
                        <th className="py-2 px-3 w-28 border-r border-zinc-200">
                          Admissão
                        </th>
                        <th className="py-2 px-3 w-24 border-r border-zinc-200">
                          Estado
                        </th>
                        <th className="py-2 px-3 w-28">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                      {reportGeneralList.map((m) => (
                        <tr key={m.id}>
                          <td className="py-2 px-3 font-mono border-r border-zinc-200">
                            {m.numeroCartao}
                          </td>
                          <td className="py-2 px-3 font-bold border-r border-zinc-200">
                            {m.nome}
                          </td>
                          <td className="py-2 px-3 border-r border-zinc-200">
                            {m.genero || "-"}
                          </td>
                          <td className="py-2 px-3 border-r border-zinc-200">
                            {m.bairro || "-"}
                          </td>
                          <td className="py-2 px-3 font-mono border-r border-zinc-200">
                            {m.dataAdmissao
                              ? m.dataAdmissao.split("-").reverse().join("/")
                              : "-"}
                          </td>
                          <td className="py-2 px-3 border-r border-zinc-200 font-bold text-[9px]">
                            <span
                              className={
                                m.estado === "Activo"
                                  ? "text-green-600"
                                  : m.estado === "Inactivo"
                                    ? "text-red-600"
                                    : "text-amber-500"
                              }
                            >
                              {m.estado}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">{m.telefone}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-zinc-950 font-black bg-zinc-50">
                      <tr className="text-zinc-900 font-bold">
                        <td
                          className="py-2 px-3 border-r border-zinc-200"
                          colSpan={2}
                        >
                          TOTAL FILTRADO: {reportTotals.totalMilitants}{" "}
                          Militantes
                        </td>
                        <td
                          className="py-2 px-3 border-r border-zinc-200"
                          colSpan={3}
                        >
                          Activos: {reportTotals.totalActivos} • Inactivos:{" "}
                          {reportTotals.totalInactivos} • Suspensos:{" "}
                          {reportTotals.totalSuspensos}
                        </td>
                        <td className="py-2 px-3 text-red-600" colSpan={2}>
                          Devedores: {reportTotals.totalDevedores} (
                          {formatAKZ(reportTotals.valorTotalDivida)})
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Consolidated Summary Panel */}
                  <div
                    className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 mt-4"
                    id="general-consolidated-panel"
                  >
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest block">
                      Resumo Consolidado (Filtros Ativos)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px]">
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">
                          Total Militantes
                        </span>
                        <span className="text-sm font-black text-zinc-900">
                          {reportTotals.totalMilitants}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-green-600 block">Activos</span>
                        <span className="text-sm font-black text-green-700">
                          {reportTotals.totalActivos}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">
                          Fora de Serviço
                        </span>
                        <span className="text-sm font-black text-zinc-800">
                          {reportTotals.totalInactivos +
                            reportTotals.totalSuspensos}
                        </span>
                        <span className="text-[8px] text-zinc-400 block font-bold">
                          ({reportTotals.totalInactivos} Inac. /{" "}
                          {reportTotals.totalSuspensos} Susp.)
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-red-600 block">
                          Militantes Devedores
                        </span>
                        <span className="text-sm font-black text-red-700">
                          {reportTotals.totalDevedores}
                        </span>
                        <span className="text-[8px] text-zinc-500 block font-bold">
                          Dívida: {formatAKZ(reportTotals.valorTotalDivida)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT B: Financial Balance */}
              {activeReport === "BALANCO_FINANCEIRO" && (
                <div className="space-y-4">
                  <p className="text-zinc-600 italic">
                    Este balanço representa a arrecadação acumulada de quotas em
                    Kwanzas angolanos (AKZ) efetuadas pelos militantes ao longo
                    dos meses correspondentes do exercício de 2026.
                  </p>

                  <table className="w-full text-left border-collapse border border-zinc-200 text-[11px]">
                    <thead>
                      <tr className="bg-zinc-50 font-black border-b border-zinc-300 text-zinc-700">
                        <th className="py-2.5 px-4 border-r border-zinc-200">
                          Mês de Referência
                        </th>
                        <th className="py-2.5 px-4 text-center border-r border-zinc-200">
                          Contribuições Registadas
                        </th>
                        <th className="py-2.5 px-4 text-right">
                          Total Arrecadado (AKZ)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-bold text-zinc-700">
                      {(mesFilter === "Todos"
                        ? reportFinanceBalanco.months
                        : reportFinanceBalanco.months.filter(
                            (m) => m.mesNum === parseInt(mesFilter, 10),
                          )
                      ).map((m, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-4 border-r border-zinc-200">
                            {m.mesNome}
                          </td>
                          <td className="py-2 px-4 text-center border-r border-zinc-200 font-mono font-bold">
                            {m.quantidade}
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-emerald-600 font-black">
                            {formatAKZ(m.total)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-zinc-950 text-white font-black">
                        <td className="py-3 px-4 border-r border-zinc-800">
                          TOTAL CONSOLIDADO
                        </td>
                        <td className="py-3 px-4 text-center border-r border-zinc-800 font-mono">
                          {reportFinanceBalanco.totalCount} pagamentos
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatAKZ(reportFinanceBalanco.totalValue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Detailed list of individual payments */}
                  <div className="mt-6 space-y-2 border-t border-zinc-200 pt-4">
                    <h5 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest flex items-center justify-between">
                      <span>
                        Relação Detalhada de Contribuições{" "}
                        {mesFilter !== "Todos"
                          ? `(${MONTHS_FULL[parseInt(mesFilter, 10) - 1]})`
                          : "(Ano Inteiro)"}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold font-sans">
                        {filteredPaymentsForReports.length} pagamentos
                        registados
                      </span>
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-zinc-200 text-[10px]">
                        <thead>
                          <tr className="bg-zinc-50 font-black border-b border-zinc-300 text-zinc-700">
                            <th className="py-2 px-3 border-r border-zinc-200">
                              Militante
                            </th>
                            <th className="py-2 px-3 border-r border-zinc-200">
                              Mês Ref.
                            </th>
                            <th className="py-2 px-3 border-r border-zinc-200 text-right">
                              Valor Pago (AKZ)
                            </th>
                            <th className="py-2 px-3 border-r border-zinc-200">
                              Data de Pagamento
                            </th>
                            <th className="py-2 px-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                          {filteredPaymentsForReports.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-8 text-center text-zinc-400 font-bold"
                              >
                                Nenhuma contribuição encontrada para os filtros
                                selecionados.
                              </td>
                            </tr>
                          ) : (
                            filteredPaymentsForReports.map((p) => (
                              <tr key={p.id}>
                                <td className="py-2 px-3 font-bold border-r border-zinc-200">
                                  {p.militanteNome}
                                </td>
                                <td className="py-2 px-3 border-r border-zinc-200">
                                  {MONTHS_FULL[p.mes - 1]}
                                </td>
                                <td className="py-2 px-3 text-right font-mono border-r border-zinc-200 text-emerald-600 font-bold">
                                  {formatAKZ(p.valor)}
                                </td>
                                <td className="py-2 px-3 font-mono border-r border-zinc-200">
                                  {p.dataPagamento
                                    ? p.dataPagamento
                                        .split("-")
                                        .reverse()
                                        .join("/")
                                    : "-"}
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                      p.pago
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "bg-red-50 text-red-700 border border-red-200"
                                    }`}
                                  >
                                    {p.pago ? "Pago" : "Pendente"}
                                  </span>
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
                    Relação nominal de militantes registados com estatuto de{" "}
                    <span className="text-red-600 font-black">Inactivo</span> ou{" "}
                    <span className="text-amber-500 font-black">Suspenso</span>,
                    visando o planeamento de brigadas físicas de recondução e
                    engajamento.
                  </p>

                  <table className="w-full text-left border-collapse border border-zinc-200 text-[10px]">
                    <thead>
                      <tr className="bg-zinc-50 font-black border-b border-zinc-300 text-zinc-700">
                        <th className="py-2 px-3 w-24 border-r border-zinc-200">
                          Nº Cartão
                        </th>
                        <th className="py-2 px-3 border-r border-zinc-200">
                          Nome Completo
                        </th>
                        <th className="py-2 px-3 w-20 border-r border-zinc-200">
                          Gênero
                        </th>
                        <th className="py-2 px-3 w-32 border-r border-zinc-200">
                          Bairro
                        </th>
                        <th className="py-2 px-3 w-28 border-r border-zinc-200">
                          Admissão
                        </th>
                        <th className="py-2 px-3 w-24 border-r border-zinc-200">
                          Estado
                        </th>
                        <th className="py-2 px-3 w-28">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                      {reportNonActiveList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center font-bold text-zinc-400"
                          >
                            Excelente! 100% de adimplência e actividade no
                            comité.
                          </td>
                        </tr>
                      ) : (
                        reportNonActiveList.map((m) => (
                          <tr key={m.id}>
                            <td className="py-2 px-3 font-mono border-r border-zinc-200">
                              {m.numeroCartao}
                            </td>
                            <td className="py-2 px-3 font-bold border-r border-zinc-200">
                              {m.nome}
                            </td>
                            <td className="py-2 px-3 border-r border-zinc-200">
                              {m.genero || "-"}
                            </td>
                            <td className="py-2 px-3 border-r border-zinc-200">
                              {m.bairro || "-"}
                            </td>
                            <td className="py-2 px-3 font-mono border-r border-zinc-200">
                              {m.dataAdmissao
                                ? m.dataAdmissao.split("-").reverse().join("/")
                                : "-"}
                            </td>
                            <td className="py-2 px-3 border-r border-zinc-200 font-bold">
                              <span
                                className={
                                  m.estado === "Inactivo"
                                    ? "text-red-600"
                                    : "text-amber-500"
                                }
                              >
                                {m.estado}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {m.telefone}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {reportNonActiveList.length > 0 && (
                      <tfoot className="border-t-2 border-zinc-950 font-black bg-zinc-50">
                        <tr className="text-zinc-900 font-bold">
                          <td
                            className="py-2.5 px-3 border-r border-zinc-200"
                            colSpan={2}
                          >
                            TOTAL DE INACTIVOS E SUSPENSOS:{" "}
                            {reportNonActiveList.length} Militantes
                          </td>
                          <td
                            className="py-2.5 px-3 border-r border-zinc-200"
                            colSpan={3}
                          >
                            Inactivos: {reportTotals.totalInactivos} •
                            Suspensos: {reportTotals.totalSuspensos}
                          </td>
                          <td className="py-2.5 px-3" colSpan={2}>
                            Total Geral Fora de Serviço:{" "}
                            {reportNonActiveList.length}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {/* Consolidated Summary Panel */}
                  <div
                    className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 mt-4"
                    id="nonactive-consolidated-panel"
                  >
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest block">
                      Resumo Consolidado de Militantes Fora de Serviço
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px]">
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">
                          Total Fora de Serviço (Filtrado)
                        </span>
                        <span className="text-sm font-black text-zinc-900">
                          {reportNonActiveList.length}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-red-600 block">
                          Total Inactivos
                        </span>
                        <span className="text-sm font-black text-red-700">
                          {reportTotals.totalInactivos}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-amber-600 block">
                          Total Suspensos
                        </span>
                        <span className="text-sm font-black text-amber-700">
                          {reportTotals.totalSuspensos}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT D: Militantes com Divida */}
              {activeReport === "MILITANTES_DIVIDA" && (
                <div className="space-y-4">
                  <p className="text-zinc-600 italic">
                    Relação nominal de militantes registados com
                    quotas/contribuições em{" "}
                    <span className="text-red-600 font-black">Atraso</span> para
                    o mês ou ano selecionado, totalizando{" "}
                    {reportDividaList.length} devedores.
                  </p>

                  <table className="w-full text-left border-collapse border border-zinc-200 text-[10px]">
                    <thead>
                      <tr className="bg-zinc-50 font-black border-b border-zinc-300 text-zinc-700">
                        <th className="py-2 px-3 w-24 border-r border-zinc-200">
                          Nº Cartão
                        </th>
                        <th className="py-2 px-3 border-r border-zinc-200">
                          Nome Completo
                        </th>
                        <th className="py-2 px-3 w-20 border-r border-zinc-200">
                          Gênero
                        </th>
                        <th className="py-2 px-3 w-32 border-r border-zinc-200">
                          Bairro
                        </th>
                        <th className="py-2 px-3 w-40 border-r border-zinc-200">
                          Meses Devidos
                        </th>
                        <th className="py-2 px-3 w-28 text-right border-r border-zinc-200">
                          Dívida Total
                        </th>
                        <th className="py-2 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                      {reportDividaList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center font-bold text-zinc-400"
                          >
                            Excelente! 100% de adimplência financeira no período
                            selecionado.
                          </td>
                        </tr>
                      ) : (
                        reportDividaList.map((m) => {
                          const devInfo = devedoresMap.get(m.id);
                          return (
                            <tr key={m.id}>
                              <td className="py-2 px-3 font-mono border-r border-zinc-200">
                                {m.numeroCartao}
                              </td>
                              <td className="py-2 px-3 font-bold border-r border-zinc-200">
                                {m.nome}
                              </td>
                              <td className="py-2 px-3 border-r border-zinc-200">
                                {m.genero || "-"}
                              </td>
                              <td className="py-2 px-3 border-r border-zinc-200">
                                {m.bairro || "-"}
                              </td>
                              <td className="py-2 px-3 border-r border-zinc-200">
                                <span className="text-[9px] font-semibold text-amber-700">
                                  {devInfo
                                    ? devInfo.mesesDevidos
                                        .map((mNum) =>
                                          MONTHS_FULL[mNum - 1].substring(0, 3),
                                        )
                                        .join(", ")
                                    : "-"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-red-600 border-r border-zinc-200">
                                {devInfo
                                  ? formatAKZ(devInfo.totalDivida)
                                  : "0 AKZ"}
                              </td>
                              <td className="py-2 px-3 font-bold text-[9px]">
                                <span
                                  className={
                                    m.estado === "Activo"
                                      ? "text-green-600"
                                      : m.estado === "Inactivo"
                                        ? "text-red-600"
                                        : "text-amber-500"
                                  }
                                >
                                  {m.estado}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {reportDividaList.length > 0 && (
                      <tfoot className="border-t-2 border-zinc-950 font-black bg-zinc-50">
                        <tr className="text-zinc-900 font-bold">
                          <td
                            className="py-2.5 px-3 border-r border-zinc-200"
                            colSpan={2}
                          >
                            TOTAL FILTRADO DE DEVEDORES:{" "}
                            {reportDividaList.length} Militantes
                          </td>
                          <td
                            className="py-2.5 px-3 border-r border-zinc-200"
                            colSpan={3}
                          >
                            Total consolidado em atraso
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-600 font-extrabold border-r border-zinc-200">
                            {formatAKZ(reportTotals.valorTotalDivida)}
                          </td>
                          <td className="py-2.5 px-3" />
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {/* Consolidated Summary Panel */}
                  <div
                    className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 mt-4"
                    id="divida-consolidated-panel"
                  >
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest block">
                      Resumo Consolidado de Incompatibilidade Financeira
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px]">
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">
                          Militantes com Quota em Atraso
                        </span>
                        <span className="text-sm font-black text-red-700">
                          {reportDividaList.length} devedores
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-zinc-200">
                        <span className="text-zinc-500 block">
                          Valor Total da Dívida
                        </span>
                        <span className="text-sm font-black text-red-700">
                          {formatAKZ(reportTotals.valorTotalDivida)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Report Signatures Footer */}
            <div
              className="mt-16 pt-8 border-t border-dashed border-zinc-300 grid grid-cols-2 gap-8 text-center text-[10px] font-sans font-bold"
              id="report-signatures"
            >
              <div className="space-y-6">
                <div className="h-0.5 bg-zinc-400 w-44 mx-auto" />
                <span className="block text-zinc-500 uppercase">
                  Tesoureiro(a)
                </span>
              </div>
              <div className="space-y-6">
                <div className="h-0.5 bg-zinc-400 w-44 mx-auto" />
                <span className="block text-zinc-500 uppercase">
                  1.º Secretário do CAP-190
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
