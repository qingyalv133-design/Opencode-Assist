import{H as e,I as t,J as n,L as r,O as i,P as a,R as o,T as s,X as c,Y as l,_ as u,b as d,et as f,f as p,h as m,l as h,n as ee,o as g,p as _,q as v,r as te,rt as ne,t as y,u as b,x,y as re,z as S}from"./store-CKe_GNKE.js";import{r as C}from"./LP6E37CW-BWkZAKHJ.js";import{r as w}from"./i18n-BaX-OS__.js";/* empty css               */var T=d(`<div><div class=sonner-spinner>`),ie=d(`<div class=sonner-loading-bar>`),E=d(`<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 20 20"fill=currentColor height=20 width=20><path fill-rule=evenodd d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"clip-rule=evenodd>`),D=d(`<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor height=20 width=20><path fill-rule=evenodd d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"clip-rule=evenodd>`),O=d(`<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 20 20"fill=currentColor height=20 width=20><path fill-rule=evenodd d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"clip-rule=evenodd>`),k=d(`<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 20 20"fill=currentColor height=20 width=20><path fill-rule=evenodd d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"clip-rule=evenodd>`),A=d(`<svg xmlns=http://www.w3.org/2000/svg width=12 height=12 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=1.5 stroke-linecap=round stroke-linejoin=round><line x1=18 y1=6 x2=6 y2=18></line><line x1=6 y1=6 x2=18 y2=18>`),j=d(`<div>`),M=d(`<button data-close-button>`),N=d(`<div data-icon>`),ae=d(`<div data-description>`),P=d(`<li tabindex=0 data-sonner-toast><div data-content><div data-title>`),oe=d(`<button data-button data-cancel>`),se=d(`<button data-button data-action>`),ce=d(`<section tabindex=-1 aria-live=polite aria-relevant="additions text"aria-atomic=false data-react-aria-top-layer>`),le=d(`<ol tabindex=-1 data-sonner-toaster style=--width:356px>`);function F(e,{insertAt:t}={}){if(!e||typeof document>`u`)return;let n=document.head||document.getElementsByTagName(`head`)[0],r=document.createElement(`style`);r.type=`text/css`,t===`top`&&n.firstChild?n.insertBefore(r,n.firstChild):n.appendChild(r),r.styleSheet?r.styleSheet.cssText=e:r.appendChild(document.createTextNode(e))}F(`html[dir=ltr],
[data-sonner-toaster][dir=ltr] {
  --toast-icon-margin-start: -3px;
  --toast-icon-margin-end: 4px;
  --toast-svg-margin-start: -1px;
  --toast-svg-margin-end: 0px;
  --toast-button-margin-start: auto;
  --toast-button-margin-end: 0;
  --toast-close-button-start: 0;
  --toast-close-button-end: unset;
  --toast-close-button-transform: translate(-35%, -35%);
}
html[dir=rtl],
[data-sonner-toaster][dir=rtl] {
  --toast-icon-margin-start: 4px;
  --toast-icon-margin-end: -3px;
  --toast-svg-margin-start: 0px;
  --toast-svg-margin-end: -1px;
  --toast-button-margin-start: 0;
  --toast-button-margin-end: auto;
  --toast-close-button-start: unset;
  --toast-close-button-end: 0;
  --toast-close-button-transform: translate(35%, -35%);
}
[data-sonner-toaster] {
  position: fixed;
  width: var(--width);
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    Segoe UI,
    Roboto,
    Helvetica Neue,
    Arial,
    Noto Sans,
    sans-serif,
    Apple Color Emoji,
    Segoe UI Emoji,
    Segoe UI Symbol,
    Noto Color Emoji;
  --gray1: hsl(0, 0%, 99%);
  --gray2: hsl(0, 0%, 97.3%);
  --gray3: hsl(0, 0%, 95.1%);
  --gray4: hsl(0, 0%, 93%);
  --gray5: hsl(0, 0%, 90.9%);
  --gray6: hsl(0, 0%, 88.7%);
  --gray7: hsl(0, 0%, 85.8%);
  --gray8: hsl(0, 0%, 78%);
  --gray9: hsl(0, 0%, 56.1%);
  --gray10: hsl(0, 0%, 52.3%);
  --gray11: hsl(0, 0%, 43.5%);
  --gray12: hsl(0, 0%, 9%);
  --border-radius: 8px;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  list-style: none;
  outline: none;
  z-index: 999999999;
  transition: transform 400ms ease;
}
@media (hover: none) and (pointer: coarse) {
  [data-sonner-toaster][data-lifted=true] {
    transform: none;
  }
}
[data-sonner-toaster][data-x-position=right] {
  right: var(--offset-right);
}
[data-sonner-toaster][data-x-position=left] {
  left: var(--offset-left);
}
[data-sonner-toaster][data-x-position=center] {
  left: 50%;
  transform: translateX(-50%);
}
[data-sonner-toaster][data-y-position=top] {
  top: var(--offset-top);
}
[data-sonner-toaster][data-y-position=bottom] {
  bottom: var(--offset-bottom);
}
[data-sonner-toast] {
  --y: translateY(100%);
  --lift-amount: calc(var(--lift) * var(--gap));
  z-index: var(--z-index);
  position: absolute;
  opacity: 0;
  transform: var(--y);
  touch-action: none;
  transition:
    transform 400ms,
    opacity 400ms,
    height 400ms,
    box-shadow 200ms;
  box-sizing: border-box;
  outline: none;
  overflow-wrap: anywhere;
}
[data-sonner-toast][data-styled=true] {
  padding: 16px;
  background: var(--normal-bg);
  border: 1px solid var(--normal-border);
  color: var(--normal-text);
  border-radius: var(--border-radius);
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  width: var(--width);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}
[data-sonner-toast]:focus-visible {
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(0, 0, 0, 0.2);
}
[data-sonner-toast][data-y-position=top] {
  top: 0;
  --y: translateY(-100%);
  --lift: 1;
  --lift-amount: calc(1 * var(--gap));
}
[data-sonner-toast][data-y-position=bottom] {
  bottom: 0;
  --y: translateY(100%);
  --lift: -1;
  --lift-amount: calc(var(--lift) * var(--gap));
}
[data-sonner-toast][data-styled=true] [data-description] {
  font-weight: 400;
  line-height: 1.4;
  color: #3f3f3f;
}
[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description] {
  color: inherit;
}
[data-sonner-toaster][data-sonner-theme=dark] [data-description] {
  color: hsl(0, 0%, 91%);
}
[data-sonner-toast][data-styled=true] [data-title] {
  font-weight: 500;
  line-height: 1.5;
  color: inherit;
}
[data-sonner-toast][data-styled=true] [data-icon] {
  display: flex;
  height: 16px;
  width: 16px;
  position: relative;
  justify-content: flex-start;
  align-items: center;
  flex-shrink: 0;
  margin-left: var(--toast-icon-margin-start);
  margin-right: var(--toast-icon-margin-end);
}
[data-sonner-toast][data-promise=true] [data-icon] > svg {
  opacity: 0;
  transform: scale(0.8);
  transform-origin: center;
  animation: sonner-fade-in 300ms ease forwards;
}
[data-sonner-toast][data-styled=true] [data-icon] > * {
  flex-shrink: 0;
}
[data-sonner-toast][data-styled=true] [data-icon] svg {
  margin-left: var(--toast-svg-margin-start);
  margin-right: var(--toast-svg-margin-end);
}
[data-sonner-toast][data-styled=true] [data-content] {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
[data-sonner-toast][data-styled=true] [data-button] {
  border-radius: 4px;
  padding-left: 8px;
  padding-right: 8px;
  height: 24px;
  font-size: 12px;
  color: var(--normal-bg);
  background: var(--normal-text);
  margin-left: var(--toast-button-margin-start);
  margin-right: var(--toast-button-margin-end);
  border: none;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: opacity 400ms, box-shadow 200ms;
}
[data-sonner-toast][data-styled=true] [data-button]:focus-visible {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4);
}
[data-sonner-toast][data-styled=true] [data-button]:first-of-type {
  margin-left: var(--toast-button-margin-start);
  margin-right: var(--toast-button-margin-end);
}
[data-sonner-toast][data-styled=true] [data-cancel] {
  color: var(--normal-text);
  background: rgba(0, 0, 0, 0.08);
}
[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel] {
  background: rgba(255, 255, 255, 0.3);
}
[data-sonner-toast][data-styled=true] [data-close-button] {
  position: absolute;
  left: var(--toast-close-button-start);
  right: var(--toast-close-button-end);
  top: 0;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  color: var(--normal-text);
  background: var(--normal-bg);
  border: 1px solid var(--normal-border);
  transform: var(--toast-close-button-transform);
  border-radius: 50%;
  cursor: pointer;
  z-index: 1;
  transition:
    opacity 100ms,
    background 200ms,
    border-color 200ms;
}
[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible {
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(0, 0, 0, 0.2);
}
[data-sonner-toast][data-styled=true] [data-disabled=true] {
  cursor: not-allowed;
}
[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover {
  background: var(--gray2);
  border-color: var(--gray5);
}
[data-sonner-toast][data-swiping=true]::before {
  content: "";
  position: absolute;
  left: -100%;
  right: -100%;
  height: 100%;
  z-index: -1;
}
[data-sonner-toast][data-y-position=top][data-swiping=true]::before {
  bottom: 50%;
  transform: scaleY(3) translateY(50%);
}
[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before {
  top: 50%;
  transform: scaleY(3) translateY(-50%);
}
[data-sonner-toast][data-swiping=false][data-removed=true]::before {
  content: "";
  position: absolute;
  inset: 0;
  transform: scaleY(2);
}
[data-sonner-toast][data-expanded=true]::after {
  content: "";
  position: absolute;
  left: 0;
  height: calc(var(--gap) + 1px);
  bottom: 100%;
  width: 100%;
}
[data-sonner-toast][data-mounted=true] {
  --y: translateY(0);
  opacity: 1;
}
[data-sonner-toast][data-expanded=false][data-front=false] {
  --scale: var(--toasts-before) * 0.05 + 1;
  --y: translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));
  height: var(--front-toast-height);
}
[data-sonner-toast] > * {
  transition: opacity 400ms;
}
[data-sonner-toast][data-x-position=right] {
  right: 0;
}
[data-sonner-toast][data-x-position=left] {
  left: 0;
}
[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true] > * {
  opacity: 0;
}
[data-sonner-toast][data-visible=false] {
  opacity: 0;
  pointer-events: none;
}
[data-sonner-toast][data-mounted=true][data-expanded=true] {
  --y: translateY(calc(var(--lift) * var(--offset)));
  height: var(--initial-height);
}
[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false] {
  --y: translateY(calc(var(--lift) * -100%));
  opacity: 0;
}
[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true] {
  --y: translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));
  opacity: 0;
}
[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false] {
  --y: translateY(40%);
  opacity: 0;
  transition: transform 500ms, opacity 200ms;
}
[data-sonner-toast][data-removed=true][data-front=false]::before {
  height: calc(var(--initial-height) + 20%);
}
[data-sonner-toast][data-swiping=true] {
  transform: var(--y) translateY(var(--swipe-amount-y, 0px)) translateX(var(--swipe-amount-x, 0px));
  transition: none;
}
[data-sonner-toast][data-swiped=true] {
  -webkit-user-select: none;
  user-select: none;
}
[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],
[data-sonner-toast][data-swipe-out=true][data-y-position=top] {
  animation-duration: 200ms;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}
[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left] {
  animation-name: swipe-out-left;
}
[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right] {
  animation-name: swipe-out-right;
}
[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up] {
  animation-name: swipe-out-up;
}
[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down] {
  animation-name: swipe-out-down;
}
@keyframes swipe-out-left {
  from {
    transform: var(--y) translateX(var(--swipe-amount-x));
    opacity: 1;
  }
  to {
    transform: var(--y) translateX(calc(var(--swipe-amount-x) - 100%));
    opacity: 0;
  }
}
@keyframes swipe-out-right {
  from {
    transform: var(--y) translateX(var(--swipe-amount-x));
    opacity: 1;
  }
  to {
    transform: var(--y) translateX(calc(var(--swipe-amount-x) + 100%));
    opacity: 0;
  }
}
@keyframes swipe-out-up {
  from {
    transform: var(--y) translateY(var(--swipe-amount-y));
    opacity: 1;
  }
  to {
    transform: var(--y) translateY(calc(var(--swipe-amount-y) - 100%));
    opacity: 0;
  }
}
@keyframes swipe-out-down {
  from {
    transform: var(--y) translateY(var(--swipe-amount-y));
    opacity: 1;
  }
  to {
    transform: var(--y) translateY(calc(var(--swipe-amount-y) + 100%));
    opacity: 0;
  }
}
@media (max-width: 600px) {
  [data-sonner-toaster] {
    position: fixed;
    right: var(--mobile-offset-right);
    left: var(--mobile-offset-left);
    width: 100%;
  }
  [data-sonner-toaster][dir=rtl] {
    left: calc(var(--mobile-offset-left) * -1);
  }
  [data-sonner-toaster] [data-sonner-toast] {
    left: 0;
    right: 0;
    width: calc(100% - var(--mobile-offset-left) * 2);
  }
  [data-sonner-toaster][data-x-position=left] {
    left: var(--mobile-offset-left);
  }
  [data-sonner-toaster][data-y-position=bottom] {
    bottom: var(--mobile-offset-bottom);
  }
  [data-sonner-toaster][data-y-position=top] {
    top: var(--mobile-offset-top);
  }
  [data-sonner-toaster][data-x-position=center] {
    left: var(--mobile-offset-left);
    right: var(--mobile-offset-right);
    transform: none;
  }
}
[data-sonner-toaster][data-sonner-theme=light] {
  --normal-bg: #fff;
  --normal-border: var(--gray4);
  --normal-text: var(--gray12);
  --success-bg: hsl(143, 85%, 96%);
  --success-border: hsl(145, 92%, 87%);
  --success-text: hsl(140, 100%, 27%);
  --info-bg: hsl(208, 100%, 97%);
  --info-border: hsl(221, 91%, 93%);
  --info-text: hsl(210, 92%, 45%);
  --warning-bg: hsl(49, 100%, 97%);
  --warning-border: hsl(49, 91%, 84%);
  --warning-text: hsl(31, 92%, 45%);
  --error-bg: hsl(359, 100%, 97%);
  --error-border: hsl(359, 100%, 94%);
  --error-text: hsl(360, 100%, 45%);
}
[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true] {
  --normal-bg: #000;
  --normal-border: hsl(0, 0%, 20%);
  --normal-text: var(--gray1);
}
[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true] {
  --normal-bg: #fff;
  --normal-border: var(--gray3);
  --normal-text: var(--gray12);
}
[data-sonner-toaster][data-sonner-theme=dark] {
  --normal-bg: #000;
  --normal-bg-hover: hsl(0, 0%, 12%);
  --normal-border: hsl(0, 0%, 20%);
  --normal-border-hover: hsl(0, 0%, 25%);
  --normal-text: var(--gray1);
  --success-bg: hsl(150, 100%, 6%);
  --success-border: hsl(147, 100%, 12%);
  --success-text: hsl(150, 86%, 65%);
  --info-bg: hsl(215, 100%, 6%);
  --info-border: hsl(223, 43%, 17%);
  --info-text: hsl(216, 87%, 65%);
  --warning-bg: hsl(64, 100%, 6%);
  --warning-border: hsl(60, 100%, 9%);
  --warning-text: hsl(46, 87%, 65%);
  --error-bg: hsl(358, 76%, 10%);
  --error-border: hsl(357, 89%, 16%);
  --error-text: hsl(358, 100%, 81%);
}
[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button] {
  background: var(--normal-bg);
  border-color: var(--normal-border);
  color: var(--normal-text);
}
[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover {
  background: var(--normal-bg-hover);
  border-color: var(--normal-border-hover);
}
[data-rich-colors=true][data-sonner-toast][data-type=success] {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: var(--success-text);
}
[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button] {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: var(--success-text);
}
[data-rich-colors=true][data-sonner-toast][data-type=info] {
  background: var(--info-bg);
  border-color: var(--info-border);
  color: var(--info-text);
}
[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button] {
  background: var(--info-bg);
  border-color: var(--info-border);
  color: var(--info-text);
}
[data-rich-colors=true][data-sonner-toast][data-type=warning] {
  background: var(--warning-bg);
  border-color: var(--warning-border);
  color: var(--warning-text);
}
[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button] {
  background: var(--warning-bg);
  border-color: var(--warning-border);
  color: var(--warning-text);
}
[data-rich-colors=true][data-sonner-toast][data-type=error] {
  background: var(--error-bg);
  border-color: var(--error-border);
  color: var(--error-text);
}
[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button] {
  background: var(--error-bg);
  border-color: var(--error-border);
  color: var(--error-text);
}
.sonner-loading-wrapper {
  --size: 16px;
  height: var(--size);
  width: var(--size);
  position: absolute;
  inset: 0;
  z-index: 10;
}
.sonner-loading-wrapper[data-visible=false] {
  transform-origin: center;
  animation: sonner-fade-out 0.2s ease forwards;
}
.sonner-spinner {
  position: relative;
  top: 50%;
  left: 50%;
  height: var(--size);
  width: var(--size);
}
.sonner-loading-bar {
  animation: sonner-spin 1.2s linear infinite;
  background: var(--gray11);
  border-radius: 6px;
  height: 8%;
  left: -10%;
  position: absolute;
  top: -3.9%;
  width: 24%;
}
.sonner-loading-bar:nth-child(1) {
  animation-delay: -1.2s;
  transform: rotate(0.0001deg) translate(146%);
}
.sonner-loading-bar:nth-child(2) {
  animation-delay: -1.1s;
  transform: rotate(30deg) translate(146%);
}
.sonner-loading-bar:nth-child(3) {
  animation-delay: -1s;
  transform: rotate(60deg) translate(146%);
}
.sonner-loading-bar:nth-child(4) {
  animation-delay: -0.9s;
  transform: rotate(90deg) translate(146%);
}
.sonner-loading-bar:nth-child(5) {
  animation-delay: -0.8s;
  transform: rotate(120deg) translate(146%);
}
.sonner-loading-bar:nth-child(6) {
  animation-delay: -0.7s;
  transform: rotate(150deg) translate(146%);
}
.sonner-loading-bar:nth-child(7) {
  animation-delay: -0.6s;
  transform: rotate(180deg) translate(146%);
}
.sonner-loading-bar:nth-child(8) {
  animation-delay: -0.5s;
  transform: rotate(210deg) translate(146%);
}
.sonner-loading-bar:nth-child(9) {
  animation-delay: -0.4s;
  transform: rotate(240deg) translate(146%);
}
.sonner-loading-bar:nth-child(10) {
  animation-delay: -0.3s;
  transform: rotate(270deg) translate(146%);
}
.sonner-loading-bar:nth-child(11) {
  animation-delay: -0.2s;
  transform: rotate(300deg) translate(146%);
}
.sonner-loading-bar:nth-child(12) {
  animation-delay: -0.1s;
  transform: rotate(330deg) translate(146%);
}
@keyframes sonner-fade-in {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes sonner-fade-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}
@keyframes sonner-spin {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.15;
  }
}
@media (prefers-reduced-motion) {
  [data-sonner-toast],
  [data-sonner-toast] > *,
  .sonner-loading-bar {
    transition: none !important;
    animation: none !important;
  }
}
.sonner-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center;
  transition: opacity 200ms, transform 200ms;
}
.sonner-loader[data-visible=false] {
  opacity: 0;
  transform: scale(0.8) translate(-50%, -50%);
}
`);var I=Array(12).fill(0);function ue(e){return(()=>{var t=T(),n=t.firstChild;return p(n,a(s,{each:I,children:(e,t)=>(()=>{var e=ie();return S(()=>m(e,`data-index`,t())),e})()})),S(n=>{var r=[`sonner-loading-wrapper`,e.class??e.className].filter(Boolean).join(` `),i=e.visible;return r!==n.e&&h(t,n.e=r),i!==n.t&&m(t,`data-visible`,n.t=i),n},{e:void 0,t:void 0}),t})()}function L(){return E()}function de(){return D()}function fe(){return O()}function R(){return k()}function pe(e){switch(e){case`success`:return a(L,{});case`info`:return a(fe,{});case`warning`:return a(de,{});case`error`:return a(R,{});default:return null}}function me(){return A()}function he(){let[t,n]=e(typeof document<`u`&&document.hidden);return c(()=>{let e=()=>{n(document.hidden)};document.addEventListener(`visibilitychange`,e),l(()=>{document.removeEventListener(`visibilitychange`,e)})}),t}var z=1,B=class{subscribers;toasts;dismissedToasts;constructor(){this.subscribers=[],this.toasts=[],this.dismissedToasts=new Set}subscribe=e=>(this.subscribers.push(e),()=>{let t=this.subscribers.indexOf(e);this.subscribers.splice(t,1)});publish=e=>{this.subscribers.forEach(t=>t(e))};addToast=e=>{this.publish(e),this.toasts=[...this.toasts,e]};create=e=>{let{message:t,...n}=e,r=typeof e.id==`string`&&e.id.length>0,i=typeof e.id==`number`||r?e.id:z++,a=this.toasts.find(e=>e.id===i),o=e.dismissible===void 0||e.dismissible;return this.dismissedToasts.has(i)&&this.dismissedToasts.delete(i),a?this.toasts=this.toasts.map(n=>n.id===i?(this.publish({...n,...e,id:i,title:t,dismissible:o}),{...n,...e,id:i,dismissible:o,title:t}):n):this.addToast({title:t,...n,dismissible:o,id:i}),i};dismiss=e=>(e?(this.dismissedToasts.add(e),requestAnimationFrame(()=>{this.subscribers.forEach(t=>t({id:e,dismiss:!0}))})):this.toasts.forEach(e=>{this.dismissedToasts.add(e.id),this.subscribers.forEach(t=>t({id:e.id,dismiss:!0}))}),e);message=(e,t)=>this.create({...t,message:e});error=(e,t)=>this.create({...t,message:e,type:`error`});success=(e,t)=>this.create({...t,type:`success`,message:e});info=(e,t)=>this.create({...t,type:`info`,message:e});warning=(e,t)=>this.create({...t,type:`warning`,message:e});loading=(e,t)=>this.create({...t,type:`loading`,message:e});promise=(e,t)=>{if(!t)return;let n;t.loading!==void 0&&(n=this.create({...t,promise:e,type:`loading`,message:t.loading,description:typeof t.description==`function`?void 0:t.description}));let r=Promise.resolve(typeof e==`function`?e():e),i=n!==void 0,a,o=r.then(async e=>{if(a=[`resolve`,e],_e(e))i=!1,this.create({id:n,type:`default`,message:e});else if(ge(e)&&!e.ok){i=!1;let r=typeof t.error==`function`?await t.error(`HTTP error! status: ${e.status}`):t.error,a=typeof t.description==`function`?await t.description(`HTTP error! status: ${e.status}`):t.description,o=V(r)?r:{message:r};this.create({id:n,type:`error`,description:a,...o})}else if(e instanceof Error){i=!1;let r=typeof t.error==`function`?await t.error(e):t.error,a=typeof t.description==`function`?await t.description(e):t.description,o=V(r)?r:{message:r};this.create({id:n,type:`error`,description:a,...o})}else if(t.success!==void 0){i=!1;let r=typeof t.success==`function`?await t.success(e):t.success,a=typeof t.description==`function`?await t.description(e):t.description,o=V(r)?r:{message:r};this.create({id:n,type:`success`,description:a,...o})}}).catch(async e=>{if(a=[`reject`,e],t.error!==void 0){i=!1;let r=typeof t.error==`function`?await t.error(e):t.error,a=typeof t.description==`function`?await t.description(e):t.description,o=V(r)?r:{message:r};this.create({id:n,type:`error`,description:a,...o})}}).finally(()=>{i&&(this.dismiss(n),n=void 0),t.finally?.()}),s=()=>new Promise((e,t)=>{o.then(()=>{a[0]===`reject`?t(a[1]):e(a[1])}).catch(t)});return typeof n!=`string`&&typeof n!=`number`?{unwrap:s}:Object.assign(n,{unwrap:s})};custom=(e,t)=>{let n=t?.id||z++;return this.create({jsx:e(n),...t,id:n}),n};getActiveToasts=()=>this.toasts.filter(e=>!this.dismissedToasts.has(e.id))};function ge(e){return e&&typeof e==`object`&&`ok`in e&&typeof e.ok==`boolean`&&`status`in e&&typeof e.status==`number`}function V(e){return typeof e==`object`&&!!e&&`message`in e}function _e(e){return typeof Node<`u`&&e instanceof Node}var H=new B;function U(e,t){let n=t?.id||z++;return H.addToast({title:e,...t,id:n}),n}var W=Object.assign(U,{success:H.success,info:H.info,warning:H.warning,error:H.error,custom:H.custom,message:H.message,promise:H.promise,dismiss:H.dismiss,loading:H.loading},{getHistory:()=>H.toasts,getToasts:()=>H.getActiveToasts()});function ve(e){return typeof e==`object`&&!!e&&`label`in e}var ye=3,be=`24px`,G=`16px`,xe=4e3,Se=14,Ce=45,we=200;function K(...e){return e.filter(Boolean).join(` `)}function q(e){return typeof e==`function`?e():e}function Te(e){let[t,n]=e.split(`-`),r=[];return t&&r.push(t),n&&r.push(n),r}function J(){if(typeof window>`u`||typeof document>`u`)return`ltr`;let e=document.documentElement.getAttribute(`dir`);return e===`auto`||!e?window.getComputedStyle(document.documentElement).direction:e}function Ee(e,t){let n={};return[e,t].forEach((e,t)=>{let r=t===1,i=r?`--mobile-offset`:`--offset`,a=r?G:be,o=e=>{for(let t of[`top`,`right`,`bottom`,`left`])n[`${i}-${t}`]=typeof e==`number`?`${e}px`:e};if(typeof e==`number`||typeof e==`string`){o(e);return}if(typeof e==`object`&&e){for(let t of[`top`,`right`,`bottom`,`left`]){let r=e[t];n[`${i}-${t}`]=r===void 0?a:typeof r==`number`?`${r}px`:r}return}o(a)}),n}function De(e,t){return e??t}function Oe(e,t){return e??t??``}function Y(e,t){return e??t??``}function ke(e){return e===`system`?typeof window<`u`&&window.matchMedia(`(prefers-color-scheme: dark)`).matches?`dark`:`light`:e}function Ae(t){let[s,u]=e(!1),[d,f]=e(!1),[ee,g]=e(!1),[v,te]=e(!1),[ne,y]=e(!1),[b,C]=e(null),[w,T]=e(null),[ie,E]=e(0),[D,O]=e(0),k,A=null,ce=0,le=0,F=xe,[I,L]=e(null),de=()=>t.index===0,fe=()=>t.index+1<=t.visibleToasts,R=()=>t.toast.type,z=()=>t.toast.dismissible!==!1,B=()=>De(t.classNames,t.classes),ge=()=>Y(t.className,t.class),V=()=>Oe(t.descriptionClassName,t.descriptionClass),_e=()=>Y(t.toast.className,t.toast.class),H=()=>Oe(t.toast.descriptionClassName,t.toast.descriptionClass),U=()=>De(t.toast.classNames,t.toast.classes),W=()=>t.toast.closeButton??t.closeButton,ye=()=>t.toast.duration??t.duration??xe,be=()=>t.toast.invert??t.invert,G=()=>R()===`loading`,J=()=>t.swipeDirections??Te(t.position),Ee=o(()=>t.position.split(`-`)[0]),ke=o(()=>t.position.split(`-`)[1]),Ae=o(()=>Math.max(0,t.heights.findIndex(e=>e.toastId===t.toast.id))),je=o(()=>t.heights.reduce((e,t,n)=>n>=Ae()?e:e+t.height,0)),X=o(()=>Ae()*(t.gap??Se)+je()),Me=he();r(()=>{F=ye()});function Z(){f(!0),E(X()),t.setHeights(e=>e.filter(e=>e.toastId!==t.toast.id)),window.setTimeout(()=>{t.removeToast(t.toast)},we)}function Ne(){return t.icons?.loading?(()=>{var e=j();return p(e,()=>t.icons.loading),S(t=>{var n=K(B()?.loader,U()?.loader,`sonner-loader`),r=R()===`loading`;return n!==t.e&&h(e,t.e=n),r!==t.t&&m(e,`data-visible`,t.t=r),t},{e:void 0,t:void 0}),e})():a(ue,{get class(){return K(B()?.loader,U()?.loader)},get visible(){return R()===`loading`}})}let Pe=()=>t.toast.icon??t.icons?.[R()]??pe(R());return c(()=>{if(u(!0),!k)return;let e=k.getBoundingClientRect().height;O(e),t.setHeights(n=>[{toastId:t.toast.id,toasterId:t.toast.toasterId,height:e,position:t.toast.position},...n]),l(()=>{t.setHeights(e=>e.filter(e=>e.toastId!==t.toast.id))})}),r(()=>{if(!s()||!k)return;q(t.toast.title),q(t.toast.description);let e=k.style.height;k.style.height=`auto`;let n=k.getBoundingClientRect().height;k.style.height=e,O(n),t.setHeights(e=>e.find(e=>e.toastId===t.toast.id)?e.map(e=>e.toastId===t.toast.id?{...e,height:n}:e):[{toastId:t.toast.id,toasterId:t.toast.toasterId,height:n,position:t.toast.position},...e])}),r(n(()=>[t.expanded,t.interacting,t.toast,R(),Me(),ye()],([e,n,r,i])=>{if(r.promise&&i===`loading`||r.duration===1/0||i===`loading`)return;let a;e||n||(t.pauseWhenPageIsHidden??!0)&&Me()?(()=>{if(le<ce){let e=new Date().getTime()-ce;F-=e}le=new Date().getTime()})():F!==1/0&&(ce=new Date().getTime(),a=setTimeout(()=>{r.onAutoClose?.(r),Z()},F)),l(()=>{a&&clearTimeout(a)})})),r(n(()=>t.toast.delete,e=>{e&&(Z(),t.toast.onDismiss?.(t.toast))})),(()=>{var e=P(),n=e.firstChild,r=n.firstChild;e.$$pointermove=e=>{if(!I()||!z()||(window.getSelection()?.toString().length??0)>0)return;let t=e.clientY-I().y,n=e.clientX-I().x;!b()&&(Math.abs(n)>1||Math.abs(t)>1)&&C(Math.abs(n)>Math.abs(t)?`x`:`y`);let r={x:0,y:0},i=e=>1/(1.5+Math.abs(e)/20);b()===`y`?(J().includes(`top`)||J().includes(`bottom`))&&(r.y=J().includes(`top`)&&t<0||J().includes(`bottom`)&&t>0?t:t*i(t)):b()===`x`&&(J().includes(`left`)||J().includes(`right`))&&(r.x=J().includes(`left`)&&n<0||J().includes(`right`)&&n>0?n:n*i(n)),(Math.abs(r.x)>0||Math.abs(r.y)>0)&&y(!0),k?.style.setProperty(`--swipe-amount-x`,`${r.x}px`),k?.style.setProperty(`--swipe-amount-y`,`${r.y}px`)},e.$$pointerup=()=>{if(v()||!z())return;L(null);let e=Number(k?.style.getPropertyValue(`--swipe-amount-x`).replace(`px`,``)||0),n=Number(k?.style.getPropertyValue(`--swipe-amount-y`).replace(`px`,``)||0),r=Math.max(1,new Date().getTime()-(A?.getTime()??0)),i=b()===`x`?e:n,a=Math.abs(i)/r;if(Math.abs(i)>=Ce||a>.11){E(X()),t.toast.onDismiss?.(t.toast),b()===`x`?T(e>0?`right`:`left`):T(n>0?`down`:`up`),Z(),te(!0);return}k?.style.setProperty(`--swipe-amount-x`,`0px`),k?.style.setProperty(`--swipe-amount-y`,`0px`),y(!1),g(!1),C(null)},e.$$pointerdown=e=>{e.button!==2&&(G()||!z()||e.target.closest(`button`)||(A=new Date,E(X()),e.currentTarget.setPointerCapture(e.pointerId),g(!0),L({x:e.clientX,y:e.clientY})))},e.addEventListener(`dragend`,()=>{g(!1),C(null),L(null)});var o=k;return typeof o==`function`?x(o,e):k=e,p(e,a(i,{get when(){return _(()=>!!(W()&&!t.toast.jsx))()&&R()!==`loading`},get children(){var e=M();return e.$$click=()=>{G()||!z()||(Z(),t.toast.onDismiss?.(t.toast))},e.$$pointerup=e=>e.stopPropagation(),e.$$pointerdown=e=>e.stopPropagation(),p(e,()=>t.icons?.close??a(me,{})),S(n=>{var r=t.closeButtonAriaLabel??`Close toast`,i=G(),a=K(B()?.closeButton,U()?.closeButton);return r!==n.e&&m(e,`aria-label`,n.e=r),i!==n.t&&m(e,`data-disabled`,n.t=i),a!==n.a&&h(e,n.a=a),n},{e:void 0,t:void 0,a:void 0}),e}}),n),p(e,a(i,{get when(){return _(()=>!!((R()||t.toast.icon||t.toast.promise)&&t.toast.icon!==null))()&&(t.icons?.[R()]!==null||t.toast.icon)},get children(){var e=N();return p(e,(()=>{var e=_(()=>!!(t.toast.promise||t.toast.type===`loading`&&!t.toast.icon));return()=>e()?t.toast.icon||Ne():null})(),null),p(e,(()=>{var e=_(()=>t.toast.type!==`loading`);return()=>e()?Pe():null})(),null),S(()=>h(e,K(B()?.icon,U()?.icon))),e}}),n),p(r,(()=>{var e=_(()=>!!t.toast.jsx);return()=>e()?t.toast.jsx:q(t.toast.title)})()),p(n,a(i,{get when(){return t.toast.description},get children(){var e=ae();return p(e,()=>q(t.toast.description)),S(()=>h(e,K(V(),H(),B()?.description,U()?.description))),e}}),null),p(e,a(i,{get when(){return t.toast.cancel},children:e=>a(i,{get when(){return!ve(e())},get fallback(){return(()=>{var n=oe();return n.$$click=t=>{let n=e();z()&&(n.onClick?.(t),Z())},p(n,()=>e().label),S(e=>{var r=t.toast.cancelButtonStyle??t.cancelButtonStyle,i=K(B()?.cancelButton,U()?.cancelButton);return e.e=re(n,r,e.e),i!==e.t&&h(n,e.t=i),e},{e:void 0,t:void 0}),n})()},get children(){return e()}})}),null),p(e,a(i,{get when(){return t.toast.action},children:e=>a(i,{get when(){return!ve(e())},get fallback(){return(()=>{var n=se();return n.$$click=t=>{e().onClick?.(t),!t.defaultPrevented&&Z()},p(n,()=>e().label),S(e=>{var r=t.toast.actionButtonStyle??t.actionButtonStyle,i=K(B()?.actionButton,U()?.actionButton);return e.e=re(n,r,e.e),i!==e.t&&h(n,e.t=i),e},{e:void 0,t:void 0}),n})()},get children(){return e()}})}),null),S(i=>{var a=K(ge(),_e(),B()?.toast,U()?.toast,B()?.default,B()?.[R()],U()?.[R()]),o=t.toast.richColors??t.defaultRichColors,c=!(t.toast.jsx||t.toast.unstyled||t.unstyled),l=s(),u=!!t.toast.promise,f=ne(),p=d(),g=fe(),_=Ee(),te=ke(),y=t.index,b=de(),x=ee(),S=z(),C=R(),T=be(),E=v(),O=w(),k=!!(t.expanded||t.expandByDefault&&s()),A=t.toast.testId,j={"--index":t.index,"--toasts-before":t.index,"--z-index":t.toasts.length-t.index,"--offset":`${d()?ie():X()}px`,"--initial-height":t.expandByDefault?`auto`:`${D()}px`,...t.style,...t.toast.style},M=K(B()?.content,U()?.content),N=K(B()?.title,U()?.title);return a!==i.e&&h(e,i.e=a),o!==i.t&&m(e,`data-rich-colors`,i.t=o),c!==i.a&&m(e,`data-styled`,i.a=c),l!==i.o&&m(e,`data-mounted`,i.o=l),u!==i.i&&m(e,`data-promise`,i.i=u),f!==i.n&&m(e,`data-swiped`,i.n=f),p!==i.s&&m(e,`data-removed`,i.s=p),g!==i.h&&m(e,`data-visible`,i.h=g),_!==i.r&&m(e,`data-y-position`,i.r=_),te!==i.d&&m(e,`data-x-position`,i.d=te),y!==i.l&&m(e,`data-index`,i.l=y),b!==i.u&&m(e,`data-front`,i.u=b),x!==i.c&&m(e,`data-swiping`,i.c=x),S!==i.w&&m(e,`data-dismissible`,i.w=S),C!==i.m&&m(e,`data-type`,i.m=C),T!==i.f&&m(e,`data-invert`,i.f=T),E!==i.y&&m(e,`data-swipe-out`,i.y=E),O!==i.g&&m(e,`data-swipe-direction`,i.g=O),k!==i.p&&m(e,`data-expanded`,i.p=k),A!==i.b&&m(e,`data-testid`,i.b=A),i.T=re(e,j,i.T),M!==i.A&&h(n,i.A=M),N!==i.O&&h(r,i.O=N),i},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0,T:void 0,A:void 0,O:void 0}),e})()}function je(t){let n=v({position:`bottom-right`,hotkey:[`altKey`,`KeyT`],theme:`light`,gap:Se,visibleToasts:ye,dir:J(),containerAriaLabel:`Notifications`},t),u=ke(n.theme),[d,f]=y({toasts:[]}),g=o(()=>{let e=d.toasts;return n.id?e.filter(e=>e.toasterId===n.id):e.filter(e=>!e.toasterId)}),_=o(()=>Array.from(new Set([n.position,...g().filter(e=>e.position).map(e=>e.position)]))),[ne,b]=e([]),[C,w]=e(!1),[T,ie]=e(!1),[E,D]=e(u),[O,k]=e(null),[A,j]=e(!1),M,N=()=>n.hotkey.join(`+`).replace(/Key/g,``).replace(/Digit/g,``),ae=()=>Y(n.className,n.class),P=()=>n.toastOptions,oe=()=>De(P()?.classNames,P()?.classes),se=()=>Oe(P()?.descriptionClassName,P()?.descriptionClass),F=()=>Y(P()?.className,P()?.class),I=e=>{f(`toasts`,t=>(t.find(t=>t.id===e.id)?.delete||H.dismiss(e.id),t.filter(({id:t})=>t!==e.id)))};return c(()=>{let e=H.subscribe(e=>{if(e.dismiss){requestAnimationFrame(()=>{f(`toasts`,ee(t=>{t.forEach(t=>{t.id===e.id&&(t.delete=!0)})}))});return}let t=e,n=d.toasts.findIndex(e=>e.id===t.id);if(n!==-1){f(`toasts`,n,te(t));return}f(`toasts`,ee(e=>{e.unshift(t)}))});l(e)}),r(()=>{let e=n.theme;if(e!==`system`){D(e);return}if(typeof window>`u`)return;let t=window.matchMedia(`(prefers-color-scheme: dark)`),r=({matches:e})=>{D(e?`dark`:`light`)};r(t);try{t.addEventListener(`change`,r),l(()=>t.removeEventListener(`change`,r))}catch{t.addListener(r),l(()=>t.removeListener(r))}}),r(()=>{g().length<=1&&w(!1)}),c(()=>{let e=e=>{n.hotkey.length>0&&n.hotkey.every(t=>e[t]||e.code===t)&&(w(!0),M?.focus()),e.code===`Escape`&&(document.activeElement===M||M?.contains(document.activeElement))&&w(!1)};document.addEventListener(`keydown`,e),l(()=>document.removeEventListener(`keydown`,e))}),l(()=>{O()&&(O()?.focus({preventScroll:!0}),k(null),j(!1))}),(()=>{var e=ce();return p(e,a(s,{get each(){return _()},children:(e,t)=>{let[r,c]=e.split(`-`),l=o(()=>g().filter(n=>!n.position&&t()===0||n.position===e)),u=o(()=>ne().filter(n=>t()===0&&!n.position||n.position===e));return a(i,{get when(){return g().length>0},get children(){var t=le();t.$$pointerup=()=>ie(!1),t.$$pointerdown=e=>{e.target instanceof HTMLElement&&e.target.dataset.dismissible===`false`||ie(!0)},t.addEventListener(`dragend`,()=>w(!1)),t.addEventListener(`mouseleave`,()=>{T()||w(!1)}),t.$$mousemove=()=>w(!0),t.addEventListener(`mouseenter`,()=>w(!0)),t.addEventListener(`focus`,e=>{e.target instanceof HTMLElement&&e.target.dataset.dismissible===`false`||A()||(j(!0),k(e.relatedTarget))}),t.addEventListener(`blur`,e=>{A()&&!e.currentTarget.contains(e.relatedTarget)&&(j(!1),O()&&(O()?.focus({preventScroll:!0}),k(null)))});var i=M;return typeof i==`function`?x(i,t):M=t,m(t,`data-y-position`,r),m(t,`data-x-position`,c),p(t,a(s,{get each(){return l()},children:(t,r)=>a(Ae,{get icons(){return n.icons},get index(){return r()},toast:t,get defaultRichColors(){return n.richColors},get duration(){return P()?.duration??n.duration},get class(){return F()},get descriptionClassName(){return se()},get invert(){return!!n.invert},get visibleToasts(){return n.visibleToasts},get closeButton(){return P()?.closeButton??n.closeButton??!1},get interacting(){return T()},position:e,get style(){return P()?.style},get unstyled(){return P()?.unstyled},get classNames(){return oe()},get cancelButtonStyle(){return P()?.cancelButtonStyle},get actionButtonStyle(){return P()?.actionButtonStyle},get closeButtonAriaLabel(){return P()?.closeButtonAriaLabel},removeToast:I,get toasts(){return l()},get heights(){return u()},setHeights:b,get expandByDefault(){return!!n.expand},get gap(){return n.gap},get expanded(){return C()},get swipeDirections(){return n.swipeDirections},get pauseWhenPageIsHidden(){return n.pauseWhenPageIsHidden}})})),S(e=>{var r=n.dir===`auto`?J():n.dir,i=ae(),a=E(),o={"--front-toast-height":`${u()[0]?.height??0}px`,"--gap":`${n.gap}px`,...n.style,...Ee(n.offset,n.mobileOffset)};return r!==e.e&&m(t,`dir`,e.e=r),i!==e.t&&h(t,e.t=i),a!==e.a&&m(t,`data-sonner-theme`,e.a=a),e.o=re(t,o,e.o),e},{e:void 0,t:void 0,a:void 0,o:void 0}),t}})}})),S(()=>m(e,`aria-label`,n.customAriaLabel??`${n.containerAriaLabel} ${N()}`)),e})()}b([`pointerdown`,`pointerup`,`pointermove`,`click`,`mousemove`]);var X=2e3;function Me(e){return!e.description||e.description.length<=2e3?e:{...e,description:`${e.description.slice(0,X)}…`}}var Z=d(`<div data-slot=toast-v2-icon>`),Ne=d(`<div data-slot=toast-v2-content>`),Pe=d(`<div data-slot=toast-v2-title>`),Fe=d(`<div data-slot=toast-v2-description>`),Ie=d(`<div data-slot=toast-v2-actions>`),Le=d(`<button type=button data-slot=toast-v2-close-button>`),Re=d(`<svg width=16 height=16 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg aria-hidden=true><path d="M4.25 11.75L11.75 4.25"stroke=currentColor></path><path d="M11.75 11.75L4.25 4.25"stroke=currentColor>`),ze=d(`<button type=button data-component=button-v2 data-size=small>`);function Be(e){let t=w(),[n,r]=f(e,[`class`,`className`,`style`,`toastOptions`,`swipeDirections`]);return c(()=>{let e=()=>{document.querySelectorAll(`.toast-v2-region .toast-v2`).forEach(e=>{let t=e.dataset.visible===`false`;e.inert=t,e.tabIndex=t?-1:0})},t=!1,n=()=>{let n=document.querySelectorAll(`.toast-v2-region`);n.length&&(r.disconnect(),n.forEach(e=>{r.observe(e,{subtree:!0,childList:!0,attributes:!0,attributeFilter:[`data-visible`]})}),t=!0,e())},r=new MutationObserver(()=>{t?e():n()});r.observe(document.body,{subtree:!0,childList:!0}),queueMicrotask(n),l(()=>r.disconnect())}),a(g,{get children(){return a(je,v({get position(){return C(t.locale())?`bottom-left`:`bottom-right`},get offset(){return C(t.locale())?{left:32,bottom:48}:{right:32,bottom:48}},mobileOffset:16,gap:12,duration:5e3,swipeDirections:[`bottom`],get className(){return[`toast-v2-region`,n.className,n.class].filter(Boolean).join(` `)},get style(){return{"--width":`320px`,...n.style}},get toastOptions(){return{...n.toastOptions,unstyled:!0,closeButton:!0,closeButtonAriaLabel:n.toastOptions?.closeButtonAriaLabel??t.t(`ui.common.dismiss`)}}},r))}})}var Ve=t();function He(e){return a(Ve.Provider,{get value(){return e.toastId},get children(){return e.children}})}function Ue(e){return(()=>{var t=Z();return u(t,e,!1,!1),t})()}function We(e){return(()=>{var t=Ne();return u(t,e,!1,!1),t})()}function Ge(e){return(()=>{var t=Pe();return u(t,e,!1,!1),t})()}function Ke(e){return(()=>{var t=Fe();return u(t,e,!1,!1),t})()}function qe(e){return(()=>{var t=Ie();return u(t,e,!1,!1),t})()}function Je(e){let t=w(),n=ne(Ve),[r,i]=f(e,[`children`,`onClick`]);return(()=>{var e=Le();return u(e,v({get"aria-label"(){return t.t(`ui.common.dismiss`)}},i,{onClick:e=>{r.onClick instanceof Function&&r.onClick(e),!e.defaultPrevented&&n!==void 0&&Qe.dismiss(n)}}),!1,!0),p(e,()=>r.children??a(Ye,{})),e})()}function Ye(){return Re()}var Xe=Object.assign(He,{Region:Be,Icon:Ue,Content:We,Title:Ge,Description:Ke,Actions:qe,CloseButton:Je}),Ze=0,Qe={show(e,t){let n=--Ze;return W.custom(t=>e({toastId:Number(t)}),{id:n,className:`toast-v2`,duration:t?.persistent?1/0:t?.duration,unstyled:!0,description:t?.resize?()=>{t.resize?.()}:void 0}),n},dismiss(e){return e===void 0?(Q.clear(),$.clear()):rt($.get(e)),W.dismiss(e)}},Q=new Map,$=new Map;function $e(e){let t=Me(typeof e==`string`?{description:e}:e),n=JSON.stringify({title:t.title,description:t.description,variant:t.variant,duration:t.duration,persistent:t.persistent,actions:t.actions?.map(e=>[e.label,e.variant])}),r=Q.get(n),i=W.getToasts();if(r&&i.at(-1)?.id===r.id)return r.options=t,et(r),nt(r.id),r.id;r&&i.some(e=>e.id===r.id)&&Qe.dismiss(r.id),rt(r);let a={id:--Ze,key:n,options:t};return a.actions=tt(a),Q.set(n,a),$.set(a.id,a),et(a),a.id}function et(e){let t=()=>rt(e);W(e.options.title??``,{id:e.id,description:e.options.description,icon:e.options.icon,action:e.actions,closeButton:!0,duration:e.options.persistent?1/0:e.options.duration,className:`toast-v2 toast-v2--${e.options.variant??`default`}`,testId:`toast-v2-${e.id}`,unstyled:!0,onDismiss:t,onAutoClose:t})}function tt(e){if(e.options.actions?.length)return a(Xe.Actions,{get children(){return e.options.actions.map((t,n)=>(()=>{var r=ze();return r.$$click=()=>{let t=e.options.actions?.[n]?.onClick;t&&t!==`dismiss`&&t(),Qe.dismiss(e.id)},p(r,()=>t.label),S(e=>{var n=t.variant===`secondary`?`ghost`:`neutral`,i=t.variant??`primary`;return n!==e.e&&m(r,`data-variant`,e.e=n),i!==e.t&&m(r,`data-action-variant`,e.t=i),e},{e:void 0,t:void 0}),r})())}})}function nt(e){typeof document>`u`||typeof requestAnimationFrame>`u`||requestAnimationFrame(()=>{let t=document.querySelector(`[data-testid="toast-v2-${e}"]`);!t||window.matchMedia(`(prefers-reduced-motion: reduce)`).matches||t.animate([{scale:1},{scale:1.025},{scale:1}],{duration:160,easing:`ease-out`})})}function rt(e){e&&(Q.get(e.key)===e&&Q.delete(e.key),$.get(e.id)===e&&$.delete(e.id))}b([`click`]);export{$e as n,Qe as r,Xe as t};
//# sourceMappingURL=toast-KsnfL5cH.js.map