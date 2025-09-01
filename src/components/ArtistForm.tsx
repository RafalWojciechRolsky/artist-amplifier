'use client';

import React from 'react';
import { VALIDATION_LIMITS, UI_TEXT } from '@/lib/constants';

export type ArtistFormValue = {
	artistName: string;
	artistDescription: string;
};

export type ArtistFormErrors = Partial<{
	artistName: string;
	artistDescription: string;
}>;

const { MIN_DESCRIPTION, MAX_DESCRIPTION } = VALIDATION_LIMITS;

export function validateArtistForm(value: ArtistFormValue): ArtistFormErrors {
	const errors: ArtistFormErrors = {};

	if (!value.artistName?.trim()) {
		errors.artistName = UI_TEXT.VALIDATION_MESSAGES.ARTIST_NAME_REQUIRED;
	}

	const desc = value.artistDescription ?? '';
	if (!desc.trim()) {
		errors.artistDescription =
			UI_TEXT.VALIDATION_MESSAGES.ARTIST_DESCRIPTION_REQUIRED;
	} else if (desc.trim().length < MIN_DESCRIPTION) {
		errors.artistDescription =
			UI_TEXT.VALIDATION_MESSAGES.DESCRIPTION_TOO_SHORT(MIN_DESCRIPTION);
	} else if (desc.length > MAX_DESCRIPTION) {
		errors.artistDescription =
			UI_TEXT.VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG(MAX_DESCRIPTION);
	}

	return errors;
}

type Props = {
	value: ArtistFormValue;
	onChange: (next: ArtistFormValue) => void;
	onSubmit: (value: ArtistFormValue) => void;
	isSubmitting?: boolean;
	// Optional externally provided validation errors
	errors?: ArtistFormErrors;
	// Optional content to render after the artist fields and before the submit button
	afterFields?: React.ReactNode;
};

export default function ArtistForm({
	value,
	onChange,
	onSubmit,
	isSubmitting,
	errors,
	afterFields,
}: Props) {
	const [touched, setTouched] = React.useState<Record<string, boolean>>({});

	const localErrors = validateArtistForm(value);
	const mergedErrors: ArtistFormErrors = {
		...localErrors,
		...errors,
	};

	const descLength = value.artistDescription?.length ?? 0;

	function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
		onChange({ ...value, artistName: e.target.value });
	}
	function handleDescChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		onChange({ ...value, artistDescription: e.target.value });
	}

	function markTouched(field: keyof ArtistFormValue) {
		setTouched((t) => ({ ...t, [field]: true }));
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		// Mark all fields as touched to show errors on submit
		setTouched({ artistName: true, artistDescription: true });

		const validationErrors = validateArtistForm(value);
		if (Object.keys(validationErrors).length === 0) {
			onSubmit(value);
		}
	}

	return (
		<form
			className='w-full max-w-screen-sm mx-auto grid gap-6'
			noValidate
			onSubmit={handleSubmit}
		>
			<div className='grid gap-2'>
				<label htmlFor='artistName' className='font-medium'>
					{UI_TEXT.FORM_LABELS.ARTIST_NAME}
				</label>
				<input
					id='artistName'
					name='artistName'
					type='text'
					required
					value={value.artistName}
					onChange={handleNameChange}
					onBlur={() => markTouched('artistName')}
					aria-invalid={Boolean(touched.artistName && mergedErrors.artistName)}
					aria-describedby={
						touched.artistName && mergedErrors.artistName
							? 'artistName-error'
							: undefined
					}
					data-testid='artist-name-input'
					placeholder='Nazwa artysty lub zespołu'
					className='w-full rounded-lg border aa-border aa-field px-3 py-2 focus:outline-none'
				/>
				{touched.artistName && mergedErrors.artistName && (
					<p
						id='artistName-error'
						className='text-sm text-[color:var(--color-error)]'
					>
						{mergedErrors.artistName}
					</p>
				)}
			</div>

			<div className='grid gap-2'>
				<label htmlFor='artistDescription' className='font-medium'>
					{UI_TEXT.FORM_LABELS.ARTIST_DESCRIPTION}
				</label>
				<textarea
					id='artistDescription'
					name='artistDescription'
					required
					value={value.artistDescription}
					onChange={handleDescChange}
					onBlur={() => markTouched('artistDescription')}
					aria-invalid={Boolean(
						touched.artistDescription && mergedErrors.artistDescription
					)}
					aria-describedby={
						touched.artistDescription && mergedErrors.artistDescription
							? 'artistDescription-error'
							: undefined
					}
					data-testid='artist-description-input'
					placeholder='Kilka zdań o Tobie, Twoim gatunku i inspiracjach...'
					className='w-full min-h-32 resize-y rounded-lg border aa-border aa-field px-3 py-2 focus:outline-none'
				/>
				<div className='flex items-center justify-between text-sm'>
					<p className='aa-text-secondary'>
						{descLength}/{MAX_DESCRIPTION}
					</p>
					<p className='aa-text-secondary'>Minimum {MIN_DESCRIPTION} znaków</p>
				</div>
				{touched.artistDescription && mergedErrors.artistDescription && (
					<p
						id='artistDescription-error'
						className='text-sm text-[color:var(--color-error)]'
					>
						{mergedErrors.artistDescription}
					</p>
				)}
			</div>

			{afterFields}

			<div className='flex justify-end'>
				<button
					type='submit'
					disabled={isSubmitting}
					data-testid='submit-button'
					className='px-6 py-2 font-semibold rounded-md aa-btn-primary disabled:opacity-50 disabled:cursor-not-allowed'
				>
					{isSubmitting
						? UI_TEXT.BUTTONS.SUBMIT_LOADING
						: UI_TEXT.BUTTONS.SUBMIT_IDLE}
				</button>
			</div>
		</form>
	);
}
