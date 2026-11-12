// Native browser printing; the complete welcome card is readable without JavaScript.
const printButton=document.getElementById('print-welcome');
if(printButton){printButton.hidden=false;printButton.addEventListener('click',()=>window.print());}
