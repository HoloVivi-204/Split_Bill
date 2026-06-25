import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

import {
  confirmFundContribution,
  createFundCampaign,
  createFundQr,
  createFundSpending,
  deleteFundSpending,
  getFundBalance,
  getFundCampaignDetail,
  getFundQr,
  getMyFundContribution,
  listFundCampaigns,
  listFundContributionHistory,
  listFundContributions,
  listFundSpendings,
  mutateFundCampaign,
  updateFundCampaign,
  updateFundSpending,
} from '../../api/fund';
import { listBanks } from '../../api/banks';
import { getGroupDetail } from '../../api/group-core';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { getRoleLabel } from '../../constants/groupRoles';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateTime';
import {
  buildInitialCampaignForm,
  buildInitialManualForm,
  buildInitialQrForm,
  buildInitialSpendingForm,
  paymentFrequencyLabels,
  statusLabel,
  statusTone,
} from './fundForm';
import { GroupFundOverviewWorkspace } from './GroupFundOverviewWorkspace';
import { GroupFundPaymentsWorkspace } from './GroupFundPaymentsWorkspace';
import { GroupFundSePayGuide } from './GroupFundSePayGuide';
import { GroupFundSpendingsWorkspace } from './GroupFundSpendingsWorkspace';

export function GroupFundOverviewPage() {
  return <GroupFundPage mode="overview" />;
}

export function GroupFundManagePage() {
  return <GroupFundPage mode="manage" />;
}

export function GroupFundSePayGuidePage() {
  return <GroupFundPage mode="guide" />;
}

