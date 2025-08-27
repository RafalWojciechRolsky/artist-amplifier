'use client';

import React from 'react';
import ArtistForm, { type ArtistFormValue } from '@/components/ArtistForm';
import AudioUpload from '@/components/AudioUpload';
import { analyzeAudio } from '@/lib/analysis';
import { artistFormStorage, analysisResultStorage, type AudioAnalysisResult } from '@/lib/typedSession';
import { UI_TEXT } from '@/lib/constants';

type AppState = {
	status: 'idle' | 'analyzing' | 'ready' | 'error';
	artistForm: ArtistFormValue;
	audioFile: File | null;
	audioError: string | null;
};

type Action =
	| { type: 'SET_FORM'; payload: ArtistFormValue }
	| { type: 'SET_STATUS'; payload: AppState['status'] }
	| { type: 'SET_AUDIO_FILE'; payload: File | null }
	| { type: 'SET_AUDIO_ERROR'; payload: string | null };


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
	});
	const abortRef = React.useRef<AbortController | null>(null);

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
	}, []);

	// Persist form to session on change
	React.useEffect(() => {
		artistFormStorage.set(state.artistForm);
	}, [state.artistForm]);

	async function handleSubmit(value: ArtistFormValue) {
		// Ensure latest form is persisted as part of submit flow
		artistFormStorage.set(value);
		// Start analysis only when a valid file is selected
		if (!state.audioFile) {
			dispatch({ type: 'SET_AUDIO_ERROR', payload: UI_TEXT.VALIDATION_MESSAGES.AUDIO_REQUIRED });
			return;
		}
		// Reset previous error and persist UI state
		dispatch({ type: 'SET_AUDIO_ERROR', payload: null });
		dispatch({ type: 'SET_STATUS', payload: 'analyzing' });

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const result: AudioAnalysisResult = await analyzeAudio(state.audioFile, { signal: controller.signal });
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
								onChange={(file) => dispatch({ type: 'SET_AUDIO_FILE', payload: file })}
								error={state.audioError}
								setError={(msg) => dispatch({ type: 'SET_AUDIO_ERROR', payload: msg })}
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
								<p className='text-sm text-gray-600'>
									{state.status === 'analyzing' && UI_TEXT.STATUS.ANALYZING}
									{state.status === 'ready' && UI_TEXT.STATUS.DONE}
									{state.status === 'error' && UI_TEXT.STATUS.ERROR}
								</p>
							)}
						</div>
					}
				/>
			</main>
			<footer className='text-xs text-gray-500'>
				MVP • Wprowadzanie danych artysty + Przesyłanie utworu
			</footer>
		</div>
	);
}

