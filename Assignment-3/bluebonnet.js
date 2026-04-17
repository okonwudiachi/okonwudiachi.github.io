/**
 * bluebonnet.js — Updated for live, on-the-fly validation
 * Author: Onyemaechi Onwudiachi
 *
 * Change summary:
 * 1) Added JavaScript validation that runs while the user types, changes, and leaves fields.
 * 2) Added persistent inline error areas so the page does not jump when messages appear/disappear.
 * 3) Replaced traditional submit-first flow with a VALIDATE-first flow.
 * 4) Real submit buttons stay hidden/disabled until the current form has no validation errors.
 * 5) Kept HTML validation attributes in place, but JavaScript now actively enforces the rules.
 */

const STORAGE_KEY = 'bbhc_registration';

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function loadSavedData() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch (err) {
    return {};
  }
}

function saveData(newData) {
  const existing = loadSavedData();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, existing, newData)));
}

function collectFormData(form) {
  const data = {};
  if (!form) return data;

  Array.from(form.elements).forEach(function (el) {
    if (!el.name) return;

    if (el.type === 'checkbox') {
      if (el.checked) {
        if (!data[el.name]) data[el.name] = [];
        data[el.name].push(el.value || 'yes');
      }
      return;
    }

    if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
      return;
    }

    data[el.name] = el.value;
  });

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE / FORMAT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function toInputDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function todayAtMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatPhone(value) {
  let digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + '-' + digits.slice(3);
  return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function normalizeUserId(value) {
  return value.trim().toLowerCase();
}

function hasUnsafeMarkup(value) {
  return /[<>]/.test(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS FOR ERRORS / SUCCESS
// ─────────────────────────────────────────────────────────────────────────────
function getFieldContainer(el) {
  return el.closest('td') || el.parentElement || el;
}

function ensureMessageSlot(container, key) {
  let slot = container.querySelector('.field-error[data-for="' + key + '"]');
  if (!slot) {
    slot = document.createElement('div');
    slot.className = 'field-error';
    slot.dataset.for = key;
    slot.setAttribute('aria-live', 'polite');
    container.appendChild(slot);
  }
  return slot;
}

function ensureStandardMessageSlots(form) {
  Array.from(form.elements).forEach(function (el) {
    if (!el.name) return;
    if (['submit', 'reset', 'button', 'hidden'].includes(el.type)) return;
    if (el.type === 'radio' || el.type === 'checkbox') return;
    ensureMessageSlot(getFieldContainer(el), el.name);
  });

  ['gender', 'vaccinated', 'has_insurance', 'consent_to_treat', 'financial_policy_ack', 'hipaa_npp_ack'].forEach(function (groupName) {
    const groupEl = form.querySelector('[name="' + groupName + '"]');
    if (groupEl) ensureMessageSlot(getFieldContainer(groupEl), groupName);
  });
}

function setMessage(targetKey, container, message) {
  const slot = ensureMessageSlot(container, targetKey);
  slot.textContent = message || '';
}

function showFieldError(el, message) {
  el.classList.add('input-error');
  el.classList.remove('input-valid');
  el.setAttribute('aria-invalid', 'true');
  setMessage(el.name, getFieldContainer(el), message);
}

function showFieldValid(el) {
  el.classList.remove('input-error');
  el.classList.add('input-valid');
  el.removeAttribute('aria-invalid');
  setMessage(el.name, getFieldContainer(el), '');
}

function clearFieldState(el) {
  el.classList.remove('input-error', 'input-valid');
  el.removeAttribute('aria-invalid');
  setMessage(el.name, getFieldContainer(el), '');
}

function showGroupError(groupName, message, form) {
  const group = form.querySelectorAll('[name="' + groupName + '"]');
  if (!group.length) return;
  group.forEach(function (el) {
    el.classList.add('input-error');
    el.classList.remove('input-valid');
    el.setAttribute('aria-invalid', 'true');
  });
  setMessage(groupName, getFieldContainer(group[0]), message);
}

function showGroupValid(groupName, form) {
  const group = form.querySelectorAll('[name="' + groupName + '"]');
  if (!group.length) return;
  group.forEach(function (el) {
    el.classList.remove('input-error');
    el.classList.add('input-valid');
    el.removeAttribute('aria-invalid');
  });
  setMessage(groupName, getFieldContainer(group[0]), '');
}

function clearGroupState(groupName, form) {
  const group = form.querySelectorAll('[name="' + groupName + '"]');
  if (!group.length) return;
  group.forEach(function (el) {
    el.classList.remove('input-error', 'input-valid');
    el.removeAttribute('aria-invalid');
  });
  setMessage(groupName, getFieldContainer(group[0]), '');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD-SPECIFIC VALIDATION RULES
// ─────────────────────────────────────────────────────────────────────────────
function validateTextByRule(el, config) {
  const raw = el.value == null ? '' : String(el.value);
  const value = config.trim === false ? raw : raw.trim();

  if (!value) {
    if (el.required) {
      showFieldError(el, 'Required.');
      return false;
    }
    clearFieldState(el);
    return true;
  }

  if (config.max && value.length > config.max) {
    showFieldError(el, 'Maximum ' + config.max + ' characters allowed.');
    return false;
  }

  if (config.min && value.length < config.min) {
    showFieldError(el, 'Minimum ' + config.min + ' characters required.');
    return false;
  }

  if (config.rejectMarkup && hasUnsafeMarkup(value)) {
    showFieldError(el, 'Please remove < and > characters.');
    return false;
  }

  if (config.regex && !config.regex.test(value)) {
    showFieldError(el, config.message);
    return false;
  }

  showFieldValid(el);
  return true;
}

function validateElement(el) {
  if (!el || !el.name) return true;

  // CHANGE: JavaScript now actively normalizes fields that should not keep mixed case.
  if (el.name === 'email') el.value = normalizeEmail(el.value);
  if (el.name === 'user_id') el.value = normalizeUserId(el.value);

  switch (el.name) {
    case 'user_id':
      el.setCustomValidity('');
      return validateTextByRule(el, {
        min: 5,
        max: 30,
        rejectMarkup: true,
        regex: /^[a-z][a-z0-9_-]{4,29}$/,
        message: 'Use 5–30 characters. Start with a letter. Use lowercase letters, numbers, underscores, or dashes only.'
      });

    case 'email': {
      el.setCustomValidity('');
      const value = normalizeEmail(el.value);
      el.value = value;
      if (!value) {
        if (el.required) {
          showFieldError(el, 'Required.');
          return false;
        }
        clearFieldState(el);
        return true;
      }
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      if (!ok) {
        showFieldError(el, 'Enter a valid email such as name@domain.com.');
        el.setCustomValidity('Invalid email');
        return false;
      }
      showFieldValid(el);
      return true;
    }

    case 'password': {
      el.setCustomValidity('');
      const value = el.value;
      if (!value) {
        showFieldError(el, 'Required.');
        return false;
      }
      const strong = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/.test(value);
      if (!strong) {
        showFieldError(el, 'Use 8–64 characters with uppercase, lowercase, number, and special character.');
        el.setCustomValidity('Weak password');
        return false;
      }
      showFieldValid(el);
      const confirmEl = document.getElementById('password2');
      if (confirmEl && confirmEl.value) validateElement(confirmEl);
      return true;
    }

    case 'password_confirm':
      break;

    case 'first_name':
      return validateTextByRule(el, {
        min: 1,
        max: 30,
        rejectMarkup: true,
        regex: /^[A-Za-z'\- ]{1,30}$/,
        message: 'Use only letters, spaces, apostrophes, and dashes.'
      });

    case 'middle_initial':
      return validateTextByRule(el, {
        min: 1,
        max: 1,
        rejectMarkup: true,
        regex: /^[A-Za-z]$/,
        message: 'Enter one letter only.'
      });

    case 'last_name':
      return validateTextByRule(el, {
        min: 1,
        max: 30,
        rejectMarkup: true,
        regex: /^[A-Za-z'\- 2-5]{1,30}$/,
        message: 'Use letters, spaces, apostrophes, dashes, and numbers 2–5 only.'
      });

    case 'date_of_birth': {
      const value = el.value;
      el.setCustomValidity('');
      if (!value) {
        showFieldError(el, 'Required.');
        return false;
      }
      const dob = new Date(value);
      const today = todayAtMidnight();
      const minDate = new Date(today);
      minDate.setFullYear(minDate.getFullYear() - 120);
      if (Number.isNaN(dob.getTime())) {
        showFieldError(el, 'Enter a valid date.');
        return false;
      }
      if (dob >= today) {
        showFieldError(el, 'Date of birth must be in the past.');
        el.setCustomValidity('DOB in future');
        return false;
      }
      if (dob < minDate) {
        showFieldError(el, 'Date of birth cannot be more than 120 years ago.');
        el.setCustomValidity('DOB too old');
        return false;
      }
      showFieldValid(el);
      return true;
    }

    case 'ssn': {
      const value = el.value.trim();
      el.setCustomValidity('');
      if (!value) {
        showFieldError(el, 'Required.');
        return false;
      }
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 9) {
        showFieldError(el, 'Enter exactly 9 digits, with or without dashes.');
        el.setCustomValidity('Invalid SSN');
        return false;
      }
      showFieldValid(el);
      return true;
    }

    case 'address_line1':
      return validateTextByRule(el, {
        min: 2,
        max: 30,
        rejectMarkup: true,
        regex: /^[A-Za-z0-9#.,'\-/ ]{2,30}$/,
        message: 'Use 2–30 characters with letters, numbers, spaces, #, period, comma, apostrophe, slash, or dash.'
      });

    case 'address_line2':
      return validateTextByRule(el, {
        min: 2,
        max: 30,
        rejectMarkup: true,
        regex: /^[A-Za-z0-9#.,'\-/ ]{2,30}$/,
        message: 'If entered, use 2–30 characters with normal address characters only.'
      });

    case 'city':
      return validateTextByRule(el, {
        min: 2,
        max: 30,
        rejectMarkup: true,
        regex: /^[A-Za-z.'\- ]{2,30}$/,
        message: 'Use 2–30 letters with spaces, periods, apostrophes, or dashes only.'
      });

    case 'zip_code': {
      const value = el.value.trim();
      if (!value) {
        showFieldError(el, 'Required.');
        return false;
      }
      const ok = /^\d{5}(-\d{4})?$/.test(value);
      if (!ok) {
        showFieldError(el, 'Enter ZIP as 12345 or 12345-6789.');
        return false;
      }
      showFieldValid(el);
      return true;
    }

    case 'reason_for_visit':
      return validateTextByRule(el, {
        min: 2,
        max: 60,
        rejectMarkup: true,
        regex: /^[A-Za-z0-9&(),.'\-\/ ]{2,60}$/,
        message: 'Use a short plain-language reason with letters, numbers, spaces, and basic punctuation only.'
      });

    case 'symptoms_description':
    case 'primary_card_notes':
    case 'current_medications':
    case 'allergies':
      return validateTextByRule(el, {
        min: 2,
        max: 500,
        rejectMarkup: true,
        regex: /^[A-Za-z0-9\n\r &(),.:;'"\-\/#!?%]{2,500}$/,
        message: 'Use plain text only. Remove unusual symbols or markup.'
      });

    case 'preferred_contact':
    case 'primary_plan_type':
      if (!el.value) {
        clearFieldState(el);
        return true;
      }
      showFieldValid(el);
      return true;

    case 'emergency_name':
    case 'guarantor_name':
    case 'pcp_name':
    case 'signature_print_name':
    case 'signature':
      return validateTextByRule(el, {
        min: 2,
        max: el.maxLength || 80,
        rejectMarkup: true,
        regex: /^[A-Za-z.'\- ]{2,80}$/,
        message: 'Use letters, spaces, periods, apostrophes, and dashes only.'
      });

    case 'emergency_relationship':
    case 'guarantor_relationship':
      return validateTextByRule(el, {
        min: 2,
        max: 40,
        rejectMarkup: true,
        regex: /^[A-Za-z&.'\- ]{2,40}$/,
        message: 'Use a normal relationship description with letters and basic punctuation only.'
      });

    case 'primary_ins_provider':
    case 'secondary_ins_provider':
      return validateTextByRule(el, {
        min: 2,
        max: 60,
        rejectMarkup: true,
        regex: /^[A-Za-z0-9&.'\- ]{2,60}$/,
        message: 'Use letters, numbers, spaces, and simple punctuation only.'
      });

    case 'primary_member_id':
    case 'primary_group_number':
    case 'secondary_member_id':
      return validateTextByRule(el, {
        min: 3,
        max: 30,
        rejectMarkup: true,
        regex: /^[A-Za-z0-9\-]{3,30}$/,
        message: 'Use 3–30 letters, numbers, or dashes only.'
      });

    case 'guarantor_address':
      return validateTextByRule(el, {
        min: 5,
        max: 120,
        rejectMarkup: true,
        regex: /^[A-Za-z0-9#.,'\-/ ]{5,120}$/,
        message: 'Use a normal mailing address with letters, numbers, spaces, and address punctuation only.'
      });

    case 'guarantor_email': {
      const value = normalizeEmail(el.value);
      el.value = value;
      if (!value) {
        clearFieldState(el);
        return true;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        showFieldError(el, 'Enter a valid email such as name@domain.com.');
        return false;
      }
      showFieldValid(el);
      return true;
    }

    case 'emergency_phone':
    case 'emergency_phone_alt':
    case 'guarantor_phone':
    case 'pcp_phone': {
      const value = el.value.trim();
      if (!value) {
        if (el.required) {
          showFieldError(el, 'Required.');
          return false;
        }
        clearFieldState(el);
        return true;
      }
      if (!/^\d{3}-\d{3}-\d{4}$/.test(value)) {
        showFieldError(el, 'Enter phone as 123-456-7890.');
        return false;
      }
      showFieldValid(el);
      return true;
    }

    case 'signature_date': {
      const value = el.value;
      el.setCustomValidity('');
      if (!value) {
        showFieldError(el, 'Required.');
        return false;
      }
      const sigDate = new Date(value);
      const today = todayAtMidnight();
      if (Number.isNaN(sigDate.getTime())) {
        showFieldError(el, 'Enter a valid date.');
        return false;
      }
      if (sigDate > today) {
        showFieldError(el, 'Signature date cannot be in the future.');
        el.setCustomValidity('Future date');
        return false;
      }
      showFieldValid(el);
      return true;
    }

    default:
      // CHANGE: Optional unruled fields still get checked for obvious unsafe markup.
      if (!el.value || !String(el.value).trim()) {
        if (el.required) {
          showFieldError(el, 'Required.');
          return false;
        }
        clearFieldState(el);
        return true;
      }
      if (hasUnsafeMarkup(String(el.value))) {
        showFieldError(el, 'Please remove < and > characters.');
        return false;
      }
      showFieldValid(el);
      return true;
  }

  if (el.id === 'password2') {
    const password = document.getElementById('password');
    const confirmValue = el.value;
    el.setCustomValidity('');
    if (!confirmValue) {
      showFieldError(el, 'Required.');
      return false;
    }
    if (!password || password.value !== confirmValue) {
      showFieldError(el, 'Passwords must match exactly.');
      el.setCustomValidity('Password mismatch');
      return false;
    }
    showFieldValid(el);
    return true;
  }

  return true;
}

function validateRadioGroup(form, groupName, required) {
  const radios = form.querySelectorAll('input[type="radio"][name="' + groupName + '"]');
  if (!radios.length) return true;
  const anyChecked = Array.from(radios).some(function (radio) { return radio.checked; });
  if (!anyChecked) {
    if (required) {
      showGroupError(groupName, 'Please make a selection.', form);
      return false;
    }
    clearGroupState(groupName, form);
    return true;
  }
  showGroupValid(groupName, form);
  return true;
}

function validateCheckboxGroup(form, groupName, required) {
  const boxes = form.querySelectorAll('input[type="checkbox"][name="' + groupName + '"]');
  if (!boxes.length) return true;
  const anyChecked = Array.from(boxes).some(function (box) { return box.checked; });
  if (!anyChecked) {
    if (required) {
      showGroupError(groupName, 'This acknowledgement is required.', form);
      return false;
    }
    clearGroupState(groupName, form);
    return true;
  }
  showGroupValid(groupName, form);
  return true;
}

function validateCurrentForm(form, scrollToFirstError) {
  // CHANGE: This function now retrieves all form data before validation, per requirement.
  const currentData = collectFormData(form);
  void currentData;

  let isValid = true;
  let firstBad = null;

  Array.from(form.elements).forEach(function (el) {
    if (!el.name) return;
    if (['submit', 'reset', 'button', 'hidden', 'radio', 'checkbox'].includes(el.type)) return;
    const ok = validateElement(el);
    if (!ok && !firstBad) firstBad = el;
    isValid = isValid && ok;
  });

  [
    { name: 'gender', required: true, type: 'radio' },
    { name: 'vaccinated', required: true, type: 'radio' },
    { name: 'has_insurance', required: true, type: 'radio' },
    { name: 'consent_to_treat', required: true, type: 'checkbox' },
    { name: 'financial_policy_ack', required: true, type: 'checkbox' },
    { name: 'hipaa_npp_ack', required: true, type: 'checkbox' }
  ].forEach(function (group) {
    if (!form.querySelector('[name="' + group.name + '"]')) return;
    const ok = group.type === 'radio'
      ? validateRadioGroup(form, group.name, group.required)
      : validateCheckboxGroup(form, group.name, group.required);
    if (!ok && !firstBad) firstBad = form.querySelector('[name="' + group.name + '"]');
    isValid = isValid && ok;
  });

  toggleSubmitAvailability(form, isValid);

  if (!isValid && scrollToFirstError && firstBad) {
    firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstBad.focus({ preventScroll: true });
  }

  return isValid;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM FLOW: VALIDATE BUTTON FIRST, REAL SUBMIT AFTER SUCCESS
// ─────────────────────────────────────────────────────────────────────────────
function toggleSubmitAvailability(form, isValid) {
  const realSubmitButtons = form.querySelectorAll('.js-real-submit');
  realSubmitButtons.forEach(function (btn) {
    btn.disabled = !isValid;
    btn.classList.toggle('js-hidden-submit', !isValid);
  });

  const status = form.querySelector('.form-validation-status');
  if (!status) return;

  if (isValid) {
    status.textContent = 'Validation passed. You may now submit or continue.';
    status.classList.remove('status-error');
    status.classList.add('status-success');
  } else {
    status.textContent = 'Please correct the highlighted fields. Submit remains unavailable until all errors are fixed.';
    status.classList.remove('status-success');
    status.classList.add('status-error');
  }
}

function lockSubmitButtons(form) {
  const realSubmitButtons = form.querySelectorAll('.js-real-submit');
  realSubmitButtons.forEach(function (btn) {
    btn.disabled = true;
    btn.classList.add('js-hidden-submit');
  });

  const status = form.querySelector('.form-validation-status');
  if (status) {
    status.textContent = 'Click VALIDATE after completing this page.';
    status.classList.remove('status-success', 'status-error');
  }
}

function initValidateButtons(form) {
  const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
  if (!submitButtons.length) return;

  // CHANGE: Traditional submit buttons are hidden until JS validation says the page is clean.
  submitButtons.forEach(function (btn) {
    btn.classList.add('js-real-submit', 'js-hidden-submit');
    btn.disabled = true;
  });

  const actions = form.querySelector('.actions') || form;

  const validateBtn = document.createElement('button');
  validateBtn.type = 'button';
  validateBtn.className = 'btn primary validate-btn';
  validateBtn.textContent = 'VALIDATE';
  validateBtn.title = 'Run JavaScript validation on every field on this page.';

  const status = document.createElement('div');
  status.className = 'form-validation-status';
  status.textContent = 'Click VALIDATE after completing this page.';

  validateBtn.addEventListener('click', function () {
    validateCurrentForm(form, true);
  });

  actions.insertBefore(validateBtn, actions.firstChild);
  actions.appendChild(status);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE LISTENERS / INPUT FORMATTING
// ─────────────────────────────────────────────────────────────────────────────
function configureSpecialFields(form) {
  const dob = form.querySelector('#dob');
  if (dob) {
    // CHANGE: Date field now uses dynamic min/max values but is still checked again with JavaScript.
    dob.type = 'date';
    const today = todayAtMidnight();
    const minDate = new Date(today);
    minDate.setFullYear(minDate.getFullYear() - 120);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() - 1);
    dob.min = toInputDate(minDate);
    dob.max = toInputDate(maxDate);
    dob.title = 'Choose a past date of birth. It cannot be today, in the future, or more than 120 years ago.';
  }

  const sigDate = form.querySelector('#sig_date');
  if (sigDate) {
    sigDate.type = 'date';
    sigDate.max = toInputDate(todayAtMidnight());
    sigDate.title = 'Choose a signature date that is today or earlier.';
  }

  form.querySelectorAll('input[type="tel"]').forEach(function (tel) {
    tel.placeholder = '123-456-7890';
    tel.title = 'Enter a 10-digit phone number. It will be formatted as 123-456-7890.';
  });
}

function attachLiveValidation(form) {
  Array.from(form.elements).forEach(function (el) {
    if (!el.name) return;
    if (['submit', 'reset', 'button', 'hidden'].includes(el.type)) return;

    if (el.type === 'radio') {
      el.addEventListener('change', function () {
        validateRadioGroup(form, el.name, el.required);
        lockSubmitButtons(form);
      });
      return;
    }

    if (el.type === 'checkbox') {
      el.addEventListener('change', function () {
        validateCheckboxGroup(form, el.name, el.required);
        lockSubmitButtons(form);
      });
      return;
    }

    if (el.type === 'tel') {
      el.addEventListener('input', function () {
        el.value = formatPhone(el.value);
        validateElement(el);
        lockSubmitButtons(form);
      });
      el.addEventListener('blur', function () {
        validateElement(el);
        lockSubmitButtons(form);
      });
      return;
    }

    if (el.name === 'email' || el.name === 'user_id') {
      el.addEventListener('input', function () {
        validateElement(el);
        lockSubmitButtons(form);
      });
      el.addEventListener('blur', function () {
        validateElement(el);
        lockSubmitButtons(form);
      });
      return;
    }

    if (el.tagName === 'SELECT') {
      el.addEventListener('change', function () {
        validateElement(el);
        lockSubmitButtons(form);
      });
      el.addEventListener('blur', function () {
        validateElement(el);
        lockSubmitButtons(form);
      });
      return;
    }

    el.addEventListener('input', function () {
      validateElement(el);
      lockSubmitButtons(form);
    });

    el.addEventListener('blur', function () {
      validateElement(el);
      lockSubmitButtons(form);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RANGE / STATE / SAVE / RESTORE
// ─────────────────────────────────────────────────────────────────────────────
function initRangeSliders(form) {
  form.querySelectorAll('input[type="range"]').forEach(function (slider) {
    const output = form.querySelector('output[for="' + slider.id + '"]')
      || form.querySelector('output[name="' + slider.name + '_output"]');

    function updateSlider() {
      if (output) output.textContent = slider.value;
      const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.background = 'linear-gradient(to right, #1c6ea4 0%, #1c6ea4 ' + pct + '%, #d7e2f1 ' + pct + '%, #d7e2f1 100%)';
    }

    slider.addEventListener('input', updateSlider);
    updateSlider();
  });
}

function initStateSelect() {
  if (typeof populateStateSelect !== 'function') return;
  const saved = loadSavedData();
  populateStateSelect('state', saved.state || '');
}

function restoreFormData(form) {
  const saved = loadSavedData();
  if (!Object.keys(saved).length) return;

  Object.keys(saved).forEach(function (name) {
    const els = form.querySelectorAll('[name="' + name + '"]');
    if (!els.length) return;

    els.forEach(function (el) {
      if (el.type === 'checkbox') {
        el.checked = Array.isArray(saved[name]) && saved[name].includes(el.value || 'yes');
      } else if (el.type === 'radio') {
        el.checked = el.value === saved[name];
      } else {
        el.value = saved[name];
      }
    });
  });
}

function initAutoSave(form) {
  function doSave() {
    saveData(collectFormData(form));
  }

  form.addEventListener('change', doSave);
  window.addEventListener('pagehide', doSave);
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW BUTTON (kept from prior build)
// ─────────────────────────────────────────────────────────────────────────────
function initReviewButton(form) {
  const actions = form.querySelector('.actions');
  if (!actions) return;

  const reviewBtn = document.createElement('button');
  reviewBtn.type = 'button';
  reviewBtn.className = 'btn review-btn';
  reviewBtn.textContent = 'Review Saved Data';
  reviewBtn.title = 'Review all saved data across the registration steps.';

  reviewBtn.addEventListener('click', function () {
    const saved = loadSavedData();
    const pretty = JSON.stringify(saved, null, 2);
    alert('Saved data snapshot:\n\n' + pretty);
  });

  actions.insertBefore(reviewBtn, actions.firstChild);
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE CURRENT PAGE
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('form');
  if (!form) return;

  initStateSelect();
  configureSpecialFields(form);
  ensureStandardMessageSlots(form);
  restoreFormData(form);
  initRangeSliders(form);
  initReviewButton(form);
  initValidateButtons(form);
  attachLiveValidation(form);
  initAutoSave(form);
  lockSubmitButtons(form);

  form.addEventListener('reset', function () {
    window.setTimeout(function () {
      ensureStandardMessageSlots(form);
      lockSubmitButtons(form);
      Array.from(form.elements).forEach(function (el) {
        if (!el.name) return;
        if (el.type === 'radio' || el.type === 'checkbox') {
          clearGroupState(el.name, form);
        } else if (!['submit', 'reset', 'button', 'hidden'].includes(el.type)) {
          clearFieldState(el);
        }
      });
    }, 0);
  });

  // CHANGE: Final submit is still guarded so bad data cannot slip through.
  form.addEventListener('submit', function (event) {
    const ok = validateCurrentForm(form, true);
    if (!ok) event.preventDefault();
    else saveData(collectFormData(form));
  });
});
