import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Wallet } from 'lucide-react';

import { useAuthBootstrap } from './hooks/useAuthBootstrap';
import { useAuthStore } from './stores/authStore';
import { Spinner } from './components/common/Spinner';
import {
  applyAppearanceMode,
  getStoredAppearanceMode,
  subscribeToSystemAppearance,
} from './utils/appearance';

export function App() {
  useAuthBootstrap();

  const authResolved = useAuthStore((state) => state.authResolved);

  useEffect(() => {
    applyAppearanceMode(getStoredAppearanceMode());

    return subscribeToSystemAppearance(() => {
      if (getStoredAppearanceMode() === 'system') {
        applyAppearanceMode('system');
      }
    });
  }, []);

  if (!authResolved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="animate-fade-in space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b7443] text-white">
            <Wallet size={22} strokeWidth={2} />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">SplitBill</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <Spinner size={14} />
            <span>Đang khôi phục phiên làm việc…</span>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

export default App;
