# Music.AI - Node.js SDK

This package bundles an `SDK` to allow basic usage of the [Music.AI API](https://music.ai).

#### Installation

```shell
npm i @music.ai/sdk --save
```

#### Quick start

Before using the SDK, you need to:

1. Create an account at [Music.AI](https://music.ai)
2. Create a new application in [your dashboard](https://music.ai/dash/org/_/settings) to get an API key

The API key will be used to authenticate your requests to the Music.AI API. To know more, see the [Authentication documentation](https://music.ai/docs/api/authentication).

Here's how you can easily create a job, wait for its completion, process it against the `music-ai/generate-chords` workflow, and then delete it:

```ts
import MusicAi from '@music.ai/sdk';

const musicAi = new MusicAi({ apiKey: process.env.MUSIC_AI_API_KEY });

const songUrl = await musicAi.uploadFile('./song.mp3');

const jobId = await musicAi.addJob({
	name: 'My first job',
	workflow: 'music-ai/generate-chords',
	params: {
		inputUrl: songUrl,
	},
});

const job = await musicAi.waitForJobCompletion(jobId);

if (job.status === 'SUCCEEDED') {
	const files = await musicAi.downloadJobResults(job, './chords');
	console.log('Result:', files);
} else {
	console.log('Job failed!');
}

await musicAi.deleteJob(jobId);
```

## Reference

Full reference at the [API Reference documentation](https://music.ai/docs/api/reference).

#### Upload file

Uploads a local file to our temporary file server. Returns an temporary download url you can use to create jobs.

```ts
function uploadFile(fileLocation: string): Promise<string>;
```

##### Example

```ts
const fileUrl = await musicAi.uploadFile(fileLocation);
```

### Job API

#### Types

```ts
interface Job {
	id: string;
	app: string;
	name: string;
	batchName: string | null;
	metadata: {
		[key: string]: string;
	} | null;
	workflow: string;
	workflowParams: {
		inputUrl: string;
		[key: string]: string;
	};
	status: 'QUEUED' | 'STARTED' | 'SUCCEEDED' | 'FAILED';
	result: {
		[key: string]: string;
	} | null;
	error: {
		code: string;
		title: string;
		message: string;
	} | null;
	createdAt: string;
	startedAt: string;
	completedAt: string | null;
}
```

#### Add a job

Creates a new job and returns its corresponding ID.

```ts
function addJob(jobData: {
	name: string;
	workflow: string;
	params: Record<string, unknown>;
	copyResultsTo: Record<string, unknown>;
	metadata: Record<string, unknown>;
}): Promise<string>;
```

##### Example

```ts
const songUrl = 'https://your-website.com/song.mp3';
const jobId = await musicAi.addJob('job-1', 'music-ai/isolate-drums', {
	inputUrl: songUrl,
});
```

Check the [documentation](https://music.ai/docs) for all the existing workflows and expected correspondent parameters.

##### Custom storage

You can optionally store outputs in your own storage by providing upload URLs. To do that, use the `copyResultsTo` option, defining one upload URL for each output of the workflow.

```ts
await musicAi.addJob({
  name: "job-1",
  workflow: "music-ai/isolate-drums",
  params: {
    inputUrl: songUrl,
  },
  copyResultsTo: {
    "Kick drum": "https://example.com/my-upload-url-1",
    "Snare drum": "https://example.com/my-upload-url-2"
  }
)
```

The example above uses the `music-ai/isolate-drums` workflow, which has 3 outputs, Kick drum, Snare drum, and Other. We have provided upload URLs for the first two. Since we haven't provided a URL for the third output, it will be stored in Music AI's storage, as usual.

The JSON below contains the data for the job created above. Please note that Music AI don't provide download URLs for the outputs directed to your custom storage.

```json
{
	// ...
	"result": {
		"Kick drum": "[custom storage]",
		"Snare drum": "[custom storage]",
		"Other": "https://cdn.music.ai/example/vocals.wav"
	}
}
```

#### Get a job

Gets a job information by its `id`.

```ts
function getJob(id: string): Promise<Job>;
```

##### Success Example

```ts
const job = await musicAi.getJob(/* jobId */);
```

The `job` variable value:

```json
{
	"id": "2e35babc-91c4-4121-89f4-5a2acf956b28",
	"app": "Your app name",
	"name": "My job 123",
	"batchName": null,
	"metadata": {},
	"workflow": "music-ai/generate-chords",
	"workflowParams": {
		"inputUrl": "https://your-server.com/audio-input.m4a"
	},
	"status": "SUCCEEDED",
	"result": {
		"vocals": "https://cdn.music.ai/example/vocals.wav",
		"accompaniments": "https://cdn.music.ai/example/accompaniments.wav"
	},
	"error": null,
	"createdAt": "2022-12-07T19:21:42.170Z",
	"startedAt": "2022-12-07T19:21:42.307Z",
	"completedAt": "2022-12-07T19:22:00.325Z"
}
```

##### Failure Example

When a job fails, it has a `status` of `FAILED` and an `error` object with the error reason. To know more, see the [API Reference documentation](/docs/api/reference).

```json
{
	"id": "2e35babc-91c4-4121-89f4-5a2acf956b28",
	"app": "Your app name",
	"name": "My job 123",
	"batchName": null,
	"metadata": {},
	"workflow": "music-ai/generate-chords",
	"workflowParams": {
		"inputUrl": "https://your-server.com/audio-input.m4a"
	},
	"status": "SUCCEEDED",
	"result": {
		"vocals": "https://cdn.music.ai/example/vocals.wav",
		"accompaniments": "https://cdn.music.ai/example/accompaniments.wav"
	},
	"error": {
		"code": "BAD_INPUT",
		"title": "Invalid input",
		"message": "File not found."
	},
	"createdAt": "2022-12-07T19:21:42.170Z",
	"startedAt": "2022-12-07T19:21:42.307Z",
	"completedAt": "2022-12-07T19:22:00.325Z"
}
```

#### List jobs

Return all existing jobs associated with the provided `apiKey`. You can optionally filter by `status` and `workflow`:

```ts
function listJobs(filters?: {
	status?: Status[];
	workflow?: string[];
}): Promise<Job[]>;
```

##### Example

```ts
const jobs = await musicAi.listJobs();
```

```ts
const jobs = await musicAi.listJobs({
	status: ['FAILED'],
	workflow: ['workflow-a', 'workflow-b'],
});
```

#### Delete a job

Delete a job by its `id`.

```ts
function deleteJob(id: string): Promise<void>;
```

#### Wait for a job completion

Waits until the job status is either `SUCCEEDED` or `FAILED`, and returns its information.

```ts
function waitForJobCompletion(id: string): Promise<Job>;
```

##### Example

```ts
const job = await musicAi.waitForJobCompletion(/* jobId */);

if (job.status === 'SUCCEEDED') {
	console.log('Job succeeded!');
} else {
	console.log('Job failed!');
}
```

#### Download all job results

Download all the job results to a local folder.

```ts
function downloadJobResults(
	jobIdOrJobData: string | Job,
	outputFolder: string
): Promise<{ [key: string]: string }>;
```

This function also creates a file called `workflow.result.json` containing the result in the JSON format. When an output is a file, that field will contain the relative path to the file.

##### Example

```ts
const resultPaths = await musicAi.downloadJobResults(/* jobId */, "./stems")
```

Or, if you already have the job object...

```ts
const job = await musicAi.waitForJobCompletion(/* jobId */);
const resultPaths = await musicAi.downloadJobResults(job, './stems');
```

If the workflows has two outputs, vocals in WAVE format and bpm, two files will be created at the given folder: `vocals.wav` and `workflow.result.json`.

```json
// workflow.result.json
{
	"vocals": "./vocals.wav",
	"bpm": "64"
}
```

## Workflow API

#### Types

```ts
interface Workflow {
	id: string;
	name: string;
	slug: string;
	description: string;
	createdAt: string;
	updatedAt: string;
}
```

### List workflows

Retrieves a paginated list of the existing workflows from the provided `apiKey`. You can optionally filter by `page` (defaults to 0) and `size` (defaults to 100):

```ts
function listWorkflows(filters?: {
	page?: number;
	size?: number;
}): Promise<Workflow[]>;
```

#### Example

```ts
const workflows = await musicAi.listWorkflows();
```

```ts
const workflows = await musicAi.listWorkflows({
	page: 1,
	size: 20,
});
```
