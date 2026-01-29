'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  SendDiagonal,
  Group,
  WarningTriangle,
  ClipboardCheck,
  LogOut,
  Settings,
  Menu,
  Xmark,
  StatsUpSquare,
} from 'iconoir-react';
import { useAdminStore } from '@/stores/admin-store';
import { AdminRole } from '@/services/admin-api';
import LoadingPanel from '@/components/LoadingPanel';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRoles: AdminRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: <Home className="w-5 h-5" />,
    requiredRoles: [AdminRole.SUPPORT, AdminRole.MODERATOR, AdminRole.SUPER_ADMIN],
  },
  {
    label: 'Transfers',
    href: '/admin/transfers',
    icon: <SendDiagonal className="w-5 h-5" />,
    requiredRoles: [AdminRole.SUPPORT, AdminRole.MODERATOR, AdminRole.SUPER_ADMIN],
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: <Group className="w-5 h-5" />,
    requiredRoles: [AdminRole.SUPPORT, AdminRole.MODERATOR, AdminRole.SUPER_ADMIN],
  },
  {
    label: 'Disputes',
    href: '/admin/disputes',
    icon: <WarningTriangle className="w-5 h-5" />,
    requiredRoles: [AdminRole.MODERATOR, AdminRole.SUPER_ADMIN],
  },
  {
    label: 'Polls',
    href: '/admin/polls',
    icon: <StatsUpSquare className="w-5 h-5" />,
    requiredRoles: [AdminRole.MODERATOR, AdminRole.SUPER_ADMIN],
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: <ClipboardCheck className="w-5 h-5" />,
    requiredRoles: [AdminRole.SUPER_ADMIN],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, isAuthenticated, isLoading, checkAuth, logout, canAccessRoute } = useAdminStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to login if not authenticated (except on login page)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingPanel message="Loading..." />
      </div>
    );
  }

  // For login page, just render children without layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // If not authenticated and not on login, don't render anything (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const filteredNavItems = navItems.filter((item) =>
    canAccessRoute(item.requiredRoles)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#5E53E0]">ZeFile</span>
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">Admin</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <Xmark className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#5E53E0] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 bg-[#5E53E0] rounded-full flex items-center justify-center text-white font-medium">
              {admin?.firstName?.[0]}{admin?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {admin?.firstName} {admin?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                {admin?.role}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/settings"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {navItems.find((item) =>
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))
            )?.label || 'Admin'}
          </h1>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
