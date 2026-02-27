/**
 * VIP25 — Main JavaScript
 * Handles: Navbar, Mobile Menu, Scroll Reveals, Form Validation, Skill Tags
 */

/* ============================================
   NAVBAR: Scroll effect + Active link tracking
   ============================================ */
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  updateActiveLink();
}, { passive: true }); // passive: true — never blocks scroll paint

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    if (navLinks.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });
}

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    const spans = hamburger ? hamburger.querySelectorAll('span') : [];
    spans.forEach(s => s.style.transform = s.style.opacity = '');
  });
});

document.querySelectorAll('a[href^="/"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '/career' || href.startsWith('/api/') || href.startsWith('/admin') || href === '/login') {
      return;
    }
    const targetId = href === '/' ? '/home' : href;
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      history.pushState(null, '', href);
      const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      setTimeout(updateActiveLink, 100);
    }
  });
});

function updateActiveLink() {
  const sections = document.querySelectorAll('section[id], div[id]');
  const links = document.querySelectorAll('.nav-links a');
  let current = '';
  sections.forEach(section => {
    if (section.getBoundingClientRect().top <= 120) current = section.getAttribute('id');
  });
  links.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === current || (current === '/home' && href === '/')) {
      link.classList.add('active');
    }
  });
}


/* ============================================
   PREMIUM SCROLL REVEAL SYSTEM
   ============================================
   Animation types (set via data-animate attribute):

     fade-up       translates 36px up + fades in              (default)
     fade-left     slides 44px from left + fades in
     fade-right    slides 44px from right + fades in
     zoom-in       scales from 0.94 + fades in
     blur-in       fades in while a blur dissolves — no movement
     scale-fade    scales from 1.06 (slight shrink-in) + fades (great for images)
     clip-up       clip-path wipe from bottom up — sharp, editorial feel
     flip-up       subtle 3D perspective tilt + upward slide + fade

   Per-element overrides:
     data-delay     ms before the animation starts  (e.g. data-delay="150")
     data-duration  override the base duration in ms (e.g. data-duration="500")

   Staggered parent shorthand:
     data-animate-children="fade-up"   auto-assigns type + stagger to all direct children
     data-stagger="90"                 ms between children (default 90ms)

   Every animation resets when the element leaves the viewport and replays on re-entry.
   ============================================ */

// ── Global timing constants ───────────────────────────────────────────────────
const ANIM = {
  duration: 520,                               // base ms — snappier than before
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',  // fast-out ease: quick entry, soft landing
  easingSharp: 'cubic-bezier(0.16, 1, 0.3, 1)',  // tighter deceleration for clip / flip types
};

// ── Hidden (pre-animation) state definitions ──────────────────────────────────
// Stored as plain objects — no DOM read needed per reset, zero allocation per call.
const HIDDEN_STATES = {
  'fade-up': { opacity: '0', transform: 'translateY(36px)', filter: '', clipPath: '' },
  'fade-left': { opacity: '0', transform: 'translateX(-44px)', filter: '', clipPath: '' },
  'fade-right': { opacity: '0', transform: 'translateX(44px)', filter: '', clipPath: '' },
  'zoom-in': { opacity: '0', transform: 'scale(0.94)', filter: '', clipPath: '' },
  'blur-in': { opacity: '0', transform: 'translateY(10px)', filter: 'blur(8px)', clipPath: '' },
  'scale-fade': { opacity: '0', transform: 'scale(1.06)', filter: '', clipPath: '' },
  'clip-up': { opacity: '1', transform: '', filter: '', clipPath: 'inset(100% 0 0 0)' },
  'flip-up': { opacity: '0', transform: 'perspective(500px) rotateX(14deg) translateY(28px)', filter: '', clipPath: '' },
};

// Which CSS properties to include in the transition per type
// (avoids transitioning unused props — keeps the transition list minimal)
const TRANSITION_PROPS = {
  'blur-in': 'opacity, transform, filter',
  'clip-up': 'clip-path',
  'default': 'opacity, transform',
};

/**
 * setHiddenState — snap element to its pre-animation position instantly.
 * transition:none prevents any visible "reverse animation" when resetting.
 * All writes happen in one logical block to minimise layout recalculations.
 */
