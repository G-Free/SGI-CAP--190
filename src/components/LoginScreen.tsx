/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Lock, 
  Mail, 
  ShieldAlert, 
  LogIn, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Award,
  ShieldCheck,
  CheckCircle,
  Sun,
  Moon,
  ChevronRight,
  MapPin,
  Users,
  Building,
  Flag
} from "lucide-react";
import { UserSession, UserRole } from "../types";
import { AngolaFlagSvg, Cap190BrandLogo, MplaCrestSvg } from "./Header";

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

const PRESET_USERS = [
  {
    nome: "Dr. Manuel da Costa",
    email: "admin@mpla.ao",
    password: "admin123",
    role: "Administrador" as UserRole,
    description: "Gestão global de militantes, quotas e emissão de credenciais"
  },
  {
    nome: "Engª. Albertina Francisco",
    email: "tesouraria@mpla.ao",
    password: "mpla2026",
    role: "Tesoureiro" as UserRole,
    description: "Controlo financeiro, matriz de pagamentos e balancete"
  },
  {
    nome: "Dra. Amélia Neto",
    email: "secretaria@mpla.ao",
    password: "mpla190",
    role: "Secretário" as UserRole,
    description: "Gestão cadastral, diário de eventos e conformidade"
  }
];

export function LoginScreen({ onLoginSuccess, theme = "dark", onToggleTheme }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Simulated network delay
    setTimeout(() => {
      const trimmedEmail = email.trim().toLowerCase();
      const user = PRESET_USERS.find(
        u => u.email.toLowerCase() === trimmedEmail && u.password === password
      );

      if (user) {
        onLoginSuccess({
          nome: user.nome,
          email: user.email,
          role: user.role
        });
      } else {
        setError("Credenciais corporativas inválidas. Confirme o endereço e a password de acesso.");
        setLoading(false);
      }
    }, 700);
  };

  const handleApplyPreset = (preset: typeof PRESET_USERS[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setError(null);
  };

  return (
    <div 
      className={`min-h-screen grid grid-cols-1 lg:grid-cols-12 font-sans overflow-x-hidden transition-colors duration-300 ${
        theme === "dark" ? "bg-[#09090b] text-zinc-100" : "bg-zinc-50 text-zinc-900"
      }`} 
      id="corporate-login-screen"
    >
      
      {/* LEFT SIDE: MAJESTIC MPLA CAP-190 BRAND & PATRIOTIC HERO SHOWCASE (7 cols on lg) */}
      <section 
        className="relative lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 md:p-14 overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800 min-h-[480px] lg:min-h-screen select-none"
        style={{
          background: "linear-gradient(135deg, #121214 0%, #050507 100%)"
        }}
        id="login-showcase-pane"
      >
        {/* Beautiful high-end representation of the MPLA Flag as a background backdrop */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" id="mpla-flag-backdrop">
          {/* Top Half Red Gradient representing the blood shed for independence */}
          <div className="absolute top-0 left-0 w-full h-[55%] bg-gradient-to-b from-red-600/25 via-red-900/10 to-transparent" />
          {/* Bottom Half Black representing the African continent */}
          <div className="absolute bottom-0 left-0 w-full h-[45%] bg-gradient-to-t from-black/95 to-transparent" />
          
          {/* Majestic diagonal split divider with high-tech red and yellow thin borders */}
          <div className="absolute top-[55%] left-0 w-full h-[2px] bg-gradient-to-r from-red-600 via-[#F9D71C] to-red-600 opacity-60" />
          
          {/* Large Stylized Background Star of the MPLA (represented in yellow) */}
          <div className="absolute right-[-10%] top-[20%] opacity-[0.12] text-yellow-500/30 blur-[1px] transform rotate-12 scale-150 animate-pulse duration-8000">
            <svg viewBox="0 0 24 24" className="w-[320px] h-[320px] fill-current text-[#F9D71C]">
              <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
            </svg>
          </div>

          {/* Angola map outline vector inside the backdrop */}
          <div className="absolute left-[5%] bottom-[12%] opacity-[0.06] text-white">
            <svg viewBox="0 0 100 120" className="w-[300px] h-[300px] fill-current">
              <path d="M 38,45 Q 41,38 48,37 Q 53,37 56,41 Q 61,41 62,46 Q 63,52 61,56 Q 60,60 59,64 Q 54,67 48,67 Q 43,67 40,63 Q 37,58 38,45" />
            </svg>
          </div>
        </div>

        {/* Ambient background glows */}
        <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-red-600/15 rounded-full blur-[100px] pointer-events-none -ml-20 -mt-20 animate-pulse duration-10000" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none -mr-20 -mb-20" />
        
        {/* Subtle geometric grid */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }}
        />

        {/* Header section of showcase side */}
        <div className="z-10 flex items-center justify-between w-full" id="showcase-header">
          <div className="flex items-center gap-2">
            <AngolaFlagSvg className="w-12 h-8 rounded shadow-md border border-zinc-700/50" />
            <div className="h-6 w-[1px] bg-zinc-800" />
            <span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Movimento Popular de Libertação de Angola</span>
          </div>
          
          <span className="text-[10px] font-mono font-black text-red-500 bg-red-950/40 border border-red-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Portal Oficial
          </span>
        </div>

        {/* Brand Core Identity Center */}
        <div className="z-10 my-auto py-8 sm:py-12 max-w-xl space-y-6 text-left" id="showcase-body">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-red-950/60 border border-red-600/30 text-[#F9D71C]" id="identity-tag">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
            <span>MPLA • COMITÉ DE ACÇÃO DO PARTIDO</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg shrink-0 flex items-center justify-center">
                <MplaCrestSvg className="w-14 h-16 text-white drop-shadow-md" />
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white leading-none">
                  CAP <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-[#F9D71C] to-red-600">190</span>
                </h1>
                <p className="text-xs font-black text-[#F9D71C] uppercase tracking-widest leading-none">
                  Distrito Urbano da Ingombota • Luanda
                </p>
                <p className="text-[11px] font-bold text-zinc-400 font-mono tracking-tight">
                  Unidade, Trabalho e Disciplina
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed max-w-lg pt-2">
              Plataforma digital corporativa para a gestão integrada e controlo de militantes, arrecadação sistemática de quotas e auditoria cadastral em tempo real. A nossa tecnologia ao serviço da organização partidária.
            </p>
          </div>

          {/* Bento-style Fact Grid for Corporate Vibe */}
          <div className="grid grid-cols-2 gap-4 pt-4 max-w-lg" id="bento-stats-grid">
            <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-lg space-y-1.5 hover:bg-zinc-900/80 transition-all">
              <div className="flex items-center gap-2 text-[#F9D71C]">
                <Users className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-wider">Militância Ativa</span>
              </div>
              <p className="text-lg font-black text-white leading-none">CAP-190</p>
              <p className="text-[10px] font-bold text-zinc-500">Controlo unificado de cadastros.</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-lg space-y-1.5 hover:bg-zinc-900/80 transition-all">
              <div className="flex items-center gap-2 text-red-500">
                <Building className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-wider">Jurisdição</span>
              </div>
              <p className="text-lg font-black text-white leading-none">Ingombota</p>
              <p className="text-[10px] font-bold text-zinc-500">Comité de Acção Local Luanda.</p>
            </div>
          </div>

          {/* Core Values / Slogans */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-zinc-800/60 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest" id="core-pillars">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Paz e Progresso
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Trabalho e Liberdade
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Desenvolvimento
            </span>
          </div>
        </div>

        {/* Footer/Motto Section on Showcase side */}
        <div className="z-10 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase font-black" id="showcase-footer">
          <span>MPLA CAP-190 • D.I.T.</span>
          <span className="text-[#F9D71C] flex items-center gap-1.5 font-bold">
            <Flag className="w-3 h-3 text-red-500 animate-pulse" />
            Pelo Futuro de Angola
          </span>
        </div>

      </section>

      {/* RIGHT SIDE: CLEAN, SOPHISTICATED CORPORATE LOGIN PORTAL (5 cols on lg) */}
      <section 
        className={`lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 md:p-12 relative z-10 ${
          theme === "dark" ? "bg-[#09090b]" : "bg-white"
        }`}
        id="login-interactive-pane"
      >
        {/* Top bar with Theme Toggle */}
        <div className="flex items-center justify-between mb-8 lg:mb-0" id="login-top-bar">
          <div className="block lg:hidden">
            <Cap190BrandLogo className="scale-90 origin-left" />
          </div>
          <div className="hidden lg:block" />

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                theme === "dark" 
                  ? "bg-zinc-900 border-zinc-800 text-[#F9D71C] hover:text-yellow-300 hover:border-zinc-700 hover:bg-zinc-850" 
                  : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-950 shadow-xs hover:border-zinc-300 hover:bg-zinc-50"
              }`}
              title={theme === "dark" ? "Mudar para Fundo Claro" : "Mudar para Fundo Escuro"}
              id="login-theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Main login interactive container */}
        <div className="my-auto max-w-md w-full mx-auto space-y-6" id="login-form-area">
          <div className="space-y-1.5">
            <h2 className={`text-2xl font-black uppercase tracking-tight ${
              theme === "dark" ? "text-white" : "text-zinc-950"
            }`}>
              Autenticação de Gabinete
            </h2>
            <p className={`text-xs font-bold ${
              theme === "dark" ? "text-zinc-400" : "text-zinc-500"
            }`}>
              Insira o seu email oficial do partido para aceder aos registos protegidos.
            </p>
          </div>

          {/* Error Indicator */}
          {error && (
            <div className={`p-4 rounded-lg border flex items-start gap-3 animate-in shake duration-300 ${
              theme === "dark" 
                ? "bg-red-950/40 border-red-800/50 text-red-200" 
                : "bg-red-50 border-red-200 text-red-900"
            }`} id="login-error-box">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-normal">
                <p className="text-[10px] font-black uppercase tracking-wider">Acesso Negado</p>
                <p className="text-[11px] font-bold">{error}</p>
              </div>
            </div>
          )}

          {/* Core Interactive Login Form */}
          <form onSubmit={handleLogin} className="space-y-4" id="login-form">
            
            {/* Input: Email Address */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-extrabold uppercase tracking-widest block ${
                theme === "dark" ? "text-zinc-400" : "text-zinc-500"
              }`}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@mpla.ao"
                  className={`w-full rounded-lg py-2.5 pl-11 pr-4 text-xs font-black transition-all outline-hidden border ${
                    theme === "dark" 
                      ? "bg-zinc-900/80 border-zinc-800 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-1 focus:ring-red-600" 
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 hover:border-zinc-300 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  }`}
                  id="login-input-email"
                />
              </div>
            </div>

            {/* Input: Password */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-extrabold uppercase tracking-widest block ${
                theme === "dark" ? "text-zinc-400" : "text-zinc-500"
              }`}>
                Password de Segurança
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-lg py-2.5 pl-11 pr-11 text-xs font-black transition-all outline-hidden border ${
                    theme === "dark" 
                      ? "bg-zinc-900/80 border-zinc-800 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-1 focus:ring-red-600" 
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 hover:border-zinc-300 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  }`}
                  id="login-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  id="toggle-pass-visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-black text-xs uppercase py-3 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all disabled:opacity-50 select-none mt-2"
              id="login-submit-btn"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-yellow-400" />
                  <span>Autenticar no Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer/Copyright block on right side */}
        <div className={`text-center text-[9px] font-mono font-bold tracking-tight uppercase pt-6 lg:pt-0 ${
          theme === "dark" ? "text-zinc-600" : "text-zinc-400"
        }`} id="login-copyright">
          © 2026 MPLA CAP-190 • SISTEMA DE GESTÃO INTEGRADA • LUANDA
        </div>
      </section>

    </div>
  );
}
