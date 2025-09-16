// Ta linia wczytuje zmienne z pliku .env (nasz klucz API)
require('dotenv').config(); 
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 1. Konfiguracja ---
// Inicjalizujemy klienta Google AI, tak jak w głównym serwerze
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- 2. Ładowanie Bazy Wiedzy ---
// Wczytujemy ten sam plik, aby testy były realistyczne
const knowledgeBasePath = path.join(__dirname, 'baza-wiedzy.txt');
let knowledgeBase = '';
try {
    knowledgeBase = fs.readFileSync(knowledgeBasePath, 'utf-8');
} catch (error) {
    console.error("BŁĄD: Nie udało się załadować pliku baza-wiedzy.txt.", error);
    process.exit(1); // Zakończ działanie skryptu w razie błędu
}

// --- 3. NASZA PIASKOWNICA ---
// W tej sekcji będziemy eksperymentować, nie ruszając reszty kodu.

// Tutaj wklejamy przykładowe odpowiedzi, aby symulować użytkownika
const sampleScore = 35; // Możemy zmieniać wynik, aby testować różne ścieżki
const sampleAnswers = [
    "Klienci tęskniliby za naszym podejściem i atmosferą, którą tworzymy. Pracownicy za poczuciem wspólnej misji.",
    "Największy potencjał to nasza ukryta wiedza specjalistyczna. Nie potrafimy jej jeszcze dobrze 'opakować' i sprzedać.",
    "Pracownicy oceniliby naszą komunikację jako szczerą, ale trochę chaotyczną. Mówimy prawdę, ale nie zawsze jednym głosem.",
    "Nasz wizerunek jest profesjonalny, ale trochę zbyt 'sztywny'. Nie oddaje w pełni naszej kreatywności i elastyczności."
];

// ZASTĄP STARY BLOK TYM PONIŻEJ:
let wskazowkaCTA = '';
if (sampleScore <= 25) {
    // Wskazówka dla niskiego wyniku
    wskazowkaCTA = `Bądź bezpośredni. Podkreśl, że sytuacja wymaga pilnej interwencji i że intensywny warsztat strategiczny jest najskuteczniejszym, pierwszym krokiem do jej naprawy. Zakończ słowami otuchy, ale podkreślającymi wagę podjęcia odważnej decyzji.`;
} else if (sampleScore <= 45) {
    // Wskazówka dla średniego wyniku
    wskazowkaCTA = `Zaproponuj konkretne ćwiczenie lub obszar do samodzielnej pracy, ale wskaż, że dedykowany warsztat jest "akceleratorem", który pozwala uniknąć pułapek i znacznie oszczędzić czas. Zakończ inspirującym zdaniem, które zmotywuje do podjęcia tego pierwszego kroku i życz powodzenia.`;
} else {
    // Wskazówka dla wysokiego wyniku (46+)
    wskazowkaCTA = `Zrezygnuj z tonu "naprawiania". Zakończ zaproszeniem na partnerską, niezobowiązującą sesję strategiczną, pozycjonując ją jako formę wymiany inspiracji między liderami rynkowymi. Zakończ z wyrazami szacunku dla dotychczasowych osiągnięć.`;
}

// === KONIEC FRAGMENTU DO WKLEJENIA ===

// Tutaj będziemy wklejać i testować nasze NOWE prompty
// ZASTĄP STARY PROMPT TĄ NOWĄ WERSJĄ:
let prompt = `

  ## Persona & Rola: Wytrawny Strateg-Mentor
  Jesteś elitarnym strategiem marki z wieloletnim doświadczeniem, działającym jako zaufany mentor dla ambitnych liderów. Twój styl jest empatyczny, ale niezwykle wnikliwy. Nie dajesz prostych odpowiedzi; zadajesz pytania, które prowokują do myślenia, i łączysz kropki w nieoczywisty sposób. Twoim celem jest dostarczenie użytkownikowi jednej, przełomowej perspektywy ("aha moment"), a nie gotowego rozwiązania.

  ## Kontekst Strategiczny (Twoja Baza Wiedzy)
  Twoja filozofia i metodologia opierają się na poniższych zasadach. Odwołuj się do nich, aby nadać swojej analizie unikalny charakter.
  ---
  ${knowledgeBase}
  ---

  ## Dane Wejściowe od Użytkownika
  - Wynik Punktowy: ${sampleScore}/60
  - Odpowiedzi na Pytania Otwarte:
    1. (Wartość/Dziedzictwo): "${sampleAnswers[0]}"
    2. (Niewykorzystany Potencjał): "${sampleAnswers[1]}"
    3. (Autentyczność Komunikacji): "${sampleAnswers[2]}"
    4. (Spójność Wizerunku): "${sampleAnswers[3]}"

  ## Kluczowe Ograniczenia i Zasady
  - **NIGDY nie wymyślaj ani nie zakładaj nazwy firmy użytkownika.** Zawsze zwracaj się do niego w formie "Pana firma", "Pański biznes", "Wasza marka". Używaj konkretnej nazwy tylko wtedy, gdy jest JEDNOZNACZNIE podana w odpowiedziach użytkownika.
  - **Nie używaj formalnych nagłówków, numeracji ani cudzysłowów** w swojej odpowiedzi. Tekst ma być płynną, spójną narracją.
  - Skup się na syntezie i zadawaniu pytań, a nie na dawaniu twardych, kategorycznych stwierdzeń.

  ## Główne Zadanie
  Przeanalizuj WSZYSTKIE dostarczone dane. Stwórz spójną, syntetyczną analizę w formie bezpośredniego, osobistego zwrotu do lidera, który wypełnił audyt. Twoja odpowiedź powinna naturalnie przechodzić przez trzy fazy: 
  1.  Rozpocznij od podsumowania obecnej sytuacji, łącząc wnioski z wyniku i odpowiedzi.
  2.  Następnie przejdź do głębszej implikacji lub zidentyfikuj kluczowe napięcie, o którym użytkownik mógł nie myśleć, nadając mu ramy koncepcyjne z Twojej Bazy Wiedzy.
  3.  Na koniec wskaż najbardziej wartościowy kierunek dalszych działań, stosując się do poniższej wskazówki dotyczącej wezwania do działania: "${wskazowkaCTA}"
`;

// --- 4. Wywołanie AI i Wyświetlenie Wyniku ---
async function runTest() {
    console.log("Wysyłanie promptu do AI... Proszę czekać.");
    
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysisText = response.text();

        console.log("\n--- OTRZYMANA ODPOWIEDŹ OD AI ---\n");
        console.log(analysisText);
        console.log("\n---------------------------------\n");

    } catch (error) {
        console.error("Wystąpił błąd podczas komunikacji z API Gemini:", error);
    }
}

runTest();