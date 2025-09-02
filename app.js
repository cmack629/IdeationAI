// Grab page elements
const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generate");
const outputDiv = document.getElementById("output");

// Parameter controls
const creativityInput = document.getElementById("creativity");
const difficultyInput = document.getElementById("difficulty");
const costInput = document.getElementById("cost");

// ⚠️ Use your .env file locally (don’t commit it)
// For GitHub Pages deployment, paste the key directly here
// Example: const API_KEY = "AIzaSy...yourKey...";
const API_KEY = "PASTE_KEY_HERE";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + API_KEY;

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
          temperature: parseFloat(creativityInput.value),
        }
      })
    });

    const data = await response.json();
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      outputDiv.textContent = data.candidates[0].content.parts[0].text;
    } else {
      outputDiv.textContent = "⚠️ No response from Gemini.";
    }
  } catch (error) {
    console.error(error);
    outputDiv.textContent = "❌ Error calling Gemini API.";
  }
});
