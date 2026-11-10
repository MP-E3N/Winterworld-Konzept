// @ts-check
/**
 * verbindung.js — Die Schnittstelle zwischen Spiel und „Wahrheit“ (nur Typen, kein Code).
 *
 * ZWECK:    Das Spiel (game/, eingabe/, render/, ui/) redet NUR über diese Schnittstelle mit der
 *           Simulation. Heute steckt dahinter netz/lokal.js (Simulation im selben Browser),
 *           ab M6 eine WebSocket-Verbindung zu einem Node-Server. Das Spiel merkt den
 *           Unterschied nicht.
 * REGEL:    KONZEPT.md §8 Regeln 5, 6, 12
 *
 * PLAN FÜR M6 (damit die Schnittstelle jetzt schon passt):
 *   - senden()    schickt den Befehl an den Server UND wendet ihn lokal vorhersagend an.
 *   - schritt()   rechnet den eigenen Zustand vorhersagend einen Tick weiter.
 *   - Kommt vom Server ein bestätigter Zustand, wird er übernommen und die noch nicht
 *     bestätigten eigenen Befehle werden neu darauf abgespielt (Client-Vorhersage).
 *   - Pause: Der Server entscheidet; `pausiert` spiegelt nur seinen Stand.
 */

/**
 * @typedef {Object} Verbindung
 * @property {number} spieler   Spielernummer DIESES Rechners (nie fest 0 annehmen!)
 * @property {() => import('../sim/types.js').Zustand} zustand  aktueller Zustand (nur lesen!)
 * @property {(b: import('../sim/types.js').Befehl) => void} senden  Befehl einreihen; wirkt vor dem nächsten Tick
 * @property {() => void} schritt  genau einen Tick ausführen
 * @property {() => boolean} pausiert
 * @property {(an: boolean) => void} pauseSetzen   Einzelspiel: sofort; Multiplayer: Wunsch an den Server
 * @property {() => number} tempo   Faktor 1, 2 oder 4
 * @property {(faktor: number) => void} tempoSetzen
 * @property {() => import('../sim/types.js').ProtokollEintrag[]} protokoll  ausgeführte Befehle (Replay)
 */

export {};
