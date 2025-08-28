'use client';

import React from 'react';
import ArtistForm, {
	type ArtistFormValue,
	validateArtistForm,
} from '@/components/ArtistForm';
import AudioUpload from '@/components/AudioUpload';
import TextEditor from '@/components/TextEditor';
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
	generated: string;
	generationError: string | null;
};

type Action =
	| { type: 'SET_FORM'; payload: ArtistFormValue }
	| { type: 'SET_STATUS'; payload: AppState['status'] }
	| { type: 'SET_AUDIO_FILE'; payload: File | null }
	| { type: 'SET_AUDIO_ERROR'; payload: string | null }
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
		case 'SET_GENERATED_DESCRIPTION':
			return { ...state, generated: action.payload };
		case 'SET_GENERATION_ERROR':
			return { ...state, generationError: action.payload };
		default:
			return state;
	}
}

const initialForm: ArtistFormValue = { artistName: '', artistDescription: '' };

export default function Home() {
	const [state, dispatch] = React.useReducer(reducer, {
		status: 'idle',
		artistForm: initialForm,
		audioFile: null,
		audioError: null,
		generated: '',
		generationError: null,
	});
	const abortRef = React.useRef<AbortController | null>(null);
	const isFormValid =
		Object.keys(validateArtistForm(state.artistForm)).length === 0;
	const isAnalysisComplete = !!analysisResultStorage.get();
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

	// Persist form to session on change
	React.useEffect(() => {
		artistFormStorage.set(state.artistForm);
	}, [state.artistForm]);

	React.useEffect(() => {
		generatedDescriptionStorage.set(state.generated);
	}, [state.generated]);

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
		// Reset previous error and persist UI state
		dispatch({ type: 'SET_AUDIO_ERROR', payload: null });
		dispatch({ type: 'SET_STATUS', payload: 'analyzing' });

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const result: AudioAnalysisResult = await analyzeAudio(state.audioFile, {
				signal: controller.signal,
			});
			analysisResultStorage.set(result);
			dispatch({ type: 'SET_STATUS', payload: 'ready' });
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// Stay idle after cancel
				dispatch({ type: 'SET_STATUS', payload: 'idle' });
				return;
			}
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
			// Require audio file present to proceed (should be ensured by ready state)
			if (!state.audioFile) {
				dispatch({
					type: 'SET_GENERATION_ERROR',
					payload: UI_TEXT.VALIDATION_MESSAGES.AUDIO_REQUIRED,
				});
				dispatch({ type: 'SET_STATUS', payload: 'ready' });
				return;
			}
			const description = await generateDescription(
				state.artistForm,
				analysisResult,
				state.audioFile,
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
		abortRef.current?.abort();
	}

	return (
		<div className='font-sans grid grid-rows-[auto_1fr_auto] items-start justify-items-center min-h-screen p-6 gap-8 sm:p-10'>
			<header className='w-full max-w-screen-sm'>
				<h1 className='text-2xl font-semibold'>Artist Amplifier</h1>
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
										className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
									>
										{UI_TEXT.BUTTONS.CANCEL}
									</button>
								</div>
							)}
							{/* Optional status message */}
							{state.status !== 'idle' && (
								<p
									className='text-sm text-gray-600'
									aria-live='polite'
									role='status'
								>
									{state.status === 'analyzing' && UI_TEXT.STATUS.ANALYZING}
									{state.status === 'generating' &&
										UI_TEXT.BUTTONS.GENERATE_LOADING}
									{state.status === 'ready' && UI_TEXT.STATUS.DONE}
									{state.status === 'error' && UI_TEXT.STATUS.ERROR}
								</p>
							)}
						</div>
					}
				/>
				{(state.status === 'ready' || state.status === 'generating') && (
					<div className='w-full max-w-screen-sm mx-auto grid gap-4 mt-8'>
						<h2 className='text-lg font-semibold'>Wygenerowany opis</h2>
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
						<div className='flex justify-end'>
							<button
								type='button'
								onClick={handleGenerate}
								disabled={!canGenerate || state.status === 'generating'}
								className='px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed'
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
									className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
								>
									{UI_TEXT.BUTTONS.CANCEL}
								</button>
							</div>
						)}
						{state.generationError && (
							<p className='text-sm text-red-600'>{state.generationError}</p>
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
