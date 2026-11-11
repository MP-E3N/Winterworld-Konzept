// @ts-check
/**
 * alle.js — Liste aller Testdateien. Neue Testdatei? Hier eine import-Zeile ergänzen.
 * WARUM Liste: Der Browser kann keine Ordner durchsuchen; so laden Node und Browser
 * dieselben Tests.
 */

import './rng.test.js';
import './trig.test.js';
import './befehle.test.js';
import './fahren.test.js';
import './wetter.test.js';
import './welt.test.js';
import './kollision.test.js';
import './bergen.test.js';
import './kessel.test.js';
import './lager.test.js';
import './crew.test.js';
import './determinismus.test.js';
import './regeln.test.js';

export { alleAusfuehren } from './harness.js';
