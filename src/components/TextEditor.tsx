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
      data-testid="text-editor"
      className="w-full min-h-48 resize-y rounded-lg border aa-border aa-field px-3 py-2 focus:outline-none"
    />
  );
};

export default TextEditor;
