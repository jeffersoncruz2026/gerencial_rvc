import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileSpreadsheet,
  GitCompareArrows,
  BarChart3,
  BookOpen,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Layers,
  Tags,
  LogIn,
  LogOut,
  Shield,
} from 'lucide-react';
import logoRvc from '@/assets/logo-rvc.png';
import { useAuth } from '@/hooks/useAuth';

const publicNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/balanco', icon: FileSpreadsheet, label: 'Balanço Patrimonial' },
  { to: '/dre', icon: BarChart3, label: 'DRE' },
  { to: '/faturamento', icon: TrendingUp, label: 'Faturamento' },
  { to: '/analise-custos', icon: Layers, label: 'Análise de Custos' },
];

const adminNavItems = [
  { to: '/plano-contas', icon: BookOpen, label: 'Plano de Contas' },
  { to: '/de-para', icon: GitCompareArrows, label: 'De/Para' },
  { to: '/upload-balancete', icon: Upload, label: 'Upload Balancete' },
  { to: '/upload-custos', icon: Receipt, label: 'Upload Custos' },
  { to: '/upload-classificacao', icon: Tags, label: 'Classificação Custos' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const navItems = isAdmin ? [...publicNavItems, ...adminNavItems] : publicNavItems;

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Sidebar */}
      <aside
        className={`flex flex-col print:hidden bg-sidebar text-sidebar-foreground transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <img src={logoRvc} alt="RVC" className="h-8 w-auto object-contain flex-shrink-0" />
          {!collapsed && (
            <span className="font-bold text-base text-sidebar-foreground tracking-tight">
              RVC FM
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Admin section label */}
          {isAdmin && !collapsed && (
            <div className="pt-3 pb-1 px-3">
              <div className="flex items-center gap-2 text-xs text-sidebar-muted uppercase tracking-wider">
                <Shield className="w-3 h-3" />
                Admin
              </div>
            </div>
          )}
        </nav>

        {/* Auth actions */}
        <div className="border-t border-sidebar-border">
          {user ? (
            <button
              onClick={async () => { await signOut(); navigate('/'); }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm text-sidebar-muted hover:text-sidebar-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm text-sidebar-muted hover:text-sidebar-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Admin</span>}
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto print:overflow-visible">
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
