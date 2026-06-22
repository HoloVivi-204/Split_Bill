import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="animate-fade-in max-w-md space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <SearchX size={28} strokeWidth={1.5} />
        </div>
        <p className="app-badge app-badge--neutral">404</p>
        <h1 className="text-2xl font-semibold text-slate-900">Không tìm thấy trang</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Liên kết này có thể đã thay đổi hoặc không còn khả dụng.
        </p>
        <Link to="/groups" className="app-button-primary">
          Về trang nhóm
        </Link>
      </div>
    </main>
  );
}
