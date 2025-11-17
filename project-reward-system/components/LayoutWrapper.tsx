'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useSidebarStore } from '@/lib/sidebar-store';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const { isCollapsed } = useSidebarStore();

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main
        className={`flex-1 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        } min-h-screen bg-gray-50 transition-all duration-300`}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
