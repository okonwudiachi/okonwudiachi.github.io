/**
 * bluebonnet.js  — Version 17
 * Bluebonnet Health Clinic — Patient Registration JavaScript
 * Author: Onyemaechi Onwudiachi
 *
 * Changes in v17:
 *  - Full reactive border feedback (red/green) on ALL required fields
 *  - Complete review-panel validation status for ALL required fields
 *  - Updated field validations per requirements:
 *      First Name (1-30, letters/apostrophes/dashes)
 *      Middle Initial (1 letter, optional)
 *      Last Name (1-30, letters/apostrophes/dashes/numbers 2-5)
 *      DOB (date type, dynamic min/max 120yr cap, no future)
 *      Signature Date (date type, not future, within 30 days)
 *      SSN (password field, masked, 9 digits validated)
 *      Email (strict name@domain.tld)
 *      Phone (000-000-0000 format)
 *      Address Line 1 (required, 2-30 chars)
 *      Address Line 2 (optional, 2-30 chars if entered)
 *      City (required, 2-30 chars)
 *      State (populated from external states.js, null default forced)
 *      Zip (5 digits, truncates zip+4 to 5, redisplays)
 *      User ID (5-30 chars, letter-first, no spaces/specials, lowercased on blur)
 */

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEY
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'bbhc_registration';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function loadSavedData() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}

function saveData(newData) {
  const existing = loadSavedData();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, existing, newData)));
}

function collectFormData(form) {
  var data = {};
  if (!form) return data;
  var els = form.elements;
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      if (el.checked) {
        if (!data[el.name]) data[el.name] = [];
        if (Array.isArray(data[el.name])) data[el.name].push(el.value || 'yes');
        else data[el.name] = [data[el.name], el.value || 'yes'];
      }
    } else if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
    } else if (el.type === 'password' && el.name !== 'password_confirm') {
      data[el.name] = el.value ? '••••••••' : '';
    } else {
      if (el.value !== undefined) data[el.name] = el.value;
    }
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toInputDate(d) {
  var y  = d.getFullYear();
  var m  = String(d.getMonth() + 1).padStart('2', '0');
  var dd = String(d.getDate()).padStart('2', '0');
  return y + '-' + m + '-' + dd;
}
String.prototype.padStart = String.prototype.padStart || function(len, fill) {
  var s = String(this);
  while (s.length < len) s = fill + s;
  return s;
};

function getToday()     { return toInputDate(new Date()); }
function getTodayDate() { return new Date(); }

