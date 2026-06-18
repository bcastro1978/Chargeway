async function resolveRedirect() {
  const url = 'https://maps.app.goo.gl/yvfh1zyr9n6cPDBo9';
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    const location = res.headers.get('location');
    console.log('FINAL URL REDIRECT:', location);
  } catch (err) {
    console.error(err);
  }
}

resolveRedirect();
