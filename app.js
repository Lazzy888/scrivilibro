// ==============================
// DATI E STORAGE
// ==============================

let chapters = [];
let currentChapterId = null;
const STORAGE_KEY = "scrivilibro_chapters_v1";

function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "_" + Math.random();
}

function saveToStorage() {
    // FIX #4: localStorage è già per-device, per-origin.
    // I dati non lasciano mai il dispositivo – nessuna sincronizzazione cloud.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chapters, currentChapterId }));
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        chapters         = Array.isArray(data.chapters) ? data.chapters : [];
        currentChapterId = data.currentChapterId || (chapters[0] && chapters[0].id) || null;
    } catch {
        chapters = []; currentChapterId = null;
    }
}

// ==============================
// RIFERIMENTI DOM
// ==============================

const chaptersListEl   = document.getElementById("chaptersList");
const chapterTitleEl   = document.getElementById("chapterTitle");
const chapterContentEl = document.getElementById("chapterContent");
const addChapterBtn    = document.getElementById("addChapterBtn");
const recordBtn        = document.getElementById("recordBtn");
const recordLabel      = document.getElementById("recordLabel");
const saveLocalBtn     = document.getElementById("saveLocalBtn");
const exportTxtBtn     = document.getElementById("exportTxtBtn");
const exportDocxBtn    = document.getElementById("exportDocxBtn");
const clipboardBtn     = document.getElementById("clipboardBtn");
const editBtn          = document.getElementById("editBtn");
const editorPanel      = document.getElementById("editorPanel");
const editorOverlay    = document.getElementById("editorOverlay");
const editorList       = document.getElementById("editorList");
const editorDeleteBtn  = document.getElementById("editorDeleteBtn");
const editorUndoBtn    = document.getElementById("editorUndoBtn");
const closeEditorBtn   = document.getElementById("closeEditorBtn");

// AI panel
const aiSettingsBtn  = document.getElementById("aiSettingsBtn");
const aiPanel        = document.getElementById("aiPanel");
const aiOverlay      = document.getElementById("aiOverlay");
const closeAiBtn     = document.getElementById("closeAiBtn");
const aiKeySetup     = document.getElementById("aiKeySetup");
const aiKeyInput     = document.getElementById("aiKeyInput");
const aiKeySaveBtn   = document.getElementById("aiKeySaveBtn");
const aiMain         = document.getElementById("aiMain");
const aiKeyMask      = document.getElementById("aiKeyMask");
const aiKeyChangeBtn = document.getElementById("aiKeyChangeBtn");
const aiCategories   = document.getElementById("aiCategories");
const aiSubPanel     = document.getElementById("aiSubPanel");
const aiSubTitle     = document.getElementById("aiSubTitle");
const aiSubOptions   = document.getElementById("aiSubOptions");
const aiSpinner      = document.getElementById("aiSpinner");
const aiPreviewSheet = document.getElementById("aiPreviewSheet");
const aiPreviewText  = document.getElementById("aiPreviewText");
const aiCancelBtn    = document.getElementById("aiCancelBtn");
const aiApplyBtn     = document.getElementById("aiApplyBtn");
const aiSheetCloseBtn = document.getElementById("aiSheetCloseBtn");
const aiErrorBox      = document.getElementById("aiErrorBox");
const aiErrorMsg      = document.getElementById("aiErrorMsg");
const aiErrorCloseBtn = document.getElementById("aiErrorCloseBtn");
// Books panel
const openBooksBtn    = document.getElementById("openBooksBtn");
const openBooksTopBtn = document.getElementById("openBooksTopBtn"); // bottone topbar
const booksPanel     = document.getElementById("booksPanel");
const booksOverlay   = document.getElementById("booksOverlay");
const closeBooksBtn  = document.getElementById("closeBooksBtn");
const bookNameInput  = document.getElementById("bookNameInput");
const bookSaveBtn    = document.getElementById("bookSaveBtn");
const booksListEl    = document.getElementById("booksList");
const statusDotEl      = document.getElementById("statusDot");
const infoMessageEl    = document.getElementById("infoMessage");
const interimBox       = document.getElementById("interimBox");
const menuBtn          = document.getElementById("menuBtn");
const chaptersPanel    = document.getElementById("chaptersPanel");
const closeChapters    = document.getElementById("closeChapters");
const chaptersOverlay  = document.getElementById("chaptersOverlay");

// ==============================
// MENU PANNELLO CAPITOLI
// ==============================

function openPanel()  { renderChaptersList(); chaptersPanel.classList.remove("hidden"); chaptersOverlay.classList.remove("hidden"); }
function closePanel() { chaptersPanel.classList.add("hidden");    chaptersOverlay.classList.add("hidden"); }

menuBtn.addEventListener("click", openPanel);
closeChapters.addEventListener("click", closePanel);
chaptersOverlay.addEventListener("click", closePanel);

// ── POPUP ISTRUZIONI ──
const helpBtn      = document.getElementById("helpBtn");
const helpModal    = document.getElementById("helpModal");
const helpOverlay  = document.getElementById("helpOverlay");
const closeHelp    = document.getElementById("closeHelp");
const closeHelpBtn = document.getElementById("closeHelpBtn");

