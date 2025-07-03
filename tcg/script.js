const cards = ['1.jpg', '2.jpg', '3.jpg'];
const playerCombat = document.getElementById('player-combat');

cards.forEach((src, i) => {
  const slot = playerCombat.querySelectorAll('.slot')[i];
  const card = document.createElement('div');
  card.className = 'card';
  card.style.width = '100px';
  card.style.height = '140px';
  card.style.backgroundImage = `url(img/${src})`;
  card.style.backgroundSize = 'cover';
  card.setAttribute('draggable', true);
  document.body.appendChild(card);

  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', src);
    setTimeout(() => card.style.display = 'none', 0);
  });

  card.addEventListener('dragend', () => {
    card.style.display = 'block';
  });
});

document.querySelectorAll('.slot').forEach(slot => {
  slot.addEventListener('dragover', e => e.preventDefault());
  slot.addEventListener('drop', e => {
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain');
    if (slot.style.backgroundImage) return;
    slot.style.backgroundImage = `url(img/${src})`;
  });
});
