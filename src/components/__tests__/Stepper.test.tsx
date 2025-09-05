import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Stepper } from '@/components/Stepper';
import type { AnalysisStatusType } from '@/components/AnalysisStatus';

const getCurrentStep = () => {
  const items = screen.getAllByTestId(/step-\d/);
  const current = items.find((el) => el.getAttribute('aria-current') === 'step');
  return current ?? null;
};

describe('Stepper', () => {
  const cases: Array<[AnalysisStatusType, number]> = [
    ['idle', 1],
    ['validating', 1],
    ['analyzing', 2],
    ['polling', 2],
    ['ready', 2],
    ['generating', 3],
    ['readyDescription', 4],
    ['error', 2],
  ];

  test.each(cases)('status %s highlights step %d', (status, expected) => {
    render(<Stepper status={status} />);
    // has 4 steps
    expect(screen.getByTestId('stepper')).toBeInTheDocument();
    expect(screen.getAllByTestId(/step-\d/)).toHaveLength(4);

    const current = getCurrentStep();
    expect(current).toBeTruthy();
    expect(current).toHaveAttribute('data-testid', `step-${expected}`);
  });
});
