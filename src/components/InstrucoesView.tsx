/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  HelpCircle, 
  BookOpen, 
  CreditCard, 
  UserCheck, 
  Grid, 
  CheckCircle,
  FileText
} from "lucide-react";

export function InstrucoesView() {
  return (
    <div className="space-y-6" id="instrucoes-view">
      {/* 1. Header */}
      <div className="border-b border-zinc-200 pb-4" id="instrucoes-header">
        <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide">
          Manual de Instruções do Sistema
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Guia de utilização das ferramentas de gestão de militantes, arrecadação financeira e preenchimento de quotas.
        </p>
      </div>

      {/* 2. Structured Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="instructions-grid">
        
        {/* Card 1: Geral e Layout de Abas */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-3" id="inst-layout">
          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-red-600" />
            Navegação Geral e Integração de Abas
          </h4>
          <p className="text-xs text-zinc-600 leading-relaxed font-bold">
            O sistema disponibiliza duas formas integradas de navegação para alternar entre as visões do sistema:
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-600 space-y-1.5 font-semibold">
            <li>
              <span className="text-zinc-900 font-extrabold">Menu Lateral Principal:</span> Painel rápido de botões fáceis de usar em computadores ou telemóveis.
            </li>
            <li>
              <span className="text-zinc-900 font-extrabold">Barra de Abas Inferior (Estilo Excel):</span> Simulação interactiva da folha de cálculo original do Excel! Permite navegar livremente clicando nas abas verdes e vermelhas no fundo do ecrã.
            </li>
          </ul>
        </div>

        {/* Card 2: Gestão de Militantes */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-3" id="inst-militantes">
          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Gestão de Militantes
          </h4>
          <p className="text-xs text-zinc-600 leading-relaxed font-medium">
            Na aba <span className="text-zinc-900 font-extrabold">MILITANTES</span>, é possível controlar o registo de todos os membros do comité:
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-600 space-y-1.5 font-semibold">
            <li>
              <span className="text-zinc-900 font-extrabold">Pesquisa e Filtros:</span> Digite parte do nome, cargo ou número de cartão do membro na barra de pesquisa para filtrar instantaneamente.
            </li>
            <li>
              <span className="text-zinc-900 font-extrabold">Novo Cadastro:</span> Adicione novos militantes com geração automática sugerida do número sequencial de cartão.
            </li>
            <li>
              <span className="text-zinc-900 font-extrabold">Estado de Actividade:</span> Marque membros como Activos, Inactivos ou Suspensos para ajustar as estatísticas do painel.
            </li>
          </ul>
        </div>

        {/* Card 3: Quotas e a Matriz */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-3" id="inst-quotas">
          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Grid className="w-4 h-4 text-yellow-600" />
            Lançamento Financeiro e Matriz de Quotas
          </h4>
          <p className="text-xs text-zinc-600 leading-relaxed font-medium">
            O controlo de contribuições mensais está dividido em duas abordagens na aba <span className="text-zinc-900 font-extrabold">QUOTAS</span>:
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-600 space-y-1.5 font-semibold">
            <li>
              <span className="text-zinc-900 font-extrabold">Histórico de Lançamentos:</span> Lista cronológica de todos os pagamentos em Angola Kwanza (AKZ), permitindo excluir ou estornar transações falsas.
            </li>
            <li>
              <span className="text-zinc-900 font-extrabold">Matriz Interactiva (Checklist):</span> Visão em grelha onde as linhas representam militantes e as colunas os meses. Um clique rápido numa célula livre lança instantaneamente o pagamento da quota padrão de 10.000 AKZ para aquele mês específico! Um clique numa célula preenchida permite estorná-la.
            </li>
          </ul>
        </div>

        {/* Card 4: Relatórios e Impressão */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm space-y-3" id="inst-relatorios">
          <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            Emissão de Relatórios Oficiais
          </h4>
          <p className="text-xs text-zinc-600 leading-relaxed font-medium">
            O <span className="text-zinc-900 font-extrabold">CENTRO DE RELATÓRIOS</span> permite exportar dados consolidados em folhas oficiais prontas para assinar:
          </p>
          <ul className="list-disc pl-5 text-xs text-zinc-600 space-y-1.5 font-semibold">
            <li>
              Selecione o relatório pretendido (Lista Geral, Balanço Financeiro ou Inactivos).
            </li>
            <li>
              Visualize a folha timbrada oficial em tempo real na pré-visualização.
            </li>
            <li>
              Clique em <span className="text-zinc-900 font-extrabold">Imprimir Relatório</span>. O CSS do sistema irá ocultar as barras de navegação automaticamente, imprimindo exclusivamente a folha do relatório limpa!
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