export function GroupFundPage({ mode = 'overview' }) {
  const { id = '' } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  const [group, setGroup] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [contributionState, setContributionState] = useState(null);
  const [historyState, setHistoryState] = useState(null);
  const [operatorContributions, setOperatorContributions] = useState(null);
  const [fundBalance, setFundBalance] = useState(null);
  const [spendings, setSpendings] = useState([]);
  const [currentQrInfo, setCurrentQrInfo] = useState(null);
  const [banks, setBanks] = useState([]);
  const [webhookSetup, setWebhookSetup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [isSubmittingQr, setIsSubmittingQr] = useState(false);
  const [isSubmittingSpending, setIsSubmittingSpending] = useState(false);
  const [isSubmittingManualConfirm, setIsSubmittingManualConfirm] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState('');
  const [editingSpendingId, setEditingSpendingId] = useState('');
  const [campaignFormState, setCampaignFormState] = useState(buildInitialCampaignForm());
  const [qrFormState, setQrFormState] = useState(buildInitialQrForm());
  const [qrPrivacyAcknowledged, setQrPrivacyAcknowledged] = useState(false);
  const [qrPrivacyError, setQrPrivacyError] = useState('');
  const [spendingFormState, setSpendingFormState] = useState(buildInitialSpendingForm());
  const [manualFormState, setManualFormState] = useState(buildInitialManualForm());
  const [manageSection, setManageSection] = useState('payments');

  const myRole = group?.my_role ?? 'member';
  const isLeader = myRole === 'leader';
  const isSecretary = myRole === 'secretary';
  const canOperate = isLeader || isSecretary;
  const isOverviewMode = mode === 'overview';
  const isManageMode = mode === 'manage';
  const isGuideMode = mode === 'guide';
  const manageSections = [
    isLeader ? { id: 'campaigns', label: 'Đợt thu' } : null,
    isSecretary ? { id: 'payments', label: 'Đóng quỹ' } : null,
    { id: 'spendings', label: 'Sổ chi' },
  ].filter(Boolean);
  const activeManageSection = manageSections.some((section) => section.id === manageSection)
    ? manageSection
    : manageSections[0]?.id ?? 'spendings';

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId],
  );

  const confirmableContributions = useMemo(
    () =>
      (operatorContributions?.contributions ?? []).filter((item) => {
        const remaining = Math.max(0, item.amount_required - item.amount_paid);
        return remaining > 0 && (item.status === 'pending' || item.status === 'late');
      }),
    [operatorContributions],
  );

  const selectedContributionRecord = useMemo(
    () =>
      confirmableContributions.find((item) => item.user_id === manualFormState.userId) || null,
    [confirmableContributions, manualFormState.userId],
  );

  function resetCampaignForm() {
    setEditingCampaignId('');
    setCampaignFormState(buildInitialCampaignForm());
  }

  function resetQrForm() {
    setQrFormState(buildInitialQrForm());
    setQrPrivacyAcknowledged(false);
    setQrPrivacyError('');
  }

  function resetSpendingForm() {
    setEditingSpendingId('');
    setSpendingFormState(buildInitialSpendingForm());
  }

  function resetManualForm() {
    setManualFormState(buildInitialManualForm());
  }

  async function handleCopyWebhookValue(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error(`Không sao chép được ${label}`);
    }
  }

  useEffect(() => {
    if (!manualFormState.userId) {
      return;
    }

    const selectedStillValid = confirmableContributions.some((item) => item.user_id === manualFormState.userId);

    if (!selectedStillValid) {
      setManualFormState((current) => (current.userId ? buildInitialManualForm() : current));
    }
  }, [confirmableContributions, manualFormState.userId]);


  const loadSelectedCampaignWorkspace = useCallback(async (campaignId, role, campaignList) => {
    const baseCampaign = campaignList.find((item) => item.id === campaignId) || null;
    const historyPromise = listFundContributionHistory(id, campaignId);
    const contributionsPromise = role === 'member'
      ? Promise.resolve(null)
      : listFundContributions(id, campaignId);

    const [historyData, contributionsData] = await Promise.all([historyPromise, contributionsPromise]);
    let myContributionData = null;

    try {
      myContributionData = await getMyFundContribution(id, campaignId);
      setCurrentQrInfo(myContributionData.qr_info);
    } catch (error) {
      if (error.response?.data?.error?.code !== 'QR_NOT_CONFIGURED') {
        throw error;
      }

      setCurrentQrInfo(null);

      if (role === 'member') {
        throw error;
      }

      const myContribution =
        contributionsData?.contributions?.find((item) => item.user_id === currentUser?.id) || null;

      myContributionData = myContribution
        ? {
            campaign: {
              title: baseCampaign?.title || historyData?.campaign?.title || 'Đợt thu',
              due_date: baseCampaign?.due_date || historyData?.campaign?.due_date || '',
              amount_per_person:
                baseCampaign?.amount_per_person || historyData?.campaign?.amount_per_person || 0,
              suggested_amount_per_payment: baseCampaign?.amount_per_person || 0,
            },
            my_contribution: {
              transfer_code: myContribution.transfer_code,
              status: myContribution.status,
              amount_required: myContribution.amount_required,
              amount_paid: myContribution.amount_paid,
              remaining: Math.max(0, myContribution.amount_required - myContribution.amount_paid),
              fully_paid_at: myContribution.fully_paid_at,
            },
            qr_info: null,
          }
        : null;
    }

    setContributionState(myContributionData);
    setHistoryState(historyData);
    setOperatorContributions(contributionsData);
  }, [currentUser?.id, id]);

  const loadWorkspace = useCallback(async (preferredCampaignId = '') => {
    const [groupData, campaignsData, spendingsData, balanceData, banksData] = await Promise.all([
      getGroupDetail(id),
      listFundCampaigns(id, { status: 'all' }),
      listFundSpendings(id),
      getFundBalance(id),
      listBanks(),
    ]);

    setGroup(groupData);
    setCampaigns(campaignsData);
    setSpendings(spendingsData);
    setFundBalance(balanceData);
    setBanks(banksData);

    const nextCampaignId =
      (preferredCampaignId && campaignsData.some((item) => item.id === preferredCampaignId) && preferredCampaignId) ||
      campaignsData.find((item) => item.status === 'active')?.id ||
      campaignsData[0]?.id ||
      '';

    setSelectedCampaignId(nextCampaignId);

    if (!nextCampaignId) {
      setContributionState(null);
      setHistoryState(null);
      setOperatorContributions(null);
      setCurrentQrInfo(null);
      return;
    }

    await loadSelectedCampaignWorkspace(nextCampaignId, groupData.my_role, campaignsData);
  }, [id, loadSelectedCampaignWorkspace]);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setIsLoading(true);
        setLoadError('');
        await loadWorkspace();
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(error, 'Không tải được workspace quỹ.'));
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
  }, [loadWorkspace]);

  async function handleSelectCampaign(campaignId) {
    try {
      setSelectedCampaignId(campaignId);
      await loadSelectedCampaignWorkspace(campaignId, myRole, campaigns);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không đổi được đợt thu.'));
    }
  }

  async function handleEditCampaign(campaignId) {
    try {
      const detail = await getFundCampaignDetail(id, campaignId);
      setEditingCampaignId(campaignId);
      setCampaignFormState({
        title: detail.title,
        description: detail.description || '',
        amountPerPerson: String(detail.amount_per_person),
        paymentFrequency: detail.payment_frequency,
        dueDate: detail.due_date,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tải được chi tiết đợt thu.'));
    }
  }

  async function handleSubmitCampaign(event) {
    event.preventDefault();

    try {
      setIsSubmittingCampaign(true);
      const payload = {
        title: campaignFormState.title.trim(),
        description: campaignFormState.description.trim(),
        amount_per_person: Number(campaignFormState.amountPerPerson),
        payment_frequency: campaignFormState.paymentFrequency,
        due_date: campaignFormState.dueDate,
      };

      if (editingCampaignId) {
        await updateFundCampaign(id, editingCampaignId, payload);
        toast.success('Đã cập nhật đợt thu quỹ');
        await loadWorkspace(editingCampaignId);
      } else {
        const created = await createFundCampaign(id, payload);
        toast.success('Đã tạo đợt thu quỹ mới');
        await loadWorkspace(created.id);
      }

      resetCampaignForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không lưu được đợt thu quỹ.'));
    } finally {
      setIsSubmittingCampaign(false);
    }
  }

  async function handleMutateCampaign(action) {
    if (!selectedCampaignId) {
      return;
    }

    try {
      await mutateFundCampaign(id, selectedCampaignId, { action });
      toast.success(action === 'close' ? 'Đã đóng đợt thu' : 'Đã hủy đợt thu');
      await loadWorkspace(selectedCampaignId);
      resetCampaignForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được đợt thu.'));
    }
  }

  async function handleSubmitQr(event) {
    event.preventDefault();

    if (!qrPrivacyAcknowledged) {
      setQrPrivacyError('Bạn cần xác nhận đã đọc hướng dẫn riêng tư trước khi lưu tài khoản nhận quỹ.');
      return;
    }

    const accountNumber = qrFormState.accountNumber.trim();

    if (!qrFormState.bankId.trim() || accountNumber.length < 4 || !/^[0-9]+$/.test(accountNumber)) {
      toast.error('Vui lòng chọn ngân hàng và nhập số tài khoản hợp lệ.');
      return;
    }

    try {
      setIsSubmittingQr(true);
      const qrConfig = await createFundQr(id, {
        bank_id: qrFormState.bankId.trim(),
        account_number: accountNumber,
      });

      setWebhookSetup({
        webhook_url: qrConfig.webhook_url,
        webhook_secret: qrConfig.webhook_secret,
        webhook_secret_preview: qrConfig.webhook_secret_preview,
        webhook_config_id: qrConfig.webhook_config_id,
      });

      if (selectedCampaignId) {
        const qrInfo = await getFundQr(id, selectedCampaignId);
        setCurrentQrInfo(qrInfo);
      }

      toast.success('Đã lưu tài khoản nhận quỹ');
      resetQrForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không lưu được thông tin QR.'));
    } finally {
      setIsSubmittingQr(false);
    }
  }

  async function handleSubmitSpending(event) {
    event.preventDefault();

    try {
      setIsSubmittingSpending(true);
      const payload = {
        title: spendingFormState.title.trim(),
        amount: Number(spendingFormState.amount),
        spent_at: spendingFormState.spentAt,
        note: spendingFormState.note.trim(),
      };

      const requestPayload = spendingFormState.receipt
        ? (() => {
            const formData = new FormData();
            formData.append('title', payload.title);
            formData.append('amount', String(payload.amount));
            formData.append('spent_at', payload.spent_at);
            if (payload.note) {
              formData.append('note', payload.note);
            }
            formData.append('receipt', spendingFormState.receipt);
            return formData;
          })()
        : payload;

      if (editingSpendingId) {
        await updateFundSpending(id, editingSpendingId, requestPayload);
        toast.success('Đã cập nhật khoản chi quỹ');
      } else {
        await createFundSpending(id, requestPayload);
        toast.success('Đã ghi khoản chi quỹ');
      }

      await loadWorkspace(selectedCampaignId);
      resetSpendingForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không lưu được khoản chi quỹ.'));
    } finally {
      setIsSubmittingSpending(false);
    }
  }

  function handleEditSpending(spending) {
    setEditingSpendingId(spending.id);
    setSpendingFormState({
      title: spending.title,
      amount: String(spending.amount),
      spentAt: spending.spent_at,
      note: spending.note || '',
      receipt: null,
    });
  }

  async function handleDeleteSpending(spendingId) {
    try {
      await deleteFundSpending(id, spendingId);
      toast.success('Đã xóa khoản chi quỹ');
      await loadWorkspace(selectedCampaignId);

      if (editingSpendingId === spendingId) {
        resetSpendingForm();
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không xóa được khoản chi quỹ.'));
    }
  }

  async function handleSubmitManualConfirm(event) {
    event.preventDefault();

    if (!selectedCampaignId || !manualFormState.userId) {
      return;
    }

    try {
      setIsSubmittingManualConfirm(true);
      await confirmFundContribution(id, selectedCampaignId, manualFormState.userId, {
        amount: Number(manualFormState.amount),
        note: manualFormState.note.trim(),
      });
      toast.success('Đã xác nhận đóng quỹ thủ công');
      await loadWorkspace(selectedCampaignId);
      resetManualForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không xác nhận được đóng quỹ.'));
    } finally {
      setIsSubmittingManualConfirm(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer
        eyebrow="Quỹ nhóm"
        title="Đang tải quỹ nhóm"
        description="Đang đồng bộ các đợt thu quỹ, sổ chi và các quyền thao tác."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-shimmer rounded-xl"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer eyebrow="Quỹ nhóm" title="Quỹ nhóm" description="Không tải được không gian quỹ nhóm.">
        <SurfaceCard title="Có lỗi xảy ra">
          <ErrorState
            message={loadError}
            onRetry={() => {
              setLoadError('');
              setIsLoading(true);
              void loadWorkspace()
                .catch((error) => {
                  setLoadError(getApiErrorMessage(error, 'Không tải được workspace quỹ.'));
                })
                .finally(() => {
                  setIsLoading(false);
                });
            }}
            actionLabel="Tải lại không gian"
          />
        </SurfaceCard>
      </PageContainer>
    );
  }

  const fundNavItems = [
    { to: `/groups/${id}/fund`, label: 'Tổng quan', mode: 'overview' },
    ...(canOperate
      ? [{ to: `/groups/${id}/fund/manage`, label: 'Quản lý', mode: 'manage' }]
      : []),
    { to: `/groups/${id}/fund/sepay-guide`, label: 'Hướng dẫn SePay', mode: 'guide' },
  ];
  const fundNavigation = (
    <div className="flex flex-wrap gap-2">
      {fundNavItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            item.mode === mode
              ? 'bg-[#0b7443] text-white shadow-panel'
              : 'border border-[#d1fadf] bg-white text-slate-700 hover:bg-[#f7fdf9]'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
  const pageActions = (
    <div className="flex flex-wrap gap-3">
      <Link
        to="/fund"
        className="rounded-xl app-button-secondary"
      >
        Về danh sách quỹ
      </Link>
    </div>
  );
  const renderCampaignList = (emptyDescription) => {
    if (campaigns.length === 0) {
      return (
        <EmptyState
          title="Chưa có đợt thu quỹ nào"
          description={emptyDescription}
        />
      );
    }

    return (
      <div className="grid gap-3">
        {campaigns.map((campaign) => {
          const statusLabels = {
            active: 'Đang mở',
            closed: 'Đã đóng',
            cancelled: 'Đã hủy',
          };
          return (
            <button
              key={campaign.id}
              type="button"
              onClick={() => handleSelectCampaign(campaign.id)}
              className={`rounded-xl border p-4 text-left transition ${
                campaign.id === selectedCampaignId
                  ? 'border-[#0b7443] bg-[#effaf3] shadow-panel'
                  : 'border-[#d1fadf] bg-white hover:bg-[#f7fdf9]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b7443]">
                    {statusLabels[campaign.status] ?? campaign.status}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{campaign.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">Hạn đóng: {formatDate(campaign.due_date)}</p>
                </div>
                <span className="rounded-full border border-[#d1fadf] bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatCurrency(campaign.amount_per_person)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span>{campaign.contributions_summary.paid} đã đóng</span>
                <span>{campaign.contributions_summary.pending} chờ đóng</span>
                <span>{campaign.contributions_summary.late} trễ hạn</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  if (isGuideMode) {
    return (
      <GroupFundSePayGuide
        group={group}
        pageActions={pageActions}
        fundNavigation={fundNavigation}
      />
    );
  }

  if (isManageMode && !canOperate) {
    return (
      <PageContainer
        eyebrow="Quản lý quỹ"
        title={group ? `Quản lý quỹ - ${group.name}` : 'Quản lý quỹ'}
        description="Trang này dành cho Trưởng nhóm và Thư ký."
        actions={pageActions}
      >
        {fundNavigation}
        <SurfaceCard title="Không có quyền quản lý quỹ">
          <EmptyState
            title="Bạn không có quyền quản lý quỹ"
            description="Thành viên có thể theo dõi trạng thái đóng quỹ ở trang tổng quan quỹ. Các thao tác tạo đợt thu, cấu hình tài khoản nhận quỹ và xác nhận thủ công chỉ dành cho Trưởng nhóm hoặc Thư ký."
          />
          <div className="mt-5 flex justify-center">
            <Link
              to={`/groups/${id}/fund`}
              className="rounded-xl app-button-primary"
            >
              Mở tổng quan quỹ
            </Link>
          </div>
        </SurfaceCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      eyebrow={isManageMode ? 'Quản lý quỹ' : 'Quỹ nhóm'}
      title={group
        ? `${isManageMode ? 'Quản lý quỹ' : 'Quỹ nhóm'} - ${group.name}`
        : isManageMode ? 'Quản lý quỹ' : 'Quỹ nhóm'}
      description={isManageMode
        ? 'Không gian điều hành đợt thu, tài khoản nhận quỹ, xác nhận đóng quỹ và sổ chi.'
        : 'Nơi theo dõi các đợt đóng quỹ, mã chuyển khoản và trạng thái thanh toán của bạn.'}
      actions={pageActions}
    >
      {fundNavigation}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Đợt thu hiện có"
          value={String(campaigns.length)}
          hint={`Vai trò của bạn: ${getRoleLabel(myRole)}`}
        />
        <KpiTile
          label="Số dư quỹ"
          value={formatCurrency(fundBalance?.remaining ?? 0)}
          hint="Tổng đã thu trừ tổng đã chi."
        />
        <KpiTile
          label="Tổng đã thu"
          value={formatCurrency(fundBalance?.total_collected ?? 0)}
          hint="Tính từ lịch sử thanh toán."
        />
        <KpiTile
          label="Tổng đã chi"
          value={formatCurrency(fundBalance?.total_spent ?? 0)}
          hint="Tổng tiền chi tiêu thực tế của nhóm."
        />
      </div>

      {isOverviewMode ? (
        <GroupFundOverviewWorkspace
          campaignListEmptyDescription={
            isLeader
              ? 'Trưởng nhóm có thể tạo đợt thu quỹ đầu tiên trong trang quản lý quỹ.'
              : 'Khi Trưởng nhóm tạo đợt thu quỹ mới, danh sách sẽ hiển thị ở đây để bạn theo dõi.'
          }
          contributionState={contributionState}
          currentQrInfo={currentQrInfo}
          formatDate={formatDate}
          historyState={historyState}
          renderCampaignList={renderCampaignList}
          selectedCampaign={selectedCampaign}
          statusLabel={statusLabel}
          statusTone={statusTone}
        />
      ) : null}

      {isManageMode ? (
        <SurfaceCard
          title="Đợt thu đang quản lý"
          description="Chọn một đợt thu để xem bảng đóng quỹ, xác nhận thủ công hoặc chỉnh sửa cấu hình liên quan."
        >
          {renderCampaignList('Trưởng nhóm có thể tạo đợt thu quỹ đầu tiên bằng form bên dưới.')}
        </SurfaceCard>
      ) : null}

      {isManageMode && canOperate ? (
        <div className="flex flex-wrap gap-2 rounded-[24px] border border-[#d1fadf] bg-white p-2 shadow-sm">
          {manageSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setManageSection(section.id)}
              className={[
                'rounded-2xl px-4 py-2 text-sm font-semibold transition',
                activeManageSection === section.id
                  ? 'bg-[#0b7443] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#f7fdf9] hover:text-[#0b7443]',
              ].join(' ')}
            >
              {section.label}
            </button>
          ))}
        </div>
      ) : null}

      {isManageMode && canOperate ? (
        <div className="grid gap-6">
          {isLeader && activeManageSection === 'campaigns' ? (
            <SurfaceCard
              title={editingCampaignId ? 'Cập nhật đợt thu quỹ' : 'Tạo đợt thu quỹ mới'}
              description="Trưởng nhóm quản lý việc tạo mới, cập nhật, đóng hoặc hủy đợt thu quỹ của nhóm."
            >
              <form className="grid gap-4" onSubmit={handleSubmitCampaign}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Tiêu đề đợt thu
                    <input
                      type="text"
                      value={campaignFormState.title}
                      onChange={(event) =>
                        setCampaignFormState((current) => ({ ...current, title: event.target.value }))
                      }
                      className="rounded-xl app-input"
                      placeholder="Ví dụ: Quỹ tháng 12"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Mức đóng mỗi người
                    <input
                      type="number"
                      min="1"
                      value={campaignFormState.amountPerPerson}
                      onChange={(event) =>
                        setCampaignFormState((current) => ({ ...current, amountPerPerson: event.target.value }))
                      }
                      className="rounded-xl app-input"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Tần suất thu
                    <select
                      value={campaignFormState.paymentFrequency}
                      onChange={(event) =>
                        setCampaignFormState((current) => ({ ...current, paymentFrequency: event.target.value }))
                      }
                      className="rounded-xl app-input"
                    >
                      {Object.entries(paymentFrequencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Hạn đóng quỹ
                    <input
                      type="date"
                      value={campaignFormState.dueDate}
                      onChange={(event) =>
                        setCampaignFormState((current) => ({ ...current, dueDate: event.target.value }))
                      }
                      className="rounded-xl app-input"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Mô tả đợt thu
                  <textarea
                    value={campaignFormState.description}
                    onChange={(event) =>
                      setCampaignFormState((current) => ({ ...current, description: event.target.value }))
                    }
                    className="min-h-28 rounded-xl app-input"
                    placeholder="Nêu rõ mục đích chi tiêu của đợt thu này..."
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingCampaign}
                    className="rounded-xl app-button-primary"
                  >
                    {isSubmittingCampaign
                      ? 'Đang lưu...'
                      : editingCampaignId
                        ? 'Cập nhật đợt thu'
                        : 'Tạo đợt thu'}
                  </button>
                  {editingCampaignId ? (
                    <button
                      type="button"
                      onClick={resetCampaignForm}
                      className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                    >
                      Hủy sửa
                    </button>
                  ) : null}
                  {selectedCampaign ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditCampaign(selectedCampaign.id)}
                        className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#eef6ff]"
                      >
                        Sửa đợt thu đang chọn
                      </button>
                      {selectedCampaign.status === 'active' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMutateCampaign('close')}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            Đóng đợt thu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMutateCampaign('cancel')}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Hủy đợt thu
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </form>
            </SurfaceCard>
          ) : null}
          {activeManageSection !== 'campaigns' ? (
            activeManageSection === 'payments' ? (
              <GroupFundPaymentsWorkspace
                banks={banks}
                confirmableContributions={confirmableContributions}
                formatDate={formatDate}
                handleCopyWebhookValue={handleCopyWebhookValue}
                handleSubmitManualConfirm={handleSubmitManualConfirm}
                handleSubmitQr={handleSubmitQr}
                id={id}
                isSecretary={isSecretary}
                isSubmittingManualConfirm={isSubmittingManualConfirm}
                isSubmittingQr={isSubmittingQr}
                manualFormState={manualFormState}
                operatorContributions={operatorContributions}
                qrFormState={qrFormState}
                qrPrivacyAcknowledged={qrPrivacyAcknowledged}
                qrPrivacyError={qrPrivacyError}
                resetQrForm={resetQrForm}
                selectedCampaignId={selectedCampaignId}
                selectedContributionRecord={selectedContributionRecord}
                setManualFormState={setManualFormState}
                setQrFormState={setQrFormState}
                setQrPrivacyAcknowledged={setQrPrivacyAcknowledged}
                setQrPrivacyError={setQrPrivacyError}
                statusLabel={statusLabel}
                statusTone={statusTone}
                webhookSetup={webhookSetup}
              />
            ) : activeManageSection === 'spendings' ? (
              <GroupFundSpendingsWorkspace
                editingSpendingId={editingSpendingId}
                formatDate={formatDate}
                handleDeleteSpending={handleDeleteSpending}
                handleEditSpending={handleEditSpending}
                handleSubmitSpending={handleSubmitSpending}
                isLeader={isLeader}
                isSubmittingSpending={isSubmittingSpending}
                resetSpendingForm={resetSpendingForm}
                setSpendingFormState={setSpendingFormState}
                spendingFormState={spendingFormState}
                spendings={spendings}
              />
            ) : null
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
}
