// ==== Element handles (all optional-safe) ====
const promptInput     = document.getElementById("prompt");
const generateBtn     = document.getElementById("generate");
const outputDiv       = document.getElementById("output");
const creativityInput = document.getElementById("creativity");
const difficultyInput = document.getElementById("difficulty");
const costInput       = document.getElementById("cost");
const modelSelect     = document.getElementById("model"); // optional in your HTML

// ==== Your API key (string!) ====
const API_KEY = "AIzaSyDz7PsTucT9WAhsbBt-s67Y54GqZ6QIuf4";

// ==== Defaults & helpers ====
const DEFAULT_MODEL = "models/gemini-2.5-flash"; // widely available + supports generateContent
let currentModel = DEFAULT_MODEL;

function setOutput(msg) {
  if (outputDiv) outputDiv.textContent = msg;
}

function getNumber(inputEl, fallback) {
  const n = parseFloat(inputEl?.value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureResourceName(name) {
  // Accept both "gemini-2.5-flash" and "models/gemini-2.5-flash"
  return name?.startsWith("models/") ? name : `models/${name}`;
}

// ==== List models (only if you added <select id="model"> in HTML) ====
async function loadModelsIfDropdownExists() {
  if (!modelSelect) return; // no dropdown in HTML; just use DEFAULT_MODEL

  modelSelect.innerHTML = `<option>Loading models…</option>`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
      headers: { "x-goog-api-key": API_KEY }
    });
    const data = await res.json();

    if (data.error) {
      modelSelect.innerHTML = `<option>API error: ${data.error.message}</option>`;
      // keep default model
      return;
    }

    const models = Array.isArray(data.models) ? data.models : [];
    // Some responses expose "supportedGenerationMethods"
    const usable = models.filter(m =>
      Array.isArray(m.supportedGenerationMethods)
        ? m.supportedGenerationMethods.includes("generateContent")
        : true // if field missing, don't over-filter
    );

    if (usable.length === 0) {
      modelSelect.innerHTML = `<option>No generateContent models; using default</option>`;
      return;
    }

    modelSelect.innerHTML = "";
    usable.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.name;              // e.g. "models/gemini-2.5-flash"
      opt.textContent = m.name;
      modelSelect.appendChild(opt);
    });

    // pick the first one by default
    currentModel = usable[0].name || DEFAULT_MODEL;

    modelSelect.addEventListener("change", () => {
      currentModel = ensureResourceName(modelSelect.value || DEFAULT_MODEL);
    });
  } catch (err) {
    modelSelect.innerHTML = `<option>Fetch error; using default</option>`;
    // keep default model
  }
}

loadModelsIfDropdownExists();

// ==== Generate click ====
generateBtn?.addEventListener("click", async () => {
  const prompt = promptInput?.value?.trim();
  if (!prompt) {
    setOutput("⚠️ Please enter a prompt before generating ideas.");
    return;
  }

  // Build enhanced prompt
  const enhancedPrompt = `
User idea/constraints: ${prompt}
Desired difficulty: ${difficultyInput?.value ?? "N/A"}
Estimated cost: ${costInput?.value ?? "N/A"}
Creativity setting: ${creativityInput?.value ?? "0.7"}

Generate computer engineering project ideas that match these parameters.
`.trim();

  setOutput("⏳ Generating ideas...");

  // Final model to use (handles both dropdown/no dropdown cases)
  const modelName = ensureResourceName(currentModel || DEFAULT_MODEL);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: enhancedPrompt }] }],
          generationConfig: {
            temperature: getNumber(creativityInput, 0.7)
          }
        })
      }
    );

    const data = await res.json();

    if (data.error) {
      setOutput(`❌ API Error: ${data.error.message}`);
      return;
    }

    // Pull text from candidates safely
    const candidates = data?.candidates || [];
    const first = candidates[0];
    const parts = first?.content?.parts || [];
    const text = parts.map(p => p.text || "").join("").trim();

    if (text) {
      setOutput(text);
    } else if (data.promptFeedback?.blockReason) {
      setOutput(`⚠️ Blocked: ${data.promptFeedback.blockReason}`);
    } else {
      setOutput("⚠️ No response from Gemini.");
    }
  } catch (e) {
    setOutput("❌ Network or fetch error calling Gemini API.");
  }
});
