# React Router production-audit exception

## Scope

iRAP is a client-rendered Vite application using React Router **Declarative Mode** through
`<BrowserRouter>`. It does not use React Router Framework Mode, server-side rendering,
manual SSR hydration, or unstable React Server Component APIs.

## Accepted advisory

- `GHSA-qwww-vcr4-c8h2`

The React Router maintainers state that this advisory only affects applications using the
unstable RSC APIs. The currently published React Router 7 release remains `7.18.1`; the
advisory lists `8.3.0` as the patched line.

## Controls

The production audit script permits this advisory only when all of the following remain true:

1. `react-router-dom` is declared and installed as exactly `7.18.1`.
2. The transitive `react-router` package is exactly `7.18.1`.
3. `client/src/main.jsx` uses `BrowserRouter`.
4. No unstable RSC router API is found in `client/src`.
5. No other high or critical production advisory is present.
6. The exception has not passed its review date.

The exception is temporary and must be reviewed when a patched compatible release is
published or before the embedded review date, whichever happens first.

## Prohibited change

Do not add React Router Framework Mode, SSR hydration, or unstable RSC APIs while this
exception is active.
