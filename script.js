const toggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
if (toggle && navLinks) {
  toggle.addEventListener("click", () => navLinks.classList.toggle("open"));
}

const megaItems = document.querySelectorAll(".mega-item");
function closeMegaMenus(exceptItem) {
  megaItems.forEach((item) => {
    if (item !== exceptItem) {
      item.classList.remove("mega-open");
      const trigger = item.querySelector(".mega-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }
  });
}

megaItems.forEach((item) => {
  const trigger = item.querySelector(".mega-trigger");
  if (!trigger) return;

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const willOpen = !item.classList.contains("mega-open");
    closeMegaMenus(item);
    item.classList.toggle("mega-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".mega-item")) {
    closeMegaMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMegaMenus();
});

document.querySelectorAll(".nav-links > a, .mega-col a, .mega-feature a").forEach((link) => {
  link.addEventListener("click", () => {
    closeMegaMenus();
    if (navLinks) navLinks.classList.remove("open");
  });
});

const toast = document.querySelector(".toast");
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3600);
}

const inquiryStorageKey = "blueprintInquirySubmissions";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+\d][\d\s().-]{6,24}$/;

function setFormStatus(form, message, type) {
  const status = form.querySelector(".form-status");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("is-success", "is-error");
  if (type) status.classList.add(`is-${type}`);
}

function setFieldError(field, hasError) {
  if (!field) return;
  field.classList.toggle("has-error", hasError);
}

function saveInquiryLocally(payload) {
  const current = JSON.parse(window.localStorage.getItem(inquiryStorageKey) || "[]");
  current.push(payload);
  window.localStorage.setItem(inquiryStorageKey, JSON.stringify(current.slice(-30)));
}

function buildMailtoLink(form, payload) {
  const mailLink = form.querySelector(".inquiry-mail-link");
  if (!mailLink) return;
  const recipient = form.getAttribute("data-recipient") || "info@blueprintumbrella.com";
  const subject = encodeURIComponent(`B2B Inquiry from ${payload.name}`);
  const body = encodeURIComponent(
    [
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone}`,
      `Company: ${payload.company || "-"}`,
      `Country / Region: ${payload.country || "-"}`,
      `Product Requirements: ${payload.product || "-"}`,
      "",
      "Message:",
      payload.message || "-",
    ].join("\n")
  );
  mailLink.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  mailLink.hidden = false;
}

document.querySelectorAll("form[data-inquiry-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fields = {
      name: form.elements.name,
      email: form.elements.email,
      phone: form.elements.phone,
      company: form.elements.company,
      country: form.elements.country,
      product: form.elements.product,
      message: form.elements.message,
      consent: form.elements.consent,
      website: form.elements.website,
    };

    const checks = [
      [fields.name, fields.name.value.trim().length > 1],
      [fields.email, emailPattern.test(fields.email.value.trim())],
      [fields.phone, phonePattern.test(fields.phone.value.trim())],
    ];

    let isValid = true;
    checks.forEach(([input, passed]) => {
      setFieldError(input.closest(".field"), !passed);
      if (!passed) isValid = false;
    });

    const hasConsent = fields.consent.checked;
    fields.consent.closest(".consent-line").classList.toggle("has-error", !hasConsent);
    if (!hasConsent) isValid = false;

    if (fields.website.value.trim()) {
      setFormStatus(form, "Submission blocked. Please try again.", "error");
      return;
    }

    if (!isValid) {
      setFormStatus(form, "Please complete all required fields before submitting.", "error");
      return;
    }

    const submitButton = form.querySelector(".inquiry-submit");
    const originalLabel = submitButton ? submitButton.textContent : "";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("is-loading");
      submitButton.textContent = "Submitting...";
    }
    setFormStatus(form, "Submitting your inquiry...", "");

    const payload = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      company: fields.company.value.trim(),
      country: fields.country.value.trim(),
      product: fields.product.value.trim(),
      message: fields.message.value.trim(),
      page: window.location.href,
      submittedAt: new Date().toISOString(),
    };

    try {
      const endpoint = form.getAttribute("data-endpoint");
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Submission failed");
      } else {
        saveInquiryLocally(payload);
      }

      buildMailtoLink(form, payload);
      setFormStatus(form, "Submitted successfully. Our team will contact you soon.", "success");
      showToast("Inquiry submitted successfully.");
      form.reset();
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "inquiry_form_submit" });
    } catch (error) {
      setFormStatus(form, "Submission failed. Please email us directly or try again later.", "error");
      showToast("Submission failed. Please try again.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove("is-loading");
        submitButton.textContent = originalLabel;
      }
    }
  });

  form.querySelectorAll("input, textarea").forEach((input) => {
    const eventName = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(eventName, () => {
      setFieldError(input.closest(".field"), false);
      if (input.name === "consent") input.closest(".consent-line").classList.remove("has-error");
    });
  });
});

document.querySelectorAll("form[data-lead-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Thank you. Our sales team will contact you soon.");
    form.reset();
  });
});

document.querySelectorAll("[data-track]").forEach((el) => {
  el.addEventListener("click", () => {
    const eventName = el.getAttribute("data-track");
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName });
  });
});

document.querySelectorAll("[data-hero-carousel]").forEach((carousel) => {
  const slides = Array.from(carousel.querySelectorAll("[data-hero-slide]"));
  const dots = Array.from(carousel.querySelectorAll("[data-hero-dot]"));
  const prev = carousel.querySelector("[data-hero-prev]");
  const next = carousel.querySelector("[data-hero-next]");
  if (slides.length < 2) return;

  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  if (activeIndex < 0) activeIndex = 0;

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeIndex);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });
  }

  let timer = window.setInterval(() => showSlide(activeIndex + 1), 5200);
  function restartTimer() {
    window.clearInterval(timer);
    timer = window.setInterval(() => showSlide(activeIndex + 1), 5200);
  }

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", () => {
      showSlide(dotIndex);
      restartTimer();
    });
  });

  if (prev) {
    prev.addEventListener("click", () => {
      showSlide(activeIndex - 1);
      restartTimer();
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      showSlide(activeIndex + 1);
      restartTimer();
    });
  }
});
