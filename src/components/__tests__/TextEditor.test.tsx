import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TextEditor from '../TextEditor';

describe('TextEditor', () => {
  it('renders the textarea element', () => {
    render(<TextEditor value="" onChange={() => {}} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('displays the correct value', () => {
    const testValue = 'This is a test';
    render(<TextEditor value={testValue} onChange={() => {}} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(testValue);
  });

  it('calls onChange handler when text is changed', () => {
    const handleChange = jest.fn();
    render(<TextEditor value="" onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the disabled prop is true', () => {
    render(<TextEditor value="" onChange={() => {}} disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('shows a placeholder', () => {
    const placeholderText = 'Enter text here...';
    render(<TextEditor value="" onChange={() => {}} placeholder={placeholderText} />);
    const textarea = screen.getByPlaceholderText(placeholderText);
    expect(textarea).toBeInTheDocument();
  });
});
