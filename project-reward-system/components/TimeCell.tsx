'use client';

import { useState, useEffect } from 'react';

interface TimeCellProps {
  value: number; // minutes
  onChange: (minutes: number) => void;
  disabled?: boolean;
}

const TimeCell = ({ value, onChange, disabled = false }: TimeCellProps) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(false);

  // Convert minutes to HH:MM format
  const minutesToHHMM = (minutes: number): string => {
    if (minutes === 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // Convert HH:MM format to minutes
  const hhmmToMinutes = (hhm: string): number | null => {
    if (!hhm || hhm.trim() === '') return 0;

    const match = hhm.match(/^(\d+):(\d{2})$/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (minutes >= 60) return null;

    return hours * 60 + minutes;
  };

  useEffect(() => {
    setDisplayValue(minutesToHHMM(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    setError(false);
  };

  const handleBlur = () => {
    setIsEditing(false);

    if (displayValue.trim() === '') {
      onChange(0);
      setError(false);
      return;
    }

    const minutes = hhmmToMinutes(displayValue);

    if (minutes === null) {
      setError(true);
      setDisplayValue(minutesToHHMM(value));
    } else {
      setError(false);
      onChange(minutes);
      setDisplayValue(minutesToHHMM(minutes));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={isEditing ? displayValue : displayValue || '미입력'}
        onChange={handleChange}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="0:00"
        className={`w-full px-2 py-1 text-center text-sm border rounded ${
          error
            ? 'border-red-500 text-red-600'
            : !displayValue
            ? 'text-red-400 border-gray-200'
            : 'border-gray-200'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-primary focus:border-primary focus:outline-none'}`}
      />
      {error && (
        <div className="absolute z-10 mt-1 px-2 py-1 bg-red-100 text-red-600 text-xs rounded shadow-lg whitespace-nowrap">
          올바른 형식으로 입력하세요 (예: 1:30, 8:00)
        </div>
      )}
    </div>
  );
};

export default TimeCell;
