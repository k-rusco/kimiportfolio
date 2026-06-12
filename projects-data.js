const SANITY_PROJECT_ID = 'mya7mu5r';
const SANITY_DATASET = 'production';
const SANITY_API_BASE = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}`;

const PROJECT_FIELDS = `
  title, "slug": slug.current, year, medium, category, description, featured, youtubeUrl,
  "thumb": thumbnail.asset->url, "thumbHover": thumbnailHover.asset->url,
  "hero": heroImage.asset->url, "gallery": gallery[].asset->url
`;

async function sanityQuery(query, params = {}) {
  const url = new URL(SANITY_API_BASE);
  url.searchParams.set('query', query);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity request failed with status ${res.status}`);
  return (await res.json()).result;
}

async function fetchProjects() {
  return sanityQuery(`*[_type == "project"] | order(year desc) {${PROJECT_FIELDS}}`);
}

async function fetchProjectBySlug(slug) {
  return sanityQuery(
    `*[_type == "project" && slug.current == $slug][0] {${PROJECT_FIELDS}}`,
    { slug }
  );
}

/** Appends Sanity image CDN params so we never load full-size originals. */
function sanityImage(url, width) {
  return url ? `${url}?w=${width}&auto=format` : '';
}

/** Normalizes any YouTube URL shape (youtu.be, watch?v=, /embed/) to an embed URL. */
function youtubeEmbedSrc(rawUrl) {
  try {
    const url = new URL(rawUrl);
    let id = '';
    if (url.hostname.includes('youtu.be')) {
      id = url.pathname.slice(1).split('/')[0];
    } else if (url.pathname.startsWith('/embed/')) {
      id = url.pathname.split('/')[2];
    } else {
      id = url.searchParams.get('v') || '';
    }
    return id ? `https://www.youtube.com/embed/${id}` : rawUrl;
  } catch (_) {
    return rawUrl;
  }
}

function createProjectCard(project) {
  const category = project.category || '';

  const card = document.createElement('article');
  card.className = `bento-card project-card filter-item${category ? ` ${category}` : ''}`;
  card.dataset.category = category;

  const link = document.createElement('a');
  link.className = 'project-card-link';
  link.href = `project.html?slug=${encodeURIComponent(project.slug)}`;
  link.setAttribute('aria-label', `Open ${project.title}`);

  const image = document.createElement('span');
  image.className = 'project-card-image';
  image.setAttribute('aria-hidden', 'true');
  image.style.setProperty('--project-active-thumb', `url('${sanityImage(project.thumb, 800)}')`);
  image.style.setProperty('--project-hover-thumb', `url('${sanityImage(project.thumbHover || project.thumb, 800)}')`);

  const content = document.createElement('div');
  content.className = 'project-card-content';

  const heading = document.createElement('h4');
  heading.textContent = project.title;

  const meta = document.createElement('div');
  meta.className = 'project-card-meta';
  const mediumEl = document.createElement('p');
  mediumEl.textContent = project.medium || '';
  const yearEl = document.createElement('p');
  yearEl.textContent = project.year || '';
  meta.append(mediumEl, yearEl);

  content.append(heading, meta);
  link.append(image, content);
  card.appendChild(link);
  return card;
}

function showLoadError(container, message) {
  const note = document.createElement('p');
  note.className = 'project-load-error';
  note.textContent = message || "Couldn't load projects. Please try again later.";
  container.appendChild(note);
}

async function initPortfolioPage(grid) {
  try {
    const projects = await fetchProjects();
    projects
      .filter((project) => project.featured)
      .forEach((project) => grid.appendChild(createProjectCard(project)));
    initProjectFilters();
  } catch (err) {
    console.error(err);
    showLoadError(grid);
  }
}

async function initArchivePage(grid) {
  try {
    const projects = await fetchProjects();
    // Projects arrive sorted newest year first, so insertion order is already correct.
    const byYear = new Map();
    projects.forEach((project) => {
      const year = project.year || 'Undated';
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(project);
    });

    byYear.forEach((items, year) => {
      const heading = document.createElement('h3');
      heading.className = 'archive-year-heading';
      heading.textContent = year;
      grid.appendChild(heading);
      items.forEach((project) => grid.appendChild(createProjectCard(project)));
    });
  } catch (err) {
    console.error(err);
    showLoadError(grid);
  }
}

function renderProjectDetail(section, project) {
  document.title = `Portfolio | ${project.title}`;

  const heading = document.createElement('div');
  heading.className = 'page-heading project-page-heading';
  const title = document.createElement('h1');
  title.textContent = project.title;
  const subtitle = document.createElement('p');
  subtitle.textContent = `${project.medium || ''}${project.year ? ` (${project.year})` : ''}`;
  heading.append(title, subtitle);

  const backLink = document.createElement('a');
  backLink.className = 'project-back-link';
  backLink.href = 'archive.html';
  backLink.setAttribute('aria-label', 'Go back');
  const backIcon = document.createElement('img');
  backIcon.className = 'project-back-icon';
  backIcon.src = 'icons/back-arrow.svg';
  backIcon.alt = '';
  backLink.appendChild(backIcon);

  const content = document.createElement('div');
  content.className = 'project-content';

  const text = document.createElement('div');
  text.className = 'project-text';
  (project.description || '')
    .split(/\n+/)
    .filter((chunk) => chunk.trim())
    .forEach((chunk) => {
      const p = document.createElement('p');
      p.textContent = chunk.trim();
      text.appendChild(p);
    });

  const images = document.createElement('div');
  images.className = 'project-images';

  if (project.youtubeUrl) {
    const heroVideo = document.createElement('div');
    heroVideo.className = 'project-hero-img project-hero-video';
    const iframe = document.createElement('iframe');
    iframe.width = '560';
    iframe.height = '315';
    iframe.src = youtubeEmbedSrc(project.youtubeUrl);
    iframe.title = 'YouTube video player';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    );
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('allowfullscreen', '');
    heroVideo.appendChild(iframe);
    images.appendChild(heroVideo);
  } else if (project.hero) {
    const heroImg = document.createElement('img');
    heroImg.className = 'project-hero-img project-gallery-trigger';
    heroImg.src = sanityImage(project.hero, 1600);
    heroImg.alt = project.title;
    images.appendChild(heroImg);
  }

  if (Array.isArray(project.gallery) && project.gallery.length > 0) {
    const thumbs = document.createElement('div');
    thumbs.className = 'project-thumbs';
    project.gallery.forEach((imageUrl) => {
      const thumb = document.createElement('img');
      thumb.className = 'project-thumb-img project-gallery-trigger';
      thumb.src = sanityImage(imageUrl, 1600);
      thumb.alt = project.title;
      thumbs.appendChild(thumb);
    });
    images.appendChild(thumbs);
  }

  content.append(text, images);
  section.append(heading, backLink, content);
}

async function initProjectDetailPage(section) {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    showLoadError(section, 'No project specified.');
    return;
  }

  try {
    const project = await fetchProjectBySlug(slug);
    if (!project) {
      showLoadError(section, 'Project not found.');
      return;
    }
    renderProjectDetail(section, project);
    initGalleryLightbox();
    initProjectBackLink();
  } catch (err) {
    console.error(err);
    showLoadError(section);
  }
}

const portfolioGrid = document.querySelector('[data-project-grid="featured"]');
const archiveGrid = document.querySelector('[data-project-grid="archive"]');
const projectDetailSection = document.getElementById('project-detail');

if (portfolioGrid) initPortfolioPage(portfolioGrid);
if (archiveGrid) initArchivePage(archiveGrid);
if (projectDetailSection) initProjectDetailPage(projectDetailSection);
