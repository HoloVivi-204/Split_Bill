import { Outlet } from 'react-router-dom';
import { SplitBillLogo } from '../common/SplitBillLogo';

export function AuthLayout() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-white text-slate-900">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-auth-grain bg-[size:22px_22px] opacity-30" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] items-center px-4 py-8 sm:px-6 lg:px-10">
        {/* ── Left brand panel (desktop only) ── */}
        <section className="hidden w-[440px] shrink-0 pr-16 lg:block">
          <SplitBillLogo size="lg" />

          <div className="mt-10 space-y-4">
            <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900">
              Chia tiền rõ ràng,
              <br />
              giữ quỹ nhóm minh bạch.
            </h1>
            <p className="max-w-sm text-[15px] leading-7 text-slate-500">
              Theo dõi chi tiêu, số dư và đóng quỹ trong một nơi — để cả nhóm dễ thống nhất sau mỗi cuộc vui.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="mt-10 space-y-5">
            <FeatureItem
              emoji="💰"
              title="Chia tiền nhanh"
              desc="Chia đều, chia tùy chỉnh hoặc theo phần trăm."
            />
            <FeatureItem
              emoji="🏦"
              title="Quỹ nhóm"
              desc="Đóng quỹ, QR VietQR, theo dõi ai đóng-ai chưa."
            />
            <FeatureItem
              emoji="📊"
              title="Minh bạch"
              desc="Balance realtime, lịch sử chi tiêu đầy đủ."
            />
          </div>
        </section>

        {/* ── Right form panel ── */}
        <section className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[440px]">
            {/* Mobile-only logo */}
            <div className="mb-8 lg:hidden">
              <SplitBillLogo size="md" className="justify-center" />
              <p className="mt-3 text-center text-sm text-slate-500">
                Chia tiền nhóm & quản lý quỹ chung
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel sm:p-8">
              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureItem({ emoji, title, desc }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e1fdea] text-lg">
        {emoji}
      </span>
      <div>
        <p className="text-[14px] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{desc}</p>
      </div>
    </div>
  );
}
