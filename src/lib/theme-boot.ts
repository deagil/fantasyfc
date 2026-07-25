import { COLOR_SCHEME_STORAGE_KEY } from "@/lib/color-scheme"
import {
  KICKOFF_THEME_STORAGE_KEY,
  kickoffBackdropColors,
  kickoffBackdropImages,
} from "@/lib/kickoff-theme"

/**
 * Runs before paint when inlined in <head>. Resolves both theme axes from
 * localStorage (plus `prefers-color-scheme` for the `system` setting) and
 * applies them to <html>, so the SSR defaults never flash over a stored
 * preference — including Safari's overscroll letterbox and status bar tint.
 */
export const themeBootScript = `(function(){try{
var root=document.documentElement;
var pref=localStorage.getItem(${JSON.stringify(COLOR_SCHEME_STORAGE_KEY)});
if(pref!=="light"&&pref!=="dark")pref="system";
var scheme=pref==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):pref;
root.classList.toggle("dark",scheme==="dark");
root.style.colorScheme=scheme;
var theme=localStorage.getItem(${JSON.stringify(KICKOFF_THEME_STORAGE_KEY)});
if(theme!=="early-kickoff"&&theme!=="late-kickoff")theme="late-kickoff";
root.dataset.kickoffTheme=theme;
var color=${JSON.stringify(kickoffBackdropColors)}[scheme][theme];
root.style.setProperty("--shell-backdrop-color",color);
root.style.setProperty("--shell-backdrop-image",${JSON.stringify(kickoffBackdropImages)}[scheme][theme]);
var meta=document.querySelector('meta[name="theme-color"]');
if(!meta){meta=document.createElement("meta");meta.setAttribute("name","theme-color");document.head.appendChild(meta);}
meta.setAttribute("content",color);
}catch(e){}})();`
