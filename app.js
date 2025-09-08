// ==== Element handles ====
const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generate");
const outputDiv = document.getElementById("output");
const budgetSlider = document.getElementById("budget-slider");
const budgetDisplay = document.getElementById("budget-display");
const timeframeSlider = document.getElementById("timeframe-slider");
const timeframeDisplay = document.getElementById("timeframe-display");
const techGroup = document.getElementById("technologies");
const industryGroup = document.getElementById("industries");
const complexityGroup = document.getElementById("complexity");
const innovationSelect = document.getElementById("innovation");
const demoSelect = document.getElementById("demo");
const apiKeyInput = document.getElementById("api-key");
const DEFAULT_MODEL = "models/gemini-2.5-flash";

// ==== Sliders ====
noUiSlider.create(budgetSlider, { start: [100, 1000], connect: true, range: { min: 0, max: 10000 }, step: 50 });
noUiSlider.create(timeframeSlider, { start: [6, 12], connect: true, range: { min: 1, max: 24 }, step: 1 });

function getBudgetRange() { const v = budgetSlider.noUiSlider.get(true); return [Math.round(v[0]), Math.round(v[1])]; }
function getTimeframeRange() { const v = timeframeSlider.noUiSlider.get(true); return [Math.round(v[0]), Math.round(v[1])]; }

budgetSlider.noUiSlider.on("update", () => { const [min, max] = getBudgetRange(); budgetDisplay.textContent = `Range: $${min} – $${max}`; });
timeframeSlider.noUiSlider.on("update", () => { const [min, max] = getTimeframeRange(); timeframeDisplay.textContent = `${min} – ${max} months`; });

// ==== Helpers ====
function setOutput(msg, asHTML = false) { outputDiv.innerHTML = asHTML ? msg : `<p>${msg}</p>`; }
function getSelected(group) { const checked = group.querySelectorAll("input[type=checkbox]:checked") || []; return Array.from(checked).map(cb => cb.value); }

// ==== Generate Ideas ====
async function generateIdeas() {
  const prompt = promptInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  if (!prompt) { setOutput("⚠️ Please enter a prompt."); return; }
  if (!apiKey) { setOutput("⚠️ Please enter your API key."); return; }

  const [budgetMin, budgetMax] = getBudgetRange();
  const [timeMin, timeMax] = getTimeframeRange();
  const selectedTechs = getSelected(techGroup);
  const selectedIndustries = getSelected(industryGroup);
  const complexity = document.querySelector('input[name="complexity"]:checked')?.value || "Medium";
  const innovation = innovationSelect.value;
  const demo = demoSelect.value;

  let enhancedPrompt = `
User idea/constraints: ${prompt}
Budget range: $${budgetMin} – $${budgetMax}
Timeframe: ${timeMin} – ${timeMax} months
Preferred technologies: ${selectedTechs.join(", ") || "N/A"}
Industry focus: ${selectedIndustries.join(", ") || "N/A"}
Project Complexity: ${complexity}
Innovation Level: ${innovation}
Demo Considerations: ${demo}

Return ONLY the following sections for each idea, with no introduction, no conclusion, and no extra text.

Output exactly 3 ideas.

Format exactly like this:

Project Idea 1:
Name: ...
General Description: ...
Required Technologies & Budget Breakdown: ...
Timeframe Breakdown: ...
Complexity & Skills Needed: ...
Similar Products: ...
Novel Elements: ...

Project Idea 2:
Name: ...
General Description: ...
Required Technologies & Budget Breakdown: ...
Timeframe Breakdown: ...
Complexity & Skills Needed: ...
Similar Products: ...
Novel Elements: ...

Project Idea 3:
Name: ...
General Description: ...
Required Technologies & Budget Breakdown: ...
Timeframe Breakdown: ...
Complexity & Skills Needed: ...
Similar Products: ...
Novel Elements: ...`;

  setOutput("⏳ Generating ideas...");

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: enhancedPrompt }] }], generationConfig: { temperature: 0.7 } })
    });
    const data = await res.json();
    if (data.error) { setOutput(`❌ API Error: ${data.error.message}`); return; }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!text) { setOutput("⚠️ No response from Gemini."); return; }

    setOutput(formatOutput(text), true);
    attachExpandEvents();
  } catch { setOutput("❌ Network or fetch error."); }
}

// ==== Formatting and Rendering ====

const sections = [
  "General Description",
  "Required Technologies & Budget Breakdown",
  "Timeframe Breakdown",
  "Complexity & Skills Needed",
  "Similar Products",
  "Novel Elements"
];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sectionRegexes = sections.reduce((acc, label, index) => {
  const nextSection = sections[index + 1];
  const endPattern = nextSection ? esc(nextSection) : "Project Idea \\d+|Name\\s*:";
  const re = new RegExp(
    `^\\s*${esc(label)}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*${endPattern}|$)`,
    "im"
  );
  acc[label] = re;
  return acc;
}, {});