function openHelp()  { helpModal.classList.remove("hidden"); helpOverlay.classList.remove("hidden"); }
function closeHelpModal() { helpModal.classList.add("hidden"); helpOverlay.classList.add("hidden"); }

helpBtn.addEventListener("click",      openHelp);
closeHelp.addEventListener("click",    closeHelpModal);
closeHelpBtn.addEventListener("click", closeHelpModal);
helpOverlay.addEventListener("click",  closeHelpModal);

// ==============================
// UTILITÀ UI
// ==============================

function setInfo(msg, ms = 3500) {
    infoMessageEl.textContent = msg;
    if (ms) setTimeout(() => { if (infoMessageEl.textContent === msg) infoMessageEl.textContent = ""; }, ms);
}

function updateOnlineStatus() {
    const ok = navigator.onLine;
    if (statusDotEl) {
        statusDotEl.style.background = ok ? "#16a34a" : "#9ca3af";
        statusDotEl.title = ok ? "Online" : "Offline";
    }
}

// ==============================
// GESTIONE CAPITOLI
// ==============================

function getCurrentChapter() {
    return chapters.find(c => c.id === currentChapterId) || null;
}

function addChapter(title = "Nuovo capitolo") {
    const ch = { id: uuid(), title, content: "" };
    chapters.push(ch);
    currentChapterId = ch.id;
    renderChaptersList();
    renderCurrentChapter();
    saveToStorage();
    closePanel();
}

function deleteChapter(id) {
    const idx = chapters.findIndex(c => c.id === id);
    if (idx === -1) return;
    stopSpeechRecognition();          // azzera isRecording e srRestarting
    chapters.splice(idx, 1);
    if (currentChapterId === id) currentChapterId = chapters[0] ? chapters[0].id : null;
    renderChaptersList();
    renderCurrentChapter();
    saveToStorage();
}

function renameChapter(id) {
    const ch = chapters.find(c => c.id === id);
    if (!ch) return;
    const newTitle = prompt("Nuovo nome del capitolo:", ch.title);
    if (newTitle === null) return;
    ch.title = newTitle.trim() || ch.title;
    if (currentChapterId === id) chapterTitleEl.value = ch.title;
    renderChaptersList();
    saveToStorage();
}

function selectChapter(id) {
    stopSpeechRecognition();          // ferma dettatura se attiva
    const cur = getCurrentChapter();
    if (cur) { cur.content = chapterContentEl.value; cur.title = chapterTitleEl.value; }
    saveToStorage();
    currentChapterId = id;
    renderChaptersList();
    renderCurrentChapter();
    closePanel();
}

function updateCurrentChapterTitle(title) {
    const ch = getCurrentChapter();
    if (!ch) return;
    ch.title = title;
    renderChaptersList();
    saveToStorage();
}

function updateCurrentChapterContent(content) {
    const ch = getCurrentChapter();
    if (!ch) return;
    ch.content = content;
    saveToStorage();
}

// ==============================
// RENDER UI
// ==============================

function renderChaptersList() {
    chaptersListEl.innerHTML = "";
    chapters.forEach(ch => {
        const li = document.createElement("li");
        li.className = ch.id === currentChapterId ? "active" : "";

        const titleSpan = document.createElement("span");
        titleSpan.className   = "title";
        titleSpan.textContent = ch.title || "Senza titolo";
        titleSpan.addEventListener("click", () => selectChapter(ch.id));

        const renBtn = document.createElement("button");
        renBtn.className   = "ch-action rename-ch";
        renBtn.textContent = "✏️";
        renBtn.title       = "Rinomina";
        renBtn.addEventListener("click", (e) => { e.stopPropagation(); renameChapter(ch.id); });

        const delBtn = document.createElement("button");
        delBtn.className   = "ch-action delete-ch";
        delBtn.textContent = "✕";
        delBtn.title       = "Elimina";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm("Eliminare questo capitolo?")) deleteChapter(ch.id);
        });

        li.appendChild(titleSpan);
        li.appendChild(renBtn);
        li.appendChild(delBtn);
        chaptersListEl.appendChild(li);
    });
}

function renderCurrentChapter() {
    const ch = getCurrentChapter();
    chapterTitleEl.disabled   = !ch;
    chapterContentEl.disabled = !ch;
    chapterTitleEl.value   = ch ? ch.title   : "";
    chapterContentEl.value = ch ? ch.content : "";
}

// ==============================
// REGISTRAZIONE VOCALE  (Web Speech API)
// ==============================
//
// Strategia anti-duplicazione definitiva: continuous = FALSE
//
// Con continuous=true Chrome Android ri-consegna i risultati di enunciati
// precedenti ogni volta che la sessione si interrompe e riparte, causando
// la triplicazione del testo.
//
// Con continuous=false ogni istanza ascolta UN solo enunciato, produce
// UN solo evento onresult con UN solo risultato finale, poi si chiude.
// Nessun ri-consegna possibile. Il testo viene appeso una sola volta.
// Se isRecording è ancora true, si avvia subito una nuova istanza pulita.

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition  = null;
let isRecording  = false;
let srRestarting = false;   // blocca doppi avvii simultanei

