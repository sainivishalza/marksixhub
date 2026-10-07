// Hosts like Hostinger only run `npm install`, so the production build happens here.
// It runs only when NODE_ENV=production, so local `npm install` stays fast.
if (process.env.NODE_ENV === 'production' && !process.env.SKIP_BUILD) {
  console.log('postinstall: building Next.js for production');
  require('node:child_process').execSync('next build', { stdio: 'inherit' });
}
