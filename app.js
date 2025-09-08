// ==== Element handles ====
const promptInput   = document.getElementById("prompt");
const generateBtn   = document.getElementById("generate");
const outputDiv     = document.getElementById("output");
const budgetSlider  = document.getElementById("budget-slider");
const budgetDisplay = document.getElementById("budget-display");
const timeframeSlider  = document.getElementById("timeframe-slider");
const timeframeDisplay = document.getElementById("timeframe-display");
const techGroup     = document.getElementById("technologies");
const industryGroup = document.getElementById("industries");
const complexityGroup = document.getElementById("complexity");
const innovationSelect = document.getElementById("innovation");
const demoSelect = document.getElementById("demo");
const apiKeyInput = document.getElementById("api-key");
const DEFAULT_MODEL = "models/gemini-2.5-flash";

// ==== Sliders ====
noUiSlider.create(budgetSlider, { start: [100,1000], connect:true, range:{min:0,max:10000}, step:50 });
noUiSlider.create(timeframeSlider, { start: [6,12], connect:true, range:{min:1,max:24}, step:1 });

function getBudgetRange(){ const v=budgetSlider.noUiSlider.get(true); return [Math.round(v[0]),Math.round(v[1])]; }
function getTimeframeRange(){ const v=timeframeSlider.noUiSlider.get(true); return [Math.round(v[0]),Math.round(v[1])]; }

budgetSlider.noUiSlider.on("update",()=>{ const [min,max]=getBudgetRange(); budgetDisplay.textContent=`Range: $${min} – $${max}`; });
timeframeSlider.noUiSlider.on("update",()=>{ const [min,max]=getTimeframeRange(); timeframeDisplay.textContent=`${min} – ${max} months`; });

// ==== Helpers ====
function setOutput(msg, asHTML=false){ outputDiv.innerHTML=asHTML?msg:`<p>${msg}</p>`; }
function getSelected(group){ const checked=group.querySelectorAll("input[type=checkbox]:checked")||[]; return Array.from(checked).map(cb=>cb.value); }

// ==== Generate Ideas ====
async function generateIdeas() {
  const prompt = promptInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  if(!prompt){ setOutput("⚠️ Please enter a prompt."); return; }
  if(!apiKey){ setOutput("⚠️ Please enter your API key."); return; }

  const [budgetMin,budgetMax] = getBudgetRange();
  const [timeMin,timeMax] = getTimeframeRange();
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

Generate up to 3 computer engineering project ideas. For each, provide:
- Name
- General Description
- Required Technologies & Budget Breakdown
- Timeframe Breakdown
- Complexity & Skills Needed
- Similar Products
- Novel Elements
`;

  setOutput("⏳ Generating ideas...");

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent`,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
      body: JSON.stringify({contents:[{parts:[{text:enhancedPrompt}]}],generationConfig:{temperature:0.7}})
    });
    const data = await res.json();
    if(data.error){ setOutput(`❌ API Error: ${data.error.message}`); return; }
    const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
    if(!text){ setOutput("⚠️ No response from Gemini."); return; }

    setOutput(formatOutput(text), true);
    attachExpandEvents();
  } catch { setOutput("❌ Network or fetch error."); }
}

// ==== Format Output ====
function formatOutput(text) {
  // Basic cleanup
  text = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .replace(/<\/?[^>]+>/gi, "")
    .trim();

  // Cut everything before the first recognizable idea heading
  const firstIdeaIdx = text.search(/(?:^|\n)\s*(?:Project\s*Idea|Idea|\d+\)|\d+\.)\s*\d*\s*[:\-]?\s*/i);
  if (firstIdeaIdx > -1) {
    text = text.slice(firstIdeaIdx);
  }

  // Split on common "idea" heading patterns
  const splitRegex = /(?:^|\n)\s*(?:Project\s*Idea|Idea|\d+\)|\d+\.)\s*\d*\s*[:\-]?\s*/gi;
  let ideaMatches = text.split(splitRegex).map(s => s.trim()).filter(Boolean);

  // If model didn’t use headings, fall back to a single block
  if (ideaMatches.length === 0 && text) {
    ideaMatches = [text.trim()];
  }

  // Only keep up to 3 ideas, but never re-prepend the full text
  ideaMatches = ideaMatches.slice(0, 3);

  return ideaMatches.map(idea => {
    // Break into lines and find a name/title
    let lines = idea.split("\n").map(l => l.trim()).filter(Boolean);

    // Try explicit "Name:" first
    let name = (lines.find(l => /^Name\s*:/i.test(l)) || "")
      .replace(/^Name\s*:\s*/i, "")
      .trim();

    // If not present, try to synthesize a title from the first non-generic line
    if (!name) {
      const genericIntro = /^(here (are|is)|some (good|great)|below (are|is)|please find)/i;
      const titleLine = lines.find(l => !genericIntro.test(l)) || "Project Idea";
      // Truncate at punctuation to make it title-ish
      name = titleLine.split(/[.:;-]/)[0].slice(0, 120).trim() || "Project Idea";
    }

    const sections = [
      "General Description",
      "Required Technologies & Budget Breakdown",
      "Timeframe Breakdown",
      "Complexity & Skills Needed",
      "Similar Products",
      "Novel Elements"
    ];

    // Build each section by greedy-searching between section headers
    const contentHtml = sections.map((sec, idx) => {
      const nextHeads = sections.slice(idx + 1).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const regex = new RegExp(
        sec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:?\\s*([\\s\\S]*?)" + (nextHeads ? "(?:" + nextHeads + "|$)" : "$"),
        "i"
      );
      const match = idea.match(regex);
      let content = match ? match[1].trim() : "N/A";

      // Bulletize if the section looks like a list
      let secLines = content.split("\n").map(l => l.trim()).filter(Boolean);
      if (secLines.some(l => /^[-•\d]+\)/.test(l) || /^[-•]/.test(l) || /^\d+\./.test(l))) {
        content = "<ul>" + secLines.map(l => `<li>${l.replace(/^[-•\d. )]+\s*/, "")}</li>`).join("") + "</ul>";
      } else {
        content = secLines.map(l => `<p>${l}</p>`).join("");
      }

      return `<div class="section-title">${sec}<span class="expand-icon">▶</span></div>
              <div class="section-content">${content || "<p>N/A</p>"}</div>`;
    }).join("");

    return `<div class="idea-card fade-in">
              <h2>${name}</h2>
              ${contentHtml}
            </div>`;
  }).join("");
}


// ==== Attach Expand Events ====
function attachExpandEvents(){
  document.querySelectorAll(".section-title").forEach(title=>{
    const icon = title.querySelector(".expand-icon");
    const content = title.nextElementSibling;
    title.addEventListener("click",()=>{
      if(content.style.display==="block"){
        content.style.display="none";
        icon.classList.remove("open");
      } else {
        content.style.display="block";
        icon.classList.add("open");
      }
    });
  });
}

// ==== Event Listener ====
generateBtn.addEventListener("click",()=>generateIdeas());
