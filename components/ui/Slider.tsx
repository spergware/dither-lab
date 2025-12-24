import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  icon?: React.ReactNode;
}

export const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange, 
  formatValue = (v) => v.toString(),
  icon
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-sm font-medium text-slate-700 dark:text-slate-200">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
          <span>{label}</span>
        </div>
        <span className="font-mono text-xs bg-primary-container dark:bg-primary-on-container text-primary-on-container dark:text-primary-container px-2 py-0.5 rounded-md">
          {formatValue(value)}
        </span>
      </div>
      
      {/* 
        Container Height increased to h-8 (32px) to provide a comfortable touch/drag area.
        Visuals are absolutely positioned to center.
      */}
      <div className="relative h-8 flex items-center group cursor-pointer isolate w-full">
        
        {/* Track Background - Centered Vertically */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-1.5 bg-surface-dim dark:bg-surface-dark-container rounded-full overflow-hidden pointer-events-none">
          {/* Active Track */}
          <div 
            className="h-full bg-primary transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Input (invisible but clickable) - Covers full container area */}
        <input 
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 m-0 p-0 touch-none"
        />

        {/* Custom Thumb handle visual - Centered on point */}
        <div 
          className="absolute top-1/2 w-5 h-5 bg-primary rounded-full shadow-md pointer-events-none border-2 border-surface dark:border-surface-dark z-10 transition-transform duration-75 group-hover:scale-125"
          style={{ 
            left: `${percentage}%`,
            transform: 'translate(-50%, -50%)' // Center the thumb on the exact percentage point
          }}
        />
      </div>
    </div>
  );
};