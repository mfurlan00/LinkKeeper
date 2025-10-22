const STORAGE_KEY = 'linkkeeper:data';
const NEW_CATEGORY_VALUE = '__new__';

const state = {
  links: [],
  categories: [],
};

const filters = {
  category: 'all',
  search: '',
};

const formState = {
  editingId: null,
  image: null,
};

const elements = {
  cardsContainer: document.getElementById('cards-container'),
  emptyState: document.getElementById('empty-state'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modal-title'),
  openModalBtn: document.getElementById('open-modal-btn'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelBtn: document.getElementById('cancel-btn'),
  linkForm: document.getElementById('link-form'),
  submitBtn: document.getElementById('submit-btn'),
  titleInput: document.getElementById('title-input'),
  urlInput: document.getElementById('url-input'),
  categorySelect: document.getElementById('category-select'),
  newCategoryField: document.getElementById('new-category-field'),
  newCategoryInput: document.getElementById('new-category-input'),
  descriptionInput: document.getElementById('description-input'),
  imageUrlInput: document.getElementById('image-url-input'),
  imageFileInput: document.getElementById('image-file-input'),
  imagePreview: document.getElementById('image-preview'),
  clearImageBtn: document.getElementById('clear-image-btn'),
  categoryFilter: document.getElementById('category-filter'),
  searchInput: document.getElementById('search-input'),
  importBtn: document.getElementById('import-btn'),
  importInput: document.getElementById('import-input'),
  exportBtn: document.getElementById('export-btn'),
};

const errorElements = {
  title: document.getElementById('title-error'),
  url: document.getElementById('url-error'),
  category: document.getElementById('category-error'),
  newCategory: document.getElementById('new-category-error'),
  imageUrl: document.getElementById('image-url-error'),
  imageFile: document.getElementById('image-file-error'),
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  loadState();
  ensureSeedData();
  renderFilters();
  renderLinks();
  registerEventListeners();
}

function registerEventListeners() {
  elements.openModalBtn.addEventListener('click', () => openModal());
  elements.closeModalBtn.addEventListener('click', closeModal);
  elements.cancelBtn.addEventListener('click', closeModal);

  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen()) {
      closeModal();
    }
  });

  elements.categorySelect.addEventListener('change', handleCategorySelectChange);
  elements.newCategoryInput.addEventListener('input', () => clearError('newCategory'));
  elements.linkForm.addEventListener('submit', handleFormSubmit);

  elements.imageUrlInput.addEventListener('input', handleImageUrlChange);
  elements.imageFileInput.addEventListener('change', handleImageFileChange);
  elements.clearImageBtn.addEventListener('click', clearImageSelection);

  elements.categoryFilter.addEventListener('change', (event) => {
    filters.category = event.target.value;
    renderLinks();
  });

  elements.searchInput.addEventListener('input', (event) => {
    filters.search = event.target.value.trim().toLowerCase();
    renderLinks();
  });

  elements.cardsContainer.addEventListener('click', handleCardActions);

  elements.importBtn.addEventListener('click', () => elements.importInput.click());
  elements.importInput.addEventListener('change', handleImport);
  elements.exportBtn.addEventListener('click', handleExport);
}

function loadState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      return;
    }
    state.links = Array.isArray(parsed.links) ? parsed.links : [];
    state.categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    sanitizeState();
  } catch (error) {
    console.warn('No se pudo cargar el estado almacenado. Se regenerar\u00e1.', error);
  }
}

function sanitizeState() {
  state.links = state.links.map((link) => sanitizeLink(link)).filter(Boolean);
  recalculateCategories();
}

function ensureSeedData() {
  if (state.links.length > 0) {
    return;
  }
  const seed = createSeedData();
  state.links = seed.links;
  state.categories = seed.categories;
  saveState();
}

function sanitizeLink(link) {
  if (!link || typeof link !== 'object') {
    return null;
  }

  const sanitized = {
    id: typeof link.id === 'string' && link.id.trim() ? link.id.trim() : getUUID(),
    title: typeof link.title === 'string' ? link.title.trim() : '',
    url: typeof link.url === 'string' ? link.url.trim() : '',
    category: typeof link.category === 'string' ? link.category.trim() : 'Sin categor\u00eda',
    description: typeof link.description === 'string' ? link.description.trim() : '',
    image: sanitizeImage(link.image),
    createdAt: parseDate(link.createdAt),
    updatedAt: parseDate(link.updatedAt),
  };

  if (!sanitized.title || !isValidHttpUrl(sanitized.url)) {
    return null;
  }

  return sanitized;
}

