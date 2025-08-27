import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtistForm, { type ArtistFormValue } from '@/components/ArtistForm';
import { VALIDATION_LIMITS } from '@/lib/constants';

const { MIN_DESCRIPTION, MAX_DESCRIPTION } = VALIDATION_LIMITS;

const mockOnSubmit = jest.fn();

function Wrapper({
  initial,
  onSubmit = mockOnSubmit,
  isSubmitting,
}: {
  initial: ArtistFormValue;
  onSubmit?: (value: ArtistFormValue) => void;
  isSubmitting?: boolean;
}) {
  const [value, setValue] = React.useState<ArtistFormValue>(initial);
  return (
    <ArtistForm
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

function setup(initial: ArtistFormValue = { artistName: '', artistDescription: '' }) {
  mockOnSubmit.mockClear();
  const { rerender } = render(<Wrapper initial={initial} />);
  const name = screen.getByLabelText(/nazwa artysty\/zespołu/i) as HTMLInputElement;
  const desc = screen.getByLabelText(/opis artysty/i) as HTMLTextAreaElement;
  const submitBtn = screen.getByRole('button', { name: /generuj opis/i });
  return { name, desc, submitBtn, mockOnSubmit, rerender };
}

describe('ArtistForm', () => {
  test('shows required errors after fields are touched', async () => {
    const user = userEvent.setup();
    const { name, desc } = setup();

    await user.click(name);
    await user.tab(); // blur name
    await user.click(desc);
    await user.tab(); // blur desc

    const errors = await screen.findAllByText(/jest wymagane/i);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  test('validates description min and max length', async () => {
    const user = userEvent.setup();
    const { desc } = setup();

    await user.type(desc, 'z'.repeat(MIN_DESCRIPTION - 1));
    await user.tab(); // blur to mark touched
    // "co najmniej 50 znaków" (allow for inflection and spacing)
    expect(
      await screen.findByText(new RegExp(`co najmniej\\s+${MIN_DESCRIPTION}`,'i'))
    ).toBeInTheDocument();

    // clear and exceed max
    await user.clear(desc);
    await user.type(desc, 'x'.repeat(MAX_DESCRIPTION + 1));
    await user.tab();
    // "maksymalnie 1000 znaków"
    expect(
      await screen.findByText(new RegExp(`maksymalnie\\s+${MAX_DESCRIPTION}`,'i'))
    ).toBeInTheDocument();
  });

  test('shows live character counter', async () => {
    const user = userEvent.setup();
    const { desc } = setup();

    // Counter may render with spaces/newlines; use function matcher
    const counterMatcher = (text: string, node: Element | null) =>
      node?.textContent?.replace(/\s+/g, '') === `0/${MAX_DESCRIPTION}`;
    expect(screen.getByText(counterMatcher)).toBeInTheDocument();
    await user.type(desc, 'abc');
    const counterMatcher3 = (text: string, node: Element | null) =>
      node?.textContent?.replace(/\s+/g, '') === `3/${MAX_DESCRIPTION}`;
    expect(screen.getByText(counterMatcher3)).toBeInTheDocument();
  });
});

describe('ArtistForm – additional high-priority cases', () => {
  test('no errors are shown before fields are touched (pristine state)', () => {
    render(<Wrapper initial={{ artistName: '', artistDescription: '' }} />);
    // No generic required messages should be visible yet
    expect(screen.queryByText(/jest wymagane/i)).toBeNull();
    // No min/max messages visible
    expect(screen.queryByText(/co najmniej/i)).toBeNull();
    expect(screen.queryByText(/maksymalnie/i)).toBeNull();
  });

  test('only description shows error when name is filled and description left empty after blur', async () => {
    const user = userEvent.setup();
    render(<Wrapper initial={{ artistName: '', artistDescription: '' }} />);
    const name = screen.getByLabelText(/nazwa artysty\/zespołu/i) as HTMLInputElement;
    const desc = screen.getByLabelText(/opis artysty/i) as HTMLTextAreaElement;

    await user.type(name, 'Some Artist');
    await user.tab(); // blur name
    await user.click(desc);
    await user.tab(); // blur desc while empty

    // Name should not have an error; description should have an error
    expect(screen.queryByText(/pole 'nazwa artysty\/zespołu' jest wymagane\./i)).toBeNull();
    expect(await screen.findByText(/pole 'opis artysty' jest wymagane\./i)).toBeInTheDocument();
  });

  test('error messages are in Polish and linked via aria-describedby to the correct fields', async () => {
    const user = userEvent.setup();
    render(<Wrapper initial={{ artistName: '', artistDescription: '' }} />);
    const name = screen.getByLabelText(/nazwa artysty\/zespołu/i) as HTMLInputElement;
    const desc = screen.getByLabelText(/opis artysty/i) as HTMLTextAreaElement;

    // Trigger both errors
    await user.click(name); await user.tab();
    await user.click(desc); await user.tab();

    // Assert ARIA linkage and message for name
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const nameErrId = name.getAttribute('aria-describedby');
    expect(nameErrId).toBeTruthy();
    const nameErrEl = document.getElementById(String(nameErrId));
    expect(nameErrEl).toBeTruthy();
    expect(nameErrEl).toHaveTextContent(/jest wymagane\./i);

    // Assert ARIA linkage and message for description
    expect(desc.getAttribute('aria-invalid')).toBe('true');
    const descErrId = desc.getAttribute('aria-describedby');
    expect(descErrId).toBeTruthy();
    const descErrEl = document.getElementById(String(descErrId));
    expect(descErrEl).toBeTruthy();
    expect(descErrEl).toHaveTextContent(/jest wymagane\./i);
  });

  test('shows errors and does not submit when form is empty (TC1.1)', async () => {
    const user = userEvent.setup();
    const { submitBtn } = setup();

    await user.click(submitBtn);

    const errors = await screen.findAllByText(/jest wymagane/i);
    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('shows only description error and does not submit (TC1.2)', async () => {
    const user = userEvent.setup();
    const { name, submitBtn } = setup();

    await user.type(name, 'Valid Artist Name');
    await user.click(submitBtn);

    const error = await screen.findByText(/pole 'opis artysty' jest wymagane\./i);
    expect(error).toBeInTheDocument();
    expect(screen.queryByText(/pole 'nazwa artysty\/zespołu' jest wymagane\./i)).toBeNull();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('submits valid data successfully (TC2.3)', async () => {
    const user = userEvent.setup();
    const { name, desc, submitBtn } = setup();

    const validData = {
      artistName: 'Valid Artist Name',
      artistDescription: 'a'.repeat(MIN_DESCRIPTION),
    };

    await user.type(name, validData.artistName);
    await user.type(desc, validData.artistDescription);
    await user.click(submitBtn);

    expect(screen.queryByText(/jest wymagane/i)).toBeNull();
    expect(screen.queryByText(/co najmniej/i)).toBeNull();
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith(validData);
  });

  test('submits successfully with boundary description lengths', async () => {
    const user = userEvent.setup();
    const { name, desc, submitBtn } = setup();

    // Test with minimum length
    await user.type(name, 'Artist');
    await user.type(desc, 'a'.repeat(MIN_DESCRIPTION));
    await user.click(submitBtn);
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);

    // Test with maximum length
    mockOnSubmit.mockClear();
    await user.clear(desc);
    await user.type(desc, 'b'.repeat(MAX_DESCRIPTION));
    await user.click(submitBtn);
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  test('form fields have required attribute (TC4.3)', () => {
    const { name, desc } = setup();
    expect(name).toBeRequired();
    expect(desc).toBeRequired();
  });

  test('character counter handles special characters and emoji correctly (TC6)', async () => {
    const user = userEvent.setup();
    const { desc } = setup();

    // Polish diacritics (5 chars) + emoji (2 chars for this one) = 7 total
    const text = 'zażółć👍';
    await user.type(desc, text);

    const counterMatcher = (content: string, node: Element | null) =>
      node?.textContent?.replace(/\s+/g, '') === `${text.length}/${MAX_DESCRIPTION}`;

    expect(screen.getByText(counterMatcher)).toBeInTheDocument();
  });

  test('keyboard Tab sequence is logical (name -> desc -> submit) (TC4.1)', async () => {
    const user = userEvent.setup();
    const { name, desc, submitBtn } = setup();

    await user.tab();
    expect(document.activeElement).toBe(name);
    await user.tab();
    expect(document.activeElement).toBe(desc);
    await user.tab();
    expect(document.activeElement).toBe(submitBtn);
  });
});
