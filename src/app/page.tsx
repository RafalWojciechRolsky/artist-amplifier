'use client';

import React from 'react';
import ArtistForm, {
	type ArtistFormValue,
	validateArtistForm,
} from '@/components/ArtistForm';
import AudioUpload from '@/components/AudioUpload';
import TextEditor from '@/components/TextEditor';
import ActionButtons from '@/components/ActionButtons';
import { analyzeAudio } from '@/lib/analysis';
import { generateDescription } from '@/lib/api/generate';
import {
	artistFormStorage,
	analysisResultStorage,
	type AudioAnalysisResult,
	generatedDescriptionStorage,
} from '@/lib/typedSession';
import { UI_TEXT } from '@/lib/constants';

type AppState = {
	status: 'idle' | 'analyzing' | 'ready' | 'generating' | 'error';
	artistForm: ArtistFormValue;
	audioFile: File | null;
	audioError: string | null;
	analysisResult: AudioAnalysisResult | null;
	generated: string;
	generationError: string | null;
};

type Action =
	| { type: 'SET_FORM'; payload: ArtistFormValue }
	| { type: 'SET_STATUS'; payload: AppState['status'] }
	| { type: 'SET_AUDIO_FILE'; payload: File | null }
	| { type: 'SET_AUDIO_ERROR'; payload: string | null }
	| { type: 'SET_ANALYSIS_RESULT'; payload: AudioAnalysisResult | null }
	| { type: 'SET_GENERATED_DESCRIPTION'; payload: string }
	| { type: 'SET_GENERATION_ERROR'; payload: string | null }
	| { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'SET_FORM':
			return { ...state, artistForm: action.payload };
		case 'SET_STATUS':
			return { ...state, status: action.payload };
		case 'SET_AUDIO_FILE':
			return { ...state, audioFile: action.payload };
		case 'SET_AUDIO_ERROR':
			return { ...state, audioError: action.payload };
		case 'SET_ANALYSIS_RESULT':
			return { ...state, analysisResult: action.payload };
		case 'SET_GENERATED_DESCRIPTION':
			return { ...state, generated: action.payload };
		case 'SET_GENERATION_ERROR':
			return { ...state, generationError: action.payload };
		case 'RESET':
			return createInitialState();
		default:
			return state;
	}
}

const initialForm: ArtistFormValue = { artistName: '', artistDescription: '' };

function createInitialState(): AppState {
	return {
		status: 'idle',
		artistForm: { ...initialForm },
		audioFile: null,
		audioError: null,
		analysisResult: null,
		generated: '',
		generationError: null,
	};
}

