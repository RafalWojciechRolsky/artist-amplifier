'use client';

import React from 'react';
import ArtistForm, { type ArtistFormValue } from '@/components/ArtistForm';
import { artistFormStorage } from '@/lib/typedSession';

type AppState = {
	status: 'idle' | 'generating' | 'readyDescription' | 'error';
	artistForm: ArtistFormValue;
};

type Action =
	| { type: 'SET_FORM'; payload: ArtistFormValue }
	| { type: 'SET_STATUS'; payload: AppState['status'] };


function reducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'SET_FORM':
			return { ...state, artistForm: action.payload };
		case 'SET_STATUS':
			return { ...state, status: action.payload };
		default:
			return state;
	}
}

const initialForm: ArtistFormValue = { artistName: '', artistDescription: '' };

export default function Home() {
	const [state, dispatch] = React.useReducer(reducer, {
		status: 'idle',
		artistForm: initialForm,
	});

	// Load form from session on first mount
	React.useEffect(() => {
		const saved = artistFormStorage.get();
		if (saved) {
			dispatch({ type: 'SET_FORM', payload: saved });
		}
	}, []);

	// Persist form to session on change
	React.useEffect(() => {
		artistFormStorage.set(state.artistForm);
	}, [state.artistForm]);

	function handleSubmit(_value: ArtistFormValue) {
		// This would trigger an API call in a real app.
		// For now, we just update the state machine.
		dispatch({ type: 'SET_STATUS', payload: 'generating' });
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
					isSubmitting={state.status === 'generating'}
				/>
			</main>
			<footer className='text-xs text-gray-500'>
				MVP • Wprowadzanie danych artysty
			</footer>
		</div>
	);
}