function setRecordingUI(active) {
    isRecording = active;
    if (active) {
        recordBtn.classList.add("recording");
        recordLabel.textContent = "Stop registrazione";
        interimBox.classList.remove("hidden");
    } else {
        recordBtn.classList.remove("recording");
        recordLabel.textContent = "Avvia registrazione";
        interimBox.classList.add("hidden");
        interimBox.textContent = "";
    }
}

function startSpeechRecognition() {
    if (!SpeechRecognition) {
        setInfo("⚠️ Riconoscimento vocale non supportato in questo browser.");
        return;
    }
    const ch = getCurrentChapter();
    if (!ch) { setInfo("Crea prima un capitolo."); return; }

    isRecording  = true;
    srRestarting = false;
    setRecordingUI(true);
    setInfo("🎙️ Dettatura attiva – parla ora", 0);
    _startOneShot();
}

function _startOneShot() {
    if (!isRecording || srRestarting) return;
    srRestarting = true;

    // Ogni istanza vive per un solo enunciato (continuous = false).
    // onresult scatta UNA volta con il testo finale → nessuna duplicazione.
    const rec = new SpeechRecognition();
    rec.lang            = "it-IT";
    rec.continuous      = false;   // ← chiave: un enunciato per istanza
    rec.interimResults  = true;    // solo per il riquadro giallo in tempo reale
    rec.maxAlternatives = 1;

    rec.onstart = () => { srRestarting = false; };

    rec.onresult = (event) => {
        // Con continuous=false arriva sempre e solo results[0]
        const result = event.results[0];
        if (result.isFinal) {
            const newText = result[0].transcript.trim();
            if (newText) {
                const cur = chapterContentEl.value;
                const sep = cur.trimEnd() ? " " : "";
                chapterContentEl.value = cur.trimEnd() + sep + newText;
                // Salva subito
                const ch = getCurrentChapter();
                if (ch) { ch.content = chapterContentEl.value; saveToStorage(); }
            }
            interimBox.textContent = "";
        } else {
            interimBox.textContent = "💬 " + result[0].transcript;
        }
    };

    rec.onend = () => {
        srRestarting = false;
        if (isRecording) {
            // Avvia subito la prossima istanza per continuare ad ascoltare
            setTimeout(_startOneShot, 80);
        } else {
            setRecordingUI(false);
            setInfo("✅ Dettatura terminata.");
        }
    };

    rec.onerror = (e) => {
        srRestarting = false;
        if (e.error === "no-speech") {
            // Silenzio: riprova senza mostrare errore
            if (isRecording) setTimeout(_startOneShot, 80);
            return;
        }
        if (e.error === "not-allowed") {
            setInfo("❌ Permesso microfono negato. Abilitalo nelle impostazioni del browser.");
            isRecording = false;
            setRecordingUI(false);
            return;
        }
        console.warn("SR error:", e.error);
        if (isRecording) setTimeout(_startOneShot, 300);
    };

    recognition = rec;
    try { rec.start(); }
    catch (e) { srRestarting = false; console.warn("SR start:", e); }
}

function stopSpeechRecognition() {
    isRecording  = false;
    srRestarting = false;
    if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
    setRecordingUI(false);
}

function toggleRecording() {
    if (!isRecording) { startSpeechRecognition(); }
    else              { stopSpeechRecognition(); }
}

// ==============================
// EDITOR AVANZATO — selezione frasi
// ==============================

let editorHistory = [];   // stack undo (max 20 snapshot)

function pushUndo(text) {
    editorHistory.push(text);
    if (editorHistory.length > 20) editorHistory.shift();
}

function openEditor() {
    const ch = getCurrentChapter();
    if (!ch || !ch.content.trim()) { setInfo("Nessun testo da modificare."); return; }

    // Divide in frasi: punti, !, ?, a capo
    const raw = ch.content;
    const sentences = splitIntoSentences(raw);

    renderEditorPanel(sentences, raw);
    editorPanel.classList.remove("hidden");
    editorOverlay.classList.remove("hidden");
}

function splitIntoSentences(text) {
    // Divide per punteggiatura forte o doppio a capo, preservando il delimitatore
    const parts = [];
    const re = /[^.!?\n]+[.!?]*\n*|[^.!?\n]*\n+/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const s = m[0];
        if (s.trim()) parts.push(s);
    }
    return parts.length ? parts : [text];
}

function renderEditorPanel(sentences, originalText) {
    editorList.innerHTML = "";
    let selectedCount = 0;

    sentences.forEach((sentence, idx) => {
        const li = document.createElement("li");
        li.className  = "ed-item";
        li.dataset.idx = idx;
        li.dataset.selected = "0";

        const cb = document.createElement("span");
        cb.className   = "ed-check";
        cb.textContent = "○";

        const txt = document.createElement("span");
        txt.className   = "ed-text";
        txt.textContent = sentence.trim();

        li.appendChild(cb);
        li.appendChild(txt);

        li.addEventListener("click", () => {
            const sel = li.dataset.selected === "1";
            li.dataset.selected = sel ? "0" : "1";
            li.classList.toggle("selected", !sel);
            cb.textContent = sel ? "○" : "●";
            selectedCount += sel ? -1 : 1;
            editorDeleteBtn.textContent = selectedCount > 0
                ? `🗑 Elimina selezionate (${selectedCount})`
                : "🗑 Elimina selezionate";
            editorDeleteBtn.disabled = selectedCount === 0;
        });

        editorList.appendChild(li);
    });

    editorDeleteBtn.disabled  = true;
    editorDeleteBtn.textContent = "🗑 Elimina selezionate";
    editorUndoBtn.disabled    = editorHistory.length === 0;
    editorSentences = sentences;
    editorOriginal  = originalText;
}

