# PoemJoy (कविताओं की दुनिया) 📚

PoemJoy is an AI-powered educational web application built to ingest, curate, and beautifully display Hindi and English poems for young learners. 

It features an intelligent automated pipeline that extracts poems directly from textbooks (PDFs) using Google's **Gemini 3.1 Pro**, and a highly-polished, responsive React frontend.

## Architecture 🛠️

PoemJoy is structured as a unified Node.js/Express and React application:

* **Frontend:** React + Vite (Dynamic search, fluid CSS filters, mobile-responsive grid).
* **Backend:** Node.js Express server (`server/server.js`) handling the Gemini extraction pipeline, static file serving, and JSON database interactions.
* **Database:** Lightweight JSON storage (`drafts.json` & `published.json`) built to persist in cloud environments using Cloud Storage FUSE.
* **AI Ingestion:** Integration with `@google/generative-ai` to parse textbook PDFs, repair broken poetry verses, slice PDFs to relevant pages via `pdf-lib`, and generate metadata (grade, board, short summaries, tags).

---

## Local Development 💻

### Prerequisites
1. Node.js 20+ installed.
2. A Google AI Studio API Key (for the Gemini File API and Gemini 3.1 Pro model).

### Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory and add your API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Start the application:
   ```bash
   # In one terminal, start the Vite React development server
   npm run dev

   # In a second terminal, start the Node backend API
   node server/server.js
   ```

### Admin Workflow
1. Navigate to `http://localhost:5173/admin`
2. **Ingest Tab:** Upload a PDF textbook, define the grade/board, and click "Start Extraction Pipeline". The Gemini AI will extract all poems, split the PDF, and generate metadata.
3. **Review Tab:** Review the extracted AI drafts. You can inspect the source PDF and metadata. Click "Publish" to move them to the live homepage!

---

## Deployment (Google Cloud Run) ☁️

The application is containerized and built to run on **Google Cloud Run**. Because Cloud Run is stateless, we use **Cloud Storage FUSE** to mount a Google Cloud Storage bucket to persist our JSON databases and PDF uploads.

### 1. Build and Test Container Locally (Optional)
```bash
docker build -t poemjoy .
docker run -p 8080:8080 --env-file .env poemjoy
```

### 2. Deploy to Cloud Run
Replace `your-project-id` and `your-bucket-name` with your actual GCP details.

1. **Create your persistent data bucket:**
   ```bash
   gsutil mb gs://your-bucket-name
   ```

2. **Deploy using FUSE:**
   ```bash
   gcloud run deploy poemjoy \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --execution-environment gen2 \
     --add-volume=name=gcs-volume,type=cloud-storage,bucket=your-bucket-name \
     --add-volume-mount=volume=gcs-volume,mount-path=/data \
     --set-env-vars="DATA_DIR=/data,GEMINI_API_KEY=your_api_key_here"
   ```

*Note: The `--execution-environment gen2` flag is strictly required for Cloud Storage FUSE to function.*
