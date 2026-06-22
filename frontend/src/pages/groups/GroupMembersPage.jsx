import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  getGroupDetail,
  kickGroupMember,
  listGroupMembers,
  listLeaveRequests,
  processLeaveRequest,
  requestLeaveGroup,
  transferLeader,
  updateGroupMemberRole,
} from '../../api/groups';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useAuthStore } from '../../stores/authStore';

const roleLabels = {
  leader: 'Trưởng nhóm',
  secretary: 'Thư ký',
  member: 'Thành viên',
};

const statusLabels = {
  active: 'Đang hoạt động',
  left: 'Đã rời nhóm',
  kicked: 'Đã bị mời ra',
};

function formatDate(value) {
  if (!value) {
    return 'Chưa rõ';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function MemberAvatar({ member, groupId, size = 'md', className = '' }) {
  return (
    <UserAvatar
      avatarUrl={member.avatar_url}
      userId={member.user_id}
      groupId={groupId}
      displayName={member.display_name || member.user_id || 'Thành viên'}
      size={size}
      className={className}
    />
  );
}

export function GroupMembersPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [transferLeaderTo, setTransferLeaderTo] = useState('');
  const [leaderTransferTo, setLeaderTransferTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveNotice, setLeaveNotice] = useState('');
  const [leaderTransferError, setLeaderTransferError] = useState('');
  const [leaderTransferNotice, setLeaderTransferNotice] = useState('');
  const [updatingMemberId, setUpdatingMemberId] = useState('');
  const [kickingMemberId, setKickingMemberId] = useState('');
  const [processingLeaveRequestId, setProcessingLeaveRequestId] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [isTransferringLeader, setIsTransferringLeader] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setIsLoading(true);
        setLoadError('');

        const [groupData, membersData] = await Promise.all([getGroupDetail(id), listGroupMembers(id)]);
        const leaveRequestsData = groupData?.my_role === 'leader' ? await listLeaveRequests(id) : [];

        if (cancelled) {
          return;
        }

        setGroup(groupData);
        setMembers(membersData);
        setLeaveRequests(leaveRequestsData);
        setRoleDrafts(
          Object.fromEntries(membersData.map((member) => [member.user_id, member.role])),
        );
      } catch (error) {
        if (!cancelled) {
          const message = error.response?.data?.error?.message ?? 'Không thể tải danh sách thành viên.';
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

  const activeMembersCount = useMemo(
    () => members.filter((member) => member.status === 'active').length,
    [members],
  );
  const activeTransferOptions = useMemo(
    () =>
      members.filter(
        (member) => member.status === 'active' && member.user_id !== currentUser?.id,
      ),
    [currentUser?.id, members],
  );
  const groupNameHint = group?.my_role === 'leader' ? 'Tên nhóm bạn đang quản lý.' : 'Tên nhóm bạn đang tham gia.';
  const membersDescription = group?.my_role === 'leader'
    ? 'Trưởng nhóm có thể đổi vai trò thư ký hoặc thành viên, và mời người khác ra khỏi nhóm trừ chính mình.'
    : 'Danh sách thành viên và vai trò hiện tại trong nhóm. Chỉ trưởng nhóm mới có thể đổi vai trò hoặc mời người khác ra khỏi nhóm.';

  async function handleSaveRole(member) {
    const nextRole = roleDrafts[member.user_id];

    if (!nextRole || nextRole === member.role) {
      return;
    }

    try {
      setUpdatingMemberId(member.user_id);
      const data = await updateGroupMemberRole(id, member.user_id, {
        role: nextRole,
      });

      setMembers((currentMembers) =>
        currentMembers.map((currentMember) => {
          if (
            nextRole === 'secretary' &&
            currentMember.user_id !== member.user_id &&
            currentMember.role === 'secretary'
          ) {
            return {
              ...currentMember,
              role: 'member',
            };
          }

          if (currentMember.user_id === member.user_id) {
            return {
              ...currentMember,
              role: data.role,
            };
          }

          return currentMember;
        }),
      );
      toast.success(data.message ?? 'Đã cập nhật vai trò');
    } catch (error) {
      const message = error.response?.data?.error?.message ?? 'Không thể cập nhật vai trò lúc này.';
      setRoleDrafts((currentDrafts) => ({
        ...currentDrafts,
        [member.user_id]: member.role,
      }));
      toast.error(message);
    } finally {
      setUpdatingMemberId('');
    }
  }

  async function handleKick(member) {
    try {
      setKickingMemberId(member.user_id);
      const data = await kickGroupMember(id, member.user_id);

      setMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.user_id === member.user_id
            ? {
                ...currentMember,
                status: 'kicked',
              }
            : currentMember,
        ),
      );
      toast.success(data.message ?? 'Đã mời thành viên ra khỏi nhóm');
    } catch (error) {
      const message = error.response?.data?.error?.message ?? 'Không thể xóa thành viên lúc này.';
      toast.error(message);
    } finally {
      setKickingMemberId('');
    }
  }

  async function handleSubmitLeave() {
    if (group?.my_role === 'leader' && !transferLeaderTo) {
      setLeaveFormError('Bạn phải chọn người nhận quyền trưởng nhóm trước khi rời nhóm.');
      return;
    }

    const payload = group?.my_role === 'leader' ? { transfer_leader_to: transferLeaderTo } : {};

    try {
      setIsSubmittingLeave(true);
      setLeaveFormError('');

      const data = await requestLeaveGroup(id, payload);
      const successMessage =
        group?.my_role === 'leader'
          ? 'Đã chuyển quyền trưởng nhóm và rời nhóm thành công.'
          : 'Đã gửi yêu cầu rời nhóm, chờ trưởng nhóm xác nhận.';

      setLeaveNotice(successMessage);
      toast.success(data.message ?? successMessage);

      if (group?.my_role === 'leader') {
        navigate('/groups');
      }
    } catch (error) {
      const message = error.response?.data?.error?.message ?? 'Không thể gửi yêu cầu rời nhóm lúc này.';
      setLeaveFormError(message);
      toast.error(message);
    } finally {
      setIsSubmittingLeave(false);
    }
  }

  async function handleTransferLeader() {
    if (!leaderTransferTo) {
      setLeaderTransferError('Bạn phải chọn người nhận quyền trưởng nhóm.');
      return;
    }

    try {
      setIsTransferringLeader(true);
      setLeaderTransferError('');
      setLeaderTransferNotice('');

      const data = await transferLeader(id, {
        new_leader_id: leaderTransferTo,
      });

      setMembers((currentMembers) =>
        currentMembers.map((member) => {
          if (member.user_id === leaderTransferTo) {
            return {
              ...member,
              role: 'leader',
            };
          }

          if (member.user_id === currentUser?.id) {
            return {
              ...member,
              role: 'member',
            };
          }

          return member;
        }),
      );
      setRoleDrafts((currentDrafts) => ({
        ...currentDrafts,
        [leaderTransferTo]: 'leader',
        ...(currentUser?.id ? { [currentUser.id]: 'member' } : {}),
      }));
      setGroup((currentGroup) =>
        currentGroup
          ? {
              ...currentGroup,
              my_role: 'member',
            }
          : currentGroup,
      );
      setLeaderTransferTo('');
      setLeaderTransferNotice('Bạn vẫn ở lại nhóm với vai trò thành viên.');
      toast.success(data.message ?? 'Đã chuyển trưởng nhóm');
    } catch (error) {
      const message = error.response?.data?.error?.message ?? 'Không thể chuyển trưởng nhóm lúc này.';
      setLeaderTransferError(message);
      toast.error(message);
    } finally {
      setIsTransferringLeader(false);
    }
  }

  async function handleProcessLeaveRequest(requestId, action) {
    try {
      setProcessingLeaveRequestId(requestId);
      const reason = rejectReasons[requestId]?.trim();
      const payload = action === 'reject' && reason ? { action, reason } : { action };
      const data = await processLeaveRequest(id, requestId, payload);
      const currentRequest = leaveRequests.find((item) => item.id === requestId);

      setLeaveRequests((currentRequests) =>
        currentRequests.filter((item) => item.id !== requestId),
      );

      if (action === 'approve' && currentRequest?.user?.user_id) {
        setMembers((currentMembers) =>
          currentMembers.map((member) =>
            member.user_id === currentRequest.user.user_id
              ? {
                  ...member,
                  status: 'left',
                }
              : member,
          ),
        );
      }

      if (action === 'reject') {
        setRejectReasons((currentReasons) => {
          const nextReasons = { ...currentReasons };
          delete nextReasons[requestId];
          return nextReasons;
        });
      }

      toast.success(data.message ?? 'Đã xử lý yêu cầu rời nhóm');
    } catch (error) {
      const message = error.response?.data?.error?.message ?? 'Không thể xử lý yêu cầu lúc này.';
      toast.error(message);
    } finally {
      setProcessingLeaveRequestId('');
    }
  }

  return (
    <PageContainer
      eyebrow="Thành viên"
      title="Quản lý thành viên nhóm"
      description="Theo dõi vai trò, trạng thái tham gia và các yêu cầu rời nhóm trong cùng một màn hình."
      actions={
        <Link
          to={`/groups/${id}`}
          className="rounded-xl app-button-primary"
        >
          Về tổng quan nhóm
        </Link>
      }
      variant="finance"
    >
      {isLoading ? (
        <SurfaceCard title="Đang tải thành viên" tone="mint">
          <p className="text-sm text-slate-600">Hệ thống đang đồng bộ chi tiết nhóm và danh sách thành viên...</p>
        </SurfaceCard>
      ) : loadError ? (
        <SurfaceCard title="Không thể tải dữ liệu">
          <ErrorState
            message={loadError}
            onRetry={() => setReloadToken((value) => value + 1)}
            actionLabel="Tải lại"
          />
        </SurfaceCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KpiTile label="Nhóm hiện tại" value={group?.name || 'Chưa rõ'} hint={groupNameHint} />
            <KpiTile label="Thành viên đang hoạt động" value={String(activeMembersCount)} hint="Danh sách hiển thị theo vai trò và trạng thái hiện tại." />
            <KpiTile label="Đợt quỹ đang mở" value={String(group?.active_campaigns_count ?? 0)} hint="Số đợt thu quỹ đang hoạt động." />
            <KpiTile label="QR đang bật" value={group?.has_qr ? 'Có' : 'Chưa'} hint={`Vai trò của bạn: ${roleLabels[group?.my_role] ?? 'Thành viên'}`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <SurfaceCard
              title={group?.name || 'Chi tiết nhóm'}
              description={group?.description || 'Chưa có mô tả cho nhóm này.'}
            >
              <div className="grid gap-4">
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Tiền tệ:</span> {group?.currency || 'VND'}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-slate-900">Vai trò của bạn:</span> {roleLabels[group?.my_role] ?? 'Thành viên'}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-slate-900">Số thành viên:</span> {group?.member_count ?? members.length}
                  </p>
                </div>


                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/groups"
                    className="rounded-xl app-button-secondary"
                  >
                    Về danh sách nhóm
                  </Link>
                </div>
              </div>
            </SurfaceCard>

            <div className="grid gap-6">
              {leaderTransferNotice ? (
                <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                  {leaderTransferNotice}
                </p>
              ) : null}

              {group?.my_role === 'leader' ? (
                <SurfaceCard
                  title="Chuyển trưởng nhóm"
                  description="Chuyển quyền điều hành cho một thành viên active mà không rời khỏi nhóm."
                >
                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Chuyển trưởng nhóm cho
                      <select
                        aria-label="Chuyển trưởng nhóm cho"
                        value={leaderTransferTo}
                        onChange={(event) => {
                          setLeaderTransferTo(event.target.value);
                          if (leaderTransferError) {
                            setLeaderTransferError('');
                          }
                        }}
                        className="rounded-xl app-input"
                      >
                        <option value="">Chọn thành viên đang hoạt động</option>
                        {activeTransferOptions.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.display_name || member.user_id} - {roleLabels[member.role] ?? member.role}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                      Bạn sẽ vẫn ở lại nhóm. Người được chọn trở thành trưởng nhóm mới, còn bạn chuyển về vai trò thành viên.
                    </div>

                    {leaderTransferError ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {leaderTransferError}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleTransferLeader}
                      disabled={isTransferringLeader}
                      className="rounded-xl app-button-primary disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isTransferringLeader ? 'Đang chuyển...' : 'Chuyển trưởng nhóm'}
                    </button>
                  </div>
                </SurfaceCard>
              ) : null}

              <SurfaceCard
                title="Rời nhóm"
                description={
                  group?.my_role === 'leader'
                    ? 'Trưởng nhóm phải chuyển quyền trước khi rời nhóm. Không có đường tắt bỏ qua bước này.'
                    : 'Thành viên gửi yêu cầu rời nhóm và chờ trưởng nhóm xác nhận để trạng thái không bị sai lệch.'
                }
              >
                <div className="grid gap-4">
                  {group?.my_role === 'leader' ? (
                    <>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Chuyển quyền trưởng nhóm cho
                        <select
                          aria-label="Chuyển quyền trưởng nhóm cho"
                          value={transferLeaderTo}
                          onChange={(event) => {
                            setTransferLeaderTo(event.target.value);
                            if (leaveFormError) {
                              setLeaveFormError('');
                            }
                          }}
                          className="rounded-xl app-input"
                        >
                          <option value="">Chọn thành viên đang hoạt động</option>
                          {activeTransferOptions.map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.display_name || member.user_id} - {roleLabels[member.role] ?? member.role}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Sau khi chuyển quyền, bạn sẽ rời nhóm ngay lập tức. Nên chọn người đang hoạt động và hiểu bối cảnh nhóm hiện tại.
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Yêu cầu của bạn sẽ vào hàng chờ duyệt. Trưởng nhóm sẽ chấp nhận hoặc từ chối ngay tại màn hình này.
                    </div>
                  )}

                  {leaveFormError ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {leaveFormError}
                    </p>
                  ) : null}

                  {leaveNotice ? (
                    <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      {leaveNotice}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSubmitLeave}
                    disabled={isSubmittingLeave}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 ${
                      group?.my_role === 'leader'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-slate-950 hover:bg-slate-800'
                    }`}
                  >
                    {isSubmittingLeave
                      ? 'Đang xử lý...'
                      : group?.my_role === 'leader'
                        ? 'Chuyển quyền trưởng nhóm và rời nhóm'
                        : 'Gửi yêu cầu rời nhóm'}
                  </button>
                </div>
              </SurfaceCard>

              {group?.my_role === 'leader' ? (
                <SurfaceCard
                  title="Yêu cầu rời nhóm đang chờ duyệt"
                  description="Trưởng nhóm duyệt nhanh ngay trên cùng màn hình để trạng thái thành viên không bị trôi."
                >
                  {leaveRequests.length === 0 ? (
                    <EmptyState
                      title="Chưa có yêu cầu nào"
                      description="Khi thành viên gửi yêu cầu rời nhóm, khu vực này sẽ hiện thao tác chấp nhận hoặc từ chối."
                    />
                  ) : (
                    <div className="grid gap-4">
                      {leaveRequests.map((request) => {
                        const displayName = request.user?.display_name || request.user?.user_id || 'Thành viên';
                        const isProcessing = processingLeaveRequestId === request.id;

                        return (
                          <article
                            key={request.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex items-start gap-3">
                                <MemberAvatar
                                  member={request.user ?? {}}
                                  groupId={id}
                                  size="sm"
                                  className="mt-1"
                                />
                                <div>
                                <p className="text-lg font-semibold text-slate-900">{displayName}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em]">
                                  <span className="app-badge app-badge--warning">
                                    Chờ duyệt
                                  </span>
                                </div>
                                <p className="mt-3 text-sm text-slate-600">Gửi lúc {formatDate(request.created_at)}</p>
                                </div>
                              </div>

                              <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:min-w-[300px]">
                                <label className="grid gap-2 text-sm font-medium text-slate-700">
                                  Lý do nếu từ chối
                                  <textarea
                                    value={rejectReasons[request.id] ?? ''}
                                    onChange={(event) =>
                                      setRejectReasons((currentReasons) => ({
                                        ...currentReasons,
                                        [request.id]: event.target.value,
                                      }))
                                    }
                                    className="min-h-24 rounded-xl app-input"
                                    placeholder="Ví dụ: cần xử lý xong số dư hoặc đợt quỹ đang mở."
                                  />
                                </label>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <button
                                    type="button"
                                    onClick={() => handleProcessLeaveRequest(request.id, 'approve')}
                                    disabled={isProcessing}
                                    className="rounded-xl app-button-primary"
                                  >
                                    {isProcessing ? 'Đang xử lý...' : `Chấp nhận yêu cầu của ${displayName}`}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleProcessLeaveRequest(request.id, 'reject')}
                                    disabled={isProcessing}
                                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                                  >
                                    {isProcessing ? 'Đang xử lý...' : `Từ chối yêu cầu của ${displayName}`}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </SurfaceCard>
              ) : null}

              <SurfaceCard
                title="Thành viên"
                description={membersDescription}
              >
                {members.length === 0 ? (
                  <EmptyState
                    title="Chưa có thành viên nào"
                    description="Khi nhóm có thêm người qua liên kết mời, danh sách sẽ hiện tại đây."
                  />
                ) : (
                  <div className="grid gap-4">
                    {members.map((member) => {
                      const displayName = member.display_name || member.user_id;
                      const isSelf = member.user_id === currentUser?.id;
                      const isLeaderView = group?.my_role === 'leader';
                      const canManageMember = isLeaderView && !isSelf && member.status === 'active';

                      return (
                        <article
                          key={member.user_id}
                          className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex gap-4">
                              <MemberAvatar member={member} groupId={id} size="lg" />

                              <div>
                                <p className="text-lg font-semibold text-slate-900">
                                  {displayName}
                                  {isSelf ? (
                                    <span className="ml-2 text-sm font-medium text-[#0b7443]">(Bạn)</span>
                                  ) : null}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em]">
                                  <span className="app-badge app-badge--neutral">
                                    {roleLabels[member.role] ?? member.role}
                                  </span>
                                  <span className="app-badge app-badge--neutral">
                                    {statusLabels[member.status] ?? member.status}
                                  </span>
                                </div>
                                <p className="mt-3 text-sm text-slate-600">
                                  Tham gia từ {formatDate(member.joined_at)}
                                </p>
                              </div>
                            </div>

                            {canManageMember ? (
                              <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:min-w-[280px]">
                                <label className="grid gap-2 text-sm font-medium text-slate-700">
                                  <span className="sr-only">{`Vai trò của ${displayName}`}</span>
                                  <select
                                    aria-label={`Vai trò của ${displayName}`}
                                    value={roleDrafts[member.user_id] ?? member.role}
                                    onChange={(event) =>
                                      setRoleDrafts((currentDrafts) => ({
                                        ...currentDrafts,
                                        [member.user_id]: event.target.value,
                                      }))
                                    }
                                    className="rounded-xl app-input"
                                  >
                                    <option value="member">Thành viên</option>
                                    <option value="secretary">Thư ký</option>
                                  </select>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => handleSaveRole(member)}
                                  disabled={updatingMemberId === member.user_id}
                                  className="rounded-xl app-button-primary"
                                >
                                  {updatingMemberId === member.user_id ? 'Đang lưu vai trò...' : `Lưu vai trò của ${displayName}`}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleKick(member)}
                                  disabled={kickingMemberId === member.user_id}
                                  className="rounded-xl app-button-danger disabled:opacity-50"
                                >
                                  {kickingMemberId === member.user_id ? 'Đang xử lý...' : `Mời ${displayName} ra khỏi nhóm`}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </SurfaceCard>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
