/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  PieChart, 
  TrendingUp, 
  FileText, 
  HelpCircle,
  Quote,
  Menu,
  ChevronLeft,
  ChevronRight,
  Calendar
} from "lucide-react";
import { ActiveTab } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole?: string;
}

export function Sidebar({ activeTab, setActiveTab, userRole = "Administrador" }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Keep the menu minimized by default; the user opens it explicitly.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = [
    { id: "DASHBOARD" as ActiveTab, label: "DASHBOARD", icon: LayoutDashboard },
    { id: "MILITANTES" as ActiveTab, label: "MILITANTES", icon: Users },
    { id: "QUOTAS" as ActiveTab, label: "QUOTAS", icon: Receipt },
    { id: "INDICADORES" as ActiveTab, label: "INDICADORES", icon: PieChart },
    { id: "CRESCIMENTO" as ActiveTab, label: "CRESCIMENTO", icon: TrendingUp },
    { id: "PLANEAMENTO" as ActiveTab, label: "ACTIVIDADES", icon: Calendar },
    { id: "RELATORIOS" as ActiveTab, label: "RELATÓRIOS", icon: FileText },
    { id: "INSTRUCOES" as ActiveTab, label: "INSTRUÇÕES", icon: HelpCircle },
  ].filter(item => {
    if (userRole === "Tesoureiro") {
      return item.id === "DASHBOARD" || item.id === "MILITANTES" || item.id === "QUOTAS" || item.id === "RELATORIOS";
    }
    if (userRole === "Secretário") {
      return item.id === "DASHBOARD" || item.id === "MILITANTES" || item.id === "RELATORIOS";
    }
    return true; // Administrador
  });

  return (
    <aside 
      className={`bg-white text-zinc-800 flex flex-col border-r border-zinc-200 shrink-0 select-none transition-all duration-300 ease-in-out z-20 md:h-full ${
        isCollapsed ? "w-full md:w-16" : "w-full md:w-64"
      }`} 
      id="sidebar-container"
    >
      {/* Sidebar Header */}
      <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between min-h-[49px]" id="sidebar-header">
        <span className={`text-[10px] md:text-xs font-black tracking-widest text-zinc-500 uppercase transition-all duration-300 ${
          isCollapsed ? "opacity-100 md:opacity-0 md:w-0 md:h-0 overflow-hidden" : "opacity-100"
        }`}>
          MENU PRINCIPAL
        </span>
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <span className="flex h-2 w-2 relative hidden md:inline-flex">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8102E]/30 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8102E]"></span>
            </span>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-zinc-100 text-[#C8102E] rounded transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
            title={isCollapsed ? "Expandir Menu" : "Minimizar Menu"}
            id="sidebar-toggle-btn"
          >
            {/* Show hamburger icon on mobile, chevron left/right on desktop */}
            <Menu className="w-4 h-4 md:hidden" />
            <div className="hidden md:block">
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav 
        className={`p-3 space-y-1.5 transition-all duration-300 flex-1 overflow-y-auto ${
          isCollapsed ? "hidden md:block" : "block"
        }`} 
        id="sidebar-nav"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                // Auto collapse on mobile when user taps an item
                if (window.innerWidth < 768) {
                  setIsCollapsed(true);
                }
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-xs font-bold tracking-wider rounded-lg transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#C8102E] text-white shadow-sm font-black"
                  : "text-zinc-600 hover:text-[#C8102E] hover:bg-rose-50/50"
              } ${isCollapsed ? "md:justify-center md:px-2" : "md:translate-x-1"}`}
              title={item.label}
              id={`sidebar-btn-${item.id.toLowerCase()}`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                isActive ? "text-[#F9D71C] scale-110" : "text-zinc-400 group-hover:text-[#C8102E]"
              }`} />
              <span className={`transition-all duration-300 ${
                isCollapsed ? "opacity-0 md:hidden" : "opacity-100 inline"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Slogan Quote Box at Bottom */}
      <div 
        className={`p-4 border-t border-zinc-100 bg-zinc-50/50 transition-all duration-300 ${
          isCollapsed ? "hidden md:hidden" : "block"
        }`} 
        id="sidebar-footer"
      >
        <div className="bg-white p-3.5 rounded-lg border border-zinc-200 relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-5 pointer-events-none text-zinc-400">
            <Quote className="w-16 h-16 transform rotate-180" />
          </div>
          
          <div className="flex gap-2.5">
            <Quote className="w-4 h-4 text-[#C8102E] shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-600 leading-relaxed font-medium italic">
              O MPLA é o Partido da Libertação Nacional, da Unidade Nacional e do Progresso Social.
            </p>
          </div>
          
          <div className="mt-2.5 pt-2 border-t border-zinc-100 text-right">
            <span className="text-[10px] font-black tracking-widest text-[#C8102E] uppercase block">
              MPLA SEMPRE!
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
