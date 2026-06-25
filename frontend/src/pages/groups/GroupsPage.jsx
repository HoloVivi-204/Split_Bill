import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  createGroup,
  createInvitation,
  deleteGroup,
  listGroups,
  listInvitations,
} from '../../api/group-core';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { getRoleLabel } from '../../constants/groupRoles';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency } from '../../utils/formatCurrency';

function getInvitationToken(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const invitePathMatch = trimmedValue.match(/\/invite\/([^/?#]+)/i);

  if (invitePathMatch) {
    try {
      return decodeURIComponent(invitePathMatch[1]);
    } catch {
      return '';
    }
  }

  return /^[a-zA-Z0-9_-]+$/.test(trimmedValue) ? trimmedValue : '';
}

export function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLeaderGroupId, setSelectedLeaderGroupId] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [isInvitationsLoading, setIsInvitationsLoading] = useState(false);
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState('');
  const [deleteNotices, setDeleteNotices] = useState({});
  const [reloadToken, setReloadToken] = useState(0);
  const [formState, setFormState] = useState({
    name: '',
    description: '',
  });
  const [inviteFormState, setInviteFormState] = useState({
    maxUses: '',
    expiresAt: '',
  });
  const [joinLink, setJoinLink] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadGroups() {
      try {
        setIsLoading(true);
        setLoadError('');
        const data = await listGroups();

        if (!isMounted) {
          return;
        }

        setGroups(data);
      } catch {
        if (!isMounted) {
          return;
        }

        setLoadError('Không thể tải danh sách nhóm. Vui lòng thử lại.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGroups();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  async function handleCreateGroup(event) {
    event.preventDefault();

    if (!formState.name.trim()) {
      toast.error('Tên nhóm là bắt buộc.');
      return;
    }

    try {
      setIsSubmitting(true);

      const createdGroup = await createGroup({
        name: formState.name.trim(),
        description: formState.description.trim(),
        currency: 'VND',
      });

      setGroups((currentGroups) => [createdGroup, ...currentGroups]);
      setSelectedLeaderGroupId(createdGroup.id);
      setInvitations([]);
      setFormState({
        name: '',
        description: '',
      });
      toast.success('Đã tạo nhóm mới.');
    } catch {
      toast.error('Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalBalance = groups.reduce((sum, group) => sum + (group.my_balance ?? 0), 0);
  const leaderGroups = groups.filter((group) => group.my_role === 'leader').length;
  const leaderOwnedGroups = groups.filter((group) => group.my_role === 'leader');

  useEffect(() => {
    if (leaderOwnedGroups.length === 0) {
      if (selectedLeaderGroupId !== '') {
        setSelectedLeaderGroupId('');
      }

      if (invitations.length > 0) {
        setInvitations([]);
      }

      return;
    }

    const selectedGroupStillExists = leaderOwnedGroups.some(
      (group) => group.id === selectedLeaderGroupId,
    );

    if (!selectedGroupStillExists) {
      setSelectedLeaderGroupId(leaderOwnedGroups[0].id);
    }
  }, [invitations.length, leaderOwnedGroups, selectedLeaderGroupId]);

  useEffect(() => {
    let isMounted = true;

    async function loadInvitations() {
      if (!selectedLeaderGroupId) {
        return;
      }

      try {
        setIsInvitationsLoading(true);
        const data = await listInvitations(selectedLeaderGroupId);

        if (!isMounted) {
          return;
        }

        setInvitations(data);
      } catch {
        if (isMounted) {
          toast.error('Không thể tải liên kết mời của nhóm này.');
        }
      } finally {
        if (isMounted) {
          setIsInvitationsLoading(false);
        }
      }
    }

    loadInvitations();

    return () => {
      isMounted = false;
    };
  }, [selectedLeaderGroupId]);

  async function handleCreateInvitation(event) {
    event.preventDefault();

    if (!selectedLeaderGroupId) {
      toast.error('Bạn cần là trưởng nhóm của ít nhất một nhóm để tạo lời mời.');
      return;
    }

    const payload = {};

    if (inviteFormState.maxUses.trim()) {
      payload.max_uses = Number(inviteFormState.maxUses);
    }

    if (inviteFormState.expiresAt.trim()) {
      payload.expires_at = new Date(inviteFormState.expiresAt).toISOString();
    }

    try {
      setIsCreatingInvitation(true);
      const invitation = await createInvitation(selectedLeaderGroupId, payload);

      setInvitations((currentInvitations) => [invitation, ...currentInvitations]);
      setInviteFormState({
        maxUses: '',
        expiresAt: '',
      });
      toast.success('Đã tạo liên kết mời mới.');
    } catch {
      toast.error('Không thể tạo liên kết mời.');
    } finally {
      setIsCreatingInvitation(false);
    }
  }

  function handleJoinLinkSubmit(event) {
    event.preventDefault();

    const token = getInvitationToken(joinLink);

    if (!token) {
      toast.error('Vui lòng nhập liên kết mời hợp lệ.');
      return;
    }

    navigate(`/invite/${encodeURIComponent(token)}`);
  }

  async function handleCopyInvitation(inviteUrl) {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Đã sao chép liên kết mời.');
    } catch {
      toast.error('Không thể sao chép liên kết mời.');
    }
  }

  async function handleDeleteGroup(group, step) {
    try {
      setDeletingGroupId(group.id);
      const data = await deleteGroup(group.id, {
        confirm: true,
        step,
      });

      if (data.pending_confirmation) {
        const notice = data.message ?? 'Yêu cầu xóa nhóm đã được gửi sang thư ký để xác nhận.';
        setDeleteNotices((currentNotices) => ({
          ...currentNotices,
          [group.id]: notice,
        }));
        toast.success(notice);
        return;
      }

      setGroups((currentGroups) => currentGroups.filter((item) => item.id !== group.id));
      setDeleteNotices((currentNotices) => {
        const nextNotices = { ...currentNotices };
        delete nextNotices[group.id];
        return nextNotices;
      });
      toast.success(data.message ?? 'Nhóm đã được xóa thành công.');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể xử lý yêu cầu xóa nhóm lúc này.');
      toast.error(message);
    } finally {
      setDeletingGroupId('');
    }
  }

  return (
    <PageContainer
      eyebrow="Nhóm"
      title="Không gian nhóm của bạn"
      description="Tạo nhóm mới, theo dõi vai trò hiện tại và mời thêm thành viên bằng liên kết riêng."
      variant="finance"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile
          label="Số nhóm đang tham gia"
          value={String(groups.length)}
          hint="Tổng số nhóm bạn đang có mặt."
        />
        <KpiTile
          label="Tổng số dư hiện tại"
          value={formatCurrency(totalBalance)}
          hint="Dương là bạn đang được nợ, âm là bạn đang nợ."
        />
        <KpiTile
          label="Nhóm bạn đang dẫn dắt"
          value={String(leaderGroups)}
          hint="Có thể tạo lời mời và quản lý thành viên."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard
          title="Danh sách nhóm"
          description="Mỗi nhóm hiển thị vai trò, mô tả ngắn và lối vào nhanh đến các màn quan trọng."
          tone="mint"
        >
          {isLoading ? (
            <div className="grid gap-3" aria-label="Đang tải danh sách nhóm">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-shimmer rounded-xl"
                />
              ))}
            </div>
          ) : loadError ? (
            <ErrorState
              message={loadError}
              onRetry={() => setReloadToken((value) => value + 1)}
              actionLabel="Tải lại"
              className="rounded-xl p-5"
            />
          ) : groups.length === 0 ? (
            <EmptyState
              title="Bạn chưa có nhóm nào"
              description="Tạo nhóm mới hoặc tham gia bằng lời mời để bắt đầu quản lý chi tiêu và quỹ chung."
            />
          ) : (
            <div className="grid gap-3">
              {groups.map((group) => (
                <article
                  key={group.id}
                  className="rounded-xl border border-[#d1fadf] bg-white/90 p-4 transition hover:border-[#61bc76] hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                      <p className="text-sm leading-6 text-slate-600">
                        {group.description || 'Nhóm này chưa có mô tả.'}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#d1fadf] bg-[#f7fdf9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0b7443]">
                      {getRoleLabel(group.my_role)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>{group.member_count} thành viên</span>
                    <span>{formatCurrency(group.my_balance ?? 0)}</span>
                    <span>{group.currency}</span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-wrap gap-3">
                      <Link to={`/groups/${group.id}`} className="app-button-secondary">
                        Mở tổng quan
                      </Link>
                      <Link to={`/groups/${group.id}/members`} className="app-button-muted">
                        Xem thành viên
                      </Link>

                      {group.my_role === 'leader' ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group, 'leader')}
                          disabled={deletingGroupId === group.id}
                          aria-label={`Tạo yêu cầu xóa nhóm ${group.name}`}
                          className="inline-flex rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {deletingGroupId === group.id ? 'Đang xử lý...' : 'Tạo yêu cầu xóa nhóm'}
                        </button>
                      ) : null}

                      {group.my_role === 'secretary' ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group, 'secretary')}
                          disabled={deletingGroupId === group.id}
                          aria-label={`Xác nhận xóa nhóm ${group.name}`}
                          className="inline-flex rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {deletingGroupId === group.id ? 'Đang xử lý...' : 'Xác nhận xóa nhóm'}
                        </button>
                      ) : null}
                    </div>

                    {group.my_role === 'leader' ? (
                      <div className="text-sm leading-6 text-slate-600">
                        Trưởng nhóm sẽ khởi tạo yêu cầu trước. Nếu nhóm có thư ký, hệ thống sẽ chờ
                        thư ký xác nhận bước cuối.
                      </div>
                    ) : null}

                    {group.my_role === 'secretary' ? (
                      <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                        Thư ký chỉ xác nhận bước cuối sau khi trưởng nhóm đã tạo yêu cầu xóa.
                      </div>
                    ) : null}

                    {deleteNotices[group.id] ? (
                      <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                        {deleteNotices[group.id]}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </SurfaceCard>

        <div className="grid gap-6">
          <SurfaceCard
            title="Tham gia nhóm"
            description="Dán liên kết mời được chia sẻ để xem thông tin nhóm trước khi tham gia."
            tone="mint"
          >
            <form className="grid gap-4" onSubmit={handleJoinLinkSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Liên kết mời
                <input
                  type="text"
                  value={joinLink}
                  onChange={(event) => setJoinLink(event.target.value)}
                  className="app-input"
                  placeholder="https://splitbill.app/invite/..."
                />
              </label>
              <button type="submit" className="app-button-secondary">
                Tham gia nhóm
              </button>
            </form>
          </SurfaceCard>

          <SurfaceCard
            title="Tạo nhóm mới"
            description="Người tạo nhóm sẽ trở thành trưởng nhóm và có thể mời thêm thành viên ngay sau đó."
            tone="soft"
          >
            <form className="grid gap-4" onSubmit={handleCreateGroup}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tên nhóm
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="app-input"
                  placeholder="Phòng trọ 5B"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Mô tả
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="app-input min-h-28"
                  placeholder="Quỹ phòng trọ tháng này"
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                Tiền tệ mặc định hiện tại là <span className="font-semibold text-slate-900">VND</span>.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="app-button-primary disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? 'Đang tạo nhóm...' : 'Tạo nhóm mới'}
              </button>
            </form>
          </SurfaceCard>

          <SurfaceCard
            title="Liên kết mời"
            description="Phần này chỉ xuất hiện khi bạn đang là trưởng nhóm của ít nhất một nhóm."
            tone="melon"
          >
            {leaderOwnedGroups.length === 0 ? (
              <p className="text-sm leading-6 text-slate-600">
                Tạo nhóm đầu tiên để bắt đầu tạo lời mời.
              </p>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Nhóm đang tạo lời mời
                  <select
                    value={selectedLeaderGroupId}
                    onChange={(event) => setSelectedLeaderGroupId(event.target.value)}
                    className="app-input"
                  >
                    {leaderOwnedGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>

                <form
                  className="grid gap-4 rounded-xl border border-[#d1fadf] bg-white/80 p-4"
                  onSubmit={handleCreateInvitation}
                >
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Số lượt tối đa
                    <input
                      type="number"
                      min="1"
                      value={inviteFormState.maxUses}
                      onChange={(event) =>
                        setInviteFormState((current) => ({
                          ...current,
                          maxUses: event.target.value,
                        }))
                      }
                      className="app-input"
                      placeholder="10"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Hết hạn lúc
                    <input
                      type="datetime-local"
                      value={inviteFormState.expiresAt}
                      onChange={(event) =>
                        setInviteFormState((current) => ({
                          ...current,
                          expiresAt: event.target.value,
                        }))
                      }
                      className="app-input"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isCreatingInvitation}
                    className="app-button-primary disabled:cursor-not-allowed disabled:bg-teal-300"
                  >
                    {isCreatingInvitation ? 'Đang tạo lời mời...' : 'Tạo liên kết mời'}
                  </button>
                </form>

                {isInvitationsLoading ? (
                  <div className="grid gap-3" aria-label="Đang tải liên kết mời">
                    {[0, 1].map((item) => (
                      <div
                        key={item}
                        className="h-20 animate-shimmer rounded-xl"
                      />
                    ))}
                  </div>
                ) : invitations.length === 0 ? (
                  <p className="text-sm text-slate-600">Chưa có liên kết mời nào cho nhóm này.</p>
                ) : (
                  <div className="grid gap-3">
                    {invitations.map((invitation) => (
                      <article
                        key={invitation.id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <p className="break-all text-sm font-medium text-slate-900">
                          {invitation.invite_url}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyInvitation(invitation.invite_url)}
                          className="mt-3 app-button-secondary"
                          aria-label="Sao chép liên kết mời"
                        >
                          Sao chép liên kết
                        </button>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                          <span>Đã dùng {invitation.use_count}</span>
                          <span>Tối đa {invitation.max_uses ?? 'Không giới hạn'}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </PageContainer>
  );
}