let editorSentences = [];
let editorOriginal  = "";

function deleteSelected() {
    const ch = getCurrentChapter();
    if (!ch) return;

    const items = [...editorList.querySelectorAll(".ed-item")];
    const toDelete = new Set(
        items.filter(li => li.dataset.selected === "1").map(li => +li.dataset.idx)
    );

    pushUndo(ch.content);

    const kept = editorSentences.filter((_, i) => !toDelete.has(i));
    const newText = kept.join("").replace(/\n{3,}/g, "\n\n").trim();

    ch.content = newText;
    chapterContentEl.value = newText;
    saveToStorage();

    // Ricarica pannello
    const newSentences = splitIntoSentences(newText);
    renderEditorPanel(newSentences, newText);
    editorUndoBtn.disabled = false;
    setInfo(`✅ Eliminate ${toDelete.size} fras${toDelete.size === 1 ? "e" : "i"}.`);
}

function undoEditor() {
    if (!editorHistory.length) return;
    const ch = getCurrentChapter();
    if (!ch) return;

    const prev = editorHistory.pop();
    ch.content = prev;
    chapterContentEl.value = prev;
    saveToStorage();

    const newSentences = splitIntoSentences(prev);
    renderEditorPanel(newSentences, prev);
    editorUndoBtn.disabled = editorHistory.length === 0;
    setInfo("↩️ Modifica annullata.");
}

function closeEditorPanel() {
    editorPanel.classList.add("hidden");
    editorOverlay.classList.add("hidden");
}

// ==============================
// FIX #3 — COPIA IN CLIPBOARD
// ==============================

async function copyToClipboard() {
    const ch = getCurrentChapter();
    const text = chapterContentEl.value.trim();
    if (!text) { setInfo("Nessun testo da copiare."); return; }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback per browser/WebView senza Clipboard API
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity  = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
        setInfo("📋 Testo copiato negli appunti!");
    } catch (err) {
        setInfo("Impossibile copiare: " + err.message);
    }
}

// ==============================
// AI ENGINE — Groq + Llama 3
// ==============================

const GROQ_MODEL    = "llama3-8b-8192";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const AI_KEY_STORE  = "scrivilibro_groq_key";

