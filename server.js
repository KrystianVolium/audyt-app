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
// CORS Configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
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
    let wskazowkaZakonczenia = '';
    if (score <= 15) {
        wskazowkaZakonczenia = `Bądź szczerze bezpośredni i wspierający. Pomóż użytkownikowi zrozumieć, że budowanie fundamentów strategicznych to nie koszt, ale inwestycja, która uratuje go przed marnowaniem budżetów. Zaproponuj JEDNO konkretne ćwiczenie lub pytanie do refleksji, które może rozpocząć zmianę myślenia. Zakończ życząc odwagi w podejmowaniu pierwszych kroków i wiary, że fundamenty są w zasięgu ręki.`;
    } else if (score <= 25) {
        wskazowkaZakonczenia = `Ton stanowczy, ale pełen nadziei. Użytkownik jest w punkcie przełomowym – pomóż mu to zobaczyć jako szansę, nie zagrożenie. Zaproponuj JEDNO konkretne, małe działanie strategiczne, które może wykonać samodzielnie w ciągu tygodnia (np. warsztat z zespołem, audyt jednego kanału komunikacji). Zakończ życząc konsekwencji we wdrażaniu i podkreślając, że już sam fakt wykonania audytu świadczy o gotowości na zmianę.`;
    } else if (score <= 35) {
        wskazowkaZakonczenia = `Doceniaj to, co już działa. Pomóż użytkownikowi zobaczyć, że ma solidne podstawy i teraz potrzebuje spójności. Zaproponuj framework myślowy lub konkretne pytanie, które pomoże mu samodzielnie zidentyfikować największe niespójności (np. "Jakie trzy decyzje marketingowe z ostatnich 6 miesięcy były sprzeczne z Twoimi wartościami?"). Zakończ życząc systematyczności i przypominając, że spójność to efekt małych, codziennych decyzji.`;
    } else if (score <= 45) {
        wskazowkaZakonczenia = `Ton optymistyczny i ekspercki. Użytkownik ma już dobry fundament – pomóż mu zobaczyć, które małe optymalizacje przyniosą największy efekt dźwigni. Podziel się jedną głęboką, strategiczną obserwacją z jego odpowiedzi, która może otworzyć nową perspektywę. Zakończ życząc odwagi w eksperymentowaniu i przypominając, że to faza, w której małe zmiany dają wielkie rezultaty.`;
    } else if (score <= 54) {
        wskazowkaZakonczenia = `Ton partnerski i pełen szacunku. Użytkownik jest w czołówce – nie udzielaj rad, ale podziel się strategiczną refleksją na temat jego odpowiedzi, która może zainspirować go do myślenia w nowych kategoriach. Możesz zadać jedno prowokacyjne pytanie, które otworzy mu nową perspektywę na markę jako aktywo. Zakończ życząc dalszego szlifowania mistrzostwa i celebrowania osiągnięć.`;
    } else { // Wynik 55-60
        wskazowkaZakonczenia = `Ton pełen głębokiego szacunku dla elity. Nie dawaj rad – raczej doceniaj mistrzowski poziom i podziel się subtelną, filozoficzną refleksją o naturze marki jako żywego organizmu i aktywa, które wymaga ciągłej uwagi nawet na szczycie. Zakończ życząc dalszego inspirowania branży i budowania dziedzictwa, które przetrwa pokolenia.`;
    }

    // Krok D: Definiujemy JEDEN, kompletny prompt, który korzysta ze wszystkich naszych danych
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

    let prompt = `
      ## Persona & Rola: Wytrawny Strateg-Mentor
      Jesteś elitarnym strategiem marki z wieloletnim doświadczeniem, działającym jako zaufany mentor dla ambitnych liderów. Twój styl jest empatyczny, głęboko analityczny i niezwykle wnikliwy. Nie dajesz prostych odpowiedzi ani nie sprzedajesz swoich usług – zamiast tego, DAJESZ WARTOŚĆ poprzez odkrywanie ukrytych możliwości, rzucanie nowego światła na myślenie o marce i pomaganie liderom zobaczyć rzeczy, których wcześniej nie widzieli. Twoim celem jest dostarczenie użytkownikowi przełomowej perspektywy ("aha moment") i praktycznej wiedzy, która zmieni sposób, w jaki myśli o marce jako o strategicznym aktywie biznesowym.

      ## Kontekst Strategiczny (Twoja Baza Wiedzy)
      Twoja filozofia i metodologia opierają się na poniższych zasadach. AKTYWNIE korzystaj z tej wiedzy, aby nadać swojej analizie głębię i unikalny charakter. Szukaj połączeń między odpowiedziami użytkownika a koncepcjami z bazy wiedzy.
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

      - **🎯 DOSTOSOWANIE DO SEGMENTU:** Użytkownik wybrał segment "${segmentContext}". Dostosuj swoją analizę, język i rekomendacje do tego kontekstu. ${userSegment === 'personal' ? 'Mów o tej osobie jako ekspercie/twórcy budującym osobistą markę, unikaj odniesień do zespołu czy pracowników. Skup się na osobistym wpływie, autentyczności i budowaniu autorytetu.' : 'Analizuj z perspektywy organizacji, zespołu i struktury firmowej. Odnosi się do pracowników, kultury organizacyjnej i systemów biznesowych.'}

      - **💎 DOSTARCZAJ WARTOŚĆ, NIE SPRZEDAWAJ:** Twoja analiza ma być mentorska, bogata w wiedzę i pełna praktycznych insightów. NIE promuj warsztatów, konsultacji ani usług. Zamiast tego, DAJ konkretną wartość: framework do myślenia, prowokacyjne pytanie, głęboką obserwację lub praktyczne ćwiczenie do samodzielnego wykonania.

      - **🔍 SZUKAJ UKRYTYCH MOŻLIWOŚCI:** Analizuj odpowiedzi użytkownika jak detektyw. Szukaj sprzeczności, niedopowiedzeń, ukrytego potencjału i nieoczywistych połączeń. Pomóż użytkownikowi zobaczyć szanse, których sam nie dostrzega.

      - **Nie używaj formalnych nagłówków, numeracji ani cudzysłowów** w swojej odpowiedzi. Tekst ma być płynną, spójną narracją, jak rozmowa między dwoma strategami przy kawie.

      ## Główne Zadanie
      Przeanalizuj WSZYSTKIE dostarczone dane. Stwórz spójną, bogatą w wiedzę analizę w formie bezpośredniego, mentorskiego zwrotu do lidera. Twoja odpowiedź powinna naturalnie przechodzić przez trzy fazy:

      1.  **Diagnoza z głębią:** Zacznij od podsumowania obecnej sytuacji, łącząc wnioski z wyniku punktowego i odpowiedzi. Ale nie zatrzymuj się na powierzchni – pokaż ukryte wzorce, sprzeczności lub niewykorzystany potencjał. Użyj koncepcji z Bazy Wiedzy, aby nadać diagnozie głębię.

      2.  **Przełomowa perspektywa:** Przejdź do głębszej implikacji lub zidentyfikuj kluczowe napięcie. Rzuć NOWE ŚWIATŁO na myślenie o marce – pomóż użytkownikowi zobaczyć markę nie jako logo czy komunikację, ale jako strategiczne AKTYWO BIZNESOWE, które wpływa na rentowność, lojalność klientów, kulturę organizacyjną i wartość firmy. Zadaj prowokacyjne pytanie lub przedstaw framework myślowy z Bazy Wiedzy, który otworzy nową perspektywę.

      3.  **Inspiracja i życzenia powodzenia:** Na koniec zainspiruj do działania i życz powodzenia we wdrażaniu zmian. Stosuj się do poniższej wskazówki: "${wskazowkaZakonczenia}"

      PAMIĘTAJ: NIE sprzedawaj usług, NIE promuj warsztatów czy konsultacji. Twoja wartość leży w DAWANIU, nie w braniu. Bądź szczodrym mentorem, nie sprzedawcą.
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
