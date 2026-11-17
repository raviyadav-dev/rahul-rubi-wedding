(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 980px)").matches;

  const sections = ["home", "blessings", "events", "venues", "family", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const loader = document.getElementById("loader");
  const topbar = document.getElementById("topbar");
  const pageVeil = document.getElementById("pageVeil");
  const navIndicator = document.getElementById("navIndicator");
  const mobileDock = document.getElementById("mobileDock");
  const desktopNav = document.getElementById("nav");

  let activeId = "home";
  let scrollingProgrammatically = false;
  let lastScrollY = 0;

  /* ---- helpers ---- */
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

  const animateScrollTo = (targetY, duration = isMobile() ? 780 : 1100) =>
    new Promise((resolve) => {
      if (prefersReduced) {
        window.scrollTo(0, targetY);
        resolve();
        return;
      }
      const startY = window.scrollY;
      const diff = targetY - startY;
      if (Math.abs(diff) < 2) {
        resolve();
        return;
      }
      const start = performance.now();
      scrollingProgrammatically = true;

      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        window.scrollTo(0, startY + diff * easeOutQuint(t));
        if (t < 1) requestAnimationFrame(step);
        else {
          scrollingProgrammatically = false;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

  const getSectionTop = (el) => {
    const offset = isMobile() ? 72 : 88;
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
  };

  const playVeil = async () => {
    if (prefersReduced || !pageVeil) return;
    pageVeil.classList.remove("closing");
    pageVeil.classList.add("active");
    await new Promise((r) => setTimeout(r, 180));
  };

  const hideVeil = async () => {
    if (prefersReduced || !pageVeil) return;
    pageVeil.classList.add("closing");
    pageVeil.classList.remove("active");
    await new Promise((r) => setTimeout(r, 480));
    pageVeil.classList.remove("closing");
  };

  /* ---- active nav UI ---- */
  const moveDesktopIndicator = (id) => {
    if (!navIndicator || !desktopNav || isMobile()) return;
    const link = desktopNav.querySelector(`.nav-link[data-nav="${id}"]`);
    if (!link) {
      navIndicator.classList.remove("on");
      return;
    }
    const navRect = desktopNav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    navIndicator.style.width = `${linkRect.width}px`;
    navIndicator.style.transform = `translateX(${linkRect.left - navRect.left}px)`;
    navIndicator.classList.add("on");
  };

  const setActive = (id) => {
    if (!id || id === activeId) {
      moveDesktopIndicator(id || activeId);
      return;
    }
    activeId = id;
    document.querySelectorAll(".nav-link, .rail-dot, .dock-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.nav === id);
    });
    moveDesktopIndicator(id);
  };

  /* ---- premium navigate ---- */
  const navigateTo = async (id, { pushHash = true } = {}) => {
    const el = document.getElementById(id);
    if (!el) return;

    setActive(id);
    if (pushHash) history.pushState(null, "", `#${id}`);

    if (!prefersReduced) await playVeil();
    await animateScrollTo(getSectionTop(el));
    if (!prefersReduced) await hideVeil();

    // soft re-trigger reveal for section content
    el.querySelectorAll(".reveal:not(.in)").forEach((node) => node.classList.add("in"));
  };

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.dataset.nav || (link.getAttribute("href") || "").replace("#", "");
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      navigateTo(id);
    });
  });

  window.addEventListener("popstate", () => {
    const id = (location.hash || "#home").slice(1);
    navigateTo(id, { pushHash: false });
  });

  /* ---- scroll spy ---- */
  const spy = () => {
    if (scrollingProgrammatically) return;
    const probe = window.scrollY + (isMobile() ? window.innerHeight * 0.35 : window.innerHeight * 0.3);
    let current = sections[0]?.id || "home";
    sections.forEach((section) => {
      if (section.offsetTop <= probe) current = section.id;
    });
    setActive(current);
  };

  /* ---- topbar hide on mobile scroll down ---- */
  const onScroll = () => {
    const y = window.scrollY;
    topbar?.classList.toggle("scrolled", y > 24);

    if (isMobile() && !scrollingProgrammatically) {
      const goingDown = y > lastScrollY && y > 120;
      topbar?.classList.toggle("hidden-up", goingDown);
      mobileDock?.classList.toggle("show", y > 40 || true);
    } else {
      topbar?.classList.remove("hidden-up");
    }
    lastScrollY = y;
    spy();
  };

  /* ---- responsive dock ---- */
  const syncDeviceUI = () => {
    if (isMobile()) {
      document.body.classList.add("has-mobile-dock");
      mobileDock?.classList.add("show");
      navIndicator?.classList.remove("on");
    } else {
      document.body.classList.remove("has-mobile-dock");
      mobileDock?.classList.remove("show");
      moveDesktopIndicator(activeId);
    }
  };

  /* ---- loader ---- */
  const bootHero = () => {
    document.querySelectorAll(".hero .reveal-item").forEach((el) => {
      const delay = Number(el.dataset.delay || 0);
      setTimeout(() => el.classList.add("in"), prefersReduced ? 0 : 120 + delay);
    });
  };

  window.addEventListener("load", () => {
    setTimeout(() => {
      loader?.classList.add("done");
      bootHero();
      syncDeviceUI();
      const initial = (location.hash || "#home").slice(1);
      if (initial && initial !== "home" && document.getElementById(initial)) {
        navigateTo(initial, { pushHash: false });
      } else {
        setActive("home");
      }
    }, prefersReduced ? 0 : 850);
  });

  window.addEventListener("resize", () => {
    syncDeviceUI();
    moveDesktopIndicator(activeId);
  });
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- keyboard section nav (desktop) ---- */
  window.addEventListener("keydown", (e) => {
    if (isMobile()) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "PageDown" && e.key !== "PageUp") return;
    const idx = sections.findIndex((s) => s.id === activeId);
    if (idx < 0) return;
    e.preventDefault();
    const next =
      e.key === "ArrowDown" || e.key === "PageDown"
        ? sections[Math.min(sections.length - 1, idx + 1)]
        : sections[Math.max(0, idx - 1)];
    if (next) navigateTo(next.id);
  });

  /* ---- countdown ---- */
  const target = new Date("2026-11-25T16:00:00+05:30").getTime();
  const els = {
    d: document.getElementById("d"),
    h: document.getElementById("h"),
    m: document.getElementById("m"),
    s: document.getElementById("s"),
  };
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000);
    diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000);
    diff -= hours * 3600000;
    const mins = Math.floor(diff / 60000);
    diff -= mins * 60000;
    const secs = Math.floor(diff / 1000);
    if (els.d) els.d.textContent = pad(days);
    if (els.h) els.h.textContent = pad(hours);
    if (els.m) els.m.textContent = pad(mins);
    if (els.s) els.s.textContent = pad(secs);
  };
  tick();
  setInterval(tick, 1000);

  /* ---- petals + sparkles ---- */
  const petals = document.getElementById("petals");
  const sparkles = document.getElementById("sparkles");
  if (petals && !prefersReduced) {
    const count = isMobile() ? 12 : 22;
    for (let i = 0; i < count; i += 1) {
      const petal = document.createElement("span");
      petal.className = "petal";
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${9 + Math.random() * 12}s`;
      petal.style.animationDelay = `${Math.random() * 10}s`;
      petal.style.opacity = `${0.2 + Math.random() * 0.45}`;
      petal.style.transform = `scale(${0.65 + Math.random() * 0.9})`;
      petals.appendChild(petal);
    }
  }
  if (sparkles && !prefersReduced) {
    const count = isMobile() ? 14 : 28;
    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement("span");
      dot.className = "sparkle";
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.animationDuration = `${2.4 + Math.random() * 3.5}s`;
      dot.style.animationDelay = `${Math.random() * 4}s`;
      sparkles.appendChild(dot);
    }
  }

  /* ---- scroll reveal ---- */
  const revealTargets = document.querySelectorAll(
    ".section-head, .event-card, .venue-card, .family-card, .contact-card, .mantra-card, .poem-card, .people-card, .strip, .host"
  );
  revealTargets.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = prefersReduced ? "0ms" : `${(i % 4) * 80}ms`;
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );
  revealTargets.forEach((el) => io.observe(el));

  /* ---- magnetic / tilt only desktop ---- */
  if (!prefersReduced && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".magnetic").forEach((btn) => {
      btn.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
      btn.addEventListener("pointermove", (e) => {
        if (isMobile()) return;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.12}px, ${y * 0.14}px)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });

    document.querySelectorAll(".tilt").forEach((card) => {
      card.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease, box-shadow 0.35s ease";
      card.addEventListener("pointermove", (e) => {
        if (isMobile()) return;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 3.5;
        const ry = (px - 0.5) * 4.5;
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---- parallax hero ---- */
  const heroImg = document.querySelector(".hero-bg img");
  if (heroImg && !prefersReduced) {
    window.addEventListener(
      "scroll",
      () => {
        const y = Math.min(window.scrollY, 600);
        heroImg.style.translate = `0 ${y * (isMobile() ? 0.1 : 0.18)}px`;
      },
      { passive: true }
    );
  }

  syncDeviceUI();
})();
