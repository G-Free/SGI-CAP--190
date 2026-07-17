/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import { Militante, QuotaPayment } from "../types";

export interface PDFExportOptions {
  activeReport: "LISTA_GERAL" | "BALANCO_FINANCEIRO" | "INACTIVOS_SUSPENSOS" | "MILITANTES_DIVIDA" | "BALANCO_SEMESTRAL";
  bairroFilter: string;
  generoFilter: string;
  anoAdmissaoFilter: string;
  mesFilter: string;
}

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Helper to format currency
const formatAKZ = (val: number) => {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
    .format(val)
    .replace("Kz", "AKZ")
    .trim();
};

export function generateReportPDF(
  militants: Militante[],
  payments: QuotaPayment[],
  options: PDFExportOptions
) {
  const { activeReport, bairroFilter, generoFilter, anoAdmissaoFilter, mesFilter } = options;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const today = new Date();
  const formattedToday = today.toLocaleDateString("pt-AO", { day: "numeric", month: "long", year: "numeric" });

  // 1. Filter militants based on options
  const filteredMilitants = militants.filter(m => {
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

  // 2. Filter payments based on filtered militants
  const allowedMilitantIds = new Set(filteredMilitants.map(m => m.id));
  let filteredPayments = payments.filter(p => allowedMilitantIds.has(p.militanteId));
  if (mesFilter !== "Todos") {
    filteredPayments = filteredPayments.filter(p => p.mes === parseInt(mesFilter, 10));
  }

  // General list
  const reportGeneralList = [...filteredMilitants].sort((a, b) => a.nome.localeCompare(b.nome));

  // Inactive list
  const reportNonActiveList = filteredMilitants
    .filter(m => m.estado !== "Activo")
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Financial balance
  const monthlyData = Array(12).fill(null).map((_, idx) => ({
    mesNum: idx + 1,
    mesNome: MONTHS_FULL[idx],
    quantidade: 0,
    total: 0
  }));

  filteredPayments.forEach(p => {
    if (p.pago && p.mes >= 1 && p.mes <= 12) {
      monthlyData[p.mes - 1].quantidade++;
      monthlyData[p.mes - 1].total += p.valor;
    }
  });

  const sumQuantidades = monthlyData.reduce((sum, d) => sum + d.quantidade, 0);
  const sumTotals = monthlyData.reduce((sum, d) => sum + d.total, 0);

  const reportFinanceBalanco = {
    months: monthlyData,
    totalCount: sumQuantidades,
    totalValue: sumTotals
  };

  // Debt map and report
  const devedoresMap = new Map<string, { totalDivida: number; mesesDevidos: number[] }>();
  filteredPayments.forEach(p => {
    if (!p.pago) {
      const current = devedoresMap.get(p.militanteId) || { totalDivida: 0, mesesDevidos: [] };
      current.totalDivida += p.valor;
      current.mesesDevidos.push(p.mes);
      devedoresMap.set(p.militanteId, current);
    }
  });

  const reportDividaList = filteredMilitants
    .filter(m => devedoresMap.has(m.id))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Totals
  const reportTotals = {
    totalMilitants: filteredMilitants.length,
    totalActivos: filteredMilitants.filter(m => m.estado === "Activo").length,
    totalInactivos: filteredMilitants.filter(m => m.estado === "Inactivo").length,
    totalSuspensos: filteredMilitants.filter(m => m.estado === "Suspenso").length,
    totalDevedores: reportDividaList.length,
    valorTotalDivida: reportDividaList.reduce((sum, m) => sum + (devedoresMap.get(m.id)?.totalDivida || 0), 0)
  };

  // PDF Generator Drawer Helpers
  const drawPageHeader = (pageNumber: number) => {
    // Official Letterhead
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text("MPLA", 14, 18);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27); // Zinc-900
    doc.text("COMITE DE ACCAO DO PARTIDO - 190", 14, 24);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122); // Zinc-500
    doc.text("Ingombota - Luanda * Angola", 14, 29);
    doc.text(`Documento de Controle Interno * Emitido em ${formattedToday} * Pagina ${pageNumber}`, 14, 34);

    // Draw Official Flag Logo on PDF
    doc.setFillColor(185, 28, 28); // Red
    doc.rect(170, 14, 24, 5, "F");
    doc.setFillColor(24, 24, 27); // Black
    doc.rect(170, 19, 24, 5, "F");
    
    // Gold star centered at 182, 19
    doc.setFillColor(234, 179, 8); // Gold
    doc.triangle(182, 17.5, 180, 20.5, 184, 20.5, "F");
    doc.triangle(182, 21.0, 180, 18.0, 184, 18.0, "F");
    
    // Decorative Red Bar
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(1.0);
    doc.line(14, 38, 196, 38);
  };

  let pageCount = 1;
  drawPageHeader(pageCount);

  // Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  
  let title = "";
  if (activeReport === "LISTA_GERAL") title = "RELATORIO DE LISTAGEM GERAL DE MILITANTES";
  else if (activeReport === "BALANCO_FINANCEIRO") title = "BALANCO FINANCEIRO DE ARRECADACAO DE QUOTAS - 2026";
  else if (activeReport === "MILITANTES_DIVIDA") title = "RELATORIO DE INCOMPATIBILIDADE E DIVIDAS DE QUOTAS";
  else if (activeReport === "BALANCO_SEMESTRAL") {
    const endMonth = mesFilter === "Todos" ? 7 : parseInt(mesFilter, 10);
    const startMonth = Math.max(1, endMonth - 5);
    title = `BALANCO SEMESTRAL DE QUOTAS (${MONTHS_FULL[startMonth - 1].toUpperCase()} A ${MONTHS_FULL[endMonth - 1].toUpperCase()} DE 2026)`;
  }
  else title = "RELATORIO DE MOBILIZACAO: MEMBROS INACTIVOS E SUSPENSOS";
  
  doc.text(title, 14, 45);
  
  // Filters Applied
  let startY = 51;
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
    doc.text(filterText.toUpperCase(), 14, 50);
    startY = 55;
  }

  doc.setFontSize(8);
  doc.setTextColor(24, 24, 27);

  if (activeReport === "LISTA_GERAL") {
    // Header rect
    doc.setFillColor(244, 244, 245);
    doc.rect(14, startY, 182, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.text("N Card", 15, startY + 5.5);
    doc.text("Nome Completo", 40, startY + 5.5);
    doc.text("Gen", 95, startY + 5.5);
    doc.text("Bairro", 112, startY + 5.5);
    doc.text("Admissao", 135, startY + 5.5);
    doc.text("Estado", 158, startY + 5.5);
    doc.text("Telefone", 175, startY + 5.5);
    
    startY += 8;
    doc.setFont("Helvetica", "normal");
    
    reportGeneralList.forEach((m) => {
      if (startY > 265) {
        doc.addPage();
        pageCount++;
        drawPageHeader(pageCount);
        startY = 44;
        doc.setFillColor(244, 244, 245);
        doc.rect(14, startY, 182, 8, "F");
        doc.setFont("Helvetica", "bold");
        doc.text("N Card", 15, startY + 5.5);
        doc.text("Nome Completo", 40, startY + 5.5);
        doc.text("Gen", 95, startY + 5.5);
        doc.text("Bairro", 112, startY + 5.5);
        doc.text("Admissao", 135, startY + 5.5);
        doc.text("Estado", 158, startY + 5.5);
        doc.text("Telefone", 175, startY + 5.5);
        startY += 8;
        doc.setFont("Helvetica", "normal");
      }
      doc.text(m.numeroCartao, 15, startY + 5.5);
      let nameText = m.nome;
      if (nameText.length > 30) nameText = nameText.substring(0, 30) + "...";
      doc.text(nameText, 40, startY + 5.5);
      doc.text(m.genero || "-", 95, startY + 5.5);
      let bairroText = m.bairro || "-";
      if (bairroText.length > 12) bairroText = bairroText.substring(0, 12) + "...";
      doc.text(bairroText, 112, startY + 5.5);
      
      const formattedDate = m.dataAdmissao ? m.dataAdmissao.split("-").reverse().join("/") : "-";
      doc.text(formattedDate, 135, startY + 5.5);
      doc.text(m.estado, 158, startY + 5.5);
      doc.text(m.telefone, 175, startY + 5.5);
      
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.2);
      doc.line(14, startY + 8, 196, startY + 8);
      startY += 8;
    });

    if (startY > 230) {
      doc.addPage();
      pageCount++;
      drawPageHeader(pageCount);
      startY = 44;
    } else {
      startY += 4;
    }
    doc.setFillColor(24, 24, 27);
    doc.rect(14, startY, 182, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("CONSOLIDADO GERAL", 16, startY + 7);
    doc.text(`Militantes: ${reportTotals.totalMilitants}  |  Activos: ${reportTotals.totalActivos}  |  Inactivos: ${reportTotals.totalInactivos}  |  Suspensos: ${reportTotals.totalSuspensos}  |  Devedores: ${reportTotals.totalDevedores} (${formatAKZ(reportTotals.valorTotalDivida)})`, 52, startY + 7);
    doc.setTextColor(24, 24, 27);
    startY += 15;
  } else if (activeReport === "BALANCO_FINANCEIRO") {
    // Header rect
    doc.setFillColor(244, 244, 245);
    doc.rect(14, startY, 182, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.text("Mes de Referencia", 16, startY + 5.5);
    doc.text("Contribuicoes Registadas", 75, startY + 5.5);
    doc.text("Total Arrecadado (AKZ)", 140, startY + 5.5);
    
    startY += 8;
    doc.setFont("Helvetica", "normal");
    
    const monthsToRender = mesFilter === "Todos" 
      ? reportFinanceBalanco.months 
      : reportFinanceBalanco.months.filter(m => m.mesNum === parseInt(mesFilter, 10));

    monthsToRender.forEach((m) => {
      doc.text(m.mesNome, 16, startY + 5.5);
      doc.text(`${m.quantidade} pagamentos`, 75, startY + 5.5);
      doc.text(formatAKZ(m.total), 140, startY + 5.5);
      
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
    doc.text("TOTAL CONSOLIDADO", 16, startY + 6.5);
    doc.text(`${reportFinanceBalanco.totalCount} pagamentos`, 75, startY + 6.5);
    doc.text(formatAKZ(reportFinanceBalanco.totalValue), 140, startY + 6.5);
    doc.setTextColor(24, 24, 27);
    startY += 15;

    // Add detailed breakdown of payments
    if (startY > 230) {
      doc.addPage();
      pageCount++;
      drawPageHeader(pageCount);
      startY = 44;
    }
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DETALHAMENTO DAS CONTRIBUICOES INDIVIDUAIS", 14, startY);
    startY += 6;

    doc.setFillColor(244, 244, 245);
    doc.rect(14, startY, 182, 8, "F");
    doc.setFontSize(8);
    doc.text("Militante", 16, startY + 5.5);
    doc.text("Mes Ref.", 85, startY + 5.5);
    doc.text("Valor Pago", 115, startY + 5.5);
    doc.text("Data Pagamento", 150, startY + 5.5);
    startY += 8;
    doc.setFont("Helvetica", "normal");

    if (filteredPayments.length === 0) {
      doc.text("Nenhuma contribuicao registada para os filtros selecionados.", 16, startY + 5.5);
      startY += 8;
    } else {
      filteredPayments.forEach((p) => {
        if (startY > 265) {
          doc.addPage();
          pageCount++;
          drawPageHeader(pageCount);
          startY = 44;
          doc.setFillColor(244, 244, 245);
          doc.rect(14, startY, 182, 8, "F");
          doc.setFont("Helvetica", "bold");
          doc.text("Militante", 16, startY + 5.5);
          doc.text("Mes Ref.", 85, startY + 5.5);
          doc.text("Valor Pago", 115, startY + 5.5);
          doc.text("Data Pagamento", 150, startY + 5.5);
          startY += 8;
          doc.setFont("Helvetica", "normal");
        }

        let nameText = p.militanteNome;
        if (nameText.length > 35) nameText = nameText.substring(0, 35) + "...";
        doc.text(nameText, 16, startY + 5.5);
        doc.text(MONTHS_FULL[p.mes - 1], 85, startY + 5.5);
        doc.text(formatAKZ(p.valor), 115, startY + 5.5);
        const formattedDate = p.dataPagamento ? p.dataPagamento.split("-").reverse().join("/") : "-";
        doc.text(formattedDate, 150, startY + 5.5);

        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.1);
        doc.line(14, startY + 8, 196, startY + 8);
        startY += 8;
      });
    }
  } else if (activeReport === "BALANCO_SEMESTRAL") {
    const endMonth = mesFilter === "Todos" ? 7 : parseInt(mesFilter, 10);
    const startMonth = Math.max(1, endMonth - 5);
    
    const finalMonthsList: number[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      finalMonthsList.push(m);
    }

    const semesterMonths = finalMonthsList.map(mNum => {
      const pList = payments.filter(p => p.pago && p.mes === mNum && p.ano === 2026);
      const totalAmount = pList.reduce((sum, p) => sum + p.valor, 0);
      return {
        mesNum: mNum,
        mesNome: MONTHS_FULL[mNum - 1],
        quantidade: pList.length,
        total: totalAmount
      };
    });

    const semCount = semesterMonths.reduce((sum, m) => sum + m.quantidade, 0);
    const semTotal = semesterMonths.reduce((sum, m) => sum + m.total, 0);

    // Summary block
    doc.setFillColor(244, 244, 245);
    doc.rect(14, startY, 182, 18, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`PERIODO SEMESTRAL DE REFERENCIA: ${MONTHS_FULL[startMonth - 1].toUpperCase()} A ${MONTHS_FULL[endMonth - 1].toUpperCase()} DE 2026`, 16, startY + 5);
    doc.setFont("Helvetica", "normal");
    doc.text(`Total Arrecadado no Semestre: ${formatAKZ(semTotal)}`, 16, startY + 10);
    doc.text(`Volume de Contribuicoes: ${semCount} quotas pagas   |   Media Mensal: ${formatAKZ(Math.round(semTotal / semesterMonths.length))}`, 16, startY + 14);

    startY += 24;

    // Table Header
    doc.setFillColor(185, 28, 28); // red header
    doc.rect(14, startY, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.text("Mes de Referencia", 16, startY + 5.5);
    doc.text("Volume de Contribuicoes", 75, startY + 5.5);
    doc.text("Total Arrecadado (AKZ)", 125, startY + 5.5);
    doc.text("% do Semestre", 170, startY + 5.5);

    startY += 8;
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(24, 24, 27);

    semesterMonths.forEach((m) => {
      const pct = semTotal > 0 ? ((m.total / semTotal) * 100).toFixed(1) : "0.0";
      doc.text(m.mesNome, 16, startY + 5.5);
      doc.text(`${m.quantidade} pagamentos`, 75, startY + 5.5);
      doc.text(formatAKZ(m.total), 125, startY + 5.5);
      doc.text(`${pct}%`, 170, startY + 5.5);

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
    doc.text("TOTAL CONSOLIDADO", 16, startY + 6.5);
    doc.text(`${semCount} pagamentos`, 75, startY + 6.5);
    doc.text(formatAKZ(semTotal), 125, startY + 6.5);
    doc.text("100%", 170, startY + 6.5);
    doc.setTextColor(24, 24, 27);
    
    startY += 18;

    // Simulation of repasses
    if (startY > 230) {
      doc.addPage();
      pageCount++;
      drawPageHeader(pageCount);
      startY = 44;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("REPARTICAO ESTATUTARIA DOS VALORES DO SEMESTRE", 14, startY);
    startY += 6;

    const beneficiariosList = [
      { nome: "CAP-190 (Comite Local)", percentagem: 40 },
      { nome: "Comite de Distrito (Ingombota)", percentagem: 25 },
      { nome: "Comite Provincial (Luanda)", percentagem: 15 },
      { nome: "Comite Central (Nacional)", percentagem: 10 },
      { nome: "Fundo de Solidariedade Social", percentagem: 5 },
    ];

    doc.setFillColor(244, 244, 245);
    doc.rect(14, startY, 182, 8, "F");
    doc.setFontSize(8);
    doc.text("Orgao / Destino das Quotas", 16, startY + 5.5);
    doc.text("Percentagem", 110, startY + 5.5);
    doc.text("Valor Repassado (AKZ)", 145, startY + 5.5);
    startY += 8;
    doc.setFont("Helvetica", "normal");

    beneficiariosList.forEach((b) => {
      const shareVal = Math.round(semTotal * (b.percentagem / 100));
      doc.text(b.nome, 16, startY + 5.5);
      doc.text(`${b.percentagem}%`, 110, startY + 5.5);
      doc.text(formatAKZ(shareVal), 145, startY + 5.5);

      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.1);
      doc.line(14, startY + 8, 196, startY + 8);
      startY += 8;
    });
  } else if (activeReport === "MILITANTES_DIVIDA") {
    // Header rect
    doc.setFillColor(244, 244, 245);
    doc.rect(14, startY, 182, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.text("N Card", 15, startY + 5.5);
    doc.text("Nome Completo", 40, startY + 5.5);
    doc.text("Gen", 95, startY + 5.5);
    doc.text("Bairro", 112, startY + 5.5);
    doc.text("Meses Devidos", 135, startY + 5.5);
    doc.text("Total Divida", 168, startY + 5.5);
    
    startY += 8;
    doc.setFont("Helvetica", "normal");
    
    reportDividaList.forEach((m) => {
      if (startY > 265) {
        doc.addPage();
        pageCount++;
        drawPageHeader(pageCount);
        startY = 44;
        doc.setFillColor(244, 244, 245);
        doc.rect(14, startY, 182, 8, "F");
        doc.setFont("Helvetica", "bold");
        doc.text("N Card", 15, startY + 5.5);
        doc.text("Nome Completo", 40, startY + 5.5);
        doc.text("Gen", 95, startY + 5.5);
        doc.text("Bairro", 112, startY + 5.5);
        doc.text("Meses Devidos", 135, startY + 5.5);
        doc.text("Total Divida", 168, startY + 5.5);
        startY += 8;
        doc.setFont("Helvetica", "normal");
      }
      doc.text(m.numeroCartao, 15, startY + 5.5);
      let nameText = m.nome;
      if (nameText.length > 30) nameText = nameText.substring(0, 30) + "...";
      doc.text(nameText, 40, startY + 5.5);
      doc.text(m.genero || "-", 95, startY + 5.5);
      let bairroText = m.bairro || "-";
      if (bairroText.length > 12) bairroText = bairroText.substring(0, 12) + "...";
      doc.text(bairroText, 112, startY + 5.5);
      
      const devInfo = devedoresMap.get(m.id);
      const mesesText = devInfo ? devInfo.mesesDevidos.map(num => MONTHS_FULL[num - 1].substring(0, 3)).join(", ") : "-";
      let truncatedMeses = mesesText;
      if (truncatedMeses.length > 18) truncatedMeses = truncatedMeses.substring(0, 15) + "...";
      doc.text(truncatedMeses, 135, startY + 5.5);
      
      const valorDividaText = devInfo ? formatAKZ(devInfo.totalDivida) : "0 AKZ";
      doc.text(valorDividaText, 168, startY + 5.5);
      
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.2);
      doc.line(14, startY + 8, 196, startY + 8);
      startY += 8;
    });

    if (startY > 230) {
      doc.addPage();
      pageCount++;
      drawPageHeader(pageCount);
      startY = 44;
    } else {
      startY += 4;
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
    doc.text("N Card", 15, startY + 5.5);
    doc.text("Nome Completo", 40, startY + 5.5);
    doc.text("Gen", 95, startY + 5.5);
    doc.text("Bairro", 112, startY + 5.5);
    doc.text("Admissao", 135, startY + 5.5);
    doc.text("Estado", 158, startY + 5.5);
    doc.text("Telefone", 175, startY + 5.5);
    
    startY += 8;
    doc.setFont("Helvetica", "normal");
    
    reportNonActiveList.forEach((m) => {
      if (startY > 265) {
        doc.addPage();
        pageCount++;
        drawPageHeader(pageCount);
        startY = 44;
        doc.setFillColor(244, 244, 245);
        doc.rect(14, startY, 182, 8, "F");
        doc.setFont("Helvetica", "bold");
        doc.text("N Card", 15, startY + 5.5);
        doc.text("Nome Completo", 40, startY + 5.5);
        doc.text("Gen", 95, startY + 5.5);
        doc.text("Bairro", 112, startY + 5.5);
        doc.text("Admissao", 135, startY + 5.5);
        doc.text("Estado", 158, startY + 5.5);
        doc.text("Telefone", 175, startY + 5.5);
        startY += 8;
        doc.setFont("Helvetica", "normal");
      }
      doc.text(m.numeroCartao, 15, startY + 5.5);
      let nameText = m.nome;
      if (nameText.length > 30) nameText = nameText.substring(0, 30) + "...";
      doc.text(nameText, 40, startY + 5.5);
      doc.text(m.genero || "-", 95, startY + 5.5);
      let bairroText = m.bairro || "-";
      if (bairroText.length > 12) bairroText = bairroText.substring(0, 12) + "...";
      doc.text(bairroText, 112, startY + 5.5);
      
      const formattedDate = m.dataAdmissao ? m.dataAdmissao.split("-").reverse().join("/") : "-";
      doc.text(formattedDate, 135, startY + 5.5);
      doc.text(m.estado, 158, startY + 5.5);
      doc.text(m.telefone, 175, startY + 5.5);
      
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.2);
      doc.line(14, startY + 8, 196, startY + 8);
      startY += 8;
    });

    // Add non active list summary totals row/box
    if (startY > 230) {
      doc.addPage();
      pageCount++;
      drawPageHeader(pageCount);
      startY = 44;
    } else {
      startY += 4;
    }
    doc.setFillColor(24, 24, 27);
    doc.rect(14, startY, 182, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("CONSOLIDADO FORA DE SERVICO", 16, startY + 7);
    doc.text(`Total Fora de Servico: ${reportNonActiveList.length}  |  Inactivos: ${reportTotals.totalInactivos}  |  Suspensos: ${reportTotals.totalSuspensos}`, 68, startY + 7);
    doc.setTextColor(24, 24, 27);
    startY += 15;
  }
  
  // Signatures
  if (startY > 230) {
    doc.addPage();
    pageCount++;
    drawPageHeader(pageCount);
    startY = 50;
  } else {
    startY += 12;
  }
  
  doc.setDrawColor(161, 161, 170);
  doc.setLineWidth(0.4);
  doc.line(20, startY, 80, startY);
  doc.line(120, startY, 180, startY);
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text("SECRETARIA PARA ADMINISTRACAO", 21, startY + 4);
  doc.text("COORDENADOR GERAL DO CAP-190", 121, startY + 4);
  
  doc.save(`CAP190_Relatorio_${activeReport}_2026.pdf`);
}

export function generateMonthlySharePDF(
  monthNum: number,
  yearNum: number,
  totalArrecadado: number,
  calculatedShares: any[],
  totalDistribuido: number,
  saldoResidual: number,
  isHomologated: boolean,
  isSubmetido: boolean,
  appState: any,
  reportEmissionDate: string
) {
  const nonCapShares = calculatedShares.filter(b => 
    b.percentagem > 0 && 
    !b.id.toLowerCase().includes("cap") && 
    !b.nome.toLowerCase().includes("cap") && 
    b.id.toLowerCase() !== "comite"
  );
  const totalDistribuidoPDF = nonCapShares.reduce((sum, b) => sum + b.valorCalculado, 0);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const MONTHS_FULL = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const formatAKZ = (val: number) => {
    return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
      .format(val)
      .replace("Kz", "AKZ")
      .trim();
  };

  const drawPageHeader = (pageNumber: number) => {
    // Official Letterhead
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text("MPLA", 14, 18);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27); // Zinc-900
    doc.text("COMITE DE ACCAO DO PARTIDO - 190", 14, 24);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122); // Zinc-500
    doc.text("Ingombota - Luanda * Angola", 14, 29);
    doc.text(`Relatório de Partilha de Quotas * Emitido em ${reportEmissionDate.split("-").reverse().join("/")} * Pagina ${pageNumber}`, 14, 34);

    // Draw Official Flag Logo on PDF
    doc.setFillColor(185, 28, 28); // Red
    doc.rect(170, 14, 24, 5, "F");
    doc.setFillColor(24, 24, 27); // Black
    doc.rect(170, 19, 24, 5, "F");
    
    // Gold star
    doc.setFillColor(234, 179, 8); // Gold
    doc.triangle(182, 17.5, 180, 20.5, 184, 20.5, "F");
    doc.triangle(182, 21.0, 180, 18.0, 184, 18.0, "F");
    
    // Decorative Red Bar
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(1.0);
    doc.line(14, 38, 196, 38);
  };

  drawPageHeader(1);

  // Title as Addendum/Memorandum
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(185, 28, 28); // Red for emphasis
  doc.text("MEMORANDO INTERNO / ADENDA REGULAMENTAR DE PARTILHA", 14, 45);

  doc.setFontSize(8);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(113, 113, 122);
  doc.text(`REF: ADENDA-CAP190-PARTILHA-${monthNum}-${yearNum}`, 14, 49.5);

  // Memorandum Meta Info Box
  let startY = 53;
  doc.setFillColor(244, 244, 245);
  doc.rect(14, startY, 182, 22, "F");
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.2);
  doc.rect(14, startY, 182, 22, "D");

  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text("PARA:", 17, startY + 5);
  doc.text("DE:", 17, startY + 10);
  doc.text("ASSUNTO:", 17, startY + 15);
  doc.text("DATA:", 17, startY + 20);

  doc.setTextColor(24, 24, 27);
  doc.setFont("Helvetica", "bold");
  doc.text("Comité do Distrito Urbano da Ingombota / Órgãos de Controle Financeiro", 38, startY + 5);
  doc.text("Comité de Acção do Partido 190 (CAP-190)", 38, startY + 10);
  doc.text(`PARTILHA E DISTRIBUIÇÃO REGULAMENTAR DE QUOTAS - ${MONTHS_FULL[monthNum - 1].toUpperCase()}/${yearNum}`, 38, startY + 15);
  doc.setFont("Helvetica", "mono");
  doc.text(reportEmissionDate.split("-").reverse().join("/"), 38, startY + 20);

  // Intro paragraph
  startY += 26;
  doc.setTextColor(24, 24, 27);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  
  const introText = "Em estrito cumprimento das diretrizes estatutárias vigentes e em conformidade com o regulamento sobre a autonomia financeira dos órgãos locais do Partido, o Comité de Acção do Partido 190 (CAP-190) apresenta o presente Memorando de Partilha e Distribuição de Quotas. Este instrumento formaliza e homologa a alocação automática de fundos arrecadados a título de quotas de militantes referentes ao período indicado, distribuindo-os estritamente de acordo com os coeficientes e percentagens estatutárias aplicáveis aos órgãos destinatários, conforme detalhado no quadro demonstrativo abaixo:";
  const splitIntro = doc.splitTextToSize(introText, 182);
  doc.text(splitIntro, 14, startY, { align: "justify" });
  
  startY += (splitIntro.length * 3.8) + 2;

  // Summary Grid box (only total shared as requested)
  doc.setFillColor(240, 253, 244); // very light green (bg-emerald-50)
  doc.rect(14, startY, 182, 11, "F");
  doc.setDrawColor(187, 247, 208); // border-emerald-200
  doc.rect(14, startY, 182, 11, "D");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text("VALOR TOTAL PARTILHADO (DISTRIBUÍDO)", 17, startY + 4);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(16, 124, 65);
  doc.text(formatAKZ(totalDistribuidoPDF), 17, startY + 8.5);

  // Section 1: Table header
  startY += 18;
  doc.setTextColor(24, 24, 27);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("1. Demonstração de Valores Partilhados por Beneficiário", 14, startY);

  startY += 4;
  doc.setFillColor(244, 244, 245);
  doc.rect(14, startY, 182, 8, "F");
  doc.setFontSize(8);
  doc.text("Beneficiário / Quota Destinatária", 16, startY + 5.5);
  doc.text("Percentagem Aplicada", 100, startY + 5.5);
  doc.text("Valor Partilhado (AKZ)", 150, startY + 5.5);

  startY += 8;
  doc.setFont("Helvetica", "normal");
  nonCapShares.forEach((b) => {
    doc.text(b.nome, 16, startY + 5.5);
    doc.text(`${b.percentagem}%`, 100, startY + 5.5);
    doc.setFont("Helvetica", "bold");
    doc.text(formatAKZ(b.valorCalculado), 150, startY + 5.5);
    doc.setFont("Helvetica", "normal");

    doc.setDrawColor(228, 228, 231);
    doc.line(14, startY + 8, 196, startY + 8);
    startY += 8;
  });

  // Note: We omit "Saldo Excedente Retido (CAP-190 Local)" completely as per user request.

  // Section 2: Autenticação
  startY += 6;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("2. Homologação e Assinaturas Físicas", 14, startY);

  // Signatures Grid layout (1 row of 2 columns)
  startY += 4;
  const col1X = 14;
  const col2X = 110;
  const colWidth = 86;
  const boxHeight = 32; // Taller box for physical signatures

  doc.setFillColor(250, 250, 250);
  doc.rect(col1X, startY, colWidth, boxHeight, "F");
  doc.rect(col2X, startY, colWidth, boxHeight, "F");
  doc.setDrawColor(228, 228, 231);
  doc.rect(col1X, startY, colWidth, boxHeight, "D");
  doc.rect(col2X, startY, colWidth, boxHeight, "D");

  // Box 1: Elaborado
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text("1. ELABORADO POR", col1X + colWidth / 2, startY + 5, { align: "center" });

  // Draw manual/physical signature line
  doc.setDrawColor(161, 161, 170); // zinc-400
  doc.setLineWidth(0.3);
  doc.line(col1X + 12, startY + 18, col1X + colWidth - 12, startY + 18);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(24, 24, 27);
  const elaboradoNome = appState.elaborado?.assinado ? appState.elaborado.nome : "___________________________";
  doc.text(`( ${elaboradoNome} )`, col1X + colWidth / 2, startY + 23, { align: "center" });

  doc.setFontSize(7.5);
  doc.text("Tesoureiro CAP-190", col1X + colWidth / 2, startY + 27, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(113, 113, 122);
  const elaboradoDataStr = appState.elaborado?.assinado 
    ? `Registado em: ${appState.elaborado.data.split("-").reverse().join("/")}`
    : "Data: ____/____/2026   [ Carimbo Oficial ]";
  doc.text(elaboradoDataStr, col1X + colWidth / 2, startY + 30.5, { align: "center" });


  // Box 2: Autorizado
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text("2. HOMOLOGADO E AUTORIZADO POR", col2X + colWidth / 2, startY + 5, { align: "center" });

  // Draw manual/physical signature line
  doc.setDrawColor(161, 161, 170); // zinc-400
  doc.line(col2X + 12, startY + 18, col2X + colWidth - 12, startY + 18);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(24, 24, 27);
  const autorizadoNome = appState.autorizado?.assinado ? appState.autorizado.nome : "___________________________";
  doc.text(`( ${autorizadoNome} )`, col2X + colWidth / 2, startY + 23, { align: "center" });

  doc.setFontSize(7.5);
  doc.text("Coordenador do CAP-190", col2X + colWidth / 2, startY + 27, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(113, 113, 122);
  const autorizadoDataStr = appState.autorizado?.assinado 
    ? `Registado em: ${appState.autorizado.data.split("-").reverse().join("/")}`
    : "Data: ____/____/2026   [ Carimbo Oficial ]";
  doc.text(autorizadoDataStr, col2X + colWidth / 2, startY + 30.5, { align: "center" });

  // Footer / Submit state details
  startY += boxHeight + 8;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  const footerText = isSubmetido 
    ? `Este relatório de distribuição de quotas foi homologado e submetido digitalmente ao Comité de Distrito da Ingombota na data de ${appState.dataSubmissao ? appState.dataSubmissao.split("-").reverse().join("/") : "-"}.`
    : `Este relatório é uma via oficial de controle financeiro do CAP-190 e requer todas as assinaturas registadas para homologação distrital.`;
  doc.text(footerText, 14, startY);

  doc.save(`CAP190_Partilha_Quotas_${MONTHS_FULL[monthNum - 1]}_${yearNum}.pdf`);
}
