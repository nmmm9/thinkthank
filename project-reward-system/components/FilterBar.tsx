'use client';

import { Search } from 'lucide-react';
import { ReactNode } from 'react';

interface FilterBarProps {
  children?: ReactNode;
  onSearch?: () => void;
}

const FilterBar = ({ children, onSearch }: FilterBarProps) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {children}
        {onSearch && (
          <button
            onClick={onSearch}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>조회</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600 whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-w-[150px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const FilterInput = ({
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  type?: 'text' | 'date' | 'search';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-w-[200px]"
    />
  );
};

export const FilterToggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
};

export default FilterBar;
