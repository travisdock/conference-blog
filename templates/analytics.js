(function() {
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname === '::1') {
    console.log('Travalytics: Skipping tracking on localhost');
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://travserve.net/analytics.js';
  script.setAttribute('data-tracking-id', 'acdbb51d-31b2-4034-ac65-5eaf0165068d');
  script.setAttribute('data-endpoint', 'https://travserve.net');
  script.async = true;
  document.head.appendChild(script);
})();