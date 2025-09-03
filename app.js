// Grab page elements
const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generate");
const outputDiv = document.getElementById("output");

// Parameter controls
const creativityInput = document.getElementById("creativity");
const difficultyInput = document.getElementById("difficulty");
const costInput = document.getElementById("cost");
const modelSelect = document.getElementById("model");

// ⚠️ Replace with your actual Gemini API key
const API_KEY = "YOUR_API_KEY_HERE";

// Load available models on page load
async function loadModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await res.json();

    if (data.error) {
      modelSelect.innerHTML = `<option>Error: ${data.error.message}</option>`;
      return;
    }

    if (data.models && data.models.length > 0) {
      modelSelect.innerHTML = "";
      data.models.forEach(m => {
        // Only show models that support generateContent
        if (m.supportedMethods?.includes("generateContent")) {
          const opt = document.createElement("option");
          opt.value = m.name;
          opt.textContent = m.name;
          modelSelect.appendChild(opt);
        }
      });
    } else {
      modelSelect.innerHTML = "<option>No models available</option>";
    }
  } catch (err) {
    modelSelect.innerHTML = `<option>Fetch error: ${err}</option>`;
  }
}

loadModels();

// Handle Generate button click
generateBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  const model = modelSelect.value;

  if (!model) {
    outputDiv.textContent = "⚠️ Please select a model first.";
    return;
  }
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
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${API_KEY}`;

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

    if (data.error) {
      outputDiv.textContent = `❌ API Error: ${data.error.message}`;
      return;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      outputDiv.textContent = text;
    } else {
      outputDiv.textContent = "⚠️ No response from Gemini.";
    }
  } catch (error) {
    outputDiv.textContent = "❌ Network or fetch error calling Gemini API.";
  }
});
