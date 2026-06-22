import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

import {
  confirmFundContribution,
  createFundCampaign,
  createFundQr,
  createFundSpending,
  getFundBalance,
  getFundCampaignDetail,
  getGroupDetail,
  getMyFundContribution,
  getFundQr,
  listBanks,
  listFundCampaigns,
  listFundContributionHistory,
  listFundContributions,
  listFundSpendings,
  mutateFundCampaign,
  updateFundCampaign,
  updateFundSpending,
  deleteFundSpending,
} from '../../api/groups';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiTile } from '../../components/common/KpiTile';
import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/formatCurrency';
import sepayBankGuideIllustration from '../../assets/sepay-bank-account-guide.png';
import sepayWebhookGuideIllustration from '../../assets/sepay-webhook-form-guide.png';

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialCampaignForm() {
  return {
    title: '',
    description: '',
    amountPerPerson: '',
    paymentFrequency: 'one_time',
    dueDate: '',
  };
}

function buildInitialQrForm() {
  return {
    bankId: '',
    bankName: '',
    accountNumber: '',
  };
}

function buildInitialSpendingForm() {
  return {
    title: '',
    amount: '',
    spentAt: todayValue(),
    note: '',
    receipt: null,
  };
}

function buildInitialManualForm() {
  return {
    userId: '',
    amount: '',
    note: '',
  };
}

const paymentFrequencyLabels = {
  one_time: 'Một lần',
  weekly: 'Hằng tuần',
  biweekly: 'Hai tuần',
  monthly: 'Hằng tháng',
};

const statusTone = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  late: 'border-rose-200 bg-rose-50 text-rose-700',
  kicked: 'border-slate-200 bg-slate-100 text-slate-600',
};

const statusLabel = {
  paid: 'Đã đóng đủ',
  pending: 'Đang chờ đóng',
  late: 'Trễ hạn',
  kicked: 'Đã rời nhóm (miễn trừ)',
};

const sepayBankGuideSteps = [
  {
    title: 'Kiểm tra ngân hàng có hỗ trợ webhook tiền vào',
    body: 'Vào Dashboard SePay → Tài khoản ngân hàng → Thêm tài khoản và chọn ngân hàng trong danh sách hỗ trợ. ACB, MBBank, VPBank có thể nhận tiền vào qua tài khoản chính; BIDV, MSB, KienlongBank, OCB thường bắt buộc dùng VA.',
  },
  {
    title: 'Nhập đúng loại tài khoản và số nhận quỹ',
    body: 'Chọn Cá nhân hoặc Doanh nghiệp theo tài khoản thật, nhập số tài khoản nhận quỹ. Nếu ngân hàng bắt buộc VA, tạo VA nhận quỹ trong SePay và dùng đúng số VA đó cho QR/chuyển khoản.',
  },
  {
    title: 'Kết nối API, Internet Banking hoặc OAuth',
    body: 'Làm theo màn hình kết nối của từng ngân hàng. Chỉ tiếp tục khi tài khoản chuyển sang trạng thái Hoạt động với chấm xanh; tài khoản tạm ngưng hoặc mất kết nối sẽ không gửi webhook.',
  },
  {
    title: 'Cấu hình VA hoặc TKP nếu ngân hàng yêu cầu',
    body: 'VA chính thức nhận diện giao dịch theo số tài khoản VA; VA nội dung/TKP nhận diện theo nội dung chuyển khoản. Với SplitBill, mã QUY vẫn phải nằm trong nội dung để hệ thống ghép đúng người đóng.',
  },
  {
    title: 'Chuyển thử và kiểm tra trong mục Giao dịch',
    body: 'Chuyển một số tiền nhỏ vào đúng tài khoản hoặc VA, mở Giao dịch trong SePay và xác nhận giao dịch xuất hiện. Nếu SePay chưa thấy giao dịch thì webhook sau đó cũng không chạy.',
  },
  {
    title: 'Lưu cùng thông tin vào SplitBill',
    body: 'Sau khi kiểm tra thành công, chọn ngân hàng, nhập số tài khoản/VA nhận quỹ trong SplitBill và bấm kiểm tra để hệ thống tự lấy tên chủ tài khoản.',
  },
];

