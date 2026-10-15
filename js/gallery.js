/**
 * Photo Gallery & Lightbox for Abu & Sachin
 * Features:
 * - Curated couple photos in vintage polaroid & gold-embossed frames
 * - Empty slots with interactive photo upload (persists via localStorage)
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
    // Bind click events on gallery cards
    document.querySelectorAll('.gallery-card:not(.gallery-empty-slot)').forEach(card => {
      card.addEventListener('click', () => {
        const img = card.querySelector('img');
        const caption = card.querySelector('.gallery-card-caption');
        if (img) {
          this.openLightbox(img.src, caption ? caption.textContent : 'Abu & Sachin');
        }
      });
    });

    // Handle empty slot upload
    document.querySelectorAll('.gallery-upload-input').forEach(input => {
      input.addEventListener('change', (e) => this.handleSlotUpload(e));
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

    // Restore any uploaded user photos from localStorage
    this.restoreUploadedPhotos();
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

  handleSlotUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const slotCard = e.target.closest('.gallery-empty-slot');
    const slotId = slotCard ? slotCard.dataset.slotId : 'slot_' + Date.now();

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      this.populateSlot(slotCard, dataUrl, file.name);

      // Save to localStorage
      try {
        localStorage.setItem('abu_sachin_gallery_' + slotId, dataUrl);
      } catch (err) {
        console.warn('Image might exceed localStorage limit, shown in session:', err);
      }

      if (window.petalShower) {
        window.petalShower.triggerBurst(40, 3000);
      }
    };
    reader.readAsDataURL(file);
  }

  populateSlot(slotCard, src, title) {
    if (!slotCard) return;
    slotCard.classList.remove('gallery-empty-slot');
    slotCard.classList.add('gallery-filled');
    slotCard.innerHTML = `
      <div class="gallery-img-wrap">
        <img src="${src}" alt="Abu & Sachin Celebration Memory" loading="lazy">
        <div class="gallery-overlay">
          <span class="gallery-zoom-icon">🔍</span>
        </div>
      </div>
      <div class="gallery-card-caption">
        <strong>${title.replace(/\.[^/.]+$/, "")}</strong>
        <span>Added with love by family & friends</span>
      </div>
    `;

    slotCard.addEventListener('click', () => {
      this.openLightbox(src, title);
    });
  }

  restoreUploadedPhotos() {
    document.querySelectorAll('.gallery-empty-slot').forEach(slot => {
      const slotId = slot.dataset.slotId;
      if (slotId) {
        const saved = localStorage.getItem('abu_sachin_gallery_' + slotId);
        if (saved) {
          this.populateSlot(slot, saved, 'Celebration Memory');
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.weddingGallery = new WeddingGallery();
});
