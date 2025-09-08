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


Return ONLY the following sections for each idea, with no introduction, no conclusion, and no extra text.

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
...`;

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

function formatOutput(raw) {
  // ---------- Cleanup ----------
  let text = String(raw)
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .replace(/<\/?[^>]+>/gi, "")
    .trim();

  // ---------- Find first idea; drop preamble (#3 style) ----------
  // Accept headings like: "Project Idea 1:", "Idea 1 -", "1) ...", "1. ..."
  const ideaHeadStartRE = /(?:^|\n)\s*(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|(?:^|\n)\s*\d+\s*[.)]\s+/i;
  const firstIdx = text.search(ideaHeadStartRE);
  if (firstIdx > -1) {
    text = text.slice(firstIdx);
  }

  // ---------- Tokenize ideas (line-by-line scan) ----------
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const ideaHeadRE = /^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\d+\s*[.)]\s+/i;

  const ideas = [];
  let cur = null;

  for (const line of lines) {
    if (ideaHeadRE.test(line)) {
      if (cur) ideas.push(cur);
      cur = { heading: line, body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) ideas.push(cur);

  // If none detected, treat whole text as one idea
  if (ideas.length === 0 && text) {
    ideas.push({ heading: "Project Idea 1:", body: lines });
  }

  // Keep up to 3 ideas
  const kept = ideas.slice(0, 3);

  // ---------- Sections to extract uniformly ----------
  const sections = [
    "General Description",
    "Required Technologies & Budget Breakdown",
    "Timeframe Breakdown",
    "Complexity & Skills Needed",
    "Similar Products",
    "Novel Elements"
  ];

  // Escaper for building regexes safely
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Lookahead that stops a section at the next section OR next idea OR end
  const sectionStopLA =
    "(?=\\n\\s*(?:" +
    sections.map(esc).join("|") +
    ")\\s*:?\\s*|\\n\\s*(?:(?:Project\\s*Idea|Idea)\\s*\\d+\\s*[:\\-.)]?|\\d+\\s*[\\.)]\\s+)|$)";

  // ---------- Render uniform HTML list ----------
  const ideaItems = kept.map((blk, idx) => {
    const ideaText = [blk.heading, ...blk.body].join("\n");

    // Title: prefer explicit "Name:" line, else derive from heading/body
    let name = "";
    const nameLine = blk.body.find(l => /^Name\s*:/i.test(l));
    if (nameLine) {
      name = nameLine.replace(/^Name\s*:\s*/i, "").trim();
    } else {
      // derive from heading sans numbering, or first non-generic body line
      name = blk.heading
        .replace(/^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?\s*/i, "")
        .replace(/^\d+\s*[.)]\s+/, "")
        .trim();
      if (!name) {
        const generic = /^(here (are|is)|some (good|great)|below (are|is))/i;
        name = (blk.body.find(l => !/^Name\s*:/i.test(l) && !generic.test(l)) || "Project Idea")
          .split(/[.:;-]/)[0]
          .slice(0, 120)
          .trim();
      }
    }

    // Extract each section safely
    const contentBlocks = sections.map(sec => {
      const secRE = new RegExp(
        "^\\s*" + esc(sec) + "\\s*:?\\s*([\\s\\S]*?)" + sectionStopLA,
        "im"
      );
      const m = ideaText.match(secRE);
      let content = (m && m[1] ? m[1].trim() : "");

      // Normalize to either bullet list or paragraphs
      let ls = content.split("\n").map(s => s.trim()).filter(Boolean);
      if (!ls.length) {
        content = "<p>N/A</p>";
      } else if (ls.some(l => /^[-•\d]+[.)]?\s+/.test(l))) {
        content = "<ul>" + ls.map(l => `<li>${l.replace(/^[-•\d. )]+\s*/, "")}</li>`).join("") + "</ul>";
      } else {
        content = ls.map(l => `<p>${l}</p>`).join("");
      }

      return `
        <div class="section-title">${sec}<span class="expand-icon">▶</span></div>
        <div class="section-content">${content}</div>
      `;
    }).join("");

    return `
      <li class="idea-card fade-in">
        <h2>${name || `Project Idea ${idx + 1}`}</h2>
        ${contentBlocks}
      </li>
    `;
  }).join("");

  // Wrap as an ordered list so ideas are clearly “listed as such”
  return `<ol class="idea-list">${ideaItems}</ol>`;
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