const sepayWebhookGuideSteps = [
  {
    title: 'Bước 1 - Cơ bản',
    body: 'Vào Webhooks, bấm Thêm webhook. Đặt tên dễ nhớ, dán URL nhận webhook do SplitBill cấp, chọn loại sự kiện Tiền vào, giữ Content-Type là application/json và bật webhook.',
  },
  {
    title: 'Bước 2 - Tài khoản và mã thanh toán',
    body: 'Chọn đúng tài khoản nhận quỹ đã liên kết. Vào Cấu hình Công ty → Cấu hình chung → Cấu trúc mã thanh toán để bật nhận diện mã thanh toán với tiền tố QUY.',
  },
  {
    title: 'Bước 3 - Bảo mật',
    body: 'Chọn HMAC-SHA256, dán Secret Key SplitBill hiển thị sau khi lưu tài khoản nhận quỹ. Không gửi Secret Key qua chat công khai; nếu lộ thì lưu lại tài khoản để tạo key mới.',
  },
  {
    title: 'Bước 4 - Cảnh báo và gửi thử',
    body: 'Bật cảnh báo nếu cần, lưu webhook, rồi dùng menu Gửi thử. Gửi thử chỉ kiểm tra URL và chữ ký; sau đó vẫn cần chuyển khoản thật số nhỏ để xác nhận trạng thái đóng quỹ tự cập nhật.',
  },
];

