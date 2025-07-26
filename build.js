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

async function buildSitemap(posts) {
  const baseUrl = 'https://rubyconferenceproject.com';
  const currentDate = new Date().toISOString().split('T')[0];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/mailing-list/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/interviews/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/weekly-reviews/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

  for (const post of posts) {
    const postDate = post.originalDate ? new Date(post.originalDate).toISOString().split('T')[0] : currentDate;
    sitemap += `
  <url>
    <loc>${baseUrl}/${post.slug}/</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }

  sitemap += `
</urlset>`;

  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
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
  await fs.copy(path.join(TEMPLATES_DIR, 'analytics.js'), path.join(DIST_DIR, 'js', 'analytics.js'));
  
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

async function buildAboutPage(aboutTemplate) {
  const aboutDir = path.join(DIST_DIR, 'about');
  await fs.ensureDir(aboutDir);
  await fs.writeFile(path.join(aboutDir, 'index.html'), aboutTemplate);
  console.log('Built: about');
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
  const aboutTemplate = await loadTemplate('about');
  
  const posts = await getAllPosts();
  
  for (const post of posts) {
    await buildPost(post, postTemplate);
    console.log(`Built: ${post.slug}`);
  }
  
  await buildHomepage(posts, homeTemplate);
  await buildCategoryPage('Interview', posts, categoryTemplate);
  await buildCategoryPage('Weekly Review', posts, categoryTemplate);
  await buildMailingListPage(mailingListTemplate);
  await buildAboutPage(aboutTemplate);
  await buildSearchIndex(posts);
  await buildSitemap(posts);
  await copyAssets();
  
  console.log('Build complete!');
}

build().catch(console.error);