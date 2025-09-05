// ==== Element handles ====
const promptInput   = document.getElementById("prompt");
const generateBtn   = document.getElementById("generate");
const outputDiv     = document.getElementById("output");
const budgetSlider  = document.getElementById("budget-slider");
const budgetDisplay = document.getElementById("budget-display");
const techGroup     = document.getElementById("technologies");
const industryGroup = document.getElementById("industries");
const extraButtons  = document.getElementById("extra-buttons");
const expandBtn     = document.getElementById("expand");
const similarBtn    = document.getElementById("similar");
const summarizeBtn  = document.getElementById("summarize");

// ==== Your API key ====
const API_KEY = "AIzaSyDz7PsTucT9WAhsbBt-s67Y54GqZ6QIuf4"; // replace with your real Gemini API key

// ==== Defaults ====
const DEFAULT_MODEL = "models/gemini-2.5-flash";

// ==== Budget slider setup ====
noUiSlider.create(budgetSlider, {
  start: [100, 1000],
  connect: true,
  range: { min: 0, max: 10000 },
  step: 50,
  tooltips: true,
  format: {
    to: v => `$${Math.round(v)}`,
    from: v => Number(v.replace("$", ""))
  }
});

function getBudgetRange() {
  const values = budgetSlider.noUiSlider.get(true);
  return [Math.round(values[0]), Math.round(values[1])];
}

budgetSlider.noUiSlider.on("update", () => {
  const [min, max] = getBudgetRange();
  budgetDisplay.textContent = `Range: $${min} – $${max}`;
});

// ==== Helpers ====
function setOutput(msg, asHTML = false) {
  if (asHTML) {
    outputDiv.innerHTML = msg;
  } else {
    outputDiv.textContent = msg;
  }
}

function ensureResourceName(name) {
  return name?.startsWith("models/") ? name : `models/${name}`;
}

function getSelected(group) {
  const checkboxes = group?.querySelectorAll("input[type=checkbox]:checked") || [];
  return Array.from(checkboxes).map(cb => cb.value);
}

// Parse AI output → styled HTML
function formatOutput(text) {
  // Clean markdown symbols
  let cleaned = text.replace(/\*/g, "");

  // Split into sections by markers
  const sections = cleaned.split(/\n(?=[A-Z][^:]+:)/);

  let html = "";
  sections.forEach(sec => {
    const [title, ...content] = sec.split(":");
    const body = content.join(":").trim();

    if (!title || !body) return;

    if (title.toLowerCase().includes("budget")) {
      // Parse budget into table rows
      const rows = body.split(/\n|,/).map(r => r.trim()).filter(r => r);
      const tableRows = rows.map(r => {
        const parts = r.split(/[-:]/);
        if (parts.length >= 2) {
          return `<tr><td>${parts[0].trim()}</td><td>${parts.slice(1).join(":").trim()}</td></tr>`;
        }
        return `<tr><td colspan="2">${r}</td></tr>`;
      }).join("");
      html += `
        <div class="idea-card">
          <h3 class="section-title">${title}</h3>
          <table class="budget-table"><tbody>${tableRows}</tbody></table>
        </div>`;
    } else {
      html += `
        <div class="idea-card">
          <h3 class="section-title">${title}</h3>
          <p>${body.replace(/\n/g, "<br>")}</p>
        </div>`;
    }
  });

  return `<div class="idea-results">${html}</div>`;
}

// ==== Generate function ====
async function generateIdeas(mode = "normal") {
  const prompt = promptInput?.value?.trim();
  if (!prompt) {
    setOutput("⚠️ Please enter a prompt before generating ideas.");
    return;
  }

  const [budgetMin, budgetMax] = getBudgetRange();
  const selectedTechs = getSelected(techGroup);
  const selectedIndustries = getSelected(industryGroup);

  let enhancedPrompt = `
User idea/constraints: ${prompt}
Budget range: $${budgetMin} – $${budgetMax}
Preferred technologies: ${selectedTechs.join(", ") || "N/A"}
Industry focus: ${selectedIndustries.join(", ") || "N/A"}
`;

  if (mode === "normal") {
    enhancedPrompt += `
Generate 3–5 concrete computer engineering project ideas. 
For each idea, include:
- General description
- Required technologies
- Loose budget breakdown (how money would be spent)
- Similar existing products
- List of existing vs. novel elements in the project`;
  } else if (mode === "expand") {
    enhancedPrompt += `Expand the previously generated ideas with more technical depth, implementation detail, and challenges.`;
  } else if (mode === "similar") {
    enhancedPrompt += `Generate 3–5 new ideas that are variations or related to the previously generated ones.`;
  } else if (mode === "summarize") {
    enhancedPrompt += `Summarize the previously generated ideas into key bullet points.`;
  }

  setOutput("⏳ Generating ideas...");
  extraButtons.classList.remove("hidden");

  const modelName = ensureResourceName(DEFAULT_MODEL);

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
          generationConfig: { temperature: 0.7 }
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
      const html = formatOutput(text);
      setOutput(html, true);
    } else if (data.promptFeedback?.blockReason) {
      setOutput(`⚠️ Blocked: ${data.promptFeedback.blockReason}`);
    } else {
      setOutput("⚠️ No response from Gemini.");
    }
  } catch (e) {
    setOutput("❌ Network or fetch error calling Gemini API.");
  }
}

// ==== Button events ====
generateBtn?.addEventListener("click", () => generateIdeas("normal"));
expandBtn?.addEventListener("click", () => generateIdeas("expand"));
similarBtn?.addEventListener("click", () => generateIdeas("similar"));
summarizeBtn?.addEventListener("click", () => generateIdeas("summarize"));