function SePayGuideStepList({ steps }) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => (
        <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-3 text-sm leading-6 text-slate-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b7443] text-sm font-semibold text-white">
            {index + 1}
          </span>
          <span>
            <span className="block font-semibold text-slate-900">{step.title}</span>
            <span className="mt-1 block">{step.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

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
          setLoadError(error.response?.data?.error?.message ?? 'Không tải được workspace quỹ.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không đổi được đợt thu.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không tải được chi tiết đợt thu.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không lưu được đợt thu quỹ.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không cập nhật được đợt thu.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không lưu được thông tin QR.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không lưu được khoản chi quỹ.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không xóa được khoản chi quỹ.');
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
      toast.error(error.response?.data?.error?.message ?? 'Không xác nhận được đóng quỹ.');
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
                  setLoadError(error.response?.data?.error?.message ?? 'Không tải được workspace quỹ.');
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

  const roleLabels = {
    leader: 'Trưởng nhóm',
    secretary: 'Thư ký',
    member: 'Thành viên',
  };
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
      <PageContainer
        eyebrow="Hướng dẫn SePay"
        title={group ? `Kết nối SePay - ${group.name}` : 'Kết nối SePay'}
        description="Thiết lập tài khoản nhận quỹ và webhook tiền vào bằng các bước ngắn, rõ, không đụng tới giao dịch cá nhân ngoài mã quỹ."
        actions={pageActions}
      >
        {fundNavigation}

        <div className="grid gap-6">
          <SurfaceCard
            title="Thêm tài khoản nhận quỹ vào SePay"
            description="Tài khoản phải ở trạng thái hoạt động trước khi SePay có thể gửi webhook tiền vào về SplitBill."
          >
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
              <img
                src={sepayBankGuideIllustration}
                alt="Minh họa thêm tài khoản ngân hàng nhận quỹ trong SePay"
                className="w-full rounded-2xl border border-[#d1fadf] bg-white shadow-panel"
              />
              <div className="grid gap-5">
                <div className="rounded-2xl bg-[#f7fdf9] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b7443]">
                    Tài khoản nhận quỹ
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                    Liên kết tài khoản riêng cho quỹ nhóm
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Nên dùng tài khoản riêng để nhận quỹ. SplitBill chỉ dùng giao dịch có mã quỹ đúng định dạng và bỏ qua giao dịch cá nhân không khớp mã.
                  </p>
                </div>
                <SePayGuideStepList steps={sepayBankGuideSteps} />
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Tạo webhook tiền vào"
            description="Dán URL và Secret Key do SplitBill cấp vào SePay để tự động ghi nhận đóng quỹ."
          >
            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-center">
              <div className="grid gap-5">
                <div className="rounded-2xl border border-[#d1fadf] bg-[#f7fdf9] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b7443]">
                    Webhook an toàn
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                    Chỉ nhận giao dịch có mã QUY hợp lệ
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Chọn sự kiện tiền vào, bật HMAC-SHA256 và dán Secret Key từ SplitBill. Không gửi Secret Key qua chat công khai.
                  </p>
                </div>
                <SePayGuideStepList steps={sepayWebhookGuideSteps} />
              </div>
              <img
                src={sepayWebhookGuideIllustration}
                alt="Minh họa tạo webhook tiền vào trong SePay"
                className="w-full rounded-2xl border border-[#d1fadf] bg-white shadow-panel"
              />
            </div>
          </SurfaceCard>
        </div>
      </PageContainer>
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
          hint={`Vai trò của bạn: ${roleLabels[myRole] ?? myRole}`}
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
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard
          title="Đợt thu quỹ"
          description="Chọn đợt thu quỹ phía dưới để xem thông tin chi tiết và mã định danh đóng quỹ của bạn."
        >
          {renderCampaignList(isLeader
            ? 'Trưởng nhóm có thể tạo đợt thu quỹ đầu tiên trong trang quản lý quỹ.'
            : 'Khi Trưởng nhóm tạo đợt thu quỹ mới, danh sách sẽ hiển thị ở đây để bạn theo dõi.')}
        </SurfaceCard>

        <div className="grid gap-6">
          {selectedCampaign && contributionState ? (
            <>
              <SurfaceCard
                title="Thông tin đóng quỹ của bạn"
                description="Quét mã QR động bên cạnh hoặc copy mã chuyển khoản để thực hiện thanh toán."
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                  <div className="grid gap-4">
                    <div className="rounded-xl border border-[#0b7443] bg-[linear-gradient(135deg,_rgba(11,116,67,0.12),_rgba(209,250,223,0.65))] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0b7443]">
                        Mã chuyển khoản (Nội dung CK)
                      </p>
                      <p className="mt-4 break-all rounded-xl bg-slate-950 px-4 py-4 font-mono text-lg font-semibold tracking-[0.12em] text-[#d1fadf]">
                        {contributionState.my_contribution.transfer_code}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-[#eceff4] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Tài khoản nhận
                        </p>
                        {currentQrInfo ? (
                          <>
                            <p className="mt-3 text-sm font-semibold text-slate-900">{currentQrInfo.bank_name}</p>
                            {currentQrInfo.account_name ? (
                              <p className="mt-1 text-sm text-slate-700">{currentQrInfo.account_name}</p>
                            ) : null}
                            <p className="mt-1 font-mono text-sm text-slate-900">{currentQrInfo.account_number}</p>
                          </>
                        ) : (
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Thư ký chưa cấu hình tài khoản nhận quỹ cho đợt thu này.
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl bg-[#fee9d1] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#715039]">
                          Trạng thái đóng quỹ
                        </p>
                        <span
                          className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[contributionState.my_contribution.status] ?? statusTone.pending}`}
                        >
                          {statusLabel[contributionState.my_contribution.status] ?? contributionState.my_contribution.status}
                        </span>
                        <p className="mt-3 text-sm text-[#715039]">
                          Còn phải đóng: {formatCurrency(contributionState.my_contribution.remaining)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#d1fadf] bg-white p-4">
                    {currentQrInfo ? (
                      <img
                        src={currentQrInfo.qr_url}
                        alt={`QR cho ${selectedCampaign.title}`}
                        className="h-full w-full rounded-xl border border-[#d1fadf] bg-[#f7fdf9] object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-[#d1fadf] bg-[#f7fdf9] p-6 text-center text-sm leading-7 text-slate-600">
                        Mã QR chuyển khoản sẽ hiển thị tại đây khi Thư ký cấu hình tài khoản.
                      </div>
                    )}
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard
                title="Lịch sử đóng quỹ"
                description="Danh sách ghi nhận từng lần đóng quỹ tự động hoặc thủ công của cả nhóm."
              >
                {historyState?.history?.length ? (
                  <div className="grid gap-3">
                    {historyState.history.map((item, index) => (
                      <article
                        key={`${item.user_name}-${item.paid_at}-${index}`}
                        className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.user_name}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatDate(item.paid_at)} - {item.method === 'manual' ? 'Thư ký xác nhận thủ công' : 'Chuyển khoản tự động'}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-[#0b7443]">{formatCurrency(item.amount)}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                          <span>Lũy kế: {formatCurrency(item.cumulative_paid)}</span>
                          <span>Nghĩa vụ: {formatCurrency(item.amount_required)}</span>
                          {item.confirmed_by_name ? <span>Thư ký xác nhận: {item.confirmed_by_name}</span> : null}
                        </div>
                        {item.note ? <p className="mt-3 text-sm leading-7 text-slate-700">{item.note}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Chưa có lịch sử đóng quỹ"
                    description="Khi các thành viên đóng quỹ, lịch sử nộp tiền sẽ hiển thị đầy đủ tại đây."
                  />
                )}
              </SurfaceCard>
            </>
          ) : (
            <SurfaceCard title="Chi tiết đợt thu quỹ">
              <EmptyState
                title="Chọn đợt thu để xem mã chuyển khoản"
                description="Nếu nhóm có đợt thu quỹ đang hoạt động, chi tiết thanh toán của bạn sẽ hiển thị tại đây."
              />
            </SurfaceCard>
          )}
        </div>
      </div>
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
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            {activeManageSection === 'payments' ? (
            <div className="grid gap-6">
              {isSecretary && activeManageSection === 'payments' ? (
                <>
                  <SurfaceCard
                    title="Hướng dẫn kết nối SePay"
                    description="Mở trang hướng dẫn riêng để xem ảnh minh họa PNG và các bước cấu hình webhook trước khi lưu tài khoản nhận quỹ."
                  >
                    <div className="rounded-2xl border border-[#d1fadf] bg-[#f7fdf9] p-5">
                      <p className="text-sm leading-7 text-slate-700">
                        Hãy kiểm tra tài khoản nhận quỹ trong SePay, tạo webhook tiền vào và bật HMAC-SHA256 trước khi lưu cấu hình bên dưới.
                      </p>
                      <Link
                        to={`/groups/${id}/fund/sepay-guide`}
                        className="mt-4 inline-flex rounded-xl app-button-primary"
                      >
                        Mở hướng dẫn SePay
                      </Link>
                    </div>
                  </SurfaceCard>

                  <SurfaceCard
                    title="Tài khoản nhận quỹ"
                    description="Thư ký thay đổi tài khoản nhận quỹ của nhóm bằng cách lưu cấu hình mới. Mã QR động sẽ được tạo tự động."
                  >
                    <form className="grid gap-4" onSubmit={handleSubmitQr}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Ngân hàng
                          <select
                            aria-label="fund-qr-bank-id"
                            value={qrFormState.bankId}
                            onChange={(event) => {
                              const selectedBank = banks.find((bank) => bank.bank_id === event.target.value);
                              setQrFormState((current) => ({
                                ...current,
                                bankId: event.target.value,
                                bankName: selectedBank?.bank_name ?? '',
                              }));
                            }}
                            className="rounded-xl app-input"
                          >
                            <option value="">Chọn ngân hàng</option>
                            {banks.map((bank) => (
                              <option key={bank.bank_id} value={bank.bank_id}>
                                {bank.bank_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Số tài khoản
                          <input
                            aria-label="fund-qr-account-number"
                            type="text"
                            value={qrFormState.accountNumber}
                            onChange={(event) => {
                              setQrFormState((current) => ({
                                ...current,
                                accountNumber: event.target.value,
                              }));
                            }}
                            className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 font-mono outline-none transition focus:border-[#0b7443]"
                            placeholder="0123456789"
                          />
                        </label>
                      </div>

                      <div className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4 text-sm leading-7 text-slate-700">
                        SplitBill chỉ xử lý giao dịch có mã quỹ đúng định dạng. Giao dịch cá nhân hoặc giao dịch không có mã quỹ sẽ bị bỏ qua, hệ thống không đọc hoặc lưu số dư tài khoản. Nên dùng một tài khoản riêng để nhận quỹ nhóm.
                      </div>

                      <label className="flex items-start gap-3 rounded-xl border border-[#d1fadf] bg-white p-4 text-sm leading-6 text-slate-700">
                        <input
                          type="checkbox"
                          checked={qrPrivacyAcknowledged}
                          onChange={(event) => {
                            setQrPrivacyAcknowledged(event.target.checked);
                            if (event.target.checked) {
                              setQrPrivacyError('');
                            }
                          }}
                          aria-describedby={qrPrivacyError ? 'qr-privacy-error' : undefined}
                          className="mt-1 h-4 w-4 rounded border-[#d1fadf] text-[#0b7443] focus:ring-[#0b7443]"
                        />
                        <span>
                          Tôi đã đọc hướng dẫn và hiểu SplitBill chỉ xử lý giao dịch có mã quỹ.
                        </span>
                      </label>

                      {qrPrivacyError ? (
                        <p id="qr-privacy-error" className="text-sm font-medium text-rose-600">
                          {qrPrivacyError}
                        </p>
                      ) : null}

                      {webhookSetup?.webhook_url && webhookSetup?.webhook_secret ? (
                        <div className="grid gap-3 rounded-xl border border-[#0b7443] bg-white p-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Thông tin dán vào SePay</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              Secret Key chỉ hiển thị đầy đủ ngay sau khi lưu cấu hình này. Nếu làm lộ hoặc mất mã, hãy lưu lại tài khoản nhận quỹ để tạo mã mới.
                            </p>
                          </div>
                          <div className="grid gap-3">
                            <div className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                URL nhận webhook
                              </span>
                              <div className="flex flex-col gap-2 rounded-xl bg-[#f7fdf9] p-3 md:flex-row md:items-center">
                                <code className="min-w-0 flex-1 break-all font-mono text-sm text-slate-900">
                                  {webhookSetup.webhook_url}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyWebhookValue(webhookSetup.webhook_url, 'URL webhook')}
                                  className="rounded-lg border border-[#d1fadf] bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                                >
                                  Sao chép
                                </button>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Secret Key HMAC-SHA256
                              </span>
                              <div className="flex flex-col gap-2 rounded-xl bg-[#f7fdf9] p-3 md:flex-row md:items-center">
                                <code className="min-w-0 flex-1 break-all font-mono text-sm text-slate-900">
                                  {webhookSetup.webhook_secret}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyWebhookValue(webhookSetup.webhook_secret, 'Secret Key')}
                                  className="rounded-lg border border-[#d1fadf] bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                                >
                                  Sao chép
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#d1fadf] bg-white p-4 text-sm leading-7 text-slate-600">
                          Sau khi lưu tài khoản nhận quỹ, SplitBill sẽ hiển thị URL webhook và Secret Key riêng của nhóm để thư ký dán vào SePay.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={
                            isSubmittingQr ||
                            !qrFormState.bankId.trim() ||
                            !/^[0-9]{4,32}$/.test(qrFormState.accountNumber.trim())
                          }
                          className="rounded-xl app-button-primary"
                        >
                          {isSubmittingQr ? 'Đang lưu...' : 'Lưu tài khoản nhận quỹ'}
                        </button>
                        <button
                          type="button"
                          onClick={resetQrForm}
                          className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                        >
                          Xóa form
                        </button>
                      </div>
                    </form>
                  </SurfaceCard>
                </>
              ) : null}

              <SurfaceCard
                title="Danh sách đóng quỹ thành viên"
                description="Ban điều hành theo dõi trạng thái, đối soát mã chuyển khoản và xác nhận đóng quỹ cho từng thành viên."
              >
                {!selectedCampaignId ? (
                  <EmptyState
                    title="Chưa chọn đợt thu quỹ"
                    description="Vui lòng chọn đợt thu quỹ ở bảng bên cạnh để xem danh sách đóng quỹ."
                  />
                ) : !operatorContributions?.contributions?.length ? (
                  <EmptyState
                    title="Chưa có dữ liệu đóng quỹ"
                    description="Đợt thu này hiện chưa có dữ liệu đóng quỹ của thành viên."
                  />
                ) : (
                  <div className="grid gap-3">
                    {operatorContributions.contributions.map((item) => (
                      <article
                        key={item.user_id}
                        className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.display_name || item.user_id}</p>
                            <p className="mt-1 font-mono text-xs tracking-[0.14em] text-slate-500">{item.transfer_code}</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[item.status] ?? statusTone.pending}`}
                          >
                            {statusLabel[item.status] ?? item.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                          <span>Cần đóng: {formatCurrency(item.amount_required)}</span>
                          <span>Đã đóng: {formatCurrency(item.amount_paid)}</span>
                        </div>
                        {isSecretary && confirmableContributions.some((candidate) => candidate.user_id === item.user_id) ? (
                          <button
                            type="button"
                            onClick={() =>
                              setManualFormState({
                                userId: item.user_id,
                                amount: String(Math.max(0, item.amount_required - item.amount_paid)),
                                note: '',
                              })
                            }
                            className="mt-4 rounded-xl app-button-secondary"
                          >
                            Xác nhận thủ công
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </SurfaceCard>
            </div>
            ) : null}

            <div className="grid gap-6">
              {isSecretary && activeManageSection === 'payments' ? (
                <SurfaceCard
                  title="Xác nhận đóng quỹ thủ công"
                  description="Thư ký chọn thành viên từ danh sách đóng quỹ, điền số tiền thực tế nhận được và ghi chú đối soát."
                >
                  <form className="grid gap-4" onSubmit={handleSubmitManualConfirm}>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Thành viên đóng quỹ
                      <select
                        value={manualFormState.userId}
                        onChange={(event) =>
                          setManualFormState((current) => ({ ...current, userId: event.target.value }))
                        }
                        className="rounded-xl app-input"
                      >
                        <option value="">Chọn thành viên</option>
                        {confirmableContributions.map((item) => (
                          <option key={item.user_id} value={item.user_id}>
                            {item.display_name || item.user_id}
                          </option>
                        ))}
                      </select>
                    </label>

                    {!confirmableContributions.length ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                        Không còn thành viên nào cần xác nhận thủ công trong đợt thu này.
                      </div>
                    ) : null}

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Số tiền xác nhận
                      <input
                        type="number"
                        min="1"
                        value={manualFormState.amount}
                        onChange={(event) =>
                          setManualFormState((current) => ({ ...current, amount: event.target.value }))
                        }
                        className="rounded-xl app-input"
                      />
                    </label>

                    {selectedContributionRecord ? (
                      <div className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] px-4 py-4 text-sm leading-7 text-slate-700">
                        Còn phải đóng: {formatCurrency(Math.max(0, selectedContributionRecord.amount_required - selectedContributionRecord.amount_paid))}
                      </div>
                    ) : null}

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Ghi chú xác nhận
                      <textarea
                        value={manualFormState.note}
                        onChange={(event) =>
                          setManualFormState((current) => ({ ...current, note: event.target.value }))
                        }
                        className="min-h-24 rounded-xl app-input"
                        placeholder="Ví dụ: Đóng tiền mặt trực tiếp"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmittingManualConfirm || !selectedContributionRecord}
                      className="rounded-xl app-button-primary"
                    >
                      {isSubmittingManualConfirm ? 'Đang xác nhận...' : 'Xác nhận đóng quỹ'}
                    </button>
                  </form>
                </SurfaceCard>
              ) : null}

              {activeManageSection === 'spendings' ? (
              <>
              <SurfaceCard
                title={editingSpendingId ? 'Cập nhật khoản chi quỹ' : 'Ghi khoản chi quỹ'}
                description="Trưởng nhóm và Thư ký ghi nhận các khoản chi tiêu thực tế từ quỹ chung."
              >
                <form className="grid gap-4" onSubmit={handleSubmitSpending}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Tiêu đề khoản chi
                    <input
                      type="text"
                      value={spendingFormState.title}
                      onChange={(event) =>
                        setSpendingFormState((current) => ({ ...current, title: event.target.value }))
                      }
                      className="rounded-xl app-input"
                      placeholder="Ví dụ: Mua nước ngọt, Đặt cọc phòng..."
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Số tiền chi
                      <input
                        type="number"
                        min="1"
                        value={spendingFormState.amount}
                        onChange={(event) =>
                          setSpendingFormState((current) => ({ ...current, amount: event.target.value }))
                        }
                        className="rounded-xl app-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Ngày chi
                      <input
                        type="date"
                        value={spendingFormState.spentAt}
                        onChange={(event) =>
                          setSpendingFormState((current) => ({ ...current, spentAt: event.target.value }))
                        }
                        className="rounded-xl app-input"
                      />
                    </label>
                  </div>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Ghi chú chi tiết
                    <textarea
                      value={spendingFormState.note}
                      onChange={(event) =>
                        setSpendingFormState((current) => ({ ...current, note: event.target.value }))
                      }
                      className="min-h-24 rounded-xl app-input"
                      placeholder="Nhập thông tin chi tiết về khoản chi này..."
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Ảnh hóa đơn / Chứng từ chi quỹ
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setSpendingFormState((current) => ({
                          ...current,
                          receipt: event.target.files?.[0] ?? null,
                        }))
                      }
                      className="rounded-xl border border-dashed border-[#d1fadf] bg-[#f7fdf9] px-4 py-3 text-sm text-slate-600"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSubmittingSpending}
                      className="rounded-xl app-button-primary"
                    >
                      {isSubmittingSpending
                        ? 'Đang lưu...'
                        : editingSpendingId
                          ? 'Cập nhật khoản chi'
                          : 'Ghi khoản chi'}
                    </button>
                    {editingSpendingId ? (
                      <button
                        type="button"
                        onClick={resetSpendingForm}
                        className="rounded-xl border border-[#d1fadf] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#f7fdf9]"
                      >
                        Hủy sửa
                      </button>
                    ) : null}
                  </div>
                </form>
              </SurfaceCard>

              <SurfaceCard
                title="Sổ chi quỹ nhóm"
                description="Danh sách các khoản chi tiêu minh bạch từ quỹ chung của cả nhóm."
              >
                {spendings.length === 0 ? (
                  <EmptyState
                    title="Chưa có khoản chi quỹ nào"
                    description="Ngay khi ban điều hành ghi nhận khoản chi quỹ đầu tiên, thông tin sẽ hiển thị tại đây."
                  />
                ) : (
                  <div className="grid gap-3">
                    {spendings.map((spending) => (
                      <article
                        key={spending.id}
                        className="rounded-xl border border-[#d1fadf] bg-[#f7fdf9] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{spending.title}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatDate(spending.spent_at)} - ghi bởi {spending.recorded_by.display_name}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-slate-900">{formatCurrency(spending.amount)}</p>
                        </div>
                        {spending.note ? <p className="mt-3 text-sm leading-7 text-slate-700">{spending.note}</p> : null}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditSpending(spending)}
                            className="rounded-xl app-button-secondary"
                          >
                            Sửa
                          </button>
                          {isLeader ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteSpending(spending.id)}
                              className="rounded-xl app-button-danger"
                            >
                              Xóa
                            </button>
                          ) : null}
                          {spending.receipt_url ? (
                            <a
                              href={spending.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-[#c7e0f8] bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#eef6ff]"
                            >
                              Xem hóa đơn
                            </a>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </SurfaceCard>
              </>
              ) : null}
            </div>
          </div>
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
}
