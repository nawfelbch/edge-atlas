// Laboratoire > Carry du jour : signal du candidat « carry confirmé par le
// momentum 12 mois » (backtest/forex-recherche.mjs), mêmes règles que le test :
// écart des taux à 3 mois ≥ 0,25 % dans le sens du momentum 12 mois, taille
// visant 10 % de volatilité annuelle par paire, révision en fin de mois.
// Lecture de données uniquement : aucun ordre.
(function (root) {
'use strict';
const PAIRES = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'XAU/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'NZD/USD', 'USD/CHF', 'AUD/JPY']
const SERIES = { USD: 'IR3TIB01USM156N', EUR: 'IR3TIB01EZM156N', GBP: 'IR3TIB01GBM156N', JPY: 'IR3TIB01JPM156N', AUD: 'IR3TIB01AUM156N', CAD: 'IR3TIB01CAM156N', CHF: 'IR3TIB01CHM156N', NZD: 'IR3TIB01NZM156N' }
const SEUIL = 0.0025, VOL_CIBLE = 0.10, LEVIER_MAX = 10, JOUR = 864e5

// ---------- Logique pure (testable sous Node) ----------
function parseFred(csv) {
  return csv.trim().split(/\r?\n/).slice(1).map((l) => { const [d, v] = l.split(','); return { t: Date.parse(d + 'T00:00:00Z'), r: Number(v) / 100 } }).filter((x) => Number.isFinite(x.t) && Number.isFinite(x.r))
}
// Moyenne mensuelle datée du 1er du mois : connue seulement une fois le mois terminé
function tauxA(serie, t) {
  let k = -1
  for (let i = 0; i < serie.length; i++) if (serie[i].t + 31 * JOUR <= t) k = i
  return k >= 0 ? serie[k] : null
}
// bars : bougies journalières {t, close} triées, week-ends compris ou non
function analyser(paire, bars, tauxBase, tauxCotation, maintenant = Date.now()) {
  const b = bars.filter((x) => Number.isFinite(x.t) && x.close > 0 && ![0, 6].includes(new Date(x.t).getUTCDay())).sort((x, y) => x.t - y.t)
  if (b.length < 260) throw Error(paire + ' : historique journalier trop court (' + b.length + ' bougies)')
  const der = b.at(-1)
  // Momentum 12 mois : clôture actuelle contre la dernière clôture d'il y a ≥ 12 mois
  const limite = der.t - 12 * 30.44 * JOUR
  let k = -1
  for (let i = 0; i < b.length; i++) if (b[i].t <= limite) k = i
  if (k < 0) throw Error(paire + ' : moins de 12 mois d’historique')
  const momentum = der.close / b[k].close - 1
  // Volatilité annualisée des rendements journaliers sur 63 bougies
  const r = []
  for (let i = b.length - 63; i < b.length; i++) r.push(Math.log(b[i].close / b[i - 1].close))
  const m = r.reduce((s, x) => s + x, 0) / r.length
  const vol = Math.sqrt(Math.max(r.reduce((s, x) => s + x * x, 0) / r.length - m * m, 0) * 252)
  const base = paire.slice(0, 3), cotation = paire.slice(4, 7)
  const tb = base === 'XAU' ? { r: 0, t: null } : tauxA(tauxBase || [], maintenant), tq = tauxA(tauxCotation || [], maintenant)
  const ecart = tb && tq ? tb.r - tq.r : null
  const carry = ecart == null || Math.abs(ecart) < SEUIL ? 0 : Math.sign(ecart)
  const sens = carry && carry === Math.sign(momentum) ? carry : 0
  return { paire, dernier: der, momentum, vol, tauxBase: tb, tauxCotation: tq, ecart, carry, sens, raison: ecart == null ? 'taux manquant' : !carry ? 'écart de taux < 0,25 %' : !sens ? 'momentum 12 mois contraire au carry' : '' }
}
// Exposition par paire : capital réparti à parts égales, volatilité visée 10 %
function exposition(capital, nbPaires, vol) {
  const part = capital / nbPaires
  return vol > 0 ? Math.min(part * VOL_CIBLE / vol, part * LEVIER_MAX) : 0
}
// Dernier jour ouvré du mois en cours (révision mensuelle)
function revision(maintenant = Date.now()) {
  const d = new Date(maintenant), fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
  while ([0, 6].includes(fin.getUTCDay())) fin.setUTCDate(fin.getUTCDate() - 1)
  return fin
}
const logique = { PAIRES, SERIES, parseFred, tauxA, analyser, exposition, revision }
if (typeof module !== 'undefined') module.exports = logique
root.CarryLogic = logique
if (typeof document === 'undefined') return

// ---------- Page ----------
const CACHE = 'ea-carry-v1', DUREE_CACHE = 12 * 36e5
const enLigne = () => location.protocol === 'https:' && !['127.0.0.1', 'localhost'].includes(location.hostname)
const local = () => ['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '4173'
const lireCache = () => { try { const c = JSON.parse(sessionStorage.getItem(CACHE) || 'null'); return c && Date.now() - c.at < DUREE_CACHE ? c : null } catch { return null } }
const ecrireCache = (c) => { try { sessionStorage.setItem(CACHE, JSON.stringify(c)) } catch { /* stockage indisponible */ } }
let etat = { capital: 10000, cle: '', resultats: null, erreurs: [], charge: null, busy: false }
try { etat.cle = enLigne() ? localStorage.getItem('edgeAtlasPass') || '' : '' } catch { /* stockage indisponible */ }

async function chargerTaux() {
  const url = (id) => (enLigne() ? '/.netlify/functions/fred?id=' : '/api/fred?id=') + id
  const out = {}
  await Promise.all(Object.entries(SERIES).map(async ([dev, id]) => {
    try { const r = await fetch(url(id), { signal: AbortSignal.timeout(25000) }); if (!r.ok) throw Error('HTTP ' + r.status); out[dev] = parseFred(await r.text()) }
    catch (err) { etat.erreurs.push('Taux ' + dev + ' : ' + err.message) }
  }))
  return out
}
async function chargerCours(paire) {
  const p = new URLSearchParams({ symbol: paire, interval: '1day' })
  const r = await fetch((enLigne() ? '/.netlify/functions/twelve?' : '/api/twelve?') + p, { signal: AbortSignal.timeout(30000), headers: enLigne() ? { 'X-Edge-Pass': etat.cle } : { 'X-Data-Key': etat.cle } })
  if (r.status === 401) throw Error('mot de passe EDGE ATLAS incorrect')
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.status === 'error' || !j.values) throw Error(j.error || j.message || 'HTTP ' + r.status)
  // La dernière bougie peut être encore ouverte : exclue par prudence
  return [...j.values].reverse().slice(0, -1).map((v) => ({ t: Date.parse(v.datetime.slice(0, 10) + 'T00:00:00Z'), close: +v.close }))
}

async function charger() {
  if (etat.busy) return
  if (!enLigne() && !local()) { etat.erreurs = ['Ouvrez le site en ligne ou la version locale (DEMARRER.cmd) : les taux et les cours passent par le serveur.']; dessiner(); return }
  if (!etat.cle.trim()) { etat.erreurs = [enLigne() ? 'Saisissez le mot de passe EDGE ATLAS.' : 'Saisissez votre clé Twelve Data.']; dessiner(); return }
  etat.busy = true; etat.erreurs = []; dessiner('Chargement des taux à 3 mois…')
  const taux = await chargerTaux(), resultats = []
  for (let i = 0; i < PAIRES.length; i++) {
    const paire = PAIRES[i]
    dessiner('Cours ' + paire + ' · ' + (i + 1) + '/' + PAIRES.length + ' (rythme limité par le quota Twelve Data)…')
    try { resultats.push(analyser(paire, await chargerCours(paire), taux[paire.slice(0, 3)], taux[paire.slice(4, 7)])) }
    catch (err) { etat.erreurs.push(paire + ' : ' + err.message); if (/mot de passe/.test(err.message)) break }
    if (i < PAIRES.length - 1) await new Promise((r) => setTimeout(r, 8000)) // 8 requêtes / minute (plan gratuit)
  }
  etat.resultats = resultats; etat.charge = Date.now(); etat.busy = false
  if (resultats.length) ecrireCache({ at: etat.charge, resultats, erreurs: etat.erreurs })
  dessiner()
}

const signe = (s) => (s > 0 ? 'Achat' : s < 0 ? 'Vente' : 'Neutre')
const jour = (t) => (t == null ? '—' : new Date(t).toLocaleDateString('fr-FR', { timeZone: 'UTC' }))
// Taux de plus de 4 mois : publication en retard, dernier taux prolongé
const moisTaux = (x) => (x?.t == null ? '' : ' (' + new Date(x.t).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' }) + (Date.now() - x.t > 120 * JOUR ? ' ⚠ ancien' : '') + ')')
function dessiner(message) {
  const el = $('#carryOut'); if (!el) return
  const res = etat.resultats || []
  const actifs = res.filter((r) => r.sens)
  const tableau = res.length ? '<div class="table-wrap"><table><thead><tr><th>Paire</th><th>Signal</th><th>Écart de taux</th><th>Momentum 12 mois</th><th>Volatilité</th><th>Exposition visée</th><th>Dernière clôture</th></tr></thead><tbody>' +
    res.map((r) => '<tr><td><b>' + esc(r.paire) + '</b></td><td class="' + (r.sens > 0 ? 'positive' : r.sens < 0 ? 'negative' : '') + '"><b>' + signe(r.sens) + '</b>' + (r.raison ? '<br><small>' + esc(r.raison) + '</small>' : '') + '</td><td>' + (r.ecart == null ? '—' : pct(r.ecart)) + '<br><small>' + esc(r.paire.slice(0, 3)) + ' ' + (r.tauxBase ? pct(r.tauxBase.r) + moisTaux(r.tauxBase) : '—') + ' · ' + esc(r.paire.slice(4, 7)) + ' ' + (r.tauxCotation ? pct(r.tauxCotation.r) + moisTaux(r.tauxCotation) : '—') + '</small></td><td>' + pct(r.momentum) + '</td><td>' + pct(r.vol) + '</td><td>' + (r.sens ? money(exposition(etat.capital, PAIRES.length, r.vol)) + '<br><small>' + num(exposition(etat.capital, PAIRES.length, r.vol) / (etat.capital / PAIRES.length), 2) + ' × la part de ' + money(etat.capital / PAIRES.length) + '</small>' : '—') + '</td><td>' + num(r.dernier.close, 5) + '<br><small>' + jour(r.dernier.t) + '</small></td></tr>').join('') + '</tbody></table></div>' : ''
  el.innerHTML = (message ? '<div class="notice">' + esc(message) + '</div>' : '') +
    (etat.erreurs.length ? '<div class="notice warn">' + etat.erreurs.map(esc).join('<br>') + '</div>' : '') +
    (res.length ? metrics([['Positions ouvertes', actifs.length + ' / ' + res.length], ['Achats', String(actifs.filter((r) => r.sens > 0).length), 'positive'], ['Ventes', String(actifs.filter((r) => r.sens < 0).length), 'negative'], ['Prochaine révision', jour(revision().getTime())]]) +
      '<p class="hint">Calculé le ' + esc(new Date(etat.charge).toLocaleString('fr-FR')) + '. Capital réparti à parts égales sur ' + PAIRES.length + ' paires ; exposition = part × 10 % / volatilité 63 jours (plafond 10×). Exposition exprimée dans la devise du capital, sans conversion.</p>' + tableau : '')
  const b = $('#carryLoad'); if (b) { b.disabled = etat.busy; b.textContent = etat.busy ? 'Chargement…' : res.length ? 'Recalculer ↻' : 'Calculer le signal du jour ↗' }
}

function render() {
  const c = lireCache(); if (c && !etat.resultats) { etat.resultats = c.resultats; etat.erreurs = c.erreurs || []; etat.charge = c.at }
  $('#main').innerHTML = title('03 / LABORATOIRE', 'Carry du jour.', 'Le signal du candidat le plus solide de nos tests, calculé avec ses règles exactes. Un outil d’observation : aucun ordre, aucune garantie.') +
    '<section class="section" style="padding-top:0">' + labNav('carry') +
    '<div class="notice warn"><b>Ce que disent les tests (25/10/2026).</b> Sur 12 paires : bénéfice / drawdown de 1,00 à 1,15 sur l’historique, 0,92 sur la période récente des paires de confirmation, environ 1,4 % par an pour 10 % de volatilité. Gains concentrés sur les paires contre le yen ; pertes de −21 % sur USD/CHF et −16 % sur NZD/USD. Le swap fait une grande part du gain : vérifiez celui de votre courtier. Taux OCDE parfois publiés avec retard (EUR, GBP).</div>' +
    '<div class="workspace"><form class="controls" id="carryForm"><h3>Paramètres</h3><label>Capital (unité de compte)<input id="carryCapital" type="number" min="100" step="100" value="' + etat.capital + '"></label><label>' + (enLigne() ? 'Mot de passe EDGE ATLAS' : 'Clé Twelve Data') + '<input id="carryKey" type="password" autocomplete="off" value="' + esc(etat.cle) + '"></label><button class="btn" id="carryLoad" type="submit">Calculer le signal du jour ↗</button><p class="hint">8 taux FRED en parallèle, puis 12 paires au rythme du quota gratuit Twelve Data (≈ 1 min 30). Résultat gardé 12 h dans cet onglet.</p><h3>Règle</h3><p class="hint">Fin de mois : acheter la devise au taux à 3 mois le plus élevé si l’écart dépasse 0,25 % <b>et</b> si la paire a monté sur 12 mois (vente dans le cas inverse) ; sinon neutre. Taille visant 10 % de volatilité annuelle par paire.</p></form><div class="results" id="carryOut"></div></div></section>'
  bindNav()
  $('#carryForm').onsubmit = (e) => { e.preventDefault(); charger() }
  $('#carryCapital').oninput = () => { const v = +$('#carryCapital').value; if (v > 0) { etat.capital = v; if (etat.resultats && !etat.busy) dessiner() } }
  $('#carryKey').oninput = () => { etat.cle = $('#carryKey').value; if (enLigne()) try { localStorage.setItem('edgeAtlasPass', etat.cle) } catch { /* stockage indisponible */ } }
  dessiner()
}
root.CarryPage = { render }
})(typeof globalThis !== 'undefined' ? globalThis : this);