function sanitizeImage(image) {
  if (!image || typeof image !== 'object') {
    return null;
  }
  const { type, value } = image;
  if ((type === 'url' || type === 'base64') && typeof value === 'string' && value.trim()) {
    return { type, value: value.trim() };
  }
  return null;
}

function parseDate(value) {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function saveState() {
  const payload = {
    links: state.links,
    categories: state.categories,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function recalculateCategories() {
  const unique = new Set();
  state.links.forEach((link) => {
    if (link.category) {
      unique.add(link.category);
    }
  });
  state.categories = Array.from(unique);
}

function renderFilters() {
  populateCategoryFilter();
  populateCategorySelect();
}

function populateCategoryFilter() {
  const select = elements.categoryFilter;
  const previous = filters.category;
  select.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'Todas';
  select.appendChild(allOption);

  state.categories
    .slice()
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    .forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });

  if (previous !== 'all' && !state.categories.includes(previous)) {
    filters.category = 'all';
  }
  select.value = filters.category;
}

function populateCategorySelect(selectedCategory = '') {
  const select = elements.categorySelect;
  select.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona una categor\u00eda';
  select.appendChild(placeholder);

  state.categories
    .slice()
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    .forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });

  const newOption = document.createElement('option');
  newOption.value = NEW_CATEGORY_VALUE;
  newOption.textContent = '+ Nueva categor\u00eda';
  select.appendChild(newOption);

  if (selectedCategory && state.categories.includes(selectedCategory)) {
    select.value = selectedCategory;
  } else if (selectedCategory === NEW_CATEGORY_VALUE) {
    select.value = NEW_CATEGORY_VALUE;
  } else {
    select.value = '';
  }

  toggleNewCategoryField(select.value === NEW_CATEGORY_VALUE);
}

function renderLinks() {
  const filteredLinks = state.links
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((link) => {
      if (filters.category !== 'all' && link.category !== filters.category) {
        return false;
      }
      if (!filters.search) {
        return true;
      }
      const haystack = `${link.title} ${link.url} ${link.description}`.toLowerCase();
      return haystack.includes(filters.search);
    });

  elements.cardsContainer.innerHTML = '';

  if (filteredLinks.length === 0) {
    if (state.links.length > 0) {
      elements.cardsContainer.innerHTML =
        '<p class="empty-results">No se encontraron enlaces para este filtro.</p>';
    }
  } else {
    filteredLinks.forEach((link) => {
      const card = createCard(link);
      elements.cardsContainer.appendChild(card);
    });
  }

  if (state.links.length === 0) {
    elements.emptyState.classList.add('visible');
  } else {
    elements.emptyState.classList.remove('visible');
  }
}

function createCard(link) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = link.id;

  let thumbMarkup = '<div class="card-thumb placeholder" aria-hidden="true"></div>';
  if (link.image && link.image.value) {
    const safeSrc = link.image.value;
    thumbMarkup = `<img class="card-thumb" src="${safeSrc}" alt="Miniatura de ${escapeHtml(
      link.title
    )}" loading="lazy" />`;
  }

  const descriptionMarkup = link.description
    ? `<p class="card-description">${escapeHtml(link.description)}</p>`
    : '';

  card.innerHTML = `
    ${thumbMarkup}
    <div class="card-body">
      <div>
        <h3 class="card-title">
          <a href="${link.url}" target="_blank" rel="noopener">
            ${escapeHtml(link.title)}
          </a>
        </h3>
        <div class="card-url">${escapeHtml(formatDisplayUrl(link.url))}</div>
        <span class="badge">${escapeHtml(link.category)}</span>
      </div>
      ${descriptionMarkup}
      <div class="card-actions">
        <button type="button" class="secondary-btn" data-action="edit">Editar</button>
        <button type="button" class="secondary-btn" data-action="delete">Eliminar</button>
      </div>
    </div>
  `;

  return card;
}

function handleCardActions(event) {
  const actionBtn = event.target.closest('button[data-action]');
  if (!actionBtn) {
    return;
  }
  const card = actionBtn.closest('.card');
  if (!card) {
    return;
  }
  const { action } = actionBtn.dataset;
  const link = state.links.find((item) => item.id === card.dataset.id);
  if (!link) {
    return;
  }
  if (action === 'edit') {
    openModal(link);
  } else if (action === 'delete') {
    const confirmed = window.confirm('\u00bfSeguro que quieres eliminar este enlace?');
    if (confirmed) {
      deleteLink(link.id);
    }
  }
}

function deleteLink(id) {
  state.links = state.links.filter((link) => link.id !== id);
  recalculateCategories();
  saveState();
  renderFilters();
  renderLinks();
}

