
"use strict";

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Hindi AI Cartoon Studio is running!"
  });
});

app.post("/api/story", async (req, res) => {
  try {
    const topic = String(req.body.topic || "").trim();
    const key = process.env.GEMINI_API_KEY;

    if (!topic) {
      return res.status(400).json({
        error: "कहानी का विषय लिखिए।"
      });
    }

    if (!key) {
      return res.status(500).json({
        error: "GEMINI_API_KEY Render में सेट नहीं है।"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify({
          model: "gemini-3.5-flash-lite",
          input:
            "हिंदी में एक मौलिक, मजेदार और परिवार के अनुकूल कार्टून कहानी लिखो। विषय: " +
            topic +
            "। कहानी में शीर्षक, पात्र, संवाद और 5 अलग-अलग दृश्यों का वर्णन दो।"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "AI से कहानी नहीं बन पाई।"
      });
    }

    const story = (data.steps || [])
      .filter(step => step.type === "model_output")
      .flatMap(step => step.content || [])
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");

    if (!story) {
      throw new Error("AI ने खाली जवाब दिया।");
    }

    res.json({ story });

  } catch (error) {
    console.error("Story error:", error);
    res.status(500).json({
      error: error.message || "कहानी बनाने में समस्या हुई।"
    });
  }
});
app.post("/api/scenes", async (req, res) => {
  try {
    const story = String(req.body.story || "").trim();
    const key = process.env.GEMINI_API_KEY;

    if (!story) {
      return res.status(400).json({
        error: "पहले कहानी बनाइए।"
      });
    }

    if (!key) {
      return res.status(500).json({
        error: "GEMINI_API_KEY सेट नहीं है।"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify({
          model: "gemini-3.5-flash-lite",
          input:
            "इस हिंदी कहानी के 5 अलग-अलग कार्टून दृश्यों के लिए विस्तृत image prompts बनाओ। हर दृश्य में पात्रों का रूप एक जैसा रखना। जवाब हिंदी में दो। कहानी:\n" +
            story
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini scenes error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Scenes नहीं बन पाए।"
      });
    }

    const scenes = (data.steps || [])
      .filter(step => step.type === "model_output")
      .flatMap(step => step.content || [])
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");

    if (!scenes) {
      throw new Error("AI ने खाली जवाब दिया।");
    }

    res.json({ scenes });

  } catch (error) {
    console.error("Scenes error:", error);
    res.status(500).json({
      error: error.message || "Scenes बनाने में समस्या हुई।"
    });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const prompt = String(req.body.prompt || "").trim();

    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!prompt || prompt.length > 2048) {
      return res.status(400).json({
        error: "सही image prompt लिखिए (अधिकतम 2048 अक्षर)।"
      });
    }

    if (!token || !accountId) {
      return res.status(500).json({
        error: "Cloudflare की Environment Variables सेट नहीं हैं।"
      });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt,
          steps: 4
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("Cloudflare image error:", data.errors);
      return res.status(502).json({
        error: "तस्वीर नहीं बन पाई। Cloudflare API में समस्या हुई।"
      });
    }

    const image = data.result?.image;

    if (!image) {
      throw new Error("Image response खाली मिला।");
    }

    res.json({
      image: `data:image/jpeg;base64,${image}`
    });

  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({
      error: "तस्वीर बनाने में समस्या हुई।"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