const AI_OPERATIONS = [
    {
        id: "rewrite", icon: "✍️", label: "Riscrittura",
        desc: "Corregge grammatica, punteggiatura ed elimina ripetizioni",
        options: [
            { label: "Correggi grammatica e punteggiatura",
              prompt: "Correggi la grammatica e la punteggiatura del testo seguente, preservando il significato e lo stile originale. Restituisci solo il testo corretto, senza commenti." },
            { label: "Rendi più scorrevole",
              prompt: "Riscrivi il testo seguente rendendolo più scorrevole e fluente, migliorando la leggibilità senza cambiarne il significato. Restituisci solo il testo riscritto." },
            { label: "Elimina ripetizioni",
              prompt: "Riscrivi il testo seguente eliminando parole e frasi ripetute, usando sinonimi appropriati. Restituisci solo il testo corretto." },
            { label: "Riscrittura intelligente completa",
              prompt: "Esegui una riscrittura intelligente del testo: correggi grammatica, punteggiatura, elimina ripetizioni e migliora la fluidità. Mantieni il significato originale. Restituisci solo il testo riscritto." },
        ]
    },
    {
        id: "style", icon: "🎭", label: "Stile narrativo",
        desc: "Trasforma il tono e lo stile del testo",
        options: [
            { label: "Più emozionale",
              prompt: "Riscrivi il testo seguente rendendolo più emozionale e coinvolgente, aggiungendo sensazioni e stati d'animo. Restituisci solo il testo riscritto." },
            { label: "Più descrittivo",
              prompt: "Riscrivi il testo seguente rendendolo più descrittivo e visivo, arricchendo scene e ambienti. Restituisci solo il testo riscritto." },
            { label: "Più conciso",
              prompt: "Riscrivi il testo seguente rendendolo più conciso ed essenziale, eliminando il superfluo. Restituisci solo il testo riscritto." },
            { label: "Stile da romanzo",
              prompt: "Riscrivi il testo seguente con uno stile tipico dei romanzi letterari italiani: narrazione in terza persona, ritmo elegante, figure retoriche. Restituisci solo il testo riscritto." },
            { label: "Stile da saggio",
              prompt: "Riscrivi il testo seguente con uno stile saggistico: argomentativo, preciso, con periodi strutturati. Restituisci solo il testo riscritto." },
        ]
    },
    {
        id: "expand", icon: "📖", label: "Espansione",
        desc: "Arricchisce e amplia il contenuto",
        options: [
            { label: "Aggiungi dettagli",
              prompt: "Espandi il testo seguente aggiungendo dettagli descrittivi e sensoriali che arricchiscano la narrazione. Restituisci solo il testo ampliato." },
            { label: "Amplia la scena",
              prompt: "Espandi il testo seguente ampliando le scene principali con maggiore profondità. Restituisci solo il testo ampliato." },
            { label: "Crea dialoghi",
              prompt: "Espandi il testo seguente inserendo o ampliando dialoghi tra i personaggi. Restituisci solo il testo con i dialoghi aggiunti." },
            { label: "Arricchisci descrizioni",
              prompt: "Espandi il testo seguente arricchendo le descrizioni di luoghi, personaggi e atmosfere. Restituisci solo il testo ampliato." },
            { label: "Aggiungi contesto",
              prompt: "Espandi il testo seguente aggiungendo contesto storico, culturale o narrativo utile al lettore. Restituisci solo il testo ampliato." },
        ]
    },
    {
        id: "summary", icon: "📝", label: "Riassunto",
        desc: "Sintetizza e riorganizza le idee",
        options: [
            { label: "Riassunto breve",
              prompt: "Crea un riassunto breve e chiaro del testo seguente in 3-5 frasi. Restituisci solo il riassunto." },
            { label: "Sinossi narrativa",
              prompt: "Scrivi una sinossi narrativa del testo seguente, come quella di un libro. Restituisci solo la sinossi." },
            { label: "Riorganizza le idee",
              prompt: "Riorganizza le idee del testo seguente in modo logico e coerente, mantenendo tutti i concetti. Restituisci solo il testo riorganizzato." },
            { label: "Struttura del capitolo",
              prompt: "Analizza il testo e proponi una struttura organizzata in sezioni con titoli e punti chiave. Restituisci solo la struttura proposta." },
        ]
    },
    {
        id: "tone", icon: "🎨", label: "Tono del testo",
        desc: "Cambia il tono e il registro",
        options: [
            { label: "Più formale",
              prompt: "Riscrivi il testo seguente con un registro formale e professionale. Restituisci solo il testo riscritto." },
            { label: "Più colloquiale",
              prompt: "Riscrivi il testo seguente con un tono colloquiale e spontaneo, come una conversazione. Restituisci solo il testo riscritto." },
            { label: "Più ironico",
              prompt: "Riscrivi il testo seguente aggiungendo un tono ironico e sottilmente sarcastico. Restituisci solo il testo riscritto." },
            { label: "Più drammatico",
              prompt: "Riscrivi il testo seguente con un tono drammatico e intenso. Restituisci solo il testo riscritto." },
            { label: "Più poetico",
              prompt: "Riscrivi il testo seguente con un tono poetico, usando immagini evocative e un ritmo musicale. Restituisci solo il testo riscritto." },
        ]
    },
    {
        id: "coherence", icon: "🔍", label: "Coerenza narrativa",
        desc: "Analizza contraddizioni e continuità",
        options: [
            { label: "Trova contraddizioni",
              prompt: "Analizza il testo seguente e identifica eventuali contraddizioni narrative, logiche o di continuità. Elenca i problemi trovati con spiegazioni." },
            { label: "Suggerimenti alla trama",
              prompt: "Analizza il testo e suggerisci miglioramenti alla trama per renderla più coerente e coinvolgente. Elenca i suggerimenti in modo chiaro." },
            { label: "Continuità personaggi",
              prompt: "Analizza il testo e verifica la continuità dei personaggi (carattere, comportamento, dialoghi). Segnala eventuali incongruenze." },
        ]
    },
    {
        id: "titles", icon: "🏷️", label: "Generazione titoli",
        desc: "Genera titoli per capitoli e libro",
        options: [
            { label: "Titolo per questo capitolo",
              prompt: "Basandoti sul testo seguente, proponi 5 titoli originali e accattivanti per questo capitolo. Elencali numerati, senza spiegazioni." },
            { label: "Titoli per paragrafi",
              prompt: "Analizza il testo e proponi titoli per i paragrafi principali che identifichi. Formato: [Paragrafo N] - Titolo proposto." },
            { label: "Titolo per l'intero libro",
              prompt: "Basandoti sul testo seguente che rappresenta parte di un libro, proponi 5 possibili titoli per l'intera opera. Elencali numerati con una breve motivazione." },
        ]
    },
    {
        id: "simplify", icon: "🔤", label: "Semplificazione",
        desc: "Rende il testo più accessibile",
        options: [
            { label: "Più leggibile",
              prompt: "Riscrivi il testo seguente rendendolo più leggibile: frasi più brevi, vocabolario chiaro, struttura semplice. Restituisci solo il testo riscritto." },
            { label: "Per pubblico ampio",
              prompt: "Adatta il testo per un pubblico vasto e non specializzato, eliminando tecnicismi e semplificando il linguaggio. Restituisci solo il testo adattato." },
            { label: "Elimina frasi complesse",
              prompt: "Riscrivi il testo spezzando frasi troppo lunghe o complesse in frasi più brevi e chiare. Restituisci solo il testo riscritto." },
        ]
    },
];

// ── Gestione chiave API ──

function getGroqKey()      { return localStorage.getItem(AI_KEY_STORE) || ""; }
function saveGroqKey(key)  { localStorage.setItem(AI_KEY_STORE, key.trim()); }

function maskKey(key) {
    if (!key || key.length < 8) return "***";
    return key.slice(0, 6) + "…" + key.slice(-4);
}