function openModal(link = null) {
  resetForm();
  const isEditing = Boolean(link);
  formState.editingId = isEditing ? link.id : null;
  formState.image = isEditing && link.image ? { ...link.image } : null;

  elements.modalTitle.textContent = isEditing ? 'Editar enlace' : 'A\u00f1adir enlace';
  elements.submitBtn.textContent = isEditing ? 'Actualizar' : 'Guardar';

  populateCategorySelect(isEditing ? link.category : '');

  if (isEditing) {
    elements.titleInput.value = link.title;
    elements.urlInput.value = link.url;
    elements.descriptionInput.value = link.description || '';
    if (link.image && link.image.value) {
      if (link.image.type === 'url') {
        elements.imageUrlInput.value = link.image.value;
      }
      updateImagePreview(link.image);
    }
  }

  elements.modal.hidden = false;
  window.setTimeout(() => {
    elements.titleInput.focus();
  }, 0);
}

function closeModal() {
  if (!isModalOpen()) {
    return;
  }
  elements.modal.hidden = true;
  resetForm();
}

function isModalOpen() {
  return elements.modal.hidden === false;
}

function resetForm() {
  elements.linkForm.reset();
  formState.editingId = null;
  formState.image = null;
  clearAllErrors();
  toggleNewCategoryField(false);
  updateImagePreview(null);
  elements.imageFileInput.value = '';
  elements.imageUrlInput.value = '';
}

function handleCategorySelectChange(event) {
  const { value } = event.target;
  toggleNewCategoryField(value === NEW_CATEGORY_VALUE);
  if (value !== NEW_CATEGORY_VALUE) {
    clearError('newCategory');
  }
}

function toggleNewCategoryField(show) {
  elements.newCategoryField.hidden = !show;
  if (show) {
    elements.newCategoryInput.focus();
  } else {
    elements.newCategoryInput.value = '';
  }
}

function handleFormSubmit(event) {
  event.preventDefault();
  clearAllErrors();

  const title = elements.titleInput.value.trim();
  const url = elements.urlInput.value.trim();
  const selectedCategory = elements.categorySelect.value;
  const newCategory = elements.newCategoryInput.value.trim();
  const description = elements.descriptionInput.value.trim();
  const imageUrl = elements.imageUrlInput.value.trim();

  let hasError = false;

  if (!title) {
    setError('title', 'A\u00f1ade un t\u00edtulo para el enlace.');
    hasError = true;
  }

  if (!url) {
    setError('url', 'La URL es obligatoria.');
    hasError = true;
  } else if (!isValidHttpUrl(url)) {
    setError('url', 'Introduce una URL v\u00e1lida que empiece por http:// o https://.');
    hasError = true;
  }

  let categoryValue = selectedCategory;
  if (!selectedCategory) {
    setError('category', 'Selecciona o crea una categor\u00eda.');
    hasError = true;
  } else if (selectedCategory === NEW_CATEGORY_VALUE) {
    if (!newCategory) {
      setError('newCategory', 'Escribe el nombre de la nueva categor\u00eda.');
      hasError = true;
    } else {
      const existing = state.categories.find(
        (cat) => cat.toLowerCase() === newCategory.toLowerCase()
      );
      categoryValue = existing || newCategory;
    }
  }

  if (imageUrl && !isValidHttpUrl(imageUrl)) {
    setError('imageUrl', 'La URL de la imagen debe empezar por http:// o https://.');
    hasError = true;
  }

  if (hasError) {
    return;
  }

  let imageData = formState.image;
  if (imageUrl) {
    imageData = { type: 'url', value: imageUrl };
  } else if (!imageData && elements.imageFileInput.files.length === 0) {
    imageData = null;
  }

  const timestamp = new Date().toISOString();

  if (formState.editingId) {
    const index = state.links.findIndex((item) => item.id === formState.editingId);
    if (index === -1) {
      return;
    }
    state.links[index] = {
      ...state.links[index],
      title,
      url,
      category: categoryValue,
      description,
      image: imageData,
      updatedAt: timestamp,
    };
  } else {
    const newLink = {
      id: getUUID(),
      title,
      url,
      category: categoryValue,
      description,
      image: imageData,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.links.push(newLink);
  }

  recalculateCategories();
  saveState();
  renderFilters();
  renderLinks();
  closeModal();
}

function handleImageUrlChange(event) {
  const value = event.target.value.trim();
  if (!value) {
    if (elements.imageFileInput.files.length === 0) {
      formState.image = null;
      updateImagePreview(null);
    }
    clearError('imageUrl');
    return;
  }
  if (isValidHttpUrl(value)) {
    clearError('imageUrl');
    formState.image = { type: 'url', value };
    elements.imageFileInput.value = '';
    updateImagePreview(formState.image);
  } else {
    setError('imageUrl', 'La URL de la imagen debe empezar por http:// o https://.');
  }
}

function handleImageFileChange(event) {
  clearError('imageFile');
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }
  if (!file.type.startsWith('image/')) {
    setError('imageFile', 'Selecciona un archivo de imagen v\u00e1lido.');
    formState.image = null;
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result === 'string') {
      formState.image = { type: 'base64', value: result };
      elements.imageUrlInput.value = '';
      updateImagePreview(formState.image);
    }
  };
  reader.onerror = () => {
    setError('imageFile', 'No se pudo leer el archivo. Int\u00e9ntalo de nuevo.');
  };
  reader.readAsDataURL(file);
}

