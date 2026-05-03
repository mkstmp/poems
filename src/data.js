// In a real app, 'id' comes from the Firestore Document ID, not the payload.
// We include it here just for React mapping.
export const MOCK_POEMS = [
  {
    id: "doc_1", 
    title: "तितली रानी",
    urlTitle: "titli-rani",
    text: "तितली रानी, तितली रानी\nकितने सुंदर पंख तुम्हारे।\nफूल-फूल पर जाती हो,\nसबका मन ललचाती हो।",
    shortSummary: "A fun Hindi poem about a beautiful butterfly.",
    language: "Hindi",
    status: "published",
    writer: "Unknown",
    tags: ["nature", "animals", "kids"],
    sourceType: "textbook",
    education: {
      grade: "Class 1",
      board: "NCERT",
      bookName: "Rimjhim",
      year: 2023
    },
    media: {
      audioUrl: null,
      videoUrl: null,
      thumbnailUrl: null
    },
    metadata: {
      extractedVia: "Gemini_PDF_Upload"
    },
    // UI specific mock colors
    uiColor: "#FF8C42"
  },
  {
    id: "doc_2",
    title: "Stars in My Pocket",
    urlTitle: "stars-in-my-pocket",
    text: "I reached up high into the night,\nAnd grabbed a star so shining bright.\nI put it safely in my pocket,\nRight next to my favorite rocket.",
    shortSummary: "A magical journey about capturing a star.",
    language: "English",
    status: "published",
    writer: "Sarah L.",
    tags: ["space", "dreams"],
    sourceType: "original",
    education: null, // Original poems don't have education fields
    media: {
      audioUrl: null,
      videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnailUrl: null
    },
    metadata: {
      extractedVia: "Manual_Upload"
    },
    uiColor: "#4A90E2"
  },
  {
    id: "doc_3",
    title: "My Pet Dinosaur",
    urlTitle: "my-pet-dinosaur",
    text: "My dinosaur is very tall,\nHe doesn't fit inside the hall.\nHe eats the leaves from every tree,\nAnd then he wants to play with me!",
    shortSummary: "A silly story about a giant pet dinosaur.",
    language: "English",
    status: "draft", // Example of a draft
    writer: "Leo M.",
    tags: ["funny", "animals"],
    sourceType: "other",
    education: null,
    media: {
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      videoUrl: null,
      thumbnailUrl: null
    },
    metadata: {
      extractedVia: "Manual_Upload"
    },
    uiColor: "#FFD166"
  }
];
