/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserSession, AppNotification } from "../types";
import { LogOut, User, Bell, CheckCheck, Trash2, Sun, Moon } from "lucide-react";
import angolaFlagImage from "../image/images.png";
import mplaCrestImage from "../image/MPLA(logo).png";

interface HeaderProps {
  userSession?: UserSession;
  onLogout?: () => void;
  notifications?: AppNotification[];
  onMarkAllAsRead?: () => void;
  onClearNotifications?: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}


// Beautiful SVG Angola Flag Component
export function AngolaFlagSvg({ className = "w-24 h-16" }: { className?: string }) {
  return (
    <img
      src={angolaFlagImage}
      alt="Bandeira de Angola"
      className={`${className} shadow-md rounded overflow-hidden object-cover`}
      id="angola-flag"
    />
  );
}

// Beautiful MPLA Circle Logo Component
export function MplaLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <div className={`${className} bg-black rounded-full border-2 border-[#F9D71C] flex items-center justify-center p-1 shadow-lg overflow-hidden shrink-0`} id="mpla-circle-logo">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Red / Black divided circle */}
        <path d="M 10,50 A 40,40 0 0,1 90,50 Z" fill="#D81E05" />
        <path d="M 90,50 A 40,40 0 0,1 10,50 Z" fill="#000000" />
        
        {/* Yellow Star in center */}
        <polygon 
          points="50,32 54,43 65,43 56,50 60,61 50,54 40,61 44,50 35,43 46,43" 
          fill="#F9D71C" 
        />
        
        {/* Texts around outer border */}
        <path id="text-path-top" d="M 15,50 A 35,35 0 0,1 85,50" fill="none" />
        <path id="text-path-bottom" d="M 85,50 A 35,35 0 0,1 15,50" fill="none" />
        
        <text className="font-sans" fontSize="6.5" fontWeight="bold" fill="#F9D71C" letterSpacing="1">
          <textPath href="#text-path-top" startOffset="50%" textAnchor="middle">
            MPLA
          </textPath>
        </text>
        <text className="font-sans" fontSize="6.5" fontWeight="bold" fill="#F9D71C" letterSpacing="1">
          <textPath href="#text-path-bottom" startOffset="50%" textAnchor="middle">
            CAP-190
          </textPath>
        </text>
      </svg>
    </div>
  );
}

// Official Vector representation of the MPLA Crest from user logos
export function MplaCrestSvg({ className = "w-12 h-14" }: { className?: string }) {
  return (
    <img
      src={mplaCrestImage}
      alt="Logotipo do MPLA"
      className={`${className} object-contain`}
      id="mpla-crest-svg"
    />
  );
}

// Unified Official CAP-190 Brand Logo Component (combines Crest, Bold Name with Yellow Star in 'A' and Location tag)
export function Cap190BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} id="cap-190-official-brand-logo">
      {/* The beautiful MPLA Crest */}
      <MplaCrestSvg className="w-11 h-13 sm:w-12 sm:h-14 shrink-0 drop-shadow-xs" />
      
      {/* CAP 190 text part */}
      <div className="flex flex-col items-start leading-none">
        <div className="relative flex items-center">
          <span className="text-2xl sm:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-800 via-red-600 to-red-700 uppercase select-none font-sans relative flex items-center">
            C
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-red-600 px-0.5">
              A
              {/* Overlay yellow star in center of A */}
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none pb-0.5 sm:pb-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F9D71C] fill-[#F9D71C] drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] animate-pulse">
                  <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                </svg>
              </span>
            </span>
            P 190
          </span>
        </div>
        
        {/* DISTRICT/LOCATION Box */}
        <div className="mt-0.5 bg-black text-[#F9D71C] border border-[#F9D71C] px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">
          INGOMBOTA
        </div>
      </div>
    </div>
  );
}

