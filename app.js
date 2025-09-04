// app.js (module)

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Grabs
const apiKeyInput   = document.getElementById("apiKey");
const modelSelect   = document.getElementById("model");

const problemInput  = document.getElementById("problem");
const innovationInp = document.getElementById("innovation");
const budgetSelect  = document.getElementById("budget");
const complexitySel = document.getElementById("complexity");
const outputDiv     = document.getElementById("output");
const generateBtn   = document.getElementById("generate");

// Helpers
const getCheckedValues = (name) =>
  [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);

const getExplainLevel = () =>
  document.querySelector('input[name="explainLevel"]:checked')?.value || "mid";

const depthInstructions = {
  low: "Write a deeply detailed, step-by-step explanation with parts list (BOM), wiring or block diagrams (described), code scaffolding (pseudo or brief snippets), trade-offs, edge cases, and test/validation plan. Avoid unexplained jargon.",
  mid: "Write a balanced overview with key nuances: architecture, major components, brief implementation notes (no long code), risks, and pros/cons.",
  high: "Write a concise, high-level concept and architecture. Assume a strong engineering background; focus on core ideas, feasibility, and impact. No step-by-step details."
};

function makePrompt(params) {
  const {
    problem_statement,
    preferred_technologies,
    preferred_industries,
    innovation_level,
    budget_range,
    complexity,
    explanation_depth
  } = params;

  const tech = preferred_technologies?.length ? preferred_technologies.join(", ") : "no strong preference";
  const inds = preferred_industries?.length ? preferred_industries.join(", ") : "any";
  const depthText = depthInstructions[explanation_depth] || depthInstructions.mid;

  return `
You are an experienced Computer Engineering project mentor.
Generate 3 concrete project ideas tailored to the inputs below.

Constraints:
- Problem statement: ${problem_statement || "N/A"}
- Preferred technologies: ${tech}
- Preferred industries: ${inds}
- Innovation level (0..1): ${innovation_level.toFixed(2)}
- Budget: ${budget_range}
- Complexity: ${complexity}
- Explanation depth: ${explanation_depth}

Output format (strict):
For each idea 1..3, provide:
- Title
- One-liner
- Why it fits (tie back to inputs)
- Core components (bulleted)
- Architecture summary (2–4 sentences)
- Estimated budget + timeline
- Risks/mitigations
- Stretch goals

Style guide:
${depthText}
Use clear headings (Idea 1, Idea 2, Idea 3) and concise bullets.
  `.trim();
}

async function callGemini(apiKey, modelName, userPrompt) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const generationConfig = {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 1200
  };

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig
  });

  return result.response.text();
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? "Generating…" : "Generate Project Ideas";
}

generateBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  const model  = modelSelect.value;

  const problem = problemInput.value.trim();
  const technologies = getCheckedValues("tech");
  const industries   = getCheckedValues("industry");
  const innovation   = Number(innovationInp.value) / 100; // 0..1
  const budget       = budgetSelect.value;
  const complexity   = complexitySel.value;
  const explainLevel = getExplainLevel();

  if (!apiKey) {
    outputDiv.textContent = "⚠️ Enter your Gemini API key before generating.";
    return;
  }
  if (!problem && technologies.length === 0 && industries.length === 0) {
    outputDiv.textContent = "⚠️ Add a problem statement or select at least one technology/industry.";
    return;
  }

  const params = {
    model,
    problem_statement: problem || null,
    preferred_technologies: technologies,
    preferred_industries: industries,
    explanation_depth: explainLevel,
    innovation_level: innovation,
    budget_range: budget,
    complexity
  };

  const prompt = makePrompt(params);

  try {
    setLoading(true);
    outputDiv.textContent = "⏳ Thinking with Gemini…";
    const text = await callGemini(apiKey, model, prompt);
    outputDiv.textContent = text || "No content returned.";
  } catch (err) {
    console.error(err);
    outputDiv.textContent = "❌ Error calling Gemini: " + (err?.message || err);
  } finally {
    setLoading(false);
  }
});
