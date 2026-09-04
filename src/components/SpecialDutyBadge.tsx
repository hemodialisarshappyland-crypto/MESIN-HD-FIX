import React from 'react';
import {
  Package,
  Droplets,
  Pill,
  RefreshCw,
  ShieldAlert,
  FileCheck2,
  Tag,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SPECIAL_DUTY_OPTIONS, SpecialDutyInfo, parseSpecialDuties } from '../types';

interface SpecialDutyBadgeProps {
  duty?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showDescription?: boolean;
  className?: string;
}

const renderDutyIcon = (iconName?: string, iconClass = 'w-3 h-3') => {
  switch (iconName) {
    case 'Package':
      return <Package className={iconClass} />;
    case 'Droplets':
      return <Droplets className={iconClass} />;
    case 'Pill':
      return <Pill className={iconClass} />;
    case 'RefreshCw':
      return <RefreshCw className={iconClass} />;
    case 'ShieldAlert':
      return <ShieldAlert className={iconClass} />;
    case 'FileCheck2':
      return <FileCheck2 className={iconClass} />;
    case 'Zap':
      return <Zap className={iconClass} />;
    default:
      return <Tag className={iconClass} />;
  }
};

const SingleBadge: React.FC<{
  singleDuty: string;
  size: 'xs' | 'sm' | 'md';
  showDescription: boolean;
  className?: string;
}> = ({ singleDuty, size, showDescription, className = '' }) => {
  const normalized = singleDuty.trim();
  const info: SpecialDutyInfo | undefined = SPECIAL_DUTY_OPTIONS[normalized];

  const badgeClass =
    info?.badgeClass ||
    'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800';

  const iconName = info?.iconName;
  const label = info?.label || normalized;
  const shortName = info?.shortName || normalized;
  const description = info?.description;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 rounded-md gap-1',
    sm: 'text-[10px] px-2 py-0.5 rounded-lg gap-1.5 font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-xl gap-1.5 font-bold',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span
        title={description || label}
        className={`inline-flex items-center border shadow-2xs transition-all select-none ${badgeClass} ${sizeClasses[size]}`}
      >
        {renderDutyIcon(iconName, iconSizes[size])}
        <span className="truncate">{size === 'xs' ? shortName : label}</span>
      </span>
      {showDescription && description && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
          {description}
        </span>
      )}
    </div>
  );
};

export const SpecialDutyBadge: React.FC<SpecialDutyBadgeProps> = ({
  duty,
  size = 'sm',
  showDescription = false,
  className = '',
}) => {
  if (!duty || !duty.trim()) return null;

  const duties = parseSpecialDuties(duty);
  if (duties.length === 0) return null;

  if (duties.length === 1) {
    return (
      <SingleBadge
        singleDuty={duties[0]}
        size={size}
        showDescription={showDescription}
        className={className}
      />
    );
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {duties.map((d) => (
        <SingleBadge
          key={d}
          singleDuty={d}
          size={size}
          showDescription={showDescription}
        />
      ))}
    </div>
  );
};
