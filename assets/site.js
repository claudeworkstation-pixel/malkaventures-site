/* Malka Ventures — site behaviour. No dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  // Vercel Web Analytics queue (the script itself is loaded from the page).
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

  // Header: show a border once the page has scrolled.
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-stuck', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu.
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('site-menu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  // Contact form: send to /api/contact, show the result in place.
  var form = document.querySelector('.contact-form');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var text = {
    sending: form.getAttribute('data-sending'),
    sentTitle: form.getAttribute('data-sent-title'),
    sentBody: form.getAttribute('data-sent-body'),
    failed: form.getAttribute('data-failed'),
    emailUs: form.getAttribute('data-email-us'),
    email: form.getAttribute('data-email')
  };
  var idleLabel = button ? button.textContent : '';

  function showError(data) {
    status.className = 'form-status err';
    status.textContent = text.failed + ' ';
    var link = document.createElement('a');
    link.href = 'mailto:' + text.email +
      '?subject=' + encodeURIComponent('Enquiry from ' + (data.name || 'malkaventures.com')) +
      '&body=' + encodeURIComponent(data.message || '');
    link.textContent = text.emailUs + ' ' + text.email;
    status.appendChild(link);
    if (button) { button.disabled = false; button.textContent = idleLabel; }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
      company: form.elements.company.value,
      lang: form.elements.lang.value
    };

    status.className = 'form-status';
    status.textContent = '';
    if (button) { button.disabled = true; button.textContent = text.sending; }

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok || !body.ok) throw new Error(body.error || 'send_failed');
        });
      })
      .then(function () {
        var done = document.createElement('div');
        done.className = 'contact-form sent';
        done.setAttribute('role', 'status');
        done.setAttribute('tabindex', '-1');
        var h = document.createElement('h3');
        h.textContent = text.sentTitle;
        var p = document.createElement('p');
        p.textContent = text.sentBody.replace('{email}', data.email);
        done.appendChild(h);
        done.appendChild(p);
        form.replaceWith(done);
        done.focus();
        window.va('event', { name: 'contact_sent' });
      })
      .catch(function () { showError(data); });
  });
})();
