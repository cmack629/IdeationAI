# CPE 4800 - SENIOR DESIGN - HAI HO - TEAM 5
# 🚀 AI-Powered Project Ideation Tool  
## 📖 Overview  
This project is a **web-based application** that leverages **Large Language Models (LLMs)** like **Google Gemini** (and optionally ChatGPT) to generate **viable project ideas** for **Senior Design Proposals** and beyond.  

The tool helps users brainstorm structured project ideas by providing:  
- **Project Names**  
- **Descriptions**  
- **Required Technologies**  
- **Budget & Timeframe Estimates**  
- **Skills Needed**  
- **Similar Products**  
- **Novel Elements**  

---

## ✨ Features  
✅ **Interactive Web UI** with two-column layout:  
- **Left Column** → Input constraints & parameters  
- **Right Column** → Expandable results with 3 AI-generated project ideas  

✅ **Parameter Inputs**:  
- User prompt (idea/constraints)  
- Budget & timeframe sliders  
- Technology & industry checkboxes  
- Complexity, innovation level, and demo size options  

✅ **Smart Output Formatting**:  
- Each project idea shown in **expandable cards**  
- Organized sections (description, skills, timeframe, etc.)  
- List formatting (`-` bullets) for readability  
- Highlighted labels in **gold (#fbe462)**  

✅ **Styling & UX**:  
- Modern **glassmorphism design**  
- Smooth fade-in animation for results  
- Responsive layout  

---

## 🛠️ Tech Stack  
- **Frontend**: HTML, CSS, JavaScript  
- **Libraries**:  
  - [noUiSlider](https://refreshless.com/nouislider/) – interactive sliders  
- **AI Integration**:  
  - Google Gemini API (via fetch)  
  - Future option: ChatGPT / Claude  

---

## 🚦 How It Works  
1. User enters **constraints** (idea, budget, timeframe, etc.).  
2. App builds a structured **AI prompt**.  
3. Gemini API generates **3 project ideas**.  
4. App displays them in **organized, expandable cards**.  

---

## ⚡ Setup & Installation  

1. Clone this repo:  
   ```bash
   git clone <repo-url>
   cd <repo-folder>
2. Open the app via the GitHub Pages link (no server required).
    - Example: https://your-username.github.io/your-repo-name/
3. Enter your Google Gemini API key in the input field.
4. Provide constraints → Click Generate Ideas.