function clearImageSelection() {
  formState.image = null;
  elements.imageUrlInput.value = '';
  elements.imageFileInput.value = '';
  updateImagePreview(null);
  clearError('imageUrl');
  clearError('imageFile');
}

function updateImagePreview(imageData) {
  const preview = elements.imagePreview;
  const img = preview.querySelector('img');
  if (imageData && imageData.value) {
    if (img) {
      img.src = imageData.value;
    }
    preview.style.display = 'flex';
    preview.setAttribute('aria-hidden', 'false');
  } else {
    if (img) {
      img.src = '';
    }
    preview.style.display = 'none';
    preview.setAttribute('aria-hidden', 'true');
  }
}

function handleImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      mergeImportedData(payload);
      saveState();
      renderFilters();
      renderLinks();
      window.alert('Importaci\u00f3n completada correctamente.');
    } catch (error) {
      console.error(error);
      window.alert('No se pudo importar el archivo. Aseg\u00farate de que es un JSON v\u00e1lido.');
    } finally {
      event.target.value = '';
    }
  };
  reader.onerror = () => {
    window.alert('Hubo un problema al leer el archivo.');
    event.target.value = '';
  };
  reader.readAsText(file);
}

function mergeImportedData(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Estructura inv\u00e1lida');
  }

  const importedLinks = Array.isArray(payload.links) ? payload.links : [];
  if (importedLinks.length === 0) {
    return;
  }

  const existingIds = new Set(state.links.map((link) => link.id));

  const sanitized = importedLinks
    .map((link) => {
      const clean = sanitizeLink(link);
      if (!clean) {
        return null;
      }
      if (!clean.id || existingIds.has(clean.id)) {
        clean.id = getUUID();
      }
      existingIds.add(clean.id);
      return clean;
    })
    .filter(Boolean);

  if (sanitized.length === 0) {
    throw new Error('No se encontraron enlaces v\u00e1lidos');
  }

  state.links = state.links.concat(sanitized);
  recalculateCategories();
}

function handleExport() {
  if (state.links.length === 0) {
    window.alert('No hay enlaces para exportar.');
    return;
  }
  const blob = new Blob(
    [JSON.stringify({ links: state.links, categories: state.categories }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'linkkeeper-export.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    let display = parsed.host;
    if (parsed.pathname && parsed.pathname !== '/') {
      display += parsed.pathname;
    }
    if (parsed.search) {
      display += parsed.search;
    }
    if (display.length > 48) {
      display = `${display.slice(0, 45)}\u2026`;
    }
    return display;
  } catch {
    return url;
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setError(field, message) {
  const target = errorElements[field];
  if (target) {
    target.textContent = message;
  }
}

function clearError(field) {
  const target = errorElements[field];
  if (target) {
    target.textContent = '';
  }
}

function clearAllErrors() {
  Object.values(errorElements).forEach((node) => {
    if (node) {
      node.textContent = '';
    }
  });
}

function createSeedData() {
  const now = new Date().toISOString();
  const samples = [
    {
      id: getUUID(),
      title: 'Documentaci\u00f3n MDN',
      url: 'https://developer.mozilla.org/',
      category: 'Referencia',
      description: 'Gu\u00edas y ejemplos completos sobre tecnolog\u00edas web.',
      image: {
        type: 'url',
        value: 'https://developer.mozilla.org/mdn-social-share.cd6c4a5a.png',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: getUUID(),
      title: 'Inspiraci\u00f3n de dise\u00f1o',
      url: 'https://dribbble.com/',
      category: 'Inspiraci\u00f3n',
      description: 'Ideas visuales de la comunidad creativa.',
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: getUUID(),
      title: 'Noticias de tecnolog\u00eda',
      url: 'https://techcrunch.com/',
      category: 'Noticias',
      description: '',
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: getUUID(),
      title: 'Curso de JavaScript',
      url: 'https://javascript.info/',
      category: 'Aprendizaje',
      description: 'Tutorial moderno de JavaScript con ejemplos pr\u00e1cticos.',
      image: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    links: samples,
    categories: Array.from(new Set(samples.map((item) => item.category))),
  };
}
