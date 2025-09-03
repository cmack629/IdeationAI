// Grab page elements
const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generate");
const outputDiv = document.getElementById("output");

// Parameter controls
const creativityInput = document.getElementById("creativity");
const difficultyInput = document.getElementById("difficulty");
const costInput = document.getElementById("cost");

// ⚠️ Replace with your actual Gemini API key
const API_KEY = "PASTE_REAL_KEY_HERE";

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
  API_KEY;

generateBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    outputDiv.textContent = "⚠️ Please enter a prompt before generating ideas.";
    return;
  }

  // Build enhanced prompt with parameters
  const enhancedPrompt = `
  User idea/constraints: ${prompt}
  Desired difficulty: ${difficultyInput.value}
  Estimated cost: ${costInput.value}
  Creativity setting: ${creativityInput.value}

  Generate computer engineering project ideas that match these parameters.
  `;

  outputDiv.textContent = "⏳ Generating ideas...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
          temperature: parseFloat(creativityInput.value) || 0.7,
        },
      }),
    });

    const data = await response.json();
    console.log("Gemini raw response:", data);

    // Handle API errors
    if (data.error) {
      outputDiv.textContent = `❌ API Error: ${data.error.message}`;
      return;
    }

    // Handle valid responses
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      outputDiv.textContent = text;
    } else {
      outputDiv.textContent = "⚠️ No response from Gemini.";
    }
  } catch (error) {
    console.error("Fetch error:", error);
    outputDiv.textContent = "❌ Network or fetch error calling Gemini API.";
  }
});
