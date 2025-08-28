import React from 'react';

interface TextEditorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const TextEditor: React.FC<TextEditorProps> = ({ value, onChange, placeholder, disabled, ariaLabel }) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-full min-h-48 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};

export default TextEditor;
