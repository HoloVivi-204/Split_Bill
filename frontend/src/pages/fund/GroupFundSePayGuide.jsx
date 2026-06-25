import { PageContainer } from '../../components/common/PageContainer';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import sepayBankGuideIllustration from '../../assets/sepay-bank-account-guide.png';
import sepayWebhookGuideIllustration from '../../assets/sepay-webhook-form-guide.png';

const sepayBankGuideSteps = [
  {
    title: 'Kiá»ƒm tra ngÃ¢n hÃ ng cÃ³ há»— trá»£ webhook tiá»n vÃ o',
    body: 'VÃ o Dashboard SePay â†’ TÃ i khoáº£n ngÃ¢n hÃ ng â†’ ThÃªm tÃ i khoáº£n vÃ  chá»n ngÃ¢n hÃ ng trong danh sÃ¡ch há»— trá»£. ACB, MBBank, VPBank cÃ³ thá»ƒ nháº­n tiá»n vÃ o qua tÃ i khoáº£n chÃ­nh; BIDV, MSB, KienlongBank, OCB thÆ°á»ng báº¯t buá»™c dÃ¹ng VA.',
  },
  {
    title: 'Nháº­p Ä‘Ãºng loáº¡i tÃ i khoáº£n vÃ  sá»‘ nháº­n quá»¹',
    body: 'Chá»n CÃ¡ nhÃ¢n hoáº·c Doanh nghiá»‡p theo tÃ i khoáº£n tháº­t, nháº­p sá»‘ tÃ i khoáº£n nháº­n quá»¹. Náº¿u ngÃ¢n hÃ ng báº¯t buá»™c VA, táº¡o VA nháº­n quá»¹ trong SePay vÃ  dÃ¹ng Ä‘Ãºng sá»‘ VA Ä‘Ã³ cho QR/chuyá»ƒn khoáº£n.',
  },
  {
    title: 'Káº¿t ná»‘i API, Internet Banking hoáº·c OAuth',
    body: 'LÃ m theo mÃ n hÃ¬nh káº¿t ná»‘i cá»§a tá»«ng ngÃ¢n hÃ ng. Chá»‰ tiáº¿p tá»¥c khi tÃ i khoáº£n chuyá»ƒn sang tráº¡ng thÃ¡i Hoáº¡t Ä‘á»™ng vá»›i cháº¥m xanh; tÃ i khoáº£n táº¡m ngÆ°ng hoáº·c máº¥t káº¿t ná»‘i sáº½ khÃ´ng gá»­i webhook.',
  },
  {
    title: 'Cáº¥u hÃ¬nh VA hoáº·c TKP náº¿u ngÃ¢n hÃ ng yÃªu cáº§u',
    body: 'VA chÃ­nh thá»©c nháº­n diá»‡n giao dá»‹ch theo sá»‘ tÃ i khoáº£n VA; VA ná»™i dung/TKP nháº­n diá»‡n theo ná»™i dung chuyá»ƒn khoáº£n. Vá»›i SplitBill, mÃ£ QUY váº«n pháº£i náº±m trong ná»™i dung Ä‘á»ƒ há»‡ thá»‘ng ghÃ©p Ä‘Ãºng ngÆ°á»i Ä‘Ã³ng.',
  },
  {
    title: 'Chuyá»ƒn thá»­ vÃ  kiá»ƒm tra trong má»¥c Giao dá»‹ch',
    body: 'Chuyá»ƒn má»™t sá»‘ tiá»n nhá» vÃ o Ä‘Ãºng tÃ i khoáº£n hoáº·c VA, má»Ÿ Giao dá»‹ch trong SePay vÃ  xÃ¡c nháº­n giao dá»‹ch xuáº¥t hiá»‡n. Náº¿u SePay chÆ°a tháº¥y giao dá»‹ch thÃ¬ webhook sau Ä‘Ã³ cÅ©ng khÃ´ng cháº¡y.',
  },
  {
    title: 'LÆ°u cÃ¹ng thÃ´ng tin vÃ o SplitBill',
    body: 'Sau khi kiá»ƒm tra thÃ nh cÃ´ng, chá»n ngÃ¢n hÃ ng, nháº­p sá»‘ tÃ i khoáº£n/VA nháº­n quá»¹ trong SplitBill vÃ  báº¥m kiá»ƒm tra Ä‘á»ƒ há»‡ thá»‘ng tá»± láº¥y tÃªn chá»§ tÃ i khoáº£n.',
  },
];

