/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MilitanteEstado = "Activo" | "Inactivo" | "Suspenso";

export interface Militante {
  id: string;
  nome: string;
  numeroCartao: string;
  estado: MilitanteEstado;
  telefone: string;
  bairro: string;
  dataAdmissao: string; // YYYY-MM-DD
  email?: string;
  cargo?: string;
  profissao?: string;
  anoInclusao?: number;
  dataNascimento?: string;
  morada?: string;
  setor?: string;
  zona?: string;
  genero?: string;
  foto?: string; // Base64 image data or URL
}

export interface QuotaPayment {
  id: string;
  militanteId: string;
  militanteNome: string;
  mes: number; // 1 to 12
  ano: number;
  valor: number; // in AKZ (Kwanza)
  pago: boolean;
  dataPagamento?: string; // YYYY-MM-DD
}

export interface MonthlyGrowth {
  mes: string;
  novosMilitantes: number;
  totalAcumulado: number;
}

export interface MonthlyQuota {
  mes: string;
  valorArrecadado: number;
}

export type ActiveTab = 
  | "DASHBOARD" 
  | "MILITANTES" 
  | "QUOTAS" 
  | "INDICADORES" 
  | "CRESCIMENTO" 
  | "RELATORIOS" 
  | "INSTRUCOES"
  | "PLANEAMENTO";

export type UserRole = "Administrador" | "Tesoureiro" | "Secretário";

export interface UserSession {
  email: string;
  nome: string;
  role: UserRole;
}

export interface AppNotification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string; // ISO or human readable
  read: boolean;
}

export interface Actividade {
  id: string;
  titulo: string;
  descricao: string;
  data: string; // YYYY-MM-DD
  local: string;
  responsavel: string;
  estado: "Planeada" | "Em Progresso" | "Concluída" | "Cancelada";
  tipo: "Mobilização" | "Reunião" | "Apoio Social" | "Formação" | "Outro";
  custoPrevisto?: number;
}