function setHiddenState(el) {
  const type = el.dataset.animate || 'fade-up';
  const state = HIDDEN_STATES[type] || HIDDEN_STATES['fade-up'];

  el.style.transition = 'none';          // instant reset — no reverse tween
  el.style.opacity = state.opacity;
  el.style.transform = state.transform;
  el.style.filter = state.filter;
  el.style.clipPath = state.clipPath;
  el.style.willChange = 'transform, opacity'; // hint GPU layer promotion
}

/**
 * setVisibleState — engage the CSS transition to animate to the resting state.
 * Double-rAF guarantees the browser has committed the hidden paint before
 * we switch to the visible state — preventing the "jump to end" glitch
 * that occurs when elements reset and immediately re-enter the viewport.
 */
function setVisibleState(el) {
  const type = el.dataset.animate || 'fade-up';
  const delay = parseInt(el.dataset.delay || 0, 10);
  const duration = parseInt(el.dataset.duration || ANIM.duration, 10);
  const easing = (type === 'clip-up' || type === 'flip-up') ? ANIM.easingSharp : ANIM.easing;
  const props = TRANSITION_PROPS[type] || TRANSITION_PROPS['default'];

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = `${props} ${duration}ms ${easing} ${delay}ms`;
      el.style.opacity = '1';

      // clip-up only needs clipPath to change; others reset to neutral transform
      if (type === 'clip-up') {
        el.style.clipPath = 'inset(0% 0 0 0)';
      } else {
        el.style.transform = 'translateY(0) translateX(0) scale(1) perspective(500px) rotateX(0deg)';
        el.style.filter = 'blur(0)';
        el.style.clipPath = '';
      }
    });
  });
}


/* ── Single shared IntersectionObserver ──────────────────────────────────────
   One observer handles the entire page — cheaper than multiple instances.

   threshold 0.08 — low on purpose: tall full-width elements on mobile
   would never reach 0.15+ before the fold cuts them off.

   rootMargin '-60px' bottom — fires just before full viewport entry,
   making the animation feel responsive without being premature.
   ─────────────────────────────────────────────────────────────────────────── */
const scrollRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      setVisibleState(entry.target);  // entering — play animation
    } else {
      setHiddenState(entry.target);   // leaving — reset so it replays next time
    }
  });
}, {
  threshold: 0.08,
  rootMargin: '0px 0px -60px 0px',
});


/* ── initScrollReveal ────────────────────────────────────────────────────────
   Maps legacy class names to data-animate equivalents for backwards compat,
   then observes every element that carries a data-animate attribute.
   ─────────────────────────────────────────────────────────────────────────── */
function initScrollReveal() {
  // Backwards compat: convert old class-based reveals to data-animate
  const legacyMap = {
    '.reveal': 'fade-up',
    '.reveal-left': 'fade-left',
    '.reveal-right': 'fade-right',
  };
  Object.entries(legacyMap).forEach(([selector, type]) => {
    document.querySelectorAll(selector).forEach(el => {
      if (!el.dataset.animate) el.dataset.animate = type;
    });
  });

  // Set initial hidden state and start observing
  document.querySelectorAll('[data-animate]').forEach(el => {
    setHiddenState(el);
    scrollRevealObserver.observe(el);
  });
}


/* ── initStaggeredChildren ───────────────────────────────────────────────────
   Parent: data-animate-children="fade-up"  (any valid animation type)
           data-stagger="90"                (optional, ms between children)

   Each direct child is assigned the type and an incrementing delay.
   Children with their own explicit data-animate / data-delay are left untouched.
   ─────────────────────────────────────────────────────────────────────────── */
function initStaggeredChildren() {
  document.querySelectorAll('[data-animate-children]').forEach(parent => {
    const type = parent.dataset.animateChildren;
    const stagger = parseInt(parent.dataset.stagger || 90, 10);

    Array.from(parent.children).forEach((child, i) => {
      if (!child.dataset.animate) child.dataset.animate = type;
      if (!child.dataset.delay) child.dataset.delay = String(i * stagger);
      setHiddenState(child);
      scrollRevealObserver.observe(child);
    });
  });
}

// Run both inits once the DOM is fully parsed
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initStaggeredChildren();
});


/* ============================================
   ANIMATED COUNTER for hero stats
   ============================================ */
