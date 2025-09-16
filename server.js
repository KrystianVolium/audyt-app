// ==================================================================
// ===         KOMPLETNY I FINALNY KOD DLA server.js            ===
// ==================================================================

// --- 1. IMPORTY I KONFIGURACJA POCZĄTKOWA ---
require('dotenv').config(); 
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 2. ŁADOWANIE BAZY WIEDZY ---
const knowledgeBasePath = path.join(__dirname, 'baza-wiedzy.txt');
let knowledgeBase = '';
try {
    knowledgeBase = fs.readFileSync(knowledgeBasePath, 'utf-8');
    console.log("Pomyślnie załadowano bazę wiedzy z pliku baza-wiedzy.txt.");
} catch (error) {
    console.error("KRYTYCZNY BŁĄD: Nie udało się załadować pliku baza-wiedzy.txt.", error);
    knowledgeBase = "[Błąd ładowania bazy wiedzy]";
}

// --- 3. MIDDLEWARE (POŚREDNICY) ---
const corsOptions = {
  origin: [
    'https://audyt-kondycji-marki.netlify.app',
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    'http://127.0.0.1:5500',
    'http://localhost:5500'
  ]
};
app.use(cors(corsOptions));
app.use(express.json());

// --- 4. FUNKCJE POMOCNICZE ---
const isInputGibberish = (answers) => {
    const lowQualityWords = ['nie wiem', 'trudno powiedzieć', 'test', 'asdf', 'brak', 'xd', 'ok'];
    let totalLength = 0;
    for (const answer of answers) {
        const lowerCaseAnswer = answer.toLowerCase().trim();
        if (lowerCaseAnswer.length === 0) continue;
        totalLength += lowerCaseAnswer.length;
        if (lowQualityWords.includes(lowerCaseAnswer)) return true;
        if (/^(\w)\1+$/.test(lowerCaseAnswer)) return true;
        if (/^\d+$/.test(lowerCaseAnswer)) return true;
    }
    if (totalLength < 20) return true;
    return false;
};

