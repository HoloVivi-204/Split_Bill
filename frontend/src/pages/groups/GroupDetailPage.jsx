import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { deleteInvitation, getGroupDetail, listGroupMembers, listInvitations } from '../../api/group-core';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { getRoleLabel } from '../../constants/groupRoles';
import { getApiErrorMessage } from '../../utils/apiError';

function formatInvitationMeta(invitation) {
  const usageText = invitation.max_uses
    ? `${invitation.use_count}/${invitation.max_uses} lượt`
    : `${invitation.use_count} lượt đã dùng`;

  if (!invitation.expires_at) {
    return `${usageText} - Không thời hạn`;
  }

  const expiresAt = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(invitation.expires_at));

  return `${usageText} - Hết hạn ${expiresAt}`;
}

function MemberAvatar({ member, groupId }) {
  return (
    <UserAvatar
      avatarUrl={member.avatar_url}
      userId={member.user_id}
      groupId={groupId}
      displayName={member.display_name || member.user_id || 'Thành viên'}
      size="md"
    />
  );
}

export function GroupDetailPage() {
  const { id = '' } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setIsLoading(true);
        setLoadError('');

        const [groupData, membersData] = await Promise.all([
          getGroupDetail(id),
          listGroupMembers(id),
        ]);
        const invitationsData = groupData?.my_role === 'leader' ? await listInvitations(id) : [];

        if (cancelled) {
          return;
        }

        setGroup(groupData);
        setMembers(membersData);
        setInvitations(invitationsData);
      } catch (error) {
        if (!cancelled) {
          const message = getApiErrorMessage(error, 'Không tải được tổng quan nhóm.');
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active'),
    [members],
  );
  const previewMembers = useMemo(() => activeMembers.slice(0, 3), [activeMembers]);

  async function handleCopyInvitation(inviteUrl) {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Đã sao chép liên kết mời.');
    } catch {
      toast.error('Không thể sao chép liên kết mời.');
    }
  }

  async function handleDeleteInvitation(invitationId) {
    try {
      await deleteInvitation(id, invitationId);
      setInvitations((currentInvitations) =>
        currentInvitations.filter((invitation) => invitation.id !== invitationId),
      );
      toast.success('Đã thu hồi liên kết mời.');
    } catch {
      toast.error('Không thể thu hồi liên kết mời.');
    }
  }

  return (
    <PageContainer
      eyebrow="Chi tiết nhóm"
      title="Tổng quan nhóm"
      description="Màn hình trung tâm để xem thông tin quan trọng của một nhóm trước khi đi sang thành viên, chi tiêu hoặc quỹ."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            to="/groups"
            className="rounded-xl app-button-secondary"
          >
            Về danh sách nhóm
          </Link>
          <Link
            to={`/groups/${id}/members`}
            className="rounded-xl app-button-primary"
          >
            Mở trang thành viên
          </Link>
          <Link
            to={`/groups/${id}/stats`}
            className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#61bc76] hover:bg-white"
          >
            Xem thống kê
          </Link>
        </div>
      }
    >
      {isLoading ? (
        <SurfaceCard title="Đang tải tổng quan nhóm">
          <div className="grid gap-3" aria-label="Đang tải tổng quan nhóm">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 animate-shimmer rounded-xl"
              />
            ))}
          </div>
        </SurfaceCard>
      ) : loadError ? (
        <SurfaceCard title="Không tải được tổng quan">
          <ErrorState
            message={loadError}
            onRetry={() => setReloadToken((value) => value + 1)}
            actionLabel="Tải lại tổng quan"
          />
        </SurfaceCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Tổng thành viên"
              value={String(group?.member_count ?? members.length)}
              hint="Bao gồm cả thành viên đã rời nhóm."
            />
            <KpiTile
              label="Thành viên hoạt động"
              value={String(activeMembers.length)}
              hint="Chỉ tính thành viên đang hoạt động."
            />
            <KpiTile
              label="Campaign đang mở"
              value={String(group?.active_campaigns_count ?? 0)}
              hint="Số đợt thu quỹ chưa đóng."
            />
            <KpiTile
              label="QR quỹ"
              value={group?.has_qr ? 'Đã bật' : 'Chưa bật'}
              hint={`Vai trò của bạn: ${getRoleLabel(group?.my_role) ?? 'Thành viên'}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <SurfaceCard
              title={group?.name || 'Chi tiết nhóm'}
              description={group?.description || 'Chưa có mô tả cho nhóm này.'}
            >
              <div className="grid gap-5">
                <div className="rounded-xl border border-[#d1fadf] bg-[radial-gradient(circle_at_top_left,_rgba(225,253,234,0.95),_rgba(255,255,255,0.98)_62%)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0b7443]">
                    Giới thiệu nhóm
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                    {group?.name}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    {group?.description ||
                      'Nhóm này chưa có mô tả. Trưởng nhóm có thể bổ sung để thành viên mới hiểu rõ hơn.'}
                  </p>
                </div>

                <div>
                  <div className="rounded-xl bg-[#eceff4] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Thông tin nhóm
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-4">
                        <dt>Đơn vị tiền tệ</dt>
                        <dd className="font-semibold text-slate-900">
                          {group?.currency || 'VND'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt>Vai trò của bạn</dt>
                        <dd className="font-semibold text-slate-900">
                          {getRoleLabel(group?.my_role) ?? 'Thành viên'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt>Danh sách thành viên</dt>
                        <dd className="font-semibold text-slate-900">
                          {activeMembers.length} hoạt động / {group?.member_count ?? members.length} tổng
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </SurfaceCard>

            <div className="grid gap-6">
              <SurfaceCard
                title="Tóm tắt thành viên"
                description="Hiển thị nhanh một vài thành viên đang hoạt động trong nhóm."
              >
                {previewMembers.length === 0 ? (
                  <EmptyState
                    title="Chưa có thành viên active"
                    description="Danh sách thành viên sẽ hiện ở đây ngay khi nhóm có thành viên còn hoạt động."
                  />
                ) : (
                  <div className="grid gap-3">
                    {previewMembers.map((member) => (
                      <article
                        key={member.user_id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={member} groupId={id} />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {member.display_name || member.user_id}
                            </p>
                            <p className="text-sm text-slate-600">
                              {getRoleLabel(member.role)}
                            </p>
                          </div>
                        </div>
                        <span className="app-badge app-badge--fern">
                          Đang hoạt động
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </SurfaceCard>

              {group?.my_role === 'leader' ? (
                <SurfaceCard
                  title="Liên kết mời đang mở"
                  description="Các liên kết mời đang còn hiệu lực."
                >
                  {invitations.length === 0 ? (
                    <EmptyState
                      title="Chưa có liên kết mời nào"
                      description="Quay lại danh sách nhóm để tạo liên kết mời đầu tiên."
                    />
                  ) : (
                    <div className="grid gap-3">
                      {invitations.slice(0, 3).map((invitation) => (
                        <article
                          key={invitation.id}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <p className="break-all text-sm font-medium text-slate-900">
                            {invitation.invite_url}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {formatInvitationMeta(invitation)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyInvitation(invitation.invite_url)}
                              className="app-button-secondary"
                              aria-label={`Sao chép liên kết mời ${invitation.invite_url}`}
                            >
                              Sao chép
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              className="app-button-danger"
                              aria-label={`Thu hồi liên kết mời ${invitation.invite_url}`}
                            >
                              Thu hồi
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </SurfaceCard>
              ) : null}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
