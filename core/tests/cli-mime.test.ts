import { describe, it, expect } from 'vitest';
import { getMimeType } from '@cli/lib/mime';

describe('getMimeType', () => {
  describe('text files', () => {
    it('should detect markdown', () => {
      expect(getMimeType('README.md')).toBe('text/markdown');
    });

    it('should detect plain text', () => {
      expect(getMimeType('file.txt')).toBe('text/plain');
      expect(getMimeType('.env')).toBe('text/plain');
      expect(getMimeType('.gitignore')).toBe('text/plain');
    });

    it('should detect HTML/CSS', () => {
      expect(getMimeType('index.html')).toBe('text/html');
      expect(getMimeType('page.htm')).toBe('text/html');
      expect(getMimeType('style.css')).toBe('text/css');
    });

    it('should detect CSV', () => {
      expect(getMimeType('data.csv')).toBe('text/csv');
    });

    it('should detect programming languages', () => {
      expect(getMimeType('script.py')).toBe('text/x-python');
      expect(getMimeType('app.rb')).toBe('text/x-ruby');
      expect(getMimeType('main.go')).toBe('text/x-go');
      expect(getMimeType('lib.rs')).toBe('text/x-rust');
      expect(getMimeType('App.java')).toBe('text/x-java');
      expect(getMimeType('main.c')).toBe('text/x-c');
      expect(getMimeType('main.cpp')).toBe('text/x-c++');
      expect(getMimeType('header.h')).toBe('text/x-c');
    });
  });

  describe('application types', () => {
    it('should detect JSON', () => {
      expect(getMimeType('package.json')).toBe('application/json');
    });

    it('should detect YAML', () => {
      expect(getMimeType('config.yaml')).toBe('application/yaml');
      expect(getMimeType('config.yml')).toBe('application/yaml');
    });

    it('should detect XML', () => {
      expect(getMimeType('data.xml')).toBe('application/xml');
    });

    it('should detect JavaScript/TypeScript', () => {
      expect(getMimeType('app.js')).toBe('application/javascript');
      expect(getMimeType('module.mjs')).toBe('application/javascript');
      expect(getMimeType('legacy.cjs')).toBe('application/javascript');
      expect(getMimeType('component.jsx')).toBe('application/javascript');
      expect(getMimeType('app.ts')).toBe('application/typescript');
      expect(getMimeType('component.tsx')).toBe('application/typescript');
    });

    it('should detect shell scripts', () => {
      expect(getMimeType('run.sh')).toBe('application/x-sh');
      expect(getMimeType('build.bash')).toBe('application/x-sh');
      expect(getMimeType('setup.zsh')).toBe('application/x-sh');
    });

    it('should detect TOML and SQL', () => {
      expect(getMimeType('Cargo.toml')).toBe('application/toml');
      expect(getMimeType('schema.sql')).toBe('application/sql');
    });
  });

  describe('binary types', () => {
    it('should detect executables', () => {
      expect(getMimeType('app.exe')).toBe('application/x-executable');
    });

    it('should detect shared libraries', () => {
      expect(getMimeType('module.dll')).toBe('application/x-sharedlib');
      expect(getMimeType('module.so')).toBe('application/x-sharedlib');
      expect(getMimeType('module.dylib')).toBe('application/x-sharedlib');
    });

    it('should detect bytecode', () => {
      expect(getMimeType('module.pyc')).toBe('application/x-python-bytecode');
      expect(getMimeType('module.pyo')).toBe('application/x-python-bytecode');
      expect(getMimeType('App.class')).toBe('application/java-vm');
    });

    it('should detect WebAssembly', () => {
      expect(getMimeType('module.wasm')).toBe('application/wasm');
    });

    it('should detect generic binary', () => {
      expect(getMimeType('data.bin')).toBe('application/octet-stream');
      expect(getMimeType('cache.dat')).toBe('application/octet-stream');
    });

    it('should detect object files and archives', () => {
      expect(getMimeType('main.o')).toBe('application/x-object');
      expect(getMimeType('lib.a')).toBe('application/x-archive');
      expect(getMimeType('static.lib')).toBe('application/x-archive');
    });
  });

  describe('archive types', () => {
    it('should detect ZIP', () => {
      expect(getMimeType('package.zip')).toBe('application/zip');
    });

    it('should detect TAR', () => {
      expect(getMimeType('archive.tar')).toBe('application/x-tar');
    });

    it('should detect compressed archives', () => {
      expect(getMimeType('archive.tgz')).toBe('application/gzip');
      expect(getMimeType('archive.gz')).toBe('application/gzip');
    });
  });

  describe('image types', () => {
    it('should detect common image formats', () => {
      expect(getMimeType('photo.png')).toBe('image/png');
      expect(getMimeType('photo.jpg')).toBe('image/jpeg');
      expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
      expect(getMimeType('anim.gif')).toBe('image/gif');
      expect(getMimeType('image.webp')).toBe('image/webp');
      expect(getMimeType('favicon.ico')).toBe('image/x-icon');
    });

    it('should detect SVG', () => {
      expect(getMimeType('logo.svg')).toBe('image/svg+xml');
    });
  });

  describe('document types', () => {
    it('should detect PDF', () => {
      expect(getMimeType('report.pdf')).toBe('application/pdf');
    });

    it('should detect Office formats', () => {
      expect(getMimeType('doc.doc')).toBe('application/msword');
      expect(getMimeType('doc.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(getMimeType('slides.ppt')).toBe('application/vnd.ms-powerpoint');
      expect(getMimeType('slides.pptx')).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect(getMimeType('data.xls')).toBe('application/vnd.ms-excel');
      expect(getMimeType('data.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  describe('edge cases', () => {
    it('should return null for unknown extensions', () => {
      expect(getMimeType('file.xyz')).toBeNull();
      expect(getMimeType('file.unknown')).toBeNull();
    });

    it('should return null for files without extensions', () => {
      expect(getMimeType('Makefile')).toBeNull();
      expect(getMimeType('Dockerfile')).toBeNull();
    });

    it('should handle paths with directories', () => {
      expect(getMimeType('/path/to/file.json')).toBe('application/json');
      expect(getMimeType('src/index.ts')).toBe('application/typescript');
    });

    it('should be case-insensitive', () => {
      expect(getMimeType('FILE.JSON')).toBe('application/json');
      expect(getMimeType('SCRIPT.PY')).toBe('text/x-python');
      expect(getMimeType('app.EXE')).toBe('application/x-executable');
    });
  });
});
