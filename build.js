const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

const POSTS_DIR = './posts';
const DIST_DIR = './dist';
const TEMPLATES_DIR = './templates';

async function loadTemplate(name) {
  return await fs.readFile(path.join(TEMPLATES_DIR, `${name}.html`), 'utf-8');
}

async function getAllPosts() {
  const files = await fs.readdir(POSTS_DIR);
  const posts = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
      const { attributes, body } = frontMatter(content);
      
      // Process YouTube embeds before converting markdown
      const processedBody = body.replace(
        /{% include embed\/youtube\.html id='([^']+)' %}/g,
        '<div class="youtube-embed"><iframe width="560" height="315" src="https://www.youtube.com/embed/$1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>'
      );
      
      posts.push({
        ...attributes,
        slug: file.replace('.md', ''),
        content: body,
        html: marked.parse(processedBody),
        // Keep original date for sorting, add formatted date for display
        originalDate: attributes.date,
        date: attributes.date ? new Date(attributes.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : attributes.date
      });
    }
  }

  return posts.sort((a, b) => new Date(b.originalDate || b.date) - new Date(a.originalDate || a.date));
}

async function buildPost(post, postTemplate) {
  let html = postTemplate;
  html = html.replaceAll('{{title}}', post.title || 'Untitled');
  html = html.replaceAll('{{date}}', post.date || '');
  html = html.replaceAll('{{category}}', post.category || 'Uncategorized');
  html = html.replaceAll('{{content}}', post.html);
  
  const postDir = path.join(DIST_DIR, post.slug);
  await fs.ensureDir(postDir);
  await fs.writeFile(path.join(postDir, 'index.html'), html);
}

async function buildHomepage(posts, homeTemplate) {
  const postsList = posts.map(post => {
    const imageHtml = post.image ? `
      <div class="post-preview-image">
        <img src="${post.image}" alt="${post.title || 'Post image'}" />
      </div>` : '';
    
    return `
    <article class="post-preview">
      ${imageHtml}
      <div class="post-preview-content">
        <h2><a href="/${post.slug}/">${post.title || 'Untitled'}</a></h2>
        <div class="post-meta">
          <span class="date">${post.date || ''}</span>
          <span class="category">${post.category || 'Uncategorized'}</span>
        </div>
        <p>${post.excerpt || post.content.substring(0, 200) + '...'}</p>
      </div>
    </article>`;
  }).join('\n');

  let html = homeTemplate;
  html = html.replace('{{posts}}', postsList);
  
  await fs.writeFile(path.join(DIST_DIR, 'index.html'), html);
}

async function buildSearchIndex(posts) {
  const searchIndex = posts.map(post => ({
    title: post.title,
    category: post.category,
    content: post.content,
    url: `/${post.slug}/`,
    date: post.date
  }));

  await fs.writeFile(
    path.join(DIST_DIR, 'js', 'search-index.json'),
    JSON.stringify(searchIndex)
  );
}

async function buildCategoryPage(category, posts, categoryTemplate) {
  const categoryPosts = posts.filter(post => post.category === category);
  if (categoryPosts.length === 0) return;
  
  const postsList = categoryPosts.map(post => {
    const imageHtml = post.image ? `
      <div class="post-preview-image">
        <img src="${post.image}" alt="${post.title || 'Post image'}" />
      </div>` : '';
    
    return `
    <article class="post-preview">
      ${imageHtml}
      <div class="post-preview-content">
        <h2><a href="/${post.slug}/">${post.title || 'Untitled'}</a></h2>
        <div class="post-meta">
          <span class="date">${post.date || ''}</span>
          <span class="category">${post.category || 'Uncategorized'}</span>
        </div>
        <p>${post.excerpt || post.content.substring(0, 200) + '...'}</p>
      </div>
    </article>`;
  }).join('\n');

  let html = categoryTemplate;
  html = html.replaceAll('{{category}}', category);
  html = html.replaceAll('{{description}}', `All posts in the ${category} category`);
  html = html.replaceAll('{{posts}}', postsList);
  
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
  const categoryDir = path.join(DIST_DIR, `${categorySlug}s`);
  await fs.ensureDir(categoryDir);
  await fs.writeFile(path.join(categoryDir, 'index.html'), html);
}

async function copyAssets() {
  await fs.copy(path.join(TEMPLATES_DIR, 'style.css'), path.join(DIST_DIR, 'css', 'style.css'));
  await fs.copy(path.join(TEMPLATES_DIR, 'search.js'), path.join(DIST_DIR, 'js', 'search.js'));
  await fs.copy(path.join(TEMPLATES_DIR, 'theme.js'), path.join(DIST_DIR, 'js', 'theme.js'));
  
  // Copy images if they exist
  const imagesDir = './images';
  if (await fs.pathExists(imagesDir)) {
    await fs.copy(imagesDir, path.join(DIST_DIR, 'images'));
  }
  
  // Copy favicon files
  const faviconDir = './favicon';
  if (await fs.pathExists(faviconDir)) {
    const faviconFiles = await fs.readdir(faviconDir);
    for (const file of faviconFiles) {
      await fs.copy(path.join(faviconDir, file), path.join(DIST_DIR, file));
    }
  }
  
  // Create CNAME file for custom domain
  await fs.writeFile(path.join(DIST_DIR, 'CNAME'), 'rubyconferenceproject.com');
}

async function buildMailingListPage(mailingListTemplate) {
  const mailingListDir = path.join(DIST_DIR, 'mailing-list');
  await fs.ensureDir(mailingListDir);
  await fs.writeFile(path.join(mailingListDir, 'index.html'), mailingListTemplate);
  console.log('Built: mailing-list');
}

async function build() {
  console.log('Building site...');
  
  await fs.ensureDir(DIST_DIR);
  await fs.ensureDir(path.join(DIST_DIR, 'css'));
  await fs.ensureDir(path.join(DIST_DIR, 'js'));
  
  const postTemplate = await loadTemplate('post');
  const homeTemplate = await loadTemplate('home');
  const categoryTemplate = await loadTemplate('category');
  const mailingListTemplate = await loadTemplate('mailing-list');
  
  const posts = await getAllPosts();
  
  for (const post of posts) {
    await buildPost(post, postTemplate);
    console.log(`Built: ${post.slug}`);
  }
  
  await buildHomepage(posts, homeTemplate);
  await buildCategoryPage('Interview', posts, categoryTemplate);
  await buildCategoryPage('Weekly Review', posts, categoryTemplate);
  await buildMailingListPage(mailingListTemplate);
  await buildSearchIndex(posts);
  await copyAssets();
  
  console.log('Build complete!');
}

build().catch(console.error);