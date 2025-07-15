# Conference Blog

A simple static site generator for conference organizing blog posts.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create markdown posts in the `posts/` directory with frontmatter:
   ```markdown
   ---
   title: Your Post Title
   date: 2024-01-15
   category: Category Name
   excerpt: Optional excerpt for the post
   ---
   
   Your post content here...
   ```

3. Build the site:
   ```bash
   npm run build
   ```

4. View locally:
   ```bash
   npm run serve
   ```
   Then open http://localhost:8080

## Deployment to GitHub Pages

1. Build the site: `npm run build`
2. Push the `dist/` folder contents to your `gh-pages` branch
3. Enable GitHub Pages in your repository settings

## Features

- Markdown to HTML conversion
- Categories for posts
- Search functionality
- Minimalist design
- Mobile responsive