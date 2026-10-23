import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, PlusCircle, Settings, LogOut, Command, LogIn, BarChart, ChevronDown, ChevronRight, User, ReceiptText, Wrench } from 'lucide-react';
import { RoutePath } from '../types';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC<{ isPinned?: boolean; onTogglePin?: () => void }> = ({ isPinned = false, onTogglePin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const { user, isAuthenticated, logout } = useAuth();
  
  const searchParams = new URLSearchParams(search);
  const currentTab = searchParams.get('tab') || 'executive';

  const [itDashboardOpen, setItDashboardOpen] = useState(pathname === RoutePath.IT_DASHBOARD || pathname === RoutePath.VENDORS);
  const [itToolsOpen, setItToolsOpen] = useState(
    pathname === RoutePath.NOTES || 
    pathname === RoutePath.MAIL_ASSISTANT ||
    pathname.startsWith('/mail') ||
    pathname.startsWith(RoutePath.INVOICES) || 
    (pathname.startsWith(RoutePath.NOTES) && pathname !== RoutePath.CREATE_NOTE)
  );

  const handleLogout = () => {
    logout();
    navigate(RoutePath.HOME);
  };

  const handleLogin = () => {
    navigate(RoutePath.LOGIN);
  };

  const navItems = [
    ...(user?.can_access_welcome !== false && user?.can_access_welcome !== 0 ? [{ icon: Home, label: 'Home', path: RoutePath.HOME }] : []),
    ...(user?.role === 'admin' || user?.role === 'owner' || user?.can_access_it === true || user?.can_access_it === 1 ? [
      { 
        icon: BarChart, 
        label: 'IT Dashboard', 
        path: RoutePath.IT_DASHBOARD,
        isOpen: itDashboardOpen,
        toggleOpen: () => {
          if (!getIsActive(RoutePath.IT_DASHBOARD, 'IT Dashboard') || currentTab !== 'executive') {
            navigate(RoutePath.IT_DASHBOARD);
            setItDashboardOpen(true);
          } else {
            setItDashboardOpen(!itDashboardOpen);
          }
        },
        subItems: [
          { label: 'Executive Summary', id: 'executive', path: `${RoutePath.IT_DASHBOARD}?tab=executive` },
          { label: 'Staffing', id: 'staffing', path: `${RoutePath.IT_DASHBOARD}?tab=staffing` },
          { label: 'Helpdesk', id: 'helpdesk', path: `${RoutePath.IT_DASHBOARD}?tab=helpdesk` },
          { label: 'Assets', id: 'assets', path: `${RoutePath.IT_DASHBOARD}?tab=assets` },
          { label: 'Cloud & HIS Subscription', id: 'subscriptions', path: `${RoutePath.IT_DASHBOARD}?tab=subscriptions` },
          { label: 'Vendor Management', id: 'vendors', path: RoutePath.VENDORS }
        ]
      },
      {
        icon: Wrench,
        label: 'IT Tools',
        path: RoutePath.MAIL_ASSISTANT,
        isOpen: itToolsOpen,
        toggleOpen: () => {
          if (!getIsActive(RoutePath.MAIL_ASSISTANT, 'IT Tools')) {
            navigate(RoutePath.MAIL_ASSISTANT);
            setItToolsOpen(true);
          } else {
            setItToolsOpen(!itToolsOpen);
          }
        },
        subItems: [
          { label: 'Mail Assistant', id: 'mail', path: RoutePath.MAIL_ASSISTANT },
          { label: 'IT Notes & Meetings', id: 'notes', path: RoutePath.NOTES },
          { label: 'Invoices', id: 'invoices', path: RoutePath.INVOICES }
        ]
      }
    ] : []),
    { icon: PlusCircle, label: 'Create Note', path: RoutePath.CREATE_NOTE },
    { icon: User, label: 'Account', path: RoutePath.ACCOUNT },
    ...(user?.role === 'admin' || user?.role === 'owner' || user?.can_access_it === true || user?.can_access_it === 1 ? [{ icon: Settings, label: 'Settings', path: RoutePath.SETTINGS }] : []),
  ];

  const getIsActive = (path: string, itemLabel?: string) => {
    if (itemLabel === 'IT Tools') {
      return (pathname.startsWith(RoutePath.NOTES) && pathname !== RoutePath.CREATE_NOTE) || 
             pathname.startsWith(RoutePath.INVOICES) ||
             pathname.startsWith(RoutePath.MAIL_ASSISTANT);
    }
    if (path === RoutePath.HOME) {
      return pathname === RoutePath.HOME;
    }
    if (path === RoutePath.NOTES) {
      return pathname.startsWith(RoutePath.NOTES) && pathname !== RoutePath.CREATE_NOTE;
    }
    if (path === RoutePath.CREATE_NOTE) {
      return pathname === RoutePath.CREATE_NOTE;
    }
    if (path === RoutePath.IT_DASHBOARD) {
      return pathname === RoutePath.IT_DASHBOARD || pathname === RoutePath.VENDORS;
    }
    return pathname.startsWith(path);
  };

  return (
    <aside 
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a')) return;
        if (onTogglePin) onTogglePin();
      }}
      className={`fixed left-0 top-0 z-40 h-screen border-r border-white/60 bg-white/45 backdrop-blur-2xl hidden md:flex md:flex-col shadow-[0_4px_15px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300 group ${isPinned ? 'w-64 cursor-default' : 'w-20 hover:w-64 cursor-pointer'}`}
    >
      <div className="flex h-24 items-center px-8 shrink-0">
        <div className="flex items-center gap-3 text-slate-900 font-bold tracking-tight group cursor-default">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-105 group-hover:rotate-3">
            <Command size={20} />
          </div>
          <span className={`text-xl tracking-tight text-slate-800 transition-opacity whitespace-nowrap overflow-hidden ${isPinned ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>AI Notes</span>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 overflow-y-auto hide-scrollbar">
        <nav className="space-y-2">
          {navItems.map((item: any) => {
            const isActive = getIsActive(item.path, item.label);
            
            if (item.subItems) {
              return (
                <div key={item.label} className="flex flex-col gap-1">
                  <button
                    onClick={item.toggleOpen}
                    className={`flex items-center justify-between rounded-full py-3.5 text-sm transition-all duration-300 ${isPinned ? 'px-5' : 'px-3 md:group-hover:px-5'} ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-[0_4px_15px_rgba(129,140,248,0.25)] translate-x-1'
                        : 'text-slate-600 font-medium hover:bg-white/50 hover:text-slate-900 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span className={`transition-opacity whitespace-nowrap overflow-hidden flex-1 text-left ${isPinned ? 'opacity-100 w-auto' : 'opacity-0 md:group-hover:opacity-100 w-0 md:group-hover:w-auto'}`}>{item.label}</span>
                    </div>
                    <div className={`transition-opacity shrink-0 ${isPinned ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                      {item.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>
                  
                  {isActive && item.isOpen && (
                    <div className="pl-6 pr-2 py-2 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                      {item.subItems.map((subItem: any) => {
                        const isSubActive = subItem.path 
                          ? (subItem.path.includes('?tab=') 
                              ? pathname === subItem.path.split('?')[0] && currentTab === subItem.id 
                              : (subItem.path === RoutePath.NOTES 
                                  ? pathname.startsWith(RoutePath.NOTES) && pathname !== RoutePath.CREATE_NOTE 
                                  : pathname.startsWith(subItem.path)))
                          : currentTab === subItem.id;
                        return (
                          <Link
                            key={subItem.id}
                            to={subItem.path || `${item.path}?tab=${subItem.id}`}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 whitespace-nowrap overflow-hidden ${isPinned ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} ${
                              isSubActive 
                                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm border border-indigo-100/50' 
                                : 'text-slate-500 font-medium hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            <span className="truncate">{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-full py-3.5 text-sm transition-all duration-300 ${isPinned ? 'px-5' : 'px-3 md:group-hover:px-5'} ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-[0_4px_15px_rgba(129,140,248,0.25)] translate-x-1'
                    : 'text-slate-600 font-medium hover:bg-white/50 hover:text-slate-900 hover:translate-x-1'
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span className={`transition-opacity whitespace-nowrap overflow-hidden ${isPinned ? 'opacity-100 w-auto' : 'opacity-0 md:group-hover:opacity-100 w-0 md:group-hover:w-auto'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-white/30 shrink-0">
        {isAuthenticated ? (
            <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-full py-3.5 text-sm font-medium text-slate-600 hover:bg-white/50 hover:text-red-600 transition-all hover:shadow-sm ${isPinned ? 'px-5' : 'px-3 md:group-hover:px-5'}`}
            >
            <LogOut size={20} strokeWidth={2} className="opacity-70 shrink-0" />
            <span className={`transition-opacity whitespace-nowrap overflow-hidden ${isPinned ? 'opacity-100 w-auto' : 'opacity-0 md:group-hover:opacity-100 w-0 md:group-hover:w-auto'}`}>Sign Out</span>
            </button>
        ) : (
            <button
            onClick={handleLogin}
            className={`flex w-full items-center gap-3 rounded-full py-3.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all shadow-sm ${isPinned ? 'px-5' : 'px-3 md:group-hover:px-5'}`}
            >
            <LogIn size={20} strokeWidth={2} className="opacity-70 shrink-0" />
            <span className={`transition-opacity whitespace-nowrap overflow-hidden ${isPinned ? 'opacity-100 w-auto' : 'opacity-0 md:group-hover:opacity-100 w-0 md:group-hover:w-auto'}`}>Sign In</span>
            </button>
        )}
      </div>
    </aside>
  );
};