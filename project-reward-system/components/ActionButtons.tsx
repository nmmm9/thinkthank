'use client';

import { Edit, Lock, Trash2, Plus, Save } from 'lucide-react';

export const EditButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
    title="수정"
  >
    <Edit className="w-4 h-4" />
  </button>
);



export const SaveButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded transition-colors ${
      disabled
        ? 'text-gray-400 cursor-not-allowed'
        : 'text-purple-600 hover:bg-purple-50'
    }`}
    title="저장"
  >
    <Save className="w-4 h-4" />
  </button>
);

export const DeleteButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
    title="삭제"
  >
    <Trash2 className="w-4 h-4" />
  </button>
);

export const AddButton = ({
  onClick,
  label = '추가',
}: {
  onClick: () => void;
  label?: string;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
  >
    <Plus className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

export const ToggleSwitch = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-primary' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);
