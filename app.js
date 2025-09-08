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
  // ---------- Normalize & de-noise ----------
  let text = String(raw)
    .replace(/```[\s\S]*?```/g, "")     // strip code fences
    .replace(/<\/?[^>]+>/gi, "")        // strip html
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .trim();

  // --- Force markers to line starts (handles mid-line headings/labels) ---
  text = text
    // Idea headings
    .replace(/(?:\s*)(?=((?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\b\d+\s*[.)]\s+))/gi, "\n")
    .replace(/((?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\b\d+\s*[.)]\s+)/gi, "\n$1\n")
    // Common section labels (broad set of synonyms)
    .replace(/\s*(?=\b(Name|General\s*Description|Overview|Description|Required\s*Technologies|Tech\s*Stack|Bill\s*of\s*Materials|BOM|Budget|Costs?|Timeframe\s*Breakdown|Timeline|Schedule|Milestones?|Complexity\s*&?\s*Skills\s*Needed|Skills\s*Needed|Skill\s*Requirements?|Complexity|Similar\s*Products|Comparables|Existing\s*Solutions|Competitors?|Novel\s*Elements|Differentiators|Innovation|What's\s*New)\s*:)/gi, "\n");

  // ---------- Markers ----------
  const ideaHeadRE = /^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\d+\s*[.)]\s+/i;
  const nameHeadRE = /^\s*Name\s*:/i;

  // ---------- Drop preamble ----------
  let lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let firstIdx = lines.findIndex(l => ideaHeadRE.test(l) || nameHeadRE.test(l));
  if (firstIdx > 0) lines = lines.slice(firstIdx);

  // ---------- Group into idea blocks ----------
  let blocks = [];
  let cur = null;
  for (const line of lines) {
    if (ideaHeadRE.test(line) || nameHeadRE.test(line)) {
      if (cur) blocks.push(cur);
      cur = { heading: ideaHeadRE.test(line) ? line : "Name:", body: [] };
      if (nameHeadRE.test(line)) cur.body.push(line);
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) blocks.push(cur);

  // Rescue split: multiple Name: inside a block → split into separate ideas
  if (blocks.length < 3) {
    const rescued = [];
    for (const b of blocks) {
      const nameIdxs = b.body
        .map((l, i) => ({ l, i }))
        .filter(x => /^Name\s*:/i.test(x.l))
        .map(x => x.i);
      if (nameIdxs.length > 1) {
        for (let k = 0; k < nameIdxs.length; k++) {
          const start = nameIdxs[k];
          const end = (k + 1 < nameIdxs.length) ? nameIdxs[k + 1] : b.body.length;
          rescued.push({ heading: "Name:", body: b.body.slice(start, end) });
        }
      } else {
        rescued.push(b);
      }
    }
    blocks = rescued;
  }

  if (blocks.length === 0 && lines.length) {
    blocks.push({ heading: "Project Idea 1:", body: lines });
  }

  // Keep up to 3
  const kept = blocks.slice(0, 3);

  // ---------- Section aliases ----------
  const sectionAliases = {
    "General Description": [
      "General Description", "Overview", "Description"
    ],
    "Required Technologies & Budget Breakdown": [
      "Required Technologies & Budget Breakdown", "Required Technologies", "Tech Stack",
      "Bill of Materials", "BOM", "Budget", "Cost", "Costs"
    ],
    "Timeframe Breakdown": [
      "Timeframe Breakdown", "Timeline", "Schedule", "Milestone", "Milestones"
    ],
    "Complexity & Skills Needed": [
      "Complexity & Skills Needed", "Skills Needed", "Skill Requirements", "Complexity"
    ],
    "Similar Products": [
      "Similar Products", "Comparables", "Existing Solutions", "Competitors", "Competition"
    ],
    "Novel Elements": [
      "Novel Elements", "Differentiators", "Innovation", "What's New"
    ]
  };

  const canonicalOrder = Object.keys(sectionAliases);

  // Escape helper
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build single regex to match any section label (aliases), with optional colon
  const allLabels = Object.values(sectionAliases).flat();
  const sectionHeaderRE = new RegExp(
    "^\\s*(?:" + allLabels.map(esc).join("|") + ")\\s*:\\s*$",
    "i"
  );

  // Helpers
  const isSectionHeader = l => sectionHeaderRE.test(l);
  const headerToCanonical = (h) => {
    const clean = h.replace(/\s*:\s*$/, "").trim().toLowerCase();
    for (const canon of canonicalOrder) {
      for (const alias of sectionAliases[canon]) {
        if (clean === alias.toLowerCase()) return canon;
      }
    }
    return null;
  };

  const looksLikeBudgetList = (ls) =>
    ls.some(x => /(\$|\d+\s*(?:usd|dollars?))|(?:bom|bill of materials)/i.test(x));
  const looksLikeTimeframe = (ls) =>
    ls.some(x => /\b(months?|weeks?)\b/i.test(x)) || ls.some(x => /\bphase\b/i.test(x));
  const looksLikeList = (ls) =>
    ls.some(x => /^[-•\d]+[.)]?\s+/.test(x));

  const toHtmlBlock = (ls) => {
    if (!ls.length) return "<p>N/A</p>";
    if (looksLikeList(ls)) {
      return "<ul>" + ls.map(x => `<li>${x.replace(/^[-•\d. )]+\s*/, "")}</li>`).join("") + "</ul>";
    }
    return ls.map(x => `<p>${x}</p>`).join("");
  };

  // ---------- Render ----------
  const itemsHtml = kept.map((blk, idx) => {
    // Title
    let name = "";
    const nameLine = blk.body.find(l => /^Name\s*:/i.test(l));
    if (nameLine) {
      name = nameLine.replace(/^Name\s*:\s*/i, "").trim();
    }
    if (!name) {
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

    // Build a map canonical section -> lines
    const bodyLines = blk.body.slice(); // copy
    // Remove the Name line from body lines for section parsing
    const filtered = bodyLines.filter(l => !/^Name\s*:/i.test(l));

    // Find all section header indices with canonical names
    const headerIdxs = [];
    for (let i = 0; i < filtered.length; i++) {
      const l = filtered[i];
      if (isSectionHeader(l)) {
        const canon = headerToCanonical(l);
        if (canon) headerIdxs.push({ i, canon });
      }
    }

    // Extract sections by ranges (header -> next header/idea/end)
    const sectionMap = new Map();
    if (headerIdxs.length) {
      for (let k = 0; k < headerIdxs.length; k++) {
        const { i, canon } = headerIdxs[k];
        const end = (k + 1 < headerIdxs.length) ? headerIdxs[k + 1].i : filtered.length;
        const chunk = filtered.slice(i + 1, end).map(x => x.trim()).filter(Boolean);
        sectionMap.set(canon, chunk);
      }
    }

    // Fallback heuristics if some sections missing
    const everything = filtered.map(x => x.trim()).filter(Boolean);

    // 1) General Description fallback: first paragraph not starting with a known header
    if (!sectionMap.has("General Description")) {
      const firstHeaderAt = headerIdxs.length ? headerIdxs[0].i : filtered.length;
      const preface = filtered.slice(0, firstHeaderAt)
        .filter(l => !isSectionHeader(l) && !/^Name\s*:/i.test(l))
        .map(l => l.trim())
        .filter(Boolean);
      if (preface.length) sectionMap.set("General Description", preface);
    }

    // 2) Tech/Budget fallback: look for $/BOM words or list-y lines
    if (!sectionMap.has("Required Technologies & Budget Breakdown")) {
      const techish = everything.filter(x =>
        /\b(bom|bill of materials|budget|cost|costs|stack|tech|parts?)\b/i.test(x) || /\$/.test(x)
      );
      if (techish.length) sectionMap.set("Required Technologies & Budget Breakdown", techish);
    }

    // 3) Timeframe fallback: months/weeks/phase
    if (!sectionMap.has("Timeframe Breakdown")) {
      const tf = everything.filter(x => /\b(months?|weeks?|phase|milestones?)\b/i.test(x));
      if (tf.length) sectionMap.set("Timeframe Breakdown", tf);
    }

    // 4) Skills fallback: words like skills/experience/complexity
    if (!sectionMap.has("Complexity & Skills Needed")) {
      const sk = everything.filter(x => /\b(skill|skills|experience|complexity|difficulty)\b/i.test(x));
      if (sk.length) sectionMap.set("Complexity & Skills Needed", sk);
    }

    // 5) Similar Products fallback: words like existing/competitor/product/app
    if (!sectionMap.has("Similar Products")) {
      const sim = everything.filter(x => /\b(existing|similar|competitor|competition|product|app|tool|platform)\b/i.test(x));
      if (sim.length) sectionMap.set("Similar Products", sim);
    }

    // 6) Novel Elements fallback: words like novel/differentiate/innovation/unique
    if (!sectionMap.has("Novel Elements")) {
      const nov = everything.filter(x => /\b(novel|differentiator|innovation|unique|new|original)\b/i.test(x));
      if (nov.length) sectionMap.set("Novel Elements", nov);
    }

    // Compose HTML for each canonical section in order
    const sectionsHtml = canonicalOrder.map(label => {
      const lines = sectionMap.get(label) || [];
      const html = toHtmlBlock(lines);
      return `
        <div class="section-title">${label}<span class="expand-icon">▶</span></div>
        <div class="section-content">${html}</div>
      `;
    }).join("");

    return `
      <li class="idea-card fade-in">
        <h2>${name || `Project Idea ${idx + 1}`}</h2>
        ${sectionsHtml}
      </li>
    `;
  }).join("");

  return `<ol class="idea-list">${itemsHtml}</ol>`;
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
