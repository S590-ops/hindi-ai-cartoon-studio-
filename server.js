
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

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