// ── Apertura/chiusura pannello AI ──

function openAiPanel() {
    aiPanel.classList.remove("hidden");
    aiOverlay.classList.remove("hidden");
    resetAiPanel();

    const key = getGroqKey();
    if (key) {
        showAiMain(key);
    } else {
        aiKeySetup.classList.remove("hidden");
        aiMain.classList.add("hidden");
    }
}

function closeAiPanel() {
    aiPanel.classList.add("hidden");
    aiOverlay.classList.add("hidden");
    aiSubPanel.classList.add("hidden");
    aiSpinner.classList.add("hidden");
    aiPreviewSheet.classList.add("hidden");
    hideAiError();
    document.querySelectorAll(".ai-cat-card.active").forEach(el => el.classList.remove("active"));
}

function resetAiPanel() {
    aiSubPanel.classList.add("hidden");
    aiSpinner.classList.add("hidden");
    aiPreviewSheet.classList.add("hidden");
    // Deseleziona categorie
    document.querySelectorAll(".ai-cat-card.active").forEach(el => el.classList.remove("active"));
}

function showAiMain(key) {
    aiKeySetup.classList.add("hidden");
    aiMain.classList.remove("hidden");
    aiKeyMask.textContent = maskKey(key);
    renderAiCategories();
}

// ── Render categorie ──

function renderAiCategories() {
    aiCategories.innerHTML = "";
    AI_OPERATIONS.forEach(op => {
        const card = document.createElement("div");
        card.className       = "ai-cat-card";
        card.dataset.id      = op.id;
        card.innerHTML = `<span class="ai-cat-icon">${op.icon}</span>
                          <span class="ai-cat-label">${op.label}</span>
                          <span class="ai-cat-desc">${op.desc}</span>`;
        card.addEventListener("click", () => selectAiCategory(op, card));
        aiCategories.appendChild(card);
    });
}

function selectAiCategory(op, cardEl) {
    // Deseleziona tutto
    document.querySelectorAll(".ai-cat-card").forEach(c => c.classList.remove("active"));
    cardEl.classList.add("active");

    aiSubTitle.textContent = `${op.icon} ${op.label}`;
    aiSubOptions.innerHTML = "";
    op.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className   = "ai-sub-opt";
        btn.textContent = opt.label;
        btn.addEventListener("click", () => runAiOperation(opt.prompt, opt.label));
        aiSubOptions.appendChild(btn);
    });

    aiSubPanel.classList.remove("hidden");
    aiPreviewSheet.classList.add("hidden");
    aiSpinner.classList.add("hidden");
    // Scrolla al sub-panel
    aiSubPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Helpers errore AI ──

function showAiError(msg) {
    aiErrorMsg.textContent = msg;
    aiErrorBox.classList.remove("hidden");
    aiSpinner.classList.add("hidden");
    aiPreviewSheet.classList.add("hidden");
    // Scorre per rendere visibile l'errore
    setTimeout(() => aiErrorBox.scrollIntoView({ behavior: "smooth", block: "nearest" }), 40);
}

function hideAiError() {
    aiErrorBox.classList.add("hidden");
    aiErrorMsg.textContent = "";
}

// ── Esegui operazione AI ──

async function runAiOperation(systemPrompt, opLabel) {
    const ch = getCurrentChapter();
    if (!ch || !ch.content.trim()) {
        showAiError("⚠️ Nessun testo nel capitolo corrente.");
        return;
    }
    const key = getGroqKey();
    if (!key) { showAiError("⚠️ Inserisci prima la chiave API Groq."); return; }
    if (!navigator.onLine) { showAiError("⚠️ Sei offline: impossibile contattare l'AI."); return; }

    hideAiError();
    aiPreviewSheet.classList.add("hidden");
    aiSpinner.classList.remove("hidden");
    setTimeout(() => aiSpinner.scrollIntoView({ behavior: "smooth", block: "nearest" }), 40);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        console.log("[AI] Invio richiesta a Groq, modello:", GROQ_MODEL);
        const res = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "Content-Type":  "application/json",
                "Authorization": "Bearer " + key
            },
            body: JSON.stringify({
                model:       GROQ_MODEL,
                max_tokens:  4096,
                temperature: 0.7,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user",   content: ch.content }
                ]
            })
        });

        clearTimeout(timeoutId);
        console.log("[AI] Risposta HTTP:", res.status);

        if (!res.ok) {
            let errMsg = "HTTP " + res.status;
            try {
                const errData = await res.json();
                errMsg = errData?.error?.message || errMsg;
            } catch (_) {}
            throw new Error(errMsg);
        }

        const data   = await res.json();
        console.log("[AI] Dati ricevuti:", JSON.stringify(data).slice(0, 200));
        const result = data?.choices?.[0]?.message?.content?.trim() ?? "";

        if (!result) throw new Error("Risposta vuota dall'AI (choices[0] assente).");

        aiSpinner.classList.add("hidden");
        aiPreviewText.value = result;
        aiPreviewSheet.classList.remove("hidden");
        setTimeout(() => aiPreviewSheet.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
        setInfo("✅ " + opLabel + " completata.");

    } catch (err) {
        clearTimeout(timeoutId);
        const msg = err.name === "AbortError"
            ? "⏱ Timeout: nessuna risposta entro 30 secondi."
            : "❌ " + err.message;
        console.error("[AI] Errore:", err);
        showAiError(msg);
    }
}

