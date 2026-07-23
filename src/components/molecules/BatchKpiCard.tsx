import { FC } from 'react';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';
import { summarizeBatch } from '@/domain/image/batch';
import { formatBytes, splitBytes } from '@/lib/format';

const BatchKpiCard: FC = () => {
  const { t } = useTranslation();
  const images = useImageStore(s => s.images);

  const { isRealized, totalOriginal, totalAfter, saved, percent, formats } = summarizeBatch(images);
  const savedFigure = splitBytes(saved);

  const eyebrow = isRealized ? t('batch.kpi.realized') : t('batch.kpi.estimated');
  const formatList = formats.join(' · ');

  return (
    <div className="relative overflow-hidden rounded-xl px-6 py-5 shadow-glow bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-deep)_100%)]">
      <Blob />
      <div className="relative z-10">
        <div className="eyebrow text-white">{eyebrow}</div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-sans text-white text-[38px] font-bold leading-none tracking-[-0.02em] tabular-nums">
            {savedFigure.value}
          </span>
          <span className="text-white/75 text-base font-medium">
            {t('batch.kpi.gained', { unit: savedFigure.unit })}
          </span>
        </div>

        <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-white/70">
          <span className="mono">
            {formatBytes(totalOriginal)} {formatList && `· ${formatList}`}
          </span>
          <span className="mono text-white font-medium">
            −{percent}% · ~{formatBytes(totalAfter)}
          </span>
        </div>
      </div>
    </div>
  );
};

function Blob() {
  return (
    <svg
      width="220"
      height="220"
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="absolute -right-10 -top-10 opacity-[0.18] pointer-events-none"
    >
      <path
        fill="white"
        d="M37,-66.5C46.5,-58.7,52,-46,58.5,-33.5C65,-21,72.5,-8.6,71.6,3.2C70.7,15,61.4,26.4,52.5,37.7C43.6,49,35.1,60.3,23.7,66.5C12.3,72.6,-2.1,73.6,-15.6,69.7C-29.1,65.7,-41.7,57,-50.4,45.5C-59.1,34,-63.9,19.7,-66.4,4.5C-68.9,-10.7,-69.1,-26.7,-61.6,-37.7C-54,-48.6,-38.6,-54.4,-25.1,-60.5C-11.6,-66.5,0.1,-72.7,12.6,-73.5C25.1,-74.3,38.4,-69.7,37,-66.5Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

export default BatchKpiCard;
