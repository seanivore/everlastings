/* ============================================================================
   Lightbox — fullscreen image viewer with keyboard navigation.
   v1.4.3 Track B (B1)
   ----------------------------------------------------------------------------
   Wires:
     - Click any element with [data-lightbox-trigger] to open the lightbox.
     - Source URL: read from data-lightbox-src on the trigger, OR from the
       trigger's <img src> if it contains an <img> child.
     - Caption: data-lightbox-caption (optional).
     - Group: data-lightbox-group (optional, all triggers in same group form
       a navigable set with prev/next arrows).
     - Keyboard: ESC closes, ArrowLeft/ArrowRight navigate within group.
     - This file makes NO API calls. Track C does not need to touch it.
   ============================================================================ */

(function () {
  'use strict';

  const overlay = document.querySelector('[data-lightbox-target]');
  if (!overlay) return;

  const imgEl    = overlay.querySelector('[data-lightbox-image]');
  const closeBtn = overlay.querySelector('[data-lightbox-close]');
  const prevBtn  = overlay.querySelector('[data-lightbox-prev]');
  const nextBtn  = overlay.querySelector('[data-lightbox-next]');

  let currentGroup = [];
  let currentIndex = 0;

  function getSrc(trigger) {
    return trigger.dataset.lightboxSrc
      || trigger.querySelector('img')?.src
      || '';
  }

  function getCaption(trigger) {
    return trigger.dataset.lightboxCaption || '';
  }

  function buildGroup(trigger) {
    const groupName = trigger.dataset.lightboxGroup;
    if (!groupName) return [trigger];
    return Array.from(document.querySelectorAll(
      `[data-lightbox-trigger][data-lightbox-group="${groupName}"]`
    ));
  }

  function show(index) {
    if (index < 0 || index >= currentGroup.length) return;
    currentIndex = index;
    const trigger = currentGroup[index];
    const src = getSrc(trigger);
    const caption = getCaption(trigger);

    if (imgEl) {
      imgEl.src = src;
      imgEl.alt = caption;
    }

    const showNav = currentGroup.length > 1;
    if (prevBtn) prevBtn.style.display = showNav ? '' : 'none';
    if (nextBtn) nextBtn.style.display = showNav ? '' : 'none';
  }

  function open(trigger) {
    currentGroup = buildGroup(trigger);
    currentIndex = currentGroup.indexOf(trigger);
    show(currentIndex);
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    if (imgEl) imgEl.src = '';
  }

  function next() {
    show((currentIndex + 1) % currentGroup.length);
  }

  function prev() {
    show((currentIndex - 1 + currentGroup.length) % currentGroup.length);
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox-trigger]');
    if (trigger) {
      e.preventDefault();
      open(trigger);
    }
  });

  closeBtn?.addEventListener('click', close);
  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  });
})();