// ── Applica / Annulla risultato ──

function applyAiResult() {
    const ch = getCurrentChapter();
    if (!ch) return;
    pushUndo(ch.content);
    ch.content = aiPreviewText.value;
    chapterContentEl.value = ch.content;
    saveToStorage();
    aiPreviewSheet.classList.add("hidden");
    closeAiPanel();
    setInfo("✅ Testo AI applicato al capitolo.");
}

// ── Event listeners AI ──

aiSettingsBtn.addEventListener("click", openAiPanel);
closeAiBtn.addEventListener("click",    closeAiPanel);
aiOverlay.addEventListener("click",     closeAiPanel);

aiKeySaveBtn.addEventListener("click", () => {
    const key = aiKeyInput.value.trim();
    if (!key.startsWith("gsk_") && key.length < 10) {
        setInfo("Chiave non valida. Deve iniziare con gsk_"); return;
    }
    saveGroqKey(key);
    aiKeyInput.value = "";
    showAiMain(key);
    setInfo("🔑 Chiave API salvata sul device.");
});

aiKeyChangeBtn.addEventListener("click", () => {
    aiKeySetup.classList.remove("hidden");
    aiMain.classList.add("hidden");
    aiKeyInput.value = "";
});

aiErrorCloseBtn.addEventListener("click", hideAiError);
aiApplyBtn.addEventListener("click",  applyAiResult);
aiCancelBtn.addEventListener("click", () => {
    aiPreviewSheet.classList.add("hidden");
    closeAiPanel();
    setInfo("Operazione annullata.");
});
aiSheetCloseBtn.addEventListener("click", () => {
    aiPreviewSheet.classList.add("hidden");
    // rimane nel pannello AI per scegliere un'altra operazione
});

// ==============================
// ESPORTAZIONE TXT
// ==============================

function buildBookText() {
    return chapters
        .map((ch, i) => `${ch.title || "Capitolo " + (i+1)}\n\n${ch.content || ""}`)
        .join("\n\n" + "=".repeat(30) + "\n\n");
}

function exportAsTxt() {
    const blob = new Blob([buildBookText()], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, "scrivilibro.txt");
    setInfo("TXT esportato.");
}

// ==============================
// ESPORTAZIONE DOCX (vera, JSZip)
// ==============================

