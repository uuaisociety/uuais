import { CACHE_KEY } from '@/lib/identity-cache';

/** localStorage key holding the last-known Apply campaign state ('open' | 'closed'). */
export const APPLY_STATE_KEY = 'uuais.applyState';

/**
 * Runs in <head> before the first paint, so the server HTML is painted in the
 * visitor's theme instead of fading into it after hydration, and the header is
 * laid out from the last-known identity and Apply state instead of jumping when
 * they resolve. The header clears the data attributes once React has the real
 * values (see Header.tsx and the `html[data-*]` rules in globals.css).
 */
export const PRE_PAINT_SCRIPT = `(function(){var d=document.documentElement;function g(k){try{return localStorage.getItem(k)}catch(e){return null}}var t=g('theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.classList.add(t);try{var i=JSON.parse(g('${CACHE_KEY}')||'null');if(i)d.setAttribute('data-auth',i.isAdmin?'admin':'member')}catch(e){}if(g('${APPLY_STATE_KEY}')==='open')d.setAttribute('data-apply','open')})()`;
