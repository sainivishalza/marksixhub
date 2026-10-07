// Hosts like Hostinger only run `npm install`, so the production build happens here.
// It runs only when NODE_ENV=production, so local `npm install` stays fast.
// --webpack because Hostinger's Linux is too old for Turbopack's native binary; webpack can fall back to a WASM compiler there.
if (process.env.NODE_ENV === 'production' && !process.env.SKIP_BUILD) {
  console.log('postinstall: building Next.js for production');
  require('node:child_process').execSync('next build --webpack', { stdio: 'inherit' });
}
