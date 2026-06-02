# WeChat Mini Program Web-View Deploy Design

## Goal

Create the fastest usable WeChat mini-program version of this wardrobe app by keeping the existing Libre Closet web/PWA application as the main product and wrapping it in a minimal WeChat mini-program `web-view`.

In plain terms: first make the current website available through a real HTTPS address, then create a small WeChat mini-program project that opens that website.

## Current Project State

- Repository path: `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- Current branch: `main`
- App type: NestJS web/PWA application with Handlebars views
- Existing WeChat mini-program project: none
- Existing `project.config.json`: none
- Deployment-ready web app scripts:
  - `npm run build`
  - `npm run start:prod`

## Chosen Approach

Use a small native mini-program shell with one `web-view` page.

The mini-program shell will contain:

- `project.config.json`
- `miniprogram/app.json`
- `miniprogram/app.wxss`
- `miniprogram/pages/webview/index.json`
- `miniprogram/pages/webview/index.wxml`
- `miniprogram/pages/webview/index.wxss`
- `miniprogram/pages/webview/index.js`

The page will read a configured HTTPS URL and open it through WeChat's `web-view` component.

## Required User-Provided Values

Before final publishing in WeChat Developer Tools, the user must provide or confirm:

- WeChat mini-program AppID
- Final HTTPS web app URL
- Whether the web domain has been added to the mini-program business domain list in WeChat public platform

Without those values, the repository can still contain a local importable mini-program shell, but it cannot be fully published as a production mini-program.

## Web Deployment Requirements

The existing Libre Closet server must be deployed somewhere that provides:

- HTTPS
- Persistent storage for SQLite data and uploaded clothing photos, or a configured PostgreSQL/S3 setup
- Environment variables matching the current app config
- A stable public domain that WeChat can whitelist

The web deployment is separate from the mini-program shell. The mini-program only opens the HTTPS web app.

## Error Handling

The mini-program shell will keep the `web-view` page simple:

- If the configured URL is missing, show a clear setup page in WeChat Developer Tools.
- If the URL exists but WeChat blocks it, the fix is outside the code: add the domain in WeChat public platform.
- If login, upload, or AI features fail, debug the web app backend first because the mini-program shell is only a container.

## Testing

Local verification will include:

- Run `npm run build` for the web app.
- Import the mini-program folder in WeChat Developer Tools.
- Confirm the project opens without JSON or encoding errors.
- Confirm the web-view points to the configured HTTPS URL.

Production verification will include:

- Open the mini-program in WeChat Developer Tools preview mode.
- Confirm the HTTPS domain is allowed by WeChat.
- Confirm the wardrobe homepage loads.
- Confirm core flows still work through the web app: garment list, upload, outfit recommendation, and AI-assisted entry if configured.

## Not In Scope

This design does not rewrite Libre Closet into native WeChat pages. A native rewrite is larger work and should be handled as a separate project after the web-view version is usable.
