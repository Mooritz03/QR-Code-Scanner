
const video = document.getElementById('kamera');               // Videoelement zum Anzeigen des Kamerastreams
const canvas = document.getElementById('canvas');              // Unsichtbares Canvas zum Zeichnen des Videobilds
const output = document.getElementById('output');              // Bereich zur Anzeige des erkannten QR-Codes
const button = document.getElementById('toggleButton');        // Start-/Stop-Button für die Kamera
const copyButton = document.getElementById('copyButton');      // Button zum Kopieren des QR-Codes
const copyStatus = document.getElementById('copyStatus');      // Anzeige des Kopierstatus


let stream = null;             // Aktueller Kamerastream
let scanning = false;          // Ob aktuell gescannt wird
let lastScannedCode = null;    // Letzter erkannter QR-Code (um Duplikate zu vermeiden)



// Asynchrone Funktion zum Starten der Kamera
async function startCamera() {
  try {
    // Anfrage für den Zugriff auf die Kamera (vorzugsweise die Rückkamera bei mobilen Geräten)
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

    // Sobald der Kamerastream erfolgreich abgerufen wurde:
    video.srcObject = stream;  // Der Kamerastream wird dem Video-Element zugewiesen, damit es angezeigt wird

    // Nachdem die Kamera geladen ist, wird dieser Block ausgeführt
    video.addEventListener('loadedmetadata', () => {
      scanning = true;                                // Das Scannen von QR-Codes wird aktiviert
      button.textContent = "Kamera stoppen";           // Der Text des Buttons ändert sich zu „Kamera stoppen“
      scanLoop();                                     // Die Hauptfunktion zur QR-Code-Erkennung wird gestartet
    }, { once: true });  // "once: true" sorgt dafür, dass der Event-Listener nur einmal ausgeführt wird
  } catch (err) {
    // Falls ein Fehler auftritt (z. B. kein Zugriff auf die Kamera oder keine Kamera vorhanden):
    console.error("Fehler beim Starten der Kamera:", err);  // Der Fehler wird in der Konsole ausgegeben
    alert("Keine Kamera gefunden oder Zugriff verweigert."); // Eine Fehlermeldung wird angezeigt
  }
}


// Funktion zum Stoppen der Kamera und Beenden des Streamings
function stopCamera() {
  // Überprüft, ob der Kamerastream existiert
  if (stream) {
    // Stoppt alle Tracks (Videos und Audios) des Streams, um die Kamera zu deaktivieren
    stream.getTracks().forEach(track => track.stop());

    // Setzt das Video-Element zurück, sodass es nicht mehr mit dem Stream verbunden ist
    video.srcObject = null;

    // Setzt die 'stream' Variable zurück auf null, um den Kamerastream zu löschen
    stream = null;

    // Stoppt das Scannen von QR-Codes
    scanning = false;

    // Ändert den Text des Buttons zu "Kamera starten", da die Kamera jetzt gestoppt wurde
    button.textContent = "Kamera starten";
  }
}


// Klick-Event für den Start-/Stopp-Knopf
button.addEventListener('click', () => {
  // Überprüft, ob ein Kamerastream aktiv ist
  if (stream) {
    stopCamera();   // Wenn die Kamera läuft, wird sie gestoppt
  } else {
    startCamera();  // Wenn die Kamera nicht läuft, wird sie gestartet
  }
});

// Hauptfunktion zur QR-Code-Erkennung (wird ständig wiederholt)
function scanLoop() {
  // Wenn das Scannen deaktiviert ist, beende die Funktion sofort
  if (!scanning) return;

  // Holen des Kontextes des Canvas-Elements, um darauf zu zeichnen
  const context = canvas.getContext('2d');
  
  // Setze die Breite und Höhe des Canvas auf die des Videos
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Zeichne das aktuelle Bild aus dem Video-Element auf das Canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Hole die Bilddaten aus dem Canvas (Pixeldaten)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  // Versuche, einen QR-Code aus den Bilddaten zu erkennen
  const code = jsQR(imageData.data, canvas.width, canvas.height);

  // Wenn ein QR-Code gefunden wurde und dieser Code nicht der zuletzt gescannte Code ist
  if (code && code.data !== lastScannedCode) {
    lastScannedCode = code.data;  // Speichern des erkannten Codes, um Duplikate zu vermeiden
    output.textContent = code.data; // Zeige den Inhalt des QR-Codes auf der Seite an
    console.log("Neuer QR-Code erkannt:", code.data);  // Ausgabe des erkannten Codes in der Konsole
  }

  // Starte den nächsten Scan-Zyklus mit requestAnimationFrame, was die Schleife effizienter macht
  requestAnimationFrame(scanLoop);
}

// Klick-Event für den "Kopieren"-Button
copyButton.addEventListener('click', () => {
  // Holen des Textes, der im Output-Bereich angezeigt wird
  const text = output.textContent.trim();

  // Wenn nichts erkannt wurde oder der Text leer ist
  if (!text || text === "Noch nichts erkannt") {
    // Zeige eine Fehlermeldung an, dass nichts zum Kopieren da ist
    copyStatus.textContent = "Nichts zum Kopieren vorhanden.";
    copyStatus.style.color = "red";  // Textfarbe auf Rot setzen
    return; // Beende die Funktion
  }

  // Versuche, den Text in die Zwischenablage zu kopieren
  navigator.clipboard.writeText(text)
    .then(() => {
      // Wenn das Kopieren erfolgreich war:
      copyStatus.textContent = "Text kopiert!";  // Erfolgsnachricht anzeigen
      copyStatus.style.color = "green";  // Textfarbe auf Grün setzen

      // Entferne die Erfolgsnachricht nach 2 Sekunden
      setTimeout(() => copyStatus.textContent = "", 2000);
    })
    .catch(err => {
      // Wenn ein Fehler beim Kopieren auftritt:
      console.error("Kopieren fehlgeschlagen:", err);  // Fehler in der Konsole anzeigen
      copyStatus.textContent = "Kopieren fehlgeschlagen.";  // Fehlermeldung anzeigen
      copyStatus.style.color = "red";  // Textfarbe auf Rot setzen
    });
});

// Holt den Button aus dem HTML-Dokument (der mit der ID "darkModeToggle")
const darkModeToggle = document.getElementById('darkModeToggle');

// Merkt sich, ob der Dunkelmodus gerade aktiv ist (anfangs: nein)
let isDarkMode = false;

// Reagiert auf Klicks auf den Button
darkModeToggle.addEventListener('click', () => {
  // Ändert den Wert von isDarkMode – wenn vorher false, wird true und umgekehrt
  isDarkMode = !isDarkMode;

  // Fügt dem <body> die Klasse "dark-mode" hinzu oder entfernt sie wieder
  // → Das löst im CSS die Farbänderungen aus
  document.body.classList.toggle('dark-mode', isDarkMode);

  // Ändert den Text im Button, je nachdem welcher Modus jetzt aktiv ist
  // Wenn Dunkelmodus an ist → „☀️ Hellmodus“, sonst „🌙 Dunkelmodus“
  darkModeToggle.textContent = isDarkMode ? '☀️ Hellmodus' : '🌙 Dunkelmodus';
});
