/**
 * Photo Gallery & Lightbox for Abu & Sachin
 * Features:
 * - Curated couple photos in polaroid frames
 * - Fullscreen romantic lightbox viewer with captions
 */

class WeddingGallery {
  constructor() {
    this.lightbox = document.getElementById('gallery-lightbox');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.lightboxCaption = document.getElementById('lightbox-caption');
    this.closeBtn = document.getElementById('lightbox-close-btn');

    this.init();
  }

  init() {
    // Bind click events on gallery photos (the film card below them is a link)
    document.querySelectorAll('.gallery-grid .gallery-card').forEach(card => {
      card.addEventListener('click', () => {
        const img = card.querySelector('img');
        const caption = card.querySelector('.gallery-card-caption');
        if (img) {
          this.openLightbox(img.src, caption ? caption.textContent : 'Abu & Sachin');
        }
      });
    });

    // Close lightbox
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeLightbox());
    }
    if (this.lightbox) {
      this.lightbox.addEventListener('click', (e) => {
        if (e.target === this.lightbox) this.closeLightbox();
      });
    }

    // Keyboard escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.lightbox && this.lightbox.classList.contains('active')) {
        this.closeLightbox();
      }
    });
  }

  openLightbox(src, caption) {
    if (!this.lightbox || !this.lightboxImg) return;
    this.lightboxImg.src = src;
    if (this.lightboxCaption) {
      this.lightboxCaption.textContent = caption;
    }
    this.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    if (!this.lightbox) return;
    this.lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.weddingGallery = new WeddingGallery();
});
