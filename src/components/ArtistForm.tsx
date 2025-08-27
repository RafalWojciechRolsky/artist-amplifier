"use client";

import React from "react";
import { VALIDATION_LIMITS, UI_TEXT } from "@/lib/constants";

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

  const desc = value.artistDescription?.trim() ?? "";
  if (!desc) {
    errors.artistDescription = UI_TEXT.VALIDATION_MESSAGES.ARTIST_DESCRIPTION_REQUIRED;
  } else if (desc.length < MIN_DESCRIPTION) {
    errors.artistDescription = UI_TEXT.VALIDATION_MESSAGES.DESCRIPTION_TOO_SHORT(MIN_DESCRIPTION);
  } else if (desc.length > MAX_DESCRIPTION) {
    errors.artistDescription = UI_TEXT.VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG(MAX_DESCRIPTION);
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

export default function ArtistForm({ value, onChange, onSubmit, isSubmitting, errors, afterFields }: Props) {
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
      className="w-full max-w-screen-sm mx-auto grid gap-6"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <label htmlFor="artistName" className="font-medium">
          {UI_TEXT.FORM_LABELS.ARTIST_NAME}
        </label>
        <input
          id="artistName"
          name="artistName"
          type="text"
          required
          value={value.artistName}
          onChange={handleNameChange}
          onBlur={() => markTouched("artistName")}
          aria-invalid={Boolean(touched.artistName && mergedErrors.artistName)}
          aria-describedby={
            touched.artistName && mergedErrors.artistName ? "artistName-error" : undefined
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {touched.artistName && mergedErrors.artistName && (
          <p id="artistName-error" className="text-sm text-red-600">
            {mergedErrors.artistName}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="artistDescription" className="font-medium">
          {UI_TEXT.FORM_LABELS.ARTIST_DESCRIPTION}
        </label>
        <textarea
          id="artistDescription"
          name="artistDescription"
          required
          value={value.artistDescription}
          onChange={handleDescChange}
          onBlur={() => markTouched("artistDescription")}
          aria-invalid={Boolean(touched.artistDescription && mergedErrors.artistDescription)}
          aria-describedby={
            touched.artistDescription && mergedErrors.artistDescription
              ? "artistDescription-error"
              : undefined
          }
          className="w-full min-h-32 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-600">
            {descLength}/{MAX_DESCRIPTION}
          </p>
          <p className="text-gray-500">Minimum {MIN_DESCRIPTION} znaków</p>
        </div>
        {touched.artistDescription && mergedErrors.artistDescription && (
          <p id="artistDescription-error" className="text-sm text-red-600">
            {mergedErrors.artistDescription}
          </p>
        )}
      </div>

      {afterFields}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? UI_TEXT.BUTTONS.SUBMIT_LOADING : UI_TEXT.BUTTONS.SUBMIT_IDLE}
        </button>
      </div>
    </form>
  );
}