// --- 5. GŁÓWNY ENDPOINT APLIKACJI ---
app.post('/api/analyze', async (req, res) => {
  try {
    // Krok A: Pobieramy dane i sprawdzamy, czy w ogóle istnieją
    const { score, answers, userName, brandName } = req.body;

    if (!score || !answers) {
      return res.status(400).json({ error: 'Brakujące dane w zapytaniu.' });
    }

    // Walidacja i fallback dla danych personalizacji
    const validUserName = userName && userName.trim().length > 0 ? userName.trim() : 'Użytkownik';
    const validBrandName = brandName && brandName.trim().length > 0 ? brandName.trim() : 'Twoja firma';

    // Krok B: Uruchamiamy filtr jakości odpowiedzi
    if (isInputGibberish(answers)) {
        const sharpResponse = "Twoje odpowiedzi na pytania otwarte wydają się być przypadkowe lub zbyt lakoniczne. Prawdziwa diagnoza strategiczna wymaga refleksji i zaangażowania. Jeśli brakuje czasu na rzetelne wypełnienie audytu, prawdopodobnie trudno będzie znaleźć go na wdrożenie fundamentalnych zmian w firmie. Gdy będziesz gotów na pogłębioną analizę, wróć i spróbuj ponownie.";
        return res.json({ analysis: sharpResponse });
    }

    // Krok C: Tworzymy dynamiczną "wskazówkę" dla AI na podstawie wyniku
    let wskazowkaCTA = '';
    if (score <= 25) {
        wskazowkaCTA = `Bądź bezpośredni. Podkreśl, że sytuacja wymaga pilnej interwencji i że intensywny warsztat strategiczny jest najskuteczniejszym, pierwszym krokiem do jej naprawy. Zakończ słowami otuchy, ale podkreślającymi wagę podjęcia odważnej decyzji.`;
    } else if (score <= 45) {
        wskazowkaCTA = `Zaproponuj konkretne ćwiczenie lub obszar do samodzielnej pracy, ale wskaż, że dedykowany warsztat jest "akceleratorem", który pozwala uniknąć pułapek i znacznie oszczędzić czas. Zakończ inspirującym zdaniem, które zmotywuje do podjęcia tego pierwszego kroku i życz powodzenia.`;
    } else { // Wynik 46+
        wskazowkaCTA = `Zrezygnuj z tonu "naprawiania". Zakończ zaproszeniem na partnerską, niezobowiązującą sesję strategiczną, pozycjonując ją jako formę wymiany inspiracji między liderami rynkowymi. Zakończ z wyrazami szacunku dla dotychczasowych osiągnięć.`;
    }

    // Krok D: Definiujemy JEDEN, kompletny prompt, który korzysta ze wszystkich naszych danych
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    let prompt = `
      ## Persona & Rola: Wytrawny Strateg-Mentor
      Jesteś elitarnym strategiem marki z wieloletnim doświadczeniem, działającym jako zaufany mentor dla ambitnych liderów. Twój styl jest empatyczny, ale niezwykle wnikliwy. Nie dajesz prostych odpowiedzi; zadajesz pytania, które prowokują do myślenia, i łączysz kropki w nieoczywisty sposób. Twoim celem jest dostarczenie użytkownikowi jednej, przełomowej perspektywy ("aha moment"), a nie gotowego rozwiązania.

      ## Kontekst Strategiczny (Twoja Baza Wiedzy)
      Twoja filozofia i metodologia opierają się na poniższych zasadach. Odwołuj się do nich, aby nadać swojej analizie unikalny charakter.
      ---
      ${knowledgeBase}
      ---

      ## Dane Wejściowe od Użytkownika

      **👤 IMIĘ UŻYTKOWNIKA: ${validUserName}**
      **🏢 NAZWA MARKI/FIRMY: ${validBrandName}**

      - Wynik Punktowy: ${score}/60
      - Odpowiedzi na Pytania Otwarte:
        1. (Wartość/Dziedzictwo): "${answers[0]}"
        2. (Niewykorzystany Potencjał): "${answers[1]}"
        3. (Autentyczność Komunikacji): "${answers[2]}"
        4. (Spójność Wizerunku): "${answers[3]}"

      ## Kluczowe Ograniczenia i Zasady

      - **🔥 KRYTYCZNE - PERSONALIZACJA 🔥:** ZAWSZE i BEZWZGLĘDNIE zwracaj się do użytkownika po imieniu "${validUserName}" już w pierwszym zdaniu i regularnie w całej odpowiedzi. Gdy mówisz o jego marce/firmie, ZAWSZE używaj konkretnej nazwy "${validBrandName}" zamiast ogólnych określeń. PRZYKŁAD: "${validUserName}, analizując wyniki audytu ${validBrandName}..." NIGDY nie używaj bezimiennych zwrotów typu "Twoja firma" gdy masz konkretną nazwę marki.

      - **Nie używaj formalnych nagłówków, numeracji ani cudzysłowów** w swojej odpowiedzi. Tekst ma być płynną, spójną narracją.
      - Skup się na syntezie i zadawaniu pytań, a nie na dawaniu twardych, kategorycznych stwierdzeń.

      ## Główne Zadanie
      Przeanalizuj WSZYSTKIE dostarczone dane. Stwórz spójną, syntetyczną analizę w formie bezpośredniego, osobistego zwrotu do lidera, który wypełnił audyt. Twoja odpowiedź powinna naturalnie przechodzić przez trzy fazy: 
      1.  Rozpocznij od podsumowania obecnej sytuacji, łącząc wnioski z wyniku i odpowiedzi.
      2.  Następnie przejdź do głębszej implikacji lub zidentyfikuj kluczowe napięcie, o którym użytkownik mógł nie myśleć, nadając mu ramy koncepcyjne z Twojej Bazy Wiedzy.
      3.  Na koniec wskaż najbardziej wartościowy kierunek dalszych działań, stosując się do poniższej wskazówki dotyczącej wezwania do działania: "${wskazowkaCTA}"
    `;

    // Krok E: Wysyłamy prompt do AI i odsyłamy odpowiedź do użytkownika
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    res.json({ analysis: analysisText });

  } catch (error) {
    console.error('Błąd podczas komunikacji z API Gemini:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas generowania analizy.' });
  }
});

// --- 6. URUCHOMIENIE SERWERA ---
app.listen(PORT, () => {
  console.log(`Serwer uruchomiony i gotowy do analizy na http://localhost:${PORT}`);
});