// Ensure GSAP and ScrollTrigger are loaded
gsap.registerPlugin(ScrollTrigger);

// Animate Hero Section (only if elements exist)
if (document.querySelector('.hero h1')) {
  gsap.from('.hero h1', { opacity: 0, y: -50, duration: 1, ease: 'power2.out' });
}
if (document.querySelector('.hero p')) {
  gsap.from('.hero p', { opacity: 0, y: 20, duration: 1, delay: 0.3, ease: 'power2.out' });
}
if (document.querySelector('.hero .btn')) {
  gsap.from('.hero .btn', { opacity: 0, scale: 0.8, duration: 0.8, delay: 0.6, ease: 'back.out(1.7)' });
}

// Animate Course Cards
if (document.querySelector('.course-card')) {
  gsap.from('.course-card', {
    opacity: 0,
    y: 50,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.course-card',
      start: 'top 80%',
    }
  });
}

// Animate Category Cards
if (document.querySelector('.category-card')) {
  gsap.from('.category-card', {
    opacity: 0,
    x: -50,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.category-card',
      start: 'top 80%',
    }
  });
}

// Animate Feature Cards
if (document.querySelector('.feature-card')) {
  gsap.from('.feature-card', {
    opacity: 0,
    y: 50,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.feature-card',
      start: 'top 80%',
    }
  });
}

// Animate Testimonial Cards
if (document.querySelector('.testimonial-card')) {
  gsap.from('.testimonial-card', {
    opacity: 0,
    y: 50,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.testimonial-card',
      start: 'top 80%',
    }
  });
}