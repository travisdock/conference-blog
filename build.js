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
      
      posts.push({
        ...attributes,
        slug: file.replace('.md', ''),
        content: body,
        html: marked.parse(body)
      });
    }
  }

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
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
  const postsList = posts.map(post => `
    <article class="post-preview">
      <h2><a href="/${post.slug}/">${post.title || 'Untitled'}</a></h2>
      <div class="post-meta">
        <span class="date">${post.date || ''}</span>
        <span class="category">${post.category || 'Uncategorized'}</span>
      </div>
      <p>${post.excerpt || post.content.substring(0, 200) + '...'}</p>
    </article>
  `).join('\n');

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

async function copyAssets() {
  await fs.copy(path.join(TEMPLATES_DIR, 'style.css'), path.join(DIST_DIR, 'css', 'style.css'));
  await fs.copy(path.join(TEMPLATES_DIR, 'search.js'), path.join(DIST_DIR, 'js', 'search.js'));
  await fs.copy(path.join(TEMPLATES_DIR, 'theme.js'), path.join(DIST_DIR, 'js', 'theme.js'));
}

async function build() {
  console.log('Building site...');
  
  await fs.ensureDir(DIST_DIR);
  await fs.ensureDir(path.join(DIST_DIR, 'css'));
  await fs.ensureDir(path.join(DIST_DIR, 'js'));
  
  const postTemplate = await loadTemplate('post');
  const homeTemplate = await loadTemplate('home');
  
  const posts = await getAllPosts();
  
  for (const post of posts) {
    await buildPost(post, postTemplate);
    console.log(`Built: ${post.slug}`);
  }
  
  await buildHomepage(posts, homeTemplate);
  await buildSearchIndex(posts);
  await copyAssets();
  
  console.log('Build complete!');
}

build().catch(console.error);