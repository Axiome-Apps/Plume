import { FC, ReactNode, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useImageStore } from '@/store/imageStore';
import { Button, SegmentedControl, Tooltip } from '../atoms';
import { LogoPlume, Stroke } from '../brand';
import type { CompressionLevelType, OutputFormatType } from '@/domain/compression/schema';

const SettingsPanel: FC = () => {
  const { t } = useTranslation();
  const images = useImageStore(s => s.images);
  const compressionSettings = useImageStore(s => s.compressionSettings);
  const isProcessing = useImageStore(s => s.isProcessing);
  const setOutputFormat = useImageStore(s => s.setOutputFormat);
  const setCompressionLevel = useImageStore(s => s.setCompressionLevel);
  const startCompression = useImageStore(s => s.startCompression);

  const pending = useMemo(() => images.filter(i => i.isPending()), [images]);
  const isPngOutput = compressionSettings.outputFormat === 'png';
  const hasHEIC = useMemo(() => images.some(img => img.format.toUpperCase() === 'HEIC'), [images]);

  const formatOptions: { value: OutputFormatType; label: string }[] = [
    { value: 'keep', label: t('header.controls.format.keep') },
    { value: 'webp', label: 'WebP' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
  ];

  const levelOptions: { value: CompressionLevelType; label: string }[] = [
    { value: 'light', label: t('header.controls.level.light') },
    { value: 'balanced', label: t('header.controls.level.balanced') },
    { value: 'aggressive', label: t('header.controls.level.aggressive') },
  ];

  const ctaLabel = isProcessing
    ? t('header.compression.active')
    : t('settings.cta', { count: pending.length });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="ax-eyebrow">{t('settings.eyebrow')}</span>
        <Stroke width={20} color="var(--color-primary-light)" />
      </div>

      <section className="bg-surface border border-rule rounded-xl p-5 space-y-4">
        <Row label={t('settings.format')} tooltip={t('header.controls.format.tooltip')}>
          <SegmentedControl
            options={formatOptions}
            value={compressionSettings.outputFormat}
            onChange={setOutputFormat}
            disabled={isProcessing}
            fullWidth
          />
        </Row>

        <Separator />

        <Row
          label={t('settings.intensity')}
          tooltip={
            isPngOutput
              ? `${t('header.controls.level.pngLocked')}${
                  hasHEIC ? `\n${t('header.controls.level.pngHeicWarning')}` : ''
                }`
              : t('header.controls.level.tooltip')
          }
        >
          <SegmentedControl
            options={levelOptions}
            value={compressionSettings.compressionLevel}
            onChange={setCompressionLevel}
            disabled={isProcessing || isPngOutput}
            fullWidth
          />
        </Row>
      </section>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={startCompression}
        disabled={isProcessing || pending.length === 0}
      >
        <LogoPlume size={24} color="white" />
        {ctaLabel}
      </Button>
    </div>
  );
};

const Row: FC<{ label: string; tooltip?: string; children: ReactNode }> = ({
  label,
  tooltip,
  children,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="ax-label text-fg-2">{label}</span>
      {tooltip && (
        <Tooltip title={label}>
          <div className="whitespace-pre-line">{tooltip}</div>
        </Tooltip>
      )}
    </div>
    {children}
  </div>
);

const Separator: FC = () => <div className="h-px bg-rule" />;

export default SettingsPanel;
