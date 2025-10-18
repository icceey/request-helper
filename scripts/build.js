/**
 * Build Script for RequestHelper
 * 简单的构建脚本，复制文件到dist目录
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// 需要复制的文件和目录
const FILES_TO_COPY = [
  'manifest.json',
  'background',
  'popup',
  'options',
  'utils',
  'icons',
  'viewer'
];

// 清理dist目录
function cleanDist() {
  console.log('Cleaning dist directory...');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 复制文件或目录
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 构建
function build() {
  console.log('Building RequestHelper...');
  
  // 清理
  cleanDist();
  
  // 复制文件
  FILES_TO_COPY.forEach(item => {
    const srcPath = path.join(ROOT_DIR, item);
    const destPath = path.join(DIST_DIR, item);
    
    if (fs.existsSync(srcPath)) {
      console.log(`Copying ${item}...`);
      copyRecursive(srcPath, destPath);
    } else {
      console.warn(`Warning: ${item} not found, skipping...`);
    }
  });
  
  console.log('Build completed! Output in dist/ directory');
}

// 执行构建
try {
  build();
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
