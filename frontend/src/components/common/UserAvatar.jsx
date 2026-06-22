import { getDefaultAvatarIndex } from './default-avatars';

const avatarPalettes = [
  ['#fee9d1', '#715039', '#ffdcb4'],
  ['#d1fadf', '#0b7443', '#61bc76'],
  ['#c7e0f8', '#1d4ed8', '#93c5fd'],
  ['#fef0c7', '#92400e', '#fbbf24'],
  ['#eceff4', '#334155', '#94a3b8'],
  ['#e1fdea', '#166534', '#86efac'],
  ['#ffe4e6', '#be123c', '#fb7185'],
  ['#e0f2fe', '#0369a1', '#7dd3fc'],
];

function AvatarArtwork({ index, label }) {
  const [background, ink, accent] = avatarPalettes[index % avatarPalettes.length];
  const earOffset = index % 2 === 0 ? 18 : 22;
  const hasWhiskers = index % 3 !== 0;
  const noseShape = index % 2 === 0 ? 'circle' : 'rounded';

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 96 96"
      className="h-full w-full"
      focusable="false"
    >
      <rect width="96" height="96" rx="28" fill={background} />
      <circle cx="48" cy="48" r="34" fill="white" opacity="0.5" />
      <circle cx={earOffset} cy="27" r="13" fill={accent} />
      <circle cx={96 - earOffset} cy="27" r="13" fill={accent} />
      <circle cx={earOffset} cy="27" r="6" fill={background} opacity="0.85" />
      <circle cx={96 - earOffset} cy="27" r="6" fill={background} opacity="0.85" />
      <circle cx="48" cy="52" r="28" fill={accent} />
      <circle cx="37" cy="47" r="4" fill={ink} />
      <circle cx="59" cy="47" r="4" fill={ink} />
      {noseShape === 'circle' ? (
        <circle cx="48" cy="57" r="4" fill={ink} />
      ) : (
        <rect x="43" y="53" width="10" height="8" rx="4" fill={ink} />
      )}
      <path d="M42 65 Q48 70 54 65" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {hasWhiskers ? (
        <>
          <path d="M22 56 H36" stroke={ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <path d="M60 56 H74" stroke={ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <path d="M24 64 L37 60" stroke={ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
          <path d="M59 60 L72 64" stroke={ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
        </>
      ) : null}
      <path d="M30 78 Q48 88 66 78" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

export function UserAvatar({
  avatarUrl,
  userId,
  groupId = '',
  displayName = 'thành viên',
  size = 'md',
  className = '',
}) {
  const sizeClass = {
    xs: 'h-8 w-8',
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }[size] || size;

  const label = `Ảnh đại diện của ${displayName || 'thành viên'}`;

  return (
    <span
      className={[
        'inline-flex shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-200',
        sizeClass,
        className,
      ].join(' ')}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <AvatarArtwork index={getDefaultAvatarIndex(`${groupId}:${userId || displayName}`)} label={label} />
      )}
    </span>
  );
}
