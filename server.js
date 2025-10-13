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
    'http://localhost:5500',
    'http://localhost:3000'
  ]
};
app.use(cors(corsOptions));
app.use(express.json());

// Serwowanie plików statycznych
app.use(express.static(__dirname));

// --- 4. FUNKCJE POMOCNICZE ---
const isInputGibberish = (answers) => {
    let totalLength = 0;
    let validAnswers = 0;
    let suspiciousAnswers = 0;

    for (const answer of answers) {
        const lowerCaseAnswer = answer.toLowerCase().trim();
        if (lowerCaseAnswer.length === 0) {
            suspiciousAnswers++;
            continue;
        }

        totalLength += lowerCaseAnswer.length;

        // Sprawdź TYLKO krótkie, bezsensowne odpowiedzi (< 15 znaków)
        if (lowerCaseAnswer.length < 15) {
            const veryShortBadWords = ['nie wiem', 'trudno powiedzieć', 'test', 'asdf', 'brak', 'xd', 'ok', 'asd', 'qwe', 'zxc', 'brak pomysłu'];
            if (veryShortBadWords.some(word => lowerCaseAnswer === word || lowerCaseAnswer === word + '.')) {
                suspiciousAnswers++;
                continue;
            }
        }

        // Sprawdź powtarzające się znaki
        if (/^(.{1,3})\1{2,}$/.test(lowerCaseAnswer)) {
            suspiciousAnswers++;
            continue;
        }

        // Sprawdź same cyfry
        if (/^\d+$/.test(lowerCaseAnswer)) {
            suspiciousAnswers++;
            continue;
        }

        // Sprawdź losowe ciągi znaków
        const vowels = (lowerCaseAnswer.match(/[aąeęioóuy]/g) || []).length;
        const consonants = (lowerCaseAnswer.match(/[bcćdfghjklłmnńprsśtwzźż]/g) || []).length;
        const hasConsecutiveConsonants = /[bcćdfghjklłmnńprsśtwzźż]{5,}/.test(lowerCaseAnswer);

        if (consonants > 0 && vowels / (vowels + consonants) < 0.15 && hasConsecutiveConsonants) {
            suspiciousAnswers++;
            continue;
        }

        // Sensowne odpowiedzi
        if (lowerCaseAnswer.length >= 20) {
            validAnswers++;
        } else if (lowerCaseAnswer.length >= 10) {
            validAnswers += 0.5;
        }
    }

    // KRYTERIA ODRZUCENIA
    if (totalLength < 50) return true;
    if (suspiciousAnswers > 2) return true;
    if (validAnswers < 2) return true;

    return false;
};