function animateCounter(el, target, suffix = '') {
  let start = 0;
  const duration = 1200; // slightly faster counter
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target + suffix;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start) + suffix;
    }
  }, 16);
}

const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
  // Counters only run once — disconnect after first trigger
  const statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      document.querySelectorAll('.stat-number').forEach((el, i) => {
        const targets = [50, 100, 6];
        const suffixes = ['+', '%', ''];
        setTimeout(() => animateCounter(el, targets[i], suffixes[i]), i * 180);
      });
      statsObserver.disconnect();
    }
  }, { threshold: 0.5 });
  statsObserver.observe(statsSection);
}


/* ============================================
   CLIENT SERVICE FORM VALIDATION
   ============================================ */
const clientForm = document.getElementById('clientForm');
if (clientForm) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  clientForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('cf-name');
    const email = document.getElementById('cf-email');
    const phone = document.getElementById('cf-phone');
    const service = document.getElementById('cf-service');
    const message = document.getElementById('cf-message');

    let valid = true;

    // Validate in a data-driven loop — avoids repetitive if/else blocks
    const checks = [
      [!name.value.trim() || name.value.trim().length < 2, 'err-name', name],
      [!email.value.trim() || !emailRegex.test(email.value.trim()), 'err-email', email],
      [!phone.value.trim() || phone.value.trim().length < 7, 'err-phone', phone],
      [!service.value, 'err-service', service],
      [!message.value.trim() || message.value.trim().length < 10, 'err-message', message],
    ];
    checks.forEach(([isInvalid, errId, input]) => {
      if (isInvalid) { showError(errId, input); valid = false; }
      else hideError(errId, input);
    });

    if (valid) {
      // Setup loading state
      const submitBtn = clientForm.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Sending...';
      submitBtn.disabled = true;

      // Prepare data payload
      const payload = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        service: service.value,
        message: message.value.trim()
      };

      // Send to Flask Backend
      fetch('/api/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          clientForm.style.display = 'none';
          document.getElementById('formSuccess').style.display = 'block';
        })
        .catch(error => {
          console.error('Error submitting form:', error);
          alert('There was an error submitting your request. Please try again later.');
        })
        .finally(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        });
    }
  });

  // Live validation — clear error as soon as field has content
  const cfErrMap = {
    'cf-name': 'err-name', 'cf-email': 'err-email', 'cf-phone': 'err-phone',
    'cf-service': 'err-service', 'cf-message': 'err-message',
  };
  Object.entries(cfErrMap).forEach(([id, errId]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { if (el.value.trim()) hideError(errId, el); });
  });
}


/* ============================================
   CAREER FORM VALIDATION
   ============================================ */
const careerForm = document.getElementById('careerForm');
if (careerForm) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  careerForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const f = {
      name: document.getElementById('ca-name'),
      email: document.getElementById('ca-email'),
      phone: document.getElementById('ca-phone'),
      exp: document.getElementById('ca-experience'),
      skills: document.getElementById('ca-skills'),
      portfolio: document.getElementById('ca-portfolio'),
      linkedin: document.getElementById('ca-linkedin'),
      github: document.getElementById('ca-github'),
      project1: document.getElementById('ca-project1'),
      project2: document.getElementById('ca-project2'),
      project3: document.getElementById('ca-project3'),
      message: document.getElementById('ca-message'),
      avail: document.getElementById('ca-availability'),
    };

    let valid = true;
    const checks = [
      [!f.name.value.trim() || f.name.value.trim().length < 2, 'ca-err-name', f.name],
      [!f.email.value.trim() || !emailRegex.test(f.email.value.trim()), 'ca-err-email', f.email],
      [!f.phone.value.trim() || f.phone.value.trim().length < 7, 'ca-err-phone', f.phone],
      [!f.exp.value, 'ca-err-exp', f.exp],
      [!f.skills.value || f.skills.value.split(',').filter(Boolean).length === 0, 'ca-err-skills', null],
      [!f.portfolio.value.trim(), 'ca-err-portfolio', f.portfolio],
      [!f.linkedin.value.trim(), 'ca-err-linkedin', f.linkedin],
      [!f.github.value.trim(), 'ca-err-github', f.github],
      [!f.project1.value.trim(), 'ca-err-project1', f.project1],
      [!f.project2.value.trim(), 'ca-err-project2', f.project2],
      [!f.project3.value.trim(), 'ca-err-project3', f.project3],
      [!f.message.value.trim() || f.message.value.trim().length < 20, 'ca-err-message', f.message],
      [!f.avail.value, 'ca-err-avail', f.avail],
    ];
    checks.forEach(([isInvalid, errId, input]) => {
      if (isInvalid) { showError(errId, input); valid = false; }
      else hideError(errId, input);
    });

    if (valid) {
      // Setup loading state
      const submitBtn = careerForm.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Submitting...';
      submitBtn.disabled = true;

      // Prepare payload
      const payload = {
        fullname: f.name.value.trim(),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        experience: f.exp.value,
        skills: f.skills.value,
        portfolio: f.portfolio.value.trim(),
        linkedin: f.linkedin.value.trim(),
        github: f.github.value.trim(),
        project1: f.project1.value.trim(),
        project2: f.project2.value.trim(),
        project3: f.project3.value.trim(),
        message: f.message.value.trim(),
        availability: f.avail.value
      };

      // Send to Flask Backend
      fetch('/api/career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          careerForm.style.display = 'none';
          document.getElementById('careerFormSuccess').style.display = 'block';
        })
        .catch(error => {
          console.error('Error submitting application:', error);
          alert('There was an error submitting your application. Please try again later.');
        })
        .finally(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        });
    }
  });
}


