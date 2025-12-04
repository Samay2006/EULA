import { GoogleGenerativeAI } from "@google/generative-ai";

const upload = async (req, res) => {
  try {
    // Expecting base64 image from frontend
    const { img } = req.body;

    if (!img) {
      return res.status(400).json({ error: "Image (img) not provided in request body" });
    }

    // Initialize Gemini SDK
    const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contents = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: img, // directly using frontend base64
        },.
      },
      { text: "Caption this image." },
    ];

    const response = await model.generateContent({ contents });

    res.json({
      caption: response.text(),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
};

export default upload;