// --- 5. GŁÓWNY ENDPOINT APLIKACJI ---
app.post('/api/analyze', async (req, res) => {
  try {
    // Krok A: Pobieramy dane i sprawdzamy, czy w ogóle istnieją
    const { score, answers, userName, brandName, userSegment } = req.body;

    if (!score || !answers) {
      return res.status(400).json({ error: 'Brakujące dane w zapytaniu.' });
    }

    // Walidacja i fallback dla danych personalizacji
    const validUserName = userName && userName.trim().length > 0 ? userName.trim() : 'Użytkownik';
    const validBrandName = brandName && brandName.trim().length > 0 ? brandName.trim() : (userSegment === 'personal' ? 'Twoja marka osobista' : 'Twoja firma');
    const segmentContext = userSegment === 'personal' ? 'Marka Osobista (freelancer, ekspert, twórca, konsultant)' : 'Marka Firmy (zespół, organizacja, biznes B2B/B2C)';

    // Krok B: Uruchamiamy filtr jakości odpowiedzi
    if (isInputGibberish(answers)) {
        const sharpResponse = "Twoje odpowiedzi na pytania otwarte wydają się być przypadkowe lub zbyt lakoniczne. Prawdziwa diagnoza strategiczna wymaga refleksji i zaangażowania. Jeśli brakuje czasu na rzetelne wypełnienie audytu, prawdopodobnie trudno będzie znaleźć go na wdrożenie fundamentalnych zmian w firmie. Gdy będziesz gotów na pogłębioną analizę, wróć i spróbuj ponownie.";
        return res.json({ analysis: sharpResponse });
    }

    // Krok C: Tworzymy dynamiczną "wskazówkę" dla AI na podstawie wyniku
    let wskazowkaCTA = '';
    if (score <= 15) {
        wskazowkaCTA = `Bądź szczerze bezpośredni. Sytuacja wymaga natychmiastowej interwencji strategicznej. Podkreśl pilność działania i wskaż, że bez fundamentów strategicznych każda akcja marketingowa będzie marnowaniem zasobów. Zakończ mocnym, ale budującym wezwaniem do działania.`;
    } else if (score <= 25) {
        wskazowkaCTA = `Bądź stanowczy, ale wspierający. Podkreśl, że jest to moment przełomowy – albo budujemy fundamenty, albo dalej tracimy szanse. Warsztat strategiczny to najszybsza droga do uporządkowania chaosu. Zakończ z nutą nadziei i wiary w potencjał.`;
    } else if (score <= 35) {
        wskazowkaCTA = `Doceniaj to, co już działa, ale wskaż na niespójności jako główny hamulec rozwoju. Zaproponuj konkretne ćwiczenie lub obszar do samodzielnej pracy, ale podkreśl, że warsztat strategiczny jest "akceleratorem" eliminującym pułapki. Zakończ motywująco.`;
    } else if (score <= 45) {
        wskazowkaCTA = `Ton optymistyczny i budujący. Podkreśl, że są już na dobrej drodze, a niewielkie optymalizacje mogą przynieść duże rezultaty. Zaproponuj warsztat jako narzędzie precyzyjnego dostrajania, nie naprawiania. Zakończ z zachętą do kolejnego kroku rozwoju.`;
    } else if (score <= 54) {
        wskazowkaCTA = `Ton ekspercki i partnerski. Zrezygnuj z tonu "naprawiania". Mów o szlifowaniu mistrzostwa i wymianie doświadczeń. Zaproś na sesję strategiczną jako spotkanie równych sobie liderów branżowych. Zakończ z uznaniem dla osiągnięć.`;
    } else { // Wynik 55-60
        wskazowkaCTA = `Ton pełen szacunku i uznania dla elity. Całkowicie zrezygnuj z tonu doradczego. Zaproś na partnerską wymianę inspiracji i strategicznych spostrzeżeń między liderami rynkowymi. Pozycjonuj spotkanie jako okazję do networkingu na najwyższym poziomie. Zakończ z głębokim uznaniem dla mistrzowskiego poziomu.`;
    }

    // Krok D: Definiujemy JEDEN, kompletny prompt, który korzysta ze wszystkich naszych danych
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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
      **📊 SEGMENT UŻYTKOWNIKA: ${segmentContext}**

      - Wynik Punktowy: ${score}/60

      ## Interpretacja Wyniku (6-poziomowa skala):
      - **0-15 pkt**: Fundamenty wymagają budowy (krytyczny stan, brak podstaw strategicznych)
      - **16-25 pkt**: Pora na strategiczne podstawy (pojedyncze elementy, brak spójności)
      - **26-35 pkt**: Dobra baza, brakuje spójności (solidne podstawy, ale chaotyczne działanie)
      - **36-45 pkt**: Silna pozycja, potencjał wzrostu (dobra forma, przestrzeń do optymalizacji)
      - **46-54 pkt**: Zaawansowana strategia marki (silne aktywo, czołówka branży)
      - **55-60 pkt**: Mistrzostwo brandingowe (elita, autonomiczny lider rynku)

      - Odpowiedzi na Pytania Otwarte:
        1. (Wartość/Dziedzictwo): "${answers[0]}"
        2. (Niewykorzystany Potencjał): "${answers[1]}"
        3. (Autentyczność Komunikacji): "${answers[2]}"
        4. (Spójność Wizerunku): "${answers[3]}"

      ## Kluczowe Ograniczenia i Zasady

      - **🔥 KRYTYCZNE - PERSONALIZACJA 🔥:** ZAWSZE i BEZWZGLĘDNIE zwracaj się do użytkownika po imieniu "${validUserName}" już w pierwszym zdaniu i regularnie w całej odpowiedzi. Gdy mówisz o jego marce/firmie, ZAWSZE używaj konkretnej nazwy "${validBrandName}" zamiast ogólnych określeń. PRZYKŁAD: "${validUserName}, analizując wyniki audytu ${validBrandName}..." NIGDY nie używaj bezimiennych zwrotów typu "Twoja firma" gdy masz konkretną nazwę marki.

      - **🎯 DOSTOSOWANIE DO SEGMENTU:** Użytkownik wybrał segment "${segmentContext}". Dostosuj swoją analizę, język i rekomendacje do tego kontekstu. ${userSegment === 'personal' ? 'Mów o nim jako o ekspercie/twórcy budującym osobistą markę, unikaj odniesień do zespołu czy pracowników. Skup się na jego osobistym wpływie, autentyczności i budowaniu autorytetu.' : 'Analizuj z perspektywy organizacji, zespołu i struktury firmowej. Odnosi się do pracowników, kultury organizacyjnej i systemów biznesowych.'}

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