/* ============================================
   SKILL TAGS (Career Form)
   ============================================ */
const selectedSkills = new Set();

document.querySelectorAll('#skillTags .skill-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const val = tag.dataset.val;
    if (selectedSkills.has(val)) {
      selectedSkills.delete(val);
      tag.classList.remove('active');
    } else {
      selectedSkills.add(val);
      tag.classList.add('active');
    }
    const skillsInput = document.getElementById('ca-skills');
    if (skillsInput) skillsInput.value = Array.from(selectedSkills).join(',');
  });
});


/* ============================================
   HELPER FUNCTIONS
   ============================================ */
function showError(errId, input) {
  const errEl = document.getElementById(errId);
  if (errEl) errEl.style.display = 'block';
  if (input) {
    input.style.borderColor = '#ff5555';
    input.style.boxShadow = '0 0 12px rgba(255,85,85,0.15)';
  }
}

function hideError(errId, input) {
  const errEl = document.getElementById(errId);
  if (errEl) errEl.style.display = 'none';
  if (input) {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }
}


/* ============================================
   CURSOR TRAIL EFFECT (subtle, green dots)
   ============================================ */
document.addEventListener('mousemove', (e) => {
  // Fire ~15% of moves — subtle + avoids excessive GC pressure
  if (Math.random() > 0.85) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:fixed;
      left:${e.clientX}px;top:${e.clientY}px;
      width:4px;height:4px;
      background:#4CAF50;border-radius:50%;
      pointer-events:none;z-index:9999;
      transform:translate(-50%,-50%);
      opacity:0.6;
      transition:opacity 0.7s,transform 0.7s;
    `;
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.opacity = '0';
      dot.style.transform = 'translate(-50%,-50%) scale(3)';
    });
    setTimeout(() => dot.remove(), 700);
  }
});


/* ============================================
   PAGE LOAD
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  updateActiveLink();

  // Scroll to section based on clean URL path
  const path = window.location.pathname;
  if (path !== '/' && path !== '/career' && !path.startsWith('/admin') && !path.startsWith('/login')) {
    const targetId = path;
    const target = document.getElementById(targetId);
    if (target) {
      setTimeout(() => {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 150);
    }
  }

  // Hero is above the fold — reveal immediately, no observer needed
  document.querySelectorAll(
    '.hero-badge, .hero-heading, .hero-sub, .hero-buttons, .hero-stats'
  ).forEach(el => { el.style.visibility = 'visible'; });
});

const video = document.getElementById("aboutVideo");
const status = document.getElementById("soundStatus");
let hideTimeout;

video.addEventListener("click", () => {
  video.muted = !video.muted;

  status.textContent = video.muted ? "Muted 🔇" : "Sound On 🔊";
  status.classList.add("show");

  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    status.classList.remove("show");
  }, 2000); // 2 seconds
});
