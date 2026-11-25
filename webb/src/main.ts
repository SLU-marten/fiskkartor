// Typsnitten enligt SLU:s profil, från Fontsource i appen själv (inga anrop till Google).
// Viktfilerna (400.css osv.) har unicode-range per teckenuppsättning, så webbläsaren hämtar bara
// latin, och latin-ext när en text kräver det. Tecknet ≈ (U+2248) finns inte i Roboto Condensed;
// det ritas med reservtypsnittet Arial, och det godtas.
import '@fontsource/roboto-condensed/400.css';
import '@fontsource/roboto-condensed/500.css';
import '@fontsource/merriweather/300.css';
import '@fontsource/merriweather/400.css';
import './stil.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