function escapeXml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function exportAsDocx() {
    if (typeof JSZip === "undefined") { setInfo("JSZip non caricato. Ricarica la pagina."); return; }
    if (chapters.length === 0)        { setInfo("Nessun capitolo da esportare."); return; }

    const bodyParas = chapters.flatMap((ch, i) => {
        const titleXml  = escapeXml(ch.title || `Capitolo ${i + 1}`);
        const heading   = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr><w:t>${titleXml}</w:t></w:r></w:p>`;
        const lines     = (ch.content || "").split("\n");
        const content   = lines.map(l => l.trim()
            ? `<w:p><w:r><w:t xml:space="preserve">${escapeXml(l)}</w:t></w:r></w:p>`
            : `<w:p/>`);
        return [heading, ...content, "<w:p/>"];
    }).join("\n");

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
    const rootRels     = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
    const documentXml  = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyParas}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1701" w:bottom="1701" w:left="1701"/></w:sectPr></w:body></w:document>`;
    const wordRels     = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    try {
        setInfo("Generazione DOCX…", 0);
        const zip = new JSZip();
        zip.file("[Content_Types].xml", contentTypes);
        zip.folder("_rels").file(".rels", rootRels);
        zip.folder("word").file("document.xml", documentXml);
        zip.folder("word").folder("_rels").file("document.xml.rels", wordRels);
        const blob = await zip.generateAsync({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });
        triggerDownload(blob, "scrivilibro.docx");
        setInfo("✅ DOCX esportato.");
    } catch (err) { setInfo("Errore DOCX: " + err.message); }
}

// ==============================
// DOWNLOAD HELPER
// ==============================

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ==============================
// EVENT LISTENERS
// ==============================

addChapterBtn.addEventListener("click",  () => addChapter());
recordBtn.addEventListener("click",      toggleRecording);
exportTxtBtn.addEventListener("click",   exportAsTxt);
exportDocxBtn.addEventListener("click",  exportAsDocx);
clipboardBtn.addEventListener("click",   copyToClipboard);
editBtn.addEventListener("click",        openEditor);
editorDeleteBtn.addEventListener("click", deleteSelected);
editorUndoBtn.addEventListener("click",   undoEditor);
closeEditorBtn.addEventListener("click",  closeEditorPanel);
editorOverlay.addEventListener("click",   closeEditorPanel);

saveLocalBtn.addEventListener("click", () => {
    const ch = getCurrentChapter();
    if (ch) { ch.content = chapterContentEl.value; ch.title = chapterTitleEl.value; }
    saveToStorage();
    setInfo("💾 Salvato su questo dispositivo (localStorage). Non lascia il device.");
});

chapterTitleEl.addEventListener("input",   e => updateCurrentChapterTitle(e.target.value));
chapterContentEl.addEventListener("input", e => updateCurrentChapterContent(e.target.value));
window.addEventListener("online",  updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);


// ==============================
// GESTIONE LIBRI (PROGETTI)
// ==============================

const BOOKS_KEY = "scrivilibro_books_v1";

function loadBooks() {
    try { return JSON.parse(localStorage.getItem(BOOKS_KEY)) || []; }
    catch { return []; }
}
function saveBooks(books) {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

function openBooksPanel() {
    closePanel();
    renderBooksList();
    booksPanel.classList.remove("hidden");
    booksOverlay.classList.remove("hidden");
}
function closeBooksPanel() {
    booksPanel.classList.add("hidden");
    booksOverlay.classList.add("hidden");
}

function renderBooksList() {
    const books = loadBooks();
    booksListEl.innerHTML = "";
    if (books.length === 0) {
        booksListEl.innerHTML = '<p class="books-empty">Nessun libro salvato.</p>';
        return;
    }
    books.forEach(book => {
        const item = document.createElement("div");
        item.className = "book-item";

        const info = document.createElement("div");
        info.className = "book-info";
        info.innerHTML = `<strong>${book.name}</strong><span class="book-date">${book.savedAt}</span>`;

        const actions = document.createElement("div");
        actions.className = "book-actions";

        const loadBtn = document.createElement("button");
        loadBtn.className = "btn primary small";
        loadBtn.textContent = "📂 Carica";
        loadBtn.addEventListener("click", () => loadBook(book.id));

        const delBtn = document.createElement("button");
        delBtn.className = "btn danger small";
        delBtn.textContent = "🗑";
        delBtn.addEventListener("click", () => {
            if (confirm(`Eliminare "${book.name}"?`)) deleteBook(book.id);
        });

        actions.appendChild(loadBtn);
        actions.appendChild(delBtn);
        item.appendChild(info);
        item.appendChild(actions);
        booksListEl.appendChild(item);
    });
}

function saveBook() {
    const name = bookNameInput.value.trim();
    if (!name) { setInfo("Inserisci un nome per il libro."); return; }

    // Sincronizza il capitolo corrente prima di fare lo snapshot
    const cur = getCurrentChapter();
    if (cur) { cur.content = chapterContentEl.value; cur.title = chapterTitleEl.value; }
    saveToStorage();

    const books = loadBooks();
    const now   = new Date().toLocaleString("it-IT", {
        day:"2-digit", month:"2-digit", year:"numeric",
        hour:"2-digit", minute:"2-digit"
    });
    // Snapshot dei dati correnti
    const snap = {
        id:        "book_" + Date.now(),
        name,
        savedAt:   now,
        chapters:  JSON.parse(JSON.stringify(chapters)),
        currentChapterId
    };
    books.unshift(snap);
    saveBooks(books);
    bookNameInput.value = "";
    renderBooksList();
    setInfo("Libro salvato: " + name);
}

function loadBook(id) {
    const books = loadBooks();
    const book  = books.find(b => b.id === id);
    if (!book) return;
    if (!confirm(`Caricare "${book.name}"? Il libro corrente sarà sostituito.`)) return;

    chapters         = JSON.parse(JSON.stringify(book.chapters));
    currentChapterId = book.currentChapterId;
    if (!chapters.find(c => c.id === currentChapterId)) {
        currentChapterId = chapters[0]?.id || null;
    }
    saveToStorage();
    renderChaptersList();
    renderCurrentChapter();
    closeBooksPanel();
    setInfo("Libro caricato: " + book.name);
}

function deleteBook(id) {
    const books = loadBooks().filter(b => b.id !== id);
    saveBooks(books);
    renderBooksList();
    setInfo("Libro eliminato.");
}

openBooksBtn.addEventListener("click",    openBooksPanel);
if (openBooksTopBtn) openBooksTopBtn.addEventListener("click", openBooksPanel);
closeBooksBtn.addEventListener("click", closeBooksPanel);
booksOverlay.addEventListener("click",  closeBooksPanel);
bookSaveBtn.addEventListener("click",   saveBook);

// ==============================
// INIT
// ==============================

function init() {
    loadFromStorage();

    // Assicura che currentChapterId punti a un capitolo esistente
    if (chapters.length === 0) {
        addChapter("Capitolo 1");
    } else {
        if (!chapters.find(c => c.id === currentChapterId)) {
            currentChapterId = chapters[0].id;
        }
        renderChaptersList();
        renderCurrentChapter();
    }

    // Dot online: navigator.onLine non è affidabile al cold start su Android PWA.
    // Forziamo due check: immediato + dopo 800ms + probe fetch.
    updateOnlineStatus();
    setTimeout(updateOnlineStatus, 800);
    probeOnlineStatus();
}

async function probeOnlineStatus() {
    try {
        // HEAD request leggera su un endpoint affidabile
        await fetch("https://www.google.com/favicon.ico", {
            method: "HEAD", mode: "no-cors", cache: "no-store"
        });
        // Se arriviamo qui siamo online
        if (statusDotEl) {
            statusDotEl.style.background = "#16a34a";
            statusDotEl.title = "Online";
        }
    } catch {
        if (statusDotEl) {
            statusDotEl.style.background = "#9ca3af";
            statusDotEl.title = "Offline";
        }
    }
}

init();