function getDobMax() {
  var d = new Date(); d.setDate(d.getDate() - 1); return toInputDate(d);
}
function getDobMin() {
  var d = new Date(); d.setFullYear(d.getFullYear() - 120); return toInputDate(d);
}
function getFutureDateMin() { return getToday(); }
function getFutureDateMax() {
  var d = new Date(); d.setFullYear(d.getFullYear() + 2); return toInputDate(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE ERROR / SUCCESS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function showError(input, msg) {
  var err = input.parentElement.querySelector('.field-error');
  if (!err) {
    err = document.createElement('div');
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    input.parentElement.appendChild(err);
  }
  err.textContent = msg;
  input.classList.add('input-error');
  input.classList.remove('input-valid');
}

function showValid(input) {
  var err = input.parentElement.querySelector('.field-error');
  if (err) err.textContent = '';
  input.classList.remove('input-error');
  input.classList.add('input-valid');
}

function clearState(input) {
  var err = input.parentElement.querySelector('.field-error');
  if (err) err.textContent = '';
  input.classList.remove('input-error', 'input-valid');
}

// ─────────────────────────────────────────────────────────────────────────────
// RANGE SLIDER
// ─────────────────────────────────────────────────────────────────────────────

function initRangeSliders() {
  document.querySelectorAll('input[type="range"]').forEach(function(slider) {
    var outputName = slider.name + '_output';
    var display = slider.form
      ? slider.form.querySelector('output[name="' + outputName + '"]')
      : document.querySelector('output[name="' + outputName + '"]');
    if (!display) {
      var sib = slider.nextElementSibling;
      while (sib) {
        if (sib.tagName === 'OUTPUT') { display = sib; break; }
        sib = sib.nextElementSibling;
      }
    }
    function updateDisplay() {
      var val = slider.value;
      if (display) display.textContent = val;
      var pct = ((val - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.background =
        'linear-gradient(to right, #1c6ea4 0%, #1c6ea4 ' + pct + '%, #d7e2f1 ' + pct + '%, #d7e2f1 100%)';
    }
    slider.addEventListener('input', updateDisplay);
    slider.addEventListener('change', updateDisplay);
    updateDisplay();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD MATCH
// ─────────────────────────────────────────────────────────────────────────────

function initPasswordMatch() {
  var pwd  = document.getElementById('password');
  var pwd2 = document.getElementById('password2');
  if (!pwd || !pwd2) return;

  function checkMatch() {
    if (!pwd2.value) { clearState(pwd2); pwd2.setCustomValidity(''); return; }
    if (pwd.value !== pwd2.value) {
      showError(pwd2, 'ERROR: Passwords do not match.');
      pwd2.setCustomValidity('Passwords do not match.');
    } else {
      showValid(pwd2);
      pwd2.setCustomValidity('');
    }
  }

  function checkStrength() {
    var val = pwd.value;
    if (!val) { clearState(pwd); pwd.setCustomValidity(''); checkMatch(); return; }
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(val)) {
      showError(pwd, 'ERROR: Must be 8+ characters with uppercase, lowercase, number, and special character.');
      pwd.setCustomValidity('Weak password');
    } else {
      showValid(pwd);
      pwd.setCustomValidity('');
    }
    checkMatch();
  }

  pwd.addEventListener('input', checkStrength);
  pwd2.addEventListener('input', checkMatch);
  pwd.addEventListener('blur', function() {
    if (!pwd.value) showError(pwd, 'Required');
  });
  pwd2.addEventListener('blur', function() {
    if (!pwd2.value) showError(pwd2, 'Required');
    else checkMatch();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOB FIELD — convert to type=date, set dynamic min/max
// ─────────────────────────────────────────────────────────────────────────────

function initDOBField() {
  var dob = document.getElementById('dob');
  if (!dob) return;
  dob.type = 'date';
  dob.min = getDobMin();
  dob.max = getDobMax();
  dob.removeAttribute('placeholder');
  dob.removeAttribute('pattern');

  function validateDOB() {
    var v = dob.value;
    if (!v) { clearState(dob); return; }
    var d = new Date(v);
    var today = getTodayDate(); today.setHours(0,0,0,0);
    if (d >= today) {
      showError(dob, 'ERROR: Date of birth cannot be today or in the future.');
      dob.setCustomValidity('DOB cannot be in future.');
      return;
    }
    var minDate = new Date(); minDate.setFullYear(minDate.getFullYear() - 120);
    if (d < minDate) {
      showError(dob, 'ERROR: Date cannot be more than 120 years ago.');
      dob.setCustomValidity('DOB too old.');
      return;
    }
    showValid(dob);
    dob.setCustomValidity('');
  }

  dob.addEventListener('change', validateDOB);
  dob.addEventListener('blur',   validateDOB);
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNATURE DATE FIELD — date type, not in future
// ─────────────────────────────────────────────────────────────────────────────

function initSigDateField() {
  var sigDate = document.getElementById('sig_date');
  if (!sigDate) return;
  sigDate.type = 'date';
  var minSig = new Date(); minSig.setDate(minSig.getDate() - 30);
  sigDate.min = toInputDate(minSig);
  sigDate.max = getToday();
  sigDate.removeAttribute('placeholder');
  sigDate.removeAttribute('pattern');

  function validateSigDate() {
    var v = sigDate.value;
    if (!v) { clearState(sigDate); return; }
    var d = new Date(v);
    var today = getTodayDate(); today.setHours(0,0,0,0);
    if (d > today) {
      showError(sigDate, 'ERROR: Signature date cannot be in the future.');
      sigDate.setCustomValidity('Cannot be future.');
    } else {
      showValid(sigDate);
      sigDate.setCustomValidity('');
    }
  }

  sigDate.addEventListener('change', validateSigDate);
  sigDate.addEventListener('blur',   validateSigDate);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE FORMATTING — format as 000-000-0000 per requirements
// ─────────────────────────────────────────────────────────────────────────────

function initPhoneFormatting() {
  document.querySelectorAll('input[type="tel"]').forEach(function(tel) {
    tel.setAttribute('placeholder', '000-000-0000');
    tel.setAttribute('maxlength', '12');

    tel.addEventListener('input', function() {
      var digits = tel.value.replace(/\D/g, '');
      if (digits.length > 10) digits = digits.slice(0, 10);
      var fmt = '';
      if      (digits.length === 0) fmt = '';
      else if (digits.length <= 3)  fmt = digits;
      else if (digits.length <= 6)  fmt = digits.slice(0,3) + '-' + digits.slice(3);
      else fmt = digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6);
      tel.value = fmt;

      if (fmt.length === 0) { clearState(tel); }
      else if (/^\d{3}-\d{3}-\d{4}$/.test(fmt)) { showValid(tel); }
      else { clearState(tel); } // still typing
    });

    tel.addEventListener('blur', function() {
      var v = tel.value;
      if (!v) {
        if (tel.required) showError(tel, 'Required');
        return;
      }
      if (!/^\d{3}-\d{3}-\d{4}$/.test(v)) {
        showError(tel, 'ERROR: Format must be 000-000-0000');
      } else {
        showValid(tel);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ZIP CODE — truncate to 5 on blur, redisplay
// ─────────────────────────────────────────────────────────────────────────────

function initZipField() {
  var zip = document.getElementById('zip');
  if (!zip) return;

  zip.addEventListener('input', function() {
    var digits = zip.value.replace(/\D/g, '');
    if (digits.length >= 5) showValid(zip);
    else clearState(zip);
  });

  zip.addEventListener('blur', function() {
    var v = zip.value.trim();
    if (!v) { showError(zip, 'Required'); return; }
    var digits = v.replace(/\D/g, '');
    if (digits.length < 5) {
      showError(zip, 'ERROR: Zip code must be 5 digits.');
    } else {
      // Truncate to 5 and redisplay
      zip.value = digits.slice(0, 5);
      showValid(zip);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ID — 5-30 chars, letter-first, no spaces/special, lowercase on blur
// ─────────────────────────────────────────────────────────────────────────────

function initUserIdField() {
  var uid = document.getElementById('user_id');
  if (!uid) return;
  uid.maxLength = 30;
  uid.removeAttribute('pattern');
  uid.title = '5–30 characters. Must start with a letter. Letters, numbers, underscores, and dashes only. No spaces. Will be converted to lowercase.';

  function validateUID(v) {
    if (!v) return 'Required';
    if (v.length < 5)  return 'ERROR: Minimum 5 characters required.';
    if (v.length > 30) return 'ERROR: Maximum 30 characters allowed.';
    if (/\s/.test(v))  return 'ERROR: No spaces allowed.';
    if (/^\d/.test(v)) return 'ERROR: First character must be a letter.';
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(v)) return 'ERROR: Only letters, numbers, underscores, and dashes allowed.';
    return null;
  }

  uid.addEventListener('input', function() {
    var err = validateUID(uid.value);
    if (!uid.value) { clearState(uid); return; }
    if (err) showError(uid, err);
    else showValid(uid);
  });

  uid.addEventListener('blur', function() {
    uid.value = uid.value.toLowerCase().trim(); // transform: lowercase
    var err = validateUID(uid.value);
    if (err) showError(uid, err === 'Required' ? 'Required' : err);
    else showValid(uid);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SSN FIELD — password type, live feedback
// ─────────────────────────────────────────────────────────────────────────────

function initSSNField() {
  var ssn = document.getElementById('ssn');
  if (!ssn) return;

  ssn.addEventListener('input', function() {
    var v = ssn.value;
    if (!v) { clearState(ssn); return; }
    var digits = v.replace(/\D/g, '');
    if (digits.length === 9) {
      showValid(ssn);
      ssn.setCustomValidity('');
    } else if (digits.length > 9) {
      showError(ssn, 'ERROR: SSN must be exactly 9 digits.');
    } else {
      clearState(ssn); // still typing
    }
  });

  ssn.addEventListener('blur', function() {
    var v = ssn.value;
    if (!v) { showError(ssn, 'Required'); return; }
    var digits = v.replace(/\D/g, '');
    if (digits.length !== 9) {
      showError(ssn, 'ERROR: SSN must be exactly 9 digits (e.g., 123-45-6789).');
      ssn.setCustomValidity('Invalid SSN');
    } else {
      showValid(ssn);
      ssn.setCustomValidity('');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NAME FIELDS — update patterns per requirements
// ─────────────────────────────────────────────────────────────────────────────

function initNameFields() {
  var fn = document.getElementById('first_name');
  if (fn) {
    fn.pattern = "^[A-Za-z'\\-]{1,30}$";
    fn.title   = "1–30 characters. Letters, apostrophes, and dashes only.";

    fn.addEventListener('input', function() {
      var v = fn.value;
      if (!v) { clearState(fn); return; }
      if (v.length < 1 || v.length > 30) { showError(fn, 'ERROR: 1–30 characters required.'); return; }
      if (!/^[A-Za-z'\-]+$/.test(v)) { showError(fn, 'ERROR: Letters, apostrophes, and dashes only.'); return; }
      showValid(fn);
    });
    fn.addEventListener('blur', function() {
      if (!fn.value) showError(fn, 'Required');
    });
  }

  var mi = document.getElementById('middle_initial');
  if (mi) {
    mi.pattern = "^[A-Za-z]?$";
    mi.title   = "One letter only (optional).";

    mi.addEventListener('input', function() {
      var v = mi.value;
      if (!v) { clearState(mi); return; }
      if (!/^[A-Za-z]$/.test(v)) { showError(mi, 'ERROR: One letter only, no numbers or special characters.'); }
      else { showValid(mi); }
    });
  }

  var ln = document.getElementById('last_name');
  if (ln) {
    ln.pattern = "^[A-Za-z'\\-2-5]{1,30}$";
    ln.title   = "1–30 characters. Letters, apostrophes, dashes, and numbers 2–5 (ordinals like 3rd) only.";

    ln.addEventListener('input', function() {
      var v = ln.value;
      if (!v) { clearState(ln); return; }
      if (v.length < 1 || v.length > 30) { showError(ln, 'ERROR: 1–30 characters required.'); return; }
      if (!/^[A-Za-z'\-2-5]+$/.test(v)) { showError(ln, 'ERROR: Letters, apostrophes, dashes, and numbers 2–5 only.'); return; }
      showValid(ln);
    });
    ln.addEventListener('blur', function() {
      if (!ln.value) showError(ln, 'Required');
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL — strict validation
// ─────────────────────────────────────────────────────────────────────────────

function initEmailField() {
  var em = document.getElementById('email');
  if (!em) return;

  function validateEmail() {
    var v = em.value.trim();
    if (!v) { clearState(em); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      showError(em, 'ERROR: Must be in format name@domain.tld');
      em.setCustomValidity('Invalid email format');
    } else {
      showValid(em);
      em.setCustomValidity('');
    }
  }

  em.addEventListener('input',  validateEmail);
  em.addEventListener('blur', function() {
    if (!em.value) showError(em, 'Required');
    else validateEmail();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESS FIELDS
// ─────────────────────────────────────────────────────────────────────────────

function initAddressFields() {
  function attachAddrValidation(id, required) {
    var el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', function() {
      var v = el.value.trim();
      if (!v) { clearState(el); return; }
      if (v.length < 2)  { showError(el, 'ERROR: Minimum 2 characters.'); return; }
      if (v.length > 30) { showError(el, 'ERROR: Maximum 30 characters allowed.'); return; }
      showValid(el);
    });

    el.addEventListener('blur', function() {
      var v = el.value.trim();
      if (!v) {
        if (required) showError(el, 'Required');
        else clearState(el);
        return;
      }
      if (v.length < 2)  { showError(el, 'ERROR: Minimum 2 characters.'); return; }
      if (v.length > 30) { showError(el, 'ERROR: Maximum 30 characters allowed.'); return; }
      showValid(el);
    });
  }

  attachAddrValidation('addr1', true);
  attachAddrValidation('addr2', false);
  attachAddrValidation('city',  true);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE SELECT — populated from external states.js
// ─────────────────────────────────────────────────────────────────────────────

function initStateSelect() {
  if (typeof populateStateSelect === 'function') {
    var saved = loadSavedData();
    populateStateSelect('state', saved.state || '');
  }

  var sel = document.getElementById('state');
  if (!sel) return;

  sel.addEventListener('change', function() {
    if (sel.value && sel.value !== '') {
      showValid(sel);
      sel.setCustomValidity('');
    } else {
      showError(sel, 'Please select a state or territory.');
      sel.setCustomValidity('Please select a state.');
    }
  });

  sel.addEventListener('blur', function() {
    if (!sel.value || sel.value === '') {
      showError(sel, 'Please select a state or territory.');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIRED RADIO GROUPS — visual reactivity
// ─────────────────────────────────────────────────────────────────────────────

function initRadioGroups() {
  ['gender', 'vaccinated', 'has_insurance'].forEach(function(groupName) {
    var radios = document.querySelectorAll('input[type="radio"][name="' + groupName + '"]');
    radios.forEach(function(r) {
      r.addEventListener('change', function() {
        radios.forEach(function(rb) {
          rb.classList.remove('input-error', 'input-valid');
          rb.classList.add('input-valid');
        });
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIRED CHECKBOXES — visual reactivity
// ─────────────────────────────────────────────────────────────────────────────

function initRequiredCheckboxes() {
  ['consent_to_treat','financial_policy_ack','hipaa_npp_ack'].forEach(function(cbName) {
    var cb = document.querySelector('input[type="checkbox"][name="' + cbName + '"]');
    if (!cb) return;
    cb.addEventListener('change', function() {
      if (cb.checked) {
        cb.classList.remove('input-error');
        cb.classList.add('input-valid');
      } else {
        cb.classList.remove('input-valid');
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SAVE
// ─────────────────────────────────────────────────────────────────────────────

function initAutoSave() {
  var form = document.querySelector('form');
  if (!form) return;

  function doSave() {
    var data = collectFormData(form);
    if (data.zip_code) data.zip_code = data.zip_code.replace(/\D/g,'').slice(0,5);
    if (data.user_id)  data.user_id  = data.user_id.toLowerCase().trim();
    saveData(data);
  }

  form.addEventListener('submit', doSave);
  window.addEventListener('pagehide', doSave);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTORE
// ─────────────────────────────────────────────────────────────────────────────

function restoreFormData() {
  var form = document.querySelector('form');
  if (!form) return;
  var saved = loadSavedData();
  if (!Object.keys(saved).length) return;

  Object.keys(saved).forEach(function(name) {
    var value = saved[name];
    var els = form.querySelectorAll('[name="' + name + '"]');
    els.forEach(function(el) {
      if (el.type === 'checkbox') {
        el.checked = Array.isArray(value)
          ? value.includes(el.value)
          : (value === el.value || value === 'yes');
      } else if (el.type === 'radio') {
        el.checked = (el.value === value);
      } else if (el.type === 'range') {
        el.value = value;
      } else if (el.type !== 'password') {
        el.value = value;
      }
    });
  });

  document.querySelectorAll('input[type="range"]').forEach(function(r) {
    r.dispatchEvent(new Event('input'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW MODAL — field labels, sections, validation status
// ─────────────────────────────────────────────────────────────────────────────

var FIELD_LABELS = {
  user_id:              'User ID',
  email:                'Email Address',
  password:             'Password',
  first_name:           'First Name',
  middle_initial:       'Middle Initial',
  last_name:            'Last Name',
  date_of_birth:        'Date of Birth',
  ssn:                  'SSN',
  gender:               'Gender',
  vaccinated:           'Vaccinated?',
  has_insurance:        'Has Insurance?',
  health_scale:         'Health Scale (1–10)',
  address_line1:        'Address Line 1',
  address_line2:        'Address Line 2',
  city:                 'City',
  state:                'State',
  zip_code:             'Zip Code',
  reason_for_visit:     'Reason for Visit',
  symptoms_description: 'Described Symptoms',
  history_chickenpox:   'Medical History – Chicken Pox',
  history_measles:      'Medical History – Measles',
  history_covid19:      'Medical History – COVID-19',
  history_tetanus:      'Medical History – Tetanus',
  history_asthma:       'Medical History – Asthma',
  history_diabetes:     'Medical History – Diabetes',
  allergies:            'Allergies',
  preferred_contact:    'Preferred Contact Method',
  emergency_name:       'Emergency Contact Name',
  emergency_relationship: 'Emergency Relationship',
  emergency_phone:      'Emergency Phone',
  emergency_phone_alt:  'Emergency Alt Phone',
  primary_ins_provider: 'Primary Insurance Provider',
  primary_member_id:    'Primary Member ID',
  primary_group_number: 'Primary Group Number',
  primary_plan_type:    'Primary Plan Type',
  primary_card_notes:   'Insurance Card Notes',
  secondary_ins_provider: 'Secondary Insurance Provider',
  secondary_member_id:  'Secondary Member ID',
  guarantor_name:       'Guarantor Name',
  guarantor_relationship: 'Guarantor Relationship',
  guarantor_phone:      'Guarantor Phone',
  guarantor_email:      'Guarantor Email',
  guarantor_address:    'Guarantor Address',
  current_medications:  'Current Medications',
  pcp_name:             'PCP Name',
  pcp_phone:            'PCP Phone',
  consent_to_treat:     'Consent to Treatment',
  financial_policy_ack: 'Financial Policy Acknowledged',
  hipaa_npp_ack:        'HIPAA NPP Acknowledged',
  communication_consent:'Consent to Electronic Communication',
  signature_print_name: 'Printed Name (Signature)',
  signature_date:       'Signature Date',
  signature:            'Signature'
};

var REQUIRED_FIELDS_SET = {
  user_id:1, email:1, password:1,
  first_name:1, last_name:1, date_of_birth:1, ssn:1,
  gender:1, vaccinated:1, has_insurance:1,
  address_line1:1, city:1, state:1, zip_code:1,
  emergency_name:1, emergency_relationship:1, emergency_phone:1,
  consent_to_treat:1, financial_policy_ack:1, hipaa_npp_ack:1,
  signature_print_name:1, signature_date:1, signature:1
};

var SECTIONS = [
  { title: 'Step 1 — Account Setup',
    fields: ['user_id','email','password'] },
  { title: 'Step 1 — Patient Demographics',
    fields: ['first_name','middle_initial','last_name','date_of_birth','ssn','gender','vaccinated','has_insurance','health_scale'] },
  { title: 'Step 1 — Address',
    fields: ['address_line1','address_line2','city','state','zip_code'] },
  { title: 'Step 1 — Reason for Visit & Medical History',
    fields: ['reason_for_visit','symptoms_description',
             'history_chickenpox','history_measles','history_covid19',
             'history_tetanus','history_asthma','history_diabetes',
             'allergies','preferred_contact'] },
  { title: 'Step 2 — Emergency Contact',
    fields: ['emergency_name','emergency_relationship','emergency_phone','emergency_phone_alt'] },
  { title: 'Step 3 — Insurance',
    fields: ['primary_ins_provider','primary_member_id','primary_group_number',
             'primary_plan_type','primary_card_notes',
             'secondary_ins_provider','secondary_member_id'] },
  { title: 'Step 4 — Guarantor',
    fields: ['guarantor_name','guarantor_relationship','guarantor_phone',
             'guarantor_email','guarantor_address'] },
  { title: 'Step 5 — Medical Information',
    fields: ['current_medications','allergies','pcp_name','pcp_phone'] },
  { title: 'Step 6 — Consents & Signature',
    fields: ['consent_to_treat','financial_policy_ack','hipaa_npp_ack',
             'communication_consent','signature_print_name','signature_date','signature'] }
];

/**
 * Returns 'pass' | 'required' | 'error:MESSAGE' | null (optional, no entry)
 */
function reviewStatus(field, raw) {
  var isReq   = !!REQUIRED_FIELDS_SET[field];
  var isEmpty = (raw === undefined || raw === null || raw === '' ||
                 (Array.isArray(raw) && raw.length === 0));

  if (isEmpty) return isReq ? 'required' : null;

  var v = Array.isArray(raw) ? raw.join(', ') : String(raw);

  // Per-field checks
  switch (field) {
    case 'user_id':
      if (v.length < 5 || v.length > 30)       return 'error:Must be 5–30 characters.';
      if (/^\d/.test(v))                         return 'error:Must start with a letter.';
      if (/\s/.test(v))                          return 'error:No spaces allowed.';
      if (!/^[a-z][a-z0-9_-]*$/.test(v))        return 'error:Only lowercase letters, numbers, underscores, dashes.';
      break;
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'error:Must be in format name@domain.tld';
      break;
    case 'first_name':
      if (v.length < 1 || v.length > 30)        return 'error:1–30 characters required.';
      if (!/^[A-Za-z'\-]+$/.test(v))            return "error:Letters, apostrophes, and dashes only.";
      break;
    case 'middle_initial':
      if (v && !/^[A-Za-z]$/.test(v))           return 'error:One letter only.';
      break;
    case 'last_name':
      if (v.length < 1 || v.length > 30)        return 'error:1–30 characters required.';
      if (!/^[A-Za-z'\-2-5]+$/.test(v))         return "error:Letters, apostrophes, dashes, numbers 2–5 only.";
      break;
    case 'date_of_birth':
      var dob = new Date(v);
      if (isNaN(dob.getTime()))                  return 'error:Invalid date.';
      var todayD = new Date(); todayD.setHours(0,0,0,0);
      if (dob >= todayD)                         return 'error:Cannot be today or in the future.';
      var minD = new Date(); minD.setFullYear(minD.getFullYear()-120);
      if (dob < minD)                            return 'error:Cannot be more than 120 years ago.';
      break;
    case 'ssn':
      if (v === '••••••••') break; // stored masked — assume entered correctly
      var ssnDig = v.replace(/\D/g,'').replace(/•/g,'');
      if (ssnDig.length !== 9)                   return 'error:Must be exactly 9 digits.';
      break;
    case 'address_line1':
    case 'address_line2':
    case 'city':
      if (v.length < 2)  return 'error:Minimum 2 characters.';
      if (v.length > 30) return 'error:Maximum 30 characters.';
      break;
    case 'state':
      if (!v || v === '') return 'required';
      break;
    case 'zip_code':
      var zipDig = v.replace(/\D/g,'');
      if (zipDig.length !== 5) return 'error:Must be exactly 5 digits.';
      break;
    case 'emergency_phone':
    case 'guarantor_phone':
    case 'pcp_phone':
      if (v && !/^\d{3}-\d{3}-\d{4}$/.test(v)) return 'error:Format must be 000-000-0000';
      break;
    case 'guarantor_email':
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'error:Must be in format name@domain.tld';
      break;
    case 'signature_date':
      var sd = new Date(v);
      if (isNaN(sd.getTime()))                   return 'error:Invalid date.';
      var todaySig = new Date(); todaySig.setHours(0,0,0,0);
      if (sd > todaySig)                         return 'error:Cannot be in the future.';
      break;
  }

  return 'pass';
}

function buildReviewHTML(data) {
  var html = '<div class="review-header">'
    + '<h2>&#128203; Please Review Your Information</h2>'
    + '<p class="review-subtitle">Verify all information is correct before submitting.</p>'
    + '</div>';

  var hasAnyData = false;

  SECTIONS.forEach(function(section) {
    var rows = [];

    section.fields.forEach(function(field) {
      var raw = data[field];
      var isReq = !!REQUIRED_FIELDS_SET[field];

      // Skip fields that are optional AND have no data
      if (raw === undefined && !isReq) return;

      var display = raw;
      if (Array.isArray(raw))  display = raw.length ? raw.join(', ') : '';
      if (raw === null || raw === undefined) display = '';

      // Mask SSN
      if (field === 'ssn' && display && display !== '••••••••') {
        var ssnD = String(display).replace(/\D/g,'');
        display = '***-**-' + ssnD.slice(-4);
      }

      var dispHtml = (!display)
        ? '<span class="review-empty">—</span>'
        : String(display);

      var status = reviewStatus(field, raw);
      var statusHtml = '';
      if      (status === 'pass')            statusHtml = '<span class="review-pass">&#10003; pass</span>';
      else if (status === 'required')        statusHtml = '<span class="review-required">&#9888; Required</span>';
      else if (status && status.slice(0,6) === 'error:') {
        var msg = status.slice(6);
        statusHtml = '<span class="review-error">&#10060; ERROR: ' + msg + '</span>';
      }

      rows.push('<tr>'
        + '<td class="review-label">' + (FIELD_LABELS[field] || field) + '</td>'
        + '<td class="review-value">' + dispHtml + '</td>'
        + '<td class="review-status">' + statusHtml + '</td>'
        + '</tr>');
    });

    if (!rows.length) return;
    hasAnyData = true;

    html += '<div class="review-section">'
      + '<div class="review-section-title">' + section.title + '</div>'
      + '<table class="review-table"><tbody>'
      + rows.join('')
      + '</tbody></table></div>';
  });

  if (!hasAnyData) {
    html += '<p class="review-empty-msg">No information entered yet. Please fill in the form fields.</p>';
  }

  return html;
}

function showReviewModal() {
  var form = document.querySelector('form');
  if (form) {
    var d = collectFormData(form);
    if (d.zip_code) d.zip_code = d.zip_code.replace(/\D/g,'').slice(0,5);
    if (d.user_id)  d.user_id  = d.user_id.toLowerCase().trim();
    saveData(d);
  }

  var allData = loadSavedData();
  var modal = document.getElementById('bbhc-review-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bbhc-review-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
  }

  modal.innerHTML =
    '<div class="review-overlay" id="bbhc-overlay"></div>'
  + '<div class="review-dialog" role="document">'
  +   '<div class="review-content">' + buildReviewHTML(allData) + '</div>'
  +   '<div class="review-footer">'
  +     '<button class="btn primary" id="review-acknowledge-btn" autofocus>'
  +       '&#10003; I Have Reviewed — Return to Form'
  +     '</button>'
  +     '<button class="btn secondary" id="review-print-btn">&#128438; Print</button>'
  +   '</div>'
  + '</div>';

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  document.getElementById('review-acknowledge-btn').addEventListener('click', closeReviewModal);
  document.getElementById('bbhc-overlay').addEventListener('click', closeReviewModal);
  document.getElementById('review-print-btn').addEventListener('click', function() { window.print(); });
  modal._keyHandler = function(e) { if (e.key === 'Escape') closeReviewModal(); };
  document.addEventListener('keydown', modal._keyHandler);
}

function closeReviewModal() {
  var modal = document.getElementById('bbhc-review-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    if (modal._keyHandler) document.removeEventListener('keydown', modal._keyHandler);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function initReviewButton() {
  document.querySelectorAll('.actions').forEach(function(actions) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn review-btn';
    btn.innerHTML = '&#128203; Review';
    btn.title = 'Review all information entered so far across all form pages';
    btn.addEventListener('click', showReviewModal);
    actions.insertBefore(btn, actions.firstChild);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECT STYLES
// ─────────────────────────────────────────────────────────────────────────────

function injectStyles() {
  var style = document.createElement('style');
  style.textContent = [
    '/* Reactive field borders */',
    'input.input-valid, select.input-valid, textarea.input-valid {',
    '  border-color: #15803d !important;',
    '  box-shadow: 0 0 0 2px rgba(21,128,61,0.15);',
    '  outline: none;',
    '}',
    'input.input-error, select.input-error, textarea.input-error {',
    '  border-color: #b42318 !important;',
    '  box-shadow: 0 0 0 2px rgba(180,35,24,0.15);',
    '  outline: none;',
    '}',
    'input[type="checkbox"].input-valid, input[type="radio"].input-valid {',
    '  accent-color: #15803d;',
    '  outline: 2px solid #15803d; outline-offset: 1px;',
    '}',
    'input[type="checkbox"].input-error, input[type="radio"].input-error {',
    '  outline: 2px solid #b42318; outline-offset: 1px;',
    '}',
    '.field-error { color:#b42318; font-size:0.82rem; margin-top:3px; min-height:1em; }',
    '/* Review button */',
    '.btn.review-btn { background:#2d6a4f; color:#fff; border:none; }',
    '.btn.review-btn:hover { background:#1b4332; }',
    '/* Range slider */',
    'input[type="range"] {',
    '  -webkit-appearance:none; appearance:none;',
    '  height:6px; border-radius:4px; outline:none; cursor:pointer;',
    '}',
    'input[type="range"]::-webkit-slider-thumb {',
    '  -webkit-appearance:none; width:20px; height:20px; border-radius:50%;',
    '  background:#1c6ea4; cursor:pointer; border:2px solid #fff;',
    '  box-shadow:0 1px 4px rgba(0,0,0,.25);',
    '}',
    'input[type="range"]::-moz-range-thumb {',
    '  width:20px; height:20px; border-radius:50%; background:#1c6ea4;',
    '  cursor:pointer; border:2px solid #fff;',
    '}',
    '/* Modal */',
    'body.modal-open { overflow:hidden; }',
    '#bbhc-review-modal {',
    '  display:none; position:fixed; inset:0; z-index:9999;',
    '  align-items:center; justify-content:center;',
    '}',
    '.review-overlay {',
    '  position:absolute; inset:0;',
    '  background:rgba(10,30,50,.65); backdrop-filter:blur(3px);',
    '}',
    '.review-dialog {',
    '  position:relative; background:#fff; border-radius:16px;',
    '  box-shadow:0 20px 60px rgba(10,30,60,.35);',
    '  width:min(900px,96vw); max-height:88vh;',
    '  display:flex; flex-direction:column; overflow:hidden;',
    '}',
    '.review-content { overflow-y:auto; padding:28px 28px 12px; flex:1; }',
    '.review-header { text-align:center; margin-bottom:18px; }',
    '.review-header h2 { color:#0f3d5e; font-size:1.35rem; margin-bottom:4px; }',
    '.review-subtitle { color:#4b5563; font-size:.91rem; margin:0; }',
    '.review-section { margin-bottom:20px; }',
    '.review-section-title {',
    '  font-weight:700; font-size:.98rem; color:#fff; background:#0f3d5e;',
    '  padding:7px 12px; border-radius:8px; margin-bottom:6px;',
    '}',
    '.review-table { width:100%; border-collapse:collapse; font-size:.93rem; }',
    '.review-table tr:nth-child(even) { background:#f4f7fb; }',
    '.review-table td { padding:6px 10px; vertical-align:top; }',
    '.review-label { font-weight:600; color:#1b3550; width:35%; white-space:nowrap; }',
    '.review-value { color:#1f2a37; word-break:break-word; }',
    '.review-status { width:260px; text-align:right; white-space:nowrap; }',
    '.review-pass     { color:#15803d; font-weight:700; }',
    '.review-error    { color:#b42318; font-weight:700; }',
    '.review-required { color:#b42318; font-weight:700; }',
    '.review-empty    { color:#9ca3af; }',
    '.review-empty-msg{ text-align:center; color:#4b5563; padding:20px; }',
    '.review-footer {',
    '  padding:14px 28px; border-top:1px solid #e5e7eb;',
    '  display:flex; gap:10px; justify-content:center; background:#f8fafc;',
    '}',
    '@media print {',
    '  #bbhc-review-modal .review-overlay { display:none; }',
    '  #bbhc-review-modal .review-dialog {',
    '    position:static; box-shadow:none; max-height:none; width:100%;',
    '  }',
    '  .review-footer { display:none; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM-LEVEL SUBMIT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function initFormValidation() {
  var form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    var valid    = true;
    var firstBad = null;

    // Text-type inputs
    var inputs = form.querySelectorAll(
      'input:not([type="radio"]):not([type="checkbox"]):not([type="range"]), select, textarea'
    );

    inputs.forEach(function(el) {
      if (!el.name) return;
      var v = (el.value || '').trim();
      if (!v && el.required) {
        showError(el, 'Required');
        valid = false;
        if (!firstBad) firstBad = el;
      }
    });

    // Required radio groups
    ['gender','vaccinated','has_insurance'].forEach(function(g) {
      var radios = form.querySelectorAll('input[type="radio"][name="' + g + '"]');
      if (!radios.length) return;
      var any = Array.prototype.some.call(radios, function(r){ return r.checked; });
      if (!any) {
        radios.forEach(function(r){ r.classList.add('input-error'); });
        valid = false;
        if (!firstBad) firstBad = radios[0];
      }
    });

    // Required checkboxes
    ['consent_to_treat','financial_policy_ack','hipaa_npp_ack'].forEach(function(n) {
      var cb = form.querySelector('input[type="checkbox"][name="' + n + '"]');
      if (!cb) return;
      if (!cb.checked) {
        cb.classList.add('input-error');
        valid = false;
        if (!firstBad) firstBad = cb;
      }
    });

    if (!valid) {
      e.preventDefault();
      if (firstBad) firstBad.scrollIntoView({ behavior:'smooth', block:'center' });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE ON DOM READY
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  injectStyles();
  initRangeSliders();
  initPasswordMatch();
  initDOBField();
  initSigDateField();
  initPhoneFormatting();
  initNameFields();
  initUserIdField();
  initSSNField();
  initEmailField();
  initZipField();
  initAddressFields();
  initStateSelect();
  initRadioGroups();
  initRequiredCheckboxes();
  initReviewButton();
  initAutoSave();
  restoreFormData();
  initFormValidation();
});
