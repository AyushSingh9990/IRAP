# iRAP project structure

The repository root is the `irap` directory itself. It must not contain a second nested `irap` project.

```text
irap/
├── client/                 React and Vite frontend
├── server/                 Express and MongoDB backend
├── docs/                   Maintained technical documentation
├── scripts/                Setup and quality utilities
├── .editorconfig
├── .gitignore
├── .npmrc
├── .nvmrc
├── package.json
├── README.md
└── LICENSE
```

Temporary patch folders, extracted hotfix folders, phase handoff files, private uploads, environment files, generated builds, coverage reports, and backup folders are not part of the source repository.

Use `npm run structure:check` to validate the repository. Use `npm run clean:workspace` for a dry-run report of known temporary artifacts, then add `-- --apply` only after reviewing the list.
