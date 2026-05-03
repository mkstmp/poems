import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Setup Express
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Setup Multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve the uploads directory statically so React can link to the PDFs
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// Database files
const draftsFilePath = path.join(process.cwd(), 'server', 'drafts.json');

// Helper to read drafts
const getDrafts = () => {
  if (!fs.existsSync(draftsFilePath)) {
    return [];
  }
  const data = fs.readFileSync(draftsFilePath, 'utf8');
  return JSON.parse(data || '[]');
};

// Helper to save drafts
const saveDrafts = (drafts) => {
  fs.writeFileSync(draftsFilePath, JSON.stringify(drafts, null, 2), 'utf8');
};

const processedFilePath = path.join(process.cwd(), 'server', 'processed_files.json');
const getProcessedFiles = () => {
  if (!fs.existsSync(processedFilePath)) return {};
  return JSON.parse(fs.readFileSync(processedFilePath, 'utf8') || '{}');
};
const saveProcessedFiles = (registry) => {
  fs.writeFileSync(processedFilePath, JSON.stringify(registry, null, 2), 'utf8');
};

const publishedFilePath = path.join(process.cwd(), 'server', 'published.json');
const getPublished = () => {
  if (!fs.existsSync(publishedFilePath)) return [];
  return JSON.parse(fs.readFileSync(publishedFilePath, 'utf8') || '[]');
};
const savePublished = (poems) => {
  fs.writeFileSync(publishedFilePath, JSON.stringify(poems, null, 2), 'utf8');
};

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// System prompt for Gemini to strictly extract poems
const SYSTEM_PROMPT = `You are an expert curriculum assistant processing a book/document.
Your task is to scan the document, ignore all stories, index pages, exercises, and non-poem chapters.
Extract ONLY the poems.
For each poem found, extract the title, the full text, the language (e.g. Hindi, English), the writer (if explicitly mentioned), and write a short summary.
Additionally, provide a 'urlTitle' which MUST be an English transliteration of the title formatted as a URL slug (e.g., "titli-rani"), and a 'tags' array containing 2-4 relevant keywords (e.g., ["animals", "nature", "rhyme"]).

CRITICAL FORMATTING INSTRUCTIONS:
PDFs often have broken line breaks (e.g., lines ending mid-sentence) or OCR errors. You MUST act as an expert editor:
1. Fix broken line breaks so verses flow naturally. 
2. Correct any obvious spelling/OCR errors (especially in Hindi).
3. Ensure proper paragraph spacing.

Crucially, you must identify the physical 1-indexed page number within the PDF file where the poem starts and ends (e.g., startPage: 5, endPage: 6). If it is on a single page, startPage and endPage will be the same.
You must return the result strictly as a JSON array of objects, matching this exact format:
[
  {
    "title": "Title of Poem",
    "urlTitle": "english-slug-of-title",
    "text": "Full poem text",
    "language": "Hindi",
    "writer": "Writer Name or Unknown",
    "shortSummary": "A brief 1-sentence summary",
    "tags": ["tag1", "tag2"],
    "startPage": 5,
    "endPage": 6
  }
]
If there are no poems in the file, return an empty array [].`;

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. INGEST ENDPOINT
app.post('/api/ingest', upload.array('files'), async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing in .env file." });
    }

    const files = req.files;
    const metadata = JSON.parse(req.body.metadata || '{}');
    const forceOverwrite = String(req.body.forceOverwrite).toLowerCase() === 'true';
    
    console.log(`Received ingest request. Force Overwrite: ${forceOverwrite} (Raw: ${req.body.forceOverwrite})`);
    console.log(`Starting AI extraction for ${files.length} files...`);

    let newDrafts = [];
    let processedRegistry = getProcessedFiles();
    let skippedCount = 0;

    for (const file of files) {
      const filePath = path.join(uploadDir, file.filename);
      
      // Calculate file hash for deduplication
      const fileBuffer = fs.readFileSync(filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      if (processedRegistry[fileHash] && !forceOverwrite) {
        console.log(`Skipping ${file.originalname} (Already processed). Use Force Overwrite to bypass.`);
        skippedCount++;
        continue;
      }
      
      console.log(`Processing: ${file.originalname}`);
      
      // Only attempt PDF slicing if it's a PDF
      const isPdf = file.mimetype === 'application/pdf';
      let originalPdfDoc = null;
      if (isPdf) {
         try {
           const pdfBytes = fs.readFileSync(filePath);
           originalPdfDoc = await PDFDocument.load(pdfBytes);
         } catch (e) {
           console.error("Failed to load PDF with pdf-lib:", e);
         }
      }

      // Upload to Gemini File API
      console.log(`Uploading ${file.filename} to Gemini...`);
      const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: file.mimetype,
        displayName: file.originalname,
      });

      console.log(`Uploaded as ${uploadResponse.file.uri}. Analyzing with gemini-3.1-pro-preview...`);
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-pro-preview",
        systemInstruction: SYSTEM_PROMPT 
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  mimeType: uploadResponse.file.mimeType,
                  fileUri: uploadResponse.file.uri
                }
              },
              { text: "Extract the poems from this file." }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const responseText = result.response.text();
      let extractedPoems = [];
      
      try {
        extractedPoems = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON:", responseText);
        continue;
      }

      console.log(`Found ${extractedPoems.length} poems in ${file.originalname}`);

      // Map to our database schema and handle PDF slicing
      for (const poem of extractedPoems) {
        // Build a clean URL slug from Gemini's urlTitle for a meaningful ID
        const urlSlug = poem.urlTitle
          ? poem.urlTitle.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '')
          : 'poem';
        const shortId = Math.random().toString(36).substr(2, 6);
        const poemId = `poem_${urlSlug}_${shortId}`;
        let finalPdfPath = `/uploads/${file.filename}`; // Relative path fallback to full PDF

        // If it's a PDF and we have page numbers, slice it!
        if (originalPdfDoc && poem.startPage && poem.endPage) {
          try {
             const newPdfDoc = await PDFDocument.create();
             // pdf-lib uses 0-indexed pages, Gemini gives us 1-indexed
             const startIdx = Math.max(0, poem.startPage - 1);
             const endIdx = Math.min(originalPdfDoc.getPageCount() - 1, poem.endPage - 1);
             
             // Ensure valid range
             if (startIdx <= endIdx) {
               const pageIndicesToCopy = [];
               for (let i = startIdx; i <= endIdx; i++) pageIndicesToCopy.push(i);
               
               const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, pageIndicesToCopy);
               copiedPages.forEach(page => newPdfDoc.addPage(page));
               
               const newPdfBytes = await newPdfDoc.save();
               const slicedFilename = `poem_${urlSlug}_${shortId}.pdf`;
               fs.writeFileSync(path.join(uploadDir, slicedFilename), newPdfBytes);
               
               finalPdfPath = `/uploads/${slicedFilename}`; // Relative path
               console.log(`Created sliced PoemPDF for "${poem.title}": ${slicedFilename}`);
             }
          } catch (sliceError) {
             console.error("Error slicing PDF:", sliceError);
          }
        }

        newDrafts.push({
          id: poemId,
          title: poem.title || "Untitled Poem",
          urlTitle: poem.urlTitle || (poem.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          text: poem.text || "",
          shortSummary: poem.shortSummary || "",
          tags: poem.tags || [],
          language: poem.language || "Unknown",
          status: "draft",
          writer: poem.writer || "Unknown",
          sourceType: metadata.sourceType || "textbook",
          education: {
            grade: metadata.grade || "",
            board: metadata.board || "",
            bookName: metadata.bookName || file.originalname,
            year: metadata.year || new Date().getFullYear()
          },
          media: { audioUrl: null, videoUrl: null, thumbnailUrl: null },
          metadata: { 
            extractedVia: "Gemini_3.1_Pro",
            poemPdfPath: finalPdfPath,
            sourcePageRange: poem.startPage ? `${poem.startPage}-${poem.endPage}` : null,
            sourceFile: file.originalname
          },
          uiColor: "#" + Math.floor(Math.random()*16777215).toString(16)
        });
      }
      
      // Mark as processed
      processedRegistry[fileHash] = {
        filename: file.originalname,
        processedAt: new Date().toISOString(),
        poemsExtracted: extractedPoems.length
      };
    }

    // Save drafts and registry persistently
    const currentDrafts = getDrafts();
    // If force overwrite, remove any existing drafts from the same source files
    const processedSourceFiles = files
      .filter((_, i) => {
        const filePath = path.join(uploadDir, files[i].filename);
        const fileBuffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
        return fileBuffer !== null;
      })
      .map(f => f.originalname);
    const filteredDrafts = forceOverwrite
      ? currentDrafts.filter(d => !processedSourceFiles.includes(d.metadata?.sourceFile))
      : currentDrafts;
    saveDrafts([...filteredDrafts, ...newDrafts]);
    saveProcessedFiles(processedRegistry);

    let message = `Successfully processed ${files.length - skippedCount} files. Extracted ${newDrafts.length} poems!`;
    if (skippedCount > 0) message += ` (Skipped ${skippedCount} duplicate files).`;

    res.json({ 
      success: true, 
      message: message,
      draftsGenerated: newDrafts.length
    });
    
  } catch (error) {
    console.error("Ingestion Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET DRAFTS
app.get('/api/drafts', (req, res) => {
  const drafts = getDrafts();
  res.json({ drafts });
});

// 3. PUBLISH DRAFT
app.post('/api/drafts/:id/publish', (req, res) => {
  const { id } = req.params;
  const drafts = getDrafts();
  const draftIndex = drafts.findIndex(d => d.id === id);
  
  if (draftIndex === -1) {
    return res.status(404).json({ error: "Draft not found" });
  }

  const publishedPoem = drafts[draftIndex];
  publishedPoem.status = "published";
  
  drafts.splice(draftIndex, 1);
  saveDrafts(drafts);

  // Upsert into published.json — replace if same urlTitle exists, otherwise add
  const publishedList = getPublished();
  const existingIndex = publishedList.findIndex(p => p.urlTitle === publishedPoem.urlTitle);
  if (existingIndex !== -1) {
    publishedList[existingIndex] = publishedPoem; // Replace
    console.log(`Updated existing published poem: ${publishedPoem.title}`);
  } else {
    publishedList.unshift(publishedPoem); // Add to top
  }
  savePublished(publishedList);
  
  console.log(`Published poem: ${publishedPoem.title}`);
  
  res.json({ success: true, message: "Poem published successfully", poem: publishedPoem });
});

// 4. GET PUBLISHED POEMS
app.get('/api/published', (req, res) => {
  res.json({ poems: getPublished() });
});

// 5. DELETE DRAFT
app.delete('/api/drafts/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Received request to delete draft: ${id}`);
    const drafts = getDrafts();
    const draftIndex = drafts.findIndex(d => d.id === id);
    
    if (draftIndex === -1) {
      console.log(`Draft ${id} not found.`);
      return res.status(404).json({ error: "Draft not found" });
    }

    const rejectedPoem = drafts[draftIndex];
    drafts.splice(draftIndex, 1);
    saveDrafts(drafts);
    
    console.log(`Rejected & Deleted poem: ${rejectedPoem.title}`);
    
    res.json({ success: true, message: "Poem rejected and deleted." });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Internal server error during deletion." });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Local Extraction Server running on http://localhost:${PORT}`);
  if (!apiKey) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is not set in your .env file!");
  }
});