export default function Home() {
	const [state, dispatch] = React.useReducer(reducer, createInitialState());
	const abortRef = React.useRef<AbortController | null>(null);
	const isFormValid =
		Object.keys(validateArtistForm(state.artistForm)).length === 0;
	const isAnalysisComplete = !!state.analysisResult;
	const canGenerate =
		state.status === 'ready' && isFormValid && isAnalysisComplete;

	// Load state from session on first mount
	React.useEffect(() => {
		const savedForm = artistFormStorage.get();
		if (savedForm) {
			dispatch({ type: 'SET_FORM', payload: savedForm });
		}
		const savedResult = analysisResultStorage.get();
		if (savedResult) {
			dispatch({ type: 'SET_ANALYSIS_RESULT', payload: savedResult });
			dispatch({ type: 'SET_STATUS', payload: 'ready' });
		}
		const savedDescription = generatedDescriptionStorage.get();
		if (savedDescription) {
			dispatch({
				type: 'SET_GENERATED_DESCRIPTION',
				payload: savedDescription,
			});
		}
	}, []);

	// Persist form to session on change (avoid saving empty form after reset)
	React.useEffect(() => {
		const { artistName, artistDescription } = state.artistForm;
		if (artistName || artistDescription) {
			artistFormStorage.set(state.artistForm);
		} else {
			artistFormStorage.remove();
		}
	}, [state.artistForm]);

	React.useEffect(() => {
		if (state.generated && state.generated.trim() !== '') {
			generatedDescriptionStorage.set(state.generated);
		} else {
			generatedDescriptionStorage.remove();
		}
	}, [state.generated]);

	React.useEffect(() => {
		// Ten kod wykona się za każdym razem, gdy stan się zmieni.
		// Warunek `if` zapewnia, że logujemy tylko w interesującym nas momencie.
		if (state.status === 'ready' && state.analysisResult) {
			console.log('[audio/analyze] full analyzed track after update ->', state);
		}
	}, [state]);

	async function handleSubmit(value: ArtistFormValue) {
		// Ensure latest form is persisted as part of submit flow
		artistFormStorage.set(value);
		// Start analysis only when a valid file is selected
		if (!state.audioFile) {
			dispatch({
				type: 'SET_AUDIO_ERROR',
				payload: UI_TEXT.VALIDATION_MESSAGES.AUDIO_REQUIRED,
			});
			return;
		}
		// Reset previous error and persisted/visible analysis before a fresh run
		dispatch({ type: 'SET_AUDIO_ERROR', payload: null });
		dispatch({ type: 'SET_ANALYSIS_RESULT', payload: null });
		analysisResultStorage.remove();
		dispatch({ type: 'SET_STATUS', payload: 'analyzing' });

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const result: AudioAnalysisResult = await analyzeAudio(state.audioFile, {
				signal: controller.signal,
			});
			analysisResultStorage.set(result);
			// const full =
			// 	(result?.data as Record<string, unknown>)?.analyzedTrack ??
			// 	result?.data;
			dispatch({ type: 'SET_ANALYSIS_RESULT', payload: result });
			dispatch({ type: 'SET_STATUS', payload: 'ready' });
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// Stay idle after cancel
				dispatch({ type: 'SET_STATUS', payload: 'idle' });
				return;
			}
			// Surface error via status banner and near file input (for a11y/tests)
			dispatch({ type: 'SET_STATUS', payload: 'error' });
			dispatch({ type: 'SET_AUDIO_ERROR', payload: UI_TEXT.STATUS.ERROR });
		} finally {
			abortRef.current = null;
		}
	}

	async function handleGenerate() {
		const analysisResult = analysisResultStorage.get();
		if (!analysisResult) return;

		dispatch({ type: 'SET_GENERATION_ERROR', payload: null });

		dispatch({ type: 'SET_STATUS', payload: 'generating' });
		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const description = await generateDescription(
				state.artistForm,
				analysisResult,
				{ signal: controller.signal }
			);
			dispatch({ type: 'SET_GENERATED_DESCRIPTION', payload: description });
			dispatch({ type: 'SET_STATUS', payload: 'ready' });
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// Stay ready after cancel
				dispatch({ type: 'SET_STATUS', payload: 'ready' });
				return;
			}
			// QA: keep UI in 'ready' to allow retry and show message
			dispatch({ type: 'SET_STATUS', payload: 'ready' });
			const message =
				err instanceof Error
					? err.message
					: 'Wystąpił błąd podczas generowania opisu.';
			dispatch({ type: 'SET_GENERATION_ERROR', payload: message });
		} finally {
			abortRef.current = null;
		}
	}

	function handleCancel() {
		// Defer abort slightly to allow any late-bound listeners in the
		// analyze function to attach (helps stability in tests/mocks).
		const controller = abortRef.current;
		setTimeout(() => controller?.abort(), 20);
		// Flip UI back to idle shortly after abort to ensure abort event fired first
		setTimeout(() => {
			dispatch({ type: 'SET_STATUS', payload: 'idle' });
		}, 35);
	}

	function handleReset() {
		// Abort any in-flight requests
		abortRef.current?.abort();
		// Clear persisted session state
		artistFormStorage.remove();
		analysisResultStorage.remove();
		generatedDescriptionStorage.remove();
		// Reset UI state
		dispatch({ type: 'RESET' });
	}

	return (
		<div className='font-sans grid grid-rows-[auto_1fr_auto] items-start justify-items-center min-h-screen p-6 gap-8 sm:p-10'>
			<header className='w-full max-w-screen-sm'>
				<h1 className='text-3xl font-semibold aa-heading'>Artist Amplifier</h1>
			</header>
			<main className='w-full'>
				<ArtistForm
					value={state.artistForm}
					onChange={(next) => dispatch({ type: 'SET_FORM', payload: next })}
					onSubmit={handleSubmit}
					isSubmitting={state.status === 'analyzing'}
					afterFields={
						<div className='grid gap-2'>
							<AudioUpload
								value={state.audioFile}
								onChange={(file) =>
									dispatch({ type: 'SET_AUDIO_FILE', payload: file })
								}
								error={state.audioError}
								setError={(msg) =>
									dispatch({ type: 'SET_AUDIO_ERROR', payload: msg })
								}
							/>
							{state.status === 'analyzing' && (
								<div className='flex justify-end'>
									<button
										type='button'
										onClick={handleCancel}
										data-testid='cancel-button'
										className='px-4 py-2 border rounded-md aa-border text-[var(--color-text-primary)] hover:bg-[color:var(--color-surface-elev)]'
									>
										{UI_TEXT.BUTTONS.CANCEL}
									</button>
								</div>
							)}
							{/* Optional status message */}
							{state.status !== 'idle' && (
								<p
									className='text-sm aa-text-secondary'
									aria-live='polite'
									role='status'
									data-testid='status-banner'
								>
									{state.status === 'analyzing' && UI_TEXT.STATUS.ANALYZING}
									{state.status === 'generating' &&
										UI_TEXT.BUTTONS.GENERATE_LOADING}
									{state.status === 'ready' && UI_TEXT.STATUS.DONE}
									{state.status === 'error' && UI_TEXT.STATUS.ERROR}
								</p>
							)}
							{state.status === 'ready' && state.analysisResult && (
								<div
									className='mt-2 rounded-md border aa-border p-4 text-sm flex items-center gap-3'
									data-testid='analysis-summary'
								>
									<svg
										className='w-6 h-6 text-green-600 flex-shrink-0'
										xmlns='http://www.w3.org/2000/svg'
										fill='none'
										viewBox='0 0 24 24'
										strokeWidth={1.5}
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											d='M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
										/>
									</svg>
									<div>
										<p className='font-medium aa-heading-secondary'>
											Analiza ukończona
										</p>
										<p className='aa-text-secondary'>
											Plik{' '}
											<strong className='font-medium text-[var(--color-text-primary)]'>
												{(
													state.analysisResult?.data as {
														fileName?: string;
													}
												)?.fileName ?? '—'}
											</strong>{' '}
											jest gotowy.
										</p>
									</div>
								</div>
							)}
						</div>
					}
				/>
				{(state.status === 'ready' || state.status === 'generating') && (
					<div className='w-full max-w-screen-sm mx-auto grid gap-4 mt-8'>
						<h2 className='text-lg font-semibold aa-heading-secondary'>
							Wygenerowany opis
						</h2>
						<TextEditor
							value={state.generated}
							onChange={(e) =>
								dispatch({
									type: 'SET_GENERATED_DESCRIPTION',
									payload: e.target.value,
								})
							}
							placeholder='Tutaj pojawi się wygenerowany opis...'
							ariaLabel='Edytor wygenerowanego opisu'
						/>
						<ActionButtons
							artistName={state.artistForm.artistName}
							text={state.generated}
							onReset={handleReset}
						/>
						<div className='flex justify-end'>
							<button
								type='button'
								onClick={handleGenerate}
								disabled={!canGenerate || state.status === 'generating'}
								data-testid='generate-button'
								className={`px-6 py-2 font-semibold rounded-lg aa-btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${
									state.status === 'generating' ? 'aa-pulse' : ''
								}`}
							>
								{state.status === 'generating'
									? UI_TEXT.BUTTONS.GENERATE_LOADING
									: UI_TEXT.BUTTONS.GENERATE_IDLE}
							</button>
						</div>
						{state.status === 'generating' && (
							<div className='flex justify-end'>
								<button
									type='button'
									onClick={handleCancel}
									data-testid='cancel-button'
									className='px-4 py-2 border rounded-md aa-border text-[var(--color-text-primary)] hover:bg-[color:var(--color-surface-elev)]'
								>
									{UI_TEXT.BUTTONS.CANCEL}
								</button>
							</div>
						)}
						{state.generationError && (
							<p className='text-sm text-[color:var(--color-error)]'>
								{state.generationError}
							</p>
						)}
					</div>
				)}
			</main>
			<footer className='text-xs text-gray-500'>
				MVP • Wprowadzanie danych artysty + Przesyłanie utworu
			</footer>
		</div>
	);
}
