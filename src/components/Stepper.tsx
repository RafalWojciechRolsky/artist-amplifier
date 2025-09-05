'use client';

import React from 'react';
import type { AnalysisStatusType } from '@/components/AnalysisStatus';

const STEPS = [
	'Dane artysty',
	'Analiza utworu',
	'Generowanie opisu',
	'Gotowe',
] as const;

function statusToStep(status: AnalysisStatusType): 1 | 2 | 3 | 4 {
	switch (status) {
		case 'idle':
		case 'validating':
			return 1;
		case 'analyzing':
		case 'polling':
		case 'ready':
			return 2;
		case 'generating':
			return 3;
		case 'readyDescription':
			return 4;
		case 'error':
			// Conservative default: highlight the analysis step when an error occurs
			// (covers errors from validation/analyze/polling/generate flows in MVP)
			return 2;
		default:
			return 1;
	}
}

export function Stepper({ status }: { status: AnalysisStatusType }) {
	const current = statusToStep(status);
	return (
		<ol
			aria-label='Postęp'
			className='w-full max-w-screen-sm mx-auto flex items-center justify-between gap-2 text-sm'
			data-testid='stepper'
		>
			{STEPS.map((label, idx) => {
				const stepNumber = (idx + 1) as 1 | 2 | 3 | 4;
				const isCurrent = stepNumber === current;
				const isDone = stepNumber < current;
				return (
					<li
						key={label}
						data-testid={`step-${stepNumber}`}
						aria-current={isCurrent ? 'step' : undefined}
						className={
							`flex-1 flex items-center gap-2 whitespace-nowrap ` +
							(isCurrent
								? 'font-semibold text-[var(--color-text-primary)]'
								: isDone
								? 'text-[color:var(--color-accent)]'
								: 'aa-text-secondary')
						}
					>
						<span
							className={
								'inline-flex items-center justify-center w-6 h-6 rounded-full border ' +
								(isDone
									? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[var(--color-accent-contrast)]'
									: isCurrent
									? 'border-[var(--color-text-primary)]'
									: 'aa-border')
							}
							aria-hidden
						>
							{stepNumber}
						</span>
						<span>{label}</span>
					</li>
				);
			})}
		</ol>
	);
}
