import { useTranslation } from 'react-i18next';
import type { Hotspot as HotspotType, Sample } from '../../types';
import { DEFAULT_HOTSPOT_RADIUS } from '../../constants/config';

interface HotspotProps {
  hotspot: HotspotType;
  sample: Sample;
  disabled: boolean;
  onCollect: (sample: Sample) => void;
  onHoverStart: (sampleId: string) => void;
  onHoverEnd: (sampleId: string) => void;
}

export function Hotspot({ hotspot, sample, disabled, onCollect, onHoverStart, onHoverEnd }: HotspotProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (disabled) return;
    onCollect(sample);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => !disabled && onHoverStart(sample.id)}
      onMouseLeave={() => onHoverEnd(sample.id)}
      onTouchStart={() => !disabled && onHoverStart(sample.id)}
      onTouchEnd={() => onHoverEnd(sample.id)}
      disabled={disabled}
      aria-label={t(sample.name)}
      title={t(sample.name)}
      className={`
        hotspot
        absolute rounded-full transition-transform
        ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}
      `}
      style={{
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        width: `${DEFAULT_HOTSPOT_RADIUS * 2}%`,
        minWidth: '44px',
        minHeight: '44px',
        aspectRatio: '1 / 1',
        translate: '-50% -50%',
        backgroundColor: disabled ? 'transparent' : `${sample.color}20`,
        borderColor: sample.color,
        borderWidth: '2px',
        borderStyle: 'solid',
        boxShadow: disabled ? 'none' : `0 0 8px 2px ${sample.color}40`,
      }}
    />
  );
}