const sepayWebhookGuideSteps = [
  {
    title: 'BÆ°á»›c 1 - CÆ¡ báº£n',
    body: 'VÃ o Webhooks, báº¥m ThÃªm webhook. Äáº·t tÃªn dá»… nhá»›, dÃ¡n URL nháº­n webhook do SplitBill cáº¥p, chá»n loáº¡i sá»± kiá»‡n Tiá»n vÃ o, giá»¯ Content-Type lÃ  application/json vÃ  báº­t webhook.',
  },
  {
    title: 'BÆ°á»›c 2 - TÃ i khoáº£n vÃ  mÃ£ thanh toÃ¡n',
    body: 'Chá»n Ä‘Ãºng tÃ i khoáº£n nháº­n quá»¹ Ä‘Ã£ liÃªn káº¿t. VÃ o Cáº¥u hÃ¬nh CÃ´ng ty â†’ Cáº¥u hÃ¬nh chung â†’ Cáº¥u trÃºc mÃ£ thanh toÃ¡n Ä‘á»ƒ báº­t nháº­n diá»‡n mÃ£ thanh toÃ¡n vá»›i tiá»n tá»‘ QUY.',
  },
  {
    title: 'BÆ°á»›c 3 - Báº£o máº­t',
    body: 'Chá»n HMAC-SHA256, dÃ¡n Secret Key SplitBill hiá»ƒn thá»‹ sau khi lÆ°u tÃ i khoáº£n nháº­n quá»¹. KhÃ´ng gá»­i Secret Key qua chat cÃ´ng khai; náº¿u lá»™ thÃ¬ lÆ°u láº¡i tÃ i khoáº£n Ä‘á»ƒ táº¡o key má»›i.',
  },
  {
    title: 'BÆ°á»›c 4 - Cáº£nh bÃ¡o vÃ  gá»­i thá»­',
    body: 'Báº­t cáº£nh bÃ¡o náº¿u cáº§n, lÆ°u webhook, rá»“i dÃ¹ng menu Gá»­i thá»­. Gá»­i thá»­ chá»‰ kiá»ƒm tra URL vÃ  chá»¯ kÃ½; sau Ä‘Ã³ váº«n cáº§n chuyá»ƒn khoáº£n tháº­t sá»‘ nhá» Ä‘á»ƒ xÃ¡c nháº­n tráº¡ng thÃ¡i Ä‘Ã³ng quá»¹ tá»± cáº­p nháº­t.',
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

export function GroupFundSePayGuide({ group, pageActions, fundNavigation }) {
  return (
    <PageContainer
      eyebrow="HÆ°á»›ng dáº«n SePay"
      title={group ? `Káº¿t ná»‘i SePay - ${group.name}` : 'Káº¿t ná»‘i SePay'}
      description="Thiáº¿t láº­p tÃ i khoáº£n nháº­n quá»¹ vÃ  webhook tiá»n vÃ o báº±ng cÃ¡c bÆ°á»›c ngáº¯n, rÃµ, khÃ´ng Ä‘á»¥ng tá»›i giao dá»‹ch cÃ¡ nhÃ¢n ngoÃ i mÃ£ quá»¹."
      actions={pageActions}
    >
      {fundNavigation}

      <div className="grid gap-6">
        <SurfaceCard
          title="ThÃªm tÃ i khoáº£n nháº­n quá»¹ vÃ o SePay"
          description="TÃ i khoáº£n pháº£i á»Ÿ tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng trÆ°á»›c khi SePay cÃ³ thá»ƒ gá»­i webhook tiá»n vÃ o vá» SplitBill."
        >
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
            <img
              src={sepayBankGuideIllustration}
              alt="Minh há»a thÃªm tÃ i khoáº£n ngÃ¢n hÃ ng nháº­n quá»¹ trong SePay"
              className="w-full rounded-2xl border border-[#d1fadf] bg-white shadow-panel"
            />
            <div className="grid gap-5">
              <div className="rounded-2xl bg-[#f7fdf9] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b7443]">
                  TÃ i khoáº£n nháº­n quá»¹
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  LiÃªn káº¿t tÃ i khoáº£n riÃªng cho quá»¹ nhÃ³m
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  NÃªn dÃ¹ng tÃ i khoáº£n riÃªng Ä‘á»ƒ nháº­n quá»¹. SplitBill chá»‰ dÃ¹ng giao dá»‹ch cÃ³ mÃ£ quá»¹ Ä‘Ãºng Ä‘á»‹nh dáº¡ng vÃ  bá» qua giao dá»‹ch cÃ¡ nhÃ¢n khÃ´ng khá»›p mÃ£.
                </p>
              </div>
              <SePayGuideStepList steps={sepayBankGuideSteps} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Táº¡o webhook tiá»n vÃ o"
          description="DÃ¡n URL vÃ  Secret Key do SplitBill cáº¥p vÃ o SePay Ä‘á»ƒ tá»± Ä‘á»™ng ghi nháº­n Ä‘Ã³ng quá»¹."
        >
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-center">
            <div className="grid gap-5">
              <div className="rounded-2xl border border-[#d1fadf] bg-[#f7fdf9] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b7443]">
                  Webhook an toÃ n
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  Chá»‰ nháº­n giao dá»‹ch cÃ³ mÃ£ QUY há»£p lá»‡
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Chá»n sá»± kiá»‡n tiá»n vÃ o, báº­t HMAC-SHA256 vÃ  dÃ¡n Secret Key tá»« SplitBill. KhÃ´ng gá»­i Secret Key qua chat cÃ´ng khai.
                </p>
              </div>
              <SePayGuideStepList steps={sepayWebhookGuideSteps} />
            </div>
            <img
              src={sepayWebhookGuideIllustration}
              alt="Minh há»a táº¡o webhook tiá»n vÃ o trong SePay"
              className="w-full rounded-2xl border border-[#d1fadf] bg-white shadow-panel"
            />
          </div>
        </SurfaceCard>
      </div>
    </PageContainer>
  );
}