function extractSection(ideaText, label) {
  const re = sectionRegexes[label];
  const m = ideaText.match(re);
  let content = (m && m[1]) ? m[1].trim() : "";
  if (!content) return "<p>N/A</p>";

  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.some(l => /^[-•\d]+\s/.test(l))) {
    return `<ul>${lines.map(l => `<li>${l.replace(/^[-•\d]+\s*/, "")}</li>`).join("")}</ul>`;
  }
  return lines.map(l => `<p>${l}</p>`).join("");
}

// ... (All other code remains the same)

function formatOutput(raw) {
  // Normalize and clean the text
  let text = String(raw)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<\/?[^>]+>/gi, "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .trim();

  // Define section titles to parse
  const sectionTitles = [
    "Name",
    "General Description",
    "Required Technologies & Budget Breakdown",
    "Timeframe Breakdown",
    "Complexity & Skills Needed",
    "Similar Products",
    "Novel Elements"
  ];
  const sectionTitleSet = new Set(sectionTitles.map(t => t.toLowerCase().replace(/\s/g, "")));

  let lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let ideas = [];
  let currentIdea = null;
  let currentSection = null;

  for (const line of lines) {
    // Check if the line is a new idea heading
    const ideaHeadingMatch = line.match(/^Project Idea \d+: (.*)/i) || line.match(/^Idea \d+[:\-.] (.*)/i);
    if (ideaHeadingMatch) {
      if (currentIdea) {
        ideas.push(currentIdea);
      }
      // Extract the name directly from the heading line
      currentIdea = {
        name: ideaHeadingMatch[1].trim(),
        sections: {}
      };
      currentSection = null;
      continue;
    }

    // Check if the line is a specific "Name:" title
    const nameMatch = line.match(/^Name:\s*(.*)/i);
    if (nameMatch) {
      if (currentIdea) {
        currentIdea.name = nameMatch[1].trim();
      }
      continue;
    }

    // Check if the line is a section title
    const sectionMatch = line.match(/^([A-Za-z\s&]+?):\s*/);
    if (sectionMatch && sectionTitleSet.has(sectionMatch[1].toLowerCase().replace(/\s/g, ""))) {
      currentSection = sectionMatch[1];
      if (currentIdea) {
        currentIdea.sections[currentSection] = line.substring(sectionMatch[0].length).trim();
      }
    } else if (currentSection && currentIdea) {
      // Append content to the current section
      currentIdea.sections[currentSection] += `\n${line}`;
    }
  }

  // Push the last idea
  if (currentIdea) {
    ideas.push(currentIdea);
  }

  // Fallback if no ideas were parsed
  if (ideas.length === 0 && lines.length > 0) {
    ideas.push({
      name: `Project Idea 1`,
      sections: {
        "General Description": lines.join("\n")
      }
    });
  }

  // Render the output
  const itemsHtml = ideas.slice(0, 3).map((idea, idx) => {
    const sectionsHtml = sectionTitles.filter(t => t !== "Name").map(label => {
      const content = idea.sections[label] || "N/A";
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

      let formattedContent;
      const isList = lines.some(l => /^[-•\d]+\s/.test(l));
      if (isList) {
        formattedContent = `<ul>${lines.map(l => `<li>${l.replace(/^[-•\d]+\s*/, "")}</li>`).join("")}</ul>`;
      } else {
        formattedContent = lines.map(l => `<p>${l}</p>`).join("");
      }

      return `
        <div class="section-title">${label}<span class="expand-icon">▶</span></div>
        <div class="section-content">${formattedContent || `<p>N/A</p>`}</div>
      `;
    }).join("");

    return `
      <li class="idea-card fade-in">
        <h2>${idea.name}</h2>
        ${sectionsHtml}
      </li>
    `;
  }).join("");

  return `<ol class="idea-list">${itemsHtml}</ol>`;
}
// ==== Attach Expand Events ====
function attachExpandEvents() {
  document.querySelectorAll(".section-title").forEach(title => {
    const icon = title.querySelector(".expand-icon");
    const content = title.nextElementSibling;
    title.addEventListener("click", () => {
      if (content.style.display === "block") {
        content.style.display = "none";
        icon.classList.remove("open");
      } else {
        content.style.display = "block";
        icon.classList.add("open");
      }
    });
  });
}

// ==== Event Listener ====
generateBtn.addEventListener("click", () => generateIdeas());
