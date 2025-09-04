// ==== Element handles ====
const promptInput     = document.getElementById("prompt");
const generateBtn     = document.getElementById("generate");
const outputDiv       = document.getElementById("output");
const difficultyInput = document.getElementById("difficulty");
const costInput       = document.getElementById("cost");
const techGroup       = document.getElementById("technologies");
const modelSelect     = document.getElementById("model"); // optional

// ==== Your API key ====
const API_KEY = "AIzaSyDz7PsTucT9WAhsbBt-s67Y54GqZ6QIuf4"; // replace with your actual key

// ==== Defaults & helpers ====
const DEFAULT_MODEL = "models/gemini-2.5-flash";
let currentModel = DEFAULT_MODEL;

function setOutput(msg, asHTML = false) {
  if (!outputDiv) return;
  if (asHTML) {
    outputDiv.innerHTML = msg;
  } else {
    outputDiv.textContent = msg;
  }
}

function ensureResourceName(name) {
  return name?.startsWith("models/") ? name : `models/${name}`;
}

function getSelectedTechnologies() {
  const checkboxes = techGroup?.querySelectorAll("input[type=checkbox]:checked") || [];
  return Array.from(checkboxes).map(cb => cb.value);
}

// Basic Markdown → HTML converter
function markdownToHTML(md) {
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/(\r\n|\n){2,}/g, "</p><p>")
    .replace(/(\r\n|\n)/g, "<br>");
}

// ==== Generate click ====
generateBtn?.addEventListener("click", async () => {
  const prompt = promptInput?.value?.trim();
  if (!prompt) {
    setOutput("⚠️ Please enter a prompt before generating ideas.");
    return;
  }

  const difficulty = difficultyInput?.value || "N/A";
  const cost = costInput?.value || "N/A";
  const selectedTechs = getSelectedTechnologies();

  const enhancedPrompt = `
User idea/constraints: ${prompt}
Technical difficulty (1=Beginner, 2=Intermediate, 3=Advanced): ${difficulty}
Estimated cost range: ${cost}
Preferred technologies: ${selectedTechs.join(", ") || "N/A"}

Generate 3–5 concrete computer engineering project ideas. 
For each idea, include:
- A clear description
- Required technologies
- Estimated difficulty (numeric scale 1–3)
- Estimated cost (realistic $ ranges)
- Why it fits the given constraints
`.trim();

  setOutput("⏳ Generating ideas...");

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
            temperature: 0.7
          }
        })
      }
    );

    const data = await res.json();

    if (data.error) {
      setOutput(`❌ API Error: ${data.error.message}`);
      return;
    }

    const candidates = data?.candidates || [];
    const first = candidates[0];
    const parts = first?.content?.parts || [];
    const text = parts.map(p => p.text || "").join("").trim();

    if (text) {
      const html = markdownToHTML(text);
      setOutput(`<div class="idea-results"><p>${html}</p></div>`, true);
    } else if (data.promptFeedback?.blockReason) {
      setOutput(`⚠️ Blocked: ${data.promptFeedback.blockReason}`);
    } else {
      setOutput("⚠️ No response from Gemini.");
    }
  } catch (e) {
    setOutput("❌ Network or fetch error calling Gemini API.");
  }
});
