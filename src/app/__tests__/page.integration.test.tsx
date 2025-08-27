import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
import { VALIDATION_LIMITS } from '@/lib/constants';

const { MIN_DESCRIPTION } = VALIDATION_LIMITS;

// TC3.2 Odtworzenie po odświeżeniu (restore on refresh)
// Given data previously saved in sessionStorage
// When the page is reloaded
// Then the form is prefilled with previous values

describe('Home integration', () => {
  // TC3.2 Odtworzenie po odświeżeniu (restore on refresh)
  // Given data previously saved in sessionStorage
  // When the page is reloaded
  // Then the form is prefilled with previous values
  test('restores form values from sessionStorage on remount', async () => {
    const user = userEvent.setup();

    // First mount – fill values to trigger setSession side effect
    const { unmount } = render(<Home />);
    const name1 = screen.getByLabelText(/nazwa artysty\/zespołu/i) as HTMLInputElement;
    const desc1 = screen.getByLabelText(/opis artysty/i) as HTMLTextAreaElement;

    await user.type(name1, 'Artist X');
    await user.type(desc1, 'Z'.repeat(60)); // >= MIN_DESCRIPTION

    // Unmount to simulate navigation/refresh
    unmount();

    // Second mount – should read from session and prefill
    render(<Home />);
    const name2 = await screen.findByLabelText(/nazwa artysty\/zespołu/i);
    const desc2 = await screen.findByLabelText(/opis artysty/i);
    expect((name2 as HTMLInputElement).value).toBe('Artist X');
    expect((desc2 as HTMLTextAreaElement).value).toBe('Z'.repeat(60));
  });

  // TC7.1 Przekazanie stanu do page.tsx
  // TC7.2 Przejścia stanów (idle -> generating)
  // Given valid data in the form
  // When the user submits the form
  // Then the app state changes to 'generating' and the button is disabled
  test('updates state to generating and disables button on submit', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const nameInput = screen.getByLabelText(/nazwa artysty\/zespołu/i);
    const descInput = screen.getByLabelText(/opis artysty/i);
    const submitBtn = screen.getByRole('button', { name: /generuj opis/i });

    // Fill the form with valid data
    await user.type(nameInput, 'Test Artist');
    await user.type(descInput, 'a'.repeat(MIN_DESCRIPTION));

    // Submit the form
    await user.click(submitBtn);

    // Assert that the button is now in a 'generating' state
    const generatingBtn = await screen.findByRole('button', { name: /generowanie.../i });
    expect(generatingBtn).toBeInTheDocument();
    expect(generatingBtn).toBeDisabled();
  });
});
