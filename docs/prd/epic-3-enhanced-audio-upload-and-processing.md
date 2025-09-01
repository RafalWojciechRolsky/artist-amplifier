# Epic 3: Enhanced Audio Upload and Processing

## Epic Goal

To significantly improve the audio upload and analysis workflow by adding a song title input, refactoring the upload mechanism to support large files via Vercel Blob, implementing client-side validation, and providing clearer user feedback and error handling. This will make the core feature more robust, scalable, and user-friendly.

## Epic Description

**Existing System Context:**

- **Current Functionality:** The application allows users to upload an audio file, which is sent to a serverless backend on Vercel for analysis by the Music.AI service.
- **Problem:** The current implementation has a file size limit of ~4.5MB on Vercel, displays generic error messages, and lacks clear feedback during long analysis periods.

**Enhancement Details:**

1.  **Song Title:** A new text input for the song title will be added. This title will be associated with the audio file throughout the analysis process.
2.  **Large File Handling:** The file upload process will be refactored to use Vercel Blob storage. The client will get a secure upload URL from the backend, upload the file directly to the blob store, and then pass the file's final URL to the backend for analysis. This bypasses Vercel's serverless function payload limit.
3.  **Client-Side Validation:** Before uploading, the browser will perform a preliminary check on the audio file to ensure it meets basic requirements (e.g., minimum size/duration), providing instant feedback to the user.
4.  **Improved UX:** The user interface will be updated to display specific error messages from the backend and to inform the user when the analysis is taking longer than expected and has switched to a background polling mode.

## Stories

1.  **Story 3.1: Add Song Title Input**: Implement a new input field for the song title on the main form and integrate its value into the analysis workflow.
2.  **Story 3.2: Refactor File Upload to Use Vercel Blob**: Implement the new upload mechanism using signed URLs from Vercel Blob to support large files, as per the detailed technical specification.
3.  **Story 3.3: Implement Client-Side Audio Validation**: Add a pre-upload check in the browser to validate file size and duration against Music.AI requirements, displaying immediate feedback.
4.  **Story 3.4: Enhance Analysis Feedback and Error Handling**: Improve the UI to show specific error messages and notify the user when the system enters background polling mode for long-running analyses.

## Risk Mitigation

- **Primary Risk:** The refactoring of the core upload functionality (Story 3.2) could break the main application workflow.
- **Mitigation:** The new implementation will be developed in parallel and tested thoroughly. Existing unit and integration tests will be updated, and new tests will be added to cover the Vercel Blob integration.
- **Rollback Plan:** The changes will be managed via a dedicated feature branch in Git, allowing for a quick revert if critical issues are found after merging.

## Definition of Done

- [ ] All four stories are completed, and their acceptance criteria are met.
- [ ] Users can successfully upload and analyze audio files larger than 10 MB.
- [ ] The application provides specific, helpful feedback for errors and long-running processes.
- [ ] Existing functionality and tests are not broken (no regressions).
- [ ] The new workflow is verified to work correctly on both local and Vercel environments.