export function Header({ 
  userSession, 
  onLogout, 
  notifications = [], 
  onMarkAllAsRead, 
  onClearNotifications,
  theme = "light",
  onToggleTheme
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="select-none relative flex flex-col w-full border-b border-zinc-200" id="app-header">
      {/* Top red bar conforming to image colors */}
      <div className="bg-[#C8102E] text-white py-1.5 px-3 md:px-5 flex items-center justify-between z-10 text-[10px] font-bold" id="header-top-bar">
        <div className="flex items-center gap-3">
          <span className="font-sans font-black tracking-widest">EN <span className="text-[#F9D71C]">PT</span></span>
          <span className="text-white/30 font-light">|</span>
          <span className="text-white/90 uppercase tracking-widest hidden sm:inline-block">Comité de Acção do Partido (CAP 190)</span>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="text-[9px] text-white/80 font-black uppercase tracking-wider hidden md:inline-block">Unidade • Trabalho • Disciplina</span>
          <span className="text-white/30 font-light hidden md:inline-block">|</span>
          <div className="flex items-center gap-1 text-[#F9D71C] font-black tracking-widest">
            <span>MPLA SEMPRE!</span>
          </div>
        </div>
      </div>

      {/* Main white body bar */}
      <div className="bg-white text-zinc-900 py-3 px-3 md:px-5 border-b border-zinc-100 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 z-10 relative">
          
          {/* Left + Middle Combo for Mobile (Horizontal Flow) */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3 border-b border-zinc-100 pb-2 md:pb-0 md:border-none" id="header-left-mid-compact">
            <div className="flex items-center gap-3">
              {/* Flags/Logos - scaled down to be compact and elegant */}
              <AngolaFlagSvg className="w-12 h-8 sm:w-16 sm:h-11 shadow-xs shrink-0 border border-zinc-200" />
              <Cap190BrandLogo className="shrink-0" />
              
              {/* Title block - hidden on smaller screens, shown on desktop */}
              <div className="hidden lg:block text-left leading-tight pl-3 border-l border-zinc-200">
                <h2 className="text-[10px] text-zinc-800 font-black tracking-widest uppercase">
                  COMITÉ DE ACÇÃO DO PARTIDO
                </h2>
                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  Unidade, Trabalho e Disciplina
                </p>
              </div>
            </div>

            {/* Mobile indicator for Location */}
            <div className="text-right leading-none md:hidden shrink-0 pr-1">
              <span className="text-[10px] font-black text-[#C8102E] block uppercase tracking-wide">CAP-190</span>
              <span className="text-[8px] text-zinc-500 block font-mono">INGOMBOTA</span>
            </div>
          </div>

          {/* Right side: Actions, Slogan card, and profile. Compact and aligned */}
          <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto" id="header-right-compact">
            
            {/* Slogan pill (hidden on mobile to avoid clutter, visible on tablet/desktop) */}
            <div className="hidden sm:flex items-center gap-1.5 bg-rose-50 px-2.5 py-1.5 rounded-md border border-rose-100 shadow-xs shrink-0">
              <span className="text-[9px] text-[#C8102E] font-black tracking-wide uppercase">
                A força do povo, a força do futuro!
              </span>
            </div>

            {/* Actions & User Profile row */}
            {userSession && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                
                {/* Theme Toggle Button */}
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    className="p-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 hover:text-[#C8102E] hover:border-[#C8102E]/30 hover:bg-rose-50 transition-all cursor-pointer focus:outline-none shadow-xs flex items-center justify-center shrink-0"
                    title={theme === "dark" ? "Mudar para Fundo Claro" : "Mudar para Fundo Escuro"}
                    id="header-theme-toggle"
                  >
                    {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Notification Bell Container */}
                <div className="relative shrink-0" id="notification-bell-container">
                  <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 hover:text-[#C8102E] hover:border-[#C8102E]/30 hover:bg-rose-50 transition-all cursor-pointer focus:outline-none shadow-xs flex items-center justify-center"
                    title="Notificações e Alertas"
                    id="header-notif-bell-btn"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#C8102E] text-white rounded-full text-[8px] font-black h-3.5 w-3.5 flex items-center justify-center border border-white animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown panel */}
                  {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden z-50 text-xs font-bold text-zinc-700 animate-in fade-in slide-in-from-top-3 duration-200">
                      <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-200 flex items-center justify-between">
                        <span className="text-[9px] font-black tracking-widest uppercase text-[#C8102E]">
                          Notificações ({notifications.length})
                        </span>
                        <div className="flex items-center gap-1.5">
                          {unreadCount > 0 && onMarkAllAsRead && (
                            <button 
                              onClick={() => { onMarkAllAsRead(); setIsOpen(false); }}
                              className="text-[8px] text-zinc-500 hover:text-zinc-900 flex items-center gap-0.5 cursor-pointer"
                              title="Lidas"
                            >
                              <CheckCheck className="w-2.5 h-2.5 text-emerald-500" />
                              <span>Lidas</span>
                            </button>
                          )}
                          {notifications.length > 0 && onClearNotifications && (
                            <button 
                              onClick={() => { onClearNotifications(); setIsOpen(false); }}
                              className="text-[8px] text-zinc-500 hover:text-red-600 flex items-center gap-0.5 cursor-pointer"
                              title="Limpar"
                            >
                              <Trash2 className="w-2.5 h-2.5 text-red-500" />
                              <span>Limpar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100" id="notification-list-scroll">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-zinc-400 font-medium">
                            Nenhum alerta ou notificação recente.
                          </div>
                        ) : (
                          notifications.slice(0, 10).map(notif => (
                            <div 
                              key={notif.id} 
                              className={`p-2.5 transition-colors ${notif.read ? "bg-zinc-50/50 opacity-60" : "bg-white hover:bg-zinc-50"}`}
                            >
                              <div className="flex gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                                  notif.type === "success" ? "bg-emerald-500" :
                                  notif.type === "warning" ? "bg-amber-500" :
                                  notif.type === "error" ? "bg-red-500" : "bg-blue-500"
                                }`} />
                                <div className="space-y-0.5 flex-1 min-w-0 text-left">
                                  <p className="font-extrabold text-zinc-800 truncate text-[10px] uppercase tracking-wide">
                                    {notif.title}
                                  </p>
                                  <p className="font-medium text-[9px] text-zinc-500 leading-snug break-words">
                                    {notif.message}
                                  </p>
                                  <span className="text-[7px] font-mono text-zinc-400 block font-bold pt-0.5">
                                    {notif.timestamp}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Widget - compact, with adaptive layout */}
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 p-1 px-2.5 rounded-lg shadow-inner text-left shrink-0 max-w-[200px]" id="user-header-profile">
                  <div className="bg-rose-50 text-[#C8102E] p-1 rounded border border-rose-100 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-[#C8102E]" />
                  </div>
                  <div className="leading-none flex-1 min-w-[70px] max-w-[100px] truncate">
                    <span className="text-[9px] font-black text-zinc-800 block truncate uppercase">{userSession.nome}</span>
                    <span className="text-[7px] font-black text-[#C8102E] uppercase tracking-wider block mt-0.5 truncate">{userSession.role}</span>
                  </div>
                  {onLogout && (
                    <button 
                      onClick={onLogout}
                      className="hover:bg-rose-50 text-zinc-400 hover:text-[#C8102E] p-1 rounded transition-colors cursor-pointer shrink-0 ml-1"
                      title="Terminar Sessão"
                      id="header-logout-btn"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* Location box on desktop/tablet only */}
            <div className="hidden md:flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg shadow-xs shrink-0">
              <svg className="w-3.5 h-3.5 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div className="text-left leading-none">
                <span className="text-[10px] font-black text-zinc-800 block">CAP-190</span>
                <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider block">Ingombota - Luanda</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
