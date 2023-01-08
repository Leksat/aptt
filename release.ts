import fs from 'fs';

const releaseVersion = process.argv.at(-1);

const files: Array<{
  path: string;
  search: RegExp;
  replace: string;
}> = [
  {
    path: 'src-tauri/tauri.conf.json',
    search: /"version": ".*"/,
    replace: `"version": "${releaseVersion}"`,
  },
  {
    path: 'package.json',
    search: /"version": ".*"/,
    replace: `"version": "${releaseVersion}"`,
  },
  {
    path: 'src-tauri/Cargo.toml',
    search: /version = ".*"/,
    replace: `version = "${releaseVersion}"`,
  },
  {
    path: 'src-tauri/Cargo.lock',
    search: /name = "aptt"\nversion = ".*"/,
    replace: `name = "aptt"\nversion = "${releaseVersion}"`,
  },
  {
    path: '.github/workflows/release.yml',
    search: / {10}releaseBody: \|\n.*\n {10}releaseDraft: false/s,
    replace: `          releaseBody: | # AXXX
            New features:
            - 
            
            Bug fixes:
            - 
          releaseDraft: false`,
  },
];

files.forEach(({ path, search, replace }) => {
  fs.writeFileSync(
    path,
    fs.readFileSync(path, 'utf8').replace(search, replace),
  );
});
