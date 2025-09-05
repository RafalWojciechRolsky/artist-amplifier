# Epic Description

**Existing System Context:**

- **Current Functionality:** The application allows users to upload an audio file, which is sent to a serverless backend on Vercel for analysis by the Music.AI service.
- **Problem:** The current implementation has a file size limit of ~4.5MB on Vercel, displays generic error messages, and lacks clear feedback during long analysis periods.

**Enhancement Details:**

1.  **Song Title:** A new text input for the song title will be added. This title will be associated with the audio file throughout the analysis process.
2.  **Large File Handling:** The file upload process will be refactored to use Vercel Blob storage. The client will get a secure upload URL from the backend, upload the file directly to the blob store, and then pass the file's final URL to the backend for analysis. This bypasses Vercel's serverless function payload limit.
3.  **Client-Side Validation:** Before uploading, the browser will perform a preliminary check on the audio file to ensure it meets basic requirements (e.g., minimum size/duration), providing instant feedback to the user.
4.  **Improved UX:** The user interface will be updated to display specific error messages from the backend and to inform the user when the analysis is taking longer than expected and has switched to a background polling mode.
